/**
 * Embedding Provider Factory
 *
 * Creates and manages embedding provider instances based on
 * environment configuration with priority-based fallback.
 *
 * Priority Order (MongoDB-focused):
 * 1. Atlas Embedding API (NEW - MongoDB-native Voyage AI integration)
 * 2. Voyage AI Direct (fallback for self-hosted without Atlas)
 * 3. OpenAI (final fallback)
 *
 * Note: Legacy Atlas AI provider is deprecated in favor of the new Atlas Embedding API
 */

import {
  EmbeddingProvider,
  EmbeddingProviderConfig,
  EmbeddingProviderType,
  EmbeddingError,
  getModelDimensions,
  DEFAULT_MODELS,
} from './base';
import {
  OpenAIEmbeddingProvider,
  createOpenAIEmbeddingProvider,
} from './openai';
import {
  VoyageEmbeddingProvider,
  createVoyageEmbeddingProvider,
} from './voyage';
import {
  AtlasAIEmbeddingProvider,
  createAtlasAIEmbeddingProvider,
} from './atlas-ai';
import {
  AtlasEmbeddingAPIProvider,
  createAtlasEmbeddingAPIProvider,
} from './atlas-embedding-api';

/**
 * Create an embedding provider based on configuration
 */
export function createEmbeddingProvider(
  config: EmbeddingProviderConfig
): EmbeddingProvider {
  switch (config.type) {
    case 'openai':
      if (!config.apiKey) {
        throw new EmbeddingError(
          'OpenAI API key is required',
          'openai',
          'MISSING_API_KEY'
        );
      }
      return createOpenAIEmbeddingProvider({
        apiKey: config.apiKey,
        model: config.model,
        baseURL: config.baseURL,
        organization: config.options?.organization as string | undefined,
      });

    case 'voyage':
      if (!config.apiKey) {
        throw new EmbeddingError(
          'Voyage AI API key is required',
          'voyage',
          'MISSING_API_KEY'
        );
      }
      return createVoyageEmbeddingProvider({
        apiKey: config.apiKey,
        model: config.model,
        baseURL: config.baseURL,
      });

    case 'atlas-ai':
      // Atlas AI requires Voyage API key (it uses Voyage under the hood)
      if (!config.apiKey && !config.options?.atlasDataApiEndpoint) {
        throw new EmbeddingError(
          'Atlas AI requires a Voyage API key or Atlas Data API configuration',
          'atlas-ai',
          'MISSING_CONFIG'
        );
      }
      return createAtlasAIEmbeddingProvider({
        voyageApiKey: config.apiKey,
        model: config.model,
        atlasDataApiEndpoint: config.options?.atlasDataApiEndpoint as string | undefined,
        atlasDataApiKey: config.options?.atlasDataApiKey as string | undefined,
      });

    default:
      throw new EmbeddingError(
        `Unknown embedding provider type: ${config.type}`,
        config.type,
        'UNKNOWN_PROVIDER'
      );
  }
}

/**
 * Create default embedding provider from environment variables
 *
 * Priority order:
 * 1. If EMBEDDING_PROVIDER is set, use that specific provider
 * 2. Atlas Embedding API (if ATLAS_MODEL_API_KEY or VOYAGE_API_KEY is set)
 * 3. Voyage AI Direct (fallback for self-hosted without Atlas)
 * 4. OpenAI (final fallback)
 *
 * @returns Embedding provider or null if none configured
 */
export function createDefaultEmbeddingProvider(): EmbeddingProvider | null {
  // Check for explicit provider override
  const explicitProvider = process.env.EMBEDDING_PROVIDER?.toLowerCase();
  if (explicitProvider && explicitProvider !== 'auto') {
    return createExplicitProvider(explicitProvider as EmbeddingProviderType);
  }

  // Auto-detect based on available credentials
  const atlasApiKey = process.env.ATLAS_MODEL_API_KEY || process.env.VOYAGE_API_KEY;
  const useAtlasAPI = process.env.ATLAS_EMBEDDING_API !== 'false';

  if (atlasApiKey) {
    // Priority 1: Atlas Embedding API (NEW - recommended for MongoDB Atlas users)
    if (useAtlasAPI) {
      console.log('[Embedding Factory] Using Atlas Embedding API');
      return createAtlasEmbeddingAPIProvider({
        apiKey: atlasApiKey,
        model: process.env.VOYAGE_MODEL || 'voyage-4',
        outputDimensions: process.env.VOYAGE_EMBEDDING_DIMENSIONS
          ? parseInt(process.env.VOYAGE_EMBEDDING_DIMENSIONS)
          : undefined,
      });
    }

    // Priority 2: Direct Voyage AI (fallback for self-hosted without Atlas)
    console.log('[Embedding Factory] Using Voyage AI Direct');
    return createVoyageEmbeddingProvider({
      apiKey: atlasApiKey,
      model: process.env.VOYAGE_MODEL || DEFAULT_MODELS.voyage,
    });
  }

  // Priority 3: OpenAI (final fallback)
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    console.log('[Embedding Factory] Using OpenAI (fallback)');
    return createOpenAIEmbeddingProvider({
      apiKey: openaiKey,
      model: process.env.OPENAI_EMBEDDING_MODEL || DEFAULT_MODELS.openai,
    });
  }

  // No provider available
  console.warn('[Embedding Factory] No embedding provider configured');
  return null;
}

