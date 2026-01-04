/**
 * Form Definition Export API
 * 
 * GET /api/forms/[formId]/definition
 * Export form configuration as a portable JSON definition
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getFormById } from '@/lib/storage';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, ensureSessionId } from '@/lib/session';
import { cleanFormForExport } from '@/lib/templates/export';
import { getOrgFormsCollection } from '@/lib/platform/db';
import { checkFormPermission } from '@/lib/platform/permissions';

export const dynamic = 'force-dynamic';

/**
 * GET /api/forms/[formId]/definition
 * Export form definition as JSON
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { formId } = await params;
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');
    
    // Try platform-based access first (if orgId provided)
    if (orgId) {
      const session = await getSession();
      if (!session.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      // Check permissions
      const permission = await checkFormPermission(
        session.userId,
        orgId,
        formId,
        'export'
      );
      
      if (!permission.allowed) {
        return NextResponse.json(
          { error: permission.reason || 'Permission denied' },
          { status: 403 }
        );
      }
      
      // Get form from organization database
      const collection = await getOrgFormsCollection(orgId);
      const formDoc = await collection.findOne({
        $or: [{ formId }, { slug: formId }],
      });
      
      if (!formDoc) {
        return NextResponse.json(
          { error: 'Form not found' },
          { status: 404 }
        );
      }
      
      // Convert platform form document to FormConfiguration
      const formConfig = formDoc as any as { formId: string; [key: string]: any };
      
      // Clean for export
      const definition = cleanFormForExport({
        ...formConfig,
        id: formConfig.formId,
      } as any);
      
      return NextResponse.json({
        success: true,
        definition,
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${formConfig.name || 'form'}-definition.json"`,
        },
      });
    }
    
    // Fallback to session-based storage (legacy)
    const session = await getIronSession(await cookies(), sessionOptions);
    const sessionId = ensureSessionId(session);
    
    const form = await getFormById(sessionId, formId);
    
    if (!form) {
      return NextResponse.json(
        { error: 'Form not found' },
        { status: 404 }
      );
    }
    
    // Clean for export
    const definition = cleanFormForExport(form);
    
    return NextResponse.json({
      success: true,
      definition,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${form.name || 'form'}-definition.json"`,
      },
    });
  } catch (error: any) {
    console.error('Error exporting form definition:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to export form definition' },
      { status: 500 }
    );
  }
}
