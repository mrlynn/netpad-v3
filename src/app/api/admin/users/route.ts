/**
 * Admin Users API
 *
 * GET: List all platform users with filtering, search, and pagination
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { isPlatformAdmin } from '@/lib/platform/users';
import { getUsersCollection } from '@/lib/platform/db';

export async function GET(req: NextRequest) {
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

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const waitlistStatus = searchParams.get('waitlistStatus') || 'all';
    const platformRole = searchParams.get('platformRole') || 'all';
    const emailVerified = searchParams.get('emailVerified') || 'all';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50'), 1), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);

    const collection = await getUsersCollection();

    // Build query
    const query: any = {};

    // Search filter (email, displayName, company)
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { displayName: { $regex: search, $options: 'i' } },
        { 'waitlistMetadata.company': { $regex: search, $options: 'i' } },
      ];
    }

    // Waitlist status filter
    if (waitlistStatus !== 'all') {
      if (waitlistStatus === 'none') {
        query.waitlistStatus = { $exists: false };
      } else {
        query.waitlistStatus = waitlistStatus;
      }
    }

    // Platform role filter
    if (platformRole !== 'all') {
      if (platformRole === 'none') {
        query.platformRole = { $exists: false };
      } else {
        query.platformRole = platformRole;
      }
    }

    // Email verified filter
    if (emailVerified !== 'all') {
      query.emailVerified = emailVerified === 'true';
    }

    // Build sort
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Get total count
    const total = await collection.countDocuments(query);

    // Get users
    const users = await collection
      .find(query)
      .sort(sort)
      .skip(offset)
      .limit(limit)
      .project({
        _id: 1,
        userId: 1,
        email: 1,
        emailVerified: 1,
        displayName: 1,
        avatarUrl: 1,
        platformRole: 1,
        waitlistStatus: 1,
        waitlistMetadata: 1,
        organizations: 1,
        oauthConnections: { $size: { $ifNull: ['$oauthConnections', []] } },
        passkeys: { $size: { $ifNull: ['$passkeys', []] } },
        trustedDevices: { $size: { $ifNull: ['$trustedDevices', []] } },
        createdAt: 1,
        updatedAt: 1,
        lastLoginAt: 1,
      })
      .toArray();

    // Transform for response
    const transformedUsers = users.map((user) => ({
      userId: user.userId,
      email: user.email,
      emailVerified: user.emailVerified,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      platformRole: user.platformRole || null,
      waitlistStatus: user.waitlistStatus || null,
      waitlistMetadata: user.waitlistMetadata || null,
      organizationCount: user.organizations?.length || 0,
      oauthConnectionCount: typeof user.oauthConnections === 'number' ? user.oauthConnections : 0,
      passkeyCount: typeof user.passkeys === 'number' ? user.passkeys : 0,
      trustedDeviceCount: typeof user.trustedDevices === 'number' ? user.trustedDevices : 0,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt || null,
    }));

    return NextResponse.json({
      users: transformedUsers,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[Admin Users] Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
