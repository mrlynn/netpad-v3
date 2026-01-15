/**
 * Installed Applications API
 *
 * GET /api/applications/installed - List installed marketplace applications
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { listInstallations } from '@/lib/platform/installedApplications';
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
 * GET /api/applications/installed
 * List installed marketplace applications with update status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status') as 'installed' | 'update-available' | 'updating' | 'error' | null;

    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
    }

    // Get installations
    const installations = await listInstallations(orgId, {
      projectId: projectId || undefined,
      status: status || undefined,
    });

    // Check for updates by querying marketplace
    const db = await getPlatformDb();
    const marketplaceCollection = db.collection<MarketplaceApplication>('marketplace_applications');

    const installationsWithUpdates = await Promise.all(
      installations.map(async (installation) => {
        // Get latest version from marketplace
        const marketplaceApp = await marketplaceCollection.findOne({
          id: installation.marketplaceApplicationId,
          status: 'approved',
          published: true,
        });

        if (marketplaceApp) {
          const latestVersion = marketplaceApp.latestVersion || marketplaceApp.manifest.version;
          const hasUpdate = latestVersion !== installation.installedVersion;

          // Update installation record if version changed
          if (hasUpdate && latestVersion !== installation.latestAvailableVersion) {
            const { updateInstallationStatus } = await import('@/lib/platform/installedApplications');
            await updateInstallationStatus(orgId, installation.installationId, {
              latestAvailableVersion: latestVersion,
              status: hasUpdate ? 'update-available' : 'installed',
              updateAvailable: hasUpdate ? {
                version: latestVersion,
                changelog: marketplaceApp.versions?.find(v => v.version === latestVersion)?.changelog,
                publishedAt: marketplaceApp.versions?.find(v => v.version === latestVersion)?.publishedAt || new Date(),
              } : undefined,
              lastCheckedAt: new Date(),
            });
          }

          return {
            ...installation,
            latestAvailableVersion: latestVersion,
            hasUpdate,
            updateInfo: hasUpdate ? {
              version: latestVersion,
              changelog: marketplaceApp.versions?.find(v => v.version === latestVersion)?.changelog,
              publishedAt: marketplaceApp.versions?.find(v => v.version === latestVersion)?.publishedAt || new Date(),
            } : undefined,
          };
        }

        return installation;
      })
    );

    return NextResponse.json({
      success: true,
      installations: installationsWithUpdates,
      total: installationsWithUpdates.length,
    });
  } catch (error: any) {
    console.error('[Installed Applications API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list installed applications' },
      { status: 500 }
    );
  }
}
