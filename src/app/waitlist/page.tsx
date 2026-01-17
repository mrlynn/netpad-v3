'use client';

import { useState, Suspense, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  alpha,
  CircularProgress,
  Alert,
  Collapse,
  useTheme,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
} from '@mui/material';
import {
  Home,
  CheckCircle,
  AutoAwesome,
  ListAlt,
} from '@mui/icons-material';
import Link from 'next/link';
import Image from 'next/image';
import { FormRenderer } from '@/components/FormRenderer/FormRenderer';
import { ConversationalFormChat } from '@/components/ConversationalForm/ConversationalFormChat';
import { waitlistFormConfig, mapFormDataToApi } from '@/config/waitlistForm';
import { waitlistConversationalConfig } from '@/config/waitlistConversational';
import { ConversationState } from '@/types/conversational';

type SignupMode = 'conversational' | 'form';

function WaitlistContent() {
  const searchParams = useSearchParams();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // Get source from query params for tracking
  const source = searchParams.get('source') || searchParams.get('ref') || 'direct';
  const referralCode = searchParams.get('referral') || searchParams.get('code');
  const preferForm = searchParams.get('mode') === 'form';

  const [mode, setMode] = useState<SignupMode>(preferForm ? 'form' : 'conversational');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [alreadyApproved, setAlreadyApproved] = useState(false);

  // Create theme-aware form config
  const themedFormConfig = useMemo(() => ({
    ...waitlistFormConfig,
    theme: {
      ...waitlistFormConfig.theme,
      mode: (isDark ? 'dark' : 'light') as 'dark' | 'light',
      backgroundColor: 'transparent',
      textColor: isDark ? '#ffffff' : '#1a1a2e',
      textSecondaryColor: isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)',
    },
  }), [isDark]);

  // Submit data to the waitlist API
  const submitToWaitlist = useCallback(
    async (data: Record<string, any>) => {
      const response = await fetch('/api/waitlist/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          source,
          referralCode: referralCode || undefined,
        }),
      });

      const result = await response.json();

      if (result.success) {
        if (result.alreadyApproved) {
          setAlreadyApproved(true);
        }
        setSuccess(true);
        return result;
      } else {
        throw new Error(result.message || 'Something went wrong. Please try again.');
      }
    },
    [source, referralCode]
  );

  // Handle traditional form submission
  const handleFormSubmit = async (data: Record<string, any>) => {
    setError(null);
    try {
      const mappedData = mapFormDataToApi(data);
      await submitToWaitlist(mappedData);
    } catch (err: any) {
      setError(err.message || 'Network error. Please try again.');
      throw err;
    }
  };

  // Handle conversational form completion
  const handleConversationalComplete = async (conversationState: ConversationState) => {
    setError(null);
    try {
      // Map extracted data from conversation to API format
      const extractedData = conversationState.partialExtractions;
      await submitToWaitlist({
        email: extractedData.email,
        name: extractedData.name,
        company: extractedData.company,
        useCase: extractedData.useCase,
        role: extractedData.role,
        howDidYouHear: extractedData.howDidYouHear,
        howDidYouHearOther: extractedData.howDidYouHearOther,
        teamSize: extractedData.teamSize,
        timeline: extractedData.timeline,
        interests: extractedData.interests,
        currentTools: extractedData.currentTools,
        biggestChallenge: extractedData.biggestChallenge,
      });
    } catch (err: any) {
      setError(err.message || 'Network error. Please try again.');
    }
  };

  // Theme-aware colors
  const bgColor = isDark ? '#001E2B' : '#f5f7fa';
  const textColor = isDark ? '#fff' : '#1a1a2e';
  const textSecondary = isDark ? alpha('#fff', 0.6) : alpha('#000', 0.6);
  const textMuted = isDark ? alpha('#fff', 0.4) : alpha('#000', 0.4);
  const borderColor = isDark ? alpha('#fff', 0.1) : alpha('#000', 0.1);
  const paperBg = isDark ? alpha('#fff', 0.03) : '#ffffff';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: bgColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        background: isDark
          ? 'radial-gradient(ellipse at top, rgba(0, 237, 100, 0.08) 0%, transparent 50%)'
          : 'radial-gradient(ellipse at top, rgba(0, 237, 100, 0.15) 0%, transparent 50%)',
      }}
    >
      <Container maxWidth={mode === 'conversational' ? 'md' : 'sm'}>
        {/* Back to home */}
        <Box sx={{ mb: 3, textAlign: 'center' }}>
          <Button
            component={Link}
            href="/"
            startIcon={<Home />}
            sx={{
              color: textMuted,
              textTransform: 'none',
              '&:hover': { color: '#00ED64' },
            }}
          >
            Back to home
          </Button>
        </Box>

        <Paper
          elevation={isDark ? 0 : 2}
          sx={{
            p: { xs: 3, sm: 4 },
            bgcolor: paperBg,
            border: '1px solid',
            borderColor: borderColor,
            borderRadius: 3,
            minHeight: mode === 'conversational' ? 500 : 'auto',
          }}
        >
          {!success ? (
            <>
              {/* Header */}
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 2,
                  }}
                >
                  <Image
                    src="/netpad-waitlist.png"
                    alt="NetPad"
                    width={120}
                    height={120}
                    style={{ objectFit: 'contain' }}
                  />
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 700, color: textColor, mb: 1 }}>
                  Join the Waitlist
                </Typography>
                <Typography sx={{ color: textSecondary, mb: 2 }}>
                  Be among the first to experience NetPad
                </Typography>

                {/* Mode Toggle */}
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                  <ToggleButtonGroup
                    value={mode}
                    exclusive
                    onChange={(_, newMode) => newMode && setMode(newMode)}
                    size="small"
                    sx={{
                      '& .MuiToggleButton-root': {
                        color: textMuted,
                        borderColor: borderColor,
                        textTransform: 'none',
                        px: 2,
                        '&.Mui-selected': {
                          bgcolor: alpha('#00ED64', 0.15),
                          color: '#00ED64',
                          borderColor: alpha('#00ED64', 0.3),
                          '&:hover': {
                            bgcolor: alpha('#00ED64', 0.2),
                          },
                        },
                        '&:hover': {
                          bgcolor: alpha('#fff', 0.05),
                        },
                      },
                    }}
                  >
                    <ToggleButton value="conversational">
                      <Tooltip title="Chat with our AI to sign up - it's more fun!">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <AutoAwesome fontSize="small" />
                          Chat
                        </Box>
                      </Tooltip>
                    </ToggleButton>
                    <ToggleButton value="form">
                      <Tooltip title="Traditional form - faster if you're in a hurry">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <ListAlt fontSize="small" />
                          Form
                        </Box>
                      </Tooltip>
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Box>
              </Box>

              <Collapse in={!!error}>
                <Alert
                  severity="error"
                  onClose={() => setError(null)}
                  sx={{ mb: 3, bgcolor: alpha('#f44336', 0.1), color: '#f44336' }}
                >
                  {error}
                </Alert>
              </Collapse>

              {/* Conversational Mode */}
              {mode === 'conversational' && (
                <Box sx={{ minHeight: 400 }}>
                  <Suspense
                    fallback={
                      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                        <CircularProgress sx={{ color: '#00ED64' }} />
                      </Box>
                    }
                  >
                    <ConversationalFormChat
                      formId="waitlist-signup"
                      config={waitlistConversationalConfig}
                      onComplete={handleConversationalComplete}
                      sx={{
                        bgcolor: 'transparent',
                        '& .MuiPaper-root': {
                          bgcolor: alpha('#fff', 0.02),
                        },
                      }}
                    />
                  </Suspense>
                </Box>
              )}

              {/* Traditional Form Mode */}
              {mode === 'form' && (
                <Suspense
                  fallback={
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                      <CircularProgress sx={{ color: '#00ED64' }} />
                    </Box>
                  }
                >
                  <FormRenderer
                    form={themedFormConfig}
                    onSubmit={handleFormSubmit}
                    isPreview={false}
                  />
                </Suspense>
              )}

              {/* Footer */}
              <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid', borderColor: borderColor }}>
                <Typography variant="body2" sx={{ color: textSecondary, textAlign: 'center' }}>
                  Already have access?{' '}
                  <Link
                    href="/auth/login"
                    style={{ color: '#00ED64', textDecoration: 'none', fontWeight: 600 }}
                  >
                    Sign in
                  </Link>
                </Typography>
              </Box>
            </>
          ) : (
            // Success State
            <Box sx={{ textAlign: 'center' }}>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  bgcolor: alpha('#00ED64', 0.15),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 3,
                }}
              >
                <CheckCircle sx={{ fontSize: 40, color: '#00ED64' }} />
              </Box>

              <Typography variant="h5" sx={{ fontWeight: 700, color: textColor, mb: 2 }}>
                {alreadyApproved ? "You're Already Approved!" : "You're on the List!"}
              </Typography>

              <Typography sx={{ color: textSecondary, mb: 4 }}>
                {alreadyApproved
                  ? 'Great news - your account is already approved. You can sign in now.'
                  : "Thanks for joining! We'll send you an email when your access is approved."}
              </Typography>

              <Button
                component={Link}
                href={alreadyApproved ? '/auth/login' : '/'}
                variant="outlined"
                size="large"
                sx={{
                  py: 1.5,
                  px: 4,
                  borderColor: '#00ED64',
                  color: '#00ED64',
                  textTransform: 'none',
                  borderRadius: 2,
                  '&:hover': {
                    borderColor: '#00FF6A',
                    bgcolor: alpha('#00ED64', 0.1),
                  },
                }}
              >
                {alreadyApproved ? 'Sign In' : 'Back to Home'}
              </Button>
            </Box>
          )}
        </Paper>
      </Container>
    </Box>
  );
}

export default function WaitlistPage() {
  return (
    <Suspense
      fallback={
        <Box
          sx={{
            minHeight: '100vh',
            bgcolor: 'background.default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CircularProgress sx={{ color: '#00ED64' }} />
        </Box>
      }
    >
      <WaitlistContent />
    </Suspense>
  );
}
