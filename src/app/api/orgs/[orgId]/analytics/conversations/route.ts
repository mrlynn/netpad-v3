/**
 * Organization Conversation Analytics API
 *
 * GET: Get detailed conversation analytics and list conversations
 *
 * Query Parameters:
 * - days: Number of days to include (default: 30)
 * - formId: Filter by specific form
 * - status: Filter by status (draft, submitted, abandoned, all)
 * - limit: Max conversations to return (default: 50)
 * - offset: Pagination offset (default: 0)
 * - sortBy: Sort field (submittedAt, turnCount, duration, confidence)
 * - sortOrder: Sort order (asc, desc)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { checkOrgAdminAccess, getOrganization } from '@/lib/platform/organizations';
import {
  getConversationAnalytics,
  listConversations,
  markAbandonedConversations,
} from '@/lib/conversational/persistence';

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
    const status = searchParams.get('status') as 'draft' | 'submitted' | 'abandoned' | 'all' || 'all';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const sortBy = searchParams.get('sortBy') as 'submittedAt' | 'turnCount' | 'duration' | 'confidence' || 'submittedAt';
    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' || 'desc';

    // Get analytics summary
    const analytics = await getConversationAnalytics(orgId, {
      formId,
      days,
      includeRecentConversations: false,
    });

    // Get paginated list
    const { conversations, total } = await listConversations(orgId, {
      formId,
      status,
      limit,
      offset,
      sortBy,
      sortOrder,
    });

    return NextResponse.json({
      success: true,
      analytics,
      conversations,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error: any) {
    console.error('[Org Conversation Analytics API] Error:', error);
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
export async function POST(
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

    const body = await request.json();
    const { action, hoursOld = 24 } = body;

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
    console.error('[Org Conversation Analytics API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Action failed' },
      { status: 500 }
    );
  }
}
