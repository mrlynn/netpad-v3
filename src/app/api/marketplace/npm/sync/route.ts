/**
 * npm Registry Sync API
 * 
 * POST /api/marketplace/npm/sync - Manually trigger npm registry sync
 * GET /api/marketplace/npm/sync - Get sync status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { assertOrgPermission } from '@/lib/platform/permissions';
import { syncNpmRegistry, getSyncStatus, syncSpecificPackage } from '@/lib/npm/sync-service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/marketplace/npm/sync
 * Get npm registry sync status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check permission - admin access required
    try {
      // For sync status, we need to check if user has admin access to any org
      // For now, allow any authenticated user to view sync status
    } catch {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const status = await getSyncStatus();

    return NextResponse.json({
      success: true,
      status,
    });
  } catch (error) {
    console.error('[npm Sync API] Get status error:', error);
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/marketplace/npm/sync
 * Manually trigger npm registry sync
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check permission - platform admin access required for sync
    // For now, we'll allow any authenticated user (can restrict later)
    // In production, you might want to check for platformRole === 'admin'

    const body = await request.json().catch(() => ({}));
    const { 
      force = false,
      includeOfficial = true,
      includeCommunity = true,
      packageName, // Optional: sync specific package
    } = body;

    // If packageName is provided, sync just that package
    if (packageName) {
      const result = await syncSpecificPackage(packageName);
      
      if (!result.success) {
        return NextResponse.json(
          { error: result.error || 'Failed to sync package' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        package: result.package,
        message: `Successfully synced package ${packageName}`,
      });
    }

    // Full registry sync
    const result = await syncNpmRegistry({
      force,
      includeOfficial,
      includeCommunity,
    });

    return NextResponse.json({
      success: result.success,
      status: result.status,
      duration: result.duration,
      message: result.success
        ? `Sync completed: ${result.status.packagesNew} new, ${result.status.packagesUpdated} updated`
        : `Sync completed with errors: ${result.status.errors.length} errors`,
    });
  } catch (error) {
    console.error('[npm Sync API] Sync error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync npm registry' },
      { status: 500 }
    );
  }
}
