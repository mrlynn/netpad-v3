/**
 * Admin System Status API
 *
 * GET: Get current health status of all platform services
 * POST: Trigger a health check for all services
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { isPlatformAdmin } from '@/lib/platform/users';
import {
  getAllServiceStatus,
  checkAllServices,
  getOverallStatus,
  getServiceHistory,
  calculateUptime,
} from '@/lib/platform/healthService';
import { ServiceName } from '@/types/observability';
import { withMetrics } from '@/lib/api/metricsMiddleware';

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
    const includeHistory = searchParams.get('includeHistory') === 'true';
    const historyHours = parseInt(searchParams.get('historyHours') || '24', 10);

    // Get current status
    const services = await getAllServiceStatus();
    const overallStatus = await getOverallStatus();

    // Calculate overall 24h uptime
    const uptimes = await Promise.all(
      services.map(async (s) => ({
        service: s.serviceName,
        uptime: await calculateUptime(s.serviceName, 24),
      }))
    );
    const avgUptime = uptimes.reduce((sum, u) => sum + u.uptime, 0) / uptimes.length;

    // Get history if requested
    let history: Record<string, any[]> | undefined;
    if (includeHistory) {
      const serviceNames: ServiceName[] = ['api', 'database', 'ai', 'email', 'storage'];
      const historyData = await Promise.all(
        serviceNames.map(async (serviceName) => ({
          serviceName,
          data: await getServiceHistory(serviceName, historyHours),
        }))
      );
      history = historyData.reduce(
        (acc, { serviceName, data }) => {
          acc[serviceName] = data.map((h) => ({
            status: h.status,
            latencyMs: h.latencyMs,
            recordedAt: h.recordedAt.toISOString(),
            errorMessage: h.errorMessage,
          }));
          return acc;
        },
        {} as Record<string, any[]>
      );
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      overallStatus,
      avgUptime24h: Math.round(avgUptime * 100) / 100,
      services: services.map((s) => ({
        serviceName: s.serviceName,
        status: s.status,
        latencyMs: s.latencyMs,
        lastCheckedAt: s.lastCheckedAt?.toISOString(),
        nextCheckAt: s.nextCheckAt?.toISOString(),
        errorMessage: s.errorMessage,
        consecutiveFailures: s.consecutiveFailures,
        uptimePercent24h: s.uptimePercent24h,
      })),
      uptimes,
      history,
    });
  } catch (error) {
    console.error('[Admin System Status] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch system status' }, { status: 500 });
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

    // Trigger health check for all services
    const services = await checkAllServices();
    const overallStatus = await getOverallStatus();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      message: 'Health check completed',
      overallStatus,
      services: services.map((s) => ({
        serviceName: s.serviceName,
        status: s.status,
        latencyMs: s.latencyMs,
        lastCheckedAt: s.lastCheckedAt?.toISOString(),
        errorMessage: s.errorMessage,
        consecutiveFailures: s.consecutiveFailures,
        uptimePercent24h: s.uptimePercent24h,
      })),
    });
  } catch (error) {
    console.error('[Admin System Status] Error triggering health check:', error);
    return NextResponse.json({ error: 'Failed to trigger health check' }, { status: 500 });
  }
});
