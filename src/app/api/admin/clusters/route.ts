/**
 * Admin Clusters API
 *
 * GET: List all provisioned clusters with activity metrics
 * Includes organization info, connection vault usage, and form submission activity
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { isPlatformAdmin } from '@/lib/platform/users';
import { getPlatformDb, getOrganizationsCollection } from '@/lib/platform/db';
import { ProvisionedCluster } from '@/lib/atlas/types';

export interface ClusterWithMetrics extends ProvisionedCluster {
  // Organization info
  organizationName?: string;
  ownerName?: string;
  ownerEmail?: string;

  // Activity metrics
  vaultUsageCount?: number;
  vaultLastUsedAt?: Date | null;
  lastFormSubmission?: Date | null;
  totalFormSubmissions?: number;

  // Computed activity status
  daysSinceLastActivity?: number;
  isInactive?: boolean; // true if no activity in 30+ days
}

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check admin access
    const isAdmin = await isPlatformAdmin(session.userId);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'all'; // ready, failed, deleted, all
    const inactiveOnly = searchParams.get('inactiveOnly') === 'true';
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50'), 1), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);

    const platformDb = await getPlatformDb();
    const clustersCollection = platformDb.collection<ProvisionedCluster>('provisioned_clusters');

    // Build query
    const query: Record<string, unknown> = {};

    if (status !== 'all') {
      if (status === 'provisioning') {
        // Match any of the provisioning statuses
        query.status = { $in: ['pending', 'creating_project', 'creating_cluster', 'creating_user', 'configuring_network'] };
      } else {
        query.status = status;
      }
    }

    if (search) {
      query.$or = [
        { organizationId: { $regex: search, $options: 'i' } },
        { atlasClusterName: { $regex: search, $options: 'i' } },
        { atlasProjectName: { $regex: search, $options: 'i' } },
      ];
    }

    // Get total count
    const total = await clustersCollection.countDocuments(query);

    // Build sort
    const sort: Record<string, 1 | -1> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Get clusters
    const clusters = await clustersCollection
      .find(query)
      .sort(sort)
      .skip(offset)
      .limit(limit)
      .toArray();

    // Enrich clusters with activity metrics
    const enrichedClusters: ClusterWithMetrics[] = await Promise.all(
      clusters.map(async (cluster) => {
        const metrics = await getClusterActivityMetrics(cluster);
        return {
          ...cluster,
          ...metrics,
        };
      })
    );

    // Filter by inactivity if requested
    const filteredClusters = inactiveOnly
      ? enrichedClusters.filter((c) => c.isInactive)
      : enrichedClusters;

    // Calculate summary stats
    const stats = {
      total,
      ready: await clustersCollection.countDocuments({ status: 'ready' }),
      failed: await clustersCollection.countDocuments({ status: 'failed' }),
      deleted: await clustersCollection.countDocuments({ status: 'deleted' }),
      provisioning: await clustersCollection.countDocuments({
        status: { $in: ['pending', 'creating_project', 'creating_cluster', 'creating_user', 'configuring_network'] }
      }),
      inactive30Days: enrichedClusters.filter((c) => c.isInactive).length,
    };

    return NextResponse.json({
      clusters: filteredClusters,
      total: inactiveOnly ? filteredClusters.length : total,
      limit,
      offset,
      stats,
    });
  } catch (error) {
    console.error('[Admin Clusters] Error fetching clusters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clusters' },
      { status: 500 }
    );
  }
}

/**
 * Get activity metrics for a cluster
 */
async function getClusterActivityMetrics(cluster: ProvisionedCluster): Promise<Partial<ClusterWithMetrics>> {
  const metrics: Partial<ClusterWithMetrics> = {};
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  try {
    const platformDb = await getPlatformDb();

    // Get organization info
    // Note: Organization uses 'orgId' field, ProvisionedCluster uses 'organizationId'
    const orgsCollection = await getOrganizationsCollection();
    const org = await orgsCollection.findOne({ orgId: cluster.organizationId });
    if (org) {
      metrics.organizationName = org.name;

      // Get owner name and email from users collection
      const usersCollection = platformDb.collection('users');
      const owner = await usersCollection.findOne({ userId: org.createdBy });
      if (owner) {
        metrics.ownerName = owner.displayName || null;
        metrics.ownerEmail = owner.email;
      }
    }

    // Get vault usage metrics if vaultId exists
    if (cluster.vaultId) {
      // Check platform vaults collection (org-specific db would require more complex routing)
      const vaultsCollection = platformDb.collection('connection_vaults');
      const vault = await vaultsCollection.findOne({ vaultId: cluster.vaultId });

      if (vault) {
        metrics.vaultUsageCount = vault.usageCount || 0;
        metrics.vaultLastUsedAt = vault.lastUsedAt || null;
      }
    }

    // Get form submission activity
    // This requires checking org-specific databases which is more complex
    // For now, we'll estimate based on vault usage and provisioning date
    // TODO: Add actual form submission queries when we have a cross-org query mechanism

    // Calculate days since last activity
    const lastActivityDates: Date[] = [];

    if (metrics.vaultLastUsedAt) {
      lastActivityDates.push(new Date(metrics.vaultLastUsedAt));
    }
    if (cluster.updatedAt) {
      lastActivityDates.push(new Date(cluster.updatedAt));
    }
    if (cluster.provisioningCompletedAt) {
      lastActivityDates.push(new Date(cluster.provisioningCompletedAt));
    }

    const lastActivity = lastActivityDates.length > 0
      ? new Date(Math.max(...lastActivityDates.map(d => d.getTime())))
      : cluster.createdAt;

    const daysSinceLastActivity = Math.floor((now.getTime() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24));

    metrics.daysSinceLastActivity = daysSinceLastActivity;
    metrics.isInactive = daysSinceLastActivity >= 30 && cluster.status === 'ready';

  } catch (error) {
    console.error(`[Admin Clusters] Error getting metrics for cluster ${cluster.clusterId}:`, error);
  }

  return metrics;
}
