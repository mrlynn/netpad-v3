'use client';

import React from 'react';
import { Background, BackgroundVariant } from 'reactflow';
import { Box, useTheme } from '@mui/material';

interface NetPadBrandedBackgroundProps {
  variant?: BackgroundVariant;
  gap?: number;
  size?: number;
  color?: string;
  isEmbedded?: boolean;
}

/**
 * Custom NetPad-branded background component for ReactFlow canvas
 * Enhances the default Background with NetPad-specific branding elements
 */
export function NetPadBrandedBackground({
  variant = BackgroundVariant.Dots,
  gap = 20,
  size = 1,
  color,
}: NetPadBrandedBackgroundProps) {
  const theme = useTheme();
  const colorMode = theme.palette.mode;

  // More visible NetPad-branded dot colors
  const dotColor = color || (colorMode === 'dark'
    ? 'rgba(0, 237, 100, 0.15)' // More visible green dots in dark mode
    : 'rgba(0, 104, 74, 0.2)'   // More visible green dots in light mode
  );

  return (
    <>
      <Background
        variant={variant}
        gap={gap}
        size={size}
        color={dotColor}
      />

      {/* Large centered NetPad logo watermark */}
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          userSelect: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box
          component="img"
          src="/netpad-logo.svg"
          alt=""
          sx={{
            width: 200,
            height: 200,
            opacity: 0.035,
            filter: colorMode === 'dark'
              ? 'brightness(0) invert(1)'
              : 'brightness(0)',
          }}
        />
      </Box>
    </>
  );
}
