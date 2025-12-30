/**
 * Execution Status API Route
 *
 * GET /api/executions/[executionId] - Get execution status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getExecutionById, getExecutionLogs } from '@/lib/workflow/db';

interface RouteParams {
  params: Promise<{ executionId: string }>;
}

/**
 * GET /api/executions/[executionId]
 * Get execution status and optionally logs
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { executionId } = await params;
    const { searchParams } = new URL(request.url);
    const includeLogs = searchParams.get('logs') === 'true';
    const logLevel = searchParams.get('logLevel') || undefined;

    // Get execution
    const execution = await getExecutionById(executionId);
    if (!execution) {
      return NextResponse.json({ error: 'Execution not found' }, { status: 404 });
    }

    // TODO: Verify user has access to this organization
    // For now, we trust the authentication

    // Calculate progress
    const totalNodes = execution.completedNodes.length +
      execution.failedNodes.length +
      execution.skippedNodes.length;

    // Optionally fetch logs
    let logs = undefined;
    if (includeLogs) {
      logs = await getExecutionLogs(executionId, {
        level: logLevel,
        limit: 500,
      });
    }

    return NextResponse.json({
      execution: {
        ...execution,
        _id: execution._id?.toString(),
      },
      logs: logs?.map(log => ({
        ...log,
        _id: log._id?.toString(),
      })),
      progress: {
        completed: execution.completedNodes.length,
        failed: execution.failedNodes.length,
        skipped: execution.skippedNodes.length,
        total: totalNodes,
      },
    });
  } catch (error) {
    console.error('Error fetching execution:', error);
    return NextResponse.json(
      { error: 'Failed to fetch execution' },
      { status: 500 }
    );
  }
}
