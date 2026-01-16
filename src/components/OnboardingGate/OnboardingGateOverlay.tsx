'use client';

/**
 * Onboarding Gate Overlay
 *
 * Full-page modal overlay that displays the onboarding wizard.
 * Cannot be dismissed - user must complete onboarding to continue.
 */

import { useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Stepper,
  Step,
  StepLabel,
  alpha,
} from '@mui/material';
import { Rocket } from '@mui/icons-material';
import { useOnboardingGate } from '@/contexts/OnboardingGateContext';
import { OrgStep } from './steps/OrgStep';
import { DatabaseStep } from './steps/DatabaseStep';
import { ProvisioningStep } from './steps/ProvisioningStep';
import { CompleteStep } from './steps/CompleteStep';

const STEPS = ['Create Workspace', 'Set Up Database', 'Ready'];

function getStepIndex(step: string): number {
  switch (step) {
    case 'org':
      return 0;
    case 'database':
      return 1;
    case 'provisioning':
      return 1; // Still on database step visually
    case 'complete':
      return 2;
    default:
      return 0;
  }
}

export function OnboardingGateOverlay() {
  const { currentStep, status } = useOnboardingGate();

  // Prevent body scroll when overlay is active
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const activeStepIndex = getStepIndex(currentStep);

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
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 520,
          borderRadius: 3,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: 3,
            textAlign: 'center',
            background: `linear-gradient(135deg, ${alpha('#00ED64', 0.15)} 0%, ${alpha('#00ED64', 0.02)} 100%)`,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Rocket sx={{ fontSize: 48, color: '#00ED64', mb: 1 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
            Welcome to NetPad
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Let's set up your workspace in under a minute
          </Typography>
        </Box>

        {/* Stepper */}
        <Box sx={{ px: 3, pt: 3 }}>
          <Stepper activeStep={activeStepIndex} alternativeLabel>
            {STEPS.map((label, index) => (
              <Step key={label} completed={activeStepIndex > index}>
                <StepLabel
                  sx={{
                    '& .MuiStepLabel-label': {
                      fontSize: 12,
                    },
                    '& .Mui-active': {
                      color: '#00ED64 !important',
                    },
                    '& .Mui-completed': {
                      color: '#00ED64 !important',
                    },
                  }}
                >
                  {label}
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        {/* Step Content */}
        <Box
          sx={{
            p: 3,
            minHeight: 280,
            overflow: 'auto',
            flex: 1,
          }}
        >
          {currentStep === 'org' && <OrgStep />}
          {currentStep === 'database' && <DatabaseStep />}
          {currentStep === 'provisioning' && <ProvisioningStep />}
          {currentStep === 'complete' && <CompleteStep />}
        </Box>

        {/* Footer - workspace info if available */}
        {status?.organization && (
          <Box
            sx={{
              px: 3,
              py: 1.5,
              borderTop: '1px solid',
              borderColor: 'divider',
              bgcolor: alpha('#000', 0.02),
            }}
          >
            <Typography variant="caption" color="text.secondary">
              Workspace: <strong>{status.organization.name}</strong>
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
