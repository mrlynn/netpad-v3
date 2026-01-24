'use client';

import React, { useCallback, useRef, useState, ElementType } from 'react';
import { Box, BoxProps, alpha, useTheme } from '@mui/material';
import { hexToRgb } from './SpotlightCard';

export type WatermarkPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';

export interface GlassSpotlightCardProps extends Omit<BoxProps, 'onMouseMove' | 'onMouseLeave'> {
  /**
   * The radius of the spotlight gradient in pixels
   * @default 600
   */
  radius?: number;
  /**
   * The color of the spotlight as RGB string (e.g., "0, 237, 100")
   * @default "0, 237, 100" (NetPad primary green)
   */
  spotlightColor?: string;
  /**
   * Opacity at the center of the spotlight
   * @default 0.12
   */
  spotlightOpacity?: number;
  /**
   * Disable the spotlight effect
   * @default false
   */
  disabled?: boolean;
  /**
   * Border color on hover
   */
  hoverBorderColor?: string;
  /**
   * The intensity of the glass blur effect in pixels
   * @default 12
   */
  glassBlur?: number;
  /**
   * Position of the NetPad watermark
   * @default 'bottom-right'
   */
  watermarkPosition?: WatermarkPosition;
  /**
   * Opacity of the watermark (0 to 1)
   * @default 0.1
   */
  watermarkOpacity?: number;
  /**
   * The component to render as
   */
  component?: ElementType;
  /**
   * href for when component is Link
   */
  href?: string;
  [key: string]: unknown;
}

/**
 * GlassSpotlightCard - A premium card with glass effect, spotlight, and watermark
 * 
 * Extends the SpotlightCard with:
 * - Backdrop blur (glass effect)
 * - NetPad micro-mark watermark
 * - Enhanced border and depth
 */
export function GlassSpotlightCard({
  children,
  radius = 600,
  spotlightColor = '0, 237, 100',
  spotlightOpacity = 0.15, // Slightly higher for glass to stand out
  disabled = false,
  hoverBorderColor,
  glassBlur = 12,
  watermarkPosition = 'bottom-right',
  watermarkOpacity = 0.1,
  component,
  href,
  sx,
  ...props
}: GlassSpotlightCardProps) {
  const theme = useTheme();
  const cardRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: '50%', y: '50%' });
  const [isHovered, setIsHovered] = useState(false);
  const rafRef = useRef<number | null>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return;

    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(() => {
      setPosition({ x: `${x}px`, y: `${y}px` });
    });
  }, [disabled]);

  const handleMouseEnter = useCallback(() => {
    if (!disabled) {
      setIsHovered(true);
    }
  }, [disabled]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setPosition({ x: '50%', y: '50%' });
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const computedHoverBorderColor = hoverBorderColor || `rgba(${spotlightColor}, 0.35)`;

  const getWatermarkStyles = () => {
    const base = {
      position: 'absolute',
      width: '80px',
      height: '80px',
      backgroundImage: 'url(/micro-mark-black-trans.png)',
      backgroundSize: 'contain',
      backgroundRepeat: 'no-repeat',
      opacity: watermarkOpacity,
      pointerEvents: 'none',
      zIndex: 0,
      filter: theme.palette.mode === 'dark' ? 'invert(1) brightness(2)' : 'none',
    };

    switch (watermarkPosition) {
      case 'top-left':
        return { ...base, top: 16, left: 16 };
      case 'top-right':
        return { ...base, top: 16, right: 16 };
      case 'bottom-left':
        return { ...base, bottom: 16, left: 16 };
      case 'bottom-right':
        return { ...base, bottom: 16, right: 16 };
      case 'center':
        return { ...base, top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '120px', height: '120px' };
      default:
        return { ...base, bottom: 16, right: 16 };
    }
  };

  const componentProps: Record<string, unknown> = {};
  if (component) componentProps.component = component;
  if (href) componentProps.href = href;

  return (
    <Box
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...componentProps}
      {...props}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 3, // Slightly rounder for glass
        bgcolor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.3 : 0.6),
        backdropFilter: `blur(${glassBlur}px) saturate(160%)`,
        border: '1px solid',
        borderColor: alpha(theme.palette.mode === 'dark' ? '#fff' : '#000', 0.1),
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: isHovered 
          ? `0 8px 32px 0 ${alpha(theme.palette.common.black, 0.2)}`
          : 'none',
        
        '&:hover': {
          borderColor: computedHoverBorderColor,
          transform: 'translateY(-2px)',
        },

        // Spotlight effect
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(
            ${radius}px circle at ${position.x} ${position.y},
            rgba(${spotlightColor}, ${spotlightOpacity}),
            rgba(${spotlightColor}, ${spotlightOpacity * 0.4}) 40%,
            transparent 70%
          )`,
          opacity: isHovered && !disabled ? 1 : 0,
          transition: 'opacity 300ms ease',
          pointerEvents: 'none',
          zIndex: 1,
        },

        // Glass reflection highlight
        '&::after': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: `linear-gradient(90deg, transparent, ${alpha('#fff', 0.2)}, transparent)`,
          zIndex: 2,
          opacity: isHovered ? 1 : 0.5,
          transition: 'opacity 0.3s ease',
        },

        '@media (prefers-reduced-motion: reduce)': {
          transition: 'none',
          '&:hover': { transform: 'none' },
        },
        
        ...sx,
      }}
    >
      {/* Watermark */}
      <Box sx={getWatermarkStyles()} />

      {/* Content wrapper */}
      <Box sx={{ position: 'relative', zIndex: 3, p: 3 }}>
        {children}
      </Box>
    </Box>
  );
}

export default GlassSpotlightCard;
