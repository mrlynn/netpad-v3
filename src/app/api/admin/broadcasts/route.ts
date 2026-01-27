/**
 * Admin Broadcasts API
 *
 * GET: Get all broadcasts
 * POST: Create a new broadcast
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { isPlatformAdmin } from '@/lib/platform/users';
import {
  getAllBroadcasts,
  createBroadcast,
  getBroadcastStats,
} from '@/lib/platform/broadcastService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;
    const includeStats = searchParams.get('includeStats') === 'true';

    const broadcasts = await getAllBroadcasts();

    let stats = null;
    if (includeStats) {
      stats = await getBroadcastStats();
    }

    return NextResponse.json({
      success: true,
      broadcasts: broadcasts.map((b) => ({
        ...b,
        _id: b._id?.toString(),
        startsAt: b.startsAt.toISOString(),
        expiresAt: b.expiresAt?.toISOString(),
        createdAt: b.createdAt.toISOString(),
      })),
      stats,
    });
  } catch (error) {
    console.error('[Admin Broadcasts] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch broadcasts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();

    // Validate required fields
    if (!body.title || !body.message || !body.type || !body.placement) {
      return NextResponse.json(
        { error: 'Missing required fields: title, message, type, placement' },
        { status: 400 }
      );
    }

    const broadcast = await createBroadcast({
      title: body.title,
      message: body.message,
      type: body.type,
      customBadge: body.customBadge,
      audience: body.audience || 'all',
      targetOrganizations: body.targetOrganizations,
      placement: body.placement,
      dismissible: body.dismissible !== false,
      linkUrl: body.linkUrl,
      linkText: body.linkText,
      startsAt: body.startsAt ? new Date(body.startsAt) : new Date(),
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      createdBy: session.userId,
    });

    return NextResponse.json({
      success: true,
      broadcast: {
        ...broadcast,
        _id: broadcast._id?.toString(),
        startsAt: broadcast.startsAt.toISOString(),
        expiresAt: broadcast.expiresAt?.toISOString(),
        createdAt: broadcast.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('[Admin Broadcasts] Error:', error);
    return NextResponse.json({ error: 'Failed to create broadcast' }, { status: 500 });
  }
}
