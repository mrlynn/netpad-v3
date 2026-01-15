/**
 * Linked Resources API
 *
 * GET /api/data-explorer/linked-resources - Find forms and workflows linked to a collection
 *
 * Used by the Data Explorer to show which forms and workflows use a specific collection.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getPlatformDb, getOrgDb } from '@/lib/platform/db';
import type { FormConfiguration } from '@/types/form';
import type { LinkedResourceInfo, LinkedResourcesResponse } from '@/types/dataExplorer';

export const dynamic = 'force-dynamic';

interface StoredForm {
  ownerId: string;
  form: FormConfiguration;
  savedAt: Date;
}

interface WorkflowDocument {
  workflowId: string;
  name: string;
  status: string;
  updatedAt: Date;
  projectId?: string;
  nodes?: Array<{
    id: string;
    type: string;
    data?: {
      collection?: string;
      vaultId?: string;
      connectionId?: string;
    };
  }>;
}

/**
 * GET - Find forms and workflows linked to a collection
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const vaultId = searchParams.get('vaultId');
    const collection = searchParams.get('collection');
    const organizationId = searchParams.get('organizationId');

    if (!collection || !organizationId) {
      return NextResponse.json(
        { error: 'Missing required parameters: collection, organizationId' },
        { status: 400 }
      );
    }

    const platformDb = await getPlatformDb();
    const orgDb = await getOrgDb(organizationId);

    // Find forms that use this collection
    // Forms can reference collections via dataSource.vaultId + dataSource.collection
    // or via the legacy collection + database fields
    const formQuery: Record<string, unknown> = {
      $or: [
        // Match by dataSource (preferred)
        {
          'form.dataSource.collection': collection,
          ...(vaultId ? { 'form.dataSource.vaultId': vaultId } : {}),
        },
        // Match by legacy collection field
        {
          'form.collection': collection,
          'form.organizationId': organizationId,
        },
      ],
    };

    const forms = await platformDb
      .collection<StoredForm>('user_forms')
      .find(formQuery)
      .project({
        'form.id': 1,
        'form.name': 1,
        'form.status': 1,
        'form.projectId': 1,
        savedAt: 1,
      })
      .sort({ savedAt: -1 })
      .toArray();

    const linkedForms: LinkedResourceInfo[] = forms.map((f) => ({
      id: f.form.id,
      name: f.form.name || 'Untitled Form',
      type: 'form' as const,
      status: f.form.status || 'draft',
      lastModified: f.savedAt?.toISOString(),
      projectId: f.form.projectId,
    }));

    // Find workflows that reference this collection in their node configs
    // Workflows store collection references in node data
    const workflowQuery = {
      orgId: organizationId,
      status: { $ne: 'deleted' },
      'nodes.data.collection': collection,
    };

    const workflows = await orgDb
      .collection<WorkflowDocument>('workflows')
      .find(workflowQuery)
      .project({
        workflowId: 1,
        name: 1,
        status: 1,
        updatedAt: 1,
        projectId: 1,
      })
      .sort({ updatedAt: -1 })
      .toArray();

    const linkedWorkflows: LinkedResourceInfo[] = workflows.map((w) => ({
      id: w.workflowId,
      name: w.name || 'Untitled Workflow',
      type: 'workflow' as const,
      status: w.status,
      lastModified: w.updatedAt?.toISOString(),
      projectId: w.projectId,
    }));

    const response: LinkedResourcesResponse = {
      forms: linkedForms,
      workflows: linkedWorkflows,
    };

    // Cache for 10 minutes - linked resources change infrequently
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'private, max-age=600, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    console.error('Linked resources lookup error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to find linked resources' },
      { status: 500 }
    );
  }
}
