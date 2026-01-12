'use client';

/**
 * NetPadLoader - Branded loading component
 *
 * A signature loading animation featuring the NetPad robot head logo with
 * animated elements and rotating friendly loading messages.
 * Theme-aware: adapts colors and effects for dark and light modes.
 */

import { useState, useEffect } from 'react';
import { Box, Typography, keyframes, useTheme } from '@mui/material';
import { netpadColors } from '@/theme/theme';

// Loading phrases - friendly, developer-focused messages
const LOADING_PHRASES = [
  'Building something great...',
  'Connecting the dots...',
  'Preparing your workspace...',
  'Gathering resources...',
  'Setting things up...',
  'Almost there...',
  'Loading the magic...',
  'Powering up...',
  'Assembling components...',
  'Fetching data...',
  'Spinning up workflows...',
  'Optimizing experience...',
  'Waking up the servers...',
  'Brewing fresh data...',
  'Warming up the engines...',
  'Initializing awesomeness...',
  'Polishing pixels...',
  'Untangling nodes...',
  'Aligning the stars...',
  'Orchestrating chaos...',
  'Summoning the bits...',
  'Herding electrons...',
  'Calibrating flux capacitors...',
  'Generating goodness...',
  'Crafting your view...',
  'Weaving the network...',
  'Syncing dimensions...',
  'Processing brilliance...',
  'Deploying happiness...',
  'Compiling dreams...',
];

// Theme-aware color helpers
const getLoaderColors = (isDark: boolean) => ({
  // Primary color for the robot
  primary: isDark ? netpadColors.primary : netpadColors.secondary,
  // Accent color for spinner gradient
  accent: isDark ? netpadColors.accent : netpadColors.secondaryLight,
  // Glow/shadow colors
  glowPrimary: isDark ? 'rgba(0, 237, 100, 0.4)' : 'rgba(0, 104, 74, 0.2)',
  glowSecondary: isDark ? 'rgba(0, 212, 170, 0.2)' : 'rgba(0, 150, 107, 0.15)',
  glowPrimaryStrong: isDark
    ? 'rgba(0, 237, 100, 0.6)'
    : 'rgba(0, 104, 74, 0.35)',
  glowSecondaryStrong: isDark
    ? 'rgba(0, 212, 170, 0.4)'
    : 'rgba(0, 150, 107, 0.25)',
});

// Fade in/out for text
const fadeInOut = keyframes`
  0% {
    opacity: 0;
    transform: translateY(4px);
  }
  15%, 85% {
    opacity: 1;
    transform: translateY(0);
  }
  100% {
    opacity: 0;
    transform: translateY(-4px);
  }
`;

// Antenna bob animation
const antennaBob = keyframes`
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-3px);
  }
`;

// Eye blink animation
const eyeBlink = keyframes`
  0%, 45%, 55%, 100% {
    transform: scaleY(1);
  }
  50% {
    transform: scaleY(0.1);
  }
`;

interface NetPadLoaderProps {
  /** Size of the loader: 'small' (40px), 'medium' (64px), 'large' (96px) */
  size?: 'small' | 'medium' | 'large';
  /** Optional loading message - if not provided, shows rotating random phrases */
  message?: string;
  /** Whether to show the full-page centered variant */
  fullPage?: boolean;
  /** Whether to show the rotating phrases (default: true when no message provided) */
  showPhrases?: boolean;
}

const sizeMap = {
  small: 40,
  medium: 64,
  large: 96,
};

function getRandomPhrase(exclude?: string): string {
  const available = exclude
    ? LOADING_PHRASES.filter((p) => p !== exclude)
    : LOADING_PHRASES;
  return available[Math.floor(Math.random() * available.length)];
}

/**
 * NetPad Logo - Animated SVG
 * Uses the netpad-logo.svg file with theme-aware effects
 */
