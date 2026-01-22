'use client';

/**
 * NetPadAnnotation - A hovering, bouncing annotation mark
 * 
 * Used to highlight that a form or feature is built with NetPad.
 * Features a subtle bounce animation and pointer arrow.
 */

import { Box, Typography, alpha } from '@mui/material';
import { AutoAwesome } from '@mui/icons-material';

interface NetPadAnnotationProps {
  /** Text to display in the annotation */
  text?: string;
  /** Position relative to target element */
  position?: 'right' | 'left' | 'top' | 'bottom';
  /** Custom offset from target */
  offset?: { x?: number; y?: number };
  /** Color theme */
  color?: string;
}

export function NetPadAnnotation({
  text = 'Built with NetPad',
  position = 'right',
  offset = { x: 0, y: 0 },
  color = '#00ED64',
}: NetPadAnnotationProps) {
  // Calculate position styles based on position prop
  const positionStyles = {
    right: {
      right: -140 + (offset.x || 0),
      top: '50%',
      transform: 'translateY(-50%)',
      flexDirection: 'row' as const,
    },
    left: {
      left: -140 + (offset.x || 0),
      top: '50%',
      transform: 'translateY(-50%)',
      flexDirection: 'row-reverse' as const,
    },
    top: {
      top: -70 + (offset.y || 0),
      left: '50%',
      transform: 'translateX(-50%)',
      flexDirection: 'column-reverse' as const,
    },
    bottom: {
      bottom: -70 + (offset.y || 0),
      left: '50%',
      transform: 'translateX(-50%)',
      flexDirection: 'column' as const,
    },
  };

  const styles = positionStyles[position];

  return (
    <Box
      sx={{
        position: 'absolute',
        ...styles,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        zIndex: 10,
        pointerEvents: 'none',
        animation: 'bounce-subtle 2s ease-in-out infinite',
        '@keyframes bounce-subtle': {
          '0%, 100%': {
            transform: `${styles.transform} translateY(0)`,
          },
          '50%': {
            transform: `${styles.transform} translateY(-8px)`,
          },
        },
      }}
    >
      {/* Arrow/pointer */}
      <Box
        sx={{
          width: 0,
          height: 0,
          ...(position === 'right' && {
            borderTop: '8px solid transparent',
            borderBottom: '8px solid transparent',
            borderRight: `12px solid ${color}`,
          }),
          ...(position === 'left' && {
            borderTop: '8px solid transparent',
            borderBottom: '8px solid transparent',
            borderLeft: `12px solid ${color}`,
          }),
          ...(position === 'top' && {
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderBottom: `12px solid ${color}`,
          }),
          ...(position === 'bottom' && {
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderTop: `12px solid ${color}`,
          }),
        }}
      />

      {/* Annotation box */}
      <Box
        sx={{
          bgcolor: color,
          color: '#001E2B',
          px: 2,
          py: 1,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          boxShadow: `0 4px 12px ${alpha(color, 0.3)}`,
          border: `2px solid ${alpha('#001E2B', 0.1)}`,
        }}
      >
        <AutoAwesome sx={{ fontSize: 16 }} />
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: '0.875rem',
            letterSpacing: 0.5,
            textTransform: 'uppercase',
          }}
        >
          {text}
        </Typography>
      </Box>
    </Box>
  );
}
