/**
 * Self-Hosted LLM Provider Implementation
 * 
 * Supports Ollama and OpenRouter-compatible APIs
 */

import {
  LLMProvider,
  Message,
  StreamConfig,
  ExtractionSchema,
  ExtractedData,
  CostEstimate,
  ProviderError,
} from './base';

/**
 * Self-hosted provider configuration
 */
export interface SelfHostedProviderConfig {
  /** Base URL for the API (e.g., http://localhost:11434 for Ollama) */
  baseURL: string;
  /** API key if required */
  apiKey?: string;
  /** Default model to use */
  defaultModel?: string;
  /** Provider type */
  providerType: 'ollama' | 'openrouter';
}

/**
 * Ollama chat message format
 */
interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Ollama API response chunk
 */
interface OllamaResponseChunk {
  model?: string;
  created_at?: string;
  message?: {
    role?: string;
    content?: string;
  };
  done?: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

/**
 * Self-Hosted Provider Implementation
 * 
 * Fully implements Ollama API integration for self-hosted LLMs
 */
export class SelfHostedProvider implements LLMProvider {
  readonly providerId: string;
  private config: SelfHostedProviderConfig;

  constructor(config: SelfHostedProviderConfig) {
    this.config = config;
    this.providerId = config.providerType;
  }

  async *streamChat(
    messages: Message[],
    config?: StreamConfig
  ): AsyncIterable<string> {
    if (this.config.providerType === 'ollama') {
      yield* this.streamOllamaChat(messages, config);
    } else {
      throw new ProviderError(
        `Streaming not yet implemented for ${this.config.providerType}`,
        this.providerId,
        'NOT_IMPLEMENTED'
      );
    }
  }

