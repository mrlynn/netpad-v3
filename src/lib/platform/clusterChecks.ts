/**
 * Cluster Tier Checks for Feature Gating
 *
 * Utilities to verify cluster tier requirements for features like Vector Search
 * Uses caching to avoid hitting Atlas Admin API on every request
 *
 * Deployment Mode Support:
 * - 'cloud': Requires M10+ clusters for Vector Search (production SLA)
 * - 'self-hosted': Allows LOCAL tier (Atlas Local/Docker) for Vector Search
 */

import { ClusterInstanceSize } from '@/lib/atlas/types';
import { getProvisionedClusterForOrg } from '@/lib/atlas/provisioning';
import { getAtlasClient } from '@/lib/atlas/client';
import type { AtlasCluster } from '@/lib/atlas/types';

// ============================================
// Deployment Mode Configuration
// ============================================

export type DeploymentMode = 'cloud' | 'self-hosted';

/**
 * Get the current deployment mode from environment
 * Defaults to 'self-hosted' if not set (safer for local dev)
 */
export function getDeploymentMode(): DeploymentMode {
  const mode = process.env.NETPAD_DEPLOYMENT_MODE;
  if (mode === 'cloud') return 'cloud';
  return 'self-hosted';
}

/**
 * Check if running in self-hosted mode
 */
export function isSelfHosted(): boolean {
  return getDeploymentMode() === 'self-hosted';
}

/**
 * Check if running in cloud mode (e.g., Vercel)
 */
export function isCloudDeployment(): boolean {
  return getDeploymentMode() === 'cloud';
}

// ============================================
// Cache Configuration
// ============================================

/**
 * Cache TTL for cluster tier checks (5 minutes)
 * Balances freshness with performance and API rate limits
 */
const CLUSTER_TIER_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Cache for cluster tier checks
 * Key: organizationId, Value: { tier: ClusterInstanceSize | null, checkedAt: number }
 */
const clusterTierCache = new Map<string, { tier: ClusterInstanceSize | null; checkedAt: number }>();

// ============================================
// Utility Functions
// ============================================

/**
 * Check if cluster tier supports vector search
 *
 * Behavior depends on deployment mode:
 * - Cloud mode: Requires M10+ (production reliability, managed SLA)
 * - Self-hosted mode: Allows LOCAL tier (Atlas Local/Docker) or M10+
 *
 * @param instanceSize - The cluster instance size to check
 * @returns true if the tier supports vector search in the current deployment mode
 */
export function supportsVectorSearch(instanceSize: ClusterInstanceSize): boolean {
  // In self-hosted mode, LOCAL tier supports vector search via Atlas Local
  if (isSelfHosted() && instanceSize === 'LOCAL') {
    return true;
  }

  // Standard tier check: M10+ required
  const tierOrder: ClusterInstanceSize[] = ['LOCAL', 'M0', 'M2', 'M5', 'M10', 'M20', 'M30', 'M40', 'M50', 'M60'];
  const tierIndex = tierOrder.indexOf(instanceSize);
  const m10Index = tierOrder.indexOf('M10');

  if (tierIndex === -1) return false;

  return tierIndex >= m10Index;
}

/**
 * Get the minimum required cluster tier for vector search in the current deployment mode
 */
export function getMinVectorSearchTier(): ClusterInstanceSize {
  return isSelfHosted() ? 'LOCAL' : 'M10';
}

/**
 * Compare two cluster tiers
 * @returns -1 if tier1 < tier2, 0 if equal, 1 if tier1 > tier2
 *
 * Note: LOCAL tier is treated as equivalent to M10 for comparison purposes
 * in self-hosted mode, since it supports the same Vector Search features.
 */
function compareClusterTiers(
  tier1: ClusterInstanceSize,
  tier2: ClusterInstanceSize
): number {
  const tierOrder: ClusterInstanceSize[] = ['M0', 'M2', 'M5', 'M10', 'M20', 'M30', 'M40', 'M50', 'M60'];

  // In self-hosted mode, treat LOCAL as equivalent to M10 for feature comparison
  const effectiveTier1 = (isSelfHosted() && tier1 === 'LOCAL') ? 'M10' : tier1;
  const effectiveTier2 = (isSelfHosted() && tier2 === 'LOCAL') ? 'M10' : tier2;

  const index1 = tierOrder.indexOf(effectiveTier1);
  const index2 = tierOrder.indexOf(effectiveTier2);

  if (index1 === -1 || index2 === -1) {
    throw new Error(`Invalid cluster tier: ${tier1} or ${tier2}`);
  }

  if (index1 < index2) return -1;
  if (index1 > index2) return 1;
  return 0;
}

/**
 * Get cluster instance size from Atlas cluster object
 */
function getInstanceSizeFromCluster(cluster: AtlasCluster): ClusterInstanceSize | null {
  return cluster.providerSettings?.instanceSizeName || null;
}

