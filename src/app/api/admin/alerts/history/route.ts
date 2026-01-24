/**
 * Admin Alert History API
 *
 * GET: Get alert history with filters and pagination
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { isPlatformAdmin } from '@/lib/platform/users';
import { getAlertHistory, getAlertStats } from '@/lib/platform/alertService';
import { AlertHistoryStatus } from '@/types/observability';

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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const includeStats = searchParams.get('includeStats') === 'true';
    const statsDays = parseInt(searchParams.get('statsDays') || '7', 10);

    const ruleId = searchParams.get('ruleId');
    const status = searchParams.get('status');
    const statuses = searchParams.get('statuses'); // Comma-separated
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const query = {
      ruleId: ruleId || undefined,
      status: statuses
        ? (statuses.split(',') as AlertHistoryStatus[])
        : status
          ? (status as AlertHistoryStatus)
          : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit,
      offset,
    };

    const result = await getAlertHistory(query);

    let stats = null;
    if (includeStats) {
      stats = await getAlertStats(statsDays);
    }

    return NextResponse.json({
      success: true,
      alerts: result.alerts.map((alert) => ({
        ...alert,
        _id: alert._id?.toString(),
        triggeredAt: alert.triggeredAt.toISOString(),
        createdAt: alert.createdAt.toISOString(),
        acknowledgedAt: alert.acknowledgedAt?.toISOString(),
        resolvedAt: alert.resolvedAt?.toISOString(),
      })),
      pagination: {
        total: result.total,
        limit,
        offset,
        hasMore: result.hasMore,
      },
      stats,
    });
  } catch (error) {
    console.error('[Admin Alert History] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch alert history' }, { status: 500 });
  }
}
