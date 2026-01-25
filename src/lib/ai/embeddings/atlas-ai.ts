/**
 * MongoDB Atlas AI Services Embedding Provider Implementation
 *
 * Implements EmbeddingProvider interface for MongoDB Atlas AI Services
 * Atlas AI Services uses Voyage AI models under the hood.
 *
 * This provider can be used in two modes:
 * 1. Direct Voyage API (when Atlas cluster has AI Services enabled)
 * 2. Atlas Data API embedding endpoint (for Atlas-native embedding)
 *
 * For now, this implementation uses the direct Voyage AI API approach
 * since Atlas AI Services requires specific cluster configuration.
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
 * Atlas AI embedding provider configuration
 */
export interface AtlasAIEmbeddingProviderConfig {
  /**
   * Voyage AI API key (Atlas AI uses Voyage under the hood)
   * If not provided, will attempt to use Atlas-native embedding
   */
  voyageApiKey?: string;
  /**
   * Atlas Data API endpoint for embedding
   * Example: https://data.mongodb-api.com/app/{app-id}/endpoint/data/v1
   */
  atlasDataApiEndpoint?: string;
  /**
   * Atlas Data API key
   */
  atlasDataApiKey?: string;
  /**
   * Model to use (default: voyage-3)
   */
  model?: string;
}

/**
 * Voyage AI API response types (same as voyage.ts)
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
 * Default Voyage AI API base URL (used by Atlas AI Services)
 */
const VOYAGE_API_BASE_URL = 'https://api.voyageai.com/v1';

/**
 * Atlas AI Services Embedding Provider
 *
 * Provides MongoDB Atlas-native embedding capabilities.
 * Uses Voyage AI models which are integrated with Atlas AI Services.
 */
export class AtlasAIEmbeddingProvider implements EmbeddingProvider {
  readonly providerId = 'atlas-ai' as const;
  readonly dimensions: number;
  readonly modelName: string;

  private voyageApiKey?: string;
  private atlasDataApiEndpoint?: string;
  private atlasDataApiKey?: string;
  private batchSize: number;

  constructor(config: AtlasAIEmbeddingProviderConfig) {
    // Require at least Voyage API key for now
    // Future: support Atlas Data API native embedding
    if (!config.voyageApiKey && !config.atlasDataApiEndpoint) {
      throw new EmbeddingError(
        'Atlas AI requires either a Voyage API key or Atlas Data API endpoint',
        'atlas-ai',
        'MISSING_CONFIG'
      );
    }

    this.voyageApiKey = config.voyageApiKey;
    this.atlasDataApiEndpoint = config.atlasDataApiEndpoint;
    this.atlasDataApiKey = config.atlasDataApiKey;
    this.modelName = config.model || DEFAULT_MODELS['atlas-ai'];
    this.batchSize = BATCH_SIZES['atlas-ai'];

    const dimensions = getModelDimensions(this.modelName);
    if (!dimensions) {
      throw new EmbeddingError(
        `Unknown Atlas AI model: ${this.modelName}`,
        'atlas-ai',
        'UNKNOWN_MODEL'
      );
    }
    this.dimensions = dimensions;
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    // Use Voyage API directly (Atlas AI uses Voyage under the hood)
    if (this.voyageApiKey) {
      return this.generateEmbeddingsViaVoyage(texts, 'document');
    }

    // Future: Implement Atlas Data API embedding
    throw new EmbeddingError(
      'Atlas Data API embedding not yet implemented',
      'atlas-ai',
      'NOT_IMPLEMENTED'
    );
  }

  async generateQueryEmbedding(query: string): Promise<number[]> {
    // Use Voyage API with query input_type
    if (this.voyageApiKey) {
      const embeddings = await this.generateEmbeddingsViaVoyage([query], 'query');
      return embeddings[0];
    }

    throw new EmbeddingError(
      'Atlas Data API query embedding not yet implemented',
      'atlas-ai',
      'NOT_IMPLEMENTED'
    );
  }

