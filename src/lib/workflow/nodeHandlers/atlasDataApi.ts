/**
 * Atlas Data API Node Handler
 *
 * Performs CRUD operations via the MongoDB Atlas Data API.
 * Requires Atlas Data API credentials stored as an integration credential.
 *
 * Config:
 *   - credentialId: Integration credential ID (requires Data API App ID and API key)
 *   - dataSource: Data source name (usually the cluster name)
 *   - database: Database name
 *   - collection: Collection name
 *   - operation: 'find' | 'findOne' | 'insertOne' | 'insertMany' | 'updateOne' | 'updateMany' | 'deleteOne' | 'deleteMany' | 'aggregate'
 *   - filter: Query filter (for find/update/delete operations)
 *   - document: Document to insert (for insertOne)
 *   - documents: Documents to insert (for insertMany)
 *   - update: Update operations (for update operations, e.g., { $set: { field: value } })
 *   - pipeline: Aggregation pipeline (for aggregate)
 *   - options: Additional options (sort, limit, skip, projection, upsert)
 *
 * Output varies by operation:
 *   - find: { documents: [], count: number }
 *   - findOne: { document: {} | null, found: boolean }
 *   - insertOne: { insertedId: string }
 *   - insertMany: { insertedIds: [], insertedCount: number }
 *   - updateOne/Many: { matchedCount, modifiedCount, upsertedId? }
 *   - deleteOne/Many: { deletedCount: number }
 *   - aggregate: { documents: [], count: number }
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
import { createDataApiClientFromCredential, DataApiAction } from '@/lib/atlas/dataApi';

const metadata: HandlerMetadata = {
  type: 'atlas-data-api',
  name: 'Atlas Data API',
  description: 'Query and modify data in MongoDB Atlas via the Data API',
  version: '1.0.0',
};

interface DataApiOptions {
  projection?: Record<string, unknown>;
  sort?: Record<string, number>;
  limit?: number;
  skip?: number;
  upsert?: boolean;
}

/**
 * Parse configuration that may be JSON string or object
 */
function parseJsonConfig<T>(config: unknown, defaultValue: T): T {
  if (config === undefined || config === null || config === '') {
    return defaultValue;
  }

  if (typeof config === 'string') {
    try {
      return JSON.parse(config) as T;
    } catch {
      console.warn('[AtlasDataApi] Failed to parse JSON config:', config);
      return defaultValue;
    }
  }

  return config as T;
}

