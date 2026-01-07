/**
 * Project Details API
 *
 * GET    /api/projects/[projectId] - Get project details
 * PATCH  /api/projects/[projectId] - Update project
 * DELETE /api/projects/[projectId] - Delete project
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import {
  getProject,
  updateProject,
  deleteProject,
} from '@/lib/platform/projects';
import { getUserOrgPermissions } from '@/lib/platform/permissions';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getSession();
    const { projectId } = await params;

    if (!session.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const project = await getProject(projectId);
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Check permission to view org
    const permissions = await getUserOrgPermissions(session.userId, project.organizationId);
    if (!permissions.orgRole) {
      return NextResponse.json(
        { error: 'Not a member of this organization' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      project: {
        projectId: project.projectId,
        organizationId: project.organizationId,
        name: project.name,
        description: project.description,
        slug: project.slug,
        tags: project.tags,
        color: project.color,
        icon: project.icon,
        settings: project.settings,
        stats: project.stats,
        defaultVaultId: project.defaultVaultId, // Include default vault ID
        createdBy: project.createdBy,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      },
    });
  } catch (error) {
    console.error('[Projects API] Get error:', error);
    return NextResponse.json(
      { error: 'Failed to get project' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getSession();
    const { projectId } = await params;

    if (!session.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const project = await getProject(projectId);
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Check permission to update (any org member can update)
    const permissions = await getUserOrgPermissions(session.userId, project.organizationId);
    if (!permissions.orgRole) {
      return NextResponse.json(
        { error: 'Not a member of this organization' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, slug, tags, color, icon, settings } = body;

    const updated = await updateProject(projectId, {
      name,
      description,
      slug,
      tags,
      color,
      icon,
      settings,
    });

    if (!updated) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      project: {
        projectId: updated.projectId,
        organizationId: updated.organizationId,
        name: updated.name,
        description: updated.description,
        slug: updated.slug,
        tags: updated.tags,
        color: updated.color,
        icon: updated.icon,
        settings: updated.settings,
        stats: updated.stats,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error) {
    console.error('[Projects API] Update error:', error);

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
      { error: 'Failed to update project' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getSession();
    const { projectId } = await params;

    if (!session.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const project = await getProject(projectId);
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Check permission to delete (org admins/owners only)
    const permissions = await getUserOrgPermissions(session.userId, project.organizationId);
    if (!permissions.isOrgAdmin) {
      return NextResponse.json(
        { error: 'Only organization admins can delete projects' },
        { status: 403 }
      );
    }

    await deleteProject(projectId);

    return NextResponse.json({
      success: true,
      message: 'Project deleted successfully',
    });
  } catch (error) {
    console.error('[Projects API] Delete error:', error);

    if (error instanceof Error) {
      if (error.message.includes('Cannot delete project')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}
