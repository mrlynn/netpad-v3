/**
 * Workflow Status API Route
 *
 * PATCH /api/workflows/[workflowId]/status - Update workflow status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getWorkflowById, updateWorkflowStatus, listWorkflows } from '@/lib/workflow/db';
import { WorkflowStatus } from '@/types/workflow';
import { checkActiveWorkflowLimit } from '@/lib/platform/billing';

interface RouteParams {
  params: Promise<{ workflowId: string }>;
}

const VALID_STATUSES: WorkflowStatus[] = ['draft', 'active', 'paused', 'archived'];

/**
 * PATCH /api/workflows/[workflowId]/status
 * Update workflow status
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workflowId } = await params;
    const body = await request.json();
    const { orgId, status } = body;

    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
    }

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    // TODO: Verify user has access to this organization

    // Check workflow exists
    const existing = await getWorkflowById(orgId, workflowId);
    if (!existing) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    // Validate status transitions
    if (status === 'active') {
      // Validate workflow before activating
      if (existing.canvas.nodes.length === 0) {
        return NextResponse.json(
          { error: 'Cannot activate workflow with no nodes' },
          { status: 400 }
        );
      }

      // Check for at least one trigger node
      const hasTrigger = existing.canvas.nodes.some((node) => {
        // Trigger nodes have types ending in '-trigger' or are specific trigger types
        return node.type.includes('trigger') || node.type === 'manual-start';
      });

      if (!hasTrigger) {
        return NextResponse.json(
          { error: 'Workflow must have at least one trigger node to be activated' },
          { status: 400 }
        );
      }

      // Check active workflow limit (only if workflow is not already active)
      if (existing.status !== 'active') {
        const { workflows: activeWorkflows } = await listWorkflows(orgId, { status: 'active' });
        const activeCount = activeWorkflows.length;

        const limitCheck = await checkActiveWorkflowLimit(orgId, activeCount);
        if (!limitCheck.allowed) {
          return NextResponse.json(
            {
              error: limitCheck.reason || 'Maximum active workflows limit reached',
              code: 'LIMIT_EXCEEDED',
              usage: {
                current: limitCheck.current,
                limit: limitCheck.limit,
                remaining: limitCheck.remaining,
              },
            },
            { status: 429 }
          );
        }
      }
    }

    // Don't allow reactivating archived workflows directly
    if (existing.status === 'archived' && status === 'active') {
      return NextResponse.json(
        { error: 'Cannot directly activate an archived workflow. Unarchive it first.' },
        { status: 400 }
      );
    }

    // Update status
    const workflow = await updateWorkflowStatus(orgId, workflowId, session.userId!, status);

    return NextResponse.json({ workflow });
  } catch (error) {
    console.error('Error updating workflow status:', error);
    return NextResponse.json(
      { error: 'Failed to update workflow status' },
      { status: 500 }
    );
  }
}
