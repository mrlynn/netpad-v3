/**
 * Synchronous Reaction Execution Engine
 *
 * Executes form reactions by running the linked workflow synchronously
 * and extracting field updates from the output.
 *
 * For v1, this does NOT use the job queue - workflows are executed inline.
 * Async execution via job queue is planned for Phase 5.
 */

import { nanoid } from 'nanoid';
import { getWorkflowById } from '@/lib/workflow/db';
import { getHandler } from '@/lib/workflow/nodeHandlers';
import { ExtendedNodeContext } from '@/lib/workflow/nodeHandlers/types';
import { topologicalSort, gatherInputs } from '@/lib/workflow/executor';
import {
  substituteVariables,
  buildSubstitutionContext,
} from '@/lib/workflow/variableSubstitution';
import { getDecryptedConnectionString } from '@/lib/platform/connectionVault';
import { getEmailCredentials } from '@/lib/platform/integrationCredentials';
import type {
  FormReaction,
  ReactionExecutionResult,
  FieldEvent,
  ReactionErrorCode,
} from '@/types/reactions';

/**
 * Maximum cascade depth to prevent infinite loops
 * when reaction A updates field B which triggers reaction B
 */
const MAX_CASCADE_DEPTH = 3;

/**
 * Default timeout for synchronous execution (10 seconds)
 */
const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * Options for executing a reaction
 */
export interface ExecuteReactionOptions {
  /** The reaction configuration */
  reaction: FormReaction;

  /** Form ID that triggered the reaction */
  formId: string;

  /** Organization ID */
  orgId: string;

  /** Field path that triggered the reaction */
  triggerField: string;

  /** Event type that triggered */
  triggerEvent: FieldEvent;

  /** Complete form data at trigger time */
  formData: Record<string, unknown>;

  /** User ID (if authenticated) */
  userId?: string;

  /** Current cascade depth (for preventing infinite loops) */
  cascadeDepth?: number;

  /** Parent execution ID (if cascaded) */
  triggeredByExecutionId?: string;
}

/**
 * Execute a reaction synchronously.
 *
 * Loads the workflow, runs nodes inline, and extracts field updates
 * from the form-field-update node output.
 */