  async isAvailable(): Promise<boolean> {
    // Check Voyage API availability
    if (this.voyageApiKey) {
      try {
        const response = await fetch(`${VOYAGE_API_BASE_URL}/embeddings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.voyageApiKey}`,
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

    // Future: Check Atlas Data API availability
    return false;
  }

  estimateCost(texts: string[]): number {
    // Atlas AI Services pricing is typically included in Atlas billing
    // For cost estimation, use Voyage pricing as reference
    const totalTokens = estimateTotalTokens(texts);
    const pricePerMillion = 0.06; // Voyage-3 pricing
    return (totalTokens / 1_000_000) * pricePerMillion;
  }

  getModelInfo(): EmbeddingModelInfo {
    return {
      model: this.modelName,
      dimensions: this.dimensions,
      provider: 'atlas-ai',
      maxBatchSize: this.batchSize,
    };
  }

  /**
   * Generate embeddings via Voyage AI API
   */
  private async generateEmbeddingsViaVoyage(
    texts: string[],
    inputType: 'document' | 'query'
  ): Promise<number[][]> {
    const allEmbeddings: number[][] = [];

    // Process in batches
    for (let i = 0; i < texts.length; i += this.batchSize) {
      const batch = texts.slice(i, i + this.batchSize);
      const batchIndex = Math.floor(i / this.batchSize);

      try {
        const response = await fetch(`${VOYAGE_API_BASE_URL}/embeddings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.voyageApiKey}`,
          },
          body: JSON.stringify({
            input: batch,
            model: this.modelName,
            input_type: inputType,
          }),
        });

        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = this.parseRetryAfter(response);
          throw new EmbeddingError(
            `Rate limit exceeded. Please retry after ${retryAfter} seconds.`,
            'atlas-ai',
            'RATE_LIMIT_EXCEEDED',
            429,
            retryAfter,
            batchIndex
          );
        }

        if (!response.ok) {
          const errorBody: VoyageErrorResponse = await response.json().catch(() => ({}));
          const errorMessage =
            errorBody.detail || errorBody.message || `Atlas AI API error: ${response.status}`;
          throw new EmbeddingError(
            errorMessage,
            'atlas-ai',
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
              'atlas-ai',
              'DIMENSION_MISMATCH',
              undefined,
              undefined,
              batchIndex
            );
          }
        }

        allEmbeddings.push(...batchEmbeddings);
      } catch (error: unknown) {
        if (error instanceof EmbeddingError) {
          throw error;
        }

        const errMsg =
          error instanceof Error ? error.message : 'Atlas AI embedding error';
        throw new EmbeddingError(errMsg, 'atlas-ai', 'API_ERROR', undefined, undefined, batchIndex);
      }
    }

    return allEmbeddings;
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
    const resetTime = response.headers.get('x-ratelimit-reset');
    if (resetTime) {
      const resetDate = new Date(resetTime);
      const now = new Date();
      const diffSeconds = Math.ceil((resetDate.getTime() - now.getTime()) / 1000);
      if (diffSeconds > 0) {
        return diffSeconds;
      }
    }
    return 60;
  }
}

/**
 * Create an Atlas AI embedding provider instance
 */
export function createAtlasAIEmbeddingProvider(
  config: AtlasAIEmbeddingProviderConfig
): AtlasAIEmbeddingProvider {
  return new AtlasAIEmbeddingProvider(config);
}

/**
 * Check if Atlas AI Services is available for the current cluster
 *
 * Atlas AI Services requires:
 * - M10+ cluster tier
 * - Specific regions with AI Services support
 * - AI Services enabled in cluster configuration
 *
 * @returns True if Atlas AI Services is available
 */
export async function checkAtlasAIAvailability(): Promise<boolean> {
  // For now, check if Voyage API key is configured (Atlas AI uses Voyage)
  const voyageKey = process.env.VOYAGE_API_KEY;
  return !!voyageKey;
}
