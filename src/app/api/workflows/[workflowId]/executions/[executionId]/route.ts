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
} from '@/lib/workflow/db';

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
 * Perform actions on an execution (retry, cancel)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { executionId } = await params;
    const body = await request.json();
    const { action } = body;

    if (!action || !['retry', 'cancel'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "retry" or "cancel"' },
        { status: 400 }
      );
    }

    // Get execution to verify it exists
    const execution = await getExecutionById(executionId);
    if (!execution) {
      return NextResponse.json({ error: 'Execution not found' }, { status: 404 });
    }

    // Get associated job
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
