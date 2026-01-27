/**
 * Application Permission Management API (Phase 10)
 *
 * PATCH  /api/applications/[applicationId]/permissions/[permissionId] - Update permission
 * DELETE /api/applications/[applicationId]/permissions/[permissionId] - Revoke permission
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import {
  updateApplicationPermission,
  revokeApplicationPermission,
  checkApplicationPermission,
  getApplicationPermission,
} from '@/lib/platform/applicationPermissions';
import { getOrgDb } from '@/lib/platform/db';
import { ApplicationPermission } from '@/types/application';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string; permissionId: string }> }
) {
  try {
    const session = await getSession();
    const { applicationId, permissionId } = await params;
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');

    if (!session.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!orgId) {
      return NextResponse.json(
        { error: 'orgId query parameter is required' },
        { status: 400 }
      );
    }

    // Check permission to manage permissions
    const permissionCheck = await checkApplicationPermission(
      session.userId,
      orgId,
      applicationId,
      'manage_permissions'
    );

    if (!permissionCheck.allowed) {
      return NextResponse.json(
        { error: 'Insufficient permissions', reason: permissionCheck.reason },
        { status: 403 }
      );
    }

    // Get the permission to find userId
    const db = await getOrgDb(orgId);
    const collection = db.collection<ApplicationPermission>('application_permissions');
    const permission = await collection.findOne({ permissionId });

    if (!permission) {
      return NextResponse.json(
        { error: 'Permission not found' },
        { status: 404 }
      );
    }

    if (permission.applicationId !== applicationId) {
      return NextResponse.json(
        { error: 'Permission does not belong to this application' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { role } = body;

    if (!role) {
      return NextResponse.json(
        { error: 'role is required' },
        { status: 400 }
      );
    }

    if (!['owner', 'editor', 'analyst', 'viewer'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be owner, editor, analyst, or viewer' },
        { status: 400 }
      );
    }

    // Update permission
    const updated = await updateApplicationPermission(
      orgId,
      applicationId,
      permission.userId,
      role
    );

    return NextResponse.json({
      success: true,
      permission: updated,
    });
  } catch (error: any) {
    console.error('[Application Permission API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update permission', message: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string; permissionId: string }> }
) {
  try {
    const session = await getSession();
    const { applicationId, permissionId } = await params;
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');

    if (!session.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!orgId) {
      return NextResponse.json(
        { error: 'orgId query parameter is required' },
        { status: 400 }
      );
    }

    // Check permission to manage permissions
    const permissionCheck = await checkApplicationPermission(
      session.userId,
      orgId,
      applicationId,
      'manage_permissions'
    );

    if (!permissionCheck.allowed) {
      return NextResponse.json(
        { error: 'Insufficient permissions', reason: permissionCheck.reason },
        { status: 403 }
      );
    }

    // Get the permission to find userId
    const db = await getOrgDb(orgId);
    const collection = db.collection<ApplicationPermission>('application_permissions');
    const permission = await collection.findOne({ permissionId });

    if (!permission) {
      return NextResponse.json(
        { error: 'Permission not found' },
        { status: 404 }
      );
    }

    if (permission.applicationId !== applicationId) {
      return NextResponse.json(
        { error: 'Permission does not belong to this application' },
        { status: 400 }
      );
    }

    // Revoke permission
    await revokeApplicationPermission(orgId, applicationId, permission.userId);

    return NextResponse.json({
      success: true,
      message: 'Permission revoked',
    });
  } catch (error: any) {
    console.error('[Application Permission API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to revoke permission', message: error.message },
      { status: 500 }
    );
  }
}
