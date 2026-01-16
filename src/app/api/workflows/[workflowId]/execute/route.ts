/**
 * Workflow Execute API Route
 *
 * POST /api/workflows/[workflowId]/execute - Trigger workflow execution
 *
 * Options:
 * - processImmediately: If true, execute the workflow synchronously instead of queueing.
 *   This is useful for testing and development where cron workers aren't running.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import {
  getWorkflowById,
  createExecution,
  enqueueJob,
  canEnqueueJob,
  claimJobById,
} from '@/lib/workflow/db';
import { executeWorkflowJob } from '@/lib/workflow/executor';
import { incrementWorkflowExecutionAtQueue } from '@/lib/platform/billing';
import { getUserOrgPermissions } from '@/lib/platform/permissions';
import { nanoid } from 'nanoid';

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
    const { orgId, payload, processImmediately = false } = body;

    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
    }

    // Verify user has access to this organization
    const permissions = await getUserOrgPermissions(session.userId, orgId);
    if (!permissions.orgRole) {
      return NextResponse.json(
        { error: 'Not a member of this organization' },
        { status: 403 }
      );
    }

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

    // Queue the job for processing
    const jobId = await enqueueJob({
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

    // If processImmediately is requested, execute the job synchronously
    // This is useful for testing in development where cron workers aren't running
    if (processImmediately) {
      const workerId = `immediate_${nanoid(8)}`;

      try {
        // Claim the job we just created
        const job = await claimJobById(jobId, workerId);

        if (job) {
          console.log(`[ImmediateExecution] Processing job ${jobId} for workflow ${workflowId}`);
          const success = await executeWorkflowJob(job);

          return NextResponse.json({
            executionId,
            status: success ? 'completed' : 'failed',
            message: success ? 'Workflow executed successfully' : 'Workflow execution failed',
            processedImmediately: true,
          });
        } else {
          // Job was already claimed by another worker (race condition, unlikely)
          console.warn(`[ImmediateExecution] Could not claim job ${jobId}, it may have been processed already`);
        }
      } catch (execError) {
        console.error(`[ImmediateExecution] Error executing job ${jobId}:`, execError);
        // Return pending status - the job is queued and will be retried by cron
        return NextResponse.json({
          executionId,
          status: 'pending',
          message: 'Immediate execution failed, job queued for retry',
          error: execError instanceof Error ? execError.message : 'Unknown error',
        });
      }
    }

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