  /**
   * Stream chat using Ollama API
   */
  private async *streamOllamaChat(
    messages: Message[],
    config?: StreamConfig
  ): AsyncIterable<string> {
    const model = config?.model || this.config.defaultModel || 'llama2';
    const ollamaMessages = this.convertMessagesToOllama(messages);

    try {
      const response = await fetch(`${this.config.baseURL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
        },
        body: JSON.stringify({
          model,
          messages: ollamaMessages,
          stream: true,
          options: {
            temperature: config?.temperature ?? 0.7,
            num_predict: config?.maxTokens,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new ProviderError(
          `Ollama API error: ${errorText}`,
          'ollama',
          'API_ERROR',
          response.status
        );
      }

      if (!response.body) {
        throw new ProviderError(
          'No response body from Ollama',
          'ollama',
          'NO_RESPONSE'
        );
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          
          // Keep the last incomplete line in buffer
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.trim()) continue;

            try {
              const chunk: OllamaResponseChunk = JSON.parse(line);
              
              if (chunk.message?.content) {
                yield chunk.message.content;
              }

              // Check if done
              if (chunk.done) {
                return;
              }
            } catch (parseError) {
              // Skip malformed JSON chunks (can happen during streaming)
              console.warn('[Ollama Provider] Failed to parse chunk:', line);
            }
          }
        }

        // Process any remaining buffer
        if (buffer.trim()) {
          try {
            const chunk: OllamaResponseChunk = JSON.parse(buffer);
            if (chunk.message?.content) {
              yield chunk.message.content;
            }
          } catch {
            // Ignore parse errors for final chunk
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error: any) {
      if (error instanceof ProviderError) {
        throw error;
      }

      // Handle network errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new ProviderError(
          `Failed to connect to Ollama at ${this.config.baseURL}. Make sure Ollama is running.`,
          'ollama',
          'CONNECTION_ERROR'
        );
      }

      throw new ProviderError(
        error.message || 'Ollama streaming error',
        'ollama',
        'STREAM_ERROR'
      );
    }
  }

  async extractStructuredData(
    conversation: Message[],
    schema: ExtractionSchema[]
  ): Promise<ExtractedData> {
    if (this.config.providerType === 'ollama') {
      return this.extractWithOllama(conversation, schema);
    } else {
      throw new ProviderError(
        `Extraction not yet implemented for ${this.config.providerType}`,
        this.providerId,
        'NOT_IMPLEMENTED'
      );
    }
  }

  /**
   * Extract structured data using Ollama
   */
  private async extractWithOllama(
    conversation: Message[],
    schema: ExtractionSchema[]
  ): Promise<ExtractedData> {
    const model = this.config.defaultModel || 'llama2';
    const ollamaMessages = this.convertMessagesToOllama(conversation);

    // Build extraction prompt
    const extractionPrompt = this.buildExtractionPrompt(schema);
    ollamaMessages.push({
      role: 'user',
      content: extractionPrompt,
    });

    try {
      const response = await fetch(`${this.config.baseURL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
        },
        body: JSON.stringify({
          model,
          messages: ollamaMessages,
          stream: false,
          format: 'json',
          options: {
            temperature: 0.3, // Lower temperature for more consistent extraction
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new ProviderError(
          `Ollama API error: ${errorText}`,
          'ollama',
          'API_ERROR',
          response.status
        );
      }

      const result: OllamaResponseChunk = await response.json();
      const responseText = result.message?.content;

      if (!responseText) {
        throw new ProviderError(
          'No response from Ollama',
          'ollama',
          'NO_RESPONSE'
        );
      }

      // Parse extracted data
      let extracted: any;
      try {
        extracted = JSON.parse(responseText);
      } catch (parseError) {
        // Sometimes Ollama wraps JSON in markdown code blocks
        const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          extracted = JSON.parse(jsonMatch[1]);
        } else {
          throw parseError;
        }
      }

      return this.processExtraction(extracted, schema);
    } catch (error: any) {
      if (error instanceof ProviderError) {
        throw error;
      }

      throw new ProviderError(
        error.message || 'Extraction failed',
        'ollama',
        'EXTRACTION_ERROR'
      );
    }
  }

  /**
   * Convert messages to Ollama format
   */
  private convertMessagesToOllama(messages: Message[]): OllamaMessage[] {
    return messages.map((msg) => ({
      role: msg.role as 'system' | 'user' | 'assistant',
      content: msg.content,
    }));
  }

  /**
   * Build extraction prompt from schema
   */
  private buildExtractionPrompt(schema: ExtractionSchema[]): string {
    const schemaDescription = schema
      .map((field) => {
        let desc = `- ${field.field} (${field.type})`;
        if (field.required) desc += ' [REQUIRED]';
        desc += `: ${field.description}`;
        if (field.options) {
          desc += ` Options: ${field.options.join(', ')}`;
        }
        return desc;
      })
      .join('\n');

    return `Extract structured data from the conversation above. Return a JSON object with the following fields:

${schemaDescription}

For each field, provide:
1. The extracted value
2. A confidence score (0-1) indicating how confident you are in the extraction

Return JSON in this format:
{
  "data": {
    "fieldName": "extracted value",
    ...
  },
  "confidence": {
    "fieldName": 0.95,
    ...
  },
  "overallConfidence": 0.90,
  "missingFields": ["fieldName if not found"],
  "warnings": ["any warnings"]
}`;
  }

  /**
   * Process extraction result and validate against schema
   */
  private processExtraction(
    extracted: any,
    schema: ExtractionSchema[]
  ): ExtractedData {
    const data: Record<string, any> = {};
    const confidence: Record<string, number> = {};
    const missingFields: string[] = [];
    const warnings: string[] = [];

    // Process each field in schema
    for (const fieldSchema of schema) {
      const value = extracted.data?.[fieldSchema.field];
      const fieldConfidence = extracted.confidence?.[fieldSchema.field] ?? 0;

      if (value === undefined || value === null) {
        if (fieldSchema.required) {
          missingFields.push(fieldSchema.field);
        }
        continue;
      }

      // Validate type
      if (!this.validateFieldType(value, fieldSchema)) {
        warnings.push(
          `Field ${fieldSchema.field} has incorrect type. Expected ${fieldSchema.type}, got ${typeof value}`
        );
        continue;
      }

      // Validate constraints
      const validationWarnings = this.validateFieldConstraints(
        value,
        fieldSchema
      );
      warnings.push(...validationWarnings);

      data[fieldSchema.field] = value;
      confidence[fieldSchema.field] = fieldConfidence;
    }

    // Calculate overall confidence
    const confidenceValues = Object.values(confidence);
    const overallConfidence =
      confidenceValues.length > 0
        ? confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length
        : 0;

    return {
      data,
      confidence,
      overallConfidence,
      missingFields,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Validate field type
   */
  private validateFieldType(value: any, schema: ExtractionSchema): boolean {
    switch (schema.type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number';
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && !Array.isArray(value);
      case 'enum':
        return (
          typeof value === 'string' &&
          (schema.options?.includes(value) ?? false)
        );
      default:
        return true;
    }
  }

  /**
   * Validate field constraints
   */
  private validateFieldConstraints(
    value: any,
    schema: ExtractionSchema
  ): string[] {
    const warnings: string[] = [];
    const validation = schema.validation;

    if (!validation) return warnings;

    if (schema.type === 'string' && typeof value === 'string') {
      if (validation.minLength && value.length < validation.minLength) {
        warnings.push(
          `Field ${schema.field} is shorter than minimum length (${validation.minLength})`
        );
      }
      if (validation.maxLength && value.length > validation.maxLength) {
        warnings.push(
          `Field ${schema.field} is longer than maximum length (${validation.maxLength})`
        );
      }
      if (validation.pattern) {
        const regex = new RegExp(validation.pattern);
        if (!regex.test(value)) {
          warnings.push(`Field ${schema.field} doesn't match required pattern`);
        }
      }
    }

    if (schema.type === 'number' && typeof value === 'number') {
      if (validation.min !== undefined && value < validation.min) {
        warnings.push(
          `Field ${schema.field} is less than minimum (${validation.min})`
        );
      }
      if (validation.max !== undefined && value > validation.max) {
        warnings.push(
          `Field ${schema.field} is greater than maximum (${validation.max})`
        );
      }
    }

    return warnings;
  }

  async estimateCost(
    messages: Message[],
    config?: StreamConfig
  ): Promise<CostEstimate> {
    // Self-hosted models typically have no cost
    return {
      estimatedCost: 0,
      promptCostPer1K: 0,
      completionCostPer1K: 0,
      provider: this.providerId,
      model: config?.model || this.config.defaultModel || 'unknown',
    };
  }

  async getAvailableModels(): Promise<string[]> {
    if (this.config.providerType === 'ollama') {
      try {
        const response = await fetch(`${this.config.baseURL}/api/tags`, {
          method: 'GET',
          headers: {
            ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
          },
          signal: AbortSignal.timeout(5000),
        });

        if (!response.ok) {
          // Fallback to common models if API is unavailable
          return ['llama2', 'llama3.2', 'mistral', 'codellama'];
        }

        const data = await response.json();
        if (data.models && Array.isArray(data.models)) {
          return data.models.map((model: any) => model.name || model.model || String(model));
        }

        return ['llama2', 'llama3.2', 'mistral', 'codellama'];
      } catch {
        // Return common models as fallback
        return ['llama2', 'llama3.2', 'mistral', 'codellama'];
      }
    }
    return [];
  }

  async isAvailable(): Promise<boolean> {
    try {
      // For Ollama, check if the API is reachable by listing models
      if (this.config.providerType === 'ollama') {
        const response = await fetch(`${this.config.baseURL}/api/tags`, {
          method: 'GET',
          headers: {
            ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
          },
          signal: AbortSignal.timeout(5000),
        });
        return response.ok;
      }

      // Generic health check fallback
      const response = await fetch(`${this.config.baseURL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

/**
 * Create a self-hosted provider instance
 */
export function createSelfHostedProvider(
  config: SelfHostedProviderConfig
): SelfHostedProvider {
  return new SelfHostedProvider(config);
}
