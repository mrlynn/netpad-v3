/**
 * Voyage AI Embedding Provider Implementation
 *
 * Implements EmbeddingProvider interface for Voyage AI API
 * https://docs.voyageai.com/docs/embeddings
 */

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
 * Voyage AI embedding provider configuration
 */
export interface VoyageEmbeddingProviderConfig {
  /** Voyage AI API key */
  apiKey: string;
  /** Model to use (default: voyage-3) */
  model?: string;
  /** Base URL (default: https://api.voyageai.com/v1) */
  baseURL?: string;
}

/**
 * Voyage AI API response types
 */
interface VoyageEmbeddingData {
  object: 'embedding';
  embedding: number[];
  index: number;
}

interface VoyageEmbeddingResponse {
  object: 'list';
  data: VoyageEmbeddingData[];
  model: string;
  usage: {
    total_tokens: number;
  };
}

interface VoyageErrorResponse {
  detail?: string;
  message?: string;
}

/**
 * Pricing for Voyage AI embedding models (per 1M tokens)
 * Updated as of January 2025
 */
const VOYAGE_EMBEDDING_PRICING: Record<string, number> = {
  'voyage-3': 0.06, // $0.06 per 1M tokens
  'voyage-3-lite': 0.02, // $0.02 per 1M tokens
  'voyage-code-3': 0.06, // $0.06 per 1M tokens
  'voyage-3-large': 0.06, // $0.06 per 1M tokens
};

/**
 * Default Voyage AI API base URL
 */
const VOYAGE_API_BASE_URL = 'https://api.voyageai.com/v1';

/**
 * Voyage AI Embedding Provider
 */
export class VoyageEmbeddingProvider implements EmbeddingProvider {
  readonly providerId = 'voyage' as const;
  readonly dimensions: number;
  readonly modelName: string;

  private apiKey: string;
  private baseURL: string;
  private batchSize: number;

