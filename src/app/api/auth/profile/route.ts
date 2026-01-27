/**
 * Profile API
 *
 * GET   /api/auth/profile - Get current user profile
 * PATCH /api/auth/profile - Update current user profile
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { findUserById, updateUserProfile } from '@/lib/platform/users';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = await findUserById(session.userId);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      user: {
        userId: user.userId,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        hasPasskey: user.passkeys && user.passkeys.length > 0,
        connectedProviders: user.oauthConnections?.map(c => c.provider) || [],
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('[Profile API] Get error:', error);
    return NextResponse.json(
      { error: 'Failed to get profile' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { displayName, avatarUrl } = body;

    // Build update object with only allowed fields
    const updates: { displayName?: string; avatarUrl?: string } = {};
    if (displayName !== undefined) {
      updates.displayName = displayName;
    }
    if (avatarUrl !== undefined) {
      updates.avatarUrl = avatarUrl;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const success = await updateUserProfile(session.userId, updates);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Profile API] Update error:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
