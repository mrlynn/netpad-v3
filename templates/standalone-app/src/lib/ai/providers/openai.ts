/**
 * OpenAI Provider Implementation (Standalone Version)
 *
 * Implements LLMProvider interface for OpenAI API.
 */

import OpenAI from 'openai';
import {
  LLMProvider,
  Message,
  StreamConfig,
  ExtractionSchema,
  ExtractedData,
  ProviderError,
} from './base';

/**
 * OpenAI provider configuration
 */
export interface OpenAIProviderConfig {
  apiKey: string;
  defaultModel?: string;
  baseURL?: string;
}

/**
 * OpenAI Provider Implementation
 */
export class OpenAIProvider implements LLMProvider {
  readonly providerId = 'openai';
  private client: OpenAI;
  private defaultModel: string;

  constructor(config: OpenAIProviderConfig) {
    if (!config.apiKey) {
      throw new ProviderError('OpenAI API key is required', 'openai', 'MISSING_API_KEY');
    }

    this.defaultModel = config.defaultModel || 'gpt-4o-mini';
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    });
  }

  async *streamChat(messages: Message[], config?: StreamConfig): AsyncIterable<string> {
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
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }

        const finishReason = chunk.choices[0]?.finish_reason;
        if (finishReason === 'content_filter') {
          throw new ProviderError(
            'Content was filtered by OpenAI safety filters',
            'openai',
            'CONTENT_FILTERED',
            400
          );
        }
      }
    } catch (error: any) {
      if (error.status === 429) {
        const retryAfter = error.headers?.['retry-after']
          ? parseInt(error.headers['retry-after'], 10)
          : 60;
        throw new ProviderError(
          `Rate limit exceeded. Please retry after ${retryAfter} seconds.`,
          'openai',
          'RATE_LIMIT_EXCEEDED',
          429,
          retryAfter
        );
      }

      if (error instanceof ProviderError) {
        throw error;
      }

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
      const openaiMessages = this.convertMessages(conversation);
      const extractionPrompt = this.buildExtractionPrompt(schema);

      openaiMessages.push({
        role: 'user',
        content: extractionPrompt,
      });

      const completion = await this.client.chat.completions.create({
        model: this.defaultModel,
        messages: openaiMessages,
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        throw new ProviderError('No response from OpenAI', 'openai', 'NO_RESPONSE');
      }

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

  async isAvailable(): Promise<boolean> {
    try {
      await this.client.models.list();
      return true;
    } catch {
      return false;
    }
  }

  private convertMessages(messages: Message[]): OpenAI.ChatCompletionMessageParam[] {
    return messages.map((msg) => ({
      role: msg.role as 'system' | 'user' | 'assistant',
      content: msg.content,
    }));
  }

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

  private processExtraction(extracted: any, schema: ExtractionSchema[]): ExtractedData {
    const data: Record<string, any> = {};
    const confidence: Record<string, number> = {};
    const missingFields: string[] = [];
    const warnings: string[] = [];

    for (const fieldSchema of schema) {
      const value = extracted.data?.[fieldSchema.field];
      const fieldConfidence = extracted.confidence?.[fieldSchema.field] ?? 0;

      if (value === undefined || value === null) {
        if (fieldSchema.required) {
          missingFields.push(fieldSchema.field);
        }
        continue;
      }

      data[fieldSchema.field] = value;
      confidence[fieldSchema.field] = fieldConfidence;
    }

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
}

/**
 * Create an OpenAI provider instance
 */
export function createOpenAIProvider(config: OpenAIProviderConfig): OpenAIProvider {
  return new OpenAIProvider(config);
}
