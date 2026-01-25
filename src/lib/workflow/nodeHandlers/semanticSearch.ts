/**
 * Semantic Search Node Handler
 *
 * Combined embedding generation + vector search in a single node.
 * Generates a query embedding and performs vector search.
 *
 * Config:
 *   - provider: 'auto' | 'atlas-ai' | 'voyage' | 'openai'
 *   - model: Embedding model to use
 *   - query: Natural language query text
 *   - connectionId: Vault ID for the MongoDB connection
 *   - collection: Collection name with vector embeddings
 *   - indexName: Name of the Atlas Vector Search index
 *   - embeddingField: Field containing embeddings (default: 'embedding')
 *   - limit: Maximum results to return (default: 10)
 *   - minScore: Minimum similarity score (default: 0.7)
 *   - filter: Optional pre-filter query
 *
 * Output:
 *   - results: Array of matching documents with scores
 *   - queryEmbedding: The generated query embedding
 *   - count: Number of results
 *   - embeddingCost: Cost of embedding generation
 *   - latencyMs: Total latency
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
import {
  createEmbeddingProvider,
  createDefaultEmbeddingProvider,
  EmbeddingProvider,
  EmbeddingProviderType,
  EmbeddingError,
  DEFAULT_MODELS,
} from '@/lib/ai/embeddings';

const metadata: HandlerMetadata = {
  type: 'semantic-search',
  name: 'Semantic Search',
  description: 'Generates query embedding and performs vector search in one step',
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
 * Get embedding provider based on configuration
 */
function getProvider(
  providerType: string | undefined,
  model: string | undefined
): EmbeddingProvider | null {
  if (!providerType || providerType === 'auto') {
    return createDefaultEmbeddingProvider();
  }

  const type = providerType as EmbeddingProviderType;
  let apiKey: string | undefined;

  switch (type) {
    case 'voyage':
    case 'atlas-ai':
      apiKey = process.env.VOYAGE_API_KEY;
      break;
    case 'openai':
      apiKey = process.env.OPENAI_API_KEY;
      break;
  }

  if (!apiKey) {
    return null;
  }

  return createEmbeddingProvider({
    type,
    apiKey,
    model: model || DEFAULT_MODELS[type],
  });
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

  await context.log('info', 'Executing semantic search', {
    nodeId: context.nodeId,
  });

  const { resolvedConfig, getConnection: getVaultConnection } = context;

  // Get embedding configuration
  const providerType = resolvedConfig.provider as string | undefined;
  const model = resolvedConfig.model as string | undefined;
  const query = resolvedConfig.query as string | undefined;

  // Get vector search configuration
  const connectionId = resolvedConfig.connectionId as string | undefined;
  const collection = resolvedConfig.collection as string | undefined;
  const indexName = resolvedConfig.indexName as string | undefined;
  const embeddingField = (resolvedConfig.embeddingField as string) || 'embedding';
  const limit = (resolvedConfig.limit as number) || 10;
  const minScore = (resolvedConfig.minScore as number) || 0.7;
  const filter = parseJsonConfig<Document>(resolvedConfig.filter, {});

  // Validate required fields
  if (!query || query.trim().length === 0) {
    await context.log('error', 'Missing search query');
    return failureResult(
      NodeErrorCodes.MISSING_CONFIG,
      'Search query is required',
      false
    );
  }

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

  // Get embedding provider
  const provider = getProvider(providerType, model);
  if (!provider) {
    await context.log('error', 'No embedding provider available');
    return failureResult(
      NodeErrorCodes.MISSING_CONFIG,
      'No embedding provider configured. Please set VOYAGE_API_KEY or OPENAI_API_KEY.',
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

  try {
    // Step 1: Generate query embedding
    await context.log('info', 'Generating query embedding', {
      provider: provider.providerId,
      model: provider.modelName,
    });

    const embeddingStartTime = Date.now();
    const queryEmbedding = await provider.generateQueryEmbedding(query);
    const embeddingDurationMs = Date.now() - embeddingStartTime;
    const embeddingCost = provider.estimateCost([query]);

    await context.log('info', 'Query embedding generated', {
      dimensions: queryEmbedding.length,
      durationMs: embeddingDurationMs,
      cost: embeddingCost,
    });

    // Step 2: Perform vector search
    await context.log('info', `Searching ${collection}`, {
      indexName,
      limit,
      minScore,
    });

    const { db } = await getConnection(connectionString, database);
    const coll = db.collection(collection);

    // Calculate numCandidates (higher than limit for better recall)
    const numCandidates = Math.max(limit * 10, 100);

    // Build the $vectorSearch pipeline stage
    const vectorSearchStage: Document = {
      $vectorSearch: {
        index: indexName,
        path: embeddingField,
        queryVector: queryEmbedding,
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

    const searchStartTime = Date.now();
    const results = await coll.aggregate(pipeline).toArray();
    const searchDurationMs = Date.now() - searchStartTime;

    const totalDurationMs = Date.now() - startTime;

    await context.log('info', 'Semantic search completed', {
      resultCount: results.length,
      embeddingDurationMs,
      searchDurationMs,
      totalDurationMs,
    });

    return successResult(
      {
        results,
        queryEmbedding,
        count: results.length,
        metadata: {
          query,
          collection,
          database,
          indexName,
          provider: provider.providerId,
          model: provider.modelName,
          dimensions: queryEmbedding.length,
          limit,
          minScore,
          embeddingCost,
          embeddingDurationMs,
          searchDurationMs,
          totalDurationMs,
        },
      },
      {
        durationMs: totalDurationMs,
        bytesProcessed: JSON.stringify(results).length + query.length,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await context.log('error', 'Semantic search failed', {
      error: errorMessage,
    });

    // Determine error type
    const isEmbeddingError = error instanceof EmbeddingError;
    const isIndexError =
      errorMessage.includes('index') ||
      errorMessage.includes('$vectorSearch');
    const isConnectionError =
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('ETIMEDOUT') ||
      errorMessage.includes('connection');

    let errorCode: NodeErrorCode = NodeErrorCodes.OPERATION_FAILED;
    let retryable = false;

    if (isEmbeddingError) {
      retryable = (error as EmbeddingError).isRetryable();
      errorCode = retryable ? NodeErrorCodes.RATE_LIMIT : NodeErrorCodes.OPERATION_FAILED;
    } else if (isIndexError) {
      errorCode = NodeErrorCodes.INVALID_CONFIG;
    } else if (isConnectionError) {
      errorCode = NodeErrorCodes.CONNECTION_FAILED;
      retryable = true;
    }

    return failureResult(
      errorCode,
      `Semantic search failed: ${errorMessage}`,
      retryable
    );
  }
};

// Register the handler
registerHandler(metadata, handler);

export { handler, metadata };
