'use client';

/**
 * FormBuilderView
 *
 * Wrapper component for the FormBuilder.
 * Onboarding is now handled globally by OnboardingGate in the project layout.
 */

import { useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { FormBuilder } from '@/components/FormBuilder/FormBuilder';
import { useAuth } from '@/contexts/AuthContext';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import { useTour } from '@/contexts/TourContext';

interface FormBuilderViewProps {
  initialFormId?: string;
}

export function FormBuilderView({ initialFormId }: FormBuilderViewProps) {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { startTour, hasCompletedTour, isTourActive } = useTour();

  // Auto-start form builder tour on first visit
  useEffect(() => {
    // Only trigger if:
    // 1. User is authenticated
    // 2. Tour is not already active
    // 3. User hasn't completed the form-builder tour
    if (isAuthenticated && !isTourActive && !hasCompletedTour('form-builder')) {
      // Small delay to ensure UI is fully rendered
      const timer = setTimeout(() => {
        startTour('form-builder');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, isTourActive, hasCompletedTour, startTour]);

  // Show loading state while checking auth
  if (isAuthLoading) {
    return (
      <Box
        sx={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
        }}
      >
        <NetPadLoader size="small" message="Loading..." />
      </Box>
    );
  }

  // Render FormBuilder - onboarding is handled by global OnboardingGate
  return (
    <Box sx={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      <FormBuilder initialFormId={initialFormId} />
    </Box>
  );
}
