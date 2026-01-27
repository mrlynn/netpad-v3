/**
 * Admin User Detail/Update API
 *
 * GET: Get detailed user information
 * PUT: Update user settings (waitlist status, platform role, etc.)
 * DELETE: Delete user account
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { isPlatformAdmin, findUserById, setPlatformRole } from '@/lib/platform/users';
import { approveUser, rejectUser } from '@/lib/platform/waitlist';
import { getUsersCollection, getPlatformAuditCollection } from '@/lib/platform/db';
import { PlatformRole } from '@/types/platform';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ userId: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await params;

    // Check authentication
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check admin access
    const isAdmin = await isPlatformAdmin(session.userId);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get user
    const user = await findUserById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Return detailed user info (excluding sensitive data)
    return NextResponse.json({
      user: {
        userId: user.userId,
        email: user.email,
        emailVerified: user.emailVerified,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        platformRole: user.platformRole || null,
        waitlistStatus: user.waitlistStatus || null,
        waitlistMetadata: user.waitlistMetadata || null,
        organizations: user.organizations || [],
        oauthConnections: (user.oauthConnections || []).map((conn) => ({
          provider: conn.provider,
          email: conn.email,
          displayName: conn.displayName,
          connectedAt: conn.connectedAt,
          lastUsedAt: conn.lastUsedAt,
        })),
        passkeyCount: user.passkeys?.length || 0,
        trustedDeviceCount: user.trustedDevices?.length || 0,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLoginAt: user.lastLoginAt || null,
      },
    });
  } catch (error) {
    console.error('[Admin User Detail] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await params;

    // Check authentication
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check admin access
    const isAdmin = await isPlatformAdmin(session.userId);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Prevent self-demotion
    if (userId === session.userId) {
      return NextResponse.json(
        { error: 'Cannot modify your own account through admin panel' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { action, platformRole, waitlistAction, rejectionReason, notes } = body;

    // Get user
    const user = await findUserById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const collection = await getUsersCollection();
    const updates: any = { updatedAt: new Date() };

    // Handle platform role change
    if (action === 'setPlatformRole') {
      const validRoles: (PlatformRole | null)[] = ['admin', 'support', null];
      if (!validRoles.includes(platformRole)) {
        return NextResponse.json({ error: 'Invalid platform role' }, { status: 400 });
      }

      await setPlatformRole(userId, platformRole, session.userId);

      return NextResponse.json({
        success: true,
        message: platformRole
          ? `User role set to ${platformRole}`
          : 'User role removed',
      });
    }

    // Handle waitlist actions
    if (action === 'setWaitlistStatus') {
      if (waitlistAction === 'approve') {
        const result = await approveUser(userId, session.userId);
        if (!result.success) {
          return NextResponse.json({ error: 'Failed to approve user' }, { status: 500 });
        }
        return NextResponse.json({
          success: true,
          message: 'User approved and notification email sent',
        });
      }

      if (waitlistAction === 'reject') {
        const result = await rejectUser(userId, session.userId, rejectionReason);
        if (!result.success) {
          return NextResponse.json({ error: 'Failed to reject user' }, { status: 500 });
        }
        return NextResponse.json({
          success: true,
          message: 'User rejected',
        });
      }

      if (waitlistAction === 'pending') {
        updates.waitlistStatus = 'pending';
        updates['waitlistMetadata.reviewedAt'] = null;
        updates['waitlistMetadata.reviewedBy'] = null;
        updates['waitlistMetadata.rejectionReason'] = null;
      }

      if (waitlistAction === 'clear') {
        updates.waitlistStatus = null;
        updates.waitlistMetadata = null;
      }
    }

    // Handle notes update
    if (action === 'updateNotes') {
      updates['waitlistMetadata.notes'] = notes || '';
    }

    // Handle email verification toggle
    if (action === 'setEmailVerified') {
      updates.emailVerified = body.emailVerified === true;
    }

    // Apply updates if any
    if (Object.keys(updates).length > 1) {
      await collection.updateOne({ userId }, { $set: updates });

      // Log the action
      const auditCollection = await getPlatformAuditCollection();
      await auditCollection.insertOne({
        eventType: 'user.updated',
        userId: session.userId,
        userEmail: session.email,
        resourceType: 'user',
        resourceId: userId,
        action: action || 'update',
        details: { updates: Object.keys(updates) },
        timestamp: new Date(),
      });
    }

    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
    });
  } catch (error) {
    console.error('[Admin User Update] Error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await params;

    // Check authentication
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check admin access
    const isAdmin = await isPlatformAdmin(session.userId);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Prevent self-deletion
    if (userId === session.userId) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    // Get user
    const user = await findUserById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent deletion of other admins
    if (user.platformRole === 'admin') {
      return NextResponse.json(
        { error: 'Cannot delete admin accounts. Remove admin role first.' },
        { status: 400 }
      );
    }

    const collection = await getUsersCollection();
    await collection.deleteOne({ userId });

    // Log the deletion
    const auditCollection = await getPlatformAuditCollection();
    await auditCollection.insertOne({
      eventType: 'user.deleted',
      userId: session.userId,
      userEmail: session.email,
      resourceType: 'user',
      resourceId: userId,
      action: 'delete',
      details: { deletedUserEmail: user.email },
      timestamp: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('[Admin User Delete] Error:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
