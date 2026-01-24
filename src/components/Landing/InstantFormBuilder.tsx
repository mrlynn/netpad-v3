/**
 * Instant Form Builder Component
 *
 * Hero section component for the landing page that allows visitors
 * to instantly create conversational forms by describing what they want.
 */

'use client';

import React, { useState, useCallback, useRef } from 'react';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Chip,
  Paper,
  alpha,
  Stepper,
  Step,
  StepLabel,
  Collapse,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  AutoAwesome,
  RocketLaunch,
  Refresh,
  CheckCircle,
  Close,
  GitHub,
  Login,
} from '@mui/icons-material';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { FieldConfig, FormConfiguration } from '@/types/form';
import { ConversationalFormConfig } from '@/types/conversational';
import { LiveFormPreview } from './LiveFormPreview';
import { GuestFormEditor } from './GuestFormEditor';

// Example prompts to help users get started
const EXAMPLE_PROMPTS = [
  'Customer feedback survey with star ratings',
  'Job application with resume upload',
  'Event registration with dietary preferences',
  'Support ticket with priority levels',
  'Newsletter signup with interests',
];

// Generation phases
type GenerationPhase = 'idle' | 'analyzing' | 'generating' | 'finalizing' | 'complete' | 'editing' | 'error';

const PHASE_LABELS: Record<GenerationPhase, string> = {
  idle: 'Ready',
  analyzing: 'Analyzing your request',
  generating: 'Generating form fields',
  finalizing: 'Creating conversational config',
  complete: 'Complete',
  editing: 'Editing',
  error: 'Error',
};

interface GeneratedFormState {
  fields: FieldConfig[];
  conversationalConfig?: ConversationalFormConfig;
  form?: FormConfiguration;
  remaining?: number;
}

// User context for personalized chat experience
export interface UserContext {
  isAuthenticated: boolean;
  isWaitlistUser: boolean;
  userName?: string;
  userEmail?: string;
  waitlistStatus?: 'pending' | 'approved' | 'rejected';
}

