/**
 * Application Reviews Management
 *
 * Handles ratings and reviews for marketplace applications.
 * Stores reviews in platform database, updates marketplace application stats.
 */

import { ObjectId } from 'mongodb';
import { getPlatformDb } from './db';
import { generateSecureId } from '@/lib/encryption';

export interface ApplicationReview {
  _id?: ObjectId;
  reviewId: string;                // "rev_abc123"
  marketplaceApplicationId: string; // ID from marketplace_applications
  userId: string;                  // User who wrote the review
  userName?: string;               // Snapshot of user name
  userEmail?: string;              // Snapshot of user email (optional)
  
  // Rating
  rating: number;                  // 1-5 stars
  title?: string;                  // Optional review title
  review?: string;                 // Optional written review text
  
  // Metadata
  helpfulCount?: number;           // Number of users who found this helpful (future)
  reportedCount?: number;          // Number of times reported (future)
  status: 'published' | 'hidden' | 'deleted';
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface CreateReviewInput {
  marketplaceApplicationId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  rating: number;                  // 1-5
  title?: string;
  review?: string;
}

export interface UpdateReviewInput {
  rating?: number;
  title?: string;
  review?: string;
}

export interface RatingStats {
  averageRating: number;
  reviews: number;
  ratingDistribution: {
    '5': number;
    '4': number;
    '3': number;
    '2': number;
    '1': number;
  };
}

/**
 * Create or update a review (one review per user per application)
 */
export async function createOrUpdateReview(
  input: CreateReviewInput
): Promise<ApplicationReview> {
  const db = await getPlatformDb();
  const collection = db.collection<ApplicationReview>('application_reviews');

  // Check for existing review
  const existing = await collection.findOne({
    marketplaceApplicationId: input.marketplaceApplicationId,
    userId: input.userId,
    status: 'published',
  });

  const now = new Date();

  if (existing) {
    // Update existing review
    const updated: Partial<ApplicationReview> = {
      rating: input.rating,
      title: input.title,
      review: input.review,
      updatedAt: now,
    };

    await collection.updateOne(
      { reviewId: existing.reviewId },
      { $set: updated }
    );

    return { ...existing, ...updated } as ApplicationReview;
  } else {
    // Create new review
    const review: ApplicationReview = {
      reviewId: generateSecureId('rev'),
      marketplaceApplicationId: input.marketplaceApplicationId,
      userId: input.userId,
      userName: input.userName,
      userEmail: input.userEmail,
      rating: input.rating,
      title: input.title,
      review: input.review,
      status: 'published',
      createdAt: now,
      updatedAt: now,
    };

    await collection.insertOne(review);
    return review;
  }
}

/**
 * Get review by ID
 */
export async function getReview(reviewId: string): Promise<ApplicationReview | null> {
  const db = await getPlatformDb();
  const collection = db.collection<ApplicationReview>('application_reviews');
  return collection.findOne({ reviewId, status: { $ne: 'deleted' } });
}

/**
 * Get user's review for an application
 */
export async function getUserReview(
  marketplaceApplicationId: string,
  userId: string
): Promise<ApplicationReview | null> {
  const db = await getPlatformDb();
  const collection = db.collection<ApplicationReview>('application_reviews');
  return collection.findOne({
    marketplaceApplicationId,
    userId,
    status: 'published',
  });
}

/**
 * List reviews for an application
 */
export async function listReviews(
  marketplaceApplicationId: string,
  options?: {
    page?: number;
    pageSize?: number;
    sortBy?: 'newest' | 'oldest' | 'rating' | 'helpful';
    minRating?: number;
    status?: 'published' | 'hidden';
  }
): Promise<{
  reviews: ApplicationReview[];
  total: number;
}> {
  const db = await getPlatformDb();
  const collection = db.collection<ApplicationReview>('application_reviews');

  const page = options?.page || 1;
  const pageSize = options?.pageSize || 10;
  const skip = (page - 1) * pageSize;

  const query: any = {
    marketplaceApplicationId,
    status: options?.status || 'published',
  };

  if (options?.minRating) {
    query.rating = { $gte: options.minRating };
  }

  // Sort
  let sort: any = { createdAt: -1 }; // Default: newest first
  if (options?.sortBy === 'oldest') {
    sort = { createdAt: 1 };
  } else if (options?.sortBy === 'rating') {
    sort = { rating: -1, createdAt: -1 };
  } else if (options?.sortBy === 'helpful') {
    sort = { helpfulCount: -1, createdAt: -1 };
  }

  const [reviews, total] = await Promise.all([
    collection.find(query).sort(sort).skip(skip).limit(pageSize).toArray(),
    collection.countDocuments(query),
  ]);

  return { reviews, total };
}

/**
 * Update review
 */
export async function updateReview(
  reviewId: string,
  userId: string,
  updates: UpdateReviewInput
): Promise<ApplicationReview | null> {
  const db = await getPlatformDb();
  const collection = db.collection<ApplicationReview>('application_reviews');

  // Verify ownership
  const review = await collection.findOne({ reviewId, userId });
  if (!review) {
    return null;
  }

  const update: Partial<ApplicationReview> = {
    ...updates,
    updatedAt: new Date(),
  };

  await collection.updateOne(
    { reviewId },
    { $set: update }
  );

  return { ...review, ...update } as ApplicationReview;
}

/**
 * Delete review (soft delete)
 */
export async function deleteReview(
  reviewId: string,
  userId: string
): Promise<boolean> {
  const db = await getPlatformDb();
  const collection = db.collection<ApplicationReview>('application_reviews');

  // Verify ownership
  const review = await collection.findOne({ reviewId, userId });
  if (!review) {
    return false;
  }

  await collection.updateOne(
    { reviewId },
    {
      $set: {
        status: 'deleted',
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
    }
  );

  return true;
}

/**
 * Calculate rating statistics for an application
 */
export async function calculateRatingStats(
  marketplaceApplicationId: string
): Promise<RatingStats> {
  const db = await getPlatformDb();
  const collection = db.collection<ApplicationReview>('application_reviews');

  const reviews = await collection
    .find({
      marketplaceApplicationId,
      status: 'published',
    })
    .toArray();

  if (reviews.length === 0) {
    return {
      averageRating: 0,
      reviews: 0,
      ratingDistribution: {
        '5': 0,
        '4': 0,
        '3': 0,
        '2': 0,
        '1': 0,
      },
    };
  }

  const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
  const averageRating = totalRating / reviews.length;

  const distribution = {
    '5': reviews.filter((r) => r.rating === 5).length,
    '4': reviews.filter((r) => r.rating === 4).length,
    '3': reviews.filter((r) => r.rating === 3).length,
    '2': reviews.filter((r) => r.rating === 2).length,
    '1': reviews.filter((r) => r.rating === 1).length,
  };

  return {
    averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
    reviews: reviews.length,
    ratingDistribution: distribution,
  };
}

/**
 * Update marketplace application stats with rating information
 */
export async function updateMarketplaceApplicationStats(
  marketplaceApplicationId: string
): Promise<void> {
  const db = await getPlatformDb();
  const marketplaceCollection = db.collection('marketplace_applications');
  const stats = await calculateRatingStats(marketplaceApplicationId);

  await marketplaceCollection.updateOne(
    { id: marketplaceApplicationId },
    {
      $set: {
        'stats.rating': stats.averageRating > 0 ? stats.averageRating : undefined,
        'stats.reviews': stats.reviews,
        'stats.ratingDistribution': stats.ratingDistribution,
      },
    }
  );
}
