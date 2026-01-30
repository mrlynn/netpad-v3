/**
 * Individual Role API
 * 
 * GET    /api/platform/orgs/[orgId]/roles/[roleId] - Get role details
 * PATCH  /api/platform/orgs/[orgId]/roles/[roleId] - Update custom role
 * DELETE /api/platform/orgs/[orgId]/roles/[roleId] - Delete custom role
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPlatformDb } from '@/lib/platform/db';
import { CustomRole, Permission, BUILTIN_ROLE_PERMISSIONS, OrgRole } from '@/types/platform';
import { hasPermission } from '@/lib/platform/rbac';

interface RouteParams {
  params: Promise<{ orgId: string; roleId: string }>;
}

// GET /api/platform/orgs/[orgId]/roles/[roleId]
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orgId, roleId } = await params;
    const db = await getPlatformDb();

    // Check permission
    const canRead = await hasPermission(session.user.id, orgId, 'roles:read');
    if (!canRead) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if it's a builtin role
    if (['owner', 'admin', 'member', 'viewer'].includes(roleId)) {
      return NextResponse.json({
        role: {
          roleId,
          name: roleId.charAt(0).toUpperCase() + roleId.slice(1),
          permissions: BUILTIN_ROLE_PERMISSIONS[roleId as OrgRole],
          isSystem: true,
          type: 'builtin',
        },
      });
    }

    const role = await db.collection<CustomRole>('customRoles').findOne({
      organizationId: orgId,
      roleId,
    });

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    // Get effective permissions (base + explicit)
    let effectivePermissions = [...role.permissions];
    if (role.baseRole) {
      effectivePermissions = [
        ...BUILTIN_ROLE_PERMISSIONS[role.baseRole],
        ...effectivePermissions,
      ];
    }
    effectivePermissions = [...new Set(effectivePermissions)];

    return NextResponse.json({ 
      role: { ...role, type: 'custom' },
      effectivePermissions,
    });
  } catch (error) {
    console.error('Error fetching role:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/platform/orgs/[orgId]/roles/[roleId]
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orgId, roleId } = await params;
    const body = await request.json();
    const { name, description, baseRole, permissions, addPermissions, removePermissions } = body;

    // Cannot modify builtin roles
    if (['owner', 'admin', 'member', 'viewer'].includes(roleId)) {
      return NextResponse.json({ error: 'Cannot modify built-in roles' }, { status: 400 });
    }

    const db = await getPlatformDb();

    // Check permission
    const canUpdate = await hasPermission(session.user.id, orgId, 'roles:update');
    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const role = await db.collection<CustomRole>('customRoles').findOne({
      organizationId: orgId,
      roleId,
    });

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    if (role.isSystem) {
      return NextResponse.json({ error: 'Cannot modify system roles' }, { status: 400 });
    }

    // Build update
    const update: Partial<CustomRole> = {
      updatedAt: new Date(),
    };

    if (name !== undefined) {
      update.name = name.trim();
      update.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }
    if (description !== undefined) {
      update.description = description?.trim() || undefined;
    }
    if (baseRole !== undefined) {
      update.baseRole = baseRole || undefined;
    }

    // Handle permission updates
    let newPermissions = role.permissions;
    if (permissions !== undefined) {
      // Replace entire permission list
      newPermissions = Array.isArray(permissions) ? permissions : [];
    } else {
      // Incremental add/remove
      if (addPermissions && Array.isArray(addPermissions)) {
        newPermissions = [...new Set([...newPermissions, ...addPermissions])];
      }
      if (removePermissions && Array.isArray(removePermissions)) {
        newPermissions = newPermissions.filter(p => !removePermissions.includes(p));
      }
    }
    update.permissions = newPermissions;

    await db.collection<CustomRole>('customRoles').updateOne(
      { organizationId: orgId, roleId },
      { $set: update }
    );

    const updated = await db.collection<CustomRole>('customRoles').findOne({
      organizationId: orgId,
      roleId,
    });

    return NextResponse.json({ role: updated });
  } catch (error) {
    console.error('Error updating role:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/platform/orgs/[orgId]/roles/[roleId]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orgId, roleId } = await params;

    // Cannot delete builtin roles
    if (['owner', 'admin', 'member', 'viewer'].includes(roleId)) {
      return NextResponse.json({ error: 'Cannot delete built-in roles' }, { status: 400 });
    }

    const db = await getPlatformDb();

    // Check permission
    const canDelete = await hasPermission(session.user.id, orgId, 'roles:delete');
    if (!canDelete) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const role = await db.collection<CustomRole>('customRoles').findOne({
      organizationId: orgId,
      roleId,
    });

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    if (role.isSystem) {
      return NextResponse.json({ error: 'Cannot delete system roles' }, { status: 400 });
    }

    // Delete the role
    await db.collection<CustomRole>('customRoles').deleteOne({
      organizationId: orgId,
      roleId,
    });

    // Also clean up any assignments using this role
    await db.collection('roleAssignments').deleteMany({
      organizationId: orgId,
      roleType: 'custom',
      roleId,
    });

    return NextResponse.json({ success: true, deleted: roleId });
  } catch (error) {
    console.error('Error deleting role:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
