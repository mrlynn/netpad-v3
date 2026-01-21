'use client';

/**
 * BenefitsList Component
 *
 * Displays a list of benefits with checkmark icons.
 * Used in the database step to show auto-provision advantages.
 */

import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { CheckCircle } from '@mui/icons-material';

interface Benefit {
  text: string;
  emphasis?: boolean;
}

interface BenefitsListProps {
  benefits: Benefit[];
}

export function BenefitsList({ benefits }: BenefitsListProps) {
  const theme = useTheme();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {benefits.map((benefit, index) => (
        <Box
          key={index}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <CheckCircle
            sx={{
              fontSize: 20,
              color: theme.palette.success.main,
              flexShrink: 0,
            }}
          />
          <Typography
            variant="body2"
            sx={{
              color: benefit.emphasis ? 'text.primary' : 'text.secondary',
              fontWeight: benefit.emphasis ? 600 : 400,
            }}
          >
            {benefit.text}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
