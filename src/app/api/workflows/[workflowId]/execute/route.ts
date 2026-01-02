/**
 * Workflow Execute API Route
 *
 * POST /api/workflows/[workflowId]/execute - Trigger workflow execution
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import {
  getWorkflowById,
  createExecution,
  enqueueJob,
  canEnqueueJob,
} from '@/lib/workflow/db';
import { incrementWorkflowExecutionAtQueue } from '@/lib/platform/billing';

interface RouteParams {
  params: Promise<{ workflowId: string }>;
}

/**
 * POST /api/workflows/[workflowId]/execute
 * Trigger workflow execution (manual trigger)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workflowId } = await params;
    const body = await request.json();
    const { orgId, payload } = body;

    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
    }

    // TODO: Verify user has access to this organization

    // Get workflow
    const workflow = await getWorkflowById(orgId, workflowId);
    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    // Check workflow is active or draft (for testing)
    if (workflow.status !== 'active' && workflow.status !== 'draft') {
      return NextResponse.json(
        { error: `Cannot execute workflow with status '${workflow.status}'` },
        { status: 400 }
      );
    }

    // Check pending job queue limits (prevents queue overload)
    const canEnqueue = await canEnqueueJob(orgId, 100);
    if (!canEnqueue) {
      return NextResponse.json(
        {
          error: 'Too many pending executions. Please wait for some to complete.',
          code: 'QUEUE_FULL',
        },
        { status: 429 }
      );
    }

    // Increment usage at queue time to enforce limits immediately
    // This prevents race conditions where multiple requests pass limit checks
    const usageLimit = await incrementWorkflowExecutionAtQueue(orgId, workflowId);
    if (!usageLimit.allowed) {
      return NextResponse.json(
        {
          error: usageLimit.reason || 'Monthly workflow execution limit reached',
          code: 'LIMIT_EXCEEDED',
          usage: {
            current: usageLimit.current,
            limit: usageLimit.limit,
            remaining: usageLimit.remaining,
          },
        },
        { status: 429 }
      );
    }

    // Create execution record
    const execution = await createExecution(
      workflowId,
      orgId,
      {
        type: 'manual',
        payload: payload || {},
        source: {
          userId: session.userId,
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
          userAgent: request.headers.get('user-agent') || undefined,
        },
      },
      workflow.version
    );

    const executionId = execution._id!.toString();

    // For immediate execution mode, we could execute synchronously here
    // For now, always queue for async processing
    if (workflow.settings.executionMode === 'immediate' && workflow.canvas.nodes.length <= 5) {
      // TODO: Implement immediate execution for simple workflows
      // For now, still queue it
    }

    // Queue the job for processing
    await enqueueJob({
      workflowId,
      executionId,
      orgId,
      priority: 1,
      trigger: {
        type: 'manual',
        payload: payload || {},
        source: {
          userId: session.userId,
        },
      },
      runAt: new Date(),
      maxAttempts: workflow.settings.retryPolicy.maxRetries + 1,
    });

    return NextResponse.json({
      executionId,
      status: 'pending',
      message: 'Workflow execution queued',
    });
  } catch (error) {
    console.error('Error executing workflow:', error);
    return NextResponse.json(
      { error: 'Failed to execute workflow' },
      { status: 500 }
    );
  }
}
