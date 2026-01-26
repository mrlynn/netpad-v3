/**
 * Workflow Job Processor API
 *
 * POST /api/workflows/process
 * Claims and processes pending workflow jobs
 *
 * Query parameters:
 * - count: Number of jobs to process (default: 1, max: 10)
 * - secret: Optional API secret for cron authentication
 *
 * This endpoint can be called:
 * - Manually for testing
 * - By a cron job (e.g., Vercel Cron)
 * - By a webhook after form submission
 *
 * Execution Modes:
 * - Standard: Single-pass execution (open-core, default)
 * - Durable: State-persistent execution with approvals/timers (cloud premium)
 *
 * The processor automatically detects which mode to use based on:
 * 1. Workflow node types (approval, signal nodes require durable)
 * 2. Workflow settings (explicit executionMode configuration)
 * 3. Cloud features availability (@netpad/cloud-features package)
 */

import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { claimJob, getWorkflowById } from '@/lib/workflow/db';
import { executeWorkflowJob } from '@/lib/workflow/executor';
import {
  getExecutionMode,
  executeDurableWorkflowJob,
  isDurableExecutionAvailable,
} from '@/lib/workflow/durableExecution';

// Maximum jobs to process in one request
const MAX_JOBS_PER_REQUEST = 10;

// Optional secret for cron authentication
const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const workerId = `worker_${nanoid(8)}`;

  console.log(`[WorkflowProcessor] Worker ${workerId} starting`);

  try {
    // Check authentication if CRON_SECRET is set
    if (CRON_SECRET) {
      const authHeader = request.headers.get('authorization');
      const urlSecret = request.nextUrl.searchParams.get('secret');

      if (authHeader !== `Bearer ${CRON_SECRET}` && urlSecret !== CRON_SECRET) {
        // Also check for Vercel Cron authorization header
        const vercelCronHeader = request.headers.get('x-vercel-cron');
        if (!vercelCronHeader) {
          console.warn(`[WorkflowProcessor] Unauthorized request from ${request.headers.get('x-forwarded-for')}`);
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
          );
        }
      }
    }

    // Parse count parameter
    const countParam = request.nextUrl.searchParams.get('count');
    let count = countParam ? parseInt(countParam, 10) : 1;
    if (isNaN(count) || count < 1) count = 1;
    if (count > MAX_JOBS_PER_REQUEST) count = MAX_JOBS_PER_REQUEST;

    // Process jobs
    const results: Array<{
      jobId: string;
      workflowId: string;
      executionId: string;
      success: boolean;
      durationMs: number;
      error?: string;
    }> = [];

    // Check if durable execution is available (do this once, not per-job)
    const durableAvailable = await isDurableExecutionAvailable();

    for (let i = 0; i < count; i++) {
      // Claim a job
      const job = await claimJob(workerId);

      if (!job) {
        console.log(`[WorkflowProcessor] No more pending jobs`);
        break;
      }

      const jobStartTime = Date.now();
      console.log(`[WorkflowProcessor] Claimed job ${job._id} for workflow ${job.workflowId}`);

      try {
        // Load the workflow to determine execution mode
        const workflow = await getWorkflowById(job.orgId, job.workflowId);

        if (!workflow) {
          console.error(`[WorkflowProcessor] Workflow not found: ${job.workflowId}`);
          results.push({
            jobId: job._id!.toString(),
            workflowId: job.workflowId,
            executionId: job.executionId,
            success: false,
            durationMs: Date.now() - jobStartTime,
            error: 'Workflow not found',
          });
          continue;
        }

        // Determine execution mode
        const executionMode = durableAvailable
          ? await getExecutionMode(workflow, job.orgId)
          : 'standard';

        let success: boolean;

        if (executionMode === 'durable') {
          // Use durable execution engine (cloud premium)
          console.log(`[WorkflowProcessor] Using DURABLE execution for workflow ${job.workflowId}`);

          const durableResult = await executeDurableWorkflowJob(
            job,
            workflow,
            null, // DB will be obtained from services
            null, // Services will be created internally
            { _id: job.orgId, orgId: job.orgId, name: 'org' }, // Basic org context
          );

          // Handle durable execution result
          if (durableResult.status === 'completed') {
            success = true;
          } else if (durableResult.status === 'waiting') {
            // Job is waiting for approval/timer - this is not a failure
            // The job should be left in a waiting state, not marked complete
            console.log(
              `[WorkflowProcessor] Execution ${job.executionId} is waiting for: ${durableResult.waitingFor?.type}`,
            );
            success = true; // Job processed successfully, execution is paused
          } else {
            success = false;
          }
        } else {
          // Use standard execution (open-core)
          console.log(`[WorkflowProcessor] Using STANDARD execution for workflow ${job.workflowId}`);
          success = await executeWorkflowJob(job);
        }

        results.push({
          jobId: job._id!.toString(),
          workflowId: job.workflowId,
          executionId: job.executionId,
          success,
          durationMs: Date.now() - jobStartTime,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[WorkflowProcessor] Error executing job ${job._id}:`, error);

        results.push({
          jobId: job._id!.toString(),
          workflowId: job.workflowId,
          executionId: job.executionId,
          success: false,
          durationMs: Date.now() - jobStartTime,
          error: errorMessage,
        });
      }
    }

    const totalDuration = Date.now() - startTime;
    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    console.log(`[WorkflowProcessor] Worker ${workerId} completed: ${successCount} success, ${failureCount} failed in ${totalDuration}ms`);

    return NextResponse.json({
      success: true,
      workerId,
      processed: results.length,
      successCount,
      failureCount,
      totalDurationMs: totalDuration,
      results,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[WorkflowProcessor] Fatal error:', error);

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        workerId,
      },
      { status: 500 }
    );
  }
}

// GET endpoint for health check / status
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'Workflow Job Processor',
    usage: {
      method: 'POST',
      description: 'Process pending workflow jobs',
      parameters: {
        count: 'Number of jobs to process (1-10, default: 1)',
        secret: 'Optional authentication secret',
      },
    },
  });
}
