/**
 * Workflow Versions API
 *
 * GET /api/workflows/[workflowId]/versions - Get version history
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import {
  getWorkflowById,
  getWorkflowVersionHistory,
  hasUnpublishedChanges,
} from '@/lib/workflow/db';

interface RouteParams {
  params: Promise<{ workflowId: string }>;
}

/**
 * GET /api/workflows/[workflowId]/versions
 * Get version history for a workflow
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workflowId } = await params;
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
    }

    // Check workflow exists
    const workflow = await getWorkflowById(orgId, workflowId);
    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    // Get version history
    const { versions, total } = await getWorkflowVersionHistory(orgId, workflowId, {
      limit,
      offset,
    });

    // Check for unpublished changes
    const hasChanges = await hasUnpublishedChanges(orgId, workflowId);

    return NextResponse.json({
      versions: versions.map(v => ({
        version: v.version,
        publishedAt: v.publishedAt,
        publishedBy: v.publishedBy,
        publishNote: v.publishNote,
        changesSummary: v.changesSummary,
        stats: v.stats,
        isActive: v.isActive,
      })),
      total,
      hasUnpublishedChanges: hasChanges,
      currentDraftVersion: workflow.version,
      publishedVersion: workflow.publishedVersion,
    });
  } catch (error) {
    console.error('Error fetching version history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch version history' },
      { status: 500 }
    );
  }
}
