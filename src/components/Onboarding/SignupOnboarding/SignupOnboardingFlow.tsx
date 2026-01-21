'use client';

/**
 * SignupOnboardingFlow Component
 *
 * Main container for the Linear-inspired signup onboarding experience.
 * Full-screen flow with step navigation and progress indicator.
 */

import React from 'react';
import { Box, Container } from '@mui/material';
import { useSignupOnboarding } from '@/contexts/SignupOnboardingContext';
import { StepIndicator } from './components/StepIndicator';
import { WelcomeStep } from './steps/WelcomeStep';
import { WorkspaceStep } from './steps/WorkspaceStep';
import { DatabaseStep } from './steps/DatabaseStep';
import { TeamInvitesStep } from './steps/TeamInvitesStep';
import { CompletionStep } from './steps/CompletionStep';

export function SignupOnboardingFlow() {
  const { currentStep, nextStep, prevStep, complete } = useSignupOnboarding();

  const renderStep = () => {
    switch (currentStep) {
      case 'welcome':
        return <WelcomeStep onContinue={nextStep} />;

      case 'workspace':
        return <WorkspaceStep onContinue={nextStep} onBack={prevStep} />;

      case 'database':
        return <DatabaseStep onContinue={nextStep} onBack={prevStep} />;

      case 'team-invites':
        return <TeamInvitesStep onContinue={nextStep} onBack={prevStep} />;

      case 'completion':
        return <CompletionStep onComplete={complete} />;

      default:
        return <WelcomeStep onContinue={nextStep} />;
    }
  };

  // Don't show step indicator on welcome or completion screens
  const showStepIndicator = currentStep !== 'welcome' && currentStep !== 'completion';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Container
        maxWidth="md"
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          py: 6,
        }}
      >
        {showStepIndicator && <StepIndicator currentStep={currentStep} />}
        {renderStep()}
      </Container>
    </Box>
  );
}
