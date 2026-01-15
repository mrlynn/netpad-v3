/**
 * Rating Stars Component
 *
 * Displays a read-only star rating (1-5 stars).
 */

'use client';

import { Box } from '@mui/material';
import { Star, StarBorder } from '@mui/icons-material';
import { alpha } from '@mui/material/styles';

interface RatingStarsProps {
  rating: number; // 0-5
  size?: 'small' | 'medium' | 'large';
  showValue?: boolean;
  color?: string;
}

const sizeMap = {
  small: 16,
  medium: 20,
  large: 24,
};

export function RatingStars({
  rating,
  size = 'medium',
  showValue = false,
  color = '#FFA500',
}: RatingStarsProps) {
  const starSize = sizeMap[size];
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        {Array.from({ length: fullStars }).map((_, i) => (
          <Star
            key={`full-${i}`}
            sx={{
              fontSize: starSize,
              color: color,
            }}
          />
        ))}
        {hasHalfStar && (
          <Star
            sx={{
              fontSize: starSize,
              color: color,
              opacity: 0.5,
            }}
          />
        )}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <StarBorder
            key={`empty-${i}`}
            sx={{
              fontSize: starSize,
              color: alpha(color, 0.3),
            }}
          />
        ))}
      </Box>
      {showValue && rating > 0 && (
        <Box
          component="span"
          sx={{
            fontSize: size === 'small' ? '0.75rem' : size === 'large' ? '1rem' : '0.875rem',
            color: 'text.secondary',
            ml: 0.5,
          }}
        >
          {rating.toFixed(1)}
        </Box>
      )}
    </Box>
  );
}
