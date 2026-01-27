/**
 * Application Permissions API (Phase 10)
 *
 * GET    /api/applications/[applicationId]/permissions - List all permissions
 * POST   /api/applications/[applicationId]/permissions - Grant permission
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import {
  listApplicationPermissions,
  grantApplicationPermission,
  checkApplicationPermission,
} from '@/lib/platform/applicationPermissions';
import { findUserById } from '@/lib/platform/users';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    const session = await getSession();
    const { applicationId } = await params;
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

    // Get all permissions
    const permissions = await listApplicationPermissions(orgId, applicationId);

    // Enrich with user information
    const enrichedPermissions = await Promise.all(
      permissions.map(async (perm) => {
        const user = await findUserById(perm.userId);
        const grantedByUser = await findUserById(perm.grantedBy);
        return {
          ...perm,
          userEmail: user?.email,
          userName: user?.displayName || user?.email,
          grantedByName: grantedByUser?.displayName || grantedByUser?.email,
        };
      })
    );

    return NextResponse.json({
      success: true,
      permissions: enrichedPermissions,
    });
  } catch (error: any) {
    console.error('[Application Permissions API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to list permissions', message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    const session = await getSession();
    const { applicationId } = await params;
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

    const body = await request.json();
    const { userId, role } = body;

    if (!userId || !role) {
      return NextResponse.json(
        { error: 'userId and role are required' },
        { status: 400 }
      );
    }

    if (!['owner', 'editor', 'analyst', 'viewer'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be owner, editor, analyst, or viewer' },
        { status: 400 }
      );
    }

    // Grant permission
    const permission = await grantApplicationPermission(
      orgId,
      applicationId,
      userId,
      role,
      session.userId
    );

    // Enrich with user information
    const user = await findUserById(userId);
    const grantedByUser = await findUserById(session.userId);

    return NextResponse.json({
      success: true,
      permission: {
        ...permission,
        userEmail: user?.email,
        userName: user?.displayName || user?.email,
        grantedByName: grantedByUser?.displayName || grantedByUser?.email,
      },
    });
  } catch (error: any) {
    console.error('[Application Permissions API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to grant permission', message: error.message },
      { status: 500 }
    );
  }
}
