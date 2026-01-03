/**
 * Workflow Publish API
 *
 * POST /api/workflows/[workflowId]/publish - Publish workflow version
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import {
  getWorkflowById,
  publishWorkflowVersion,
  hasUnpublishedChanges,
} from '@/lib/workflow/db';

interface RouteParams {
  params: Promise<{ workflowId: string }>;
}

/**
 * POST /api/workflows/[workflowId]/publish
 * Publish current workflow as a new version
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workflowId } = await params;
    const body = await request.json().catch(() => ({}));
    const { orgId, publishNote } = body;

    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
    }

    // Check workflow exists
    const workflow = await getWorkflowById(orgId, workflowId);
    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    // Check if there are changes to publish
    const hasChanges = await hasUnpublishedChanges(orgId, workflowId);
    if (!hasChanges && workflow.publishedVersion) {
      return NextResponse.json(
        { error: 'No changes to publish' },
        { status: 400 }
      );
    }

    // Validate workflow has at least one trigger node
    const hasTrigger = workflow.canvas.nodes.some(node =>
      node.type.includes('trigger') || node.type === 'form-trigger' || node.type === 'webhook-trigger' || node.type === 'schedule-trigger' || node.type === 'manual-trigger'
    );

    if (!hasTrigger) {
      return NextResponse.json(
        { error: 'Workflow must have at least one trigger node to publish' },
        { status: 400 }
      );
    }

    // Publish the version
    const version = await publishWorkflowVersion(
      orgId,
      workflowId,
      session.userId!,
      publishNote
    );

    return NextResponse.json({
      success: true,
      version: {
        version: version.version,
        publishedAt: version.publishedAt,
        publishNote: version.publishNote,
        changesSummary: version.changesSummary,
      },
    });
  } catch (error) {
    console.error('Error publishing workflow:', error);
    return NextResponse.json(
      { error: 'Failed to publish workflow' },
      { status: 500 }
    );
  }
}
