/**
 * Organization Roles API
 * 
 * GET  /api/platform/orgs/[orgId]/roles - List all roles (builtin + custom)
 * POST /api/platform/orgs/[orgId]/roles - Create a custom role
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';

import { getPlatformDb } from '@/lib/platform/db';
import { generateId } from '@/lib/utils/ids';
import { 
  CustomRole, 
  OrgRole, 
  BUILTIN_ROLE_PERMISSIONS,
  Permission,
} from '@/types/platform';
import { hasPermission } from '@/lib/platform/rbac';

interface RouteParams {
  params: Promise<{ orgId: string }>;
}

// Built-in roles for listing
const BUILTIN_ROLES: Array<{ roleId: OrgRole; name: string; description: string; isSystem: true }> = [
  { roleId: 'owner', name: 'Owner', description: 'Full control over the organization', isSystem: true },
  { roleId: 'admin', name: 'Admin', description: 'Manage members, forms, and settings', isSystem: true },
  { roleId: 'member', name: 'Member', description: 'Create and manage own forms', isSystem: true },
  { roleId: 'viewer', name: 'Viewer', description: 'View-only access', isSystem: true },
];

// GET /api/platform/orgs/[orgId]/roles
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orgId } = await params;
    const db = await getPlatformDb();

    // Check permission
    const canRead = await hasPermission(session.userId, orgId, 'roles:read');
    if (!canRead) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get custom roles
    const customRoles = await db.collection<CustomRole>('customRoles')
      .find({ organizationId: orgId })
      .sort({ name: 1 })
      .toArray();

    // Combine with built-in roles
    const roles = [
      ...BUILTIN_ROLES.map(r => ({
        ...r,
        permissions: BUILTIN_ROLE_PERMISSIONS[r.roleId],
        type: 'builtin' as const,
      })),
      ...customRoles.map(r => ({
        ...r,
        type: 'custom' as const,
      })),
    ];

    return NextResponse.json({ roles });
  } catch (error) {
    console.error('Error listing roles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/platform/orgs/[orgId]/roles
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orgId } = await params;
    const body = await request.json();
    const { name, description, baseRole, permissions } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const db = await getPlatformDb();

    // Check permission
    const canCreate = await hasPermission(session.userId, orgId, 'roles:create');
    if (!canCreate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Generate slug from name
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    // Check for duplicate
    const existing = await db.collection<CustomRole>('customRoles').findOne({
      organizationId: orgId,
      $or: [{ slug }, { name }],
    });
    if (existing) {
      return NextResponse.json({ error: 'A role with this name already exists' }, { status: 409 });
    }

    // Validate permissions
    const validPermissions = Array.isArray(permissions) 
      ? permissions.filter((p): p is Permission => typeof p === 'string')
      : [];

    const now = new Date();
    const role: CustomRole = {
      roleId: generateId('role'),
      organizationId: orgId,
      name: name.trim(),
      slug,
      description: description?.trim() || undefined,
      baseRole: baseRole || undefined,
      permissions: validPermissions,
      isSystem: false,
      createdBy: session.userId,
      createdAt: now,
      updatedAt: now,
    };

    await db.collection<CustomRole>('customRoles').insertOne(role);

    return NextResponse.json({ role }, { status: 201 });
  } catch (error) {
    console.error('Error creating role:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
