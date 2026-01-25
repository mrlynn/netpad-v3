/**
 * Embedding Provider Abstraction Layer
 *
 * Unified interface for interacting with different embedding providers
 * (OpenAI, Voyage AI, MongoDB Atlas AI Services, etc.)
 */

/**
 * Embedding provider types
 */
export type EmbeddingProviderType = 'openai' | 'voyage' | 'atlas-ai';

/**
 * Embedding model dimensions mapping
 */
export const MODEL_DIMENSIONS: Record<string, number> = {
  // OpenAI models
  'text-embedding-3-small': 1536,
  'text-embedding-3-large': 3072,
  'text-embedding-ada-002': 1536,

  // Voyage AI models
  'voyage-3': 1024,
  'voyage-3-lite': 512,
  'voyage-code-3': 1536,
  'voyage-3-large': 1024,

  // Atlas AI (uses Voyage under the hood)
  'atlas-ai-default': 1024,
};

/**
 * Provider-specific batch sizes
 * Conservative limits to avoid rate limiting
 */
export const BATCH_SIZES: Record<EmbeddingProviderType, number> = {
  openai: 100, // OpenAI supports up to 2048, use conservative limit
  voyage: 64, // Voyage supports up to 128, use conservative limit
  'atlas-ai': 64, // Same as Voyage (proxies to Voyage)
};

/**
 * Default models per provider
 */
export const DEFAULT_MODELS: Record<EmbeddingProviderType, string> = {
  openai: 'text-embedding-3-small',
  voyage: 'voyage-3',
  'atlas-ai': 'voyage-3',
};

/**
 * Result of embedding generation
 */
export interface EmbeddingResult {
  /** Generated embeddings */
  embeddings: number[][];
  /** Model used */
  model: string;
  /** Token usage */
  usage?: {
    totalTokens: number;
  };
}

/**
 * Embedding model information
 */
export interface EmbeddingModelInfo {
  /** Model identifier */
  model: string;
  /** Vector dimensions */
  dimensions: number;
  /** Provider name */
  provider: string;
  /** Maximum batch size */
  maxBatchSize: number;
}

/**
 * Configuration for embedding providers
 */
export interface EmbeddingProviderConfig {
  /** Provider type */
  type: EmbeddingProviderType;
  /** API key if required */
  apiKey?: string;
  /** Base URL for API (for custom endpoints) */
  baseURL?: string;
  /** Model to use */
  model?: string;
  /** Additional provider-specific options */
  options?: Record<string, unknown>;
}

/**
 * Base interface for all embedding providers
 */
export interface EmbeddingProvider {
  /**
   * Provider identifier (e.g., 'openai', 'voyage', 'atlas-ai')
   */
  readonly providerId: EmbeddingProviderType;

  /**
   * Vector dimensions for this provider's embeddings
   */
  readonly dimensions: number;

  /**
   * Model name being used
   */
  readonly modelName: string;

  /**
   * Generate embeddings for multiple texts
   *
   * @param texts - Array of text strings to embed
   * @returns Array of embedding vectors
   */
  generateEmbeddings(texts: string[]): Promise<number[][]>;

  /**
   * Generate a single embedding for a query
   * Some providers optimize differently for queries vs documents
   *
   * @param query - Query text to embed
   * @returns Single embedding vector
   */
  generateQueryEmbedding(query: string): Promise<number[]>;

  /**
   * Check if provider is configured and available
   *
   * @returns True if provider can be used
   */
  isAvailable(): Promise<boolean>;

  /**
   * Estimate cost for embedding texts
   *
   * @param texts - Array of texts to estimate
   * @returns Estimated cost in USD
   */
  estimateCost(texts: string[]): number;

  /**
   * Get model information
   */
  getModelInfo(): EmbeddingModelInfo;
}

/**
 * Error thrown by embedding providers
 */
export class EmbeddingError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly code?: string,
    public readonly statusCode?: number,
    public readonly retryAfter?: number,
    public readonly batchIndex?: number // For partial batch recovery
  ) {
    super(message);
    this.name = 'EmbeddingError';
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

/**
 * Get dimensions for a model
 *
 * @param model - Model identifier
 * @returns Dimensions, or undefined if unknown
 */
export function getModelDimensions(model: string): number | undefined {
  return MODEL_DIMENSIONS[model];
}

/**
 * Estimate tokens from text (rough approximation)
 * Uses ~4 characters per token for English text
 *
 * @param text - Input text
 * @returns Estimated token count
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Estimate tokens for multiple texts
 *
 * @param texts - Array of texts
 * @returns Total estimated tokens
 */
export function estimateTotalTokens(texts: string[]): number {
  return texts.reduce((sum, text) => sum + estimateTokens(text), 0);
}
