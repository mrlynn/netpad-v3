/**
 * Platform Admin Roles API
 * 
 * GET /api/admin/roles - List all roles across all organizations
 * 
 * Platform admins can view and manage roles across the entire platform.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getPlatformDb } from '@/lib/platform/db';
import { isInstanceAdmin } from '@/lib/platform/instanceAdmin';
import { CustomRole, Organization } from '@/types/platform';
import { Filter } from 'mongodb';

// Built-in roles that exist for every org
const BUILTIN_ROLES = [
  { roleId: 'owner', name: 'Owner', type: 'builtin' as const, description: 'Full control over the organization' },
  { roleId: 'admin', name: 'Admin', type: 'builtin' as const, description: 'Manage members, forms, and settings' },
  { roleId: 'member', name: 'Member', type: 'builtin' as const, description: 'Create and manage own forms' },
  { roleId: 'viewer', name: 'Viewer', type: 'builtin' as const, description: 'View-only access' },
];

// GET /api/admin/roles - List all roles (platform admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is instance admin
    const isAdmin = await isInstanceAdmin(session.userId);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Instance admin access required' }, { status: 403 });
    }

    const db = await getPlatformDb();

    // Get query params
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');
    const type = searchParams.get('type'); // 'builtin' | 'custom'
    const search = searchParams.get('search');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query for custom roles
    const query: Filter<CustomRole> = {};
    if (orgId) {
      query.organizationId = orgId;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Fetch custom roles with pagination
    const [customRoles, totalCustom] = await Promise.all([
      db.collection<CustomRole>('customRoles')
        .find(query)
        .sort({ name: 1 })
        .skip(offset)
        .limit(limit)
        .toArray(),
      db.collection<CustomRole>('customRoles').countDocuments(query),
    ]);

    // Get unique org IDs and fetch org names
    const orgIds = [...new Set(customRoles.map((r) => r.organizationId))];
    const orgs = await db.collection<Organization>('organizations')
      .find({ orgId: { $in: orgIds } })
      .project({ orgId: 1, name: 1 })
      .toArray();
    const orgMap = new Map(orgs.map((o) => [o.orgId, o.name]));

    // Enrich custom roles with org names
    const enrichedCustomRoles = customRoles.map((r) => ({
      ...r,
      type: 'custom' as const,
      organizationName: orgMap.get(r.organizationId) || 'Unknown',
    }));

    // Response based on type filter
    if (type === 'builtin') {
      return NextResponse.json({
        roles: BUILTIN_ROLES,
        total: BUILTIN_ROLES.length,
        limit,
        offset: 0,
      });
    }

    if (type === 'custom') {
      return NextResponse.json({
        roles: enrichedCustomRoles,
        total: totalCustom,
        limit,
        offset,
      });
    }

    // Return both builtin and custom
    return NextResponse.json({
      builtinRoles: BUILTIN_ROLES,
      customRoles: enrichedCustomRoles,
      total: BUILTIN_ROLES.length + totalCustom,
      totalCustom,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error listing platform roles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
