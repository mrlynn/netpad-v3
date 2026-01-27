/**
 * Application Lookup by Slug API
 *
 * GET /api/applications/by-slug/:slug
 * Returns the application matching the given slug, across all orgs the user has access to
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getUserOrganizations } from '@/lib/platform/organizations';
import { listAllOrgApplications } from '@/lib/platform/applications';
import { Application } from '@/types/application';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await getSession();

    if (!session.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        { error: 'slug parameter is required' },
        { status: 400 }
      );
    }

    // Get all organizations the user has access to
    const userOrgs = await getUserOrganizations(session.userId);

    if (!userOrgs || userOrgs.length === 0) {
      return NextResponse.json(
        { error: 'No organizations found for user' },
        { status: 404 }
      );
    }

    // Search for the app across all user's orgs
    // Check both active and draft statuses since newly created apps start as draft
    let foundApp: Application | null = null;
    let foundOrgId: string | null = null;

    for (const org of userOrgs) {
      // First try active apps
      let result = await listAllOrgApplications(org.orgId, {
        status: 'active',
        pageSize: 500,
      });

      let app = result.applications.find(a => a.slug === slug);

      // If not found in active, try draft
      if (!app) {
        result = await listAllOrgApplications(org.orgId, {
          status: 'draft',
          pageSize: 500,
        });
        app = result.applications.find(a => a.slug === slug);
      }

      if (app) {
        foundApp = app;
        foundOrgId = org.orgId;
        break;
      }
    }

    if (!foundApp) {
      return NextResponse.json(
        { error: `Application with slug "${slug}" not found` },
        { status: 404 }
      );
    }

    // Serialize dates for JSON response
    const serializedApp = {
      ...foundApp,
      _id: undefined,
      createdAt: foundApp.createdAt instanceof Date ? foundApp.createdAt.toISOString() : foundApp.createdAt,
      updatedAt: foundApp.updatedAt instanceof Date ? foundApp.updatedAt.toISOString() : foundApp.updatedAt,
    };

    return NextResponse.json({
      success: true,
      application: serializedApp,
      organizationId: foundOrgId,
    });
  } catch (error) {
    console.error('[Application by Slug API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to lookup application' },
      { status: 500 }
    );
  }
}
