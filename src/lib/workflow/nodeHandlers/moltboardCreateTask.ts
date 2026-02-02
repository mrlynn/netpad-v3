/**
 * Moltboard Create Task Node Handler
 *
 * Creates a new task in a Moltboard kanban board.
 *
 * Config:
 *   - credentialId: Integration credential ID (optional if apiKey provided)
 *   - apiKey: Direct API key (optional if credentialId provided)
 *   - baseUrl: API base URL (default: https://kanban.mlynn.org)
 *   - boardId: Target board ID (required)
 *   - columnId: Target column ID (required)
 *   - title: Task title (supports {{variables}})
 *   - description: Task description (supports {{variables}})
 *   - labels: Array of label strings
 *   - priority: 'p0' | 'p1' | 'p2' | 'p3'
 *   - dueDate: ISO date string or expression
 *   - assigneeId: Assignee identifier
 *
 * Output:
 *   - task: The created task object
 *   - taskId: The task ID
 *   - taskUrl: URL to view the task
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
  MoltboardCreateTaskConfig,
  MoltboardPriority,
} from '@/lib/integrations/moltboard';

const metadata: HandlerMetadata = {
  type: 'moltboard:create-task',
  name: 'Moltboard: Create Task',
  description: 'Creates a new task in a Moltboard kanban board',
  version: '1.0.0',
};

const DEFAULT_BASE_URL = 'https://kanban.mlynn.org';

const handler: NodeHandler = async (context: ExtendedNodeContext) => {
  const startTime = Date.now();

  await context.log('info', 'Creating Moltboard task', {
    nodeId: context.nodeId,
  });

  const config = context.resolvedConfig as unknown as MoltboardCreateTaskConfig;

  // Validate required fields
  if (!config.boardId) {
    await context.log('error', 'boardId is required');
    return failureResult(
      NodeErrorCodes.MISSING_CONFIG,
      'boardId is required for Moltboard task creation',
      false
    );
  }

  if (!config.columnId) {
    await context.log('error', 'columnId is required');
    return failureResult(
      NodeErrorCodes.MISSING_CONFIG,
      'columnId is required for Moltboard task creation',
      false
    );
  }

  if (!config.title) {
    await context.log('error', 'title is required');
    return failureResult(
      NodeErrorCodes.MISSING_CONFIG,
      'title is required for Moltboard task creation',
      false
    );
  }

  // Get API key from config or credentials
  let apiKey = config.apiKey;
  let baseUrl = config.baseUrl || DEFAULT_BASE_URL;

  if (!apiKey && config.credentialId) {
    // Look up credentials from the vault
    try {
      const { getMoltboardCredentials } = await import('@/lib/platform/integrationCredentials');
      const creds = await getMoltboardCredentials(context.orgId, config.credentialId);
      if (creds) {
        apiKey = creds.apiKey;
        baseUrl = creds.baseUrl;
        await context.log('info', 'Using stored Moltboard credentials');
      } else {
        await context.log('error', 'Moltboard credentials not found or expired');
        return failureResult(
          NodeErrorCodes.MISSING_CONNECTION,
          'Moltboard credentials not found or expired. Please reconfigure.',
          false
        );
      }
    } catch (error) {
      await context.log('error', 'Failed to retrieve credentials', { error });
      return failureResult(
        NodeErrorCodes.INTERNAL_ERROR,
        'Failed to retrieve Moltboard credentials.',
        false
      );
    }
  }

  if (!apiKey) {
    await context.log('error', 'No API key provided');
    return failureResult(
      NodeErrorCodes.MISSING_CONFIG,
      'Moltboard API key is required. Provide apiKey or credentialId.',
      false
    );
  }

  try {
    const client = new MoltboardClient({ apiKey, baseUrl });

    await context.log('info', `Creating task in board ${config.boardId}, column ${config.columnId}`);

    const task = await client.createTask({
      boardId: config.boardId,
      columnId: config.columnId,
      title: config.title,
      description: config.description,
      labels: config.labels,
      priority: config.priority as MoltboardPriority,
      dueDate: config.dueDate,
      assigneeId: config.assigneeId,
    });

    await context.log('info', `Created task: ${task.id}`, {
      taskId: task.id,
      title: task.title,
    });

    const taskUrl = `${baseUrl}/boards/${config.boardId}?task=${task.id}`;

    return successResult(
      {
        task,
        taskId: task.id,
        taskUrl,
        boardId: config.boardId,
        columnId: config.columnId,
      },
      { durationMs: Date.now() - startTime }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (error instanceof MoltboardError) {
      await context.log('error', `Moltboard API error: ${errorMessage}`, {
        statusCode: error.statusCode,
      });

      return failureResult(
        error.isUnauthorized
          ? NodeErrorCodes.MISSING_CONNECTION
          : NodeErrorCodes.OPERATION_FAILED,
        `Moltboard API error: ${errorMessage}`,
        error.isRetryable
      );
    }

    await context.log('error', `Failed to create task: ${errorMessage}`);
    return failureResult(
      NodeErrorCodes.OPERATION_FAILED,
      `Failed to create Moltboard task: ${errorMessage}`,
      true
    );
  }
};

// Register the handler
registerHandler(metadata, handler);

export { handler, metadata };
