/**
 * LLM Provider Abstraction Layer (Standalone Version)
 *
 * Simplified interface for interacting with OpenAI.
 * This is a standalone version without the full platform dependencies.
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
  /** Model to use */
  model?: string;
  /** Temperature for generation (0-2) */
  temperature?: number;
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Stop sequences */
  stop?: string[];
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
 * Base interface for LLM providers
 */
export interface LLMProvider {
  /** Provider identifier */
  readonly providerId: string;

  /** Stream a chat completion */
  streamChat(messages: Message[], config?: StreamConfig): AsyncIterable<string>;

  /** Extract structured data from a conversation */
  extractStructuredData(
    conversation: Message[],
    schema: ExtractionSchema[]
  ): Promise<ExtractedData>;

  /** Check if provider is available */
  isAvailable(): Promise<boolean>;
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

  isRetryable(): boolean {
    return (
      this.code === 'RATE_LIMIT_EXCEEDED' ||
      (this.statusCode !== undefined && this.statusCode >= 500) ||
      this.statusCode === 429
    );
  }
}
