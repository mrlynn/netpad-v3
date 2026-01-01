/**
 * Workflow Jobs Queue API
 *
 * GET /api/workflows/jobs - Get job queue status and list jobs
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getJobQueueStatus, getJobsCollection } from '@/lib/workflow/db';

/**
 * GET /api/workflows/jobs
 * Get job queue status for an organization
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');
    const status = searchParams.get('status'); // pending, processing, failed, completed
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
    }

    // Get queue stats
    const queueStatus = await getJobQueueStatus(orgId);

    // Get jobs list if status filter provided
    let jobs = null;
    if (status) {
      const collection = await getJobsCollection();
      const query: Record<string, unknown> = { orgId };
      if (status !== 'all') {
        query.status = status;
      }

      const jobDocs = await collection
        .find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();

      jobs = jobDocs.map((job) => ({
        jobId: job._id?.toString(),
        workflowId: job.workflowId,
        executionId: job.executionId,
        status: job.status,
        attempts: job.attempts,
        maxAttempts: job.maxAttempts,
        lastError: job.lastError,
        runAt: job.runAt,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
        // Computed
        canRetry: ['failed', 'pending', 'processing'].includes(job.status),
        canCancel: ['pending', 'processing'].includes(job.status),
        waitTimeMs: job.status === 'pending' && job.runAt
          ? Math.max(0, job.runAt.getTime() - Date.now())
          : null,
      }));
    }

    return NextResponse.json({
      success: true,
      queue: {
        ...queueStatus,
        totalActive: queueStatus.pending + queueStatus.processing,
      },
      jobs,
    });
  } catch (error) {
    console.error('Error getting job queue status:', error);
    return NextResponse.json(
      { error: 'Failed to get job queue status' },
      { status: 500 }
    );
  }
}
