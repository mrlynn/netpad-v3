/**
 * Self-Hosted LLM Provider Implementation
 * 
 * Supports Ollama and OpenRouter-compatible APIs
 * This is a skeleton implementation for future expansion
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
 * Self-Hosted Provider Implementation (Skeleton)
 * 
 * This is a placeholder for future implementation.
 * Currently throws errors indicating it's not yet implemented.
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
    // TODO: Implement streaming for self-hosted models
    throw new ProviderError(
      'Self-hosted provider streaming not yet implemented',
      this.providerId,
      'NOT_IMPLEMENTED'
    );
  }

  async extractStructuredData(
    conversation: Message[],
    schema: ExtractionSchema[]
  ): Promise<ExtractedData> {
    // TODO: Implement extraction for self-hosted models
    throw new ProviderError(
      'Self-hosted provider extraction not yet implemented',
      this.providerId,
      'NOT_IMPLEMENTED'
    );
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
    // TODO: Fetch available models from self-hosted API
    // For now, return common model names
    if (this.config.providerType === 'ollama') {
      return ['llama2', 'mistral', 'codellama'];
    }
    return [];
  }

  async isAvailable(): Promise<boolean> {
    // TODO: Check if self-hosted API is reachable
    try {
      const response = await fetch(`${this.config.baseURL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // 5 second timeout
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
