'use client';

import { useEffect, useState } from 'react';
import Lottie from 'lottie-react';
import { Box } from '@mui/material';

interface AnimatedLogoProps {
  width?: number;
  height?: number;
  showEntrance?: boolean;
}

export function AnimatedLogo({ width = 100, height = 100, showEntrance = true }: AnimatedLogoProps) {
  const [pulseAnimation, setPulseAnimation] = useState<any>(null);
  const [entranceAnimation, setEntranceAnimation] = useState<any>(null);
  const [showPulse, setShowPulse] = useState(!showEntrance);
  const [isLoading, setIsLoading] = useState(true);

  // Load animation data
  useEffect(() => {
    const loadAnimations = async () => {
      try {
        const [pulseRes, entranceRes] = await Promise.all([
          fetch('/lottie/netpad-v2-pulse.json'),
          fetch('/lottie/netpad-v2-entrance.json'),
        ]);

        const [pulseData, entranceData] = await Promise.all([
          pulseRes.json(),
          entranceRes.json(),
        ]);

        setPulseAnimation(pulseData);
        setEntranceAnimation(entranceData);
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to load Lottie animations:', error);
        setIsLoading(false);
      }
    };

    loadAnimations();
  }, []);

  useEffect(() => {
    if (showEntrance && entranceAnimation) {
      // After entrance animation completes (2s), switch to pulse
      const timer = setTimeout(() => {
        setShowPulse(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showEntrance, entranceAnimation]);

  if (isLoading || (!pulseAnimation && !entranceAnimation)) {
    // Fallback to a simple placeholder while loading
    return (
      <Box
        sx={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      />
    );
  }

  return (
    <Box
      sx={{
        width,
        height,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        filter: 'drop-shadow(0 8px 24px rgba(0, 237, 100, 0.2))',
      }}
    >
      {showEntrance && !showPulse && entranceAnimation ? (
        <Lottie
          animationData={entranceAnimation}
          loop={false}
          autoplay={true}
          style={{ width: '100%', height: '100%' }}
        />
      ) : pulseAnimation ? (
        <Lottie
          animationData={pulseAnimation}
          loop={true}
          autoplay={true}
          style={{ width: '100%', height: '100%' }}
        />
      ) : null}
    </Box>
  );
}
