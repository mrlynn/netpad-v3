/**
 * Workflow Executions API
 *
 * GET /api/workflows/[workflowId]/executions - List executions for a workflow
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { listExecutions, getExecutionLogs, getJobByExecutionId } from '@/lib/workflow/db';

interface RouteParams {
  params: Promise<{ workflowId: string }>;
}

/**
 * GET /api/workflows/[workflowId]/executions
 * List executions for a workflow with optional logs and job details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workflowId } = await params;
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status') || undefined;
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const includeLogs = searchParams.get('logs') === 'true';
    const includeJobs = searchParams.get('includeJobs') === 'true';

    // Get executions
    const executions = await listExecutions(workflowId, {
      status,
      limit,
      offset,
    });

    // Build enriched executions with logs and/or job details
    const enrichedExecutions = await Promise.all(
      executions.map(async (exec) => {
        const executionId = exec._id!.toString();
        const result: Record<string, unknown> = {
          ...exec,
          _id: executionId,
        };

        // Include logs if requested
        if (includeLogs) {
          const logs = await getExecutionLogs(executionId, { limit: 100 });
          result.logs = logs.map((log) => ({
            ...log,
            _id: log._id?.toString(),
          }));
        }

        // Include job details for pending/running executions if requested
        if (includeJobs && ['pending', 'running'].includes(exec.status)) {
          const job = await getJobByExecutionId(executionId);
          if (job) {
            result.job = {
              jobId: job._id?.toString(),
              status: job.status,
              attempts: job.attempts,
              maxAttempts: job.maxAttempts,
              lastError: job.lastError,
              runAt: job.runAt,
              createdAt: job.createdAt,
              completedAt: job.completedAt,
              canRetry: ['failed', 'pending', 'processing'].includes(job.status),
              canCancel: ['pending', 'processing'].includes(job.status),
              waitTimeMs: job.status === 'pending' && job.runAt
                ? Math.max(0, job.runAt.getTime() - Date.now())
                : null,
              isStale: job.status === 'processing' && job.lockedAt
                ? Date.now() - job.lockedAt.getTime() > 5 * 60 * 1000
                : false,
            };
          }
        }

        return result;
      })
    );

    return NextResponse.json({
      success: true,
      executions: enrichedExecutions,
      pagination: {
        limit,
        offset,
        hasMore: executions.length === limit,
      },
    });
  } catch (error) {
    console.error('Error listing executions:', error);
    return NextResponse.json(
      { error: 'Failed to list executions' },
      { status: 500 }
    );
  }
}
