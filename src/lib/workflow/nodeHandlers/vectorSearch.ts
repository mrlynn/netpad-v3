/**
 * Vector Search Node Handler
 *
 * Performs MongoDB Atlas Vector Search queries.
 *
 * Config:
 *   - connectionId: Vault ID for the MongoDB connection
 *   - collection: Collection name with vector embeddings
 *   - indexName: Name of the Atlas Vector Search index
 *   - embeddingField: Field containing embeddings (default: 'embedding')
 *   - queryVector: The embedding vector to search for
 *   - numCandidates: Number of candidates to consider (default: 100)
 *   - limit: Maximum results to return (default: 10)
 *   - minScore: Minimum similarity score (default: 0)
 *   - filter: Optional pre-filter query
 *
 * Output:
 *   - results: Array of matching documents with scores
 *   - count: Number of results
 *   - latencyMs: Search latency
 */

import { MongoClient, Document } from 'mongodb';
import { registerHandler } from './registry';
import {
  ExtendedNodeContext,
  NodeHandler,
  HandlerMetadata,
  successResult,
  failureResult,
  NodeErrorCodes,
  NodeErrorCode,
} from './types';

const metadata: HandlerMetadata = {
  type: 'vector-search',
  name: 'Vector Search',
  description: 'Performs MongoDB Atlas Vector Search queries',
  version: '1.0.0',
};

// Connection cache
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
 * Parse JSON configuration safely
 */
function parseJsonConfig<T>(config: unknown, defaultValue: T): T {
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

  await context.log('info', 'Executing vector search', {
    nodeId: context.nodeId,
  });

  const { resolvedConfig, getConnection: getVaultConnection } = context;

  // Get configuration
  const connectionId = resolvedConfig.connectionId as string | undefined;
  const collection = resolvedConfig.collection as string | undefined;
  const indexName = resolvedConfig.indexName as string | undefined;
  const embeddingField = (resolvedConfig.embeddingField as string) || 'embedding';
  const queryVector = resolvedConfig.queryVector as number[] | string | undefined;
  const numCandidates = (resolvedConfig.numCandidates as number) || 100;
  const limit = (resolvedConfig.limit as number) || 10;
  const minScore = (resolvedConfig.minScore as number) || 0;
  const filter = parseJsonConfig<Document>(resolvedConfig.filter, {});

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

  if (!indexName) {
    await context.log('error', 'Missing vector search index name');
    return failureResult(
      NodeErrorCodes.MISSING_CONFIG,
      'Vector search index name is required',
      false
    );
  }

  // Parse query vector
  let vectorArray: number[];
  if (typeof queryVector === 'string') {
    try {
      vectorArray = JSON.parse(queryVector);
    } catch {
      await context.log('error', 'Invalid query vector format');
      return failureResult(
        NodeErrorCodes.INVALID_CONFIG,
        'Query vector must be an array of numbers',
        false
      );
    }
  } else if (Array.isArray(queryVector)) {
    vectorArray = queryVector;
  } else {
    await context.log('error', 'Missing query vector');
    return failureResult(
      NodeErrorCodes.MISSING_CONFIG,
      'Query vector is required',
      false
    );
  }

  // Validate vector
  if (!Array.isArray(vectorArray) || vectorArray.length === 0) {
    await context.log('error', 'Query vector is empty or invalid');
    return failureResult(
      NodeErrorCodes.INVALID_CONFIG,
      'Query vector must be a non-empty array of numbers',
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

  await context.log('info', `Searching ${collection} with index ${indexName}`, {
    dimensions: vectorArray.length,
    numCandidates,
    limit,
    minScore,
    hasFilter: Object.keys(filter).length > 0,
  });

  try {
    const { db } = await getConnection(connectionString, database);
    const coll = db.collection(collection);

    // Build the $vectorSearch pipeline stage
    const vectorSearchStage: Document = {
      $vectorSearch: {
        index: indexName,
        path: embeddingField,
        queryVector: vectorArray,
        numCandidates,
        limit,
      },
    };

    // Add filter if provided
    if (Object.keys(filter).length > 0) {
      vectorSearchStage.$vectorSearch.filter = filter;
    }

    // Build aggregation pipeline
    const pipeline: Document[] = [
      vectorSearchStage,
      {
        $addFields: {
          score: { $meta: 'vectorSearchScore' },
        },
      },
    ];

    // Add score filter if minScore is set
    if (minScore > 0) {
      pipeline.push({
        $match: {
          score: { $gte: minScore },
        },
      });
    }

    await context.log('debug', 'Vector search pipeline', {
      stages: pipeline.length,
      indexName,
      embeddingField,
    });

    const results = await coll.aggregate(pipeline).toArray();
    const durationMs = Date.now() - startTime;

    await context.log('info', 'Vector search completed', {
      resultCount: results.length,
      durationMs,
    });

    return successResult(
      {
        results,
        count: results.length,
        metadata: {
          collection,
          database,
          indexName,
          dimensions: vectorArray.length,
          numCandidates,
          limit,
          minScore,
          latencyMs: durationMs,
        },
      },
      {
        durationMs,
        bytesProcessed: JSON.stringify(results).length,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await context.log('error', 'Vector search failed', {
      error: errorMessage,
      collection,
      indexName,
    });

    // Check for specific error types
    const isIndexError =
      errorMessage.includes('index') ||
      errorMessage.includes('$vectorSearch');

    const isConnectionError =
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('ETIMEDOUT') ||
      errorMessage.includes('connection');

    let errorCode: NodeErrorCode = NodeErrorCodes.OPERATION_FAILED;
    let retryable = false;

    if (isIndexError) {
      errorCode = NodeErrorCodes.INVALID_CONFIG;
    } else if (isConnectionError) {
      errorCode = NodeErrorCodes.CONNECTION_FAILED;
      retryable = true;
    }

    return failureResult(
      errorCode,
      `Vector search failed: ${errorMessage}`,
      retryable
    );
  }
};

// Register the handler
registerHandler(metadata, handler);

export { handler, metadata };
