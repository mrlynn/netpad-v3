/**
 * Admin Users Stats API
 *
 * GET: Get user statistics for the admin dashboard
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { isPlatformAdmin } from '@/lib/platform/users';
import { getUsersCollection } from '@/lib/platform/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
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

    const collection = await getUsersCollection();

    // Get counts
    const [
      totalUsers,
      verifiedUsers,
      adminUsers,
      supportUsers,
      waitlistPending,
      waitlistApproved,
      waitlistRejected,
      usersWithPasskeys,
      usersWithOAuth,
      todaySignups,
      thisWeekSignups,
      activeToday,
      activeThisWeek,
    ] = await Promise.all([
      // Total users
      collection.countDocuments({}),
      // Verified emails
      collection.countDocuments({ emailVerified: true }),
      // Admins
      collection.countDocuments({ platformRole: 'admin' }),
      // Support
      collection.countDocuments({ platformRole: 'support' }),
      // Waitlist pending
      collection.countDocuments({ waitlistStatus: 'pending' }),
      // Waitlist approved
      collection.countDocuments({ waitlistStatus: 'approved' }),
      // Waitlist rejected
      collection.countDocuments({ waitlistStatus: 'rejected' }),
      // Users with passkeys
      collection.countDocuments({ 'passkeys.0': { $exists: true } }),
      // Users with OAuth
      collection.countDocuments({ 'oauthConnections.0': { $exists: true } }),
      // Today's signups
      collection.countDocuments({
        createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      }),
      // This week's signups
      collection.countDocuments({
        createdAt: {
          $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      }),
      // Active today
      collection.countDocuments({
        lastLoginAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      }),
      // Active this week
      collection.countDocuments({
        lastLoginAt: {
          $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      }),
    ]);

    return NextResponse.json({
      total: totalUsers,
      verified: verifiedUsers,
      unverified: totalUsers - verifiedUsers,
      roles: {
        admin: adminUsers,
        support: supportUsers,
        regular: totalUsers - adminUsers - supportUsers,
      },
      waitlist: {
        pending: waitlistPending,
        approved: waitlistApproved,
        rejected: waitlistRejected,
        none: totalUsers - waitlistPending - waitlistApproved - waitlistRejected,
      },
      auth: {
        withPasskeys: usersWithPasskeys,
        withOAuth: usersWithOAuth,
      },
      activity: {
        todaySignups,
        thisWeekSignups,
        activeToday,
        activeThisWeek,
      },
    });
  } catch (error) {
    console.error('[Admin Users Stats] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
