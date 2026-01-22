/**
 * Admin Cluster Connection String API
 *
 * GET: Get the decrypted connection string for a cluster (admin-only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { isPlatformAdmin } from '@/lib/platform/users';
import { getPlatformDb } from '@/lib/platform/db';
import { ProvisionedCluster } from '@/lib/atlas/types';
import { getDecryptedConnectionString } from '@/lib/platform/connectionVault';

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

    if (!cluster.vaultId) {
      return NextResponse.json(
        { error: 'Cluster does not have a connection vault' },
        { status: 404 }
      );
    }

    // Get the decrypted connection string
    const result = await getDecryptedConnectionString(cluster.organizationId, cluster.vaultId);

    if (!result) {
      return NextResponse.json(
        { error: 'Connection string not found or could not be decrypted' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      connectionString: result.connectionString,
      database: result.database,
      clusterId: cluster.clusterId,
      atlasClusterName: cluster.atlasClusterName,
    });
  } catch (error) {
    console.error('[Admin Clusters] Error fetching connection string:', error);
    return NextResponse.json(
      { error: 'Failed to fetch connection string' },
      { status: 500 }
    );
  }
}
