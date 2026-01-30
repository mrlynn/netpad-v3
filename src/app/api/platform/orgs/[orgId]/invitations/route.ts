/**
 * Organization Invitations API
 * 
 * GET  /api/platform/orgs/[orgId]/invitations - List pending invitations
 * POST /api/platform/orgs/[orgId]/invitations - Send new invitation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';

import { getPlatformDb } from '@/lib/platform/db';
import { OrgInvitation, OrgRole, PlatformUser } from '@/types/platform';
import { hasPermission } from '@/lib/platform/rbac';
import { randomBytes } from 'crypto';

interface RouteParams {
  params: Promise<{ orgId: string }>;
}

// Generate invitation ID and token
function generateInvitationId(): string {
  return `inv_${Date.now().toString(36)}${randomBytes(4).toString('hex')}`;
}

function generateToken(): string {
  return randomBytes(32).toString('hex');
}

// GET /api/platform/orgs/[orgId]/invitations
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

    const invitations = await db.collection<OrgInvitation>('invitations')
      .find({
        organizationId: orgId,
        status: 'pending',
        expiresAt: { $gt: new Date() },
      })
      .sort({ createdAt: -1 })
      .toArray();

    // Don't expose the token
    const safeInvitations = invitations.map(({ token, ...inv }) => inv);

    return NextResponse.json({ invitations: safeInvitations });
  } catch (error) {
    console.error('Error listing invitations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/platform/orgs/[orgId]/invitations
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orgId } = await params;
    const body = await request.json();
    const { email, role = 'member' } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    if (!['admin', 'member', 'viewer'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role. Cannot invite as owner.' }, { status: 400 });
    }

    const db = await getPlatformDb();

    // Check permission
    const canInvite = await hasPermission(session.userId, orgId, 'members:invite');
    if (!canInvite) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if user already exists and is a member
    const existingUser = await db.collection<PlatformUser>('users').findOne({
      email: email.toLowerCase(),
      'organizations.orgId': orgId,
    });

    if (existingUser) {
      return NextResponse.json({ error: 'User is already a member of this organization' }, { status: 409 });
    }

    // Check if there's already a pending invitation
    const existingInvite = await db.collection<OrgInvitation>('invitations').findOne({
      organizationId: orgId,
      email: email.toLowerCase(),
      status: 'pending',
      expiresAt: { $gt: new Date() },
    });

    if (existingInvite) {
      return NextResponse.json({ error: 'An invitation has already been sent to this email' }, { status: 409 });
    }

    // Create invitation
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation: OrgInvitation = {
      invitationId: generateInvitationId(),
      organizationId: orgId,
      email: email.toLowerCase(),
      role: role as OrgRole,
      status: 'pending',
      invitedBy: session.userId,
      token: generateToken(),
      createdAt: now,
      expiresAt,
    };

    await db.collection<OrgInvitation>('invitations').insertOne(invitation);

    // TODO: Send invitation email
    // await sendInvitationEmail(invitation, org, inviter);

    // Return invitation without token
    const { token, ...safeInvitation } = invitation;

    return NextResponse.json({ invitation: safeInvitation }, { status: 201 });
  } catch (error) {
    console.error('Error creating invitation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
