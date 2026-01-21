/**
 * Admin Clusters - Purge Deleted Records API
 *
 * POST: Remove all deleted cluster records from the database
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { isPlatformAdmin } from '@/lib/platform/users';
import { getPlatformDb } from '@/lib/platform/db';
import { ProvisionedCluster } from '@/lib/atlas/types';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const isAdmin = await isPlatformAdmin(session.userId);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const platformDb = await getPlatformDb();
    const clustersCollection = platformDb.collection<ProvisionedCluster>('provisioned_clusters');

    // Delete all records with status 'deleted'
    const result = await clustersCollection.deleteMany({ status: 'deleted' });

    console.log(`[Admin Clusters] Purged ${result.deletedCount} deleted records by admin ${session.userId}`);

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount,
      message: `Successfully purged ${result.deletedCount} deleted cluster records`,
    });
  } catch (error) {
    console.error('[Admin Clusters] Error purging deleted records:', error);
    return NextResponse.json({ error: 'Failed to purge deleted records' }, { status: 500 });
  }
}
