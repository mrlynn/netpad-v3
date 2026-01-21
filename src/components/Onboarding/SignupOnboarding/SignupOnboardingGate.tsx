'use client';

/**
 * SignupOnboardingGate Component
 *
 * Wrapper component that conditionally shows the signup onboarding flow
 * or renders children based on onboarding status.
 */

import React, { ReactNode } from 'react';
import { Box, CircularProgress, alpha, useTheme } from '@mui/material';
import { useSignupOnboarding } from '@/contexts/SignupOnboardingContext';
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
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: '16px',
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CircularProgress
            size={32}
            thickness={4}
            sx={{ color: theme.palette.primary.main }}
          />
        </Box>
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
