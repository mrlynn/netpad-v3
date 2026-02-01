/**
 * Current User Permissions API
 * 
 * GET /api/platform/users/me/permissions - Get effective permissions for current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';

import { getPlatformDb } from '@/lib/platform/db';
import { getEffectivePermissions } from '@/lib/platform/rbac';
import { PlatformUser } from '@/types/platform';

// GET /api/platform/users/me/permissions
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');

    const db = await getPlatformDb();

    // Get user info
    const user = await db.collection<PlatformUser>('users').findOne({
      userId: session.userId,
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If orgId specified, get permissions for that org
    if (orgId) {
      // Verify user is member of this org
      const membership = user.organizations?.find(o => o.orgId === orgId);
      if (!membership) {
        return NextResponse.json({ error: 'Not a member of this organization' }, { status: 403 });
      }

      const effective = await getEffectivePermissions(session.userId, orgId);

      return NextResponse.json({
        user: {
          userId: user.userId,
          email: user.email,
          displayName: user.displayName,
        },
        organization: {
          orgId,
          directRole: membership.role,
          joinedAt: membership.joinedAt,
        },
        effectivePermissions: effective,
      });
    }

    // No orgId - return permissions for all orgs user belongs to
    const orgsWithPermissions = await Promise.all(
      (user.organizations || []).map(async (membership) => {
        const effective = await getEffectivePermissions(session.userId!, membership.orgId);
        
        // Get org name
        const org = await db.collection('organizations').findOne({ orgId: membership.orgId });

        return {
          orgId: membership.orgId,
          orgName: org?.name || membership.orgId,
          directRole: membership.role,
          joinedAt: membership.joinedAt,
          effectivePermissions: effective,
        };
      })
    );

    return NextResponse.json({
      user: {
        userId: user.userId,
        email: user.email,
        displayName: user.displayName,
        platformRole: user.platformRole,
      },
      organizations: orgsWithPermissions,
    });
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