  constructor(config: VoyageEmbeddingProviderConfig) {
    if (!config.apiKey) {
      throw new EmbeddingError(
        'Voyage AI API key is required',
        'voyage',
        'MISSING_API_KEY'
      );
    }

    this.apiKey = config.apiKey;
    this.baseURL = config.baseURL || VOYAGE_API_BASE_URL;
    this.modelName = config.model || DEFAULT_MODELS.voyage;
    this.batchSize = BATCH_SIZES.voyage;

    const dimensions = getModelDimensions(this.modelName);
    if (!dimensions) {
      throw new EmbeddingError(
        `Unknown Voyage AI model: ${this.modelName}`,
        'voyage',
        'UNKNOWN_MODEL'
      );
    }
    this.dimensions = dimensions;
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
        const response = await fetch(`${this.baseURL}/embeddings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            input: batch,
            model: this.modelName,
            input_type: 'document', // Optimized for document embedding
          }),
        });

        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = this.parseRetryAfter(response);
          throw new EmbeddingError(
            `Rate limit exceeded. Please retry after ${retryAfter} seconds.`,
            'voyage',
            'RATE_LIMIT_EXCEEDED',
            429,
            retryAfter,
            batchIndex
          );
        }

        if (!response.ok) {
          const errorBody: VoyageErrorResponse = await response.json().catch(() => ({}));
          const errorMessage =
            errorBody.detail || errorBody.message || `Voyage AI API error: ${response.status}`;
          throw new EmbeddingError(
            errorMessage,
            'voyage',
            'API_ERROR',
            response.status,
            undefined,
            batchIndex
          );
        }

        const data: VoyageEmbeddingResponse = await response.json();

        // Extract embeddings in order
        const batchEmbeddings = data.data
          .sort((a, b) => a.index - b.index)
          .map((item) => item.embedding);

        // Validate dimensions
        for (const embedding of batchEmbeddings) {
          if (embedding.length !== this.dimensions) {
            throw new EmbeddingError(
              `Unexpected embedding dimensions: expected ${this.dimensions}, got ${embedding.length}`,
              'voyage',
              'DIMENSION_MISMATCH',
              undefined,
              undefined,
              batchIndex
            );
          }
        }

        allEmbeddings.push(...batchEmbeddings);
      } catch (error: unknown) {
        // Re-throw EmbeddingError as-is
        if (error instanceof EmbeddingError) {
          throw error;
        }

        // Handle network errors
        if (error instanceof TypeError && (error as Error).message.includes('fetch')) {
          throw new EmbeddingError(
            `Failed to connect to Voyage AI API at ${this.baseURL}`,
            'voyage',
            'CONNECTION_ERROR',
            undefined,
            undefined,
            batchIndex
          );
        }

        // Wrap other errors
        const errMsg =
          error instanceof Error ? error.message : 'Voyage AI embedding error';
        throw new EmbeddingError(errMsg, 'voyage', 'API_ERROR', undefined, undefined, batchIndex);
      }
    }

    return allEmbeddings;
  }

  async generateQueryEmbedding(query: string): Promise<number[]> {
    // Use input_type: 'query' for query embeddings (optimized for search)
    try {
      const response = await fetch(`${this.baseURL}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          input: [query],
          model: this.modelName,
          input_type: 'query', // Optimized for query embedding
        }),
      });

      if (response.status === 429) {
        const retryAfter = this.parseRetryAfter(response);
        throw new EmbeddingError(
          `Rate limit exceeded. Please retry after ${retryAfter} seconds.`,
          'voyage',
          'RATE_LIMIT_EXCEEDED',
          429,
          retryAfter
        );
      }

      if (!response.ok) {
        const errorBody: VoyageErrorResponse = await response.json().catch(() => ({}));
        const errorMessage =
          errorBody.detail || errorBody.message || `Voyage AI API error: ${response.status}`;
        throw new EmbeddingError(
          errorMessage,
          'voyage',
          'API_ERROR',
          response.status
        );
      }

      const data: VoyageEmbeddingResponse = await response.json();
      const embedding = data.data[0]?.embedding;

      if (!embedding) {
        throw new EmbeddingError(
          'No embedding returned from Voyage AI',
          'voyage',
          'NO_RESPONSE'
        );
      }

      if (embedding.length !== this.dimensions) {
        throw new EmbeddingError(
          `Unexpected embedding dimensions: expected ${this.dimensions}, got ${embedding.length}`,
          'voyage',
          'DIMENSION_MISMATCH'
        );
      }

      return embedding;
    } catch (error: unknown) {
      if (error instanceof EmbeddingError) {
        throw error;
      }

      const errMsg =
        error instanceof Error ? error.message : 'Voyage AI query embedding error';
      throw new EmbeddingError(errMsg, 'voyage', 'API_ERROR');
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          input: ['test'],
          model: this.modelName,
          input_type: 'document',
        }),
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  estimateCost(texts: string[]): number {
    const totalTokens = estimateTotalTokens(texts);
    const pricePerMillion =
      VOYAGE_EMBEDDING_PRICING[this.modelName] ||
      VOYAGE_EMBEDDING_PRICING['voyage-3'];
    return (totalTokens / 1_000_000) * pricePerMillion;
  }

  getModelInfo(): EmbeddingModelInfo {
    return {
      model: this.modelName,
      dimensions: this.dimensions,
      provider: 'voyage',
      maxBatchSize: this.batchSize,
    };
  }

  /**
   * Parse retry-after header from response
   */
  private parseRetryAfter(response: Response): number {
    const retryAfter = response.headers.get('retry-after');
    if (retryAfter) {
      const parsed = parseInt(retryAfter, 10);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
    // Check X-RateLimit headers (Voyage AI specific)
    const resetTime = response.headers.get('x-ratelimit-reset');
    if (resetTime) {
      const resetDate = new Date(resetTime);
      const now = new Date();
      const diffSeconds = Math.ceil((resetDate.getTime() - now.getTime()) / 1000);
      if (diffSeconds > 0) {
        return diffSeconds;
      }
    }
    return 60; // Default fallback
  }
}

/**
 * Create a Voyage AI embedding provider instance
 */
export function createVoyageEmbeddingProvider(
  config: VoyageEmbeddingProviderConfig
): VoyageEmbeddingProvider {
  return new VoyageEmbeddingProvider(config);
}