/**
 * Get cached cluster tier or fetch fresh if cache expired
 * Uses caching to reduce Atlas API calls
 */
async function getCachedClusterTier(organizationId: string): Promise<ClusterInstanceSize | null> {
  const cached = clusterTierCache.get(organizationId);
  const now = Date.now();

  // Return cached value if still valid
  if (cached && (now - cached.checkedAt) < CLUSTER_TIER_CACHE_TTL) {
    return cached.tier;
  }

  // Fetch fresh tier from Atlas
  try {
    const provisionedCluster = await getProvisionedClusterForOrg(organizationId);
    
    if (!provisionedCluster) {
      clusterTierCache.set(organizationId, { tier: null, checkedAt: now });
      return null;
    }

    const client = getAtlasClient();
    if (!client.isConfigured()) {
      console.warn('[ClusterCheck] Atlas API not configured, cannot fetch cluster tier');
      // Return cached value if available, otherwise null
      return cached?.tier ?? null;
    }

    const clusterResult = await client.getCluster(
      provisionedCluster.atlasProjectId,
      provisionedCluster.atlasClusterName
    );

    if (!clusterResult.success || !clusterResult.data) {
      console.error('[ClusterCheck] Failed to get cluster from Atlas:', clusterResult.error);
      clusterTierCache.set(organizationId, { tier: null, checkedAt: now });
      return null;
    }

    const atlasCluster = clusterResult.data;
    const tier = getInstanceSizeFromCluster(atlasCluster);
    clusterTierCache.set(organizationId, { tier, checkedAt: now });
    
    return tier;
  } catch (error) {
    console.error('[ClusterCheck] Error fetching cluster tier:', error);
    // On error, return cached value if available, otherwise null
    // This allows graceful degradation if Atlas API is temporarily unavailable
    return cached?.tier ?? null;
  }
}

/**
 * Invalidate cache for an organization
 * Call this after cluster upgrades to get fresh tier
 */
export function invalidateClusterTierCache(organizationId: string): void {
  clusterTierCache.delete(organizationId);
  console.log(`[ClusterCheck] Cache invalidated for org ${organizationId}`);
}

/**
 * Clear all cluster tier caches (useful for testing)
 */
export function clearClusterTierCache(): void {
  clusterTierCache.clear();
  console.log('[ClusterCheck] All cluster tier caches cleared');
}

// ============================================
// Cluster Tier Requirement Checking
// ============================================

/**
 * Check if organization has a cluster that meets the minimum tier requirement
 * Uses caching to avoid hitting Atlas API on every request
 *
 * Behavior depends on deployment mode:
 * - Cloud mode: Requires M10+ for vector search features
 * - Self-hosted mode: Allows LOCAL tier (user manages their own Atlas Local instance)
 *
 * @param organizationId - Organization ID
 * @param minTier - Minimum required cluster tier (e.g., 'M10')
 * @returns Object with hasAccess boolean and details
 */
export async function checkClusterTierRequirement(
  organizationId: string,
  minTier: ClusterInstanceSize
): Promise<{
  hasAccess: boolean;
  currentTier: ClusterInstanceSize | null;
  reason?: string;
  clusterId?: string;
  deploymentMode?: DeploymentMode;
}> {
  const deploymentMode = getDeploymentMode();

  try {
    // In self-hosted mode with LOCAL tier requirement, grant access
    // The user is responsible for running their own Atlas Local instance
    if (isSelfHosted() && minTier === 'LOCAL') {
      return {
        hasAccess: true,
        currentTier: 'LOCAL',
        deploymentMode,
        reason: 'Self-hosted mode: Using Atlas Local deployment',
      };
    }

    // Get cluster tier (from cache or fresh fetch)
    const currentTier = await getCachedClusterTier(organizationId);

    // Get provisioned cluster for org (for clusterId in response)
    const provisionedCluster = await getProvisionedClusterForOrg(organizationId);

    if (!provisionedCluster) {
      // In self-hosted mode, no provisioned cluster is okay - user manages their own
      if (isSelfHosted()) {
        return {
          hasAccess: true,
          currentTier: 'LOCAL',
          deploymentMode,
          reason: 'Self-hosted mode: No cluster check required. Ensure Atlas Local is running.',
        };
      }

      return {
        hasAccess: false,
        currentTier: null,
        deploymentMode,
        reason: 'No cluster provisioned. Please provision a cluster first.',
      };
    }

    if (!currentTier) {
      // In self-hosted mode, allow access even if we can't determine tier
      if (isSelfHosted()) {
        return {
          hasAccess: true,
          currentTier: 'LOCAL',
          deploymentMode,
          clusterId: provisionedCluster.clusterId,
          reason: 'Self-hosted mode: Cluster tier check skipped.',
        };
      }

      return {
        hasAccess: false,
        currentTier: null,
        deploymentMode,
        reason: 'Unable to determine cluster tier. Please ensure your cluster is accessible.',
        clusterId: provisionedCluster.clusterId,
      };
    }

    // Check if tier meets requirement
    const comparison = compareClusterTiers(currentTier, minTier);

    if (comparison < 0) {
      // Current tier is lower than required
      const tierMessage = isSelfHosted()
        ? `Vector search requires ${minTier} or higher (or use Atlas Local). Current cluster: ${currentTier}.`
        : `Vector search requires ${minTier} or higher. Current cluster: ${currentTier}. Please upgrade your Atlas cluster.`;

      return {
        hasAccess: false,
        currentTier,
        deploymentMode,
        reason: tierMessage,
        clusterId: provisionedCluster.clusterId,
      };
    }

    return {
      hasAccess: true,
      currentTier,
      deploymentMode,
      clusterId: provisionedCluster.clusterId,
    };
  } catch (error: any) {
    console.error('[ClusterCheck] Error checking cluster tier:', error);

    // In self-hosted mode, allow access on error (user manages their own setup)
    if (isSelfHosted()) {
      return {
        hasAccess: true,
        currentTier: 'LOCAL',
        deploymentMode,
        reason: 'Self-hosted mode: Cluster check failed, but access granted. Ensure Atlas Local is running.',
      };
    }

    // Try to return cached value on error
    const cachedTier = clusterTierCache.get(organizationId)?.tier;

    return {
      hasAccess: false,
      currentTier: cachedTier ?? null,
      deploymentMode,
      reason: error.message || 'Unable to verify cluster tier. Please try again later.',
    };
  }
}

