/**
 * Cluster Tier Checks for Feature Gating
 *
 * Utilities to verify cluster tier requirements for features like Vector Search
 * Uses caching to avoid hitting Atlas Admin API on every request
 */

import { ClusterInstanceSize } from '@/lib/atlas/types';
import { getProvisionedClusterForOrg } from '@/lib/atlas/provisioning';
import { getAtlasClient } from '@/lib/atlas/client';
import type { AtlasCluster } from '@/lib/atlas/types';

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
 * Check if cluster tier supports vector search (M10+)
 */
export function supportsVectorSearch(instanceSize: ClusterInstanceSize): boolean {
  const tierOrder: ClusterInstanceSize[] = ['M0', 'M2', 'M5', 'M10', 'M20', 'M30', 'M40', 'M50', 'M60'];
  const tierIndex = tierOrder.indexOf(instanceSize);
  const m10Index = tierOrder.indexOf('M10');
  
  if (tierIndex === -1) return false;
  
  return tierIndex >= m10Index;
}

/**
 * Compare two cluster tiers
 * @returns -1 if tier1 < tier2, 0 if equal, 1 if tier1 > tier2
 */
function compareClusterTiers(
  tier1: ClusterInstanceSize,
  tier2: ClusterInstanceSize
): number {
  const tierOrder: ClusterInstanceSize[] = ['M0', 'M2', 'M5', 'M10', 'M20', 'M30', 'M40', 'M50', 'M60'];
  const index1 = tierOrder.indexOf(tier1);
  const index2 = tierOrder.indexOf(tier2);
  
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
}> {
  try {
    // Get cluster tier (from cache or fresh fetch)
    const currentTier = await getCachedClusterTier(organizationId);

    // Get provisioned cluster for org (for clusterId in response)
    const provisionedCluster = await getProvisionedClusterForOrg(organizationId);

    if (!provisionedCluster) {
      return {
        hasAccess: false,
        currentTier: null,
        reason: 'No cluster provisioned. Please provision a cluster first.',
      };
    }

    if (!currentTier) {
      return {
        hasAccess: false,
        currentTier: null,
        reason: 'Unable to determine cluster tier. Please ensure your cluster is accessible.',
        clusterId: provisionedCluster.clusterId,
      };
    }

    // Check if tier meets requirement
    const comparison = compareClusterTiers(currentTier, minTier);

    if (comparison < 0) {
      // Current tier is lower than required
      return {
        hasAccess: false,
        currentTier,
        reason: `Vector search requires ${minTier} or higher. Current cluster: ${currentTier}. Please upgrade your Atlas cluster.`,
        clusterId: provisionedCluster.clusterId,
      };
    }

    return {
      hasAccess: true,
      currentTier,
      clusterId: provisionedCluster.clusterId,
    };
  } catch (error: any) {
    console.error('[ClusterCheck] Error checking cluster tier:', error);
    
    // Try to return cached value on error
    const cachedTier = clusterTierCache.get(organizationId)?.tier;
    
    return {
      hasAccess: false,
      currentTier: cachedTier ?? null,
      reason: error.message || 'Unable to verify cluster tier. Please try again later.',
    };
  }
}

// ============================================
// Feature Requirements Mapping
// ============================================

/**
 * Feature requirements map
 * Maps feature names to their cluster tier requirements
 */
export const FEATURE_REQUIREMENTS: Record<string, { clusterTier?: ClusterInstanceSize }> = {
  rag_conversational_forms: { clusterTier: 'M10' },
  rag_document_upload: { clusterTier: 'M10' },
  rag_vector_search: { clusterTier: 'M10' },
};

/**
 * Check if organization has access to a feature considering cluster requirements
 * Returns detailed access information including current and required tiers
 *
 * @param organizationId - Organization ID
 * @param feature - Feature name (must be in FEATURE_REQUIREMENTS for cluster check)
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
}> {
  const requirements = FEATURE_REQUIREMENTS[feature];

  // If feature has no special cluster requirements, grant access
  if (!requirements) {
    return { hasAccess: true };
  }

  // Check cluster tier requirement if specified
  if (requirements.clusterTier) {
    const clusterCheck = await checkClusterTierRequirement(
      organizationId,
      requirements.clusterTier
    );

    if (!clusterCheck.hasAccess) {
      return {
        hasAccess: false,
        reason: clusterCheck.reason,
        requiredClusterTier: requirements.clusterTier,
        currentClusterTier: clusterCheck.currentTier,
      };
    }
  }

  return { hasAccess: true };
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
