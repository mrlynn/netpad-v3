/**
 * Centralized AI Service
 *
 * A unified service layer for all LLM calls that:
 * - Captures actual token usage from provider responses
 * - Records detailed per-request metrics
 * - Handles both streaming and non-streaming responses
 * - Integrates with billing and usage tracking
 */

import OpenAI from 'openai';
import {
  AIServiceContext,
  AIServiceResult,
  AIStreamingResult,
  TokenUsage,
  AIProvider,
} from '@/types/ai-analytics';
import { Message, StreamConfig } from './providers/base';
import { createDefaultProvider, getProviderConfigFromEnv } from './providers/factory';
import { logAIRequest } from './aiAnalytics';
import { calculateCost, estimateTokens } from './pricing';
import { incrementAIUsage } from '../platform/usageService';

/**
 * Extended stream config with JSON response format option
 */
export interface AIServiceStreamConfig extends StreamConfig {
  responseFormat?: { type: 'json_object' | 'text' };
}

/**
 * Centralized AI Service class
 *
 * Use the exported singleton `aiService` for all AI operations.
 */
class AIService {
  private openaiClient: OpenAI | null = null;

  /**
   * Get or create OpenAI client
   */
  private getOpenAIClient(): OpenAI | null {
    if (!this.openaiClient && process.env.OPENAI_API_KEY) {
      this.openaiClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
    return this.openaiClient;
  }

  /**
   * Get the default model based on environment configuration
   */
  private getDefaultModel(): string {
    const config = getProviderConfigFromEnv();
    if (config?.defaultModel) {
      return config.defaultModel;
    }
    return process.env.OPENAI_MODEL || 'gpt-4o-mini';
  }

  /**
   * Get the current provider type
   */
  private getProviderType(): AIProvider {
    const config = getProviderConfigFromEnv();
    return (config?.type as AIProvider) || 'openai';
  }

  /**
   * Stream chat completion with automatic token tracking
   *
   * For OpenAI, uses stream_options to get usage at end of stream.
   * For other providers, estimates tokens from text.
   *
   * @example
   * ```typescript
   * const { stream, getUsage } = await aiService.streamChat(context, messages);
   * for await (const chunk of stream) {
   *   // Process chunk
   * }
   * const usage = await getUsage(); // Get token usage after stream completes
   * ```
   */
  async streamChat(
    context: AIServiceContext,
    messages: Message[],
    config?: StreamConfig
  ): Promise<AIStreamingResult> {
    const startTime = Date.now();
    const model = config?.model || this.getDefaultModel();
    const providerType = this.getProviderType();

    let usage: TokenUsage | null = null;
    let responseContent = '';
    let streamError: Error | null = null;

    // For OpenAI, use stream_options to get usage at end of stream
    if (providerType === 'openai') {
      const client = this.getOpenAIClient();
      if (!client) {
        throw new Error('OpenAI client not configured');
      }

      const openaiMessages = messages.map((m) => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content,
      }));

      const streamPromise = client.chat.completions.create({
        model,
        messages: openaiMessages,
        temperature: config?.temperature ?? 0.7,
        max_tokens: config?.maxTokens,
        stop: config?.stop,
        stream: true,
        stream_options: { include_usage: true },
        ...config?.extra,
      });

      const self = this;

      const wrappedStream = async function* () {
        try {
          const stream = await streamPromise;
          for await (const chunk of stream) {
            // Check for usage in chunks (usually in the last one)
            if (chunk.usage) {
              usage = {
                prompt: chunk.usage.prompt_tokens,
                completion: chunk.usage.completion_tokens,
                total: chunk.usage.total_tokens,
              };
            }

            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              responseContent += content;
              yield content;
            }
          }
        } catch (error) {
          streamError = error as Error;
          throw error;
        }
      };