const handler: NodeHandler = async (context: ExtendedNodeContext) => {
  const startTime = Date.now();

  await context.log('info', 'Starting Atlas Data API operation', {
    nodeId: context.nodeId,
  });

  const { resolvedConfig } = context;

  // Extract configuration
  const credentialId = resolvedConfig.credentialId as string | undefined;
  const dataSource = resolvedConfig.dataSource as string | undefined;
  const database = resolvedConfig.database as string | undefined;
  const collection = resolvedConfig.collection as string | undefined;
  const operation = (resolvedConfig.operation as DataApiAction) || 'find';
  const filter = parseJsonConfig<Record<string, unknown>>(resolvedConfig.filter, {});
  const document = parseJsonConfig<Record<string, unknown>>(resolvedConfig.document, {});
  const documents = parseJsonConfig<Record<string, unknown>[]>(resolvedConfig.documents, []);
  const update = parseJsonConfig<Record<string, unknown>>(resolvedConfig.update, {});
  const pipeline = parseJsonConfig<Record<string, unknown>[]>(resolvedConfig.pipeline, []);
  const options = parseJsonConfig<DataApiOptions>(resolvedConfig.options, {});

  // Validate required config
  if (!credentialId) {
    await context.log('error', 'Credential ID is required');
    return failureResult(
      NodeErrorCodes.MISSING_CONFIG,
      'Data API credential ID is required',
      false
    );
  }

  if (!dataSource) {
    await context.log('error', 'Data source is required');
    return failureResult(
      NodeErrorCodes.MISSING_CONFIG,
      'Data source (cluster name) is required',
      false
    );
  }

  if (!database) {
    await context.log('error', 'Database name is required');
    return failureResult(
      NodeErrorCodes.MISSING_CONFIG,
      'Database name is required',
      false
    );
  }

  if (!collection) {
    await context.log('error', 'Collection name is required');
    return failureResult(
      NodeErrorCodes.MISSING_CONFIG,
      'Collection name is required',
      false
    );
  }

  // Create Data API client from stored credentials
  const client = await createDataApiClientFromCredential(context.orgId, credentialId);
  if (!client) {
    await context.log('error', 'Could not retrieve Data API credentials');
    return failureResult(
      NodeErrorCodes.MISSING_CONNECTION,
      'Could not retrieve Data API credentials. Please verify the credential is configured correctly.',
      false
    );
  }

  await context.log('info', `Executing Data API operation: ${operation}`, {
    database,
    collection,
    hasFilter: Object.keys(filter).length > 0,
  });

  try {
    let result: Record<string, unknown>;

    switch (operation) {
      case 'findOne': {
        const response = await client.findOne(
          dataSource,
          database,
          collection,
          filter,
          options.projection
        );

        if (!response.success) {
          await context.log('error', 'findOne failed', { error: response.error });
          return failureResult(
            NodeErrorCodes.OPERATION_FAILED,
            response.error?.message || 'findOne operation failed',
            true
          );
        }

        result = {
          document: response.data?.document || null,
          found: !!response.data?.document,
          operation: 'findOne',
        };
        break;
      }

      case 'find': {
        const response = await client.find(dataSource, database, collection, filter, {
          projection: options.projection,
          sort: options.sort,
          limit: options.limit,
          skip: options.skip,
        });

        if (!response.success) {
          await context.log('error', 'find failed', { error: response.error });
          return failureResult(
            NodeErrorCodes.OPERATION_FAILED,
            response.error?.message || 'find operation failed',
            true
          );
        }

        result = {
          documents: response.data?.documents || [],
          count: response.data?.documents?.length || 0,
          operation: 'find',
        };
        break;
      }

      case 'insertOne': {
        if (!document || Object.keys(document).length === 0) {
          await context.log('error', 'Document is required for insertOne');
          return failureResult(
            NodeErrorCodes.MISSING_CONFIG,
            'Document is required for insertOne operation',
            false
          );
        }

        const response = await client.insertOne(dataSource, database, collection, document);

        if (!response.success) {
          await context.log('error', 'insertOne failed', { error: response.error });
          return failureResult(
            NodeErrorCodes.OPERATION_FAILED,
            response.error?.message || 'insertOne operation failed',
            true
          );
        }

        result = {
          insertedId: response.data?.insertedId,
          operation: 'insertOne',
        };
        break;
      }

      case 'insertMany': {
        if (!documents || documents.length === 0) {
          await context.log('error', 'Documents array is required for insertMany');
          return failureResult(
            NodeErrorCodes.MISSING_CONFIG,
            'Documents array is required for insertMany operation',
            false
          );
        }

        const response = await client.insertMany(dataSource, database, collection, documents);

        if (!response.success) {
          await context.log('error', 'insertMany failed', { error: response.error });
          return failureResult(
            NodeErrorCodes.OPERATION_FAILED,
            response.error?.message || 'insertMany operation failed',
            true
          );
        }

        result = {
          insertedIds: response.data?.insertedIds || [],
          insertedCount: response.data?.insertedIds?.length || 0,
          operation: 'insertMany',
        };
        break;
      }

      case 'updateOne': {
        if (!update || Object.keys(update).length === 0) {
          await context.log('error', 'Update operations are required for updateOne');
          return failureResult(
            NodeErrorCodes.MISSING_CONFIG,
            'Update operations (e.g., { $set: {...} }) are required for updateOne',
            false
          );
        }

        const response = await client.updateOne(
          dataSource,
          database,
          collection,
          filter,
          update,
          { upsert: options.upsert }
        );

        if (!response.success) {
          await context.log('error', 'updateOne failed', { error: response.error });
          return failureResult(
            NodeErrorCodes.OPERATION_FAILED,
            response.error?.message || 'updateOne operation failed',
            true
          );
        }

        result = {
          matchedCount: response.data?.matchedCount || 0,
          modifiedCount: response.data?.modifiedCount || 0,
          upsertedId: response.data?.upsertedId,
          operation: 'updateOne',
        };
        break;
      }

      case 'updateMany': {
        if (!update || Object.keys(update).length === 0) {
          await context.log('error', 'Update operations are required for updateMany');
          return failureResult(
            NodeErrorCodes.MISSING_CONFIG,
            'Update operations (e.g., { $set: {...} }) are required for updateMany',
            false
          );
        }

        const response = await client.updateMany(
          dataSource,
          database,
          collection,
          filter,
          update,
          { upsert: options.upsert }
        );

        if (!response.success) {
          await context.log('error', 'updateMany failed', { error: response.error });
          return failureResult(
            NodeErrorCodes.OPERATION_FAILED,
            response.error?.message || 'updateMany operation failed',
            true
          );
        }

        result = {
          matchedCount: response.data?.matchedCount || 0,
          modifiedCount: response.data?.modifiedCount || 0,
          upsertedId: response.data?.upsertedId,
          operation: 'updateMany',
        };
        break;
      }

      case 'deleteOne': {
        const response = await client.deleteOne(dataSource, database, collection, filter);

        if (!response.success) {
          await context.log('error', 'deleteOne failed', { error: response.error });
          return failureResult(
            NodeErrorCodes.OPERATION_FAILED,
            response.error?.message || 'deleteOne operation failed',
            true
          );
        }

        result = {
          deletedCount: response.data?.deletedCount || 0,
          operation: 'deleteOne',
        };
        break;
      }

      case 'deleteMany': {
        const response = await client.deleteMany(dataSource, database, collection, filter);

        if (!response.success) {
          await context.log('error', 'deleteMany failed', { error: response.error });
          return failureResult(
            NodeErrorCodes.OPERATION_FAILED,
            response.error?.message || 'deleteMany operation failed',
            true
          );
        }

        result = {
          deletedCount: response.data?.deletedCount || 0,
          operation: 'deleteMany',
        };
        break;
      }

      case 'aggregate': {
        if (!pipeline || pipeline.length === 0) {
          await context.log('error', 'Pipeline is required for aggregate');
          return failureResult(
            NodeErrorCodes.MISSING_CONFIG,
            'Aggregation pipeline is required for aggregate operation',
            false
          );
        }

        const response = await client.aggregate(dataSource, database, collection, pipeline);

        if (!response.success) {
          await context.log('error', 'aggregate failed', { error: response.error });
          return failureResult(
            NodeErrorCodes.OPERATION_FAILED,
            response.error?.message || 'aggregate operation failed',
            true
          );
        }

        result = {
          documents: response.data?.documents || [],
          count: response.data?.documents?.length || 0,
          operation: 'aggregate',
        };
        break;
      }

      default:
        await context.log('error', `Unknown operation: ${operation}`);
        return failureResult(
          NodeErrorCodes.INVALID_OPERATION,
          `Unknown operation: ${operation}. Valid operations: find, findOne, insertOne, insertMany, updateOne, updateMany, deleteOne, deleteMany, aggregate`,
          false
        );
    }

    await context.log('info', 'Data API operation completed', {
      operation,
      database,
      collection,
      durationMs: Date.now() - startTime,
    });

    return successResult(
      {
        ...result,
        metadata: {
          database,
          collection,
          durationMs: Date.now() - startTime,
        },
      },
      {
        durationMs: Date.now() - startTime,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await context.log('error', 'Data API operation failed', {
      error: errorMessage,
      operation,
    });

    // Determine if error is retryable
    const isRetryable =
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('ETIMEDOUT') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('rate limit') ||
      errorMessage.includes('429');

    return failureResult(
      isRetryable ? NodeErrorCodes.CONNECTION_FAILED : NodeErrorCodes.OPERATION_FAILED,
      `Data API error: ${errorMessage}`,
      isRetryable
    );
  }
};

// Register the handler
registerHandler(metadata, handler);

export { handler, metadata };
