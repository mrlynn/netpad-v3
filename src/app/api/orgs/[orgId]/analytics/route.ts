/**
 * Organization Analytics API
 *
 * GET: Get combined analytics for an organization
 *
 * Includes:
 * - Conversation analytics (conversational forms)
 * - Form submission analytics (standard forms)
 * - Combined metrics
 *
 * Query Parameters:
 * - days: Number of days to include (default: 30)
 * - formId: Filter by specific form
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { checkOrgAdminAccess, getOrganization } from '@/lib/platform/organizations';
import { getConversationAnalytics } from '@/lib/conversational/persistence';
import { getSubmissionStats } from '@/lib/platform/submissions';

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

    // Get conversation analytics
    const conversationAnalytics = await getConversationAnalytics(orgId, {
      formId,
      days,
      includeRecentConversations: true,
      limit: 10,
    });

    // Get standard form submission stats
    const submissionStats = await getSubmissionStats(orgId, formId);

    // Calculate combined metrics
    const totalInteractions = conversationAnalytics.totalConversations + submissionStats.total;
    const totalCompleted = conversationAnalytics.completedConversations + submissionStats.synced;

    return NextResponse.json({
      success: true,
      organization: {
        orgId: org.orgId,
        name: org.name,
        slug: org.slug,
        plan: org.plan,
      },
      analytics: {
        period: {
          days,
          startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
        },
        combined: {
          totalInteractions,
          totalCompleted,
          overallCompletionRate: totalInteractions > 0
            ? Math.round((totalCompleted / totalInteractions) * 100)
            : 0,
        },
        conversations: conversationAnalytics,
        submissions: {
          total: submissionStats.total,
          pending: submissionStats.pending,
          synced: submissionStats.synced,
          failed: submissionStats.failed,
          syncRate: submissionStats.total > 0
            ? Math.round((submissionStats.synced / submissionStats.total) * 100)
            : 0,
        },
      },
    });
  } catch (error: any) {
    console.error('[Org Analytics API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
