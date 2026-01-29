'use client';

import React from 'react';
import { Background, BackgroundVariant } from 'reactflow';
import { Box, useTheme } from '@mui/material';
import { CanvasVisualSettings } from '@/types/workflow';

interface NetPadBrandedBackgroundProps {
  variant?: BackgroundVariant;
  gap?: number;
  size?: number;
  color?: string;
  isEmbedded?: boolean;
  showWatermark?: boolean;
  watermarkOpacity?: number;
  visualSettings?: CanvasVisualSettings;
}

/**
 * Maps the visual settings pattern type to ReactFlow BackgroundVariant
 */
function getBackgroundVariant(pattern?: CanvasVisualSettings['backgroundPattern']): BackgroundVariant {
  switch (pattern) {
    case 'lines':
      return BackgroundVariant.Lines;
    case 'cross':
      return BackgroundVariant.Cross;
    case 'dots':
    default:
      return BackgroundVariant.Dots;
  }
}

/**
 * Custom NetPad-branded background component for ReactFlow canvas
 * Enhances the default Background with NetPad-specific branding elements
 */
export function NetPadBrandedBackground({
  variant,
  gap,
  size,
  color,
  showWatermark = true,
  watermarkOpacity = 0.035,
  visualSettings,
}: NetPadBrandedBackgroundProps) {
  const theme = useTheme();
  const colorMode = theme.palette.mode;

  // Use visual settings if provided, otherwise fall back to props
  const effectiveVariant = visualSettings
    ? getBackgroundVariant(visualSettings.backgroundPattern)
    : (variant ?? BackgroundVariant.Dots);
  const effectiveGap = visualSettings?.backgroundGap ?? gap ?? 20;
  const effectiveSize = visualSettings?.backgroundSize ?? size ?? 1;
  const effectiveShowWatermark = visualSettings?.showWatermark ?? showWatermark;
  const effectiveWatermarkOpacity = visualSettings?.watermarkOpacity ?? watermarkOpacity;

  // Determine pattern color - use custom color if set, otherwise theme-aware defaults
  const patternColor = visualSettings?.backgroundPatternColor || color || (colorMode === 'dark'
    ? 'rgba(0, 237, 100, 0.15)' // More visible green dots in dark mode
    : 'rgba(0, 104, 74, 0.2)'   // More visible green dots in light mode
  );

  return (
    <>
      <Background
        variant={effectiveVariant}
        gap={effectiveGap}
        size={effectiveSize}
        color={patternColor}
      />

      {/* Large centered NetPad logo watermark */}
      {effectiveShowWatermark && (
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
              opacity: effectiveWatermarkOpacity,
              filter: colorMode === 'dark'
                ? 'brightness(0) invert(1)'
                : 'brightness(0)',
            }}
          />
        </Box>
      )}
    </>
  );
}
