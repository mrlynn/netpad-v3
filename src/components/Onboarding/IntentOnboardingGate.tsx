'use client';

/**
 * Intent Onboarding Gate Component
 *
 * Wrapper component that shows the intent onboarding experience for new users.
 * For users who have already completed onboarding, it renders children directly.
 *
 * IMPORTANT: This gate should NEVER show onboarding when the user is already
 * in a project or application context (i.e., working inside an app).
 */

import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { usePathname } from 'next/navigation';
import { useIntentOnboarding } from '@/contexts/IntentOnboardingContext';
import { IntentOnboarding } from './IntentOnboarding';

interface IntentOnboardingGateProps {
  children: React.ReactNode;
}

/**
 * Check if user is already in an app/project context via URL
 */
function isInAppContext(pathname: string | null): boolean {
  if (!pathname) return false;
  // If URL contains /orgs/[orgId]/projects/[projectId] or /apps/, user is already working
  const isInProjectContext = /\/orgs\/[^/]+\/projects\/[^/]+/.test(pathname);
  const isInAppSlugContext = /\/apps\//.test(pathname);
  return isInProjectContext || isInAppSlugContext;
}

export function IntentOnboardingGate({ children }: IntentOnboardingGateProps) {
  const pathname = usePathname();
  const { isLoading, isActive } = useIntentOnboarding();

  // CRITICAL: If user is already in app context (via URL), bypass onboarding entirely
  // This prevents the onboarding from showing when navigating within an existing app
  if (isInAppContext(pathname)) {
    return <>{children}</>;
  }

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
