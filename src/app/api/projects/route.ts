/**
 * Projects API
 *
 * GET  /api/projects?orgId=xxx - List projects for organization
 * POST /api/projects - Create new project
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import {
  createProject,
  listProjects,
} from '@/lib/platform/projects';
import { getUserOrgPermissions } from '@/lib/platform/permissions';

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
    const tags = searchParams.get('tags')?.split(',').filter(Boolean) || undefined;

    const result = await listProjects(orgId, {
      page,
      pageSize,
      sortBy: sortBy as 'name' | 'createdAt' | 'updatedAt' | 'lastActivityAt',
      sortOrder,
      search,
      tags,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Projects API] List error:', error);
    return NextResponse.json(
      { error: 'Failed to list projects' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { organizationId, name, description, slug, environment, tags, color, icon, settings } = body;

    if (!organizationId || !name) {
      return NextResponse.json(
        { error: 'organizationId and name are required' },
        { status: 400 }
      );
    }

    // Check permission to create projects (any org member can create)
    const permissions = await getUserOrgPermissions(session.userId, organizationId);
    if (!permissions.orgRole) {
      return NextResponse.json(
        { error: 'Not a member of this organization' },
        { status: 403 }
      );
    }

    // Validate slug if provided
    if (slug && !/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { error: 'Slug must contain only lowercase letters, numbers, and hyphens' },
        { status: 400 }
      );
    }

    const project = await createProject({
      organizationId,
      name,
      description,
      slug,
      environment: environment || 'dev',
      tags,
      color,
      icon,
      settings,
      createdBy: session.userId,
    });

    return NextResponse.json({
      success: true,
      project: {
        projectId: project.projectId,
        organizationId: project.organizationId,
        name: project.name,
        description: project.description,
        slug: project.slug,
        tags: project.tags,
        color: project.color,
        icon: project.icon,
        stats: project.stats,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      },
    });
  } catch (error) {
    console.error('[Projects API] Create error:', error);

    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}
