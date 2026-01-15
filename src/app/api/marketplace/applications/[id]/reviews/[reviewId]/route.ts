/**
 * Review Management API
 *
 * PUT /api/marketplace/applications/[id]/reviews/[reviewId] - Update review
 * DELETE /api/marketplace/applications/[id]/reviews/[reviewId] - Delete review
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import {
  updateReview,
  deleteReview,
  updateMarketplaceApplicationStats,
  calculateRatingStats,
} from '@/lib/platform/applicationReviews';

export const dynamic = 'force-dynamic';

/**
 * PUT /api/marketplace/applications/[id]/reviews/[reviewId]
 * Update a review
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; reviewId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { reviewId } = await params;
    const body = await request.json();
    const { rating, title, review } = body;

    // Validation
    if (rating !== undefined) {
      if (typeof rating !== 'number' || rating < 1 || rating > 5) {
        return NextResponse.json(
          { error: 'Rating must be a number between 1 and 5' },
          { status: 400 }
        );
      }
    }

    const updated = await updateReview(reviewId, session.userId, {
      rating: rating ? Math.round(rating) : undefined,
      title: title?.trim() || undefined,
      review: review?.trim() || undefined,
    });

    if (!updated) {
      return NextResponse.json(
        { error: 'Review not found or you do not have permission to update it' },
        { status: 404 }
      );
    }

    // Update marketplace application stats
    const { id } = await params;
    await updateMarketplaceApplicationStats(id);
    const updatedStats = await calculateRatingStats(id);

    return NextResponse.json({
      success: true,
      review: updated,
      updatedStats: {
        averageRating: updatedStats.averageRating,
        reviews: updatedStats.reviews,
      },
    });
  } catch (error: any) {
    console.error('[Reviews API] Update error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update review' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/marketplace/applications/[id]/reviews/[reviewId]
 * Delete a review
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; reviewId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { reviewId } = await params;
    const deleted = await deleteReview(reviewId, session.userId);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Review not found or you do not have permission to delete it' },
        { status: 404 }
      );
    }

    // Update marketplace application stats
    const { id } = await params;
    await updateMarketplaceApplicationStats(id);
    const updatedStats = await calculateRatingStats(id);

    return NextResponse.json({
      success: true,
      updatedStats: {
        averageRating: updatedStats.averageRating,
        reviews: updatedStats.reviews,
      },
    });
  } catch (error: any) {
    console.error('[Reviews API] Delete error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete review' },
      { status: 500 }
    );
  }
}
