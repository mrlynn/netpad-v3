/**
 * Admin Audit Logs API
 *
 * GET: Get audit logs with filters and pagination
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { isPlatformAdmin } from '@/lib/platform/users';
import {
  getAuditLogs,
  getAuditLogStats,
  exportAuditLogsToCSV,
  PlatformAuditAction,
} from '@/lib/platform/platformAuditLogger';

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
    const format = searchParams.get('format'); // 'json' or 'csv'
    const includeStats = searchParams.get('includeStats') === 'true';

    // Build query from params
    const eventType = searchParams.get('eventType');
    const eventTypes = searchParams.get('eventTypes'); // Comma-separated list
    const userId = searchParams.get('userId');
    const resourceType = searchParams.get('resourceType');
    const resourceId = searchParams.get('resourceId');
    const organizationId = searchParams.get('organizationId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const query = {
      eventType: eventTypes
        ? (eventTypes.split(',') as PlatformAuditAction[])
        : eventType
          ? (eventType as PlatformAuditAction)
          : undefined,
      userId: userId || undefined,
      resourceType: resourceType || undefined,
      resourceId: resourceId || undefined,
      organizationId: organizationId || undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      search: search || undefined,
      limit,
      offset,
    };

    // Handle CSV export
    if (format === 'csv') {
      const csv = await exportAuditLogsToCSV(query);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    // Get logs
    const result = await getAuditLogs(query);

    // Get stats if requested
    let stats = null;
    if (includeStats) {
      const statsDays = parseInt(searchParams.get('statsDays') || '30', 10);
      stats = await getAuditLogStats(statsDays);
    }

    return NextResponse.json({
      success: true,
      logs: result.logs.map((log) => ({
        ...log,
        _id: log._id?.toString(),
        timestamp: log.timestamp.toISOString(),
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
    console.error('[Admin Audit Logs] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}