export function InstantFormBuilder() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [phase, setPhase] = useState<GenerationPhase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [generatedState, setGeneratedState] = useState<GeneratedFormState>({
    fields: [],
  });
  const abortControllerRef = useRef<AbortController | null>(null);

  // Build user context for personalized chat
  const userContext: UserContext = {
    isAuthenticated,
    isWaitlistUser: isAuthenticated && user?.waitlistStatus === 'pending',
    userName: user?.displayName || user?.email?.split('@')[0],
    userEmail: user?.email,
    waitlistStatus: user?.waitlistStatus,
  };

  const isGenerating = phase !== 'idle' && phase !== 'complete' && phase !== 'editing' && phase !== 'error';
  const hasStarted = phase !== 'idle';
  const isEditing = phase === 'editing';

  /**
   * Generate form from prompt
   */
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || isGenerating) return;

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setPhase('analyzing');
    setError(null);
    setGeneratedState({ fields: [] });

    try {
      const response = await fetch('/api/landing/generate-form-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;

          try {
            const event = JSON.parse(line.slice(6));

            switch (event.type) {
              case 'status':
                setPhase(event.phase as GenerationPhase);
                break;

              case 'field':
                setGeneratedState((prev) => ({
                  ...prev,
                  fields: [...prev.fields, event.field],
                }));
                break;

              case 'conversational':
                setGeneratedState((prev) => ({
                  ...prev,
                  conversationalConfig: event.config,
                }));
                break;

              case 'complete':
                setGeneratedState((prev) => {
                  // Store in localStorage with conversationalConfig included
                  if (event.form) {
                    const formToStore = {
                      ...event.form,
                      conversationalConfig: prev.conversationalConfig,
                    };
                    localStorage.setItem('netpad_generated_form', JSON.stringify(formToStore));
                  }
                  return {
                    ...prev,
                    form: event.form,
                    remaining: event.remaining,
                  };
                });
                setPhase('complete');
                break;

              case 'error':
                throw new Error(event.error);
            }
          } catch (parseError) {
            // Ignore parse errors for incomplete chunks
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('[InstantFormBuilder] Error:', err);
        setError(err.message || 'Failed to generate form');
        setPhase('error');
      }
    }
  }, [prompt, isGenerating]);

  /**
   * Reset to initial state
   */
  const handleReset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setPhase('idle');
    setError(null);
    setGeneratedState({ fields: [] });
    setPrompt('');
  }, []);

  /**
   * Handle sign up click
   */
  const handleSignUp = useCallback(() => {
    // Form is already stored in localStorage, redirect to auth
    // Use /auth/login which handles both login and signup
    // URL-encode the redirect value to preserve the query params
    const redirectUrl = encodeURIComponent('/builder?restore=true');
    router.push(`/auth/login?redirect=${redirectUrl}`);
  }, [router]);

  /**
   * Open the full form editor
   */
  const handleOpenEditor = useCallback(() => {
    setPhase('editing');
  }, []);

  /**
   * Go back from editor to generation complete view
   */
  const handleBackFromEditor = useCallback(() => {
    setPhase('complete');
  }, []);

  /**
   * Select an example prompt
   */
  const handleExampleClick = useCallback((example: string) => {
    setPrompt(example);
  }, []);

  // Active step for stepper
  const activeStep =
    phase === 'idle'
      ? -1
      : phase === 'analyzing'
        ? 0
        : phase === 'generating'
          ? 1
          : phase === 'finalizing'
            ? 2
            : phase === 'complete'
              ? 3
              : -1;

  // Show full-screen editor when in editing phase
  if (isEditing && generatedState.form) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: '#001E2B',
          position: 'relative',
          overflow: 'hidden',
          background: `
            radial-gradient(ellipse at top, rgba(0, 237, 100, 0.1) 0%, transparent 50%),
            #001E2B
          `,
        }}
      >
        <GuestFormEditor
          form={generatedState.form}
          conversationalConfig={generatedState.conversationalConfig}
          fields={generatedState.fields}
          onBack={handleBackFromEditor}
          onSignUp={handleSignUp}
        />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        pt: { xs: 4, md: 6 },
        pb: { xs: 6, md: 8 },
        position: 'relative',
        // Layered background
        background: `
          radial-gradient(ellipse at top, rgba(0, 237, 100, 0.15) 0%, transparent 60%),
          radial-gradient(ellipse at 80% 20%, rgba(0, 212, 170, 0.08) 0%, transparent 40%)
        `,
        // Grid pattern overlay
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          backgroundImage: `radial-gradient(rgba(0, 237, 100, 0.3) 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
          opacity: 0.5,
          pointerEvents: 'none',
        },
      }}
    >
      <Container maxWidth="lg">
        {/* Header with Sign In for unauthenticated users */}
        {!isLoading && !isAuthenticated && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              mb: 2,
            }}
          >
            <Button
              component={Link}
              href="/auth/login"
              startIcon={<Login sx={{ fontSize: 16 }} />}
              size="small"
              sx={{
                px: 2,
                py: 0.75,
                color: alpha('#fff', 0.8),
                bgcolor: alpha('#fff', 0.05),
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '0.875rem',
                border: '1px solid',
                borderColor: alpha('#fff', 0.15),
                '&:hover': {
                  bgcolor: alpha('#00ED64', 0.1),
                  borderColor: alpha('#00ED64', 0.3),
                  color: '#00ED64',
                },
                transition: 'all 0.2s ease',
              }}
            >
              Sign In
            </Button>
          </Box>
        )}

        {/* Minimal branding */}
        <Box sx={{ textAlign: 'center', mb: 0 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <Image
              src="/netpad-superhero.png"
              alt="NetPad"
              width={190}
              height={190}
              priority
              style={{ filter: 'drop-shadow(0 4px 12px rgba(0, 237, 100, 0.2))' }}
            />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
            
          </Box>
        </Box>

        {/* Main headline */}
        <Typography
          variant="h1"
          sx={{
            fontSize: { xs: '1.75rem', md: '3.5rem', lg: '6rem' },
            fontWeight: 700,
            color: '#fff',
            textAlign: 'center',
            mb: 1,
            lineHeight: 1.2,
          }}
        >
          Build a conversational form
          <Box
            component="span"
            sx={{
              display: 'block',
              background: 'linear-gradient(135deg, #00ED64 0%, #4DFF9F 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            in seconds
          </Box>
        </Typography>

        <Typography
          variant="body1"
          sx={{
            color: alpha('#fff', 0.6),
            textAlign: 'center',
            mb: 4,
            maxWidth: 500,
            mx: 'auto',
          }}
        >
          Describe what you want to collect. AI creates a form that feels like a conversation.
        </Typography>

        {/* Main builder area */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: hasStarted ? { xs: '1fr', md: '1fr 1fr' } : '1fr',
            gap: 3,
            maxWidth: hasStarted ? 1000 : 700,
            mx: 'auto',
          }}
        >
          {/* Input section */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              border: '1px solid',
              borderColor: alpha('#00ED64', 0.2),
              borderRadius: 3,
              bgcolor: alpha('#000', 0.3),
              backdropFilter: 'blur(10px)',
            }}
          >
            {/* Input or progress */}
            {!hasStarted ? (
              <>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  placeholder="Describe the form you want to build..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.metaKey) {
                      handleGenerate();
                    }
                  }}
                  sx={{
                    mb: 2,
                    '& .MuiOutlinedInput-root': {
                      bgcolor: alpha('#fff', 0.03),
                      borderRadius: 2,
                      fontSize: '1.1rem',
                      '& fieldset': {
                        borderColor: alpha('#fff', 0.1),
                      },
                      '&:hover fieldset': {
                        borderColor: alpha('#00ED64', 0.3),
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#00ED64',
                      },
                    },
                    '& .MuiInputBase-input': {
                      color: '#fff',
                      '&::placeholder': {
                        color: alpha('#fff', 0.4),
                        opacity: 1,
                      },
                    },
                  }}
                />

                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  onClick={handleGenerate}
                  disabled={!prompt.trim()}
                  startIcon={<AutoAwesome />}
                  sx={{
                    py: 1.5,
                    bgcolor: '#00ED64',
                    color: '#001E2B',
                    fontWeight: 600,
                    fontSize: '1rem',
                    textTransform: 'none',
                    borderRadius: 2,
                    '&:hover': { bgcolor: '#00CC55' },
                    '&.Mui-disabled': {
                      bgcolor: alpha('#00ED64', 0.3),
                      color: alpha('#001E2B', 0.5),
                    },
                  }}
                >
                  Generate Form
                </Button>

                {/* Example prompts */}
                <Box sx={{ mt: 3 }}>
                  <Typography
                    variant="caption"
                    sx={{ color: alpha('#fff', 0.5), display: 'block', mb: 1.5 }}
                  >
                    Try an example:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {EXAMPLE_PROMPTS.map((example) => (
                      <Chip
                        key={example}
                        label={example}
                        size="small"
                        onClick={() => handleExampleClick(example)}
                        sx={{
                          bgcolor: alpha('#fff', 0.05),
                          color: alpha('#fff', 0.7),
                          border: '1px solid',
                          borderColor: alpha('#fff', 0.1),
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          '&:hover': {
                            bgcolor: alpha('#00ED64', 0.1),
                            borderColor: alpha('#00ED64', 0.3),
                            color: '#00ED64',
                          },
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              </>
            ) : (
              <>
                {/* Progress view */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3 }}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#fff', mb: 0.5 }}>
                      {phase === 'complete' ? 'Your form is ready!' : 'Creating your form...'}
                    </Typography>
                    <Typography variant="body2" sx={{ color: alpha('#fff', 0.6) }}>
                      {phase === 'complete'
                        ? 'Sign up to save and publish'
                        : `"${prompt.substring(0, 40)}${prompt.length > 40 ? '...' : ''}"`}
                    </Typography>
                  </Box>
                  <Tooltip title="Start over">
                    <IconButton
                      size="small"
                      onClick={handleReset}
                      sx={{ color: alpha('#fff', 0.5), '&:hover': { color: '#fff' } }}
                    >
                      {phase === 'complete' ? <Refresh /> : <Close />}
                    </IconButton>
                  </Tooltip>
                </Box>

                {/* Stepper */}
                <Stepper activeStep={activeStep} orientation="vertical" sx={{ mb: 2 }}>
                  {['Analyzing', 'Generating fields', 'Creating AI config', 'Complete'].map((label, index) => (
                    <Step key={label} completed={index < activeStep || phase === 'complete'}>
                      <StepLabel
                        StepIconProps={{
                          sx: {
                            '&.Mui-completed': { color: '#00ED64' },
                            '&.Mui-active': { color: '#00ED64' },
                          },
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: index === activeStep ? 600 : 400,
                            color: index === activeStep ? '#fff' : alpha('#fff', 0.6),
                          }}
                        >
                          {label}
                        </Typography>
                      </StepLabel>
                    </Step>
                  ))}
                </Stepper>

                {/* Error message */}
                <Collapse in={phase === 'error'}>
                  <Paper
                    sx={{
                      p: 2,
                      bgcolor: alpha('#f44336', 0.1),
                      border: '1px solid',
                      borderColor: alpha('#f44336', 0.3),
                      borderRadius: 2,
                      mb: 2,
                    }}
                  >
                    <Typography variant="body2" sx={{ color: '#f44336', mb: 1 }}>
                      {error}
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={handleReset}
                      startIcon={<Refresh />}
                      sx={{
                        borderColor: alpha('#f44336', 0.5),
                        color: '#f44336',
                        textTransform: 'none',
                      }}
                    >
                      Try again
                    </Button>
                  </Paper>
                </Collapse>

                {/* Edit & Sign up buttons */}
                {phase === 'complete' && generatedState.form && (
                  <Box sx={{ mt: 3 }}>
                    <Button
                      fullWidth
                      variant="contained"
                      size="large"
                      onClick={handleOpenEditor}
                      sx={{
                        py: 1.5,
                        mb: 1.5,
                        bgcolor: '#00ED64',
                        color: '#001E2B',
                        fontWeight: 600,
                        textTransform: 'none',
                        borderRadius: 2,
                        '&:hover': { bgcolor: '#00CC55' },
                      }}
                    >
                      Edit & Customize Form
                    </Button>
                    <Button
                      fullWidth
                      variant="outlined"
                      size="large"
                      onClick={handleSignUp}
                      sx={{
                        py: 1.5,
                        borderColor: alpha('#00ED64', 0.5),
                        color: '#00ED64',
                        fontWeight: 600,
                        textTransform: 'none',
                        borderRadius: 2,
                        '&:hover': {
                          borderColor: '#00ED64',
                          bgcolor: alpha('#00ED64', 0.1),
                        },
                      }}
                    >
                      Sign Up to Save
                    </Button>
                  </Box>
                )}

                {/* Rate limit info */}
                {phase === 'complete' && generatedState.remaining !== undefined && (
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      textAlign: 'center',
                      color: alpha('#fff', 0.4),
                      mt: 2,
                    }}
                  >
                    {generatedState.remaining} free generation{generatedState.remaining !== 1 ? 's' : ''} remaining today
                    {' · '}
                    <Link href="/auth/login" style={{ color: '#00ED64', textDecoration: 'none' }}>
                      Unlimited with signup
                    </Link>
                  </Typography>
                )}
              </>
            )}
          </Paper>

          {/* Preview section - only shown after generation starts */}
          {hasStarted && (
            <Box sx={{ minHeight: { xs: 300, md: 400 } }}>
              <LiveFormPreview
                fields={generatedState.fields}
                conversationalConfig={generatedState.conversationalConfig}
                isGenerating={isGenerating}
                isComplete={phase === 'complete'}
                onSignUp={phase === 'complete' ? handleSignUp : undefined}
                userContext={userContext}
              />
            </Box>
          )}
        </Box>

        {/* Secondary CTA for those who want to explore first */}
        {!hasStarted && (
          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Typography variant="body2" sx={{ color: alpha('#fff', 0.5), mb: 1 }}>
              or
            </Typography>
            <Button
              component={Link}
              href="/why-netpad"
              variant="text"
              sx={{
                color: alpha('#fff', 0.7),
                textTransform: 'none',
                '&:hover': { color: '#00ED64' },
              }}
            >
              Learn more about NetPad
            </Button>
          </Box>
        )}
      </Container>
    </Box>
  );
}

export default InstantFormBuilder;
