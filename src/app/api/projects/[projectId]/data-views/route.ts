/**
 * Data Views API
 *
 * GET  /api/projects/[projectId]/data-views - List data views
 * POST /api/projects/[projectId]/data-views - Create data view
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getProject } from '@/lib/platform/projects';
import { getUserOrgPermissions } from '@/lib/platform/permissions';
import { getDataViewsCollection } from '@/lib/platform/db';
import { DataView } from '@/types/platform';
import { ObjectId } from 'mongodb';
import { generateSecureId } from '@/lib/encryption';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * List all data views for a project
 */
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

    const dataViewsCollection = await getDataViewsCollection(project.organizationId);
    const views = await dataViewsCollection
      .find({ projectId })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      views: views.map(v => ({
        _id: v._id?.toString(),
        projectId: v.projectId,
        organizationId: v.organizationId,
        name: v.name,
        slug: v.slug,
        description: v.description,
        source: v.source,
        columns: v.columns,
        permissions: v.permissions,
        workflows: v.workflows,
        settings: v.settings,
        createdBy: v.createdBy,
        createdAt: v.createdAt,
        updatedAt: v.updatedAt,
        version: v.version,
      })),
    });
  } catch (error) {
    console.error('[Data Views API] List error:', error);
    return NextResponse.json(
      { error: 'Failed to list data views' },
      { status: 500 }
    );
  }
}

/**
 * Create a new data view
 */
export async function POST(
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

    // Check permission - need editor or admin role
    const permissions = await getUserOrgPermissions(session.userId, project.organizationId);
    if (!permissions.orgRole || (permissions.orgRole !== 'admin' && permissions.orgRole !== 'owner' && permissions.orgRole !== 'member')) {
      return NextResponse.json(
        { error: 'Insufficient permissions to create data views' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      slug: providedSlug,
      description,
      source,
      columns,
      permissions: viewPermissions,
      workflows,
      settings,
    } = body;

    if (!name || !source || !columns || !Array.isArray(columns) || columns.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: name, source, columns' },
        { status: 400 }
      );
    }

    // Generate slug from name if not provided
    const slug = providedSlug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { error: 'Slug must contain only lowercase letters, numbers, and hyphens' },
        { status: 400 }
      );
    }

    // Validate connection exists and is accessible (without decrypting)
    if (source.connectionId) {
      const { getConnectionVaultCollection } = await import('@/lib/platform/db');
      const vaultCollection = await getConnectionVaultCollection(project.organizationId);
      const vault = await vaultCollection.findOne(
        { vaultId: source.connectionId, status: 'active' },
        { projection: { vaultId: 1, status: 1, database: 1 } } // Don't decrypt, just check existence
      );
      if (!vault) {
        return NextResponse.json(
          { error: 'Connection not found or is not active' },
          { status: 400 }
        );
      }
      // Validate database matches if provided
      if (source.db && vault.database !== source.db) {
        return NextResponse.json(
          { error: `Database mismatch. Connection is configured for database: ${vault.database}` },
          { status: 400 }
        );
      }
    }

    const dataViewsCollection = await getDataViewsCollection(project.organizationId);

    // Check slug uniqueness within project
    const existing = await dataViewsCollection.findOne({
      projectId,
      slug,
    });
    if (existing) {
      return NextResponse.json(
        { error: 'Data view slug already exists in this project' },
        { status: 409 }
      );
    }

    const dataView: DataView = {
      projectId,
      organizationId: project.organizationId,
      name,
      slug,
      description,
      source: {
        connectionId: source.connectionId,
        db: source.db,
        collection: source.collection,
        queryMode: source.queryMode || 'query',
        query: source.query || {},
        pipeline: source.pipeline,
        defaultSort: source.defaultSort,
        defaultLimit: source.defaultLimit || 100,
      },
      columns: columns.map((col: any) => ({
        key: col.key,
        label: col.label || col.key,
        path: col.path || col.key,
        type: col.type || 'string',
        width: col.width,
        pinned: col.pinned || false,
        visible: col.visible !== false,
        editable: col.editable !== false,
        required: col.required || false,
        readOnlyReason: col.readOnlyReason,
        validation: col.validation,
        format: col.format,
        classification: col.classification || 'public',
        group: col.group,
      })),
      permissions: viewPermissions || {
        viewAccess: {
          mode: 'projectRoles',
          roles: ['viewer', 'editor', 'admin'],
        },
        editPolicy: {
          allowRowCreate: false,
          allowRowDelete: false,
          allowJsonEdit: false,
          allowBulkEdit: false,
        },
      },
      workflows,
      settings: settings || {
        patchWritesOnly: true,
        concurrency: {
          mode: 'none',
        },
      },
      createdBy: session.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    };

    const result = await dataViewsCollection.insertOne(dataView);

    return NextResponse.json({
      success: true,
      view: {
        _id: result.insertedId.toString(),
        ...dataView,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('[Data Views API] Create error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create data view' },
      { status: 500 }
    );
  }
}
