/**
 * Atlas Invitation API
 *
 * Allows users to check their Atlas console invitation status
 * and org admins to invite team members to the Atlas project.
 *
 * GET  - Check invitation status for current user
 * POST - Manually trigger Atlas invitation for a user (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { checkOrganizationPermission } from '@/lib/platform/permissions';
import { getOrganization } from '@/lib/platform/organizations';
import { getProvisionedClusterForOrg } from '@/lib/atlas/provisioning';
import {
  inviteUserToAtlasProject,
  getAtlasInvitationStatus,
  getAtlasConsoleUrl,
  syncAtlasInvitationStatus,
  resendAtlasInvitation,
} from '@/lib/atlas/invitations';
import { findUserById } from '@/lib/platform/users';

/**
 * GET /api/organizations/[orgId]/atlas-invite
 *
 * Get Atlas invitation status for the current user.
 * Returns invitation details and Atlas console URL if available.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orgId } = await params;

    // Verify user has access to this org
    const hasAccess = await checkOrganizationPermission(session.userId, orgId, 'view_forms');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get user's email
    const user = await findUserById(session.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get cluster info
    const cluster = await getProvisionedClusterForOrg(orgId);

    // Get invitation status for this user
    let invitation = await getAtlasInvitationStatus(orgId, user.email);

    // If there's a pending invitation, sync status with Atlas
    if (invitation && invitation.status === 'pending') {
      const syncResult = await syncAtlasInvitationStatus(invitation.invitationId);
      if (syncResult.changed) {
        // Refresh invitation data after sync
        invitation = await getAtlasInvitationStatus(orgId, user.email);
      }
    }

    return NextResponse.json({
      hasCluster: !!cluster,
      clusterStatus: cluster?.status || null,
      clusterProvider: cluster?.provider || null,
      clusterRegion: cluster?.region || null,
      invitation: invitation
        ? {
            invitationId: invitation.invitationId,
            status: invitation.status,
            email: invitation.email,
            atlasRole: invitation.atlasRole,
            createdAt: invitation.createdAt,
            expiresAt: invitation.expiresAt,
            acceptedAt: invitation.acceptedAt,
          }
        : null,
      atlasConsoleUrl: cluster?.atlasProjectId
        ? getAtlasConsoleUrl(cluster.atlasProjectId)
        : null,
      atlasProjectId: cluster?.atlasProjectId || null,
    });
  } catch (error: any) {
    console.error('[Atlas Invite API] GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/organizations/[orgId]/atlas-invite
 *
 * Send an Atlas invitation to a user.
 * Requires manage_members permission.
 *
 * Body:
 * - email: string - Email address to invite
 * - resend?: boolean - If true, resend invitation to an email that already has one
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orgId } = await params;

    // Check permission - need manage_members to invite others
    const hasPermission = await checkOrganizationPermission(session.userId, orgId, 'manage_members');
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get organization
    const organization = await getOrganization(orgId);
    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const { email, resend } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Get cluster for this org
    const cluster = await getProvisionedClusterForOrg(orgId);
    if (!cluster) {
      return NextResponse.json(
        { error: 'No cluster provisioned for this organization' },
        { status: 400 }
      );
    }

    if (cluster.status !== 'ready') {
      return NextResponse.json(
        { error: `Cluster is not ready (status: ${cluster.status})` },
        { status: 400 }
      );
    }

    // Check for existing invitation if resend is requested
    if (resend) {
      const existing = await getAtlasInvitationStatus(orgId, email);
      if (existing) {
        const resendResult = await resendAtlasInvitation(existing.invitationId);
        if (!resendResult.success) {
          return NextResponse.json(
            { error: resendResult.error || 'Failed to resend invitation' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          invitationId: resendResult.invitationId,
          message: `Atlas invitation resent to ${email}`,
          atlasConsoleUrl: getAtlasConsoleUrl(cluster.atlasProjectId),
        });
      }
    }

    // Send invitation
    const result = await inviteUserToAtlasProject({
      organizationId: orgId,
      atlasProjectId: cluster.atlasProjectId,
      email,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send Atlas invitation' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      invitationId: result.invitationId,
      alreadyPending: result.alreadyPending,
      message: result.alreadyPending
        ? `Atlas invitation already pending for ${email}`
        : `Atlas invitation sent to ${email}`,
      atlasConsoleUrl: getAtlasConsoleUrl(cluster.atlasProjectId),
    });
  } catch (error: any) {
    console.error('[Atlas Invite API] POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
