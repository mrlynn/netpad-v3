/**
 * Admin API Metrics API
 *
 * GET: Get API metrics and summary
 * POST: Trigger aggregation (for testing/manual runs)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { isPlatformAdmin } from '@/lib/platform/users';
import {
  getAPIMetrics,
  getMetricsSummary,
  aggregateHourlyMetrics,
  aggregateDailyMetrics,
  withMetrics,
} from '@/lib/api/metricsMiddleware';

export const dynamic = 'force-dynamic';

export const GET = withMetrics(async function GET(request: NextRequest) {
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
    const periodType = (searchParams.get('periodType') || 'hourly') as 'hourly' | 'daily';
    const hours = parseInt(searchParams.get('hours') || '24', 10);
    const includeSummary = searchParams.get('includeSummary') !== 'false';
    const limit = parseInt(searchParams.get('limit') || '24', 10);

    const startDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')!)
      : new Date(Date.now() - hours * 60 * 60 * 1000);
    const endDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : new Date();

    // Get metrics
    const metrics = await getAPIMetrics({
      periodType,
      startDate,
      endDate,
      limit,
    });

    // Get summary if requested
    let summary = null;
    if (includeSummary) {
      summary = await getMetricsSummary(hours);
    }

    return NextResponse.json({
      success: true,
      metrics: metrics.map((m) => ({
        ...m,
        _id: m._id?.toString(),
        createdAt: m.createdAt.toISOString(),
      })),
      summary,
    });
  } catch (error) {
    console.error('[Admin API Metrics] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch API metrics' }, { status: 500 });
  }
});

export const POST = withMetrics(async function POST(request: NextRequest) {
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
    const { action } = body;

    if (action === 'aggregate-hourly') {
      const result = await aggregateHourlyMetrics();
      return NextResponse.json({
        success: true,
        message: 'Hourly aggregation completed',
        ...result,
      });
    }

    if (action === 'aggregate-daily') {
      const date = body.date ? new Date(body.date) : new Date();
      const result = await aggregateDailyMetrics(date);
      return NextResponse.json({
        success: true,
        message: 'Daily aggregation completed',
        ...result,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use: aggregate-hourly, aggregate-daily' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[Admin API Metrics] Error:', error);
    return NextResponse.json({ error: 'Failed to process metrics action' }, { status: 500 });
  }
});
