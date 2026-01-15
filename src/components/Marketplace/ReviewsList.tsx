/**
 * Reviews List Component
 *
 * Displays a paginated list of reviews with sorting and filtering options.
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Pagination,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  Divider,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import { RatingStars } from './RatingStars';
import { formatDistanceToNow } from 'date-fns';

interface Review {
  reviewId: string;
  userId: string;
  userName?: string;
  rating: number;
  title?: string;
  review?: string;
  createdAt: string;
  updatedAt: string;
}

interface ReviewsListProps {
  applicationId: string;
  currentUserId?: string;
  onReviewUpdate?: () => void;
}

export function ReviewsList({
  applicationId,
  currentUserId,
  onReviewUpdate,
}: ReviewsListProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(10);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'rating'>('newest');
  const [averageRating, setAverageRating] = useState(0);
  const [ratingDistribution, setRatingDistribution] = useState<{
    '5': number;
    '4': number;
    '3': number;
    '2': number;
    '1': number;
  }>({ '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 });

  useEffect(() => {
    loadReviews();
  }, [applicationId, page, sortBy]);

  const loadReviews = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        sortBy,
      });

      const response = await fetch(`/api/marketplace/applications/${applicationId}/reviews?${params}`);

      if (!response.ok) {
        throw new Error('Failed to load reviews');
      }

      const data = await response.json();
      setReviews(data.reviews || []);
      setTotal(data.total || 0);
      setAverageRating(data.averageRating || 0);
      setRatingDistribution(data.ratingDistribution || { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 });
    } catch (err) {
      console.error('Error loading reviews:', err);
      setError(err instanceof Error ? err.message : 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const handleSortChange = (event: SelectChangeEvent) => {
    setSortBy(event.target.value as 'newest' | 'oldest' | 'rating');
    setPage(1); // Reset to first page
  };

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return dateString;
    }
  };


  if (loading && reviews.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && reviews.length === 0) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Summary */}
      {total > 0 && (
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Typography variant="h6">
              {averageRating > 0 ? averageRating.toFixed(1) : '0.0'}
            </Typography>
            <RatingStars rating={averageRating} size="medium" />
            <Typography variant="body2" color="text.secondary">
              Based on {total} review{total !== 1 ? 's' : ''}
            </Typography>
          </Box>
        </Box>
      )}

      {/* Sort Controls */}
      {total > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="subtitle2">
            {total} review{total !== 1 ? 's' : ''}
          </Typography>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Sort by</InputLabel>
            <Select value={sortBy} onChange={handleSortChange} label="Sort by">
              <MenuItem value="newest">Newest First</MenuItem>
              <MenuItem value="oldest">Oldest First</MenuItem>
              <MenuItem value="rating">Highest Rating</MenuItem>
            </Select>
          </FormControl>
        </Box>
      )}

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            No reviews yet. Be the first to review this application!
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {reviews.map((review) => (
            <Paper key={review.reviewId} sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {review.userName || 'Anonymous'}
                    </Typography>
                    {currentUserId === review.userId && (
                      <Chip label="You" size="small" color="primary" />
                    )}
                  </Box>
                  <RatingStars rating={review.rating} size="small" />
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {formatDate(review.createdAt)}
                  {review.updatedAt !== review.createdAt && ' (edited)'}
                </Typography>
              </Box>
              {review.title && (
                <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600 }}>
                  {review.title}
                </Typography>
              )}
              {review.review && (
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                  {review.review}
                </Typography>
              )}
            </Paper>
          ))}
        </Box>
      )}

      {/* Pagination */}
      {total > pageSize && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={Math.ceil(total / pageSize)}
            page={page}
            onChange={(_, newPage) => setPage(newPage)}
            color="primary"
          />
        </Box>
      )}
    </Box>
  );
}
