/**
 * Collaborator Recruitment Landing Page
 *
 * This is a complete example of a recruitment landing page that uses NetPad's
 * form system with both conversational AI and traditional form modes.
 *
 * Key Features:
 * - Dual-mode intake (Chat or Form)
 * - Fetches form configuration from NetPad API
 * - Handles both submission types
 * - Captures conversation transcripts
 * - Marketing-ready design with dark/light theme support
 *
 * To use this example:
 * 1. Copy this file to your Next.js app directory (e.g., src/app/collaborate/page.tsx)
 * 2. Install dependencies: @mui/material, @mui/icons-material
 * 3. Create the conversational config file (see collaboratorConversational.ts below)
 * 4. Ensure your form is published with slug 'collaborator-intake'
 */

'use client';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Grid,
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
  DesignServices,
  Code,
  Extension,
  KeyboardArrowDown,
  AutoAwesome,
  ListAlt,
} from '@mui/icons-material';
import Link from 'next/link';

// Import NetPad components
import { FormRenderer } from '@/components/FormRenderer/FormRenderer';
import { ConversationalFormChat } from '@/components/ConversationalForm';

// Import types
import { FormConfiguration } from '@/types/form';
import { ConversationState } from '@/types/conversational';

// =============================================================================
// CONFIGURATION - Customize these for your use case
// =============================================================================

// Form slug - must match the published form in NetPad
const FORM_SLUG = 'collaborator-intake';

// Conversational AI configuration - import from your config file
// See collaboratorConversational.ts example below
import { collaboratorConversationalConfig } from '@/config/collaboratorConversational';

// Lane card data - customize these for your collaboration areas
const LANES = [
  {
    id: 'product',
    title: 'Product & Design',
    icon: DesignServices,
    color: '#9C27B0',
    youMightBeFitIf: [
      "You've shipped consumer or developer products",
      'You think in systems, not just screens',
      'You have opinions about what makes software feel good',
    ],
    whatYoudWorkOn: [
      'Navigation and information architecture',
      'The form builder experience',
      'How workflows feel to create and debug',
    ],
    time: '5-10 hrs/week to start',
  },
  {
    id: 'engineering',
    title: 'Full-Stack Engineering',
    icon: Code,
    color: '#2196F3',
    youMightBeFitIf: [
      "You're comfortable in React/Next.js and Node",
      "You've worked with MongoDB (or want to go deep)",
      'You like building infrastructure that other features depend on',
    ],
    whatYoudWorkOn: [
      'Workflow execution engine',
      'Form-to-database pipeline',
      'Performance and reliability',
    ],
    time: '5-10 hrs/week to start',
  },
  {
    id: 'integrations',
    title: 'Integrations & Ecosystem',
    icon: Extension,
    color: '#E91E63',
    youMightBeFitIf: [
      "You've built or maintained API integrations",
      'You understand developer experience from the consumer side',
      "You're interested in how platforms become ecosystems",
    ],
    whatYoudWorkOn: [
      'Webhook and connector architecture',
      'Template and marketplace systems',
      'Third-party integration patterns',
    ],
    time: '5-10 hrs/week to start',
  },
];

// =============================================================================
// TYPES
// =============================================================================

type IntakeMode = 'conversational' | 'form';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function CollaboratePage() {
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
      <CollaborateContent />
    </Suspense>
  );
}

