/**
 * Organization Invitations API
 *
 * GET  /api/organizations/[orgId]/invites - List pending invitations
 * POST /api/organizations/[orgId]/invites - Create an invitation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import {
  createInvitation,
  listPendingInvitations,
  getOrganization,
} from '@/lib/platform/organizations';
import { findUserById } from '@/lib/platform/users';
import { assertOrgPermission } from '@/lib/platform/permissions';
import { sendOrganizationInviteEmail } from '@/lib/auth/email';
import { OrgRole } from '@/types/platform';

export const dynamic = 'force-dynamic';

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

    // Check permission to manage invites (admin only)
    try {
      await assertOrgPermission(session.userId, orgId, 'manage_members');
    } catch {
      return NextResponse.json(
        { error: 'Admin permission required' },
        { status: 403 }
      );
    }

    const invitations = await listPendingInvitations(orgId);

    return NextResponse.json({
      invitations: invitations.map((inv) => ({
        invitationId: inv.invitationId,
        email: inv.email,
        role: inv.role,
        status: inv.status,
        createdAt: inv.createdAt,
        expiresAt: inv.expiresAt,
      })),
    });
  } catch (error) {
    console.error('[Invites API] List error:', error);
    return NextResponse.json(
      { error: 'Failed to list invitations' },
      { status: 500 }
    );
  }
}

export async function POST(
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

    // Check permission to invite members (admin only)
    try {
      await assertOrgPermission(session.userId, orgId, 'manage_members');
    } catch {
      return NextResponse.json(
        { error: 'Admin permission required to invite members' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, role } = body;

    // Validate email
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles: OrgRole[] = ['admin', 'member', 'viewer'];
    if (!role || !validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be admin, member, or viewer' },
        { status: 400 }
      );
    }

    // Cannot invite as owner
    if (role === 'owner') {
      return NextResponse.json(
        { error: 'Cannot invite as owner' },
        { status: 400 }
      );
    }

    // Get organization for the response
    const organization = await getOrganization(orgId);
    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Create the invitation
    const invitation = await createInvitation(
      orgId,
      email,
      role as OrgRole,
      session.userId
    );

    // Get inviter's info for the email
    const inviter = await findUserById(session.userId);
    const inviterName = inviter?.displayName || inviter?.email || 'A team member';

    // Send invitation email
    const emailSent = await sendOrganizationInviteEmail({
      to: email,
      inviterName,
      organizationName: organization.name,
      role: invitation.role,
      token: invitation.token,
      expiresInDays: 7,
    });

    if (!emailSent) {
      console.warn(`[Invites API] Failed to send email to ${email}, but invitation was created`);
    }

    console.log(`[Invites API] Invitation created for ${email} to join ${organization.name}`);

    return NextResponse.json({
      success: true,
      invitation: {
        invitationId: invitation.invitationId,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
      },
      message: emailSent 
        ? `Invitation sent to ${email}` 
        : `Invitation created for ${email} (email delivery pending)`,
    });
  } catch (error) {
    console.error('[Invites API] Create error:', error);

    // Handle known errors
    if (error instanceof Error) {
      if (error.message.includes('already a member')) {
        return NextResponse.json(
          { error: 'This user is already a member of the organization' },
          { status: 400 }
        );
      }
      if (error.message.includes('already pending')) {
        return NextResponse.json(
          { error: 'An invitation is already pending for this email' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to create invitation' },
      { status: 500 }
    );
  }
}
