/**
 * Platform Admin Assignments API
 * 
 * GET /api/admin/assignments - List all role assignments across all organizations
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getPlatformDb } from '@/lib/platform/db';
import { isInstanceAdmin } from '@/lib/platform/instanceAdmin';
import { RoleAssignment, Organization, PlatformUser, OrgGroup, CustomRole } from '@/types/platform';
import { Filter } from 'mongodb';

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
    const targetType = searchParams.get('targetType');
    const roleType = searchParams.get('roleType');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    const query: Filter<RoleAssignment> = {};
    if (orgId) query.organizationId = orgId;
    if (targetType) query.targetType = targetType as 'user' | 'group';
    if (roleType) query.roleType = roleType as 'builtin' | 'custom';

    // Fetch assignments with pagination
    const [assignments, total] = await Promise.all([
      db.collection<RoleAssignment>('roleAssignments')
        .find(query)
        .sort({ grantedAt: -1 })
        .skip(offset)
        .limit(limit)
        .toArray(),
      db.collection<RoleAssignment>('roleAssignments').countDocuments(query),
    ]);

    // Get unique org IDs for enrichment
    const orgIds = [...new Set(assignments.map(a => a.organizationId))];
    const orgs = await db.collection<Organization>('organizations')
      .find({ orgId: { $in: orgIds } })
      .project({ orgId: 1, name: 1 })
      .toArray();
    const orgMap = new Map(orgs.map(o => [o.orgId, o.name]));

    // Get user IDs for enrichment
    const userIds = [
      ...new Set([
        ...assignments.filter(a => a.targetType === 'user').map(a => a.targetId),
        ...assignments.map(a => a.grantedBy),
      ]),
    ];
    const users = await db.collection<PlatformUser>('users')
      .find({ userId: { $in: userIds } })
      .project({ userId: 1, email: 1, displayName: 1 })
      .toArray();
    const userMap = new Map(users.map(u => [u.userId, { email: u.email, displayName: u.displayName }]));

    // Get group IDs for enrichment
    const groupIds = assignments.filter(a => a.targetType === 'group').map(a => a.targetId);
    const groups = await db.collection<OrgGroup>('groups')
      .find({ groupId: { $in: groupIds } })
      .project({ groupId: 1, name: 1 })
      .toArray();
    const groupMap = new Map(groups.map(g => [g.groupId, g.name]));

    // Get custom role names
    const customRoleIds = assignments.filter(a => a.roleType === 'custom').map(a => a.roleId);
    const customRoles = await db.collection<CustomRole>('customRoles')
      .find({ roleId: { $in: customRoleIds } })
      .project({ roleId: 1, name: 1 })
      .toArray();
    const roleMap = new Map(customRoles.map(r => [r.roleId, r.name]));

    // Enrich assignments
    const enrichedAssignments = assignments.map(a => ({
      ...a,
      organizationName: orgMap.get(a.organizationId) || 'Unknown',
      targetName: a.targetType === 'user' 
        ? userMap.get(a.targetId)?.displayName || userMap.get(a.targetId)?.email?.split('@')[0]
        : groupMap.get(a.targetId),
      targetEmail: a.targetType === 'user' ? userMap.get(a.targetId)?.email : undefined,
      roleName: a.roleType === 'builtin' 
        ? a.roleId.charAt(0).toUpperCase() + a.roleId.slice(1)
        : roleMap.get(a.roleId) || a.roleId,
      grantedByName: userMap.get(a.grantedBy)?.displayName || userMap.get(a.grantedBy)?.email,
    }));

    return NextResponse.json({
      assignments: enrichedAssignments,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error listing platform assignments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
