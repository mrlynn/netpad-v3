/**
 * MongoDB Atlas Reranking API Provider
 *
 * Uses the new Atlas-native reranking service powered by Voyage AI
 * https://www.mongodb.com/docs/voyageai/
 *
 * Base URL: https://ai.mongodb.com/v1/rerank
 *
 * This provider uses MongoDB's first-party reranking service with
 * unified billing and authentication alongside embeddings.
 */

import { RerankProvider, RerankResult, RerankError, RerankModelInfo } from './base';

/**
 * MongoDB Atlas Reranking API base URL
 */
const ATLAS_RERANK_API_URL = 'https://ai.mongodb.com/v1';

/**
 * Available Atlas reranking models
 */
const RERANK_MODELS: Record<string, { maxTokens: number }> = {
  'rerank-2.5': { maxTokens: 32000 },
  'rerank-2.5-lite': { maxTokens: 32000 },
  'rerank-2': { maxTokens: 16000 },
};

/**
 * Pricing for Atlas Reranking API models (per 1M tokens)
 * Updated as of January 2026
 */
const ATLAS_RERANK_PRICING: Record<string, number> = {
  'rerank-2.5': 0.05, // $0.05 per 1M tokens
  'rerank-2.5-lite': 0.02, // $0.02 per 1M tokens
  'rerank-2': 0.02, // $0.02 per 1M tokens (legacy)
};

/**
 * Atlas Reranking API configuration
 */
export interface AtlasRerankConfig {
  /** Atlas Model API Key (managed in Atlas UI) */
  apiKey: string;
  /** Model to use (default: rerank-2.5-lite) */
  model?: string;
  /** Base URL (default: https://ai.mongodb.com/v1) */
  baseURL?: string;
}

/**
 * Atlas API response types
 */
interface AtlasRerankResponse {
  object: 'list';
  data: Array<{
    index: number;
    relevance_score: number;
    document?: string;
  }>;
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
 * MongoDB Atlas Reranking API Provider
 *
 * Benefits over direct Voyage API:
 * - Single platform with embeddings and vector search
 * - Unified billing and authentication
 * - Enterprise security controls
 * - Seamless integration with Atlas ecosystem
 */
export class AtlasRerankProvider implements RerankProvider {
  readonly providerId = 'atlas-rerank' as const;
  readonly modelName: string;

  private apiKey: string;
  private baseURL: string;

  constructor(config: AtlasRerankConfig) {
    if (!config.apiKey) {
      throw new RerankError(
        'Atlas Model API key is required',
        'atlas-rerank',
        'MISSING_API_KEY'
      );
    }

    this.apiKey = config.apiKey;
    this.baseURL = config.baseURL || ATLAS_RERANK_API_URL;
    this.modelName = config.model || 'rerank-2.5-lite';

    // Validate model
    if (!RERANK_MODELS[this.modelName as keyof typeof RERANK_MODELS]) {
      console.warn(
        `[Atlas Rerank] Unknown model: ${this.modelName}, defaulting to rerank-2.5-lite`
      );
      this.modelName = 'rerank-2.5-lite';
    }
  }

  async rerank(
    query: string,
    documents: string[],
    options: { topK?: number; returnDocuments?: boolean } = {}
  ): Promise<RerankResult[]> {
    if (!query || query.trim().length === 0) {
      throw new RerankError(
        'Query cannot be empty',
        'atlas-rerank',
        'INVALID_INPUT'
      );
    }

    if (!documents || documents.length === 0) {
      return [];
    }

    try {
      const response = await fetch(`${this.baseURL}/rerank`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          query,
          documents,
          model: this.modelName,
          top_k: options.topK,
          return_documents: options.returnDocuments,
        }),
      });

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = this.parseRetryAfter(response);
        throw new RerankError(
          `Rate limit exceeded. Please retry after ${retryAfter} seconds.`,
          'atlas-rerank',
          'RATE_LIMIT_EXCEEDED',
          429,
          retryAfter
        );
      }

      if (!response.ok) {
        const errorBody: AtlasErrorResponse = await response.json().catch(() => ({}));
        const errorMessage =
          errorBody.detail || errorBody.message || `Atlas Rerank API error: ${response.status}`;
        throw new RerankError(
          errorMessage,
          'atlas-rerank',
          'API_ERROR',
          response.status
        );
      }

      const data: AtlasRerankResponse = await response.json();

      // Convert to RerankResult format
      return data.data.map((item) => ({
        index: item.index,
        relevanceScore: item.relevance_score,
        document: item.document,
      }));
    } catch (error: unknown) {
      // Re-throw RerankError as-is
      if (error instanceof RerankError) {
        throw error;
      }

      // Handle network errors
      if (error instanceof TypeError && (error as Error).message.includes('fetch')) {
        throw new RerankError(
          `Failed to connect to Atlas Rerank API at ${this.baseURL}`,
          'atlas-rerank',
          'CONNECTION_ERROR'
        );
      }

      // Wrap other errors
      const errMsg =
        error instanceof Error ? error.message : 'Atlas Reranking API error';
      throw new RerankError(errMsg, 'atlas-rerank', 'API_ERROR');
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Quick availability check with minimal input
      const response = await fetch(`${this.baseURL}/rerank`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          query: 'test',
          documents: ['test document'],
          model: this.modelName,
        }),
        signal: AbortSignal.timeout(5000),
      });
      return response.ok || response.status === 429; // 429 means API is available but rate-limited
    } catch {
      return false;
    }
  }

  getModelInfo(): RerankModelInfo {
    const modelConfig = RERANK_MODELS[this.modelName as keyof typeof RERANK_MODELS];
    return {
      model: this.modelName,
      provider: 'atlas-rerank',
      maxTokens: modelConfig?.maxTokens || 32000,
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
 * Create an Atlas Reranking API provider instance
 */
export function createAtlasRerankProvider(
  config: AtlasRerankConfig
): AtlasRerankProvider {
  return new AtlasRerankProvider(config);
}
