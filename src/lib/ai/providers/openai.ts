/**
 * OpenAI Provider Implementation
 * 
 * Implements LLMProvider interface for OpenAI API
 */

import OpenAI from 'openai';
import {
  LLMProvider,
  Message,
  MessageRole,
  StreamConfig,
  ExtractionSchema,
  ExtractedData,
  CostEstimate,
  TokenUsage,
  ProviderError,
} from './base';

/**
 * OpenAI provider configuration
 */
export interface OpenAIProviderConfig {
  /** OpenAI API key */
  apiKey: string;
  /** Default model to use */
  defaultModel?: string;
  /** Base URL (for custom endpoints) */
  baseURL?: string;
  /** Organization ID (optional) */
  organization?: string;
}

/**
 * Model pricing (per 1K tokens) - updated as of 2024
 * Using gpt-4o-mini as default for cost-effectiveness
 */
const MODEL_PRICING: Record<string, { prompt: number; completion: number }> = {
  'gpt-4o-mini': { prompt: 0.15, completion: 0.6 }, // $0.15/$0.60 per 1M tokens
  'gpt-4o': { prompt: 2.5, completion: 10.0 }, // $2.50/$10.00 per 1M tokens
  'gpt-4-turbo': { prompt: 10.0, completion: 30.0 }, // $10/$30 per 1M tokens
  'gpt-3.5-turbo': { prompt: 0.5, completion: 1.5 }, // $0.50/$1.50 per 1M tokens
};

/**
 * Default model for cost estimation if not specified
 */
const DEFAULT_MODEL = 'gpt-4o-mini';

/**
 * OpenAI Provider Implementation
 */
export class OpenAIProvider implements LLMProvider {
  readonly providerId = 'openai';
  private client: OpenAI;
  private config: OpenAIProviderConfig;
  private defaultModel: string;

  constructor(config: OpenAIProviderConfig) {
    if (!config.apiKey) {
      throw new ProviderError(
        'OpenAI API key is required',
        'openai',
        'MISSING_API_KEY'
      );
    }

    this.config = config;
    this.defaultModel = config.defaultModel || 'gpt-4o-mini';

    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      organization: config.organization,
    });
  }

  async *streamChat(
    messages: Message[],
    config?: StreamConfig
  ): AsyncIterable<string> {
    try {
      const model = config?.model || this.defaultModel;
      const openaiMessages = this.convertMessages(messages);

      const stream = await this.client.chat.completions.create({
        model,
        messages: openaiMessages,
        temperature: config?.temperature ?? 0.7,
        max_tokens: config?.maxTokens,
        stop: config?.stop,
        stream: true,
        ...config?.extra,
      });

      // Yield chunks as they arrive
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }

        // Check for finish reason (error cases)
        const finishReason = chunk.choices[0]?.finish_reason;
        if (finishReason === 'content_filter') {
          throw new ProviderError(
            'Content was filtered by OpenAI safety filters',
            'openai',
            'CONTENT_FILTERED',
            400
          );
        }
        if (finishReason === 'length') {
          // Not an error, but we should note it
          console.warn('[OpenAI Provider] Stream ended due to max_tokens limit');
        }
      }
    } catch (error: any) {
      // Handle rate limiting specifically
      if (error.status === 429) {
        const retryAfterHeader = error.headers?.['retry-after'];
        const retryAfter = retryAfterHeader
          ? parseInt(retryAfterHeader, 10)
          : 60;
        throw new ProviderError(
          `Rate limit exceeded. Please retry after ${retryAfter} seconds.`,
          'openai',
          'RATE_LIMIT_EXCEEDED',
          429,
          retryAfter
        );
      }

      // Re-throw ProviderError as-is
      if (error instanceof ProviderError) {
        throw error;
      }

      // Wrap other errors
      throw new ProviderError(
        error.message || 'OpenAI API error',
        'openai',
        error.code || 'API_ERROR',
        error.status
      );
    }
  }

  async extractStructuredData(
    conversation: Message[],
    schema: ExtractionSchema[]
  ): Promise<ExtractedData> {
    try {
      const model = this.defaultModel;
      const openaiMessages = this.convertMessages(conversation);

      // Build extraction prompt
      const extractionPrompt = this.buildExtractionPrompt(schema);
      openaiMessages.push({
        role: 'user',
        content: extractionPrompt,
      });

      const completion = await this.client.chat.completions.create({
        model,
        messages: openaiMessages,
        temperature: 0.3, // Lower temperature for more consistent extraction
        response_format: { type: 'json_object' },
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        throw new ProviderError(
          'No response from OpenAI',
          'openai',
          'NO_RESPONSE'
        );
      }

      // Parse extracted data
      const extracted = JSON.parse(responseText);
      return this.processExtraction(extracted, schema);
    } catch (error: any) {
      if (error instanceof ProviderError) {
        throw error;
      }
      throw new ProviderError(
        error.message || 'Extraction failed',
        'openai',
        error.code || 'EXTRACTION_ERROR'
      );
    }
  }

  async estimateCost(
    messages: Message[],
    config?: StreamConfig
  ): Promise<CostEstimate> {
    const model = config?.model || this.defaultModel;
    const pricing = MODEL_PRICING[model] || MODEL_PRICING[DEFAULT_MODEL];

    // Rough token estimation (4 chars ≈ 1 token)
    const totalChars = messages.reduce(
      (sum, msg) => sum + msg.content.length,
      0
    );
    const estimatedPromptTokens = Math.ceil(totalChars / 4);
    const estimatedCompletionTokens = config?.maxTokens || 1000; // Default estimate

    const promptCost = (estimatedPromptTokens / 1000) * pricing.prompt;
    const completionCost = (estimatedCompletionTokens / 1000) * pricing.completion;
    const totalCost = promptCost + completionCost;

    return {
      estimatedCost: totalCost,
      promptCostPer1K: pricing.prompt,
      completionCostPer1K: pricing.completion,
      provider: 'openai',
      model,
    };
  }

  async getAvailableModels(): Promise<string[]> {
    // Return common OpenAI models
    return [
      'gpt-4o-mini',
      'gpt-4o',
      'gpt-4-turbo',
      'gpt-3.5-turbo',
    ];
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Simple check - try to list models (lightweight operation)
      await this.client.models.list();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Convert our Message format to OpenAI format
   */
  private convertMessages(messages: Message[]): OpenAI.ChatCompletionMessageParam[] {
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
}

/**
 * Create an OpenAI provider instance
 */
export function createOpenAIProvider(
  config: OpenAIProviderConfig
): OpenAIProvider {
  return new OpenAIProvider(config);
}
