/**
 * MongoDB Atlas Embedding and Reranking API Provider
 *
 * Uses the new Atlas-native Voyage AI integration
 * https://www.mongodb.com/docs/voyageai/
 *
 * Base URL: https://ai.mongodb.com/v1
 *
 * This provider uses MongoDB's first-party embedding service that provides
 * direct access to Voyage AI models with unified billing and authentication.
 */

import {
  EmbeddingProvider,
  EmbeddingError,
  EmbeddingModelInfo,
  estimateTotalTokens,
} from './base';

/**
 * MongoDB Atlas Embedding API base URL
 */
const ATLAS_EMBEDDING_API_URL = 'https://ai.mongodb.com/v1';

/**
 * Voyage 4 series models - shared embedding space
 * All Voyage 4 models can be used interchangeably at 1024 dimensions
 */
const VOYAGE_4_MODELS: Record<string, { dimensions: number; maxBatch: number }> = {
  'voyage-4-large': { dimensions: 1024, maxBatch: 128 },
  'voyage-4': { dimensions: 1024, maxBatch: 128 },
  'voyage-4-lite': { dimensions: 1024, maxBatch: 128 },
};

/**
 * Domain-specific models
 */
const DOMAIN_MODELS: Record<string, { dimensions: number; maxBatch: number }> = {
  'voyage-finance-2': { dimensions: 1024, maxBatch: 128 },
  'voyage-law-2': { dimensions: 1024, maxBatch: 128 },
  'voyage-code-3': { dimensions: 1024, maxBatch: 128 },
};

/**
 * Pricing for Atlas Embedding API models (per 1M tokens)
 * Updated as of January 2026
 */
const ATLAS_EMBEDDING_PRICING: Record<string, number> = {
  // Voyage 4 series
  'voyage-4-lite': 0.02, // $0.02 per 1M tokens
  'voyage-4': 0.06, // $0.06 per 1M tokens
  'voyage-4-large': 0.18, // $0.18 per 1M tokens

  // Domain-specific
  'voyage-finance-2': 0.06, // $0.06 per 1M tokens
  'voyage-law-2': 0.06, // $0.06 per 1M tokens
  'voyage-code-3': 0.06, // $0.06 per 1M tokens
};

/**
 * Atlas Embedding API configuration
 */
export interface AtlasEmbeddingAPIConfig {
  /** Atlas Model API Key (managed in Atlas UI) */
  apiKey: string;
  /** Model to use (default: voyage-4) */
  model?: string;
  /** Output dimensions (256, 512, 1024, 2048) - only for Voyage 4 series */
  outputDimensions?: number;
  /** Base URL (default: https://ai.mongodb.com/v1) */
  baseURL?: string;
}

/**
 * Atlas API response types
 */
interface AtlasEmbeddingData {
  object: 'embedding';
  embedding: number[];
  index: number;
}

interface AtlasEmbeddingResponse {
  object: 'list';
  data: AtlasEmbeddingData[];
  model: string;
  usage: {
    total_tokens: number;
  };
}

interface AtlasErrorResponse {
  detail?: string;
  message?: string;
}

/**
 * MongoDB Atlas Embedding API Provider
 *
 * Benefits over direct Voyage API:
 * - Single platform: Database + Vector Search + Embeddings
 * - Unified billing and authentication
 * - Voyage 4 series with shared embedding space
 * - Enterprise security controls
 */
export class AtlasEmbeddingAPIProvider implements EmbeddingProvider {
  readonly providerId = 'atlas-embedding-api' as const;
  readonly dimensions: number;
  readonly modelName: string;

  private apiKey: string;
  private baseURL: string;
  private outputDimensions?: number;
  private batchSize: number;