      const getUsage = async (): Promise<TokenUsage | null> => {
        const latencyMs = Date.now() - startTime;

        // If streaming didn't provide usage, estimate it
        if (!usage) {
          const promptChars = messages.reduce((sum, m) => sum + m.content.length, 0);
          usage = {
            prompt: estimateTokens(messages.map((m) => m.content).join(' ')),
            completion: estimateTokens(responseContent),
            total: 0,
          };
          usage.total = usage.prompt + usage.completion;
        }

        // Log the request
        await self.logAndRecordUsage(
          context,
          model,
          providerType,
          usage,
          latencyMs,
          !streamError,
          streamError?.message
        );

        return usage;
      };

      return { stream: wrappedStream(), getUsage };
    }

    // For non-OpenAI providers (Ollama, OpenRouter), use the generic provider
    const provider = createDefaultProvider();
    if (!provider) {
      throw new Error('No AI provider configured');
    }

    const self = this;

    const wrappedStream = async function* () {
      try {
        const providerStream = provider.streamChat(messages, config);
        for await (const chunk of providerStream) {
          responseContent += chunk;
          yield chunk;
        }
      } catch (error) {
        streamError = error as Error;
        throw error;
      }
    };

    const getUsage = async (): Promise<TokenUsage | null> => {
      const latencyMs = Date.now() - startTime;

      // Estimate tokens for non-OpenAI providers
      usage = {
        prompt: estimateTokens(messages.map((m) => m.content).join(' ')),
        completion: estimateTokens(responseContent),
        total: 0,
      };
      usage.total = usage.prompt + usage.completion;

      await self.logAndRecordUsage(
        context,
        model,
        providerType,
        usage,
        latencyMs,
        !streamError,
        streamError?.message
      );

      return usage;
    };

    return { stream: wrappedStream(), getUsage };
  }

  /**
   * Non-streaming completion with automatic token tracking
   *
   * For structured JSON responses, use responseFormat: { type: 'json_object' }
   *
   * @example
   * ```typescript
   * const result = await aiService.complete(context, messages, {
   *   responseFormat: { type: 'json_object' }
   * });
   * if (result.success) {
   *   const parsed = JSON.parse(result.data!);
   * }
   * ```
   */
  async complete(
    context: AIServiceContext,
    messages: Message[],
    config?: AIServiceStreamConfig
  ): Promise<AIServiceResult<string>> {
    const startTime = Date.now();
    const model = config?.model || this.getDefaultModel();
    const providerType = this.getProviderType();

    try {
      // For OpenAI, use the client directly for better usage tracking
      if (providerType === 'openai') {
        const client = this.getOpenAIClient();
        if (!client) {
          throw new Error('OpenAI client not configured');
        }

        const openaiMessages = messages.map((m) => ({
          role: m.role as 'system' | 'user' | 'assistant',
          content: m.content,
        }));

        const completion = await client.chat.completions.create({
          model,
          messages: openaiMessages,
          temperature: config?.temperature ?? 0.7,
          max_tokens: config?.maxTokens,
          stop: config?.stop,
          response_format: config?.responseFormat,
          ...config?.extra,
        });

        const latencyMs = Date.now() - startTime;
        const responseText = completion.choices[0]?.message?.content || '';

        const usage: TokenUsage = {
          prompt: completion.usage?.prompt_tokens || 0,
          completion: completion.usage?.completion_tokens || 0,
          total: completion.usage?.total_tokens || 0,
        };

        await this.logAndRecordUsage(context, model, providerType, usage, latencyMs, true);

        const estimatedCostUsd = calculateCost(model, usage.prompt, usage.completion);

        return {
          success: true,
          data: responseText,
          usage: {
            promptTokens: usage.prompt,
            completionTokens: usage.completion,
            totalTokens: usage.total,
            estimatedCostUsd,
          },
          latencyMs,
        };
      }

      // For other providers, collect full response then estimate
      const provider = createDefaultProvider();
      if (!provider) {
        throw new Error('No AI provider configured');
      }

      let responseText = '';
      const stream = provider.streamChat(messages, config);
      for await (const chunk of stream) {
        responseText += chunk;
      }

      const latencyMs = Date.now() - startTime;

      const usage: TokenUsage = {
        prompt: estimateTokens(messages.map((m) => m.content).join(' ')),
        completion: estimateTokens(responseText),
        total: 0,
      };
      usage.total = usage.prompt + usage.completion;

      await this.logAndRecordUsage(context, model, providerType, usage, latencyMs, true);

      const estimatedCostUsd = calculateCost(model, usage.prompt, usage.completion);

      return {
        success: true,
        data: responseText,
        usage: {
          promptTokens: usage.prompt,
          completionTokens: usage.completion,
          totalTokens: usage.total,
          estimatedCostUsd,
        },
        latencyMs,
      };
    } catch (error: unknown) {
      const latencyMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorCode = (error as { code?: string }).code;

      // Estimate tokens for error logging
      const usage: TokenUsage = {
        prompt: estimateTokens(messages.map((m) => m.content).join(' ')),
        completion: 0,
        total: 0,
      };
      usage.total = usage.prompt;

      await this.logAndRecordUsage(
        context,
        model,
        providerType,
        usage,
        latencyMs,
        false,
        errorMessage,
        errorCode
      );

      return {
        success: false,
        error: errorMessage,
        errorCode,
        latencyMs,
      };
    }
  }

  /**
   * Generate a chat response without context tracking
   *
   * Use this for simple one-off completions where detailed
   * analytics tracking is not needed.
   */
  async simpleComplete(
    messages: Message[],
    config?: AIServiceStreamConfig
  ): Promise<string> {
    const provider = createDefaultProvider();
    if (!provider) {
      throw new Error('No AI provider configured');
    }

    let responseText = '';
    const stream = provider.streamChat(messages, config);
    for await (const chunk of stream) {
      responseText += chunk;
    }

    return responseText;
  }

  /**
   * Check if AI service is available
   */
  async isAvailable(): Promise<boolean> {
    const provider = createDefaultProvider();
    if (!provider) {
      return false;
    }
    return provider.isAvailable();
  }

  /**
   * Get current provider information
   */
  getProviderInfo(): { provider: AIProvider; model: string } | null {
    const config = getProviderConfigFromEnv();
    if (!config) {
      return null;
    }
    return {
      provider: config.type as AIProvider,
      model: config.defaultModel || this.getDefaultModel(),
    };
  }

  /**
   * Internal: Log request and record usage
   */
  private async logAndRecordUsage(
    context: AIServiceContext,
    model: string,
    provider: AIProvider,
    usage: TokenUsage,
    latencyMs: number,
    success: boolean,
    errorMessage?: string,
    errorCode?: string
  ): Promise<void> {
    // Log detailed request (async, don't block)
    logAIRequest({
      organizationId: context.orgId,
      userId: context.userId,
      isGuest: context.isGuest,
      feature: context.feature,
      endpoint: context.endpoint,
      model,
      provider,
      tokens: usage,
      latencyMs,
      success,
      errorCode,
      errorMessage,
    }).catch((err) => console.error('[AI Service] Failed to log request:', err));

    // Update billing usage with actual tokens (only for non-guests on success)
    if (success && !context.isGuest && context.orgId !== 'guest') {
      try {
        await incrementAIUsage(context.orgId, 'generations', 1, usage.total);
      } catch (err) {
        console.error('[AI Service] Failed to record billing usage:', err);
      }
    }
  }
}

/**
 * Singleton AI service instance
 *
 * Use this for all AI operations to ensure consistent tracking.
 *
 * @example
 * ```typescript
 * import { aiService } from '@/lib/ai/aiService';
 *
 * const context: AIServiceContext = {
 *   userId: session.userId,
 *   orgId: orgId,
 *   isGuest: false,
 *   feature: 'ai_form_generator',
 *   endpoint: '/api/ai/generate-form',
 * };
 *
 * const result = await aiService.complete(context, messages);
 * ```
 */
export const aiService = new AIService();

/**
 * Helper to create context for AI service calls
 */
export function createAIContext(
  userId: string,
  orgId: string,
  feature: string,
  endpoint: string,
  isGuest: boolean = false
): AIServiceContext {
  return {
    userId,
    orgId,
    isGuest,
    feature: feature as AIServiceContext['feature'],
    endpoint,
  };
}
