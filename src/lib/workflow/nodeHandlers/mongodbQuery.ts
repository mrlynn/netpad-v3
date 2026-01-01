/**
 * MongoDB Query Node Handler
 *
 * Queries documents from MongoDB. Supports find, findOne, aggregate, and count operations.
 *
 * Config:
 *   - connectionId: Vault ID for the MongoDB connection
 *   - collection: Collection name to query
 *   - operation: 'find' | 'findOne' | 'aggregate' | 'count' | 'distinct'
 *   - query: MongoDB query filter (for find, findOne, count)
 *   - pipeline: Aggregation pipeline (for aggregate)
 *   - projection: Fields to include/exclude
 *   - sort: Sort specification
 *   - limit: Maximum number of documents
 *   - skip: Number of documents to skip
 *   - distinctField: Field name for distinct operation
 *
 * Output:
 *   - documents: Array of matched documents (for find, aggregate)
 *   - document: Single document (for findOne)
 *   - count: Number of documents (for count)
 *   - values: Distinct values (for distinct)
 *   - metadata: { collection, operation, executionTimeMs }
 */

import { MongoClient, Document, Filter, Sort, AggregationCursor, FindCursor } from 'mongodb';
import { registerHandler } from './registry';
import {
  ExtendedNodeContext,
  NodeHandler,
  HandlerMetadata,
  successResult,
  failureResult,
  NodeErrorCodes,
} from './types';

const metadata: HandlerMetadata = {
  type: 'mongodb-query',
  name: 'MongoDB Query',
  description: 'Queries documents from MongoDB',
  version: '1.0.0',
};

type QueryOperation = 'find' | 'findOne' | 'aggregate' | 'count' | 'distinct';

// Connection cache to avoid creating new connections for each query
const connectionCache = new Map<string, { client: MongoClient; lastUsed: number }>();
const CONNECTION_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get or create a MongoDB connection
 */
async function getConnection(
  connectionString: string,
  database: string
): Promise<{ client: MongoClient; db: ReturnType<MongoClient['db']> }> {
  const cacheKey = `${connectionString}:${database}`;
  const cached = connectionCache.get(cacheKey);

  if (cached) {
    cached.lastUsed = Date.now();
    return { client: cached.client, db: cached.client.db(database) };
  }

  const client = new MongoClient(connectionString, {
    maxPoolSize: 5,
    minPoolSize: 1,
    maxIdleTimeMS: 60000,
  });

  await client.connect();

  connectionCache.set(cacheKey, { client, lastUsed: Date.now() });

  // Clean up old connections periodically
  cleanupOldConnections();

  return { client, db: client.db(database) };
}

/**
 * Clean up connections that haven't been used recently
 */
function cleanupOldConnections(): void {
  const now = Date.now();
  for (const [key, { client, lastUsed }] of connectionCache.entries()) {
    if (now - lastUsed > CONNECTION_TTL) {
      client.close().catch(console.error);
      connectionCache.delete(key);
    }
  }
}

/**
 * Parse query/pipeline configuration
 * Handles both string (JSON) and object formats
 */
function parseQueryConfig<T>(config: unknown, defaultValue: T): T {
  if (config === undefined || config === null) {
    return defaultValue;
  }

  if (typeof config === 'string') {
    try {
      return JSON.parse(config) as T;
    } catch {
      return defaultValue;
    }
  }

  return config as T;
}

