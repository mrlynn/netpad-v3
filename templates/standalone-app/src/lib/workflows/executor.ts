/**
 * Workflow Executor
 *
 * Executes workflows by processing nodes in order.
 * This is a simplified workflow engine for standalone deployments.
 */

import { getWorkflowBySlug } from '../bundle';
import { COLLECTIONS, getCollection, WorkflowExecutionDocument } from '../database/schema';
import { executeNode } from './nodes';

interface WorkflowExecutionOptions {
  workflowId: string;
  workflowSlug: string;
  trigger: {
    type: 'form_submission' | 'scheduled' | 'manual' | 'api';
    formSlug?: string;
    submissionId?: string;
    jobId?: string;
  };
  input: Record<string, any>;
}

interface ExecutionContext {
  executionId: string;
  workflowId: string;
  workflowSlug: string;
  input: Record<string, any>;
  variables: Record<string, any>;
  logs: Array<{
    timestamp: Date;
    level: 'info' | 'warn' | 'error';
    message: string;
    nodeId?: string;
    data?: any;
  }>;
}

/**
 * Execute a workflow
 */
export async function executeWorkflow(
  options: WorkflowExecutionOptions
): Promise<{
  success: boolean;
  executionId: string;
  output?: Record<string, any>;
  error?: string;
}> {
  const { workflowId, workflowSlug, trigger, input } = options;
  const executionId = generateExecutionId();

  // Create execution context
  const context: ExecutionContext = {
    executionId,
    workflowId,
    workflowSlug,
    input,
    variables: { ...input },
    logs: [],
  };

  // Log execution start
  context.logs.push({
    timestamp: new Date(),
    level: 'info',
    message: `Workflow execution started`,
    data: { trigger, input },
  });

  // Create execution record
  const executionsCollection = await getCollection<WorkflowExecutionDocument>(
    COLLECTIONS.WORKFLOW_EXECUTIONS
  );

  await executionsCollection.insertOne({
    executionId,
    workflowId,
    workflowSlug,
    status: 'running',
    startedAt: new Date(),
    input,
    logs: context.logs,
  });

  try {
    // Load workflow
    const workflow = await getWorkflowBySlug(workflowSlug);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowSlug}`);
    }

    context.logs.push({
      timestamp: new Date(),
      level: 'info',
      message: `Loaded workflow: ${workflow.name}`,
    });

    // Get nodes and edges from canvas
    const nodes = workflow.canvas?.nodes || [];
    const edges = workflow.canvas?.edges || [];

    if (nodes.length === 0) {
      context.logs.push({
        timestamp: new Date(),
        level: 'warn',
        message: 'Workflow has no nodes',
      });

      // Mark as completed (nothing to do)
      await executionsCollection.updateOne(
        { executionId },
        {
          $set: {
            status: 'completed',
            completedAt: new Date(),
            duration: 0,
            output: {},
            logs: context.logs,
          },
        }
      );

      return { success: true, executionId, output: {} };
    }

    // Build execution order (topological sort)
    const executionOrder = buildExecutionOrder(nodes, edges);

    context.logs.push({
      timestamp: new Date(),
      level: 'info',
      message: `Executing ${executionOrder.length} nodes`,
      data: { nodeIds: executionOrder.map((n) => n.id) },
    });

    // Execute nodes in order
    for (const node of executionOrder) {
      // Skip trigger nodes (they just initiate the workflow)
      if (isTriggerNode(node)) {
        context.logs.push({
          timestamp: new Date(),
          level: 'info',
          message: `Skipping trigger node: ${node.data?.label || node.id}`,
          nodeId: node.id,
        });
        continue;
      }

      context.logs.push({
        timestamp: new Date(),
        level: 'info',
        message: `Executing node: ${node.data?.label || node.type}`,
        nodeId: node.id,
        data: { nodeType: node.type },
      });

      try {
        // Execute the node
        const nodeResult = await executeNode(node, context);

        // Store result in variables for downstream nodes
        if (nodeResult) {
          context.variables[node.id] = nodeResult;
          context.variables[`${node.id}_output`] = nodeResult;
        }

        context.logs.push({
          timestamp: new Date(),
          level: 'info',
          message: `Node completed: ${node.data?.label || node.type}`,
          nodeId: node.id,
          data: { output: nodeResult },
        });
      } catch (nodeError) {
        context.logs.push({
          timestamp: new Date(),
          level: 'error',
          message: `Node failed: ${node.data?.label || node.type}`,
          nodeId: node.id,
          data: { error: nodeError instanceof Error ? nodeError.message : 'Unknown error' },
        });

        // Decide whether to continue or fail based on node settings
        const continueOnError = node.data?.continueOnError === true;
        if (!continueOnError) {
          throw nodeError;
        }
      }

      // Update execution record with progress
      await executionsCollection.updateOne(
        { executionId },
        {
          $set: {
            logs: context.logs,
          },
        }
      );
    }

    // Calculate duration
    const startedAt = new Date(
      (await executionsCollection.findOne({ executionId }))?.startedAt || new Date()
    );
    const duration = Date.now() - startedAt.getTime();

    // Mark as completed
    await executionsCollection.updateOne(
      { executionId },
      {
        $set: {
          status: 'completed',
          completedAt: new Date(),
          duration,
          output: context.variables,
          logs: context.logs,
        },
      }
    );

    context.logs.push({
      timestamp: new Date(),
      level: 'info',
      message: 'Workflow execution completed',
      data: { duration },
    });

    return {
      success: true,
      executionId,
      output: context.variables,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    context.logs.push({
      timestamp: new Date(),
      level: 'error',
      message: `Workflow execution failed: ${errorMessage}`,
      data: { error: errorMessage },
    });

    // Mark as failed
    await executionsCollection.updateOne(
      { executionId },
      {
        $set: {
          status: 'failed',
          completedAt: new Date(),
          error: errorMessage,
          logs: context.logs,
        },
      }
    );

    return {
      success: false,
      executionId,
      error: errorMessage,
    };
  }
}

/**
 * Build execution order using topological sort
 */
function buildExecutionOrder(nodes: any[], edges: any[]): any[] {
  // Build adjacency list
  const graph = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  // Initialize
  for (const node of nodes) {
    graph.set(node.id, []);
    inDegree.set(node.id, 0);
  }

  // Build edges
  for (const edge of edges) {
    const targets = graph.get(edge.source) || [];
    targets.push(edge.target);
    graph.set(edge.source, targets);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  }

  // Find starting nodes (no incoming edges)
  const queue: string[] = [];
  for (const [nodeId, degree] of inDegree.entries()) {
    if (degree === 0) {
      queue.push(nodeId);
    }
  }

  // Topological sort
  const order: any[] = [];
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    const node = nodeMap.get(nodeId);
    if (node) {
      order.push(node);
    }

    for (const targetId of graph.get(nodeId) || []) {
      const newDegree = (inDegree.get(targetId) || 1) - 1;
      inDegree.set(targetId, newDegree);
      if (newDegree === 0) {
        queue.push(targetId);
      }
    }
  }

  return order;
}

/**
 * Check if a node is a trigger node
 */
function isTriggerNode(node: any): boolean {
  return (
    node.type === 'trigger' ||
    node.type === 'form_trigger' ||
    node.type === 'formSubmissionTrigger' ||
    node.type === 'scheduled_trigger' ||
    node.type === 'webhook_trigger' ||
    node.data?.type === 'trigger'
  );
}

function generateExecutionId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8);
  return `exec_${timestamp}${randomPart}`;
}

/**
 * Get workflow execution by ID
 */
export async function getExecution(executionId: string): Promise<WorkflowExecutionDocument | null> {
  const collection = await getCollection<WorkflowExecutionDocument>(
    COLLECTIONS.WORKFLOW_EXECUTIONS
  );
  return await collection.findOne({ executionId });
}

/**
 * Get recent executions for a workflow
 */
export async function getRecentExecutions(
  workflowSlug: string,
  limit: number = 10
): Promise<WorkflowExecutionDocument[]> {
  const collection = await getCollection<WorkflowExecutionDocument>(
    COLLECTIONS.WORKFLOW_EXECUTIONS
  );
  return await collection
    .find({ workflowSlug })
    .sort({ startedAt: -1 })
    .limit(limit)
    .toArray();
}
