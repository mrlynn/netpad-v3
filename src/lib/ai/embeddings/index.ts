/**
 * Embedding Provider Module
 *
 * Centralized access point for embedding generation across different providers.
 * Supports OpenAI, Voyage AI, and MongoDB Atlas AI Services.
 *
 * @example
 * ```typescript
 * import {
 *   createDefaultEmbeddingProvider,
 *   getEmbeddingProviderConfig,
 *   getCurrentEmbeddingProviderInfo,
 * } from '@/lib/ai/embeddings';
 *
 * // Get the default provider based on environment
 * const provider = createDefaultEmbeddingProvider();
 * if (provider) {
 *   const embeddings = await provider.generateEmbeddings(['text1', 'text2']);
 * }
 * ```
 */

// Export base types and utilities
export {
  // Types
  type EmbeddingProvider,
  type EmbeddingProviderConfig,
  type EmbeddingProviderType,
  type EmbeddingResult,
  type EmbeddingModelInfo,

  // Error class
  EmbeddingError,

  // Constants
  MODEL_DIMENSIONS,
  BATCH_SIZES,
  DEFAULT_MODELS,

  // Utility functions
  getModelDimensions,
  estimateTokens,
  estimateTotalTokens,
} from './base';

// Export factory functions
export {
  createEmbeddingProvider,
  createDefaultEmbeddingProvider,
  getEmbeddingProviderConfig,
  getProviderDimensions,
  getCurrentEmbeddingProviderInfo,
} from './factory';

// Export provider classes for direct usage
export {
  OpenAIEmbeddingProvider,
  createOpenAIEmbeddingProvider,
  type OpenAIEmbeddingProviderConfig,
} from './openai';

export {
  VoyageEmbeddingProvider,
  createVoyageEmbeddingProvider,
  type VoyageEmbeddingProviderConfig,
} from './voyage';

export {
  AtlasAIEmbeddingProvider,
  createAtlasAIEmbeddingProvider,
  checkAtlasAIAvailability,
  type AtlasAIEmbeddingProviderConfig,
} from './atlas-ai';
