/**
 * LLM Provider Factory
 * 
 * Creates and manages LLM provider instances
 */

import {
  LLMProvider,
  ProviderConfig,
  ProviderError,
} from './base';
import { OpenAIProvider, createOpenAIProvider, OpenAIProviderConfig } from './openai';
import { SelfHostedProvider, createSelfHostedProvider, SelfHostedProviderConfig } from './self-hosted';

/**
 * Create an LLM provider based on configuration
 */
export function createProvider(config: ProviderConfig): LLMProvider {
  switch (config.type) {
    case 'openai':
      if (!config.apiKey) {
        throw new ProviderError(
          'OpenAI API key is required',
          'openai',
          'MISSING_API_KEY'
        );
      }
      return createOpenAIProvider({
        apiKey: config.apiKey,
        defaultModel: config.defaultModel,
        baseURL: config.baseURL,
        organization: config.options?.organization,
      });

    case 'ollama':
      if (!config.baseURL) {
        throw new ProviderError(
          'Base URL is required for Ollama',
          'ollama',
          'MISSING_BASE_URL'
        );
      }
      return createSelfHostedProvider({
        baseURL: config.baseURL,
        apiKey: config.apiKey,
        defaultModel: config.defaultModel || 'llama2',
        providerType: 'ollama',
      });

    case 'openrouter':
      if (!config.baseURL && !config.apiKey) {
        throw new ProviderError(
          'Base URL or API key is required for OpenRouter',
          'openrouter',
          'MISSING_CONFIG'
        );
      }
      return createSelfHostedProvider({
        baseURL: config.baseURL || 'https://openrouter.ai/api/v1',
        apiKey: config.apiKey,
        defaultModel: config.defaultModel,
        providerType: 'openrouter',
      });

    default:
      throw new ProviderError(
        `Unknown provider type: ${config.type}`,
        config.type,
        'UNKNOWN_PROVIDER'
      );
  }
}

/**
 * Create default provider from environment variables
 */
export function createDefaultProvider(): LLMProvider | null {
  // Check for OpenAI first (primary)
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    return createProvider({
      type: 'openai',
      apiKey: openaiKey,
      defaultModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    });
  }

  // Check for self-hosted (Ollama)
  const ollamaURL = process.env.OLLAMA_BASE_URL;
  if (ollamaURL) {
    return createProvider({
      type: 'ollama',
      baseURL: ollamaURL,
      defaultModel: process.env.OLLAMA_MODEL || 'llama2',
    });
  }

  // Check for OpenRouter
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  if (openrouterKey) {
    return createProvider({
      type: 'openrouter',
      apiKey: openrouterKey,
      baseURL: process.env.OPENROUTER_BASE_URL,
      defaultModel: process.env.OPENROUTER_MODEL,
    });
  }

  return null;
}

/**
 * Get provider configuration from environment
 */
export function getProviderConfigFromEnv(): ProviderConfig | null {
  // OpenAI (primary)
  if (process.env.OPENAI_API_KEY) {
    return {
      type: 'openai',
      apiKey: process.env.OPENAI_API_KEY,
      defaultModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    };
  }

  // Ollama (self-hosted)
  if (process.env.OLLAMA_BASE_URL) {
    return {
      type: 'ollama',
      baseURL: process.env.OLLAMA_BASE_URL,
      defaultModel: process.env.OLLAMA_MODEL || 'llama2',
    };
  }

  // OpenRouter
  if (process.env.OPENROUTER_API_KEY) {
    return {
      type: 'openrouter',
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: process.env.OPENROUTER_BASE_URL,
      defaultModel: process.env.OPENROUTER_MODEL,
    };
  }

  return null;
}
