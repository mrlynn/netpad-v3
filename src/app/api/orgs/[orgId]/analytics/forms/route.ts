/**
 * Organization Form Analytics API
 *
 * GET: Get detailed form analytics including partial submissions
 *
 * Query Parameters:
 * - days: Number of days to include (default: 30)
 * - formId: Filter by specific form (optional)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { checkOrgAdminAccess, getOrganization } from '@/lib/platform/organizations';
import {
  getSubmissionStats,
  listFormSubmissions,
  getPartialSubmissionAnalytics,
} from '@/lib/platform/submissions';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { orgId } = await params;

    // Check authorization
    const hasAccess = await checkOrgAdminAccess(session.userId, orgId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Admin access required for this organization' },
        { status: 403 }
      );
    }

    // Verify org exists
    const org = await getOrganization(orgId);
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30', 10);
    const formId = searchParams.get('formId') || undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Get submission stats
    const stats = await getSubmissionStats(orgId, formId);

    // Get recent submissions (only if formId is provided, otherwise show all)
    let submissions: any[] = [];
    let total = 0;
    if (formId) {
      const result = await listFormSubmissions(orgId, formId, {
        limit,
        offset,
      });
      submissions = result.submissions;
      total = result.total;
    }

    // Get partial submission analytics if formId is provided
    let partialAnalytics = null;
    if (formId) {
      try {
        partialAnalytics = await getPartialSubmissionAnalytics(orgId, formId, days);
      } catch (err) {
        // Partial analytics may not be available for all forms
        console.warn('[Form Analytics] Could not get partial analytics:', err);
      }
    }

    return NextResponse.json({
      success: true,
      analytics: {
        period: {
          days,
          startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
        },
        stats: {
          total: stats.total,
          pending: stats.pending,
          synced: stats.synced,
          failed: stats.failed,
          syncRate: stats.total > 0
            ? Math.round((stats.synced / stats.total) * 100)
            : 0,
        },
        partial: partialAnalytics,
      },
      submissions: submissions.map(sub => ({
        submissionId: sub.submissionId,
        formId: sub.formId,
        syncStatus: sub.syncStatus,
        submittedAt: sub.submittedAt,
        fieldCount: Object.keys(sub.data || {}).length,
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error: any) {
    console.error('[Org Form Analytics API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch form analytics' },
      { status: 500 }
    );
  }
}
