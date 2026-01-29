/**
 * Debug endpoint to inspect form RAG configuration
 * GET /api/debug/form-config?formId=xxx&orgId=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getOrgFormsCollection } from '@/lib/platform/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const formId = searchParams.get('formId');
  const orgId = searchParams.get('orgId');

  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!formId || !orgId) {
      return NextResponse.json({ error: 'Missing formId or orgId' }, { status: 400 });
    }

    const formsCollection = await getOrgFormsCollection(orgId);
    const form = await formsCollection.findOne({
      id: formId,
    });

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    return NextResponse.json({
      formId: form.id,
      formType: form.formType,
      hasConversationalConfig: !!form.conversationalConfig,
      conversationalConfig: form.conversationalConfig,
      ragEnabled: form.conversationalConfig?.rag?.enabled,
      ragDocuments: form.conversationalConfig?.rag?.documents || [],
      ragRetrievalConfig: form.conversationalConfig?.rag?.retrievalConfig,
    });
  } catch (error) {
    console.error('[Debug] Form config fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
