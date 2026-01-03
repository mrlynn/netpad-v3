/**
 * Workflow Rollback API
 *
 * POST /api/workflows/[workflowId]/rollback - Rollback to a previous version
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import {
  getWorkflowById,
  getWorkflowVersion,
  rollbackWorkflowVersion,
} from '@/lib/workflow/db';

interface RouteParams {
  params: Promise<{ workflowId: string }>;
}

/**
 * POST /api/workflows/[workflowId]/rollback
 * Rollback workflow to a previous version
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workflowId } = await params;
    const body = await request.json();
    const { orgId, targetVersion, publishNote } = body;

    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
    }

    if (typeof targetVersion !== 'number' || targetVersion < 1) {
      return NextResponse.json(
        { error: 'targetVersion is required and must be a positive number' },
        { status: 400 }
      );
    }

    // Check workflow exists
    const workflow = await getWorkflowById(orgId, workflowId);
    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    // Check target version exists
    const targetVersionDoc = await getWorkflowVersion(orgId, workflowId, targetVersion);
    if (!targetVersionDoc) {
      return NextResponse.json(
        { error: `Version ${targetVersion} not found` },
        { status: 404 }
      );
    }

    // Cannot rollback to the currently active version
    if (targetVersionDoc.isActive) {
      return NextResponse.json(
        { error: 'Cannot rollback to the currently active version' },
        { status: 400 }
      );
    }

    // Perform rollback
    const newVersion = await rollbackWorkflowVersion(
      orgId,
      workflowId,
      targetVersion,
      session.userId!,
      publishNote
    );

    return NextResponse.json({
      success: true,
      message: `Rolled back to version ${targetVersion}`,
      version: {
        version: newVersion.version,
        publishedAt: newVersion.publishedAt,
        publishNote: newVersion.publishNote,
        changesSummary: newVersion.changesSummary,
      },
    });
  } catch (error) {
    console.error('Error rolling back workflow:', error);
    return NextResponse.json(
      { error: 'Failed to rollback workflow' },
      { status: 500 }
    );
  }
}
