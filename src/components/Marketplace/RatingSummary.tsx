/**
 * Rating Summary Component
 *
 * Displays average rating with review count.
 */

'use client';

import { Box, Typography, Chip } from '@mui/material';
import { RatingStars } from './RatingStars';

interface RatingSummaryProps {
  averageRating: number;
  reviewCount: number;
  size?: 'small' | 'medium' | 'large';
  showDistribution?: boolean;
  ratingDistribution?: {
    '5': number;
    '4': number;
    '3': number;
    '2': number;
    '1': number;
  };
}

export function RatingSummary({
  averageRating,
  reviewCount,
  size = 'medium',
  showDistribution = false,
  ratingDistribution,
}: RatingSummaryProps) {
  if (reviewCount === 0) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="body2" color="text.secondary">
          No reviews yet
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <RatingStars rating={averageRating} size={size} showValue />
        <Chip
          label={`${reviewCount} review${reviewCount !== 1 ? 's' : ''}`}
          size="small"
          variant="outlined"
          sx={{
            fontSize: '0.75rem',
            height: 20,
          }}
        />
      </Box>
      {showDistribution && ratingDistribution && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 1 }}>
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = ratingDistribution[rating as keyof typeof ratingDistribution];
            const percentage = reviewCount > 0 ? (count / reviewCount) * 100 : 0;
            return (
              <Box key={rating} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="caption" sx={{ minWidth: 40 }}>
                  {rating} star{rating !== 1 ? 's' : ''}
                </Typography>
                <Box
                  sx={{
                    flex: 1,
                    height: 8,
                    bgcolor: 'divider',
                    borderRadius: 1,
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      width: `${percentage}%`,
                      height: '100%',
                      bgcolor: '#FFA500',
                      transition: 'width 0.3s',
                    }}
                  />
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 30, textAlign: 'right' }}>
                  {count}
                </Typography>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
