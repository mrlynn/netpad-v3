/**
 * Application Reviews API
 *
 * GET /api/marketplace/applications/[id]/reviews - List reviews
 * POST /api/marketplace/applications/[id]/reviews - Create review
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import {
  listReviews,
  createOrUpdateReview,
  calculateRatingStats,
  updateMarketplaceApplicationStats,
} from '@/lib/platform/applicationReviews';

export const dynamic = 'force-dynamic';

/**
 * GET /api/marketplace/applications/[id]/reviews
 * List reviews for an application
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);
    const sortBy = (searchParams.get('sortBy') || 'newest') as 'newest' | 'oldest' | 'rating' | 'helpful';
    const minRating = searchParams.get('minRating') ? parseInt(searchParams.get('minRating')!, 10) : undefined;

    const { reviews, total } = await listReviews(id, {
      page,
      pageSize,
      sortBy,
      minRating,
      status: 'published',
    });

    const stats = await calculateRatingStats(id);

    return NextResponse.json({
      success: true,
      reviews,
      total,
      page,
      pageSize,
      averageRating: stats.averageRating,
      ratingDistribution: stats.ratingDistribution,
    });
  } catch (error: any) {
    console.error('[Reviews API] List error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list reviews' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/marketplace/applications/[id]/reviews
 * Create or update a review
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { rating, title, review } = body;

    // Validation
    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be a number between 1 and 5' },
        { status: 400 }
      );
    }

    // Get user info
    const { getUsersCollection } = await import('@/lib/platform/db');
    const usersCollection = await getUsersCollection();
    const user = await usersCollection.findOne({ userId: session.userId });

    const reviewDoc = await createOrUpdateReview({
      marketplaceApplicationId: id,
      userId: session.userId,
      userName: user?.name || user?.email || 'Anonymous',
      userEmail: user?.email,
      rating: Math.round(rating), // Ensure integer
      title: title?.trim() || undefined,
      review: review?.trim() || undefined,
    });

    // Update marketplace application stats
    await updateMarketplaceApplicationStats(id);
    const updatedStats = await calculateRatingStats(id);

    return NextResponse.json({
      success: true,
      review: reviewDoc,
      updatedStats: {
        averageRating: updatedStats.averageRating,
        reviews: updatedStats.reviews,
      },
    });
  } catch (error: any) {
    console.error('[Reviews API] Create error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create review' },
      { status: 500 }
    );
  }
}
