/**
 * Admin Cluster Management API
 *
 * GET: Get detailed info for a specific cluster
 * PATCH: Update cluster status (pause/resume/deactivate)
 * DELETE: Delete cluster and associated resources
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { isPlatformAdmin } from '@/lib/platform/users';
import { getPlatformDb, getOrganizationsCollection } from '@/lib/platform/db';
import { ProvisionedCluster, ProvisioningStatus } from '@/lib/atlas/types';
import { deleteProvisionedCluster, provisionM0Cluster } from '@/lib/atlas/provisioning';
import { getAtlasClient } from '@/lib/atlas/client';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ clusterId: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const isAdmin = await isPlatformAdmin(session.userId);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { clusterId } = await params;
    const platformDb = await getPlatformDb();
    const clustersCollection = platformDb.collection<ProvisionedCluster>('provisioned_clusters');

    const cluster = await clustersCollection.findOne({ clusterId });
    if (!cluster) {
      return NextResponse.json({ error: 'Cluster not found' }, { status: 404 });
    }

    // Enrich with organization info
    const orgsCollection = await getOrganizationsCollection();
    const org = await orgsCollection.findOne({ organizationId: cluster.organizationId });

    // Get Atlas cluster status if available
    let atlasStatus = null;
    if (cluster.atlasProjectId && cluster.atlasClusterName && cluster.status === 'ready') {
      try {
        const atlasClient = getAtlasClient();
        if (atlasClient.isConfigured()) {
          const result = await atlasClient.getCluster(cluster.atlasProjectId, cluster.atlasClusterName);
          if (result.success && result.data) {
            atlasStatus = {
              stateName: result.data.stateName,
              paused: result.data.paused,
              mongoDBVersion: result.data.mongoDBVersion,
              connectionStrings: result.data.connectionStrings ? {
                standardSrv: result.data.connectionStrings.standardSrv ? '[CONFIGURED]' : null,
              } : null,
            };
          }
        }
      } catch (atlasError) {
        console.warn(`[Admin Clusters] Failed to get Atlas status for ${clusterId}:`, atlasError);
      }
    }

    // Get vault info if exists
    let vaultInfo = null;
    if (cluster.vaultId) {
      const vaultsCollection = platformDb.collection('connection_vaults');
      const vault = await vaultsCollection.findOne({ vaultId: cluster.vaultId });
      if (vault) {
        vaultInfo = {
          vaultId: vault.vaultId,
          name: vault.name,
          status: vault.status,
          usageCount: vault.usageCount || 0,
          lastUsedAt: vault.lastUsedAt,
          createdAt: vault.createdAt,
        };
      }
    }

    return NextResponse.json({
      cluster: {
        ...cluster,
        organizationName: org?.name,
        ownerEmail: org?.createdBy ? await getOwnerEmail(org.createdBy) : null,
      },
      atlasStatus,
      vaultInfo,
    });
  } catch (error) {
    console.error('[Admin Clusters] Error fetching cluster:', error);
    return NextResponse.json({ error: 'Failed to fetch cluster' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const isAdmin = await isPlatformAdmin(session.userId);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { clusterId } = await params;
    const body = await req.json();
    const { action } = body;

    if (!['pause', 'resume', 'deactivate', 'retry', 'cleanup', 'purge', 'cancel'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be: pause, resume, deactivate, retry, cleanup, purge, or cancel' },
        { status: 400 }
      );
    }

    const platformDb = await getPlatformDb();
    const clustersCollection = platformDb.collection<ProvisionedCluster>('provisioned_clusters');

    const cluster = await clustersCollection.findOne({ clusterId });
    if (!cluster) {
      return NextResponse.json({ error: 'Cluster not found' }, { status: 404 });
    }

    // Handle retry action for failed clusters
    if (action === 'retry') {
      if (cluster.status !== 'failed') {
        return NextResponse.json(
          { error: `Can only retry failed clusters. Current status: ${cluster.status}` },
          { status: 400 }
        );
      }

      // Mark the old record as superseded
      await clustersCollection.updateOne(
        { clusterId },
        {
          $set: {
            status: 'deleted' as ProvisioningStatus,
            statusMessage: `Superseded by retry attempt at ${new Date().toISOString()}`,
            deletedAt: new Date(),
            updatedAt: new Date(),
          },
        }
      );

      // Start a new provisioning attempt
      console.log(`[Admin Clusters] Retrying provisioning for org ${cluster.organizationId} by admin ${session.userId}`);

      // Run provisioning in background and return immediately
      provisionM0Cluster({
        organizationId: cluster.organizationId,
        projectId: cluster.projectId,
        userId: cluster.createdBy, // Keep original creator
      }).then((result) => {
        console.log(`[Admin Clusters] Retry provisioning result:`, result);
      }).catch((err) => {
        console.error(`[Admin Clusters] Retry provisioning error:`, err);
      });

      return NextResponse.json({
        success: true,
        action,
        clusterId,
        message: 'Provisioning retry started. Check cluster list for new status.',
      });
    }

    // Handle cleanup action for failed clusters
    if (action === 'cleanup') {
      if (cluster.status !== 'failed') {
        return NextResponse.json(
          { error: `Can only cleanup failed clusters. Current status: ${cluster.status}` },
          { status: 400 }
        );
      }

      const atlasClient = getAtlasClient();
      const cleanupResults: string[] = [];

      // Try to clean up any partial Atlas resources
      if (atlasClient.isConfigured()) {
        // Try to delete cluster if it exists
        if (cluster.atlasProjectId && cluster.atlasClusterName) {
          try {
            const deleteResult = await atlasClient.deleteCluster(cluster.atlasProjectId, cluster.atlasClusterName);
            if (deleteResult.success) {
              cleanupResults.push(`Deleted Atlas cluster: ${cluster.atlasClusterName}`);
            }
          } catch (e) {
            // Cluster might not exist, that's fine
          }
        }

        // Try to delete project if it exists
        if (cluster.atlasProjectId) {
          // Wait a moment for cluster deletion
          await new Promise((resolve) => setTimeout(resolve, 2000));
          try {
            const deleteResult = await atlasClient.deleteProject(cluster.atlasProjectId);
            if (deleteResult.success) {
              cleanupResults.push(`Deleted Atlas project: ${cluster.atlasProjectId}`);
            }
          } catch (e) {
            // Project might not exist or have other clusters
          }
        }
      }

      // Mark the cluster record as deleted
      await clustersCollection.updateOne(
        { clusterId },
        {
          $set: {
            status: 'deleted' as ProvisioningStatus,
            statusMessage: `Cleaned up by admin (${session.userId}): ${cleanupResults.join('; ') || 'No Atlas resources found'}`,
            deletedAt: new Date(),
            updatedAt: new Date(),
          },
        }
      );

      console.log(`[Admin Clusters] Cluster ${clusterId} cleaned up by admin ${session.userId}`);

      return NextResponse.json({
        success: true,
        action,
        clusterId,
        message: 'Failed cluster cleaned up',
        cleanupResults,
      });
    }

    // Handle purge action - permanently remove record from database
    if (action === 'purge') {
      if (cluster.status !== 'deleted') {
        return NextResponse.json(
          { error: `Can only purge deleted/deactivated clusters. Current status: ${cluster.status}` },
          { status: 400 }
        );
      }

      // Permanently delete the record from the database
      await clustersCollection.deleteOne({ clusterId });

      console.log(`[Admin Clusters] Cluster record ${clusterId} purged by admin ${session.userId}`);

      return NextResponse.json({
        success: true,
        action,
        clusterId,
        message: 'Cluster record permanently removed from database',
      });
    }

    // Handle cancel action - mark stuck provisioning clusters as failed
    if (action === 'cancel') {
      const provisioningStatuses = ['pending', 'creating_project', 'creating_cluster', 'creating_user', 'configuring_network'];
      if (!provisioningStatuses.includes(cluster.status)) {
        return NextResponse.json(
          { error: `Can only cancel clusters that are still provisioning. Current status: ${cluster.status}` },
          { status: 400 }
        );
      }

      // Mark the cluster as failed
      await clustersCollection.updateOne(
        { clusterId },
        {
          $set: {
            status: 'failed' as ProvisioningStatus,
            statusMessage: `Cancelled by admin (${session.userId}) - provisioning was stuck`,
            updatedAt: new Date(),
          },
        }
      );

      console.log(`[Admin Clusters] Stuck provisioning cluster ${clusterId} cancelled by admin ${session.userId}`);

      return NextResponse.json({
        success: true,
        action,
        clusterId,
        message: 'Stuck provisioning cancelled. Cluster marked as failed. You can now retry or cleanup.',
      });
    }

    // For pause/resume/deactivate, cluster must be ready
    if (cluster.status !== 'ready') {
      return NextResponse.json(
        { error: `Cannot ${action} cluster with status: ${cluster.status}` },
        { status: 400 }
      );
    }

    const atlasClient = getAtlasClient();
    if (!atlasClient.isConfigured()) {
      return NextResponse.json(
        { error: 'Atlas API not configured' },
        { status: 500 }
      );
    }

    if (!cluster.atlasProjectId || !cluster.atlasClusterName) {
      return NextResponse.json(
        { error: 'Cluster missing Atlas project or cluster name' },
        { status: 400 }
      );
    }

    let result;

    if (action === 'pause') {
      // Pause the Atlas cluster (M0 clusters cannot be paused, but M10+ can)
      result = await atlasClient.pauseCluster(cluster.atlasProjectId, cluster.atlasClusterName);

      if (!result.success) {
        // M0 clusters cannot be paused - provide helpful message
        if (cluster.instanceSize === 'M0') {
          return NextResponse.json(
            { error: 'M0 free tier clusters cannot be paused. Consider deactivating instead.' },
            { status: 400 }
          );
        }
        return NextResponse.json(
          { error: result.error?.detail || 'Failed to pause cluster' },
          { status: 500 }
        );
      }

      await clustersCollection.updateOne(
        { clusterId },
        {
          $set: {
            statusMessage: 'Paused by admin',
            updatedAt: new Date(),
          },
        }
      );
    } else if (action === 'resume') {
      result = await atlasClient.resumeCluster(cluster.atlasProjectId, cluster.atlasClusterName);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error?.detail || 'Failed to resume cluster' },
          { status: 500 }
        );
      }

      await clustersCollection.updateOne(
        { clusterId },
        {
          $set: {
            updatedAt: new Date(),
          },
          $unset: {
            statusMessage: '',
          },
        }
      );
    } else if (action === 'deactivate') {
      // Mark cluster as inactive - does not delete from Atlas
      // This prevents the cluster from being used but keeps resources intact
      await clustersCollection.updateOne(
        { clusterId },
        {
          $set: {
            status: 'deleted', // Mark as deleted to prevent use
            statusMessage: `Deactivated by admin (${session.userId}) due to inactivity`,
            deletedAt: new Date(),
            updatedAt: new Date(),
          },
        }
      );

      // Also deactivate the vault
      if (cluster.vaultId) {
        const vaultsCollection = platformDb.collection('connection_vaults');
        await vaultsCollection.updateOne(
          { vaultId: cluster.vaultId },
          {
            $set: {
              status: 'revoked',
              updatedAt: new Date(),
            },
          }
        );
      }

      // Log admin action
      console.log(`[Admin Clusters] Cluster ${clusterId} deactivated by admin ${session.userId}`);
    }

    return NextResponse.json({
      success: true,
      action,
      clusterId,
      message: `Cluster ${action}d successfully`,
    });
  } catch (error) {
    console.error('[Admin Clusters] Error updating cluster:', error);
    return NextResponse.json({ error: 'Failed to update cluster' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const isAdmin = await isPlatformAdmin(session.userId);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { clusterId } = await params;
    const platformDb = await getPlatformDb();
    const clustersCollection = platformDb.collection<ProvisionedCluster>('provisioned_clusters');

    const cluster = await clustersCollection.findOne({ clusterId });
    if (!cluster) {
      return NextResponse.json({ error: 'Cluster not found' }, { status: 404 });
    }

    // Use the existing deleteProvisionedCluster function
    const result = await deleteProvisionedCluster(cluster.organizationId, session.userId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to delete cluster' },
        { status: 500 }
      );
    }

    // Log admin action
    console.log(`[Admin Clusters] Cluster ${clusterId} deleted by admin ${session.userId}`);

    return NextResponse.json({
      success: true,
      clusterId,
      message: 'Cluster deleted successfully',
      warning: result.error, // Contains any partial failure messages
    });
  } catch (error) {
    console.error('[Admin Clusters] Error deleting cluster:', error);
    return NextResponse.json({ error: 'Failed to delete cluster' }, { status: 500 });
  }
}

async function getOwnerEmail(userId: string): Promise<string | null> {
  try {
    const platformDb = await getPlatformDb();
    const usersCollection = platformDb.collection('users');
    const user = await usersCollection.findOne({ userId });
    return user?.email || null;
  } catch {
    return null;
  }
}
