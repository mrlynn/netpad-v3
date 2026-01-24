'use client';

/**
 * Intent Onboarding Component
 *
 * Full-screen component for the intent-first onboarding experience.
 * Allows users to describe what they want to build and generates
 * a complete application with form + workflow.
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  Chip,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Alert,
  alpha,
  useTheme,
  Fade,
  Grow,
} from '@mui/material';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import {
  AutoAwesome,
  ArrowForward,
  Refresh,
  CheckCircle,
  Description,
  AccountTree,
  Link as LinkIcon,
  RocketLaunch,
  SkipNext,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useIntentOnboarding, GenerationPhase } from '@/contexts/IntentOnboardingContext';

// Example prompts to help users get started
const EXAMPLE_PROMPTS = [
  'Customer feedback survey with ratings and comments',
  'Job application form with resume upload',
  'Event registration with meal preferences',
  'Bug report tracker with priority levels',
  'Employee onboarding checklist',
  'Product order form with shipping details',
];

// Map generation phases to step indices
const PHASE_TO_STEP: Record<GenerationPhase, number> = {
  scaffolding: 0,
  analyzing: 1,
  form: 2,
  workflow: 3,
  binding: 4,
  done: 5,
};

const PHASE_LABELS: Record<GenerationPhase, string> = {
  scaffolding: 'Setting up workspace',
  analyzing: 'Understanding requirements',
  form: 'Designing form',
  workflow: 'Creating workflow',
  binding: 'Connecting components',
  done: 'Complete',
};

export function IntentOnboarding() {
  const theme = useTheme();
  const router = useRouter();
  const {
    step,
    progress,
    intent,
    result,
    error,
    setIntent,
    generateFromIntent,
    skipOnboarding,
    retry,
  } = useIntentOnboarding();

  const [localIntent, setLocalIntent] = useState(intent);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!localIntent.trim()) return;
    setIsSubmitting(true);
    try {
      await generateFromIntent(localIntent.trim());
    } finally {
      setIsSubmitting(false);
    }
  }, [localIntent, generateFromIntent]);

  const handleSkip = useCallback(async () => {
    setIsSubmitting(true);
    try {
      await skipOnboarding();
    } finally {
      setIsSubmitting(false);
    }
  }, [skipOnboarding]);

  const handleExampleClick = useCallback((example: string) => {
    setLocalIntent(example);
    setIntent(example);
  }, [setIntent]);

  const handleGoToApp = useCallback(() => {
    if (result?.appUrl) {
      router.push(result.appUrl);
    }
  }, [result, router]);

  // Input State
  if (step === 'input') {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'background.default',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Container maxWidth="md" sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', py: 4 }}>
          <Fade in timeout={500}>
            <Box sx={{ textAlign: 'center', mb: 6 }}>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '20px',
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 3,
                }}
              >
                <AutoAwesome sx={{ fontSize: 40, color: theme.palette.primary.main }} />
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 700, mb: 2 }}>
                What do you want to build?
              </Typography>
              <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 500, mx: 'auto' }}>
                Describe your idea in plain English. We'll create a form and workflow for you.
              </Typography>
            </Box>
          </Fade>

          <Grow in timeout={700}>
            <Paper
              elevation={0}
              sx={{
                p: 4,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 3,
                bgcolor: 'background.paper',
              }}
            >
              <TextField
                fullWidth
                multiline
                rows={4}
                placeholder="I want to build..."
                value={localIntent}
                onChange={(e) => {
                  setLocalIntent(e.target.value);
                  setIntent(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.metaKey) {
                    handleSubmit();
                  }
                }}
                disabled={isSubmitting}
                sx={{
                  mb: 3,
                  '& .MuiOutlinedInput-root': {
                    fontSize: '1.1rem',
                    borderRadius: 2,
                  },
                }}
              />

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 4 }}>
                <Typography variant="body2" color="text.secondary" sx={{ width: '100%', mb: 1 }}>
                  Try an example:
                </Typography>
                {EXAMPLE_PROMPTS.map((example) => (
                  <Chip
                    key={example}
                    label={example}
                    onClick={() => handleExampleClick(example)}
                    disabled={isSubmitting}
                    sx={{
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                      },
                    }}
                  />
                ))}
              </Box>

              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleSubmit}
                  disabled={!localIntent.trim() || isSubmitting}
                  startIcon={isSubmitting ? <NetPadLoader size="small" variant="svg" showPhrases={false} /> : <RocketLaunch />}
                  endIcon={!isSubmitting && <ArrowForward />}
                  sx={{
                    px: 4,
                    py: 1.5,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '1rem',
                  }}
                >
                  {isSubmitting ? 'Generating...' : 'Generate My App'}
                </Button>

                <Button
                  variant="text"
                  size="large"
                  onClick={handleSkip}
                  disabled={isSubmitting}
                  startIcon={<SkipNext />}
                  sx={{
                    textTransform: 'none',
                    color: 'text.secondary',
                  }}
                >
                  Skip, start blank
                </Button>
              </Box>
            </Paper>
          </Grow>
        </Container>
      </Box>
    );
  }

  // Generating State
  if (step === 'generating') {
    const activeStep = PHASE_TO_STEP[progress.currentPhase];

    return (
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'background.default',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Container maxWidth="sm">
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <NetPadLoader size="large" variant="ascii" message="Creating your application" />
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 1, mt: 2 }}>
              Creating your application
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {progress.message}
            </Typography>
          </Box>

          <Paper
            elevation={0}
            sx={{
              p: 4,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 3,
              bgcolor: 'background.paper',
            }}
          >
            <Stepper activeStep={activeStep} orientation="vertical">
              {Object.entries(PHASE_LABELS).slice(0, -1).map(([phase, label], index) => (
                <Step key={phase} completed={index < activeStep}>
                  <StepLabel
                    StepIconProps={{
                      sx: {
                        '&.Mui-completed': { color: theme.palette.success.main },
                        '&.Mui-active': { color: theme.palette.primary.main },
                      },
                    }}
                  >
                    <Typography
                      variant="body1"
                      sx={{
                        fontWeight: index === activeStep ? 600 : 400,
                        color: index === activeStep ? 'text.primary' : 'text.secondary',
                      }}
                    >
                      {label}
                    </Typography>
                  </StepLabel>
                  {index === activeStep && (
                    <StepContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
                        <NetPadLoader size="small" variant="svg" showPhrases={false} />
                        <Typography variant="body2" color="text.secondary">
                          In progress...
                        </Typography>
                      </Box>
                    </StepContent>
                  )}
                </Step>
              ))}
            </Stepper>
          </Paper>

          {localIntent && (
            <Box sx={{ mt: 4, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Building: "{localIntent.substring(0, 80)}{localIntent.length > 80 ? '...' : ''}"
              </Typography>
            </Box>
          )}
        </Container>
      </Box>
    );
  }

  // Error State
  if (step === 'error') {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'background.default',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Container maxWidth="sm">
          <Paper
            elevation={0}
            sx={{
              p: 4,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 3,
              bgcolor: 'background.paper',
              textAlign: 'center',
            }}
          >
            <Alert severity="error" sx={{ mb: 3 }}>
              {error || 'Something went wrong. Please try again.'}
            </Alert>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="contained"
                onClick={retry}
                startIcon={<Refresh />}
                sx={{ textTransform: 'none' }}
              >
                Try Again
              </Button>
              <Button
                variant="outlined"
                onClick={handleSkip}
                startIcon={<SkipNext />}
                sx={{ textTransform: 'none' }}
              >
                Skip, start blank
              </Button>
            </Box>
          </Paper>
        </Container>
      </Box>
    );
  }

  // Complete State
  if (step === 'complete' && result) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'background.default',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Container maxWidth="sm">
          <Fade in timeout={500}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  bgcolor: alpha(theme.palette.success.main, 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 3,
                }}
              >
                <CheckCircle sx={{ fontSize: 48, color: theme.palette.success.main }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                Your app is ready!
              </Typography>
              <Typography variant="body1" color="text.secondary">
                We've created everything you need to get started.
              </Typography>
            </Box>
          </Fade>

          <Grow in timeout={700}>
            <Paper
              elevation={0}
              sx={{
                p: 4,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 3,
                bgcolor: 'background.paper',
                mb: 4,
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                What we created:
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Application */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <RocketLaunch sx={{ color: theme.palette.primary.main }} />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {result.application.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Application
                    </Typography>
                  </Box>
                  <CheckCircle sx={{ color: theme.palette.success.main }} />
                </Box>

                {/* Form */}
                {result.form && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 2,
                        bgcolor: alpha(theme.palette.info.main, 0.1),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Description sx={{ color: theme.palette.info.main }} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {result.form.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {result.form.fieldCount} fields
                      </Typography>
                    </Box>
                    <CheckCircle sx={{ color: theme.palette.success.main }} />
                  </Box>
                )}

                {/* Workflow */}
                {result.workflow && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 2,
                        bgcolor: alpha(theme.palette.secondary.main, 0.1),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <AccountTree sx={{ color: theme.palette.secondary.main }} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {result.workflow.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {result.workflow.nodeCount} nodes
                      </Typography>
                    </Box>
                    <CheckCircle sx={{ color: theme.palette.success.main }} />
                  </Box>
                )}

                {/* Binding */}
                {result.form && result.workflow && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 2,
                        bgcolor: alpha(theme.palette.warning.main, 0.1),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <LinkIcon sx={{ color: theme.palette.warning.main }} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        Form + Workflow Connected
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Submissions trigger workflow
                      </Typography>
                    </Box>
                    <CheckCircle sx={{ color: theme.palette.success.main }} />
                  </Box>
                )}
              </Box>
            </Paper>
          </Grow>

          <Box sx={{ textAlign: 'center' }}>
            <Button
              variant="contained"
              size="large"
              onClick={handleGoToApp}
              endIcon={<ArrowForward />}
              sx={{
                px: 6,
                py: 1.5,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '1.1rem',
              }}
            >
              Go to My App
            </Button>
          </Box>
        </Container>
      </Box>
    );
  }

  // Fallback - complete without result (skip case)
  if (step === 'complete') {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'background.default',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Container maxWidth="sm">
          <Box sx={{ textAlign: 'center' }}>
            <CheckCircle sx={{ fontSize: 64, color: theme.palette.success.main, mb: 2 }} />
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
              Workspace ready!
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              Your workspace is set up. You can now create forms and workflows.
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={() => router.push('/')}
              endIcon={<ArrowForward />}
              sx={{
                px: 6,
                py: 1.5,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              Get Started
            </Button>
          </Box>
        </Container>
      </Box>
    );
  }

  return null;
}
