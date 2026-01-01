/**
 * Workflow Executor
 *
 * Processes workflow jobs by:
 * 1. Loading the workflow definition
 * 2. Executing nodes in topological order
 * 3. Tracking execution state and logging
 * 4. Handling errors and retries
 */

import { ObjectId } from 'mongodb';
import {
  WorkflowJob,
  WorkflowDocument,
  WorkflowExecution,
  WorkflowNode,
  WorkflowEdge,
  NodeExecutionContext,
  NodeExecutionResult,
  ExecutionLog,
} from '@/types/workflow';
import {
  getWorkflowById,
  updateExecutionStatus,
  addExecutionLog,
  completeJob,
  failJob,
  updateWorkflowStats,
  getExecutionById,
} from './db';
import { getHandler, NodeErrorCodes } from './nodeHandlers';
import { ExtendedNodeContext } from './nodeHandlers/types';
import { getDecryptedConnectionString } from '@/lib/platform/connectionVault';
import {
  substituteVariables,
  buildSubstitutionContext,
  SubstitutionContext,
} from './variableSubstitution';
import { incrementWorkflowExecution } from '@/lib/platform/billing';

/**
 * Execute a workflow job
 * Main entry point for the executor
 */
export async function executeWorkflowJob(job: WorkflowJob): Promise<boolean> {
  const startTime = Date.now();
  const executionId = job.executionId;
  const orgId = job.orgId;

  console.log(`[Executor] Starting job for workflow ${job.workflowId}, execution ${executionId}`);

  try {
    // Load the workflow
    const workflow = await getWorkflowById(orgId, job.workflowId);
    if (!workflow) {
      console.error(`[Executor] Workflow not found: ${job.workflowId}`);
      await failJob(job._id!, 'Workflow not found', false);
      return false;
    }

    // Get the execution record
    const execution = await getExecutionById(executionId);
    if (!execution) {
      console.error(`[Executor] Execution not found: ${executionId}`);
      await failJob(job._id!, 'Execution record not found', false);
      return false;
    }

    // Mark execution as running
    await updateExecutionStatus(executionId, {
      status: 'running',
      startedAt: new Date(),
    });

    // Execute the workflow
    const result = await executeWorkflow(workflow, execution, job);

    const durationMs = Date.now() - startTime;

    if (result.success) {
      // Mark execution as completed
      await updateExecutionStatus(executionId, {
        status: 'completed',
        completedAt: new Date(),
        completedNodes: result.completedNodes,
        context: result.context,
        result: {
          success: true,
          output: result.output,
        },
        metrics: {
          totalDurationMs: durationMs,
          nodeMetrics: result.nodeMetrics,
        },
      });

      // Update workflow stats
      await updateWorkflowStats(orgId, workflow.id, true, durationMs);

      // Track usage for billing (increment successful execution count)
      await incrementWorkflowExecution(orgId, workflow.id, true);

      // Complete the job
      await completeJob(job._id!, result.output);

      console.log(`[Executor] Workflow ${job.workflowId} completed successfully in ${durationMs}ms`);
      return true;
    } else {
      // Mark execution as failed
      await updateExecutionStatus(executionId, {
        status: 'failed',
        completedAt: new Date(),
        completedNodes: result.completedNodes,
        failedNodes: result.failedNodes,
        context: result.context,
        result: {
          success: false,
          error: {
            nodeId: result.failedNodeId || 'unknown',
            code: result.errorCode || 'EXECUTION_FAILED',
            message: result.errorMessage || 'Workflow execution failed',
            timestamp: new Date(),
          },
        },
        metrics: {
          totalDurationMs: durationMs,
          nodeMetrics: result.nodeMetrics,
        },
      });

      // Update workflow stats
      await updateWorkflowStats(orgId, workflow.id, false, durationMs);

      // Track usage for billing (increment failed execution count)
      await incrementWorkflowExecution(orgId, workflow.id, false);

      // Fail the job (with retry if retryable)
      await failJob(job._id!, result.errorMessage || 'Execution failed', result.retryable);

      console.error(`[Executor] Workflow ${job.workflowId} failed: ${result.errorMessage}`);
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Executor] Fatal error executing workflow ${job.workflowId}:`, error);

    // Update execution status
    await updateExecutionStatus(executionId, {
      status: 'failed',
      completedAt: new Date(),
      result: {
        success: false,
        error: {
          nodeId: 'executor',
          code: 'FATAL_ERROR',
          message: errorMessage,
          timestamp: new Date(),
        },
      },
    });

    // Fail the job with retry
    await failJob(job._id!, errorMessage, true);

    return false;
  }
}

interface ExecutionResult {
  success: boolean;
  completedNodes: string[];
  failedNodes: string[];
  failedNodeId?: string;
  errorCode?: string;
  errorMessage?: string;
  retryable: boolean;
  output?: Record<string, unknown>;
  context: {
    variables: Record<string, unknown>;
    nodeOutputs: Record<string, Record<string, unknown>>;
    errors: Array<{ nodeId: string; code: string; message: string; timestamp: Date }>;
  };
  nodeMetrics: Record<string, { durationMs: number; retries: number; dataSize: number }>;
}

/**
 * Execute a workflow
 */
async function executeWorkflow(
  workflow: WorkflowDocument,
  execution: WorkflowExecution,
  job: WorkflowJob
): Promise<ExecutionResult> {
  const { nodes, edges } = workflow.canvas;

  // State tracking
  const nodeOutputs: Record<string, Record<string, unknown>> = {};
  const completedNodes: string[] = [];
  const failedNodes: string[] = [];
  const errors: Array<{ nodeId: string; code: string; message: string; timestamp: Date }> = [];
  const nodeMetrics: Record<string, { durationMs: number; retries: number; dataSize: number }> = {};

  // Initialize variables from workflow definition
  const variables: Record<string, unknown> = {};
  for (const v of workflow.variables) {
    variables[v.name] = v.defaultValue;
  }

  // Get execution order
  const executionOrder = topologicalSort(nodes, edges);
  console.log(`[Executor] Execution order: ${executionOrder.map((n) => n.id).join(' -> ')}`);

  // Execute each node
  for (const node of executionOrder) {
    // Skip disabled nodes
    if (!node.enabled) {
      console.log(`[Executor] Skipping disabled node: ${node.id}`);
      continue;
    }

    const nodeStartTime = Date.now();

    console.log(`[Executor] Executing node: ${node.id} (${node.type})`);

    // Get handler for this node type
    const handler = getHandler(node.type);
    if (!handler) {
      console.error(`[Executor] No handler found for node type: ${node.type}`);
      errors.push({
        nodeId: node.id,
        code: NodeErrorCodes.HANDLER_NOT_FOUND,
        message: `No handler for node type: ${node.type}`,
        timestamp: new Date(),
      });
      failedNodes.push(node.id);

      // Check error handling mode
      if (workflow.settings.errorHandling === 'stop') {
        return {
          success: false,
          completedNodes,
          failedNodes,
          failedNodeId: node.id,
          errorCode: NodeErrorCodes.HANDLER_NOT_FOUND,
          errorMessage: `No handler for node type: ${node.type}`,
          retryable: false,
          context: { variables, nodeOutputs, errors },
          nodeMetrics,
        };
      }
      continue;
    }

    // Build substitution context
    const subContext = buildSubstitutionContext(
      nodeOutputs,
      job.trigger,
      variables
    );

    // Resolve node config (substitute variables)
    const resolvedConfig = substituteVariables(node.config, subContext) as Record<string, unknown>;

    // Gather inputs from connected nodes
    const inputs = gatherInputs(node.id, edges, nodeOutputs);

    // Build execution context
    const context: ExtendedNodeContext = {
      workflowId: workflow.id,
      executionId: execution._id!.toString(),
      nodeId: node.id,
      orgId: workflow.orgId,
      inputs,
      config: node.config,
      resolvedConfig,
      variables,
      nodeOutputs,
      trigger: job.trigger,
      log: async (level, message, data) => {
        await addExecutionLog(
          execution._id!.toString(),
          node.id,
          level,
          level === 'error' ? 'node_error' : 'custom',
          message,
          data
        );
      },
      getConnection: async (vaultId: string) => {
        return getDecryptedConnectionString(workflow.orgId, vaultId);
      },
    };

    // Execute the handler
    try {
      // Log node start
      await addExecutionLog(
        execution._id!.toString(),
        node.id,
        'info',
        'node_start',
        `Starting node: ${node.type}`,
        { config: resolvedConfig }
      );

      const result = await handler(context);

      const nodeDuration = Date.now() - nodeStartTime;
      nodeMetrics[node.id] = {
        durationMs: nodeDuration,
        retries: 0,
        dataSize: JSON.stringify(result.data).length,
      };

      if (result.success) {
        // Store output
        nodeOutputs[node.id] = result.data;
        completedNodes.push(node.id);

        // Log success
        await addExecutionLog(
          execution._id!.toString(),
          node.id,
          'info',
          'node_complete',
          `Node completed successfully`,
          { output: result.data, durationMs: nodeDuration }
        );

        console.log(`[Executor] Node ${node.id} completed in ${nodeDuration}ms`);
      } else {
        // Node failed
        failedNodes.push(node.id);
        errors.push({
          nodeId: node.id,
          code: result.error?.code || 'UNKNOWN_ERROR',
          message: result.error?.message || 'Node execution failed',
          timestamp: new Date(),
        });

        // Log failure
        await addExecutionLog(
          execution._id!.toString(),
          node.id,
          'error',
          'node_error',
          result.error?.message || 'Node execution failed',
          { error: result.error }
        );

        console.error(`[Executor] Node ${node.id} failed: ${result.error?.message}`);

        // Check error handling mode
        if (workflow.settings.errorHandling === 'stop') {
          return {
            success: false,
            completedNodes,
            failedNodes,
            failedNodeId: node.id,
            errorCode: result.error?.code,
            errorMessage: result.error?.message,
            retryable: result.error?.retryable || false,
            context: { variables, nodeOutputs, errors },
            nodeMetrics,
          };
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      failedNodes.push(node.id);
      errors.push({
        nodeId: node.id,
        code: 'HANDLER_EXCEPTION',
        message: errorMessage,
        timestamp: new Date(),
      });

      // Log exception
      await addExecutionLog(
        execution._id!.toString(),
        node.id,
        'error',
        'node_error',
        `Handler threw exception: ${errorMessage}`,
        { stack: error instanceof Error ? error.stack : undefined }
      );

      console.error(`[Executor] Node ${node.id} threw exception:`, error);

      if (workflow.settings.errorHandling === 'stop') {
        return {
          success: false,
          completedNodes,
          failedNodes,
          failedNodeId: node.id,
          errorCode: 'HANDLER_EXCEPTION',
          errorMessage,
          retryable: true,
          context: { variables, nodeOutputs, errors },
          nodeMetrics,
        };
      }
    }
  }

  // Workflow completed (possibly with some failures if errorHandling is 'continue')
  const success = failedNodes.length === 0;

  // Collect final output from terminal nodes (nodes with no outgoing edges)
  const terminalNodes = nodes.filter(
    (n) => !edges.some((e) => e.source === n.id) && nodeOutputs[n.id]
  );
  const output = terminalNodes.length > 0
    ? nodeOutputs[terminalNodes[terminalNodes.length - 1].id]
    : nodeOutputs[completedNodes[completedNodes.length - 1]] || {};

  return {
    success,
    completedNodes,
    failedNodes,
    retryable: false,
    output,
    context: { variables, nodeOutputs, errors },
    nodeMetrics,
  };
}

/**
 * Topologically sort nodes based on their edges
 * Returns nodes in execution order (dependencies first)
 */
function topologicalSort(nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowNode[] {
  // Build adjacency list and in-degree count
  const nodeMap = new Map<string, WorkflowNode>();
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const node of nodes) {
    nodeMap.set(node.id, node);
    inDegree.set(node.id, 0);
    adjacency.set(node.id, []);
  }

  for (const edge of edges) {
    const targets = adjacency.get(edge.source) || [];
    targets.push(edge.target);
    adjacency.set(edge.source, targets);

    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  }

  // Kahn's algorithm
  const queue: string[] = [];
  const result: WorkflowNode[] = [];

  // Start with nodes that have no incoming edges
  for (const [nodeId, degree] of inDegree) {
    if (degree === 0) {
      queue.push(nodeId);
    }
  }

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    const node = nodeMap.get(nodeId);
    if (node) {
      result.push(node);
    }

    const neighbors = adjacency.get(nodeId) || [];
    for (const neighbor of neighbors) {
      const newDegree = (inDegree.get(neighbor) || 1) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) {
        queue.push(neighbor);
      }
    }
  }

  // If result doesn't include all nodes, there's a cycle
  if (result.length !== nodes.length) {
    console.warn('[Executor] Detected cycle in workflow graph, some nodes may not execute');
  }

  return result;
}

/**
 * Gather inputs from upstream nodes
 */
function gatherInputs(
  nodeId: string,
  edges: WorkflowEdge[],
  nodeOutputs: Record<string, Record<string, unknown>>
): Record<string, unknown> {
  const inputs: Record<string, unknown> = {};

  // Find all edges pointing to this node
  const incomingEdges = edges.filter((e) => e.target === nodeId);

  for (const edge of incomingEdges) {
    const sourceOutput = nodeOutputs[edge.source];
    if (sourceOutput) {
      // Use the target handle as the input key, or 'default' if not specified
      const inputKey = edge.targetHandle || 'default';

      // Apply edge mappings if defined
      if (edge.mapping && edge.mapping.length > 0) {
        for (const mapping of edge.mapping) {
          const value = getNestedValue(sourceOutput, mapping.sourceField);
          setNestedValue(inputs, mapping.targetField, value);
        }
      } else {
        // Default: pass through all source outputs
        inputs[inputKey] = sourceOutput;
      }
    }
  }

  return inputs;
}

/**
 * Get a nested value from an object using dot notation
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Set a nested value in an object using dot notation
 */
function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.');
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current) || typeof current[part] !== 'object') {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }

  current[parts[parts.length - 1]] = value;
}

export { topologicalSort, gatherInputs };
