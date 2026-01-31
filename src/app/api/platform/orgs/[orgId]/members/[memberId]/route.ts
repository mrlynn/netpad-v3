/**
 * Individual Member API
 * 
 * GET    /api/platform/orgs/[orgId]/members/[memberId] - Get member details
 * PATCH  /api/platform/orgs/[orgId]/members/[memberId] - Update member role
 * DELETE /api/platform/orgs/[orgId]/members/[memberId] - Remove member from org
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { Db } from 'mongodb';
import { getPlatformDb } from '@/lib/platform/db';
import { PlatformUser, OrgRole } from '@/types/platform';
import { hasPermission } from '@/lib/platform/rbac';

interface RouteParams {
  params: Promise<{ orgId: string; memberId: string }>;
}

// Helper to find user by userId or email
async function findMember(db: Db, orgId: string, memberId: string) {
  // Try to find by userId first
  let user = await db.collection<PlatformUser>('users').findOne({
    userId: memberId,
    'organizations.orgId': orgId,
  });

  // If not found, try by email
  if (!user) {
    user = await db.collection<PlatformUser>('users').findOne({
      email: memberId,
      'organizations.orgId': orgId,
    });
  }

  return user;
}

// GET /api/platform/orgs/[orgId]/members/[memberId]
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orgId, memberId } = await params;
    const db = await getPlatformDb();

    // Check permission
    const canRead = await hasPermission(session.userId, orgId, 'members:read');
    if (!canRead) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const user = await findMember(db, orgId, memberId);
    if (!user) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const membership = user.organizations?.find((o: { orgId: string }) => o.orgId === orgId);

    return NextResponse.json({
      userId: user.userId,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      role: membership?.role || 'member',
      joinedAt: membership?.joinedAt,
      invitedBy: membership?.invitedBy,
      lastLoginAt: user.lastLoginAt,
    });
  } catch (error) {
    console.error('Error fetching member:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/platform/orgs/[orgId]/members/[memberId]
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orgId, memberId } = await params;
    const body = await request.json();
    const { role } = body;

    if (!role || !['owner', 'admin', 'member', 'viewer'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const db = await getPlatformDb();

    // Check permission
    const canUpdate = await hasPermission(session.userId, orgId, 'members:update_role');
    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const user = await findMember(db, orgId, memberId);
    if (!user) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Find current role
    const membership = user.organizations?.find((o: { orgId: string }) => o.orgId === orgId);
    
    // Prevent demoting the last owner
    if (membership?.role === 'owner' && role !== 'owner') {
      const ownerCount = await db.collection<PlatformUser>('users').countDocuments({
        'organizations': {
          $elemMatch: {
            orgId,
            role: 'owner',
          },
        },
      });
      
      if (ownerCount <= 1) {
        return NextResponse.json({ 
          error: 'Cannot demote the last owner. Transfer ownership first.' 
        }, { status: 400 });
      }
    }

    // Update the role
    await db.collection<PlatformUser>('users').updateOne(
      { userId: user.userId, 'organizations.orgId': orgId },
      { $set: { 'organizations.$.role': role as OrgRole } }
    );

    return NextResponse.json({ 
      success: true, 
      userId: user.userId,
      newRole: role,
    });
  } catch (error) {
    console.error('Error updating member:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/platform/orgs/[orgId]/members/[memberId]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orgId, memberId } = await params;
    const db = await getPlatformDb();

    // Check permission
    const canRemove = await hasPermission(session.userId, orgId, 'members:remove');
    if (!canRemove) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const user = await findMember(db, orgId, memberId);
    if (!user) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Find current role
    const membership = user.organizations?.find((o: { orgId: string }) => o.orgId === orgId);
    
    // Prevent removing the last owner
    if (membership?.role === 'owner') {
      const ownerCount = await db.collection<PlatformUser>('users').countDocuments({
        'organizations': {
          $elemMatch: {
            orgId,
            role: 'owner',
          },
        },
      });
      
      if (ownerCount <= 1) {
        return NextResponse.json({ 
          error: 'Cannot remove the last owner. Transfer ownership first.' 
        }, { status: 400 });
      }
    }

    // Prevent removing yourself
    if (user.userId === session.userId) {
      return NextResponse.json({ 
        error: 'Cannot remove yourself. Use "Leave Organization" instead.' 
      }, { status: 400 });
    }

    // Remove the org membership
    await db.collection<PlatformUser>('users').updateOne(
      { userId: user.userId },
      { $pull: { organizations: { orgId } } }
    );

    // Also remove any role assignments for this user in this org
    await db.collection('roleAssignments').deleteMany({
      organizationId: orgId,
      targetType: 'user',
      targetId: user.userId,
    });

    return NextResponse.json({ 
      success: true, 
      removed: user.userId,
    });
  } catch (error) {
    console.error('Error removing member:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
