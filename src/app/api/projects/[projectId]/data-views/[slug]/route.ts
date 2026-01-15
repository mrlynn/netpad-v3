/**
 * Data View API (by slug)
 *
 * GET    /api/projects/[projectId]/data-views/[slug] - Get data view
 * PATCH  /api/projects/[projectId]/data-views/[slug] - Update data view
 * DELETE /api/projects/[projectId]/data-views/[slug] - Delete data view
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getProject } from '@/lib/platform/projects';
import { getUserOrgPermissions } from '@/lib/platform/permissions';
import { getDataViewsCollection } from '@/lib/platform/db';
import { DataView } from '@/types/platform';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Get a data view by slug
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; slug: string }> }
) {
  try {
    const session = await getSession();
    const { projectId, slug } = await params;

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

    const dataViewsCollection = await getDataViewsCollection(project.organizationId);
    const view = await dataViewsCollection.findOne({
      projectId,
      slug,
    });

    if (!view) {
      return NextResponse.json(
        { error: 'Data view not found' },
        { status: 404 }
      );
    }

    // Derive user capabilities based on permissions
    const canEdit = permissions.isOrgAdmin || permissions.orgRole === 'member';
    const canJsonEdit = permissions.isOrgAdmin && (view.permissions.editPolicy.allowJsonEdit || false);
    
    // Determine writable paths (columns that are editable and not blocked by field rules)
    const writablePaths = view.columns
      .filter(col => {
        if (!col.editable) return false;
        // Check field rules
        const fieldRule = view.permissions.fieldRules?.find(rule => rule.path === col.path);
        if (fieldRule && !fieldRule.editable) return false;
        // Check immutable paths
        if (view.permissions.editPolicy.constraints?.immutablePaths?.includes(col.path)) return false;
        return true;
      })
      .map(col => col.path);

    return NextResponse.json({
      success: true,
      view: {
        _id: view._id?.toString(),
        projectId: view.projectId,
        organizationId: view.organizationId,
        name: view.name,
        slug: view.slug,
        description: view.description,
        source: view.source,
        columns: view.columns,
        permissions: view.permissions,
        workflows: view.workflows,
        settings: view.settings,
        createdBy: view.createdBy,
        createdAt: view.createdAt,
        updatedAt: view.updatedAt,
        version: view.version,
      },
      capabilities: {
        canEdit,
        canJsonEdit,
        writablePaths,
        maskedColumns: view.columns
          .filter(col => col.classification === 'sensitive' && view.settings?.masking?.enabled)
          .map(col => col.key),
      },
    });
  } catch (error) {
    console.error('[Data Views API] Get error:', error);
    return NextResponse.json(
      { error: 'Failed to get data view' },
      { status: 500 }
    );
  }
}

/**
 * Update a data view
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; slug: string }> }
) {
  try {
    const session = await getSession();
    const { projectId, slug } = await params;

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

    // Check permission - need editor or admin role
    const permissions = await getUserOrgPermissions(session.userId, project.organizationId);
    if (!permissions.orgRole || (permissions.orgRole !== 'admin' && permissions.orgRole !== 'owner' && permissions.orgRole !== 'member')) {
      return NextResponse.json(
        { error: 'Insufficient permissions to update data views' },
        { status: 403 }
      );
    }

    const dataViewsCollection = await getDataViewsCollection(project.organizationId);
    const existing = await dataViewsCollection.findOne({
      projectId,
      slug,
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Data view not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const update: Partial<DataView> = {
      updatedAt: new Date(),
      version: (existing.version || 1) + 1,
    };

    if (body.name !== undefined) update.name = body.name;
    if (body.description !== undefined) update.description = body.description;
    if (body.source !== undefined) update.source = body.source;
    if (body.columns !== undefined) update.columns = body.columns;
    if (body.permissions !== undefined) update.permissions = body.permissions;
    if (body.workflows !== undefined) update.workflows = body.workflows;
    if (body.settings !== undefined) update.settings = body.settings;

    // If slug is being changed, check uniqueness
    if (body.slug && body.slug !== slug) {
      const slugCheck = await dataViewsCollection.findOne({
        projectId,
        slug: body.slug,
      });
      if (slugCheck) {
        return NextResponse.json(
          { error: 'Slug already exists in this project' },
          { status: 409 }
        );
      }
      update.slug = body.slug;
    }

    const result = await dataViewsCollection.updateOne(
      { projectId, slug },
      { $set: update }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Data view not found' },
        { status: 404 }
      );
    }

    const updated = await dataViewsCollection.findOne({
      projectId,
      slug: update.slug || slug,
    });

    return NextResponse.json({
      success: true,
      view: {
        _id: updated?._id?.toString(),
        projectId: updated?.projectId,
        organizationId: updated?.organizationId,
        name: updated?.name,
        slug: updated?.slug,
        description: updated?.description,
        source: updated?.source,
        columns: updated?.columns,
        permissions: updated?.permissions,
        workflows: updated?.workflows,
        settings: updated?.settings,
        createdBy: updated?.createdBy,
        createdAt: updated?.createdAt,
        updatedAt: updated?.updatedAt,
        version: updated?.version,
      },
    });
  } catch (error) {
    console.error('[Data Views API] Update error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update data view' },
      { status: 500 }
    );
  }
}

/**
 * Delete a data view
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; slug: string }> }
) {
  try {
    const session = await getSession();
    const { projectId, slug } = await params;

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

    // Check permission - need admin or owner
    const permissions = await getUserOrgPermissions(session.userId, project.organizationId);
    if (!permissions.isOrgAdmin) {
      return NextResponse.json(
        { error: 'Only organization admins can delete data views' },
        { status: 403 }
      );
    }

    const dataViewsCollection = await getDataViewsCollection(project.organizationId);
    const result = await dataViewsCollection.deleteOne({
      projectId,
      slug,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Data view not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Data view deleted successfully',
    });
  } catch (error) {
    console.error('[Data Views API] Delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete data view' },
      { status: 500 }
    );
  }
}
