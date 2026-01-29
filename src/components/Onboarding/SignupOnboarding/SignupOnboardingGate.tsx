'use client';

/**
 * SignupOnboardingGate Component
 *
 * For solo users, auto-completes signup onboarding silently and passes through
 * to IntentOnboarding. Users can customize their workspace later in settings.
 *
 * This creates a default workspace in the background, allowing users to
 * get to the "What do you want to build?" experience immediately.
 */

import React, { ReactNode, useEffect, useState } from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import { useSignupOnboarding } from '@/contexts/SignupOnboardingContext';
import { NetPadLoader } from '@/components/common/NetPadLoader';

interface SignupOnboardingGateProps {
  children: ReactNode;
  /**
   * If true, shows the full onboarding flow instead of auto-completing.
   * Useful for team/enterprise onboarding or explicit workspace setup.
   */
  forceFullOnboarding?: boolean;
}

function FullScreenLoader({ message = 'Loading...' }: { message?: string }) {
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
        <NetPadLoader size="large" variant="ascii" message={message} />
      </Box>
    </Box>
  );
}

export function SignupOnboardingGate({
  children,
  forceFullOnboarding = false,
}: SignupOnboardingGateProps) {
  const { isLoading, isActive, isProcessing, autoCompleteForSolo, error } = useSignupOnboarding();
  const [isAutoCompleting, setIsAutoCompleting] = useState(false);
  const [autoCompleteAttempted, setAutoCompleteAttempted] = useState(false);

  // Auto-complete signup onboarding for solo users
  useEffect(() => {
    // Only run if:
    // 1. Not forcing full onboarding
    // 2. Onboarding is active (needs to be done)
    // 3. Not currently loading or processing
    // 4. Haven't already attempted auto-complete
    if (
      !forceFullOnboarding &&
      isActive &&
      !isLoading &&
      !isProcessing &&
      !isAutoCompleting &&
      !autoCompleteAttempted
    ) {
      setIsAutoCompleting(true);
      setAutoCompleteAttempted(true);

      autoCompleteForSolo().then((success) => {
        setIsAutoCompleting(false);
        if (!success) {
          console.warn('[SignupOnboardingGate] Auto-complete failed, user will see IntentOnboarding anyway');
        }
      });
    }
  }, [
    forceFullOnboarding,
    isActive,
    isLoading,
    isProcessing,
    isAutoCompleting,
    autoCompleteAttempted,
    autoCompleteForSolo,
  ]);

  // Show loader while checking status or auto-completing
  if (isLoading || isAutoCompleting || isProcessing) {
    return <FullScreenLoader message="Setting up your workspace..." />;
  }

  // If auto-complete was attempted and there's an error, log it but continue
  // The user will still be able to use the app, they just might need to set up workspace manually later
  if (error && autoCompleteAttempted) {
    console.warn('[SignupOnboardingGate] Workspace setup had an issue:', error);
    // Continue to children anyway - don't block the user
  }

  // Render children (which will be IntentOnboarding if that gate is active)
  return <>{children}</>;
}
