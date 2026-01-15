/**
 * Data View Query API
 *
 * POST /api/projects/[projectId]/data-views/[slug]/query - Query rows from a data view
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getProject } from '@/lib/platform/projects';
import { getUserOrgPermissions } from '@/lib/platform/permissions';
import { getDataViewsCollection } from '@/lib/platform/db';
import { getDecryptedConnectionString } from '@/lib/platform/connectionVault';
import { getClient } from '@/lib/mongodb/clientCache';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Query rows from a data view
 */
export async function POST(
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

    // Get connection string from vault
    if (!view.source.connectionId) {
      return NextResponse.json(
        { error: 'Data view source connection not configured' },
        { status: 400 }
      );
    }

    const connectionInfo = await getDecryptedConnectionString(
      project.organizationId,
      view.source.connectionId
    );

    if (!connectionInfo) {
      return NextResponse.json(
        { error: 'Failed to get connection string' },
        { status: 500 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      filter = {},
      sort,
      page = { limit: 50, cursor: null },
      fields,
      includeMeta = false,
    } = body;

    // Get MongoDB client
    const client = await getClient(connectionInfo.connectionString);
    const db = client.db(view.source.db || connectionInfo.database);
    const coll = db.collection(view.source.collection);

    // Build base query from view source
    let baseQuery: any = {};
    if (view.source.queryMode === 'query') {
      baseQuery = view.source.query || {};
    }

    // Merge user filter (whitelist to defined columns only for security)
    const allowedPaths = new Set(view.columns.map(col => col.path));
    const sanitizedFilter: any = {};
    for (const [path, value] of Object.entries(filter)) {
      if (allowedPaths.has(path)) {
        sanitizedFilter[path] = value;
      }
    }
    const finalQuery = { ...baseQuery, ...sanitizedFilter };

    // Build projection from columns
    const projection: any = { _id: 1 };
    const requestedFields = fields || view.columns.filter(col => col.visible).map(col => col.path);
    for (const col of view.columns) {
      if (requestedFields.includes(col.path)) {
        projection[col.path] = 1;
      }
    }

    // Build sort
    let sortObj: any = view.source.defaultSort || { _id: -1 };
    if (sort && Array.isArray(sort)) {
      sortObj = {};
      for (const s of sort) {
        if (allowedPaths.has(s.path)) {
          sortObj[s.path] = s.dir === 'asc' ? 1 : -1;
        }
      }
    }

    // Execute query
    let cursor = coll.find(finalQuery).project(projection).sort(sortObj);

    // Apply pagination
    const limit = Math.min(100, Math.max(1, page.limit || view.source.defaultLimit || 50));
    const skip = page.cursor ? parseInt(page.cursor, 10) : 0;
    cursor = cursor.skip(skip).limit(limit);

    // Execute query and count in parallel
    const [documents, totalCount] = await Promise.all([
      cursor.toArray(),
      coll.countDocuments(finalQuery),
    ]);

    // Add metadata if requested
    let meta: any = undefined;
    if (includeMeta) {
      // Generate etag if concurrency mode is etag
      if (view.settings?.concurrency?.mode === 'etag') {
        // For now, use a simple hash of the document
        // In production, you'd want a proper etag mechanism
        meta = {
          etag: documents.map((doc: any) => {
            const etagPath = view.settings?.concurrency?.etagPath || '_npMeta.etag';
            return doc[etagPath] || 'default';
          }),
        };
      }
    }

    return NextResponse.json({
      success: true,
      documents,
      count: documents.length,
      totalCount,
      page: {
        limit,
        skip,
        hasMore: skip + documents.length < totalCount,
        nextCursor: skip + documents.length < totalCount ? String(skip + documents.length) : null,
      },
      meta,
    });
  } catch (error) {
    console.error('[Data View Query API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to query data view',
      },
      { status: 500 }
    );
  }
}
