/**
 * Admin Broadcast Detail API
 *
 * GET: Get single broadcast
 * PATCH: Update broadcast
 * DELETE: Delete broadcast
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { isPlatformAdmin } from '@/lib/platform/users';
import {
  getBroadcast,
  updateBroadcast,
  deleteBroadcast,
} from '@/lib/platform/broadcastService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ broadcastId: string }> }
) {
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

    const { broadcastId } = await params;
    const broadcast = await getBroadcast(broadcastId);

    if (!broadcast) {
      return NextResponse.json({ error: 'Broadcast not found' }, { status: 404 });
    }

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
    console.error('[Admin Broadcast Detail] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch broadcast' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ broadcastId: string }> }
) {
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

    const { broadcastId } = await params;
    const body = await request.json();

    // Build updates object
    const updates: Record<string, unknown> = {};

    if (body.title !== undefined) updates.title = body.title;
    if (body.message !== undefined) updates.message = body.message;
    if (body.type !== undefined) updates.type = body.type;
    if (body.audience !== undefined) updates.audience = body.audience;
    if (body.targetOrganizations !== undefined) updates.targetOrganizations = body.targetOrganizations;
    if (body.placement !== undefined) updates.placement = body.placement;
    if (body.dismissible !== undefined) updates.dismissible = body.dismissible;
    if (body.startsAt !== undefined) updates.startsAt = new Date(body.startsAt);
    if (body.expiresAt !== undefined) updates.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;

    const success = await updateBroadcast(broadcastId, updates);

    if (!success) {
      return NextResponse.json({ error: 'Broadcast not found' }, { status: 404 });
    }

    // Return updated broadcast
    const updated = await getBroadcast(broadcastId);

    return NextResponse.json({
      success: true,
      broadcast: updated
        ? {
            ...updated,
            _id: updated._id?.toString(),
            startsAt: updated.startsAt.toISOString(),
            expiresAt: updated.expiresAt?.toISOString(),
            createdAt: updated.createdAt.toISOString(),
          }
        : null,
    });
  } catch (error) {
    console.error('[Admin Broadcast Update] Error:', error);
    return NextResponse.json({ error: 'Failed to update broadcast' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ broadcastId: string }> }
) {
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

    const { broadcastId } = await params;
    const success = await deleteBroadcast(broadcastId);

    if (!success) {
      return NextResponse.json({ error: 'Broadcast not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Broadcast deleted successfully',
    });
  } catch (error) {
    console.error('[Admin Broadcast Delete] Error:', error);
    return NextResponse.json({ error: 'Failed to delete broadcast' }, { status: 500 });
  }
}
