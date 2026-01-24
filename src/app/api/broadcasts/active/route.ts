/**
 * Active Broadcasts API (User-facing)
 *
 * GET: Get active broadcasts for current user
 * POST: Dismiss a broadcast
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { isPlatformAdmin } from '@/lib/platform/users';
import { getActiveBroadcasts, dismissBroadcast } from '@/lib/platform/broadcastService';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    // Get broadcasts even for unauthenticated users (only 'all' audience)
    const userId = session.userId || 'anonymous';
    // organizationId would need to be fetched from user's memberships if needed
    const organizationId: string | undefined = undefined;
    const isAdmin = session.userId ? await isPlatformAdmin(session.userId) : false;

    const broadcasts = await getActiveBroadcasts(userId, organizationId, isAdmin);

    return NextResponse.json({
      success: true,
      broadcasts: broadcasts.map((b) => ({
        broadcastId: b.broadcastId,
        title: b.title,
        message: b.message,
        type: b.type,
        placement: b.placement,
        dismissible: b.dismissible,
        linkUrl: b.linkUrl,
        linkText: b.linkText,
        startsAt: b.startsAt.toISOString(),
        expiresAt: b.expiresAt?.toISOString(),
      })),
    });
  } catch (error) {
    console.error('[Active Broadcasts] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch broadcasts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { broadcastId } = body;

    if (!broadcastId) {
      return NextResponse.json({ error: 'broadcastId is required' }, { status: 400 });
    }

    const success = await dismissBroadcast(broadcastId, session.userId);

    if (!success) {
      return NextResponse.json(
        { error: 'Broadcast not found or not dismissible' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Broadcast dismissed',
    });
  } catch (error) {
    console.error('[Dismiss Broadcast] Error:', error);
    return NextResponse.json({ error: 'Failed to dismiss broadcast' }, { status: 500 });
  }
}
