'use client';

/**
 * Intent Onboarding Gate Component
 *
 * Wrapper component that shows the intent onboarding experience for new users.
 * For users who have already completed onboarding, it renders children directly.
 */

import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useIntentOnboarding } from '@/contexts/IntentOnboardingContext';
import { IntentOnboarding } from './IntentOnboarding';

interface IntentOnboardingGateProps {
  children: React.ReactNode;
}

export function IntentOnboardingGate({ children }: IntentOnboardingGateProps) {
  const { isLoading, isActive } = useIntentOnboarding();

  // Loading state - show a simple loader
  if (isLoading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
          gap: 2,
        }}
      >
        <CircularProgress size={32} />
        <Typography variant="body2" color="text.secondary">
          Loading...
        </Typography>
      </Box>
    );
  }

  // Onboarding active - show intent onboarding experience
  if (isActive) {
    return <IntentOnboarding />;
  }

  // Onboarding complete - render children
  return <>{children}</>;
}
