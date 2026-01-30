/**
 * Individual Group API
 * 
 * GET    /api/platform/orgs/[orgId]/groups/[groupId] - Get group details
 * PATCH  /api/platform/orgs/[orgId]/groups/[groupId] - Update group
 * DELETE /api/platform/orgs/[orgId]/groups/[groupId] - Delete group
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPlatformDb } from '@/lib/platform/db';
import { OrgGroup } from '@/types/platform';
import { hasPermission } from '@/lib/platform/rbac';

interface RouteParams {
  params: Promise<{ orgId: string; groupId: string }>;
}

// GET /api/platform/orgs/[orgId]/groups/[groupId]
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orgId, groupId } = await params;
    const db = await getPlatformDb();

    // Check permission
    const canRead = await hasPermission(session.user.id, orgId, 'groups:read');
    if (!canRead) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const group = await db.collection<OrgGroup>('groups').findOne({
      organizationId: orgId,
      groupId,
    });

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Fetch member details
    const members = await db.collection('users')
      .find({ userId: { $in: group.memberIds } })
      .project({ userId: 1, email: 1, displayName: 1, avatarUrl: 1 })
      .toArray();

    return NextResponse.json({ group, members });
  } catch (error) {
    console.error('Error fetching group:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/platform/orgs/[orgId]/groups/[groupId]
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orgId, groupId } = await params;
    const body = await request.json();
    const { name, description, defaultRole, memberIds, addMembers, removeMembers } = body;

    const db = await getPlatformDb();

    // Check permission
    const canUpdate = await hasPermission(session.user.id, orgId, 'groups:update');
    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const group = await db.collection<OrgGroup>('groups').findOne({
      organizationId: orgId,
      groupId,
    });

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Build update
    const update: Partial<OrgGroup> = {
      updatedAt: new Date(),
    };

    if (name !== undefined) {
      update.name = name.trim();
      update.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }
    if (description !== undefined) {
      update.description = description?.trim() || undefined;
    }
    if (defaultRole !== undefined) {
      update.defaultRole = defaultRole || undefined;
    }

    // Handle member updates
    let newMemberIds = group.memberIds;
    if (memberIds !== undefined) {
      // Replace entire member list
      newMemberIds = Array.isArray(memberIds) ? memberIds : [];
    } else {
      // Incremental add/remove
      if (addMembers && Array.isArray(addMembers)) {
        newMemberIds = [...new Set([...newMemberIds, ...addMembers])];
      }
      if (removeMembers && Array.isArray(removeMembers)) {
        newMemberIds = newMemberIds.filter(id => !removeMembers.includes(id));
      }
    }
    update.memberIds = newMemberIds;

    await db.collection<OrgGroup>('groups').updateOne(
      { organizationId: orgId, groupId },
      { $set: update }
    );

    const updated = await db.collection<OrgGroup>('groups').findOne({
      organizationId: orgId,
      groupId,
    });

    return NextResponse.json({ group: updated });
  } catch (error) {
    console.error('Error updating group:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/platform/orgs/[orgId]/groups/[groupId]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orgId, groupId } = await params;
    const db = await getPlatformDb();

    // Check permission
    const canDelete = await hasPermission(session.user.id, orgId, 'groups:delete');
    if (!canDelete) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const group = await db.collection<OrgGroup>('groups').findOne({
      organizationId: orgId,
      groupId,
    });

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Delete the group
    await db.collection<OrgGroup>('groups').deleteOne({
      organizationId: orgId,
      groupId,
    });

    // Also clean up any role assignments for this group
    await db.collection('roleAssignments').deleteMany({
      organizationId: orgId,
      targetType: 'group',
      targetId: groupId,
    });

    return NextResponse.json({ success: true, deleted: groupId });
  } catch (error) {
    console.error('Error deleting group:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
