/**
 * OpenAI Embedding Provider Implementation
 *
 * Implements EmbeddingProvider interface for OpenAI API
 */

import OpenAI from 'openai';
import {
  EmbeddingProvider,
  EmbeddingError,
  EmbeddingModelInfo,
  BATCH_SIZES,
  DEFAULT_MODELS,
  getModelDimensions,
  estimateTotalTokens,
} from './base';

/**
 * OpenAI embedding provider configuration
 */
export interface OpenAIEmbeddingProviderConfig {
  /** OpenAI API key */
  apiKey: string;
  /** Model to use (default: text-embedding-3-small) */
  model?: string;
  /** Base URL (for custom endpoints) */
  baseURL?: string;
  /** Organization ID (optional) */
  organization?: string;
}

/**
 * Pricing for OpenAI embedding models (per 1M tokens)
 * Updated as of January 2025
 */
const OPENAI_EMBEDDING_PRICING: Record<string, number> = {
  'text-embedding-3-small': 0.02, // $0.02 per 1M tokens
  'text-embedding-3-large': 0.13, // $0.13 per 1M tokens
  'text-embedding-ada-002': 0.1, // $0.10 per 1M tokens (legacy)
};

/**
 * OpenAI Embedding Provider
 */
export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  readonly providerId = 'openai' as const;
  readonly dimensions: number;
  readonly modelName: string;

  private client: OpenAI;
  private batchSize: number;

  constructor(config: OpenAIEmbeddingProviderConfig) {
    if (!config.apiKey) {
      throw new EmbeddingError(
        'OpenAI API key is required',
        'openai',
        'MISSING_API_KEY'
      );
    }

    this.modelName = config.model || DEFAULT_MODELS.openai;
    const dimensions = getModelDimensions(this.modelName);
    if (!dimensions) {
      throw new EmbeddingError(
        `Unknown model: ${this.modelName}`,
        'openai',
        'UNKNOWN_MODEL'
      );
    }
    this.dimensions = dimensions;
    this.batchSize = BATCH_SIZES.openai;

    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      organization: config.organization,
    });
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    const allEmbeddings: number[][] = [];

    // Process in batches
    for (let i = 0; i < texts.length; i += this.batchSize) {
      const batch = texts.slice(i, i + this.batchSize);
      const batchIndex = Math.floor(i / this.batchSize);

      try {
        const response = await this.client.embeddings.create({
          model: this.modelName,
          input: batch,
        });

        // Extract embeddings in order
        const batchEmbeddings = response.data
          .sort((a, b) => a.index - b.index)
          .map((item) => item.embedding);

        // Validate dimensions
        for (const embedding of batchEmbeddings) {
          if (embedding.length !== this.dimensions) {
            throw new EmbeddingError(
              `Unexpected embedding dimensions: expected ${this.dimensions}, got ${embedding.length}`,
              'openai',
              'DIMENSION_MISMATCH',
              undefined,
              undefined,
              batchIndex
            );
          }
        }

        allEmbeddings.push(...batchEmbeddings);
      } catch (error: unknown) {
        // Handle rate limiting
        if (
          error &&
          typeof error === 'object' &&
          'status' in error &&
          error.status === 429
        ) {
          const errObj = error as { headers?: Record<string, string> };
          const retryAfterHeader = errObj.headers?.['retry-after'];
          const retryAfter = retryAfterHeader
            ? parseInt(retryAfterHeader, 10)
            : 60;
          throw new EmbeddingError(
            `Rate limit exceeded. Please retry after ${retryAfter} seconds.`,
            'openai',
            'RATE_LIMIT_EXCEEDED',
            429,
            retryAfter,
            batchIndex
          );
        }

        // Re-throw EmbeddingError as-is
        if (error instanceof EmbeddingError) {
          throw error;
        }

        // Wrap other errors
        const errMsg =
          error instanceof Error ? error.message : 'OpenAI embedding error';
        const errCode =
          error && typeof error === 'object' && 'code' in error
            ? String(error.code)
            : 'API_ERROR';
        const errStatus =
          error && typeof error === 'object' && 'status' in error
            ? Number(error.status)
            : undefined;

        throw new EmbeddingError(errMsg, 'openai', errCode, errStatus, undefined, batchIndex);
      }
    }

    return allEmbeddings;
  }

  async generateQueryEmbedding(query: string): Promise<number[]> {
    const embeddings = await this.generateEmbeddings([query]);
    return embeddings[0];
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Simple check - try to create a minimal embedding
      await this.client.embeddings.create({
        model: this.modelName,
        input: 'test',
      });
      return true;
    } catch {
      return false;
    }
  }

  estimateCost(texts: string[]): number {
    const totalTokens = estimateTotalTokens(texts);
    const pricePerMillion =
      OPENAI_EMBEDDING_PRICING[this.modelName] ||
      OPENAI_EMBEDDING_PRICING['text-embedding-3-small'];
    return (totalTokens / 1_000_000) * pricePerMillion;
  }

  getModelInfo(): EmbeddingModelInfo {
    return {
      model: this.modelName,
      dimensions: this.dimensions,
      provider: 'openai',
      maxBatchSize: this.batchSize,
    };
  }
}

/**
 * Create an OpenAI embedding provider instance
 */
export function createOpenAIEmbeddingProvider(
  config: OpenAIEmbeddingProviderConfig
): OpenAIEmbeddingProvider {
  return new OpenAIEmbeddingProvider(config);
}
