/**
 * Admin Conversations Analytics API
 *
 * GET: Get conversation analytics and list conversations
 *
 * Query Parameters:
 * - orgId: Organization ID (required for non-platform admins)
 * - formId: Filter by form ID
 * - days: Number of days to include (default: 30)
 * - status: Filter by status (draft, submitted, abandoned, all)
 * - includeList: Include list of conversations (default: false)
 * - limit: Max conversations to return (default: 50)
 * - offset: Pagination offset (default: 0)
 * - sortBy: Sort field (submittedAt, turnCount, duration, confidence)
 * - sortOrder: Sort order (asc, desc)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { isPlatformAdmin } from '@/lib/platform/users';
import { getUserOrganizations } from '@/lib/platform/organizations';
import { Organization } from '@/types/platform';
import {
  getConversationAnalytics,
  listConversations,
  markAbandonedConversations,
} from '@/lib/conversational/persistence';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const orgId = searchParams.get('orgId');
    const formId = searchParams.get('formId') || undefined;
    const days = parseInt(searchParams.get('days') || '30', 10);
    const status = searchParams.get('status') as 'draft' | 'submitted' | 'abandoned' | 'all' || 'all';
    const includeList = searchParams.get('includeList') === 'true';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const sortBy = searchParams.get('sortBy') as 'submittedAt' | 'turnCount' | 'duration' | 'confidence' || 'submittedAt';
    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' || 'desc';

    // Check authorization
    const isAdmin = await isPlatformAdmin(session.userId);

    // If not platform admin, verify user has access to the organization
    if (!isAdmin) {
      if (!orgId) {
        return NextResponse.json(
          { error: 'Organization ID required' },
          { status: 400 }
        );
      }

      const userOrgs = await getUserOrganizations(session.userId);
      const hasAccess = userOrgs.some((org: Organization) => org.orgId === orgId);
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Access denied to this organization' },
          { status: 403 }
        );
      }
    }

    // If no orgId provided and user is admin, return error (need to specify org)
    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization ID required' },
        { status: 400 }
      );
    }

    // Get analytics
    const analytics = await getConversationAnalytics(orgId, {
      formId,
      days,
      includeRecentConversations: !includeList, // Include recent if not fetching full list
      limit: includeList ? 10 : limit, // Limit recent conversations in analytics
    });

    // Get full list if requested
    let conversations;
    let total;
    if (includeList) {
      const listResult = await listConversations(orgId, {
        formId,
        status,
        limit,
        offset,
        sortBy,
        sortOrder,
      });
      conversations = listResult.conversations;
      total = listResult.total;
    }

    return NextResponse.json({
      success: true,
      analytics,
      ...(includeList && {
        conversations,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < (total || 0),
        },
      }),
    });
  } catch (error: any) {
    console.error('[Admin Conversations API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch conversation analytics' },
      { status: 500 }
    );
  }
}

/**
 * POST: Perform administrative actions on conversations
 *
 * Actions:
 * - markAbandoned: Mark old draft conversations as abandoned
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { action, orgId, hoursOld = 24 } = body;

    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
    }

    // Check authorization
    const isAdmin = await isPlatformAdmin(session.userId);
    if (!isAdmin) {
      const userOrgs = await getUserOrganizations(session.userId);
      const hasAccess = userOrgs.some((org: Organization) => org.orgId === orgId);
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Access denied to this organization' },
          { status: 403 }
        );
      }
    }

    switch (action) {
      case 'markAbandoned': {
        const count = await markAbandonedConversations(orgId, hoursOld);
        return NextResponse.json({
          success: true,
          message: `Marked ${count} conversations as abandoned`,
          count,
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('[Admin Conversations API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Action failed' },
      { status: 500 }
    );
  }
}
