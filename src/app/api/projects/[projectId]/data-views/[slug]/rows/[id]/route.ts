/**
 * Data View Row Mutation API
 *
 * PATCH  /api/projects/[projectId]/data-views/[slug]/rows/[id] - Patch cell(s) in a row
 * DELETE /api/projects/[projectId]/data-views/[slug]/rows/[id] - Delete a row
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
 * Evaluate if a user can edit a specific path in a data view
 */
function canEditPath(
  view: any,
  userId: string,
  userRole: string,
  path: string
): { allowed: boolean; reason?: string } {
  // Check if path is in columns
  const column = view.columns.find((col: any) => col.path === path);
  if (!column) {
    // If JSON edit is enabled, allow editing paths not in columns
    if (view.permissions.editPolicy.allowJsonEdit && (userRole === 'admin' || userRole === 'owner')) {
      return { allowed: true };
    }
    return { allowed: false, reason: 'Path not in view columns' };
  }

  // Check column editable
  if (!column.editable) {
    return { allowed: false, reason: column.readOnlyReason || 'Column is not editable' };
  }

  // Check field rules
  const fieldRule = view.permissions.fieldRules?.find((rule: any) => rule.path === path);
  if (fieldRule && !fieldRule.editable) {
    // Check if user has override role
    if (fieldRule.allowRoles && fieldRule.allowRoles.includes(userRole as any)) {
      return { allowed: true };
    }
    return { allowed: false, reason: fieldRule.reason || 'Field is restricted' };
  }

  // Check immutable paths
  if (view.permissions.editPolicy.constraints?.immutablePaths?.includes(path)) {
    return { allowed: false, reason: 'Path is immutable' };
  }

  return { allowed: true };
}

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
 * Patch cell(s) in a row
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; slug: string; id: string }> }
) {
  let mutationRecord: any = null;
  try {
    const session = await getSession();
    const { projectId, slug, id } = await params;

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
        { error: 'Insufficient permissions to edit data' },
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
    const { ops, client: clientMeta, context } = body;

    if (!ops || !Array.isArray(ops) || ops.length === 0) {
      return NextResponse.json(
        { error: 'Operations array is required' },
        { status: 400 }
      );
    }

    // Get MongoDB client
    const client = await getClient(connectionInfo.connectionString);
    const db = client.db(view.source.db || connectionInfo.database);
    const coll = db.collection(view.source.collection);

    // Parse document ID
    let docId: any = id;
    try {
      if (ObjectId.isValid(id) && id.length === 24) {
        docId = new ObjectId(id);
      }
    } catch {
      // Keep as string
    }

    // Load current document to track changes
    const currentDoc = await coll.findOne({ _id: docId });
    if (!currentDoc) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Build update operations
    const $set: any = {};
    const $unset: any = {};
    const mutationOps: any[] = [];

    // Process each operation
    for (const op of ops) {
      if (op.op !== 'set' && op.op !== 'unset') {
        return NextResponse.json(
          { error: `Invalid operation: ${op.op}` },
          { status: 400 }
        );
      }

      // Check permission for this path
      const canEdit = canEditPath(view, session.userId, permissions.orgRole || 'viewer', op.path);
      if (!canEdit.allowed) {
        return NextResponse.json(
          { error: canEdit.reason || 'Cannot edit this path' },
          { status: 403 }
        );
      }

      // Find column for validation
      const column = view.columns.find((col: any) => col.path === op.path);
      if (column && op.op === 'set') {
        // Validate value
        const validation = validateValue(column, op.value);
        if (!validation.valid) {
          return NextResponse.json(
            { error: validation.error },
            { status: 400 }
          );
        }
      }

      // Track mutation
      const fromValue = op.path.split('.').reduce((obj: any, key: string) => obj?.[key], currentDoc);
      const toValue = op.op === 'set' ? op.value : undefined;

      mutationOps.push({
        op: op.op,
        path: op.path,
        from: fromValue,
        to: toValue,
      });

      // Build MongoDB update
      if (op.op === 'set') {
        // Handle dot notation for nested paths
        const pathParts = op.path.split('.');
        if (pathParts.length === 1) {
          $set[op.path] = op.value;
        } else {
          // For nested paths, we need to use dot notation in $set
          $set[op.path] = op.value;
        }
      } else {
        $unset[op.path] = '';
      }
    }

    // Build update document
    const updateDoc: any = {};
    if (Object.keys($set).length > 0) {
      updateDoc.$set = $set;
    }
    if (Object.keys($unset).length > 0) {
      updateDoc.$unset = $unset;
    }

    // Apply optimistic concurrency if enabled
    let filter: any = { _id: docId };
    if (view.settings?.concurrency?.mode === 'etag' && clientMeta?.etag) {
      const etagPath = view.settings.concurrency.etagPath || '_npMeta.etag';
      filter[etagPath] = clientMeta.etag;
    }

    // Execute update
    const result = await coll.findOneAndUpdate(
      filter,
      updateDoc,
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json(
        { error: 'Document not found or etag mismatch' },
        { status: 404 }
      );
    }

    // Create audit record
    const dataMutationsCollection = await getDataMutationsCollection(project.organizationId);
    mutationRecord = {
      projectId,
      dataViewId: view._id?.toString() || '',
      connectionId: view.source.connectionId,
      db: view.source.db || connectionInfo.database,
      collection: view.source.collection,
      docId: id,
      actor: {
        userId: session.userId,
        email: user?.email,
        role: permissions.orgRole,
      },
      source: context?.source || 'api',
      ops: mutationOps,
      status: 'applied' as const,
      createdAt: new Date(),
    };

    await dataMutationsCollection.insertOne(mutationRecord);

    // Return updated document (projected to view columns)
    const projection: any = { _id: 1 };
    for (const col of view.columns) {
      if (col.visible) {
        projection[col.path] = 1;
      }
    }
    const projectedDoc: any = { _id: result.value._id };
    for (const col of view.columns) {
      if (col.visible) {
        const value = col.path.split('.').reduce((obj: any, key: string) => obj?.[key], result.value);
        projectedDoc[col.path] = value;
      }
    }

    // Generate new etag if using concurrency
    let meta: any = undefined;
    if (view.settings?.concurrency?.mode === 'etag') {
      const etagPath = view.settings.concurrency.etagPath || '_npMeta.etag';
      meta = {
        etag: result.value[etagPath] || 'default',
      };
    }

    return NextResponse.json({
      success: true,
      row: projectedDoc,
      meta,
    });
  } catch (error) {
    console.error('[Data View Mutation API] Error:', error);

    // Record failed mutation if we have the record
    if (mutationRecord) {
      try {
        const { projectId } = await params;
        const project = await getProject(projectId);
        if (project) {
          const dataMutationsCollection = await getDataMutationsCollection(project.organizationId);
          mutationRecord.status = 'rejected';
          mutationRecord.rejectedReason = error instanceof Error ? error.message : 'Unknown error';
          await dataMutationsCollection.insertOne(mutationRecord);
        }
      } catch (auditError) {
        console.error('[Data View Mutation API] Failed to record audit:', auditError);
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update row',
      },
      { status: 500 }
    );
  }
}