const handler: NodeHandler = async (context: ExtendedNodeContext) => {
  const startTime = Date.now();

  await context.log('info', 'Executing MongoDB query', {
    nodeId: context.nodeId,
  });

  const { resolvedConfig, getConnection: getVaultConnection } = context;

  // Get connection configuration
  const connectionId = resolvedConfig.connectionId as string | undefined;
  const collection = resolvedConfig.collection as string | undefined;
  const operation = (resolvedConfig.operation as QueryOperation) || 'find';

  // Validate required fields
  if (!connectionId) {
    await context.log('error', 'Missing connection ID');
    return failureResult(
      NodeErrorCodes.MISSING_CONFIG,
      'MongoDB connection is required',
      false
    );
  }

  if (!collection) {
    await context.log('error', 'Missing collection name');
    return failureResult(
      NodeErrorCodes.MISSING_CONFIG,
      'Collection name is required',
      false
    );
  }

  // Get connection from vault
  const connectionInfo = await getVaultConnection(connectionId);
  if (!connectionInfo) {
    await context.log('error', 'Connection not found in vault', { connectionId });
    return failureResult(
      NodeErrorCodes.MISSING_CONNECTION,
      `MongoDB connection not found: ${connectionId}`,
      false
    );
  }

  const { connectionString, database } = connectionInfo;

  await context.log('info', `Querying ${collection}`, {
    operation,
    database,
  });

  try {
    const { db } = await getConnection(connectionString, database);
    const coll = db.collection(collection);

    let result: unknown;
    let documentCount = 0;

    switch (operation) {
      case 'find': {
        const query = parseQueryConfig<Filter<Document>>(resolvedConfig.query, {});
        const projection = parseQueryConfig<Document>(resolvedConfig.projection, {});
        const sort = parseQueryConfig<Sort>(resolvedConfig.sort, {});
        const limit = (resolvedConfig.limit as number) || 100;
        const skip = (resolvedConfig.skip as number) || 0;

        await context.log('debug', 'Find query', { query, projection, sort, limit, skip });

        let cursor: FindCursor<Document> = coll.find(query);

        if (Object.keys(projection).length > 0) {
          cursor = cursor.project(projection);
        }
        if (Object.keys(sort).length > 0) {
          cursor = cursor.sort(sort);
        }
        if (skip > 0) {
          cursor = cursor.skip(skip);
        }
        cursor = cursor.limit(limit);

        const documents = await cursor.toArray();
        documentCount = documents.length;

        result = {
          documents,
          count: documentCount,
        };
        break;
      }

      case 'findOne': {
        const query = parseQueryConfig<Filter<Document>>(resolvedConfig.query, {});
        const projection = parseQueryConfig<Document>(resolvedConfig.projection, {});

        await context.log('debug', 'FindOne query', { query, projection });

        const document = await coll.findOne(query, {
          projection: Object.keys(projection).length > 0 ? projection : undefined,
        });

        documentCount = document ? 1 : 0;

        result = {
          document,
          found: !!document,
        };
        break;
      }

      case 'aggregate': {
        const pipeline = parseQueryConfig<Document[]>(resolvedConfig.pipeline, []);

        if (pipeline.length === 0) {
          await context.log('warn', 'Empty aggregation pipeline');
        }

        await context.log('debug', 'Aggregation pipeline', { stages: pipeline.length });

        const documents = await coll.aggregate(pipeline).toArray();
        documentCount = documents.length;

        result = {
          documents,
          count: documentCount,
        };
        break;
      }

      case 'count': {
        const query = parseQueryConfig<Filter<Document>>(resolvedConfig.query, {});

        await context.log('debug', 'Count query', { query });

        const count = await coll.countDocuments(query);
        documentCount = count;

        result = {
          count,
        };
        break;
      }

      case 'distinct': {
        const distinctField = resolvedConfig.distinctField as string | undefined;
        const query = parseQueryConfig<Filter<Document>>(resolvedConfig.query, {});

        if (!distinctField) {
          await context.log('error', 'Distinct field is required for distinct operation');
          return failureResult(
            NodeErrorCodes.MISSING_CONFIG,
            'Distinct field is required',
            false
          );
        }

        await context.log('debug', 'Distinct query', { field: distinctField, query });

        const values = await coll.distinct(distinctField, query);
        documentCount = values.length;

        result = {
          values,
          count: documentCount,
        };
        break;
      }

      default:
        await context.log('error', `Unknown operation: ${operation}`);
        return failureResult(
          NodeErrorCodes.INVALID_CONFIG,
          `Unknown MongoDB operation: ${operation}`,
          false
        );
    }

    const durationMs = Date.now() - startTime;

    await context.log('info', 'Query completed successfully', {
      operation,
      documentCount,
      durationMs,
    });

    return successResult(
      {
        ...result as Record<string, unknown>,
        metadata: {
          collection,
          database,
          operation,
          executionTimeMs: durationMs,
        },
      },
      {
        durationMs,
        bytesProcessed: JSON.stringify(result).length,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await context.log('error', 'MongoDB query failed', {
      error: errorMessage,
      operation,
      collection,
    });

    // Check for connection errors (retryable)
    const isConnectionError =
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('ETIMEDOUT') ||
      errorMessage.includes('ENOTFOUND') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('timeout');

    return failureResult(
      isConnectionError ? NodeErrorCodes.CONNECTION_FAILED : NodeErrorCodes.OPERATION_FAILED,
      `MongoDB query failed: ${errorMessage}`,
      isConnectionError // Connection errors are retryable
    );
  }
};

// Register the handler
registerHandler(metadata, handler);

export { handler, metadata };
