/**
 * Admin User Impersonation API
 *
 * POST: Start impersonating a user (admin only)
 * Allows platform admins to view the app as a specific user
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession, startImpersonation } from '@/lib/auth/session';
import { isPlatformAdmin } from '@/lib/platform/users';
import { getUsersCollection, getPlatformDb } from '@/lib/platform/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Prevent nested impersonation
    if (session.impersonating) {
      return NextResponse.json(
        { error: 'Already impersonating a user. End current impersonation first.' },
        { status: 400 }
      );
    }

    // Check admin access
    const isAdmin = await isPlatformAdmin(session.userId);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Prevent impersonating yourself
    if (userId === session.userId) {
      return NextResponse.json({ error: 'Cannot impersonate yourself' }, { status: 400 });
    }

    // Get target user info
    const usersCollection = await getUsersCollection();
    const targetUser = await usersCollection.findOne({ userId });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Log the impersonation for audit trail
    const platformDb = await getPlatformDb();
    await platformDb.collection('admin_audit_log').insertOne({
      action: 'impersonation_start',
      adminUserId: session.userId,
      adminEmail: session.email,
      targetUserId: userId,
      targetEmail: targetUser.email,
      timestamp: new Date(),
      userAgent: req.headers.get('user-agent'),
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
    });

    // Start impersonation
    await startImpersonation(userId, targetUser.email);

    console.log(`[Admin Impersonate] Admin ${session.email} started impersonating ${targetUser.email}`);

    return NextResponse.json({
      success: true,
      message: `Now viewing as ${targetUser.displayName || targetUser.email}`,
      targetUser: {
        userId: targetUser.userId,
        email: targetUser.email,
        displayName: targetUser.displayName,
      },
    });
  } catch (error) {
    console.error('[Admin Impersonate] Error starting impersonation:', error);
    return NextResponse.json(
      { error: 'Failed to start impersonation' },
      { status: 500 }
    );
  }
}