export async function executeReaction(
  options: ExecuteReactionOptions
): Promise<ReactionExecutionResult> {
  const {
    reaction,
    formId,
    orgId,
    triggerField,
    triggerEvent,
    formData,
    userId,
    cascadeDepth = 0,
    triggeredByExecutionId,
  } = options;

  const executionId = `rexec_${nanoid(12)}`;
  const startTime = Date.now();
  const timeoutMs = reaction.execution?.timeoutMs || DEFAULT_TIMEOUT_MS;

  console.log(`[ReactionExecutor] Starting execution ${executionId}`, {
    reactionId: reaction.id,
    workflowId: reaction.workflowId,
    triggerField,
    triggerEvent,
    cascadeDepth,
  });

  // Check cascade depth to prevent infinite loops
  if (cascadeDepth >= MAX_CASCADE_DEPTH) {
    console.warn(`[ReactionExecutor] Cascade depth limit reached`, {
      executionId,
      cascadeDepth,
      maxDepth: MAX_CASCADE_DEPTH,
    });

    return {
      status: 'failed',
      executionId,
      error: {
        message: `Maximum cascade depth (${MAX_CASCADE_DEPTH}) exceeded. This can happen when reactions trigger each other in a loop.`,
        code: 'CASCADE_LIMIT' as ReactionErrorCode,
        details: { cascadeDepth, maxDepth: MAX_CASCADE_DEPTH },
      },
      durationMs: Date.now() - startTime,
    };
  }

  // Load the workflow
  let workflow;
  try {
    workflow = await getWorkflowById(orgId, reaction.workflowId);
  } catch (error) {
    console.error(`[ReactionExecutor] Failed to load workflow`, {
      executionId,
      workflowId: reaction.workflowId,
      error,
    });

    return {
      status: 'failed',
      executionId,
      error: {
        message: 'Failed to load workflow',
        code: 'WORKFLOW_NOT_FOUND' as ReactionErrorCode,
        details: { workflowId: reaction.workflowId },
      },
      durationMs: Date.now() - startTime,
    };
  }

  if (!workflow) {
    return {
      status: 'failed',
      executionId,
      error: {
        message: `Workflow ${reaction.workflowId} not found`,
        code: 'WORKFLOW_NOT_FOUND' as ReactionErrorCode,
        details: { workflowId: reaction.workflowId },
      },
      durationMs: Date.now() - startTime,
    };
  }

  // Build trigger payload for the workflow
  const triggerPayload = {
    type: 'field_event' as const,
    payload: {
      formId,
      reactionId: reaction.id,
      triggerField,
      triggerEvent,
      fieldValue: formData[triggerField],
      formData,
      // Include cascade tracking
      cascadeDepth,
      triggeredByExecutionId,
    },
  };

  // Get workflow nodes and edges
  const { nodes, edges } = workflow.canvas;

  if (!nodes || nodes.length === 0) {
    return {
      status: 'failed',
      executionId,
      error: {
        message: 'Workflow has no nodes',
        code: 'EXECUTION_FAILED' as ReactionErrorCode,
        details: { workflowId: reaction.workflowId },
      },
      durationMs: Date.now() - startTime,
    };
  }

  // Get execution order via topological sort
  const executionOrder = topologicalSort(nodes, edges);

  console.log(`[ReactionExecutor] Execution order`, {
    executionId,
    nodeCount: executionOrder.length,
    nodes: executionOrder.map((n) => `${n.id}(${n.type})`),
  });

  // Initialize execution state
  const nodeOutputs: Record<string, Record<string, unknown>> = {};
  const variables: Record<string, unknown> = {};

  // Initialize workflow variables with defaults
  for (const v of workflow.variables || []) {
    variables[v.name] = v.defaultValue;
  }

  // Create timeout promise
  let timeoutHandle: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error('EXECUTION_TIMEOUT'));
    }, timeoutMs);
  });

  try {
    // Execute workflow nodes inline
    const executionPromise = (async () => {
      for (const node of executionOrder) {
        // Skip disabled nodes
        if (!node.enabled) {
          console.log(`[ReactionExecutor] Skipping disabled node`, {
            executionId,
            nodeId: node.id,
          });
          continue;
        }

        // Get the handler for this node type
        const handler = getHandler(node.type);
        if (!handler) {
          console.warn(`[ReactionExecutor] No handler for node type`, {
            executionId,
            nodeId: node.id,
            nodeType: node.type,
          });
          // Skip unknown node types rather than failing
          continue;
        }

        // Build substitution context for variable resolution
        const subContext = buildSubstitutionContext(nodeOutputs, triggerPayload, variables);

        // Resolve variables in node config
        const resolvedConfig = substituteVariables(node.config, subContext) as Record<
          string,
          unknown
        >;

        // Gather inputs from upstream nodes
        const inputs = gatherInputs(node.id, edges, nodeOutputs);

        // Build node execution context
        const context: ExtendedNodeContext = {
          workflowId: workflow.id,
          executionId,
          nodeId: node.id,
          orgId,
          inputs,
          config: node.config,
          resolvedConfig,
          variables,
          nodeOutputs,
          trigger: triggerPayload,
          // Minimal logging for sync v1 execution
          log: async (level, message, data) => {
            if (level === 'error' || level === 'warn') {
              console.log(`[ReactionExecutor:${node.id}] ${level}: ${message}`, data);
            }
          },
          getConnection: async (vaultId) => {
            const connectionString = await getDecryptedConnectionString(orgId, vaultId);
            return { connectionString };
          },
          getEmailCredentials: async (credentialId) => {
            return getEmailCredentials(orgId, credentialId);
          },
        };

        console.log(`[ReactionExecutor] Executing node`, {
          executionId,
          nodeId: node.id,
          nodeType: node.type,
        });

        // Execute the node
        const result = await handler(context);

        if (result.success) {
          // Store node output for downstream nodes
          nodeOutputs[node.id] = result.data;
        } else {
          // Node failed - return error
          console.error(`[ReactionExecutor] Node execution failed`, {
            executionId,
            nodeId: node.id,
            error: result.error,
          });

          return {
            status: 'failed' as const,
            executionId,
            error: {
              message: result.error?.message || 'Node execution failed',
              code: 'EXECUTION_FAILED' as ReactionErrorCode,
              details: {
                nodeId: node.id,
                nodeType: node.type,
                nodeError: result.error,
              },
            },
            durationMs: Date.now() - startTime,
          };
        }
      }

      // Execution completed - extract updates from form-field-update node
      const updateNodes = executionOrder.filter((n) => n.type === 'form-field-update' && n.enabled);

      // Get updates from the last form-field-update node
      const updateNode = updateNodes[updateNodes.length - 1];
      let updates: Record<string, unknown> = {};

      if (updateNode && nodeOutputs[updateNode.id]) {
        const output = nodeOutputs[updateNode.id];
        updates = (output.updates as Record<string, unknown>) || {};

        console.log(`[ReactionExecutor] Extracted updates from node`, {
          executionId,
          nodeId: updateNode.id,
          updateCount: Object.keys(updates).length,
        });
      } else {
        console.log(`[ReactionExecutor] No form-field-update node found or no output`, {
          executionId,
          updateNodeIds: updateNodes.map((n) => n.id),
        });
      }

      return {
        status: 'completed' as const,
        executionId,
        result: {
          updates,
          // Include feedback if configured on the reaction
          feedback: reaction.feedback?.successMessage
            ? {
                message: reaction.feedback.successMessage,
                type: 'success' as const,
              }
            : undefined,
        },
        durationMs: Date.now() - startTime,
      };
    })();

    // Race between execution and timeout
    const result = await Promise.race([executionPromise, timeoutPromise]);

    console.log(`[ReactionExecutor] Execution completed`, {
      executionId,
      status: result.status,
      durationMs: result.durationMs,
    });

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isTimeout = errorMessage === 'EXECUTION_TIMEOUT';

    console.error(`[ReactionExecutor] Execution error`, {
      executionId,
      error: errorMessage,
      isTimeout,
    });

    return {
      status: 'failed',
      executionId,
      error: {
        message: isTimeout
          ? `Execution timed out after ${timeoutMs}ms`
          : `Execution failed: ${errorMessage}`,
        code: (isTimeout ? 'EXECUTION_TIMEOUT' : 'EXECUTION_FAILED') as ReactionErrorCode,
        details: isTimeout ? { timeoutMs } : undefined,
      },
      durationMs: Date.now() - startTime,
    };
  } finally {
    // Clean up timeout
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}
