/**
 * Get User's Review API
 *
 * GET /api/marketplace/applications/[id]/reviews/me - Get current user's review
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getUserReview } from '@/lib/platform/applicationReviews';

export const dynamic = 'force-dynamic';

/**
 * GET /api/marketplace/applications/[id]/reviews/me
 * Get current user's review for an application
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const review = await getUserReview(id, session.userId);

    return NextResponse.json({
      success: true,
      review: review || null,
    });
  } catch (error: any) {
    console.error('[Reviews API] Get user review error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get user review' },
      { status: 500 }
    );
  }
}
