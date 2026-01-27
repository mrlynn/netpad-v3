/**
 * Admin Alert History Detail API
 *
 * PATCH: Update alert status (acknowledge, resolve)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { isPlatformAdmin } from '@/lib/platform/users';
import { updateAlertStatus } from '@/lib/platform/alertService';
import { AlertHistoryStatus } from '@/types/observability';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ alertId: string }> }
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

    const { alertId } = await params;
    const body = await request.json();
    const { status } = body as { status: AlertHistoryStatus };

    if (!status || !['active', 'acknowledged', 'resolved', 'auto_resolved'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be: active, acknowledged, or resolved' },
        { status: 400 }
      );
    }

    const success = await updateAlertStatus(alertId, status, session.userId);

    if (!success) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Alert ${status === 'acknowledged' ? 'acknowledged' : status === 'resolved' ? 'resolved' : 'updated'} successfully`,
    });
  } catch (error) {
    console.error('[Admin Alert Update] Error:', error);
    return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 });
  }
}
