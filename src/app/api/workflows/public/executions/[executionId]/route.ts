/**
 * Public Workflow Execution Status API Route
 *
 * GET /api/workflows/public/executions/[executionId] - Get execution status
 * 
 * This endpoint allows checking the status of a workflow execution without authentication.
 * Used for embedding workflow execution status in external applications.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getExecutionsCollection, getExecutionLogsCollection } from '@/lib/workflow/db';
import { WorkflowExecution, ExecutionLog } from '@/types/workflow';

interface RouteParams {
  params: Promise<{ executionId: string }>;
}

/**
 * GET /api/workflows/public/executions/[executionId]
 * Get execution status and logs
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { executionId } = await params;
    const includeLogs = request.nextUrl.searchParams.get('logs') === 'true';

    // Get execution
    const executionsCollection = await getExecutionsCollection();
    
    // Try to parse as ObjectId
    let executionIdObj;
    try {
      executionIdObj = new ObjectId(executionId);
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid execution ID format',
          code: 'INVALID_EXECUTION_ID',
        },
        { status: 400 }
      );
    }
    
    const execution = await executionsCollection.findOne({
      _id: executionIdObj,
    });

    if (!execution) {
      return NextResponse.json(
        {
          success: false,
          error: 'Execution not found',
          code: 'EXECUTION_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Get logs if requested
    let logs: ExecutionLog[] = [];
    if (includeLogs) {
      const logsCollection = await getExecutionLogsCollection();
      logs = await logsCollection
        .find({ executionId })
        .sort({ timestamp: 1 })
        .toArray();
    }

    // Return sanitized execution data (no sensitive info)
    return NextResponse.json({
      success: true,
      execution: {
        executionId: execution._id?.toString(),
        workflowId: execution.workflowId,
        status: execution.status,
        startedAt: execution.startedAt,
        completedAt: execution.completedAt,
        currentNodeId: execution.currentNodeId,
        completedNodes: execution.completedNodes,
        failedNodes: execution.failedNodes,
        result: execution.result,
        metrics: execution.metrics,
      },
      logs: includeLogs ? logs.map(log => ({
        nodeId: log.nodeId,
        timestamp: log.timestamp,
        level: log.level,
        event: log.event,
        message: log.message,
        data: log.data,
      })) : undefined,
    });
  } catch (error) {
    console.error('Error getting execution status:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get execution status',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
