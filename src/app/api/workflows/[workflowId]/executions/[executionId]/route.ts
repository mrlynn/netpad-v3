/**
 * Workflow Execution Management API
 *
 * GET /api/workflows/[workflowId]/executions/[executionId] - Get execution details with job info
 * POST /api/workflows/[workflowId]/executions/[executionId] - Perform actions (retry, cancel)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import {
  getExecutionById,
  getJobByExecutionId,
  retryJob,
  cancelJob,
  getExecutionLogs,
  getWorkflowById,
  createExecution,
  enqueueJob,
  canEnqueueJob,
} from '@/lib/workflow/db';
import { incrementWorkflowExecutionAtQueue } from '@/lib/platform/billing';

interface RouteParams {
  params: Promise<{ workflowId: string; executionId: string }>;
}

/**
 * GET /api/workflows/[workflowId]/executions/[executionId]
 * Get execution details including job status
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { executionId } = await params;
    const { searchParams } = new URL(request.url);
    const includeLogs = searchParams.get('logs') === 'true';

    // Get execution
    const execution = await getExecutionById(executionId);
    if (!execution) {
      return NextResponse.json({ error: 'Execution not found' }, { status: 404 });
    }

    // Get associated job
    const job = await getJobByExecutionId(executionId);

    // Get logs if requested
    let logs = null;
    if (includeLogs) {
      logs = await getExecutionLogs(executionId, { limit: 100 });
    }

    // Calculate job details
    const jobDetails = job ? {
      jobId: job._id?.toString(),
      status: job.status,
      attempts: job.attempts,
      maxAttempts: job.maxAttempts,
      lastError: job.lastError,
      runAt: job.runAt,
      lockedAt: job.lockedAt,
      lockedBy: job.lockedBy,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      // Computed fields
      canRetry: ['failed', 'pending', 'processing'].includes(job.status),
      canCancel: ['pending', 'processing'].includes(job.status),
      waitTimeMs: job.status === 'pending' && job.runAt
        ? Math.max(0, job.runAt.getTime() - Date.now())
        : null,
      isStale: job.status === 'processing' && job.lockedAt
        ? Date.now() - job.lockedAt.getTime() > 5 * 60 * 1000 // 5 minutes
        : false,
    } : null;

    return NextResponse.json({
      success: true,
      execution: {
        ...execution,
        _id: execution._id?.toString(),
      },
      job: jobDetails,
      logs: logs?.map((log) => ({
        ...log,
        _id: log._id?.toString(),
      })),
    });
  } catch (error) {
    console.error('Error getting execution:', error);
    return NextResponse.json(
      { error: 'Failed to get execution' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workflows/[workflowId]/executions/[executionId]
 * Perform actions on an execution (retry, cancel, replay)
 *
 * Actions:
 * - retry: Retry the existing job (same execution record)
 * - cancel: Cancel a pending/processing job
 * - replay: Create a NEW execution with the same trigger payload (for determinism testing)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workflowId, executionId } = await params;
    const body = await request.json();
    const { action, orgId } = body;

    if (!action || !['retry', 'cancel', 'replay'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "retry", "cancel", or "replay"' },
        { status: 400 }
      );
    }

    // Get execution to verify it exists
    const execution = await getExecutionById(executionId);
    if (!execution) {
      return NextResponse.json({ error: 'Execution not found' }, { status: 404 });
    }

    // Handle replay action - creates a new execution with same trigger
    if (action === 'replay') {
      if (!orgId) {
        return NextResponse.json({ error: 'orgId is required for replay' }, { status: 400 });
      }

      // Get workflow
      const workflow = await getWorkflowById(orgId, workflowId);
      if (!workflow) {
        return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
      }

      // Check workflow is executable
      if (workflow.status !== 'active' && workflow.status !== 'draft') {
        return NextResponse.json(
          { error: `Cannot replay on workflow with status '${workflow.status}'` },
          { status: 400 }
        );
      }

      // Check queue limits
      const canEnqueue = await canEnqueueJob(orgId, 100);
      if (!canEnqueue) {
        return NextResponse.json(
          { error: 'Too many pending executions', code: 'QUEUE_FULL' },
          { status: 429 }
        );
      }

      // Check usage limits
      const usageLimit = await incrementWorkflowExecutionAtQueue(orgId, workflowId);
      if (!usageLimit.allowed) {
        return NextResponse.json(
          { error: usageLimit.reason || 'Execution limit reached', code: 'LIMIT_EXCEEDED' },
          { status: 429 }
        );
      }

      // Create new execution with same trigger payload
      const newExecution = await createExecution(
        workflowId,
        orgId,
        {
          type: execution.trigger.type,
          payload: execution.trigger.payload || {},
          source: {
            userId: session.userId,
            ip: request.headers.get('x-forwarded-for') || undefined,
            userAgent: request.headers.get('user-agent') || undefined,
          },
        },
        workflow.version
      );

      const newExecutionId = newExecution._id!.toString();

      // Queue the job
      await enqueueJob({
        workflowId,
        executionId: newExecutionId,
        orgId,
        priority: 1,
        trigger: {
          type: execution.trigger.type,
          payload: execution.trigger.payload || {},
          source: { userId: session.userId },
        },
        runAt: new Date(),
        maxAttempts: workflow.settings.retryPolicy.maxRetries + 1,
      });

      return NextResponse.json({
        success: true,
        message: 'Execution replayed with same input',
        replay: {
          originalExecutionId: executionId,
          newExecutionId: newExecutionId,
          triggerPayload: execution.trigger.payload,
        },
      });
    }

    // Get associated job for retry/cancel actions
    const job = await getJobByExecutionId(executionId);
    if (!job) {
      return NextResponse.json(
        { error: 'No job found for this execution' },
        { status: 404 }
      );
    }

    let result;
    let message;

    if (action === 'retry') {
      if (!['failed', 'pending', 'processing'].includes(job.status)) {
        return NextResponse.json(
          { error: `Cannot retry job with status "${job.status}"` },
          { status: 400 }
        );
      }

      result = await retryJob(job._id!.toString());
      message = 'Job queued for immediate retry';
    } else if (action === 'cancel') {
      if (!['pending', 'processing'].includes(job.status)) {
        return NextResponse.json(
          { error: `Cannot cancel job with status "${job.status}"` },
          { status: 400 }
        );
      }

      result = await cancelJob(job._id!.toString());
      message = 'Job cancelled';
    }

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to perform action' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message,
      job: {
        jobId: result._id?.toString(),
        status: result.status,
        attempts: result.attempts,
        lastError: result.lastError,
      },
    });
  } catch (error) {
    console.error('Error performing execution action:', error);
    return NextResponse.json(
      { error: 'Failed to perform action' },
      { status: 500 }
    );
  }
}
