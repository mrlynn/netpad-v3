/**
 * Workflow Executions API
 *
 * GET /api/workflows/[workflowId]/executions - List executions for a workflow
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { listExecutions, getExecutionLogs } from '@/lib/workflow/db';

interface RouteParams {
  params: Promise<{ workflowId: string }>;
}

/**
 * GET /api/workflows/[workflowId]/executions
 * List executions for a workflow with optional logs
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

    // Get executions
    const executions = await listExecutions(workflowId, {
      status,
      limit,
      offset,
    });

    // Optionally include logs for each execution
    let executionsWithLogs;
    if (includeLogs) {
      executionsWithLogs = await Promise.all(
        executions.map(async (exec) => {
          const logs = await getExecutionLogs(exec._id!.toString(), { limit: 100 });
          return {
            ...exec,
            _id: exec._id?.toString(),
            logs: logs.map((log) => ({
              ...log,
              _id: log._id?.toString(),
            })),
          };
        })
      );
    } else {
      executionsWithLogs = executions.map((exec) => ({
        ...exec,
        _id: exec._id?.toString(),
      }));
    }

    return NextResponse.json({
      success: true,
      executions: executionsWithLogs,
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
