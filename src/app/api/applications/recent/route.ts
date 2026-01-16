/**
 * Recent Applications API
 *
 * GET /api/applications/recent
 * Returns user's recently accessed applications with full details
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getRecentApplications, cleanupStaleReferences } from '@/lib/platform/userPreferences';
import { getApplication } from '@/lib/platform/applications';
import { getUserOrgPermissions } from '@/lib/platform/permissions';
import { Application } from '@/types/application';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    // Get recent application references
    const recentRefs = await getRecentApplications(session.userId, limit);

    if (recentRefs.length === 0) {
      return NextResponse.json({
        success: true,
        applications: [],
        total: 0,
      });
    }

    // Fetch full application details for each recent app
    // Also filter out apps the user no longer has access to
    const applicationsWithAccess: Array<Application & { lastAccessedAt: Date }> = [];
    const validAppIds: string[] = [];

    for (const ref of recentRefs) {
      try {
        // Check if user still has access to this org
        const permissions = await getUserOrgPermissions(session.userId, ref.organizationId);
        if (!permissions.orgRole) {
          continue; // Skip - no longer a member
        }

        // Get full application details
        const app = await getApplication(ref.organizationId, ref.applicationId);
        if (!app || app.status === 'archived') {
          continue; // Skip - app deleted or archived
        }

        validAppIds.push(ref.applicationId);
        applicationsWithAccess.push({
          ...app,
          lastAccessedAt: ref.lastAccessedAt,
          // Serialize dates
          createdAt: app.createdAt instanceof Date ? app.createdAt : new Date(app.createdAt),
          updatedAt: app.updatedAt instanceof Date ? app.updatedAt : new Date(app.updatedAt),
        });
      } catch (error) {
        // Skip apps that fail to load
        console.warn(`[Recent Apps] Failed to load app ${ref.applicationId}:`, error);
      }
    }

    // Cleanup stale references in background (don't await)
    if (validAppIds.length < recentRefs.length) {
      cleanupStaleReferences(session.userId, validAppIds).catch(err => {
        console.warn('[Recent Apps] Failed to cleanup stale refs:', err);
      });
    }

    // Serialize for JSON response
    const serialized = applicationsWithAccess.map(app => ({
      ...app,
      _id: undefined, // Remove MongoDB ObjectId
      createdAt: app.createdAt.toISOString(),
      updatedAt: app.updatedAt.toISOString(),
      lastAccessedAt: app.lastAccessedAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      applications: serialized,
      total: serialized.length,
    });
  } catch (error) {
    console.error('[Recent Applications API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recent applications' },
      { status: 500 }
    );
  }
}
