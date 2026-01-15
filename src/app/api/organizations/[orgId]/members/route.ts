/**
 * Organization Members API
 *
 * GET /api/organizations/[orgId]/members - List all members of an organization
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getOrgMembers } from '@/lib/platform/organizations';
import { getUserOrgPermissions } from '@/lib/platform/permissions';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const session = await getSession();
    const { orgId } = await params;

    if (!session.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check permission to view org members
    const permissions = await getUserOrgPermissions(session.userId, orgId);
    if (!permissions.orgRole) {
      return NextResponse.json(
        { error: 'Not a member of this organization' },
        { status: 403 }
      );
    }

    // Get all members
    const members = await getOrgMembers(orgId);

    return NextResponse.json({
      success: true,
      members: members.map((member) => ({
        userId: member.userId,
        email: member.email,
        displayName: member.displayName,
        avatarUrl: member.avatarUrl,
        orgRole: member.orgRole,
      })),
    });
  } catch (error: any) {
    console.error('[Organization Members API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to list members', message: error.message },
      { status: 500 }
    );
  }
}
