/**
 * Member Permissions API
 * 
 * GET /api/platform/orgs/[orgId]/members/[memberId]/permissions
 * Returns effective permissions for a member, including sources.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { hasPermission, getEffectivePermissions } from '@/lib/platform/rbac';

interface RouteParams {
  params: Promise<{ orgId: string; memberId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orgId, memberId } = await params;

    // Check permission (either viewing own permissions or has roles:read)
    const isSelf = session.userId === memberId;
    const canReadRoles = await hasPermission(session.userId, orgId, 'roles:read');
    
    if (!isSelf && !canReadRoles) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get effective permissions
    const effective = await getEffectivePermissions(memberId, orgId);

    return NextResponse.json({
      userId: memberId,
      organizationId: orgId,
      permissions: effective.permissions,
      sources: effective.sources,
      scopedPermissions: effective.scopedPermissions,
    });
  } catch (error) {
    console.error('Error fetching member permissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
