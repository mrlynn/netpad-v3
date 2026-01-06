'use client';

/**
 * NetPadLoader - Branded loading component
 *
 * A signature loading animation featuring the NetPad logo icon with
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
  // Primary stroke color - darker green for light mode
  primary: isDark ? netpadColors.primary : netpadColors.secondary,
  // Accent color - cyan-green works in both
  accent: isDark ? netpadColors.accent : netpadColors.secondaryLight,
  // Node fill colors
  nodePrimary: isDark ? netpadColors.primary : netpadColors.secondary,
  nodeAccent: isDark ? netpadColors.accent : netpadColors.accent,
  // Glow/shadow colors
  glowPrimary: isDark
    ? 'rgba(0, 237, 100, 0.4)'
    : 'rgba(0, 104, 74, 0.2)',
  glowSecondary: isDark
    ? 'rgba(0, 212, 170, 0.2)'
    : 'rgba(0, 150, 107, 0.15)',
  glowPrimaryStrong: isDark
    ? 'rgba(0, 237, 100, 0.6)'
    : 'rgba(0, 104, 74, 0.35)',
  glowSecondaryStrong: isDark
    ? 'rgba(0, 212, 170, 0.4)'
    : 'rgba(0, 150, 107, 0.25)',
});

// Stacked rectangles animation - slight shift
const stackShift = keyframes`
  0%, 100% {
    transform: translate(0, 0);
  }
  50% {
    transform: translate(-2px, 2px);
  }
`;

// Network path pulse animation
const pathPulse = keyframes`
  0%, 100% {
    stroke-dashoffset: 0;
    opacity: 0.8;
  }
  50% {
    stroke-dashoffset: 20;
    opacity: 1;
  }
`;

// Node pulse animation
const nodePulse = keyframes`
  0%, 100% {
    transform: scale(1);
    opacity: 0.7;
  }
  50% {
    transform: scale(1.3);
    opacity: 1;
  }
`;

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
 * NetPad Logo Icon - Animated SVG
 * Based on the stacked rounded rectangles with network path design
 * Theme-aware colors and effects
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
  const strokeWidth = size < 50 ? 2 : size < 80 ? 2.5 : 3;
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
      component="svg"
      viewBox="0 0 100 100"
      sx={{
        width: size,
        height: size,
        animation: animate ? `${pulseGlow} 2s ease-in-out infinite` : 'none',
      }}
    >
      {/* Stacked rounded rectangles (representing "pad") */}
      <rect
        x="32"
        y="18"
        width="50"
        height="50"
        rx="10"
        fill="none"
        stroke={colors.primary}
        strokeWidth={strokeWidth}
        opacity={0.4}
        style={{
          animation: animate ? `${stackShift} 1.5s ease-in-out infinite` : 'none',
          animationDelay: '0s',
        }}
      />
      <rect
        x="26"
        y="24"
        width="50"
        height="50"
        rx="10"
        fill="none"
        stroke={colors.primary}
        strokeWidth={strokeWidth}
        opacity={0.6}
        style={{
          animation: animate ? `${stackShift} 1.5s ease-in-out infinite` : 'none',
          animationDelay: '0.1s',
        }}
      />
      <rect
        x="20"
        y="30"
        width="50"
        height="50"
        rx="10"
        fill="none"
        stroke={colors.primary}
        strokeWidth={strokeWidth}
        opacity={0.9}
        style={{
          animation: animate ? `${stackShift} 1.5s ease-in-out infinite` : 'none',
          animationDelay: '0.2s',
        }}
      />

      {/* Network path (representing "net") */}
      <path
        d="M35 62 C35 50 45 42 55 42 L65 42 C72 42 78 36 78 28"
        fill="none"
        stroke={colors.accent}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="80"
        style={{
          animation: animate ? `${pathPulse} 2s ease-in-out infinite` : 'none',
        }}
      />

      {/* Network nodes */}
      <circle
        cx="35"
        cy="62"
        r={size < 50 ? 3 : 4}
        fill={colors.nodePrimary}
        style={{
          animation: animate ? `${nodePulse} 1.5s ease-in-out infinite` : 'none',
          animationDelay: '0s',
          transformOrigin: '35px 62px',
        }}
      />
      <circle
        cx="55"
        cy="42"
        r={size < 50 ? 3 : 4}
        fill={colors.nodeAccent}
        style={{
          animation: animate ? `${nodePulse} 1.5s ease-in-out infinite` : 'none',
          animationDelay: '0.3s',
          transformOrigin: '55px 42px',
        }}
      />
      <circle
        cx="78"
        cy="28"
        r={size < 50 ? 3 : 4}
        fill={colors.nodePrimary}
        style={{
          animation: animate ? `${nodePulse} 1.5s ease-in-out infinite` : 'none',
          animationDelay: '0.6s',
          transformOrigin: '78px 28px',
        }}
      />
    </Box>
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
  const [currentPhrase, setCurrentPhrase] = useState(() => getRandomPhrase());
  const [phraseKey, setPhraseKey] = useState(0);

  // Rotate phrases every 2.5 seconds if no custom message
  useEffect(() => {
    if (message || !showPhrases) return;

    const interval = setInterval(() => {
      setCurrentPhrase((prev) => getRandomPhrase(prev));
      setPhraseKey((k) => k + 1);
    }, 2500);

    return () => clearInterval(interval);
  }, [message, showPhrases]);

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
