/**
 * Rating Input Component
 *
 * Interactive star rating input (1-5 stars).
 */

'use client';

import { useState } from 'react';
import { Box, Tooltip } from '@mui/material';
import { Star, StarBorder } from '@mui/icons-material';
import { alpha } from '@mui/material/styles';

interface RatingInputProps {
  value: number; // 0-5
  onChange: (rating: number) => void;
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  color?: string;
}

const sizeMap = {
  small: 24,
  medium: 32,
  large: 40,
};

const labels: { [key: number]: string } = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Very Good',
  5: 'Excellent',
};

export function RatingInput({
  value,
  onChange,
  size = 'medium',
  disabled = false,
  color = '#FFA500',
}: RatingInputProps) {
  const [hover, setHover] = useState(0);
  const starSize = sizeMap[size];

  const handleClick = (rating: number) => {
    if (!disabled) {
      onChange(rating);
    }
  };

  const handleMouseEnter = (rating: number) => {
    if (!disabled) {
      setHover(rating);
    }
  };

  const handleMouseLeave = () => {
    if (!disabled) {
      setHover(0);
    }
  };

  const displayValue = hover || value;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        cursor: disabled ? 'default' : 'pointer',
      }}
    >
      {[1, 2, 3, 4, 5].map((rating) => {
        const isFilled = rating <= displayValue;
        return (
          <Tooltip key={rating} title={labels[rating]} arrow>
            <Box
              onClick={() => handleClick(rating)}
              onMouseEnter={() => handleMouseEnter(rating)}
              onMouseLeave={handleMouseLeave}
              sx={{
                display: 'flex',
                alignItems: 'center',
                opacity: disabled ? 0.5 : 1,
                transition: 'transform 0.1s',
                '&:hover': disabled ? {} : { transform: 'scale(1.1)' },
              }}
            >
              {isFilled ? (
                <Star
                  sx={{
                    fontSize: starSize,
                    color: color,
                  }}
                />
              ) : (
                <StarBorder
                  sx={{
                    fontSize: starSize,
                    color: alpha(color, 0.3),
                  }}
                />
              )}
            </Box>
          </Tooltip>
        );
      })}
    </Box>
  );
}
