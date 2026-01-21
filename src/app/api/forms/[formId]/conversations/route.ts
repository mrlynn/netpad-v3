/**
 * Form Conversations API
 *
 * GET: List conversations for a specific form
 *
 * Query Parameters:
 * - orgId: Organization ID (required)
 * - status: Filter by status (draft, submitted, abandoned, all)
 * - limit: Max conversations to return (default: 50)
 * - offset: Pagination offset (default: 0)
 * - sortBy: Sort field (submittedAt, turnCount, duration, confidence)
 * - sortOrder: Sort order (asc, desc)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, ensureSessionId } from '@/lib/session';
import { listConversations } from '@/lib/conversational/persistence';
import { getFormById, getPublishedFormById } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    // Check authentication
    const session = await getIronSession(await cookies(), sessionOptions);
    const sessionId = ensureSessionId(session);
    await session.save();

    const { formId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const orgId = searchParams.get('orgId');

    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
    }

    // Verify form exists and user has access
    const form = await getFormById(sessionId, formId) ||
                 await getPublishedFormById(formId);

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    // Parse query parameters
    const status = searchParams.get('status') as 'draft' | 'submitted' | 'abandoned' | 'all' || 'all';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const sortBy = searchParams.get('sortBy') as 'submittedAt' | 'turnCount' | 'duration' | 'confidence' || 'submittedAt';
    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' || 'desc';

    // Get conversations for this form
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
      conversations,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error: any) {
    console.error('[Form Conversations API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}
