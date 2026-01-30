/**
 * Role Assignments API
 * 
 * GET    /api/platform/orgs/[orgId]/assignments - List assignments
 * POST   /api/platform/orgs/[orgId]/assignments - Create assignment
 * DELETE /api/platform/orgs/[orgId]/assignments - Remove assignment
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';

import { getPlatformDb } from '@/lib/platform/db';
import { RoleAssignment } from '@/types/platform';
import { hasPermission, assignRole, removeRoleAssignment } from '@/lib/platform/rbac';

interface RouteParams {
  params: Promise<{ orgId: string }>;
}

// GET /api/platform/orgs/[orgId]/assignments
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orgId } = await params;
    const { searchParams } = new URL(request.url);
    
    // Optional filters
    const targetType = searchParams.get('targetType'); // 'user' or 'group'
    const targetId = searchParams.get('targetId');
    const roleId = searchParams.get('roleId');

    const db = await getPlatformDb();

    // Check permission
    const canRead = await hasPermission(session.userId, orgId, 'roles:read');
    if (!canRead) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Build query
    const query: Record<string, unknown> = { organizationId: orgId };
    if (targetType) query.targetType = targetType;
    if (targetId) query.targetId = targetId;
    if (roleId) query.roleId = roleId;

    const assignments = await db.collection<RoleAssignment>('roleAssignments')
      .find(query)
      .sort({ grantedAt: -1 })
      .toArray();

    return NextResponse.json({ assignments });
  } catch (error) {
    console.error('Error listing assignments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/platform/orgs/[orgId]/assignments
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orgId } = await params;
    const body = await request.json();
    const { targetType, targetId, roleType, roleId, scope, expiresAt, reason } = body;

    // Validate required fields
    if (!targetType || !['user', 'group'].includes(targetType)) {
      return NextResponse.json({ error: 'Invalid targetType (must be "user" or "group")' }, { status: 400 });
    }
    if (!targetId) {
      return NextResponse.json({ error: 'targetId is required' }, { status: 400 });
    }
    if (!roleType || !['builtin', 'custom'].includes(roleType)) {
      return NextResponse.json({ error: 'Invalid roleType (must be "builtin" or "custom")' }, { status: 400 });
    }
    if (!roleId) {
      return NextResponse.json({ error: 'roleId is required' }, { status: 400 });
    }

    const db = await getPlatformDb();

    // Check permission
    const canAssign = await hasPermission(session.userId, orgId, 'roles:assign');
    if (!canAssign) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Validate target exists
    if (targetType === 'user') {
      const user = await db.collection('users').findOne({ userId: targetId });
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
    } else {
      const group = await db.collection('groups').findOne({ 
        organizationId: orgId, 
        groupId: targetId 
      });
      if (!group) {
        return NextResponse.json({ error: 'Group not found' }, { status: 404 });
      }
    }

    // Validate role exists
    if (roleType === 'builtin') {
      if (!['owner', 'admin', 'member', 'viewer'].includes(roleId)) {
        return NextResponse.json({ error: 'Invalid builtin role' }, { status: 400 });
      }
    } else {
      const customRole = await db.collection('customRoles').findOne({
        organizationId: orgId,
        roleId,
      });
      if (!customRole) {
        return NextResponse.json({ error: 'Custom role not found' }, { status: 404 });
      }
    }

    // Check for duplicate assignment
    const existingQuery: Record<string, unknown> = {
      organizationId: orgId,
      targetType,
      targetId,
      roleId,
    };
    if (scope?.resourceId) {
      existingQuery['scope.resourceId'] = scope.resourceId;
    } else {
      existingQuery.scope = { $exists: false };
    }
    
    const existing = await db.collection<RoleAssignment>('roleAssignments').findOne(existingQuery);
    if (existing) {
      return NextResponse.json({ error: 'This role is already assigned' }, { status: 409 });
    }

    // Create assignment
    const assignment = await assignRole(
      orgId,
      targetType,
      targetId,
      roleType,
      roleId,
      session.userId,
      {
        scope,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        reason,
      }
    );

    return NextResponse.json({ assignment }, { status: 201 });
  } catch (error) {
    console.error('Error creating assignment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/platform/orgs/[orgId]/assignments
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orgId } = await params;
    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get('assignmentId');

    if (!assignmentId) {
      return NextResponse.json({ error: 'assignmentId is required' }, { status: 400 });
    }

    // Check permission
    const canAssign = await hasPermission(session.userId, orgId, 'roles:assign');
    if (!canAssign) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const deleted = await removeRoleAssignment(orgId, assignmentId);

    if (!deleted) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, deleted: assignmentId });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
