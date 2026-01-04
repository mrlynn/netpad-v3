import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getSession, destroySession } from '@/lib/auth/session';
import { findUserById as findAuthUserById } from '@/lib/auth/db';
import { findUserById as findPlatformUserById } from '@/lib/platform/users';

// GET - Get current session/user
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();

    if (!session.userId) {
      return NextResponse.json({
        authenticated: false,
        user: null,
      });
    }

    // Only try to fetch user if we have a userId
    try {
      // The session now stores platform userId (user_xxx), try to find the platform user first
      const platformUser = await findPlatformUserById(session.userId);

      let authUser = null;
      if (platformUser?.authId) {
        // New flow: get auth user via authId link
        authUser = await findAuthUserById(platformUser.authId);
      } else if (ObjectId.isValid(session.userId)) {
        // Fallback for legacy sessions: try using session.userId as auth _id
        // Only attempt this if session.userId is a valid ObjectId format
        authUser = await findAuthUserById(session.userId);
      }

      // If we have neither platform nor auth user, session is invalid
      if (!platformUser && !authUser) {
        // Session exists but user doesn't - destroy session
        await destroySession();
        return NextResponse.json({
          authenticated: false,
          user: null,
        });
      }

      // Return sanitized user data (prefer platform user data)
      return NextResponse.json({
        authenticated: true,
        user: {
          _id: authUser?._id || session.userId,
          userId: platformUser?.userId || session.userId,
          email: platformUser?.email || authUser?.email || session.email,
          displayName: platformUser?.displayName || authUser?.displayName,
          avatarUrl: platformUser?.avatarUrl || authUser?.avatarUrl,
          emailVerified: platformUser?.emailVerified || authUser?.emailVerified,
          hasPasskey: (authUser?.passkeys?.length || 0) > 0,
          passkeyCount: authUser?.passkeys?.length || 0,
          trustedDeviceCount: authUser?.trustedDevices?.length || 0,
          createdAt: platformUser?.createdAt || authUser?.createdAt,
          lastLoginAt: platformUser?.lastLoginAt || authUser?.lastLoginAt,
        },
        session: {
          isPasskeyAuth: session.isPasskeyAuth || false,
          deviceId: session.deviceId,
          createdAt: session.createdAt,
        },
      });
    } catch (dbError) {
      console.error('Database error fetching user:', dbError);
      // If DB fails but we have session data, return partial info
      return NextResponse.json({
        authenticated: true,
        user: {
          _id: session.userId,
          userId: session.userId,
          email: session.email || 'unknown',
        },
        session: {
          isPasskeyAuth: session.isPasskeyAuth || false,
          deviceId: session.deviceId,
          createdAt: session.createdAt,
        },
        dbError: true,
      });
    }
  } catch (error) {
    console.error('Error getting session:', error);
    // Return unauthenticated instead of 500 for session errors
    return NextResponse.json({
      authenticated: false,
      user: null,
    });
  }
}

// DELETE - Logout / destroy session
export async function DELETE(req: NextRequest) {
  try {
    await destroySession();

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Error destroying session:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to logout' },
      { status: 500 }
    );
  }
}
