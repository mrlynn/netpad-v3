/**
 * LLM Provider Abstraction Layer
 * 
 * Unified interface for interacting with different LLM providers
 * (OpenAI, self-hosted models via Ollama/OpenRouter, etc.)
 */

/**
 * Message role in a conversation
 */
export type MessageRole = 'system' | 'user' | 'assistant';

/**
 * A single message in a conversation
 */
export interface Message {
  role: MessageRole;
  content: string;
  timestamp?: Date;
}

/**
 * Configuration for streaming chat requests
 */
export interface StreamConfig {
  /** Model to use (provider-specific) */
  model?: string;
  /** Temperature for generation (0-2) */
  temperature?: number;
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Stop sequences */
  stop?: string[];
  /** Additional provider-specific options */
  extra?: Record<string, any>;
}

/**
 * Configuration for structured data extraction
 */
export interface ExtractionSchema {
  /** Field name */
  field: string;
  /** Field type */
  type: 'string' | 'number' | 'boolean' | 'enum' | 'array' | 'object';
  /** Whether field is required */
  required: boolean;
  /** Description of what to extract */
  description: string;
  /** For enum type, list of possible values */
  options?: string[];
  /** Validation rules */
  validation?: {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
  };
}

/**
 * Extracted data from a conversation
 */
export interface ExtractedData {
  /** Extracted field values */
  data: Record<string, any>;
  /** Confidence scores per field (0-1) */
  confidence: Record<string, number>;
  /** Overall confidence (0-1) */
  overallConfidence: number;
  /** Fields that couldn't be extracted */
  missingFields: string[];
  /** Warnings or issues */
  warnings?: string[];
}

/**
 * Token usage information
 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * Cost estimation for a request
 */
export interface CostEstimate {
  /** Estimated cost in USD */
  estimatedCost: number;
  /** Cost per 1K prompt tokens */
  promptCostPer1K: number;
  /** Cost per 1K completion tokens */
  completionCostPer1K: number;
  /** Provider name */
  provider: string;
  /** Model name */
  model: string;
}

/**
 * Base interface for all LLM providers
 */
export interface LLMProvider {
  /**
   * Provider identifier (e.g., 'openai', 'ollama', 'openrouter')
   */
  readonly providerId: string;

  /**
   * Stream a chat completion
   * 
   * @param messages - Conversation messages
   * @param config - Streaming configuration
   * @returns Async iterable of text chunks
   */
  streamChat(
    messages: Message[],
    config?: StreamConfig
  ): AsyncIterable<string>;

  /**
   * Extract structured data from a conversation
   * 
   * @param conversation - Full conversation messages
   * @param schema - Schema defining what to extract
   * @returns Extracted data with confidence scores
   */
  extractStructuredData(
    conversation: Message[],
    schema: ExtractionSchema[]
  ): Promise<ExtractedData>;

  /**
   * Estimate the cost of a request
   * 
   * @param messages - Messages to estimate
   * @param config - Configuration for the request
   * @returns Cost estimate
   */
  estimateCost(
    messages: Message[],
    config?: StreamConfig
  ): Promise<CostEstimate>;

  /**
   * Get available models for this provider
   * 
   * @returns List of available model identifiers
   */
  getAvailableModels(): Promise<string[]>;

  /**
   * Check if provider is configured and available
   * 
   * @returns True if provider can be used
   */
  isAvailable(): Promise<boolean>;
}

/**
 * Provider configuration
 */
export interface ProviderConfig {
  /** Provider type */
  type: 'openai' | 'ollama' | 'openrouter';
  /** API key or endpoint URL */
  apiKey?: string;
  /** Base URL for API (for self-hosted) */
  baseURL?: string;
  /** Default model to use */
  defaultModel?: string;
  /** Additional provider-specific options */
  options?: Record<string, any>;
}

/**
 * Error thrown by providers
 */
export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly code?: string,
    public readonly statusCode?: number,
    public readonly retryAfter?: number
  ) {
    super(message);
    this.name = 'ProviderError';
  }

  /**
   * Check if this error is retryable
   */
  isRetryable(): boolean {
    // Rate limits and temporary server errors are retryable
    return (
      this.code === 'RATE_LIMIT_EXCEEDED' ||
      (this.statusCode && this.statusCode >= 500) ||
      this.statusCode === 429
    );
  }
}
