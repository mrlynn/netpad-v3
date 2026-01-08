'use client';

import React, { useCallback, useRef, useState, ElementType } from 'react';
import { Box, BoxProps, alpha } from '@mui/material';

/**
 * Convert a hex color to RGB string format for spotlight gradient
 * @param hex - Hex color string (e.g., "#00ED64" or "00ED64")
 * @returns RGB string (e.g., "0, 237, 100")
 */
export function hexToRgb(hex: string): string {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

export interface SpotlightCardProps extends Omit<BoxProps, 'onMouseMove' | 'onMouseLeave'> {
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
   * Disable the spotlight effect (e.g., for reduced motion)
   * @default false
   */
  disabled?: boolean;
  /**
   * Border color on hover (pass a CSS color string)
   * If not provided, uses spotlight color with 0.15 alpha
   */
  hoverBorderColor?: string;
  /**
   * The component to render as (for polymorphic usage with Link, etc.)
   */
  component?: ElementType;
  /**
   * href for when component is Link
   */
  href?: string;
  // Allow any additional props for polymorphic components
  [key: string]: unknown;
}

/**
 * SpotlightCard - A card with a cursor-following spotlight effect
 *
 * Use this component on marketing pages to add subtle interactivity
 * to feature cards and differentiator sections.
 *
 * The spotlight effect:
 * - Follows the cursor with a radial gradient
 * - Fades in smoothly on hover
 * - Disabled on touch devices and when prefers-reduced-motion
 * - Does not shift layout
 */
export function SpotlightCard({
  children,
  radius = 600,
  spotlightColor = '0, 237, 100', // NetPad primary green RGB
  spotlightOpacity = 0.12,
  disabled = false,
  hoverBorderColor,
  component,
  href,
  sx,
  ...props
}: SpotlightCardProps) {
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

    // Use requestAnimationFrame for smooth updates
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
    // Reset position to center when leaving
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

  const computedHoverBorderColor = hoverBorderColor || `rgba(${spotlightColor}, 0.25)`;

  // Build additional props for polymorphic component usage
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
        borderRadius: 2,
        bgcolor: alpha('#fff', 0.03),
        border: '1px solid',
        borderColor: alpha('#fff', 0.1),
        transition: 'border-color 0.2s ease',
        // Hover border effect
        '&:hover': {
          borderColor: computedHoverBorderColor,
        },
        // The spotlight overlay (::before pseudo-element via sx)
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
          transition: 'opacity 180ms ease',
          pointerEvents: 'none',
          zIndex: 0,
        },
        // Respect reduced motion
        '@media (prefers-reduced-motion: reduce)': {
          '&::before': {
            transition: 'none',
          },
        },
        // Disable on touch devices
        '@media (hover: none)': {
          '&::before': {
            display: 'none',
          },
        },
        // Spread user's sx prop (overrides our defaults if needed)
        ...sx,
      }}
    >
      {/* Content wrapper to ensure it's above the spotlight */}
      <Box sx={{ position: 'relative', zIndex: 1 }}>
        {children}
      </Box>
    </Box>
  );
}

export default SpotlightCard;
