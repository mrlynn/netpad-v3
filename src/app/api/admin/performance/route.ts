/**
 * Admin Performance Metrics API
 *
 * Provides aggregated performance data for the admin dashboard.
 * Uses in-memory storage with a rolling window (last 1000 entries per type).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { isPlatformAdmin } from '@/lib/platform/users';
import {
  metricsStore,
  getMetricsInTimeRange,
  resetMetrics,
  recordAPIMetric,
  recordNavigationMetric,
  recordSlowQuery,
  type APIMetric,
} from '@/lib/performance/metricsStore';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/performance
 * Returns aggregated performance metrics
 */
export async function GET(req: NextRequest) {
  const session = await getSession();

  if (!session.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const isAdmin = await isPlatformAdmin(session.userId);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const timeRange = parseInt(searchParams.get('minutes') || '60', 10);

  // Get filtered metrics
  const { apiRequests, navigations, slowQueries } =
    getMetricsInTimeRange(timeRange);

  // Calculate stats
  const apiStats = calculateAPIStats(apiRequests);
  const navStats = calculateNavStats(navigations);
  const routeBreakdown = calculateRouteBreakdown(apiRequests);
  const slowestRoutes = calculateSlowestRoutes(apiRequests);

  return NextResponse.json({
    success: true,
    timeRangeMinutes: timeRange,
    collectionStarted: metricsStore.lastReset,
    stats: {
      api: apiStats,
      navigation: navStats,
      routeBreakdown,
      slowestRoutes,
      slowQueries: slowQueries.slice(-20).reverse(), // Last 20 slow queries
    },
    totals: {
      apiRequests: metricsStore.apiRequests.length,
      navigations: metricsStore.navigations.length,
      slowQueries: metricsStore.slowQueries.length,
    },
  });
}

/**
 * POST /api/admin/performance
 * Record metrics (called by performance instrumentation)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.type === 'api') {
      recordAPIMetric(body.data);
    } else if (body.type === 'navigation') {
      recordNavigationMetric(body.data);
    } else if (body.type === 'slowQuery') {
      recordSlowQuery(body.data);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

/**
 * DELETE /api/admin/performance
 * Reset metrics (admin only)
 */
export async function DELETE(req: NextRequest) {
  const session = await getSession();

  if (!session.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const isAdmin = await isPlatformAdmin(session.userId);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  resetMetrics();

  return NextResponse.json({ success: true, message: 'Metrics reset' });
}

// Helper functions for calculating statistics
function calculateAPIStats(requests: APIMetric[]) {
  if (requests.length === 0) {
    return {
      totalRequests: 0,
      avgDuration: 0,
      p50: 0,
      p95: 0,
      p99: 0,
      errorRate: 0,
      avgDbTime: 0,
      avgQueryCount: 0,
    };
  }

  const durations = requests.map((r) => r.duration).sort((a, b) => a - b);
  const errors = requests.filter((r) => r.statusCode >= 400).length;
  const totalDbTime = requests.reduce((sum, r) => sum + r.dbTime, 0);
  const totalQueries = requests.reduce((sum, r) => sum + r.queryCount, 0);

  return {
    totalRequests: requests.length,
    avgDuration: Math.round(
      durations.reduce((a, b) => a + b, 0) / durations.length
    ),
    p50: durations[Math.floor(durations.length * 0.5)],
    p95:
      durations[Math.floor(durations.length * 0.95)] ||
      durations[durations.length - 1],
    p99:
      durations[Math.floor(durations.length * 0.99)] ||
      durations[durations.length - 1],
    errorRate: Math.round((errors / requests.length) * 100 * 10) / 10,
    avgDbTime: Math.round(totalDbTime / requests.length),
    avgQueryCount: Math.round((totalQueries / requests.length) * 10) / 10,
  };
}

function calculateNavStats(
  navigations: { from: string; to: string; duration: number; timestamp: number }[]
) {
  if (navigations.length === 0) {
    return {
      totalNavigations: 0,
      avgDuration: 0,
      p50: 0,
      p95: 0,
    };
  }

  const durations = navigations.map((n) => n.duration).sort((a, b) => a - b);

  return {
    totalNavigations: navigations.length,
    avgDuration: Math.round(
      durations.reduce((a, b) => a + b, 0) / durations.length
    ),
    p50: durations[Math.floor(durations.length * 0.5)],
    p95:
      durations[Math.floor(durations.length * 0.95)] ||
      durations[durations.length - 1],
  };
}

function calculateRouteBreakdown(requests: APIMetric[]) {
  const byRoute = new Map<string, APIMetric[]>();

  requests.forEach((r) => {
    const key = `${r.method} ${r.route}`;
    if (!byRoute.has(key)) {
      byRoute.set(key, []);
    }
    byRoute.get(key)!.push(r);
  });

  return Array.from(byRoute.entries())
    .map(([route, reqs]) => ({
      route,
      count: reqs.length,
      avgDuration: Math.round(
        reqs.reduce((sum, r) => sum + r.duration, 0) / reqs.length
      ),
      errorCount: reqs.filter((r) => r.statusCode >= 400).length,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
}

function calculateSlowestRoutes(requests: APIMetric[]) {
  const byRoute = new Map<string, number[]>();

  requests.forEach((r) => {
    const key = `${r.method} ${r.route}`;
    if (!byRoute.has(key)) {
      byRoute.set(key, []);
    }
    byRoute.get(key)!.push(r.duration);
  });

  return Array.from(byRoute.entries())
    .map(([route, durations]) => {
      const sorted = durations.sort((a, b) => a - b);
      return {
        route,
        count: durations.length,
        avgDuration: Math.round(
          sorted.reduce((a, b) => a + b, 0) / sorted.length
        ),
        p95: sorted[Math.floor(sorted.length * 0.95)] || sorted[sorted.length - 1],
        maxDuration: sorted[sorted.length - 1],
      };
    })
    .sort((a, b) => b.p95 - a.p95)
    .slice(0, 10);
}
