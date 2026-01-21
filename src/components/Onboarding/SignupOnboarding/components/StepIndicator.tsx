'use client';

/**
 * StepIndicator Component
 *
 * Linear-style horizontal dots showing onboarding progress.
 * Current step is highlighted, completed steps are filled.
 */

import React from 'react';
import { Box, alpha, useTheme } from '@mui/material';
import { SignupOnboardingStep } from '@/contexts/SignupOnboardingContext';

const STEPS: SignupOnboardingStep[] = [
  'welcome',
  'workspace',
  'database',
  'team-invites',
  'completion',
];

interface StepIndicatorProps {
  currentStep: SignupOnboardingStep;
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  const theme = useTheme();
  const currentIndex = STEPS.indexOf(currentStep);

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1,
        justifyContent: 'center',
        mb: 4,
      }}
    >
      {STEPS.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <Box
            key={step}
            sx={{
              width: isCurrent ? 24 : 8,
              height: 8,
              borderRadius: 4,
              bgcolor: isCompleted || isCurrent
                ? theme.palette.primary.main
                : alpha(theme.palette.text.primary, 0.2),
              transition: 'all 0.3s ease',
            }}
          />
        );
      })}
    </Box>
  );
}
