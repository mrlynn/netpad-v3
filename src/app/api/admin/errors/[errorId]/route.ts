/**
 * Admin Error Detail API
 *
 * GET: Get single error by ID
 * PATCH: Update error status (acknowledge, resolve, reopen)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { isPlatformAdmin } from '@/lib/platform/users';
import {
  getError,
  acknowledgeError,
  resolveError,
  reopenError,
} from '@/lib/platform/errorTracker';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ errorId: string }> }
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

    const { errorId } = await params;
    const error = await getError(errorId);

    if (!error) {
      return NextResponse.json({ error: 'Error not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      error: {
        ...error,
        _id: error._id?.toString(),
        firstSeenAt: error.firstSeenAt.toISOString(),
        lastSeenAt: error.lastSeenAt.toISOString(),
        createdAt: error.createdAt.toISOString(),
        acknowledgedAt: error.acknowledgedAt?.toISOString(),
        resolvedAt: error.resolvedAt?.toISOString(),
      },
    });
  } catch (error) {
    console.error('[Admin Error Detail] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ errorId: string }> }
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

    const { errorId } = await params;
    const body = await request.json();
    const { action, resolution } = body;

    if (!action || !['acknowledge', 'resolve', 'reopen'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be: acknowledge, resolve, or reopen' },
        { status: 400 }
      );
    }

    let success = false;

    switch (action) {
      case 'acknowledge':
        success = await acknowledgeError(errorId, session.userId);
        break;
      case 'resolve':
        success = await resolveError(errorId, session.userId, resolution);
        break;
      case 'reopen':
        success = await reopenError(errorId);
        break;
    }

    if (!success) {
      return NextResponse.json({ error: 'Error not found or already in that state' }, { status: 404 });
    }

    // Return updated error
    const updatedError = await getError(errorId);

    return NextResponse.json({
      success: true,
      message: `Error ${action}d successfully`,
      error: updatedError
        ? {
            ...updatedError,
            _id: updatedError._id?.toString(),
            firstSeenAt: updatedError.firstSeenAt.toISOString(),
            lastSeenAt: updatedError.lastSeenAt.toISOString(),
            createdAt: updatedError.createdAt.toISOString(),
            acknowledgedAt: updatedError.acknowledgedAt?.toISOString(),
            resolvedAt: updatedError.resolvedAt?.toISOString(),
          }
        : null,
    });
  } catch (error) {
    console.error('[Admin Error Update] Error:', error);
    return NextResponse.json({ error: 'Failed to update error' }, { status: 500 });
  }
}