  constructor(config: AtlasEmbeddingAPIConfig) {
    if (!config.apiKey) {
      throw new EmbeddingError(
        'Atlas Model API key is required',
        'atlas-embedding-api',
        'MISSING_API_KEY'
      );
    }

    this.apiKey = config.apiKey;
    this.baseURL = config.baseURL || ATLAS_EMBEDDING_API_URL;
    this.modelName = config.model || 'voyage-4';

    // Determine dimensions
    const modelConfig =
      VOYAGE_4_MODELS[this.modelName] || DOMAIN_MODELS[this.modelName];

    if (!modelConfig) {
      console.warn(
        `[Atlas Embedding API] Unknown model: ${this.modelName}, defaulting to voyage-4`
      );
      this.modelName = 'voyage-4';
      this.dimensions = config.outputDimensions || 1024;
    } else {
      this.dimensions = config.outputDimensions || modelConfig.dimensions;
    }

    this.outputDimensions = config.outputDimensions;
    this.batchSize = modelConfig?.maxBatch || 128;

    // Validate output dimensions for Voyage 4 series
    if (
      VOYAGE_4_MODELS[this.modelName] &&
      this.outputDimensions &&
      ![256, 512, 1024, 2048].includes(this.outputDimensions)
    ) {
      throw new EmbeddingError(
        `Invalid output dimensions for ${this.modelName}: ${this.outputDimensions}. Must be 256, 512, 1024, or 2048.`,
        'atlas-embedding-api',
        'INVALID_DIMENSIONS'
      );
    }
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
        const batchEmbeddings = await this.callEmbeddingAPI(batch, 'document');
        allEmbeddings.push(...batchEmbeddings);
      } catch (error: unknown) {
        // Add batch context to error
        if (error instanceof EmbeddingError) {
          throw new EmbeddingError(
            error.message,
            error.provider,
            error.code,
            error.statusCode,
            error.retryAfter,
            batchIndex
          );
        }
        throw error;
      }
    }

    return allEmbeddings;
  }

  async generateQueryEmbedding(query: string): Promise<number[]> {
    const embeddings = await this.callEmbeddingAPI([query], 'query');
    return embeddings[0];
  }

  /**
   * Call Atlas Embedding API
   */
  private async callEmbeddingAPI(
    texts: string[],
    inputType: 'document' | 'query'
  ): Promise<number[][]> {
    try {
      const requestBody: {
        input: string[];
        model: string;
        input_type: 'document' | 'query';
        output_dimension?: number;
      } = {
        input: texts,
        model: this.modelName,
        input_type: inputType,
      };

      // Only add output_dimension for Voyage 4 series
      if (VOYAGE_4_MODELS[this.modelName] && this.outputDimensions) {
        requestBody.output_dimension = this.outputDimensions;
      }

      const response = await fetch(`${this.baseURL}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = this.parseRetryAfter(response);
        throw new EmbeddingError(
          `Rate limit exceeded. Please retry after ${retryAfter} seconds.`,
          'atlas-embedding-api',
          'RATE_LIMIT_EXCEEDED',
          429,
          retryAfter
        );
      }

      if (!response.ok) {
        const errorBody: AtlasErrorResponse = await response.json().catch(() => ({}));
        const errorMessage =
          errorBody.detail || errorBody.message || `Atlas API error: ${response.status}`;
        throw new EmbeddingError(
          errorMessage,
          'atlas-embedding-api',
          'API_ERROR',
          response.status
        );
      }

      const data: AtlasEmbeddingResponse = await response.json();

      // Extract embeddings in order
      const embeddings = data.data
        .sort((a, b) => a.index - b.index)
        .map((item) => item.embedding);

      // Validate dimensions
      for (const embedding of embeddings) {
        if (embedding.length !== this.dimensions) {
          throw new EmbeddingError(
            `Unexpected embedding dimensions: expected ${this.dimensions}, got ${embedding.length}`,
            'atlas-embedding-api',
            'DIMENSION_MISMATCH'
          );
        }
      }

      return embeddings;
    } catch (error: unknown) {
      // Re-throw EmbeddingError as-is
      if (error instanceof EmbeddingError) {
        throw error;
      }

      // Handle network errors
      if (error instanceof TypeError && (error as Error).message.includes('fetch')) {
        throw new EmbeddingError(
          `Failed to connect to Atlas Embedding API at ${this.baseURL}`,
          'atlas-embedding-api',
          'CONNECTION_ERROR'
        );
      }

      // Wrap other errors
      const errMsg =
        error instanceof Error ? error.message : 'Atlas Embedding API error';
      throw new EmbeddingError(errMsg, 'atlas-embedding-api', 'API_ERROR');
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
      ATLAS_EMBEDDING_PRICING[this.modelName] ||
      ATLAS_EMBEDDING_PRICING['voyage-4'];
    return (totalTokens / 1_000_000) * pricePerMillion;
  }

  getModelInfo(): EmbeddingModelInfo {
    return {
      model: this.modelName,
      dimensions: this.dimensions,
      provider: 'atlas-embedding-api',
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
    return 60; // Default fallback
  }
}

/**
 * Create an Atlas Embedding API provider instance
 */
export function createAtlasEmbeddingAPIProvider(
  config: AtlasEmbeddingAPIConfig
): AtlasEmbeddingAPIProvider {
  return new AtlasEmbeddingAPIProvider(config);
}