/**
 * Delete a row
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; slug: string; id: string }> }
) {
  try {
    const session = await getSession();
    const { projectId, slug, id } = await params;

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

    // Check permission - need admin for delete
    const permissions = await getUserOrgPermissions(session.userId, project.organizationId);
    if (!permissions.isOrgAdmin) {
      return NextResponse.json(
        { error: 'Only organization admins can delete rows' },
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

    if (!view.permissions.editPolicy.allowRowDelete) {
      return NextResponse.json(
        { error: 'Row deletion is not allowed for this view' },
        { status: 403 }
      );
    }

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

    // Get MongoDB client
    const client = await getClient(connectionInfo.connectionString);
    const db = client.db(view.source.db || connectionInfo.database);
    const coll = db.collection(view.source.collection);

    // Parse document ID
    let docId: any = id;
    try {
      if (ObjectId.isValid(id) && id.length === 24) {
        docId = new ObjectId(id);
      }
    } catch {
      // Keep as string
    }

    // Soft delete (prefer) or hard delete
    const result = await coll.deleteOne({ _id: docId });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Record audit
    const user = await findUserById(session.userId);
    const dataMutationsCollection = await getDataMutationsCollection(project.organizationId);
    await dataMutationsCollection.insertOne({
      projectId,
      dataViewId: view._id?.toString() || '',
      connectionId: view.source.connectionId,
      db: view.source.db || connectionInfo.database,
      collection: view.source.collection,
      docId: id,
      actor: {
        userId: session.userId,
        email: user?.email,
        role: permissions.orgRole || undefined,
      },
      source: 'api',
      ops: [{ op: 'unset', path: '_id' }], // Special marker for delete
      status: 'applied',
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Row deleted successfully',
    });
  } catch (error) {
    console.error('[Data View Delete API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete row',
      },
      { status: 500 }
    );
  }
}
