/**
 * RAG Embeddings Generation
 *
 * Centralized embeddings API for document chunks and query embedding.
 * Supports multiple providers: OpenAI, Voyage AI, MongoDB Atlas AI Services.
 *
 * This module maintains backward compatibility with the original API
 * while using the new embedding provider abstraction.
 */

import {
  createDefaultEmbeddingProvider,
  getCurrentEmbeddingProviderInfo,
  EmbeddingProvider,
  EmbeddingError,
} from '@/lib/ai/embeddings';
import { EMBEDDING_MODEL, EMBEDDING_DIMENSIONS } from '@/types/rag';

// ============================================
// Provider Management
// ============================================

/**
 * Cached embedding provider instance
 */
let embeddingProvider: EmbeddingProvider | null = null;

/**
 * Get or create the embedding provider
 * Uses factory to create provider based on environment configuration
 */
function getEmbeddingProvider(): EmbeddingProvider {
  if (!embeddingProvider) {
    embeddingProvider = createDefaultEmbeddingProvider();
    if (!embeddingProvider) {
      throw new Error(
        'No embedding provider configured. Set OPENAI_API_KEY or VOYAGE_API_KEY environment variable.'
      );
    }
  }
  return embeddingProvider;
}

/**
 * Reset the cached provider (useful for testing or reconfiguration)
 */
export function resetEmbeddingProvider(): void {
  embeddingProvider = null;
}

// ============================================
// Embedding Generation
// ============================================

/**
 * Generate embeddings for text chunks
 *
 * Batches requests for efficiency when processing multiple chunks.
 * Uses the configured embedding provider (OpenAI, Voyage AI, or Atlas AI).
 *
 * @param chunks - Array of text chunks to embed
 * @returns Array of embeddings (each embedding is an array of numbers)
 */
export async function generateEmbeddings(
  chunks: Array<{ text: string }>
): Promise<number[][]> {
  if (chunks.length === 0) {
    return [];
  }

  const provider = getEmbeddingProvider();
  const texts = chunks.map((chunk) => chunk.text);

  try {
    const embeddings = await provider.generateEmbeddings(texts);
    return embeddings;
  } catch (error) {
    // Log and re-throw with context
    const providerInfo = provider.getModelInfo();
    console.error(
      `[RAG] Embedding generation failed with ${providerInfo.provider}/${providerInfo.model}:`,
      error
    );

    if (error instanceof EmbeddingError) {
      throw error;
    }

    throw new Error(
      `Embedding generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Generate a single embedding for a query
 *
 * Some providers optimize query embeddings differently than document embeddings.
 *
 * @param query - Text to embed
 * @returns Embedding vector
 */
export async function generateQueryEmbedding(query: string): Promise<number[]> {
  const provider = getEmbeddingProvider();

  try {
    const embedding = await provider.generateQueryEmbedding(query);
    return embedding;
  } catch (error) {
    const providerInfo = provider.getModelInfo();
    console.error(
      `[RAG] Query embedding failed with ${providerInfo.provider}/${providerInfo.model}:`,
      error
    );

    if (error instanceof EmbeddingError) {
      throw error;
    }

    throw new Error(
      `Query embedding failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// ============================================
// Cost Estimation
// ============================================

/**
 * Estimate embedding cost for text
 *
 * Uses the configured provider's pricing information.
 *
 * @param text - Text to estimate cost for
 * @returns Estimated cost in USD
 */
export function estimateEmbeddingCost(text: string): number {
  const provider = getEmbeddingProvider();
  return provider.estimateCost([text]);
}

/**
 * Estimate embedding cost for multiple chunks
 *
 * @param chunks - Array of text chunks
 * @returns Estimated cost in USD
 */
export function estimateChunksCost(chunks: Array<{ text: string }>): number {
  const provider = getEmbeddingProvider();
  const texts = chunks.map((c) => c.text);
  return provider.estimateCost(texts);
}

// ============================================
// Utility Functions
// ============================================

/**
 * Check if embedding provider is configured and accessible
 */
export async function checkEmbeddingsAvailable(): Promise<{
  available: boolean;
  error?: string;
  provider?: string;
  model?: string;
}> {
  try {
    const provider = getEmbeddingProvider();
    const isAvailable = await provider.isAvailable();
    const modelInfo = provider.getModelInfo();

    if (isAvailable) {
      return {
        available: true,
        provider: modelInfo.provider,
        model: modelInfo.model,
      };
    }

    return {
      available: false,
      error: `Provider ${modelInfo.provider} is not available`,
      provider: modelInfo.provider,
      model: modelInfo.model,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { available: false, error: errorMessage };
  }
}

/**
 * Get embedding model info
 *
 * Returns information about the currently configured embedding provider.
 */
export function getEmbeddingModelInfo(): {
  model: string;
  dimensions: number;
  batchSize: number;
  provider: string;
} {
  try {
    const provider = getEmbeddingProvider();
    const modelInfo = provider.getModelInfo();
    return {
      model: modelInfo.model,
      dimensions: modelInfo.dimensions,
      batchSize: modelInfo.maxBatchSize,
      provider: modelInfo.provider,
    };
  } catch {
    // Fallback to defaults if no provider configured
    return {
      model: EMBEDDING_MODEL,
      dimensions: EMBEDDING_DIMENSIONS,
      batchSize: 100,
      provider: 'unknown',
    };
  }
}

/**
 * Get current embedding provider info without throwing
 *
 * Safe version that returns null if no provider is configured.
 */
export function getCurrentProviderInfo(): {
  provider: string;
  model: string;
  dimensions: number;
} | null {
  const info = getCurrentEmbeddingProviderInfo();
  if (!info.provider) {
    return null;
  }
  return {
    provider: info.provider,
    model: info.model || EMBEDDING_MODEL,
    dimensions: info.dimensions || EMBEDDING_DIMENSIONS,
  };
}

/**
 * Get the current embedding dimensions
 *
 * Returns the dimensions of the currently configured embedding provider.
 * This is useful for validation and vector index configuration.
 */
export function getCurrentEmbeddingDimensions(): number {
  try {
    const provider = getEmbeddingProvider();
    return provider.dimensions;
  } catch {
    // Fallback to default dimensions
    return EMBEDDING_DIMENSIONS;
  }
}
