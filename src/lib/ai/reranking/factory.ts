/**
 * Reranking Provider Factory
 *
 * Creates and manages reranking provider instances based on
 * environment configuration.
 *
 * Priority:
 * 1. MongoDB Atlas Reranking API (recommended)
 * 2. Direct Voyage API (fallback for self-hosted)
 */

import { RerankProvider } from './base';
import { AtlasRerankProvider, createAtlasRerankProvider } from './atlas';
import { VoyageRerankProvider, createVoyageRerankProvider } from './voyage';

/**
 * Create default reranking provider from environment variables
 *
 * @returns Reranking provider or null if none configured
 */
export function createDefaultRerankProvider(): RerankProvider | null {
  const atlasApiKey = process.env.ATLAS_MODEL_API_KEY || process.env.VOYAGE_API_KEY;
  const rerankEnabled = process.env.VOYAGE_RERANK_ENABLED !== 'false';
  const useAtlasAPI = process.env.ATLAS_RERANK_API !== 'false';

  if (!rerankEnabled) {
    console.log('[Rerank Factory] Reranking disabled via VOYAGE_RERANK_ENABLED=false');
    return null;
  }

  if (!atlasApiKey) {
    console.log('[Rerank Factory] No rerank provider available (ATLAS_MODEL_API_KEY or VOYAGE_API_KEY not set)');
    return null;
  }

  const model = process.env.VOYAGE_RERANK_MODEL || 'rerank-2.5-lite';

  // Priority 1: Atlas Reranking API (recommended)
  if (useAtlasAPI) {
    console.log(`[Rerank Factory] Using Atlas Reranking API (model: ${model})`);
    return createAtlasRerankProvider({
      apiKey: atlasApiKey,
      model,
    });
  }

  // Priority 2: Direct Voyage API (fallback for self-hosted without Atlas)
  console.log(`[Rerank Factory] Using direct Voyage Reranking API (model: ${model})`);
  return createVoyageRerankProvider({
    apiKey: atlasApiKey,
    model,
  });
}

/**
 * Get reranking provider configuration from environment
 *
 * @returns Provider configuration info or { enabled: false } if none available
 */
export function getRerankProviderConfig(): {
  enabled: boolean;
  provider?: string;
  model?: string;
} {
  const atlasApiKey = process.env.ATLAS_MODEL_API_KEY || process.env.VOYAGE_API_KEY;
  const rerankEnabled = process.env.VOYAGE_RERANK_ENABLED !== 'false';
  const useAtlasAPI = process.env.ATLAS_RERANK_API !== 'false';
  const enabled = rerankEnabled && !!atlasApiKey;

  if (!enabled) {
    return { enabled: false };
  }

  return {
    enabled: true,
    provider: useAtlasAPI ? 'atlas-rerank' : 'voyage',
    model: process.env.VOYAGE_RERANK_MODEL || 'rerank-2.5-lite',
  };
}

// Re-export provider classes for direct usage if needed
export { AtlasRerankProvider, VoyageRerankProvider };
