/**
 * RAG Storage Provider Factory
 *
 * Creates and caches storage providers based on organization configuration
 */

import { RAGStorageProvider } from './provider';
import { PlatformStorageProvider } from './platform-provider';
import { UserClusterStorageProvider } from './user-cluster-provider';
import { RAGStorageConfig } from '@/types/rag-storage';
import { getPlatformDb } from '@/lib/platform/db';

// Provider cache to avoid reconnections
// Key: organizationId
const providerCache = new Map<string, RAGStorageProvider>();

/**
 * Get organization's RAG configuration
 */
async function getOrganizationRAGConfig(organizationId: string): Promise<RAGStorageConfig | null> {
  const db = await getPlatformDb();
  const org = await db.collection('organizations').findOne({ orgId: organizationId });

  if (!org) {
    throw new Error(`Organization not found: ${organizationId}`);
  }

  return (org as any).ragConfig || null;
}

/**
 * Get or create RAG storage provider for an organization
 *
 * @param organizationId - Organization ID
 * @returns Initialized storage provider
 */
export async function getRAGStorageProvider(
  organizationId: string
): Promise<RAGStorageProvider> {
  // Check cache first
  const cached = providerCache.get(organizationId);
  if (cached) {
    return cached;
  }

  // Get organization's RAG configuration
  const config = await getOrganizationRAGConfig(organizationId);

  // If no config, create default platform provider
  // (Config will be created on first use)
  let provider: RAGStorageProvider;

  if (!config || config.mode === 'platform') {
    // Use platform storage
    provider = new PlatformStorageProvider(organizationId);
  } else if (config.mode === 'user-cluster') {
    // Use user's own MongoDB Atlas cluster
    if (!config.userCluster?.connectionId) {
      throw new Error(
        'User-cluster mode requires a connection ID. Please configure your MongoDB Atlas cluster.'
      );
    }

    provider = new UserClusterStorageProvider(
      organizationId,
      config.userCluster.connectionId
    );
  } else {
    throw new Error(`Unknown storage mode: ${(config as any).mode}`);
  }

  // Initialize provider
  await provider.initialize();

  // Cache for reuse
  providerCache.set(organizationId, provider);

  return provider;
}

/**
 * Clear provider cache for an organization
 * Useful when configuration changes or during testing
 *
 * @param organizationId - Organization ID to clear, or undefined to clear all
 */
export function clearProviderCache(organizationId?: string): void {
  if (organizationId) {
    const provider = providerCache.get(organizationId);
    if (provider) {
      // Disconnect provider before removing from cache
      provider.disconnect().catch(err => {
        console.error('[Storage Factory] Error disconnecting provider:', err);
      });
      providerCache.delete(organizationId);
    }
  } else {
    // Clear all cached providers
    for (const [orgId, provider] of providerCache.entries()) {
      provider.disconnect().catch(err => {
        console.error(`[Storage Factory] Error disconnecting provider for ${orgId}:`, err);
      });
    }
    providerCache.clear();
  }
}

/**
 * Check if provider is cached for an organization
 *
 * @param organizationId - Organization ID
 * @returns True if provider is cached
 */
export function isProviderCached(organizationId: string): boolean {
  return providerCache.has(organizationId);
}

/**
 * Get provider cache statistics
 */
export function getProviderCacheStats(): {
  size: number;
  organizations: string[];
} {
  return {
    size: providerCache.size,
    organizations: Array.from(providerCache.keys()),
  };
}
