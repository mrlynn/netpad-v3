'use client';

/**
 * SignupOnboardingGate Component
 *
 * Wrapper component that conditionally shows the signup onboarding flow
 * or renders children based on onboarding status.
 */

import React, { ReactNode } from 'react';
import { Box, alpha, useTheme } from '@mui/material';
import { useSignupOnboarding } from '@/contexts/SignupOnboardingContext';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import { SignupOnboardingFlow } from './SignupOnboardingFlow';

interface SignupOnboardingGateProps {
  children: ReactNode;
}

function FullScreenLoader() {
  const theme = useTheme();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <NetPadLoader size="large" variant="ascii" message="Loading..." />
      </Box>
    </Box>
  );
}

export function SignupOnboardingGate({ children }: SignupOnboardingGateProps) {
  const { isLoading, isActive } = useSignupOnboarding();

  // Show loader while checking status
  if (isLoading) {
    return <FullScreenLoader />;
  }

  // Show onboarding flow if active
  if (isActive) {
    return <SignupOnboardingFlow />;
  }

  // Otherwise render children
  return <>{children}</>;
}
