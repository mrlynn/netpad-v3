/**
 * Voyage AI Reranking Provider Implementation
 *
 * Implements RerankProvider interface for Voyage AI reranking API
 * https://docs.voyageai.com/docs/reranker
 */

import { RerankProvider, RerankResult, RerankError, RerankModelInfo } from './base';

/**
 * Voyage AI reranking provider configuration
 */
export interface VoyageRerankConfig {
  /** Voyage AI API key */
  apiKey: string;
  /** Model to use (default: rerank-2.5-lite) */
  model?: string;
  /** Base URL (default: https://api.voyageai.com/v1) */
  baseURL?: string;
}

/**
 * Voyage AI API response types
 */
interface VoyageRerankResponse {
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

interface VoyageErrorResponse {
  detail?: string;
  message?: string;
}

/**
 * Available Voyage reranking models and their specifications
 */
const VOYAGE_RERANK_MODELS = {
  'rerank-2.5': { maxTokens: 32000 },
  'rerank-2.5-lite': { maxTokens: 32000 },
  'rerank-2': { maxTokens: 16000 },
};

/**
 * Pricing for Voyage AI reranking models (per 1M tokens)
 * Updated as of January 2026
 */
const VOYAGE_RERANK_PRICING: Record<string, number> = {
  'rerank-2.5': 0.05, // $0.05 per 1M tokens
  'rerank-2.5-lite': 0.02, // $0.02 per 1M tokens
  'rerank-2': 0.02, // $0.02 per 1M tokens (legacy)
};

/**
 * Default Voyage AI API base URL
 */
const VOYAGE_API_BASE_URL = 'https://api.voyageai.com/v1';

/**
 * Voyage AI Reranking Provider
 */
export class VoyageRerankProvider implements RerankProvider {
  readonly providerId = 'voyage' as const;
  readonly modelName: string;

  private apiKey: string;
  private baseURL: string;

  constructor(config: VoyageRerankConfig) {
    if (!config.apiKey) {
      throw new RerankError(
        'Voyage AI API key is required',
        'voyage',
        'MISSING_API_KEY'
      );
    }

    this.apiKey = config.apiKey;
    this.baseURL = config.baseURL || VOYAGE_API_BASE_URL;
    this.modelName = config.model || 'rerank-2.5-lite';

    // Validate model
    if (!VOYAGE_RERANK_MODELS[this.modelName as keyof typeof VOYAGE_RERANK_MODELS]) {
      console.warn(
        `[Voyage Rerank] Unknown model: ${this.modelName}, defaulting to rerank-2.5-lite`
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
        'voyage',
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
        throw new RerankError(
          errorMessage,
          'voyage',
          'API_ERROR',
          response.status
        );
      }

      const data: VoyageRerankResponse = await response.json();

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
          `Failed to connect to Voyage AI API at ${this.baseURL}`,
          'voyage',
          'CONNECTION_ERROR'
        );
      }

      // Wrap other errors
      const errMsg =
        error instanceof Error ? error.message : 'Voyage AI reranking error';
      throw new RerankError(errMsg, 'voyage', 'API_ERROR');
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
    const modelConfig = VOYAGE_RERANK_MODELS[this.modelName as keyof typeof VOYAGE_RERANK_MODELS];
    return {
      model: this.modelName,
      provider: 'voyage',
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
 * Create a Voyage AI reranking provider instance
 */
export function createVoyageRerankProvider(
  config: VoyageRerankConfig
): VoyageRerankProvider {
  return new VoyageRerankProvider(config);
}
