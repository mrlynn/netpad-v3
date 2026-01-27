/**
 * Admin Errors API
 *
 * GET: Get errors with filters and pagination
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { isPlatformAdmin } from '@/lib/platform/users';
import {
  getErrors,
  getErrorSummary,
  getGroupedErrors,
} from '@/lib/platform/errorTracker';
import { ErrorSource, ErrorSeverity, ErrorStatus } from '@/types/observability';

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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const includeStats = searchParams.get('includeStats') === 'true';
    const grouped = searchParams.get('grouped') === 'true';
    const statsDays = parseInt(searchParams.get('statsDays') || '7', 10);

    // If grouped view requested, return top errors
    if (grouped) {
      const groupedLimit = parseInt(searchParams.get('groupedLimit') || '20', 10);
      const errors = await getGroupedErrors(groupedLimit);

      let stats = null;
      if (includeStats) {
        stats = await getErrorSummary(statsDays);
      }

      return NextResponse.json({
        success: true,
        errors: errors.map((error) => ({
          ...error,
          _id: error._id?.toString(),
          firstSeenAt: error.firstSeenAt.toISOString(),
          lastSeenAt: error.lastSeenAt.toISOString(),
          createdAt: error.createdAt.toISOString(),
          acknowledgedAt: error.acknowledgedAt?.toISOString(),
          resolvedAt: error.resolvedAt?.toISOString(),
        })),
        stats,
      });
    }

    // Build query from params
    const source = searchParams.get('source');
    const sources = searchParams.get('sources'); // Comma-separated
    const severity = searchParams.get('severity');
    const severities = searchParams.get('severities'); // Comma-separated
    const status = searchParams.get('status');
    const statuses = searchParams.get('statuses'); // Comma-separated
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const query = {
      source: sources
        ? (sources.split(',') as ErrorSource[])
        : source
          ? (source as ErrorSource)
          : undefined,
      severity: severities
        ? (severities.split(',') as ErrorSeverity[])
        : severity
          ? (severity as ErrorSeverity)
          : undefined,
      status: statuses
        ? (statuses.split(',') as ErrorStatus[])
        : status
          ? (status as ErrorStatus)
          : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      search: search || undefined,
      limit,
      offset,
    };

    // Get errors
    const result = await getErrors(query);

    // Get stats if requested
    let stats = null;
    if (includeStats) {
      stats = await getErrorSummary(statsDays);
    }

    return NextResponse.json({
      success: true,
      errors: result.errors.map((error) => ({
        ...error,
        _id: error._id?.toString(),
        firstSeenAt: error.firstSeenAt.toISOString(),
        lastSeenAt: error.lastSeenAt.toISOString(),
        createdAt: error.createdAt.toISOString(),
        acknowledgedAt: error.acknowledgedAt?.toISOString(),
        resolvedAt: error.resolvedAt?.toISOString(),
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
    console.error('[Admin Errors] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch errors' }, { status: 500 });
  }
}
