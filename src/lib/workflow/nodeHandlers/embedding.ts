/**
 * Embedding Generation Node Handler
 *
 * Generates vector embeddings using Voyage AI, Atlas AI Services, or OpenAI.
 *
 * Config:
 *   - provider: 'auto' | 'atlas-ai' | 'voyage' | 'openai'
 *   - model: Embedding model to use
 *   - text: Text content to embed
 *   - inputType: 'document' | 'query' (for Voyage AI asymmetric embeddings)
 *
 * Output:
 *   - embedding: Vector embedding (number[])
 *   - dimensions: Number of dimensions
 *   - model: Model used
 *   - provider: Provider used
 *   - cost: Estimated cost in USD
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
  createEmbeddingProvider,
  createDefaultEmbeddingProvider,
  EmbeddingProvider,
  EmbeddingProviderType,
  EmbeddingError,
  DEFAULT_MODELS,
} from '@/lib/ai/embeddings';

const metadata: HandlerMetadata = {
  type: 'ai-embed',
  name: 'Generate Embeddings',
  description: 'Generates vector embeddings using Voyage AI, Atlas AI, or OpenAI',
  version: '1.0.0',
};

/**
 * Get embedding provider based on configuration
 */
function getProvider(
  providerType: string | undefined,
  model: string | undefined
): EmbeddingProvider | null {
  // If no explicit provider, use auto-detection
  if (!providerType || providerType === 'auto') {
    return createDefaultEmbeddingProvider();
  }

  // Get API key based on provider type
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

const handler: NodeHandler = async (context: ExtendedNodeContext) => {
  const startTime = Date.now();

  await context.log('info', 'Generating embeddings', {
    nodeId: context.nodeId,
  });

  const { resolvedConfig } = context;

  // Get configuration
  const providerType = resolvedConfig.provider as string | undefined;
  const model = resolvedConfig.model as string | undefined;
  const text = resolvedConfig.text as string | undefined;
  const inputType = (resolvedConfig.inputType as 'document' | 'query') || 'document';

  // Validate required fields
  if (!text || text.trim().length === 0) {
    await context.log('error', 'Missing text to embed');
    return failureResult(
      NodeErrorCodes.MISSING_CONFIG,
      'Text to embed is required',
      false
    );
  }

  // Get embedding provider
  const provider = getProvider(providerType, model);
  if (!provider) {
    await context.log('error', 'No embedding provider available', {
      requestedProvider: providerType,
    });
    return failureResult(
      NodeErrorCodes.MISSING_CONFIG,
      `No embedding provider configured. Please set VOYAGE_API_KEY or OPENAI_API_KEY environment variable.`,
      false
    );
  }

  await context.log('info', `Using ${provider.providerId} provider with model ${provider.modelName}`, {
    provider: provider.providerId,
    model: provider.modelName,
    dimensions: provider.dimensions,
    inputType,
  });

  try {
    // Generate embedding based on input type
    let embedding: number[];

    if (inputType === 'query') {
      // Use query embedding (optimized for search)
      embedding = await provider.generateQueryEmbedding(text);
    } else {
      // Use document embedding (optimized for indexing)
      const embeddings = await provider.generateEmbeddings([text]);
      embedding = embeddings[0];
    }

    // Estimate cost
    const estimatedCost = provider.estimateCost([text]);

    const durationMs = Date.now() - startTime;

    await context.log('info', 'Embedding generated successfully', {
      provider: provider.providerId,
      model: provider.modelName,
      dimensions: embedding.length,
      inputType,
      estimatedCost,
      durationMs,
    });

    return successResult(
      {
        embedding,
        dimensions: embedding.length,
        model: provider.modelName,
        provider: provider.providerId,
        inputType,
        cost: estimatedCost,
        metadata: {
          textLength: text.length,
          executionTimeMs: durationMs,
        },
      },
      {
        durationMs,
        bytesProcessed: text.length,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await context.log('error', 'Embedding generation failed', {
      error: errorMessage,
      provider: provider.providerId,
    });

    // Check if error is retryable
    const isRetryable =
      error instanceof EmbeddingError
        ? error.isRetryable()
        : errorMessage.includes('rate') ||
          errorMessage.includes('timeout') ||
          errorMessage.includes('ECONNREFUSED');

    return failureResult(
      isRetryable ? NodeErrorCodes.RATE_LIMIT : NodeErrorCodes.OPERATION_FAILED,
      `Embedding generation failed: ${errorMessage}`,
      isRetryable
    );
  }
};

// Register the handler
registerHandler(metadata, handler);

export { handler, metadata };
