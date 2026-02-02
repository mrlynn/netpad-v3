/**
 * Moltboard Update Task Node Handler
 *
 * Updates an existing task in a Moltboard kanban board.
 *
 * Config:
 *   - credentialId: Integration credential ID (optional if apiKey provided)
 *   - apiKey: Direct API key (optional if credentialId provided)
 *   - baseUrl: API base URL (default: https://kanban.mlynn.org)
 *   - taskId: Task ID to update (required)
 *   - title: New title (optional)
 *   - description: New description (optional)
 *   - columnId: Move to column (optional)
 *   - labels: Replace labels (optional)
 *   - priority: New priority (optional)
 *   - dueDate: New due date (optional)
 *   - assigneeId: New assignee (optional)
 *
 * Output:
 *   - task: The updated task object
 *   - taskId: The task ID
 *   - changes: Object showing what was changed
 */

import { registerHandler } from './registry';
import {
  ExtendedNodeContext,
  NodeHandler,
  HandlerMetadata,
  successResult,
  failureResult,
  NodeErrorCodes,
} from './types';
import {
  MoltboardClient,
  MoltboardError,
  MoltboardUpdateTaskConfig,
  UpdateTaskInput,
} from '@/lib/integrations/moltboard';

const metadata: HandlerMetadata = {
  type: 'moltboard:update-task',
  name: 'Moltboard: Update Task',
  description: 'Updates an existing task in a Moltboard kanban board',
  version: '1.0.0',
};

const DEFAULT_BASE_URL = 'https://kanban.mlynn.org';

const handler: NodeHandler = async (context: ExtendedNodeContext) => {
  const startTime = Date.now();

  await context.log('info', 'Updating Moltboard task', {
    nodeId: context.nodeId,
  });

  const config = context.resolvedConfig as unknown as MoltboardUpdateTaskConfig;

  // Validate required fields
  if (!config.taskId) {
    await context.log('error', 'taskId is required');
    return failureResult(
      NodeErrorCodes.MISSING_CONFIG,
      'taskId is required for Moltboard task update',
      false
    );
  }

  // Get API key from config or credentials
  let apiKey = config.apiKey;
  const baseUrl = config.baseUrl || DEFAULT_BASE_URL;

  if (!apiKey && config.credentialId) {
    // TODO: Implement credential lookup
    await context.log('error', 'Credential lookup not yet implemented');
    return failureResult(
      NodeErrorCodes.MISSING_CONFIG,
      'API key is required. Provide apiKey directly or configure credentials.',
      false
    );
  }

  if (!apiKey) {
    await context.log('error', 'No API key provided');
    return failureResult(
      NodeErrorCodes.MISSING_CONFIG,
      'Moltboard API key is required. Provide apiKey or credentialId.',
      false
    );
  }

  // Build update payload
  const updates: UpdateTaskInput = {};
  const changes: string[] = [];

  if (config.title !== undefined) {
    updates.title = config.title;
    changes.push('title');
  }
  if (config.description !== undefined) {
    updates.description = config.description;
    changes.push('description');
  }
  if (config.columnId !== undefined) {
    updates.columnId = config.columnId;
    changes.push('columnId');
  }
  if (config.labels !== undefined) {
    updates.labels = config.labels;
    changes.push('labels');
  }
  if (config.priority !== undefined) {
    updates.priority = config.priority;
    changes.push('priority');
  }
  if (config.dueDate !== undefined) {
    updates.dueDate = config.dueDate;
    changes.push('dueDate');
  }
  if (config.assigneeId !== undefined) {
    updates.assigneeId = config.assigneeId;
    changes.push('assigneeId');
  }

  if (changes.length === 0) {
    await context.log('warn', 'No updates specified');
    return failureResult(
      NodeErrorCodes.INVALID_CONFIG,
      'No update fields specified. Provide at least one field to update.',
      false
    );
  }

  try {
    const client = new MoltboardClient({ apiKey, baseUrl });

    await context.log('info', `Updating task ${config.taskId}`, {
      changes,
    });

    const task = await client.updateTask(config.taskId, updates);

    await context.log('info', `Updated task: ${task.id}`, {
      taskId: task.id,
      changes,
    });

    return successResult(
      {
        task,
        taskId: task.id,
        changes,
        updatedFields: changes,
      },
      { durationMs: Date.now() - startTime }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (error instanceof MoltboardError) {
      await context.log('error', `Moltboard API error: ${errorMessage}`, {
        statusCode: error.statusCode,
      });

      if (error.isNotFound) {
        return failureResult(
          NodeErrorCodes.INVALID_CONFIG,
          `Task not found: ${config.taskId}`,
          false
        );
      }

      return failureResult(
        error.isUnauthorized
          ? NodeErrorCodes.MISSING_CONNECTION
          : NodeErrorCodes.OPERATION_FAILED,
        `Moltboard API error: ${errorMessage}`,
        error.isRetryable
      );
    }

    await context.log('error', `Failed to update task: ${errorMessage}`);
    return failureResult(
      NodeErrorCodes.OPERATION_FAILED,
      `Failed to update Moltboard task: ${errorMessage}`,
      true
    );
  }
};

// Register the handler
registerHandler(metadata, handler);

export { handler, metadata };
