/**
 * Organization Members API
 * 
 * GET /api/platform/orgs/[orgId]/members - List all members
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';

import { getPlatformDb } from '@/lib/platform/db';
import { PlatformUser } from '@/types/platform';
import { hasPermission } from '@/lib/platform/rbac';

interface RouteParams {
  params: Promise<{ orgId: string }>;
}

// GET /api/platform/orgs/[orgId]/members
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orgId } = await params;
    const db = await getPlatformDb();

    // Check permission
    const canRead = await hasPermission(session.userId, orgId, 'members:read');
    if (!canRead) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all users who are members of this org
    const users = await db.collection<PlatformUser>('users')
      .find({
        'organizations.orgId': orgId,
      })
      .project({
        userId: 1,
        email: 1,
        displayName: 1,
        avatarUrl: 1,
        organizations: 1,
        lastLoginAt: 1,
        createdAt: 1,
      })
      .toArray();

    // Transform to member format
    const members = users.map((user) => {
      const membership = user.organizations?.find((o: { orgId: string }) => o.orgId === orgId);
      return {
        userId: user.userId,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        role: membership?.role || 'member',
        joinedAt: membership?.joinedAt || user.createdAt,
        invitedBy: membership?.invitedBy,
        lastLoginAt: user.lastLoginAt,
      };
    });

    // Sort by role (owner first, then admin, member, viewer) then by email
    const roleOrder = { owner: 0, admin: 1, member: 2, viewer: 3 };
    members.sort((a, b) => {
      const roleCompare = (roleOrder[a.role as keyof typeof roleOrder] || 4) - 
                         (roleOrder[b.role as keyof typeof roleOrder] || 4);
      if (roleCompare !== 0) return roleCompare;
      return a.email.localeCompare(b.email);
    });

    return NextResponse.json({ members });
  } catch (error) {
    console.error('Error listing members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
