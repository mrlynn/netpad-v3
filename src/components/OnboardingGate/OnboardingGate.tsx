'use client';

/**
 * Onboarding Gate
 *
 * Wrapper component that blocks access to children until onboarding is complete.
 * Shows a full-page overlay with the onboarding wizard when active.
 */

import { ReactNode } from 'react';
import { Box, Typography, alpha } from '@mui/material';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import { useOnboardingGate } from '@/contexts/OnboardingGateContext';
import { OnboardingGateOverlay } from './OnboardingGateOverlay';

interface OnboardingGateProps {
  children: ReactNode;
}

/**
 * Loading state shown while checking onboarding status
 */
function OnboardingLoadingState() {
  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        bgcolor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
      }}
    >
      <NetPadLoader size="large" variant="ascii" message="Loading..." />
    </Box>
  );
}

export function OnboardingGate({ children }: OnboardingGateProps) {
  const { isLoading, isGateActive } = useOnboardingGate();

  // Show loading state while checking
  if (isLoading) {
    return <OnboardingLoadingState />;
  }

  // If gate is not active, just render children
  if (!isGateActive) {
    return <>{children}</>;
  }

  // Gate is active - show overlay on top of children
  // Children are rendered underneath for smooth transition when complete
  return (
    <>
      <Box
        sx={{
          opacity: 0.3,
          pointerEvents: 'none',
          filter: 'blur(4px)',
        }}
      >
        {children}
      </Box>
      <OnboardingGateOverlay />
    </>
  );
}

export default OnboardingGate;
