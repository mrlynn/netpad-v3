/**
 * Organization Details API
 *
 * GET    /api/organizations/[orgId] - Get organization details
 * PATCH  /api/organizations/[orgId] - Update organization
 * DELETE /api/organizations/[orgId] - Delete organization
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import {
  getOrganization,
  updateOrganization,
  deleteOrganization,
  getOrgMembers,
} from '@/lib/platform/organizations';
import { assertOrgPermission, getUserOrgPermissions } from '@/lib/platform/permissions';
import { withTiming } from '@/lib/performance';

export const GET = withTiming(async function GET(
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

    // Check permission to view org
    const permissions = await getUserOrgPermissions(session.userId, orgId);
    if (!permissions.orgRole) {
      return NextResponse.json(
        { error: 'Not a member of this organization' },
        { status: 403 }
      );
    }

    const organization = await getOrganization(orgId);
    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Get members if admin
    let members = undefined;
    if (permissions.isOrgAdmin) {
      members = await getOrgMembers(orgId);
    }

    return NextResponse.json({
      organization: {
        orgId: organization.orgId,
        name: organization.name,
        slug: organization.slug,
        plan: organization.plan,
        settings: organization.settings,
        currentMonthSubmissions: organization.currentMonthSubmissions,
        usageResetDate: organization.usageResetDate,
        createdAt: organization.createdAt,
      },
      members: members?.map(m => ({
        userId: m.userId,
        email: m.email,
        displayName: m.displayName,
        role: m.orgRole,
      })),
      permissions: {
        role: permissions.orgRole,
        isAdmin: permissions.isOrgAdmin,
        capabilities: permissions.capabilities,
      },
    });
  } catch (error) {
    console.error('[Organization API] Get error:', error);
    return NextResponse.json(
      { error: 'Failed to get organization' },
      { status: 500 }
    );
  }
});

export const PATCH = withTiming(async function PATCH(
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

    // Check admin permission
    try {
      await assertOrgPermission(session.userId, orgId, 'manage_org');
    } catch {
      return NextResponse.json(
        { error: 'Admin permission required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, settings } = body;

    const updates: any = {};
    if (name) updates.name = name;
    if (settings) updates.settings = settings;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No updates provided' },
        { status: 400 }
      );
    }

    const success = await updateOrganization(orgId, updates, session.userId);

    if (!success) {
      return NextResponse.json(
        { error: 'Organization not found or no changes made' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Organization API] Update error:', error);
    return NextResponse.json(
      { error: 'Failed to update organization' },
      { status: 500 }
    );
  }
});

export const DELETE = withTiming(async function DELETE(
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

    // Check owner permission (only owners can delete)
    try {
      await assertOrgPermission(session.userId, orgId, 'delete_org');
    } catch {
      return NextResponse.json(
        { error: 'Only organization owners can delete' },
        { status: 403 }
      );
    }

    const success = await deleteOrganization(orgId, session.userId);

    if (!success) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Organization API] Delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete organization' },
      { status: 500 }
    );
  }
});
