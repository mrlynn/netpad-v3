/**
 * Reranking Provider Abstraction Layer
 *
 * Unified interface for interacting with reranking providers
 * (Voyage AI, Cohere, etc.)
 */

/**
 * Reranking provider types
 */
export type RerankProviderType = 'atlas-rerank' | 'voyage' | 'cohere'; // Atlas is preferred

/**
 * Result of a reranking operation
 */
export interface RerankResult {
  /** Index of the document in the original array */
  index: number;
  /** Relevance score from the reranker (higher = more relevant) */
  relevanceScore: number;
  /** Optional: the document text (if returnDocuments was true) */
  document?: string;
}

/**
 * Reranking model information
 */
export interface RerankModelInfo {
  /** Model identifier */
  model: string;
  /** Provider name */
  provider: string;
  /** Maximum context tokens the model can handle */
  maxTokens: number;
}

/**
 * Base interface for all reranking providers
 */
export interface RerankProvider {
  /**
   * Provider identifier (e.g., 'voyage', 'cohere')
   */
  readonly providerId: RerankProviderType;

  /**
   * Model name being used
   */
  readonly modelName: string;

  /**
   * Rerank documents by relevance to a query
   *
   * @param query - The search query
   * @param documents - Array of document texts to rerank
   * @param options - Optional reranking parameters
   * @returns Reranked results sorted by relevance (highest first)
   */
  rerank(
    query: string,
    documents: string[],
    options?: {
      /** Maximum number of results to return (default: all) */
      topK?: number;
      /** Whether to include document text in results (default: false) */
      returnDocuments?: boolean;
    }
  ): Promise<RerankResult[]>;

  /**
   * Check if provider is configured and available
   *
   * @returns True if provider can be used
   */
  isAvailable(): Promise<boolean>;

  /**
   * Get model information
   */
  getModelInfo(): RerankModelInfo;
}

/**
 * Error thrown by reranking providers
 */
export class RerankError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly code?: string,
    public readonly statusCode?: number,
    public readonly retryAfter?: number
  ) {
    super(message);
    this.name = 'RerankError';
  }

  /**
   * Check if this error is retryable
   */
  isRetryable(): boolean {
    // Rate limits and temporary server errors are retryable
    return (
      this.code === 'RATE_LIMIT_EXCEEDED' ||
      (this.statusCode !== undefined && this.statusCode >= 500) ||
      this.statusCode === 429
    );
  }
}
