/**
 * Moltboard Get Tasks Node Handler
 *
 * Retrieves tasks from a Moltboard kanban board.
 *
 * Config:
 *   - credentialId: Integration credential ID (optional if apiKey provided)
 *   - apiKey: Direct API key (optional if credentialId provided)
 *   - baseUrl: API base URL (default: https://kanban.mlynn.org)
 *   - boardId: Filter by board (optional)
 *   - columnId: Filter by column (optional)
 *   - labels: Filter by labels (optional)
 *   - priority: Filter by priority (optional)
 *   - limit: Max tasks to return (optional, default 100)
 *
 * Output:
 *   - tasks: Array of task objects
 *   - count: Number of tasks returned
 *   - boardId: Board ID if filtered
 *   - columnId: Column ID if filtered
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
  MoltboardGetTasksConfig,
  TaskQueryParams,
} from '@/lib/integrations/moltboard';

const metadata: HandlerMetadata = {
  type: 'moltboard:get-tasks',
  name: 'Moltboard: Get Tasks',
  description: 'Retrieves tasks from a Moltboard kanban board',
  version: '1.0.0',
};

const DEFAULT_BASE_URL = 'https://kanban.mlynn.org';
const DEFAULT_LIMIT = 100;

const handler: NodeHandler = async (context: ExtendedNodeContext) => {
  const startTime = Date.now();

  await context.log('info', 'Fetching Moltboard tasks', {
    nodeId: context.nodeId,
  });

  const config = context.resolvedConfig as unknown as MoltboardGetTasksConfig;

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

    const queryParams: TaskQueryParams = {};
    if (config.boardId) queryParams.boardId = config.boardId;
    if (config.columnId) queryParams.columnId = config.columnId;
    if (config.labels) queryParams.labels = config.labels;
    if (config.priority) queryParams.priority = config.priority;

    await context.log('info', 'Querying tasks', {
      boardId: config.boardId,
      columnId: config.columnId,
      labels: config.labels,
      priority: config.priority,
    });

    let tasks = await client.listTasks(queryParams);

    // Apply limit
    const limit = config.limit || DEFAULT_LIMIT;
    if (tasks.length > limit) {
      tasks = tasks.slice(0, limit);
    }

    await context.log('info', `Retrieved ${tasks.length} tasks`);

    return successResult(
      {
        tasks,
        count: tasks.length,
        boardId: config.boardId || null,
        columnId: config.columnId || null,
        filters: {
          labels: config.labels || [],
          priority: config.priority || null,
        },
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

    await context.log('error', `Failed to fetch tasks: ${errorMessage}`);
    return failureResult(
      NodeErrorCodes.OPERATION_FAILED,
      `Failed to fetch Moltboard tasks: ${errorMessage}`,
      true
    );
  }
};

// Register the handler
registerHandler(metadata, handler);

export { handler, metadata };
