/**
 * Review Form Component
 *
 * Form for creating or editing a review.
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import { RatingInput } from './RatingInput';

interface Review {
  reviewId: string;
  rating: number;
  title?: string;
  review?: string;
}

interface ReviewFormProps {
  applicationId: string;
  existingReview?: Review | null;
  onSubmit: (data: { rating: number; title?: string; review?: string }) => Promise<void>;
  onDelete?: () => Promise<void>;
  onCancel?: () => void;
}

export function ReviewForm({
  applicationId,
  existingReview,
  onSubmit,
  onDelete,
  onCancel,
}: ReviewFormProps) {
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [title, setTitle] = useState(existingReview?.title || '');
  const [review, setReview] = useState(existingReview?.review || '');
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (existingReview) {
      setRating(existingReview.rating);
      setTitle(existingReview.title || '');
      setReview(existingReview.review || '');
    }
  }, [existingReview]);

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        rating,
        title: title.trim() || undefined,
        review: review.trim() || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete || !existingReview) return;

    if (!confirm('Are you sure you want to delete your review?')) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      await onDelete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete review');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Your Rating *
        </Typography>
        <RatingInput value={rating} onChange={setRating} disabled={submitting || deleting} />
      </Box>

      <TextField
        label="Review Title (Optional)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        fullWidth
        disabled={submitting || deleting}
        placeholder="Brief summary of your experience"
      />

      <TextField
        label="Your Review (Optional)"
        value={review}
        onChange={(e) => setReview(e.target.value)}
        fullWidth
        multiline
        rows={4}
        disabled={submitting || deleting}
        placeholder="Share your experience with this application..."
      />

      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
        {existingReview && onDelete && (
          <Button
            variant="outlined"
            color="error"
            onClick={handleDelete}
            disabled={submitting || deleting}
          >
            {deleting ? <CircularProgress size={16} /> : 'Delete'}
          </Button>
        )}
        {onCancel && (
          <Button onClick={onCancel} disabled={submitting || deleting}>
            Cancel
          </Button>
        )}
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={rating === 0 || submitting || deleting}
          startIcon={submitting ? <CircularProgress size={16} /> : null}
        >
          {submitting ? 'Submitting...' : existingReview ? 'Update Review' : 'Submit Review'}
        </Button>
      </Box>
    </Box>
  );
}
