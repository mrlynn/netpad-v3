/**
 * Check for Updates API
 *
 * GET /api/applications/installed/[id]/updates - Check for updates
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getInstallation, updateInstallationStatus, compareVersions } from '@/lib/platform/installedApplications';
import { getPlatformDb } from '@/lib/platform/db';

export const dynamic = 'force-dynamic';

interface MarketplaceApplication {
  id: string;
  manifest: {
    name: string;
    version: string;
  };
  latestVersion?: string;
  versions?: Array<{
    version: string;
    changelog?: string;
    publishedAt: Date;
  }>;
}

/**
 * GET /api/applications/installed/[id]/updates
 * Check for updates
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');

    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
    }

    const installation = await getInstallation(orgId, id);

    if (!installation) {
      return NextResponse.json({ error: 'Installation not found' }, { status: 404 });
    }

    const db = await getPlatformDb();
    const marketplaceCollection = db.collection<MarketplaceApplication>('marketplace_applications');
    
    const marketplaceApp = await marketplaceCollection.findOne({
      id: installation.marketplaceApplicationId,
      status: 'approved',
      published: true,
    });

    if (!marketplaceApp) {
      return NextResponse.json({
        hasUpdate: false,
        currentVersion: installation.installedVersion,
        error: 'Marketplace application not found',
      });
    }

    const latestVersion = marketplaceApp.latestVersion || marketplaceApp.manifest.version;
    const hasUpdate = compareVersions(installation.installedVersion, latestVersion) < 0;

    if (hasUpdate) {
      await updateInstallationStatus(orgId, id, {
        latestAvailableVersion: latestVersion,
        status: 'update-available',
        updateAvailable: {
          version: latestVersion,
          changelog: marketplaceApp.versions?.find(v => v.version === latestVersion)?.changelog,
          publishedAt: marketplaceApp.versions?.find(v => v.version === latestVersion)?.publishedAt || new Date(),
        },
        lastCheckedAt: new Date(),
      });
    } else {
      await updateInstallationStatus(orgId, id, {
        status: 'installed',
        lastCheckedAt: new Date(),
      });
    }

    return NextResponse.json({
      hasUpdate,
      currentVersion: installation.installedVersion,
      latestVersion: hasUpdate ? latestVersion : undefined,
      updateInfo: hasUpdate ? {
        version: latestVersion,
        changelog: marketplaceApp.versions?.find(v => v.version === latestVersion)?.changelog,
        publishedAt: marketplaceApp.versions?.find(v => v.version === latestVersion)?.publishedAt || new Date(),
      } : undefined,
    });
  } catch (error: any) {
    console.error('[Installed Applications API] Check updates error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check for updates' },
      { status: 500 }
    );
  }
}