function NetPadLogoIcon({
  size,
  animate = true,
  isDark,
}: {
  size: number;
  animate?: boolean;
  isDark: boolean;
}) {
  const colors = getLoaderColors(isDark);

  // Theme-aware pulse glow animation
  const pulseGlow = keyframes`
    0%, 100% {
      filter: drop-shadow(0 0 8px ${colors.glowPrimary}) drop-shadow(0 0 20px ${colors.glowSecondary});
    }
    50% {
      filter: drop-shadow(0 0 12px ${colors.glowPrimaryStrong}) drop-shadow(0 0 30px ${colors.glowSecondaryStrong});
    }
  `;

  return (
    <Box
      component="img"
      src="/netpad-logo.svg"
      alt="NetPad Logo"
      sx={{
        width: size,
        height: size,
        objectFit: 'contain',
        animation: animate ? `${pulseGlow} 2s ease-in-out infinite` : 'none',
      }}
    />
  );
}

export function NetPadLoader({
  size = 'medium',
  message,
  fullPage = false,
  showPhrases = true,
}: NetPadLoaderProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const dimension = sizeMap[size];
  // Use deterministic initial phrase to avoid hydration mismatch
  // Will switch to random phrases after mount (client-side only)
  const [currentPhrase, setCurrentPhrase] = useState(LOADING_PHRASES[0]);
  const [phraseKey, setPhraseKey] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  // Set mounted flag after hydration
  useEffect(() => {
    setIsMounted(true);
    // Set initial random phrase after mount to avoid hydration mismatch
    if (!message && showPhrases) {
      setCurrentPhrase(getRandomPhrase());
    }
  }, [message, showPhrases]);

  // Rotate phrases every 2.5 seconds if no custom message
  useEffect(() => {
    if (message || !showPhrases || !isMounted) return;

    const interval = setInterval(() => {
      setCurrentPhrase((prev) => getRandomPhrase(prev));
      setPhraseKey((k) => k + 1);
    }, 2500);

    return () => clearInterval(interval);
  }, [message, showPhrases, isMounted]);

  const displayMessage = message || (showPhrases ? currentPhrase : null);

  const loader = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: size === 'small' ? 1.5 : 2,
      }}
    >
      {/* Logo Icon */}
      <NetPadLogoIcon size={dimension} animate isDark={isDark} />

      {/* Loading message */}
      {displayMessage && (
        <Typography
          key={message ? 'static' : phraseKey}
          variant={size === 'small' ? 'caption' : 'body2'}
          color="text.secondary"
          sx={{
            fontWeight: 500,
            letterSpacing: '0.01em',
            textAlign: 'center',
            minHeight: size === 'small' ? 18 : 22,
            animation: message ? 'none' : `${fadeInOut} 2.5s ease-in-out`,
          }}
        >
          {displayMessage}
        </Typography>
      )}
    </Box>
  );

  if (fullPage) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          width: '100%',
          bgcolor: 'background.default',
          // Subtle grid background - more visible in light mode
          backgroundImage: isDark
            ? netpadColors.gridPatternDark
            : `radial-gradient(circle at 1px 1px, rgba(0, 104, 74, 0.06) 1px, transparent 0)`,
          backgroundSize: netpadColors.gridSize,
        }}
      >
        {loader}
      </Box>
    );
  }

  return loader;
}

/**
 * Simple inline loader for buttons and small spaces
 * Theme-aware gradient
 */
export function NetPadSpinner({ size = 16 }: { size?: number }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const colors = getLoaderColors(isDark);

  const spin = keyframes`
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  `;

  // Unique ID for gradient to avoid conflicts
  const gradientId = `spinner-gradient-${isDark ? 'dark' : 'light'}`;

  return (
    <Box
      component="svg"
      viewBox="0 0 100 100"
      sx={{
        width: size,
        height: size,
        animation: `${spin} 1s linear infinite`,
      }}
    >
      <circle
        cx="50"
        cy="50"
        r="40"
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray="180 70"
      />
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colors.primary} />
          <stop offset="100%" stopColor={colors.accent} />
        </linearGradient>
      </defs>
    </Box>
  );
}

export default NetPadLoader;
