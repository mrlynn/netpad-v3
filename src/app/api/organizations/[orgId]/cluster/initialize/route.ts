/**
 * Cluster Database Initialization API
 *
 * POST /api/organizations/[orgId]/cluster/initialize
 *
 * For clusters that were provisioned but don't have a database connection set up,
 * this endpoint will:
 * 1. Create a vault entry with the connection string
 * 2. Initialize default collections
 * 3. Update the cluster record with the vaultId
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { checkOrgPermission } from '@/lib/platform/organizations';
import { getProvisionedClusterForOrg, initializeClusterDatabase } from '@/lib/atlas';
import { getPlatformDb } from '@/lib/platform/db';

/**
 * POST - Initialize database for an existing cluster
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

    // Check user has access to this org
    const hasAccess = await checkOrgPermission(session.userId, orgId, 'manage_org');
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Check if cluster exists and is ready
    const cluster = await getProvisionedClusterForOrg(orgId);
    if (!cluster) {
      return NextResponse.json(
        { error: 'No cluster found for this organization' },
        { status: 404 }
      );
    }

    if (!cluster.projectId) {
      return NextResponse.json(
        { error: 'Cluster is missing projectId. Please run migration script.' },
        { status: 400 }
      );
    }

    if (cluster.status !== 'ready') {
      return NextResponse.json(
        { error: `Cluster is not ready. Current status: ${cluster.status}` },
        { status: 400 }
      );
    }

    // Check if already initialized - but verify the vault actually exists
    if (cluster.vaultId) {
      const db = await getPlatformDb();
      const vaultsCollection = db.collection('connection_vaults');
      const existingVault = await vaultsCollection.findOne({
        vaultId: cluster.vaultId,
        organizationId: orgId,
        projectId: cluster.projectId,
        status: 'active',
      });

      if (existingVault) {
        return NextResponse.json({
          success: true,
          message: 'Cluster already initialized',
          vaultId: cluster.vaultId,
          alreadyInitialized: true,
        });
      }
      // Vault doesn't exist or is inactive - proceed to create a new one
      console.log(`[Cluster Initialize API] Vault ${cluster.vaultId} not found, will create new one`);
    }

    // Initialize the database
    const result = await initializeClusterDatabase(orgId, cluster.projectId, session.userId);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Database initialized successfully',
        vaultId: result.vaultId,
        collectionsCreated: result.collectionsCreated,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to initialize database',
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('[Cluster Initialize API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initialize database' },
      { status: 500 }
    );
  }
}
