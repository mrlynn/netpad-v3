/**
 * Grouped Applications API
 *
 * GET /api/applications/grouped?orgId=X
 * Returns applications grouped by project for the app switcher UI
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { listAllOrgApplications } from '@/lib/platform/applications';
import { getUserOrgPermissions } from '@/lib/platform/permissions';
import { getUserApplications } from '@/lib/platform/applicationPermissions';
import { getProject, listProjects } from '@/lib/platform/projects';
import { Application } from '@/types/application';

interface ProjectGroup {
  project: {
    id: string;
    name: string;
    slug?: string;
  };
  applications: Application[];
}

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
    const orgId = searchParams.get('orgId');
    const status = searchParams.get('status') as 'draft' | 'active' | 'archived' | undefined;

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

    // Get all applications for the organization
    let result = await listAllOrgApplications(orgId, {
      pageSize: 500, // High limit for switcher
      status: status || 'active',
      sortBy: 'name',
      sortOrder: 'asc',
    });

    // Filter by permissions (Phase 10)
    if (!permissions.isOrgAdmin && !permissions.isPlatformAdmin) {
      const accessibleApplicationIds = await getUserApplications(session.userId, orgId);
      result = {
        ...result,
        applications: result.applications.filter((app: Application) =>
          accessibleApplicationIds.includes(app.applicationId)
        ),
        total: result.applications.filter((app: Application) =>
          accessibleApplicationIds.includes(app.applicationId)
        ).length,
      };
    }

    // Get all projects for the org to include project metadata
    const projectsResult = await listProjects(orgId, { pageSize: 100 });
    const projectsMap = new Map(
      projectsResult.projects.map(p => [p.projectId, p])
    );

    // Group applications by project
    const groupsMap = new Map<string, ProjectGroup>();
    const ungrouped: Application[] = [];

    for (const app of result.applications) {
      const project = projectsMap.get(app.projectId);

      if (!project) {
        ungrouped.push(app);
        continue;
      }

      if (!groupsMap.has(app.projectId)) {
        groupsMap.set(app.projectId, {
          project: {
            id: project.projectId,
            name: project.name,
            slug: project.slug,
          },
          applications: [],
        });
      }

      groupsMap.get(app.projectId)!.applications.push(app);
    }

    // Convert to array and sort groups by project name
    const groups = Array.from(groupsMap.values()).sort((a, b) =>
      a.project.name.localeCompare(b.project.name)
    );

    // Serialize dates for JSON response
    const serializeApp = (app: Application) => ({
      ...app,
      _id: undefined,
      createdAt: app.createdAt instanceof Date ? app.createdAt.toISOString() : app.createdAt,
      updatedAt: app.updatedAt instanceof Date ? app.updatedAt.toISOString() : app.updatedAt,
    });

    const serializedGroups = groups.map(group => ({
      ...group,
      applications: group.applications.map(serializeApp),
    }));

    const serializedUngrouped = ungrouped.map(serializeApp);

    return NextResponse.json({
      success: true,
      groups: serializedGroups,
      ungrouped: serializedUngrouped,
      total: result.total,
    });
  } catch (error) {
    console.error('[Grouped Applications API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch grouped applications' },
      { status: 500 }
    );
  }
}