// ============================================
// Feature Requirements Mapping
// ============================================

/**
 * Get the required cluster tier for a feature based on deployment mode
 *
 * IMPORTANT: As of the Knowledge-Guided Conversational Forms update,
 * RAG features no longer require M10+ clusters. The only gate is the
 * subscription tier (PRO, TEAMS, or ENTERPRISE).
 *
 * This function now returns undefined for RAG features, meaning no
 * cluster tier check is performed.
 */
function getFeatureClusterTier(feature: string): ClusterInstanceSize | undefined {
  // RAG features no longer have cluster tier requirements
  // Only subscription tier matters (handled in useFeatureGate hook)
  return undefined;
}

/**
 * Feature requirements map (static, for reference)
 *
 * @deprecated RAG features no longer require cluster tier checks.
 * This map is kept for backward compatibility but all cluster tier
 * requirements have been removed. Only subscription tier gates apply.
 */
export const FEATURE_REQUIREMENTS: Record<string, { clusterTier?: ClusterInstanceSize }> = {
  // Cluster tier requirements removed - only subscription tier matters
  rag_conversational_forms: {},
  rag_document_upload: {},
  rag_vector_search: {},
};

/**
 * Check if organization has access to a feature considering cluster requirements
 * Returns detailed access information including current and required tiers
 *
 * IMPORTANT: As of the Knowledge-Guided Conversational Forms update,
 * RAG features no longer require cluster tier checks. This function
 * now grants access based solely on subscription tier (handled elsewhere).
 *
 * Behavior:
 * - All features return hasAccess: true (no cluster tier gates)
 * - Subscription tier gates are enforced in useFeatureGate hook
 * - Cluster tier info is still returned for informational purposes
 *
 * @param organizationId - Organization ID
 * @param feature - Feature name
 * @returns Access check result with tier information
 */
export async function checkFeatureAccess(
  organizationId: string,
  feature: string
): Promise<{
  hasAccess: boolean;
  reason?: string;
  requiredClusterTier?: ClusterInstanceSize;
  currentClusterTier?: ClusterInstanceSize | null;
  deploymentMode?: DeploymentMode;
}> {
  const deploymentMode = getDeploymentMode();
  const requiredTier = getFeatureClusterTier(feature);

  // RAG features no longer have cluster requirements
  // Grant access - subscription tier is checked elsewhere
  if (!requiredTier) {
    return { hasAccess: true, deploymentMode };
  }

  // For any remaining features with cluster requirements (future features)
  // Check cluster tier requirement
  const clusterCheck = await checkClusterTierRequirement(
    organizationId,
    requiredTier
  );

  if (!clusterCheck.hasAccess) {
    return {
      hasAccess: false,
      reason: clusterCheck.reason,
      requiredClusterTier: requiredTier,
      currentClusterTier: clusterCheck.currentTier,
      deploymentMode,
    };
  }

  return {
    hasAccess: true,
    requiredClusterTier: requiredTier,
    currentClusterTier: clusterCheck.currentTier,
    deploymentMode,
  };
}

/**
 * Get cluster tier for an organization (cached)
 * Returns the current cluster tier without checking requirements
 *
 * @param organizationId - Organization ID
 * @returns Current cluster tier or null if not available
 */
export async function getClusterTier(organizationId: string): Promise<ClusterInstanceSize | null> {
  return getCachedClusterTier(organizationId);
}
