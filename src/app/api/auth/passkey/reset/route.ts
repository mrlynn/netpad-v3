import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { findUserById as findAuthUserById } from '@/lib/auth/db';
import { findUserById as findPlatformUserById } from '@/lib/platform/users';
import { getAuthDb } from '@/lib/auth/db';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

// DELETE - Remove all passkeys for current user (for debugging/reset)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();

    if (!session.userId) {
      return NextResponse.json(
        { success: false, message: 'You must be signed in' },
        { status: 401 }
      );
    }

    // Get the auth user
    const platformUser = await findPlatformUserById(session.userId);

    let authUserId: string;
    if (platformUser?.authId) {
      authUserId = platformUser.authId;
    } else {
      // Fallback for legacy sessions
      authUserId = session.userId;
    }

    const authUser = await findAuthUserById(authUserId);

    if (!authUser) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Clear all passkeys
    const db = await getAuthDb();
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(authUserId) },
      { $set: { passkeys: [], updatedAt: new Date() } }
    );

    console.log('[Passkey Reset] Cleared passkeys for user:', authUser.email, 'Modified:', result.modifiedCount);

    return NextResponse.json({
      success: true,
      message: 'All passkeys have been removed. You can now register a new passkey.',
      email: authUser.email,
    });
  } catch (error) {
    console.error('Error resetting passkeys:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to reset passkeys' },
      { status: 500 }
    );
  }
}