function CollaborateContent() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // State
  const [mode, setMode] = useState<IntakeMode>('conversational');
  const [form, setForm] = useState<FormConfiguration | null>(null);
  const [formLoading, setFormLoading] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // =============================================================================
  // FETCH FORM FROM NETPAD
  // =============================================================================
  useEffect(() => {
    const fetchForm = async () => {
      try {
        const response = await fetch(`/api/forms/${FORM_SLUG}?public=true`);
        const data = await response.json();

        if (!data.success) {
          setFormError(data.error || 'Form not found. Please try again later.');
          return;
        }

        setForm(data.form);
      } catch (err) {
        console.error('Failed to load form:', err);
        setFormError('Failed to load form. Please try again later.');
      } finally {
        setFormLoading(false);
      }
    };

    fetchForm();
  }, []);

  // =============================================================================
  // THEMED FORM CONFIG
  // =============================================================================
  const themedFormConfig = useMemo(() => {
    if (!form) return null;
    return {
      ...form,
      theme: {
        ...form.theme,
        mode: (isDark ? 'dark' : 'light') as 'dark' | 'light',
        backgroundColor: 'transparent',
        textColor: isDark ? '#ffffff' : '#1a1a2e',
        textSecondaryColor: isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)',
      },
    };
  }, [form, isDark]);

  // =============================================================================
  // FORM SUBMISSION HANDLER (Traditional Form)
  // =============================================================================
  const handleFormSubmit = async (data: Record<string, unknown>) => {
    setError(null);
    try {
      const response = await fetch(`/api/forms/${FORM_SLUG}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(true);
      } else {
        throw new Error(result.error || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Network error. Please try again.';
      setError(message);
      throw err;
    }
  };

  // =============================================================================
  // CONVERSATIONAL COMPLETION HANDLER
  // =============================================================================
  const handleConversationalComplete = useCallback(
    async (conversationState: ConversationState) => {
      setError(null);
      try {
        // Extract data from the conversation
        const extractedData = conversationState.partialExtractions;

        // Build conversational data for transcript capture
        const captureOptions = collaboratorConversationalConfig.captureOptions;
        const conversationalData: Record<string, unknown> = {
          conversationId: conversationState.conversationId,
          turnCount: conversationState.turnCount,
          overallConfidence: conversationState.confidence,
        };

        // Include transcript if enabled
        if (captureOptions?.captureTranscript && conversationState.messages) {
          conversationalData.transcript = conversationState.messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
            ...(captureOptions.includeTimestamps && msg.timestamp
              ? { timestamp: msg.timestamp }
              : {}),
          }));
        }

        // Include topic coverage if enabled
        if (captureOptions?.includeTopicCoverage && conversationState.topics) {
          conversationalData.topicsCovered = conversationState.topics.map((topic) => ({
            topicId: topic.topicId,
            name: topic.name,
            covered: topic.covered,
            depth: topic.depth,
          }));
        }

        // Calculate duration
        if (conversationState.startedAt) {
          const startTime = new Date(conversationState.startedAt).getTime();
          const endTime = conversationState.completedAt
            ? new Date(conversationState.completedAt).getTime()
            : Date.now();
          conversationalData.durationSeconds = Math.round((endTime - startTime) / 1000);
          conversationalData.startedAt = conversationState.startedAt;
          conversationalData.completedAt = conversationState.completedAt || new Date();
        }

        // Submit to NetPad
        const response = await fetch(`/api/forms/${FORM_SLUG}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: {
              ...extractedData,
              _meta: {
                submissionType: 'conversational',
                conversationId: conversationState.conversationId,
                turnCount: conversationState.turnCount,
                confidence: conversationState.confidence,
              },
            },
            // Include full conversational data for transcript storage
            conversationalData,
          }),
        });

        const result = await response.json();

        if (result.success) {
          setSuccess(true);
        } else {
          throw new Error(result.error || 'Something went wrong. Please try again.');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Network error. Please try again.';
        setError(message);
      }
    },
    []
  );

  // =============================================================================
  // SCROLL HELPERS
  // =============================================================================
  const scrollToForm = () => {
    document.getElementById('form-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToOpportunity = () => {
    document.getElementById('opportunity-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  // =============================================================================
  // THEME COLORS
  // =============================================================================
  const bgColor = isDark ? '#001E2B' : '#f5f7fa';
  const textColor = isDark ? '#fff' : '#1a1a2e';
  const textSecondary = isDark ? alpha('#fff', 0.7) : alpha('#000', 0.6);
  const textMuted = isDark ? alpha('#fff', 0.5) : alpha('#000', 0.4);
  const borderColor = isDark ? alpha('#fff', 0.1) : alpha('#000', 0.1);
  const paperBg = isDark ? alpha('#fff', 0.03) : '#ffffff';

  // =============================================================================
  // RENDER
  // =============================================================================
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: bgColor }}>
      {/* Back to Home */}
      <Box sx={{ position: 'fixed', top: 16, left: 16, zIndex: 100 }}>
        <Button
          component={Link}
          href="/"
          startIcon={<Home />}
          sx={{
            color: textMuted,
            textTransform: 'none',
            bgcolor: alpha(bgColor, 0.8),
            backdropFilter: 'blur(8px)',
            '&:hover': { color: '#00ED64', bgcolor: alpha(bgColor, 0.9) },
          }}
        >
          Back to home
        </Button>
      </Box>

      {/* Section 1: Hero */}
      <Box
        sx={{
          minHeight: '80vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: isDark
            ? 'radial-gradient(ellipse at top, rgba(0, 237, 100, 0.12) 0%, transparent 60%)'
            : 'radial-gradient(ellipse at top, rgba(0, 237, 100, 0.2) 0%, transparent 60%)',
          py: { xs: 12, md: 16 },
          px: 2,
        }}
      >
        <Container maxWidth="md" sx={{ textAlign: 'center' }}>
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: '2.5rem', md: '4rem' },
              fontWeight: 800,
              color: textColor,
              mb: 3,
              lineHeight: 1.1,
            }}
          >
            Build With Me
          </Typography>
          <Typography
            variant="h5"
            sx={{
              color: textSecondary,
              mb: 5,
              maxWidth: 600,
              mx: 'auto',
              fontWeight: 400,
              lineHeight: 1.6,
            }}
          >
            I'm looking for 1-2 people who want to shape what this project becomes.
          </Typography>

          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 2,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Button
              variant="contained"
              size="large"
              onClick={scrollToForm}
              sx={{
                bgcolor: '#00ED64',
                color: '#001E2B',
                px: 4,
                py: 1.5,
                fontSize: '1.1rem',
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: 2,
                '&:hover': { bgcolor: '#00FF6A' },
              }}
            >
              Tell me about yourself
            </Button>
            <Button
              variant="text"
              size="large"
              onClick={scrollToOpportunity}
              endIcon={<KeyboardArrowDown />}
              sx={{
                color: textSecondary,
                textTransform: 'none',
                '&:hover': { color: '#00ED64' },
              }}
            >
              Learn more
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Section 2: The Opportunity */}
      <Box id="opportunity-section" sx={{ py: { xs: 10, md: 14 }, px: 2 }}>
        <Container maxWidth="md">
          <Typography
            variant="h3"
            sx={{ fontWeight: 700, color: textColor, mb: 5, textAlign: 'center' }}
          >
            The Opportunity
          </Typography>

          <Paper
            elevation={0}
            sx={{
              p: { xs: 3, md: 5 },
              bgcolor: paperBg,
              border: '1px solid',
              borderColor: borderColor,
              borderRadius: 3,
            }}
          >
            <Typography sx={{ color: textSecondary, fontSize: '1.1rem', lineHeight: 1.8, mb: 4 }}>
              <strong style={{ color: textColor }}>What this is:</strong> An opportunity to build
              something meaningful with high autonomy. You'll have real ownership and input into
              the direction of the project.
            </Typography>

            <Typography sx={{ color: textSecondary, fontSize: '1.1rem', lineHeight: 1.8, mb: 4 }}>
              <strong style={{ color: textColor }}>What I'm looking for:</strong> Someone who has
              shipped real things they're proud of, wants to shape a product (not just execute
              tasks), and can commit 5-10 hours per week to start.
            </Typography>

            <Typography sx={{ color: textSecondary, fontSize: '1.1rem', lineHeight: 1.8 }}>
              <strong style={{ color: textColor }}>How it works:</strong> We'll start with a 2-4
              week trial project. If we click, we'll figure out what a longer-term partnership
              looks like.
            </Typography>
          </Paper>
        </Container>
      </Box>

      {/* Section 3: Lanes */}
      <Box
        sx={{
          py: { xs: 10, md: 14 },
          px: 2,
          bgcolor: isDark ? alpha('#fff', 0.02) : alpha('#000', 0.02),
        }}
      >
        <Container maxWidth="lg">
          <Typography
            variant="h3"
            sx={{ fontWeight: 700, color: textColor, mb: 2, textAlign: 'center' }}
          >
            Areas of Focus
          </Typography>
          <Typography
            sx={{ color: textSecondary, textAlign: 'center', mb: 6, maxWidth: 600, mx: 'auto' }}
          >
            Three lanes, each representing a different way to contribute.
          </Typography>

          <Grid container spacing={3}>
            {LANES.map((lane) => {
              const Icon = lane.icon;
              return (
                <Grid item xs={12} md={4} key={lane.id}>
                  <Paper
                    elevation={0}
                    sx={{
                      height: '100%',
                      p: 3,
                      bgcolor: paperBg,
                      border: '1px solid',
                      borderColor: borderColor,
                      borderRadius: 2,
                      transition: 'border-color 0.2s',
                      '&:hover': { borderColor: alpha(lane.color, 0.5) },
                    }}
                  >
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        bgcolor: alpha(lane.color, 0.15),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 2,
                      }}
                    >
                      <Icon sx={{ color: lane.color, fontSize: 24 }} />
                    </Box>

                    <Typography variant="h6" sx={{ fontWeight: 700, color: textColor, mb: 2 }}>
                      {lane.title}
                    </Typography>

                    <Typography
                      variant="subtitle2"
                      sx={{
                        color: lane.color,
                        fontWeight: 600,
                        mb: 1,
                        textTransform: 'uppercase',
                        fontSize: '0.75rem',
                      }}
                    >
                      You might be a fit if:
                    </Typography>
                    <Box component="ul" sx={{ pl: 2, mb: 3, mt: 0 }}>
                      {lane.youMightBeFitIf.map((item, i) => (
                        <Typography
                          component="li"
                          key={i}
                          sx={{ color: textSecondary, fontSize: '0.9rem', mb: 0.5 }}
                        >
                          {item}
                        </Typography>
                      ))}
                    </Box>

                    <Typography
                      variant="subtitle2"
                      sx={{
                        color: lane.color,
                        fontWeight: 600,
                        mb: 1,
                        textTransform: 'uppercase',
                        fontSize: '0.75rem',
                      }}
                    >
                      What you'd work on:
                    </Typography>
                    <Box component="ul" sx={{ pl: 2, mb: 3, mt: 0 }}>
                      {lane.whatYoudWorkOn.map((item, i) => (
                        <Typography
                          component="li"
                          key={i}
                          sx={{ color: textSecondary, fontSize: '0.9rem', mb: 0.5 }}
                        >
                          {item}
                        </Typography>
                      ))}
                    </Box>

                    <Typography sx={{ color: textMuted, fontSize: '0.85rem', fontStyle: 'italic' }}>
                      {lane.time}
                    </Typography>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </Container>
      </Box>

      {/* Section 4: The Form */}
      <Box
        id="form-section"
        sx={{
          py: { xs: 10, md: 14 },
          px: 2,
          bgcolor: isDark ? alpha('#fff', 0.02) : alpha('#000', 0.02),
        }}
      >
        <Container maxWidth="sm">
          <Typography
            variant="h3"
            sx={{ fontWeight: 700, color: textColor, mb: 2, textAlign: 'center' }}
          >
            Tell Me About Yourself
          </Typography>
          <Typography sx={{ color: textSecondary, textAlign: 'center', mb: 3 }}>
            Choose your preferred way to connect.
          </Typography>

          {/* Mode Toggle */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
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
                  px: 3,
                  py: 1,
                  '&.Mui-selected': {
                    bgcolor: alpha('#00ED64', 0.15),
                    color: '#00ED64',
                    borderColor: alpha('#00ED64', 0.3),
                    '&:hover': { bgcolor: alpha('#00ED64', 0.2) },
                  },
                  '&:hover': { bgcolor: isDark ? alpha('#fff', 0.05) : alpha('#000', 0.05) },
                },
              }}
            >
              <ToggleButton value="conversational">
                <Tooltip title="Have a conversation with AI - more natural and interactive">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AutoAwesome fontSize="small" />
                    Chat
                  </Box>
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="form">
                <Tooltip title="Traditional form - faster if you prefer">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ListAlt fontSize="small" />
                    Form
                  </Box>
                </Tooltip>
              </ToggleButton>
            </ToggleButtonGroup>
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
                        formId={FORM_SLUG}
                        config={collaboratorConversationalConfig}
                        onComplete={handleConversationalComplete}
                        endpoint="/api/demo/conversational-stream"
                        sx={{
                          bgcolor: 'transparent',
                          '& .MuiPaper-root': { bgcolor: alpha('#fff', 0.02) },
                        }}
                      />
                    </Suspense>
                  </Box>
                )}

                {/* Traditional Form Mode */}
                {mode === 'form' && (
                  <>
                    {formLoading ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                        <CircularProgress sx={{ color: '#00ED64' }} />
                      </Box>
                    ) : formError ? (
                      <Alert severity="error" sx={{ mb: 2 }}>
                        {formError}
                      </Alert>
                    ) : themedFormConfig ? (
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
                    ) : null}
                  </>
                )}
              </>
            ) : (
              // Success State
              <Box sx={{ textAlign: 'center', py: 4 }}>
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
                  Thanks for reaching out!
                </Typography>

                <Typography sx={{ color: textSecondary, mb: 4 }}>
                  I'll be in touch within a few days if I think there's a fit.
                </Typography>

                <Button
                  component={Link}
                  href="/"
                  variant="outlined"
                  size="large"
                  sx={{
                    py: 1.5,
                    px: 4,
                    borderColor: '#00ED64',
                    color: '#00ED64',
                    textTransform: 'none',
                    borderRadius: 2,
                    '&:hover': { borderColor: '#00FF6A', bgcolor: alpha('#00ED64', 0.1) },
                  }}
                >
                  Back to Home
                </Button>
              </Box>
            )}
          </Paper>
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ py: 4, px: 2, borderTop: '1px solid', borderColor: borderColor }}>
        <Container maxWidth="md">
          <Typography sx={{ color: textMuted, textAlign: 'center', fontSize: '0.875rem' }}>
            Built with NetPad — Forms that write to MongoDB, workflows that automate what happens
            next.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}
