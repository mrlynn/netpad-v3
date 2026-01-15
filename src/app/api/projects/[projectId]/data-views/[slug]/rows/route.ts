/**
 * Data View Row Create API
 *
 * POST /api/projects/[projectId]/data-views/[slug]/rows - Create a new row
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getProject } from '@/lib/platform/projects';
import { getUserOrgPermissions } from '@/lib/platform/permissions';
import { getDataViewsCollection, getDataMutationsCollection } from '@/lib/platform/db';
import { getDecryptedConnectionString } from '@/lib/platform/connectionVault';
import { getClient } from '@/lib/mongodb/clientCache';
import { ObjectId } from 'mongodb';
import { findUserById } from '@/lib/platform/users';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Validate a value against column validation rules
 */
function validateValue(column: any, value: any): { valid: boolean; error?: string } {
  if (!column.validation) return { valid: true };

  const validation = column.validation;

  if (column.type === 'string') {
    if (typeof value !== 'string') {
      return { valid: false, error: 'Value must be a string' };
    }
    if (validation.minLen !== undefined && value.length < validation.minLen) {
      return { valid: false, error: `Minimum length is ${validation.minLen}` };
    }
    if (validation.maxLen !== undefined && value.length > validation.maxLen) {
      return { valid: false, error: `Maximum length is ${validation.maxLen}` };
    }
    if (validation.regex) {
      const regex = new RegExp(validation.regex);
      if (!regex.test(value)) {
        return { valid: false, error: 'Value does not match required pattern' };
      }
    }
  }

  if (column.type === 'number') {
    if (typeof value !== 'number') {
      return { valid: false, error: 'Value must be a number' };
    }
    if (validation.min !== undefined && value < validation.min) {
      return { valid: false, error: `Minimum value is ${validation.min}` };
    }
    if (validation.max !== undefined && value > validation.max) {
      return { valid: false, error: `Maximum value is ${validation.max}` };
    }
  }

  if (column.type === 'enum') {
    if (!validation.enum || !validation.enum.includes(value)) {
      return { valid: false, error: `Value must be one of: ${validation.enum.join(', ')}` };
    }
  }

  return { valid: true };
}

/**
 * Create a new row
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

    // Check permission
    const permissions = await getUserOrgPermissions(session.userId, project.organizationId);
    if (!permissions.orgRole || permissions.orgRole === 'viewer') {
      return NextResponse.json(
        { error: 'Insufficient permissions to create rows' },
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

    if (!view.permissions.editPolicy.allowRowCreate) {
      return NextResponse.json(
        { error: 'Row creation is not allowed for this view' },
        { status: 403 }
      );
    }

    // Get user info for audit
    const user = await findUserById(session.userId);

    // Get connection string
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
    const { data, context } = body;

    if (!data || typeof data !== 'object') {
      return NextResponse.json(
        { error: 'Data object is required' },
        { status: 400 }
      );
    }

    // Get MongoDB client
    const client = await getClient(connectionInfo.connectionString);
    const db = client.db(view.source.db || connectionInfo.database);
    const coll = db.collection(view.source.collection);

    // Build document from data, validating required fields
    const newDoc: any = {};

    // Check required columns
    for (const col of view.columns) {
      if (col.required && !data[col.path]) {
        return NextResponse.json(
          { error: `Required field missing: ${col.path}` },
          { status: 400 }
        );
      }

      if (data[col.path] !== undefined) {
        // Validate value
        const validation = validateValue(col, data[col.path]);
        if (!validation.valid) {
          return NextResponse.json(
            { error: `${col.path}: ${validation.error}` },
            { status: 400 }
          );
        }

        // Set value (handle dot notation for nested paths)
        const pathParts = col.path.split('.');
        if (pathParts.length === 1) {
          newDoc[col.path] = data[col.path];
        } else {
          // For nested paths, build object structure
          let current = newDoc;
          for (let i = 0; i < pathParts.length - 1; i++) {
            if (!current[pathParts[i]]) {
              current[pathParts[i]] = {};
            }
            current = current[pathParts[i]];
          }
          current[pathParts[pathParts.length - 1]] = data[col.path];
        }
      }
    }

    // Add metadata
    newDoc._npMeta = {
      createdAt: new Date(),
      createdBy: session.userId,
    };

    // Insert document
    const result = await coll.insertOne(newDoc);

    // Record audit
    const mutationOps = view.columns
      .filter(col => data[col.path] !== undefined)
      .map(col => ({
        op: 'set' as const,
        path: col.path,
        from: undefined,
        to: data[col.path],
      }));

    const dataMutationsCollection = await getDataMutationsCollection(project.organizationId);
    await dataMutationsCollection.insertOne({
      projectId,
      dataViewId: view._id?.toString() || '',
      connectionId: view.source.connectionId,
      db: view.source.db || connectionInfo.database,
      collection: view.source.collection,
      docId: result.insertedId.toString(),
      actor: {
        userId: session.userId,
        email: user?.email,
        role: permissions.orgRole,
      },
      source: context?.source || 'api',
      ops: mutationOps,
      status: 'applied',
      createdAt: new Date(),
    });

    // Return created document (projected to view columns)
    const projection: any = { _id: 1 };
    for (const col of view.columns) {
      if (col.visible) {
        projection[col.path] = 1;
      }
    }
    const createdDoc = await coll.findOne(
      { _id: result.insertedId },
      { projection }
    );

    const projectedDoc: any = { _id: createdDoc?._id };
    for (const col of view.columns) {
      if (col.visible) {
        const value = col.path.split('.').reduce((obj: any, key: string) => obj?.[key], createdDoc);
        projectedDoc[col.path] = value;
      }
    }

    return NextResponse.json({
      success: true,
      row: projectedDoc,
    }, { status: 201 });
  } catch (error) {
    console.error('[Data View Create API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create row',
      },
      { status: 500 }
    );
  }
}