/**
 * Create a specific provider based on explicit configuration
 */
function createExplicitProvider(
  providerType: EmbeddingProviderType
): EmbeddingProvider | null {
  switch (providerType) {
    case 'openai': {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        console.warn('[Embedding Factory] OpenAI requested but OPENAI_API_KEY not set');
        return null;
      }
      console.log('[Embedding Factory] Using OpenAI (explicit)');
      return createEmbeddingProvider({
        type: 'openai',
        apiKey,
        model: process.env.OPENAI_EMBEDDING_MODEL || DEFAULT_MODELS.openai,
      });
    }

    case 'voyage': {
      const apiKey = process.env.VOYAGE_API_KEY;
      if (!apiKey) {
        console.warn('[Embedding Factory] Voyage AI requested but VOYAGE_API_KEY not set');
        return null;
      }
      console.log('[Embedding Factory] Using Voyage AI (explicit)');
      return createEmbeddingProvider({
        type: 'voyage',
        apiKey,
        model: process.env.VOYAGE_MODEL || DEFAULT_MODELS.voyage,
      });
    }

    case 'atlas-ai': {
      const voyageKey = process.env.VOYAGE_API_KEY;
      if (!voyageKey) {
        console.warn('[Embedding Factory] Atlas AI requested but VOYAGE_API_KEY not set');
        return null;
      }
      console.log('[Embedding Factory] Using Atlas AI (explicit)');
      return createEmbeddingProvider({
        type: 'atlas-ai',
        apiKey: voyageKey,
        model: process.env.VOYAGE_MODEL || DEFAULT_MODELS['atlas-ai'],
      });
    }

    default:
      console.warn(`[Embedding Factory] Unknown provider type: ${providerType}`);
      return null;
  }
}

/**
 * Get embedding provider configuration from environment
 *
 * @returns Provider configuration or null if none available
 */
export function getEmbeddingProviderConfig(): EmbeddingProviderConfig | null {
  // Check for explicit provider override
  const explicitProvider = process.env.EMBEDDING_PROVIDER?.toLowerCase();
  if (explicitProvider && explicitProvider !== 'auto') {
    return getExplicitProviderConfig(explicitProvider as EmbeddingProviderType);
  }

  // Auto-detect based on available credentials
  const voyageKey = process.env.VOYAGE_API_KEY;
  if (voyageKey) {
    const useAtlasAI = process.env.USE_ATLAS_AI !== 'false';
    return {
      type: useAtlasAI ? 'atlas-ai' : 'voyage',
      apiKey: voyageKey,
      model: process.env.VOYAGE_MODEL || DEFAULT_MODELS[useAtlasAI ? 'atlas-ai' : 'voyage'],
    };
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    return {
      type: 'openai',
      apiKey: openaiKey,
      model: process.env.OPENAI_EMBEDDING_MODEL || DEFAULT_MODELS.openai,
    };
  }

  return null;
}

/**
 * Get configuration for a specific provider
 */
function getExplicitProviderConfig(
  providerType: EmbeddingProviderType
): EmbeddingProviderConfig | null {
  switch (providerType) {
    case 'openai': {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) return null;
      return {
        type: 'openai',
        apiKey,
        model: process.env.OPENAI_EMBEDDING_MODEL || DEFAULT_MODELS.openai,
      };
    }

    case 'voyage': {
      const apiKey = process.env.VOYAGE_API_KEY;
      if (!apiKey) return null;
      return {
        type: 'voyage',
        apiKey,
        model: process.env.VOYAGE_MODEL || DEFAULT_MODELS.voyage,
      };
    }

    case 'atlas-ai': {
      const voyageKey = process.env.VOYAGE_API_KEY;
      if (!voyageKey) return null;
      return {
        type: 'atlas-ai',
        apiKey: voyageKey,
        model: process.env.VOYAGE_MODEL || DEFAULT_MODELS['atlas-ai'],
      };
    }

    default:
      return null;
  }
}

/**
 * Get dimensions for a provider and model
 *
 * @param provider - Provider type
 * @param model - Model name (optional, uses default if not specified)
 * @returns Dimensions for the model
 */
export function getProviderDimensions(
  provider: EmbeddingProviderType,
  model?: string
): number {
  const modelName = model || DEFAULT_MODELS[provider];
  const dimensions = getModelDimensions(modelName);
  if (!dimensions) {
    // Return default dimensions based on provider
    switch (provider) {
      case 'openai':
        return 1536; // text-embedding-3-small default
      case 'voyage':
      case 'atlas-ai':
        return 1024; // voyage-3 default
      default:
        return 1536; // Safe fallback
    }
  }
  return dimensions;
}

/**
 * Get the current embedding provider info
 */
export function getCurrentEmbeddingProviderInfo(): {
  provider: EmbeddingProviderType | null;
  model: string | null;
  dimensions: number | null;
} {
  const config = getEmbeddingProviderConfig();
  if (!config) {
    return { provider: null, model: null, dimensions: null };
  }

  return {
    provider: config.type,
    model: config.model || DEFAULT_MODELS[config.type],
    dimensions: getProviderDimensions(config.type, config.model),
  };
}

// Re-export provider classes for direct usage if needed
export {
  OpenAIEmbeddingProvider,
  VoyageEmbeddingProvider,
  AtlasAIEmbeddingProvider,
  AtlasEmbeddingAPIProvider,
};
