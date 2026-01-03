/**
 * Organization Cluster API
 *
 * GET    /api/organizations/[orgId]/cluster - Get provisioning status
 * POST   /api/organizations/[orgId]/cluster - Manually trigger provisioning
 * DELETE /api/organizations/[orgId]/cluster - Delete cluster and all resources
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import {
  getProvisionedClusterForOrg,
  getProvisioningStatus,
  provisionM0Cluster,
  deleteProvisionedCluster,
  isAutoProvisioningAvailable,
} from '@/lib/atlas';
import { checkOrgPermission } from '@/lib/platform/organizations';

/**
 * GET - Get cluster provisioning status for an organization
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const session = await getSession();
    const { orgId } = await params;

    if (!session.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check user has access to this org
    const hasAccess = await checkOrgPermission(session.userId, orgId, 'view_forms');
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Check if auto-provisioning is available
    const provisioningAvailable = isAutoProvisioningAvailable();

    // Get provisioning status
    const status = await getProvisioningStatus(orgId);
    const cluster = await getProvisionedClusterForOrg(orgId);

    return NextResponse.json({
      provisioningAvailable,
      hasCluster: !!cluster,
      status: status?.status || null,
      message: status?.message || null,
      vaultId: status?.vaultId || null,
      cluster: cluster ? {
        clusterId: cluster.clusterId,
        provider: cluster.provider,
        region: cluster.region,
        instanceSize: cluster.instanceSize,
        status: cluster.status,
        storageLimitMb: cluster.storageLimitMb,
        maxConnections: cluster.maxConnections,
        createdAt: cluster.createdAt,
        provisioningStartedAt: cluster.provisioningStartedAt,
        provisioningCompletedAt: cluster.provisioningCompletedAt,
        // Admin/troubleshooting details
        atlasProjectId: cluster.atlasProjectId,
        atlasProjectName: cluster.atlasProjectName,
        atlasClusterName: cluster.atlasClusterName,
        atlasClusterId: cluster.atlasClusterId,
        databaseUsername: cluster.databaseUsername,
        statusMessage: cluster.statusMessage,
      } : null,
    });
  } catch (error: any) {
    console.error('[Cluster API] GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get cluster status' },
      { status: 500 }
    );
  }
}

/**
 * POST - Manually trigger cluster provisioning
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const session = await getSession();
    const { orgId } = await params;

    if (!session.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Only org owners/admins can trigger provisioning
    const canManage = await checkOrgPermission(session.userId, orgId, 'manage_org');
    if (!canManage) {
      return NextResponse.json(
        { error: 'Only organization owners and admins can provision clusters' },
        { status: 403 }
      );
    }

    // Check if auto-provisioning is available
    if (!isAutoProvisioningAvailable()) {
      return NextResponse.json(
        { error: 'Auto-provisioning is not configured on this server' },
        { status: 400 }
      );
    }

    // Check if already has a cluster
    const existingCluster = await getProvisionedClusterForOrg(orgId);
    if (existingCluster) {
      return NextResponse.json(
        {
          error: 'Organization already has a provisioned cluster',
          cluster: {
            clusterId: existingCluster.clusterId,
            status: existingCluster.status,
          },
        },
        { status: 400 }
      );
    }

    // Parse optional configuration from body
    const body = await request.json().catch(() => ({}));
    const { provider, region, databaseName } = body;

    // Start provisioning
    const result = await provisionM0Cluster({
      organizationId: orgId,
      userId: session.userId,
      provider,
      region,
      databaseName: databaseName || 'forms',
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        clusterId: result.clusterId,
        vaultId: result.vaultId,
        status: result.status,
        message: 'Cluster provisioning completed successfully',
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          status: result.status,
          clusterId: result.clusterId,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('[Cluster API] POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to provision cluster' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete cluster and all associated resources
 *
 * This will:
 * - Cancel any pending Atlas console invitations
 * - Delete the M0 cluster from Atlas
 * - Delete the Atlas project
 * - Delete the connection vault
 * - Mark the cluster record as deleted
 *
 * After deletion, POST can be called again to re-provision a new cluster.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const session = await getSession();
    const { orgId } = await params;

    if (!session.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Only org owners can delete clusters (destructive action)
    const canManage = await checkOrgPermission(session.userId, orgId, 'manage_org');
    if (!canManage) {
      return NextResponse.json(
        { error: 'Only organization owners and admins can delete clusters' },
        { status: 403 }
      );
    }

    // Check if cluster exists
    const existingCluster = await getProvisionedClusterForOrg(orgId);
    if (!existingCluster) {
      return NextResponse.json(
        { error: 'No cluster found for this organization' },
        { status: 404 }
      );
    }

    // Don't allow deletion while still provisioning
    if (['pending', 'creating_project', 'creating_cluster', 'creating_user', 'configuring_network'].includes(existingCluster.status)) {
      return NextResponse.json(
        {
          error: 'Cannot delete cluster while provisioning is in progress',
          status: existingCluster.status,
        },
        { status: 400 }
      );
    }

    // Delete the cluster and all associated resources
    console.log(`[Cluster API] User ${session.userId} deleting cluster for org ${orgId}`);
    const result = await deleteProvisionedCluster(orgId, session.userId);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Cluster and all associated resources have been deleted',
        warning: result.error, // May contain warnings even on success
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to delete cluster',
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('[Cluster API] DELETE error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete cluster' },
      { status: 500 }
    );
  }
}
