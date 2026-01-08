'use client';

import React from 'react';
import { Background, BackgroundVariant } from 'reactflow';
import { Box, useTheme } from '@mui/material';
import { netpadColors } from '@/theme/theme';

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
  isEmbedded = false,
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
      {/* Base ReactFlow Background with NetPad colors */}
      <Background
        variant={variant}
        gap={gap}
        size={size}
        color={dotColor}
      />
      
      {/* Prominent diagonal gradient overlay with NetPad green */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          userSelect: 'none',
          opacity: isEmbedded ? 0.25 : 0.15, // More visible
          background: colorMode === 'dark'
            ? `linear-gradient(135deg, 
                rgba(0, 237, 100, 0.08) 0%, 
                transparent 30%,
                transparent 70%,
                rgba(0, 212, 170, 0.08) 100%)`
            : `linear-gradient(135deg, 
                rgba(0, 104, 74, 0.12) 0%, 
                transparent 30%,
                transparent 70%,
                rgba(0, 150, 107, 0.12) 100%)`,
        }}
      />

      {/* Repeating "NetPad" text watermark pattern */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          userSelect: 'none',
          opacity: isEmbedded ? 0.06 : 0.03,
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 200px,
            ${colorMode === 'dark' ? 'rgba(0, 237, 100, 0.03)' : 'rgba(0, 104, 74, 0.05)'} 200px,
            ${colorMode === 'dark' ? 'rgba(0, 237, 100, 0.03)' : 'rgba(0, 104, 74, 0.05)'} 201px
          )`,
        }}
      />

      {/* Additional grid overlay with NetPad green for depth */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          userSelect: 'none',
          opacity: isEmbedded ? 0.12 : 0.06,
          backgroundImage: colorMode === 'dark'
            ? `radial-gradient(circle at 2px 2px, rgba(0, 237, 100, 0.08) 1px, transparent 0)`
            : `radial-gradient(circle at 2px 2px, rgba(0, 104, 74, 0.12) 1px, transparent 0)`,
          backgroundSize: '48px 48px',
          backgroundPosition: '0 0',
        }}
      />

      {/* Corner accent - NetPad signature (more visible) */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: isEmbedded ? '300px' : '200px',
          height: isEmbedded ? '300px' : '200px',
          pointerEvents: 'none',
          userSelect: 'none',
          opacity: isEmbedded ? 0.08 : 0.04,
          background: `radial-gradient(circle at bottom right, 
            ${colorMode === 'dark' ? 'rgba(0, 237, 100, 0.2)' : 'rgba(0, 104, 74, 0.25)'} 0%, 
            transparent 60%)`,
        }}
      />

      {/* Top-left corner accent for balance */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: isEmbedded ? '250px' : '150px',
          height: isEmbedded ? '250px' : '150px',
          pointerEvents: 'none',
          userSelect: 'none',
          opacity: isEmbedded ? 0.06 : 0.03,
          background: `radial-gradient(circle at top left, 
            ${colorMode === 'dark' ? 'rgba(0, 212, 170, 0.15)' : 'rgba(0, 150, 107, 0.2)'} 0%, 
            transparent 60%)`,
        }}
      />
    </>
  );
}
