/**
 * RAG Configuration Management
 *
 * Manages RAG storage configuration for organizations
 * Handles tier-based defaults and configuration persistence
 */

import { getPlatformDb } from '@/lib/platform/db';
import { RAGStorageConfig, RAG_STORAGE_DEFAULTS } from '@/types/rag-storage';
import { SubscriptionTier } from '@/types/platform';

/**
 * Get organization's subscription tier
 */
async function getOrganizationTier(organizationId: string): Promise<SubscriptionTier> {
  const db = await getPlatformDb();
  const orgsCollection = db.collection('organizations');

  const org = await orgsCollection.findOne(
    { orgId: organizationId },
    { projection: { plan: 1 } }
  );

  if (!org) {
    throw new Error(`Organization not found: ${organizationId}`);
  }

  // Default to free if no plan is set
  return (org.plan as SubscriptionTier) || 'free';
}

/**
 * Mask connection string for display (hide password)
 */
function maskConnectionString(connectionString: string): string {
  try {
    // Extract username and host from connection string
    // Format: mongodb+srv://username:password@cluster.mongodb.net/database
    const match = connectionString.match(/mongodb\+srv:\/\/([^:]+):([^@]+)@([^\/]+)/);

    if (match) {
      const [, username, , host] = match;
      return `mongodb+srv://${username}:****@${host}`;
    }

    return 'mongodb+srv://****:****@****.mongodb.net';
  } catch {
    return 'mongodb+srv://****:****@****.mongodb.net';
  }
}

/**
 * Get RAG storage configuration for an organization
 * Returns tier-based defaults if no custom config exists
 */
export async function getOrganizationRAGConfig(
  organizationId: string,
  includeSensitive: boolean = false
): Promise<RAGStorageConfig> {
  const db = await getPlatformDb();
  const orgsCollection = db.collection('organizations');

  const org = await orgsCollection.findOne(
    { orgId: organizationId },
    { projection: { ragConfig: 1, plan: 1 } }
  );

  if (!org) {
    throw new Error(`Organization not found: ${organizationId}`);
  }

  // If custom config exists, return it
  if (org.ragConfig) {
    const config = org.ragConfig as RAGStorageConfig;
    // Note: connectionId is a vault reference, not a sensitive connection string,
    // so no masking is needed
    return config;
  }

  // Otherwise, return tier-based defaults
  const tier = (org.plan as SubscriptionTier) || 'free';
  const defaults = RAG_STORAGE_DEFAULTS[tier];

  const now = new Date();
  return {
    mode: defaults.mode!,
    platform: defaults.platform,
    userCluster: defaults.userCluster,
    limits: defaults.limits!,
    status: {
      isConfigured: true,
      isHealthy: true,
      vectorIndexStatus: 'pending' as const,
      lastHealthCheck: now,
      usage: {
        documentCount: 0,
        storageBytes: 0,
        queryCountToday: 0,
        queryCountMonth: 0,
      },
    },
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Update RAG storage configuration for an organization
 */
export async function updateOrganizationRAGConfig(
  organizationId: string,
  config: Partial<RAGStorageConfig>
): Promise<void> {
  const db = await getPlatformDb();
  const orgsCollection = db.collection('organizations');

  // Get current config to merge with updates
  const currentConfig = await getOrganizationRAGConfig(organizationId);
  const updatedConfig: RAGStorageConfig = {
    ...currentConfig,
    ...config,
    // Merge nested objects properly
    platform: config.platform ? { ...currentConfig.platform, ...config.platform } : currentConfig.platform,
    userCluster: config.userCluster ? { ...currentConfig.userCluster, ...config.userCluster } : currentConfig.userCluster,
    limits: config.limits ? { ...currentConfig.limits, ...config.limits } : currentConfig.limits,
  };

  await orgsCollection.updateOne(
    { orgId: organizationId },
    { $set: { ragConfig: updatedConfig } }
  );
}

/**
 * Reset RAG configuration to tier-based defaults
 */
export async function resetOrganizationRAGConfig(
  organizationId: string
): Promise<void> {
  const db = await getPlatformDb();
  const orgsCollection = db.collection('organizations');

  await orgsCollection.updateOne(
    { orgId: organizationId },
    { $unset: { ragConfig: '' } }
  );
}

/**
 * Check if organization can use RAG features
 * Based on tier and configuration
 */
export async function canUseRAG(organizationId: string): Promise<{
  allowed: boolean;
  reason?: string;
  config?: RAGStorageConfig;
}> {
  try {
    const config = await getOrganizationRAGConfig(organizationId);
    const tier = await getOrganizationTier(organizationId);

    // All tiers can use RAG with appropriate storage mode
    // Free/Pro use platform storage, Team/Enterprise can use user-cluster

    if (config.mode === 'user-cluster' && !config.userCluster?.connectionId) {
      return {
        allowed: false,
        reason: 'User-cluster storage mode requires a connection ID (vault reference)',
      };
    }

    return {
      allowed: true,
      config,
    };
  } catch (error) {
    return {
      allowed: false,
      reason: error instanceof Error ? error.message : 'Configuration error',
    };
  }
}

/**
 * Get storage mode for an organization
 * Convenience function for quick checks
 */
export async function getStorageMode(organizationId: string): Promise<'platform' | 'user-cluster'> {
  const config = await getOrganizationRAGConfig(organizationId);
  return config.mode;
}

/**
 * Get usage limits for an organization
 */
export async function getUsageLimits(organizationId: string) {
  const config = await getOrganizationRAGConfig(organizationId);
  return config.limits;
}

/**
 * Check if organization is on platform storage
 */
export async function isUsingPlatformStorage(organizationId: string): Promise<boolean> {
  const mode = await getStorageMode(organizationId);
  return mode === 'platform';
}

/**
 * Check if organization is on user-cluster storage
 */
export async function isUsingUserClusterStorage(organizationId: string): Promise<boolean> {
  const mode = await getStorageMode(organizationId);
  return mode === 'user-cluster';
}
