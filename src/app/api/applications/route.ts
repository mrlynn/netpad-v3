/**
 * Applications API
 *
 * GET  /api/applications?orgId=xxx&projectId=xxx - List applications for project
 * POST /api/applications - Create new application
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import {
  createApplication,
  listApplications,
  listAllOrgApplications,
  ensureDefaultApplication,
} from '@/lib/platform/applications';
import { getUserOrgPermissions } from '@/lib/platform/permissions';
import { getProject } from '@/lib/platform/projects';
import { getUserApplications } from '@/lib/platform/applicationPermissions';
import { withTiming } from '@/lib/performance';

export const dynamic = 'force-dynamic';

export const GET = withTiming(async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');
    const projectId = searchParams.get('projectId');

    if (!orgId) {
      return NextResponse.json(
        { error: 'orgId query parameter is required' },
        { status: 400 }
      );
    }

    // Check permission to view org
    const permissions = await getUserOrgPermissions(session.userId, orgId);
    if (!permissions.orgRole) {
      return NextResponse.json(
        { error: 'Not a member of this organization' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const sortBy = searchParams.get('sortBy') || 'updatedAt';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') as 'draft' | 'active' | 'archived' | undefined;

    let result;

    if (projectId) {
      // Project-specific: Verify project exists and belongs to org
      const project = await getProject(projectId);
      if (!project || project.organizationId !== orgId) {
        return NextResponse.json(
          { error: 'Project not found or does not belong to this organization' },
          { status: 404 }
        );
      }

      // Get applications for the specific project
      result = await listApplications(orgId, projectId, {
        page,
        pageSize,
        sortBy: sortBy as 'name' | 'createdAt' | 'updatedAt',
        sortOrder,
        search,
        status,
      });
    } else {
      // Org-wide: Get all applications across all projects (for App Switcher)
      result = await listAllOrgApplications(orgId, {
        page,
        pageSize,
        sortBy: sortBy as 'name' | 'createdAt' | 'updatedAt',
        sortOrder,
        search,
        status,
      });
    }

    // Filter by permissions (Phase 10)
    // Platform admins and org owners/admins see all applications
    if (!permissions.isOrgAdmin && !permissions.isPlatformAdmin) {
      // For regular members, filter to only applications they can access
      const accessibleApplicationIds = await getUserApplications(session.userId, orgId);
      result = {
        ...result,
        applications: result.applications.filter((app: any) =>
          accessibleApplicationIds.includes(app.applicationId)
        ),
        total: result.applications.filter((app: any) =>
          accessibleApplicationIds.includes(app.applicationId)
        ).length,
      };
    }

    // Debug logging
    console.log('[API /applications] Query params:', { orgId, projectId, page, pageSize, sortBy, sortOrder, search, status });
    console.log('[API /applications] Result:', {
      total: result.total,
      applicationsCount: result.applications.length,
      applicationIds: result.applications.map((a: any) => a.applicationId),
    });

    // Serialize dates to ISO strings for JSON response
    const serializedApplications = result.applications.map((app: any) => ({
      ...app,
      createdAt: app.createdAt instanceof Date ? app.createdAt.toISOString() : app.createdAt,
      updatedAt: app.updatedAt instanceof Date ? app.updatedAt.toISOString() : app.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      applications: serializedApplications,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    });
  } catch (error) {
    console.error('[Applications API] List error:', error);
    return NextResponse.json(
      { error: 'Failed to list applications' },
      { status: 500 }
    );
  }
});

export const POST = withTiming(async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      projectId,
      organizationId,
      name,
      description,
      slug,
      icon,
      color,
      version,
      tags,
      isDefault,
    } = body;

    if (!projectId || !organizationId || !name) {
      return NextResponse.json(
        { error: 'projectId, organizationId, and name are required' },
        { status: 400 }
      );
    }

    // Check permission to create applications
    const permissions = await getUserOrgPermissions(session.userId, organizationId);
    if (!permissions.orgRole) {
      return NextResponse.json(
        { error: 'Not a member of this organization' },
        { status: 403 }
      );
    }

    // Verify project exists and belongs to org
    const project = await getProject(projectId);
    if (!project || project.organizationId !== organizationId) {
      return NextResponse.json(
        { error: 'Project not found or does not belong to this organization' },
        { status: 404 }
      );
    }

    // Validate slug if provided
    if (slug && !/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { error: 'Slug must contain only lowercase letters, numbers, and hyphens' },
        { status: 400 }
      );
    }

    // Prevent creating default applications via API (only system can create them)
    if (isDefault) {
      return NextResponse.json(
        { error: 'Cannot create default applications via API' },
        { status: 400 }
      );
    }

    const application = await createApplication({
      projectId,
      organizationId,
      name,
      description,
      slug,
      icon,
      color,
      version,
      tags,
      createdBy: session.userId,
    });

    return NextResponse.json({
      success: true,
      application: {
        applicationId: application.applicationId,
        projectId: application.projectId,
        organizationId: application.organizationId,
        name: application.name,
        description: application.description,
        slug: application.slug,
        icon: application.icon,
        color: application.color,
        version: application.version,
        tags: application.tags,
        stats: application.stats,
        status: application.status,
        isDefault: application.isDefault,
        createdAt: application.createdAt,
        updatedAt: application.updatedAt,
      },
    });
  } catch (error) {
    console.error('[Applications API] Create error:', error);

    if (error instanceof Error) {
      if (
        error.message.includes('already exists') ||
        error.message.includes('Slug must contain')
      ) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to create application' },
      { status: 500 }
    );
  }
});
