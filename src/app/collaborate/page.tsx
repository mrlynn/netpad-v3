'use client';

import { useState, useEffect, Suspense, useMemo, useCallback } from 'react';
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
import Image from 'next/image';
import { FormRenderer } from '@/components/FormRenderer/FormRenderer';
import { ConversationalFormChat } from '@/components/ConversationalForm';
import { FormConfiguration } from '@/types/form';
import { ConversationState } from '@/types/conversational';
import { SpotlightCard, hexToRgb } from '@/components/marketing';
import { collaboratorConversationalConfig } from '@/config/collaboratorConversational';

type IntakeMode = 'conversational' | 'form';

// Form slug - this form should be created in NetPad and published
const COLLABORATOR_FORM_SLUG = 'collaborator-intake';

// Lane card data
const lanes = [
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

function CollaborateContent() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [mode, setMode] = useState<IntakeMode>('conversational');
  const [form, setForm] = useState<FormConfiguration | null>(null);
  const [formLoading, setFormLoading] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch the collaborator form from NetPad
  useEffect(() => {
    const fetchForm = async () => {
      try {
        const response = await fetch(
          `/api/forms/${COLLABORATOR_FORM_SLUG}?public=true`
        );
        const data = await response.json();

        if (!data.success) {
          setFormError(
            data.error || 'Collaborator form not found. Please try again later.'
          );
          return;
        }

        setForm(data.form);
      } catch (err) {
        console.error('Failed to load collaborator form:', err);
        setFormError('Failed to load form. Please try again later.');
      } finally {
        setFormLoading(false);
      }
    };

    fetchForm();
  }, []);

  // Create theme-aware form config
  const themedFormConfig = useMemo(() => {
    if (!form) return null;
    return {
      ...form,
      theme: {
        ...form.theme,
        mode: (isDark ? 'dark' : 'light') as 'dark' | 'light',
        backgroundColor: 'transparent',
        textColor: isDark ? '#ffffff' : '#1a1a2e',
        textSecondaryColor: isDark
          ? 'rgba(255, 255, 255, 0.6)'
          : 'rgba(0, 0, 0, 0.6)',
      },
    };
  }, [form, isDark]);

  // Handle form submission - uses NetPad's standard form submission endpoint
  const handleFormSubmit = async (data: Record<string, unknown>) => {
    setError(null);
    try {
      const response = await fetch(
        `/api/forms/${COLLABORATOR_FORM_SLUG}/submit`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data }),
        }
      );

      const result = await response.json();

      if (result.success) {
        setSuccess(true);
      } else {
        throw new Error(
          result.error || 'Something went wrong. Please try again.'
        );
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Network error. Please try again.';
      setError(message);
      throw err;
    }
  };

  // Handle conversational form completion
  const handleConversationalComplete = useCallback(
    async (conversationState: ConversationState) => {
      setError(null);
      try {
        // Extract data from the conversation
        const extractedData = conversationState.partialExtractions;

        // Build conversational data based on capture options
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

        // Calculate duration if we have timestamps
        if (conversationState.startedAt) {
          const startTime = new Date(conversationState.startedAt).getTime();
          const endTime = conversationState.completedAt
            ? new Date(conversationState.completedAt).getTime()
            : Date.now();
          conversationalData.durationSeconds = Math.round((endTime - startTime) / 1000);
          conversationalData.startedAt = conversationState.startedAt;
          conversationalData.completedAt = conversationState.completedAt || new Date();
        }

        // Submit via the standard form submission endpoint
        const response = await fetch(
          `/api/forms/${COLLABORATOR_FORM_SLUG}/submit`,
          {
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
              // Include conversational data for transcript storage
              conversationalData,
            }),
          }
        );

        const result = await response.json();

        if (result.success) {
          setSuccess(true);
        } else {
          throw new Error(
            result.error || 'Something went wrong. Please try again.'
          );
        }
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Network error. Please try again.';
        setError(message);
      }
    },
    []
  );

  // Scroll to form section
  const scrollToForm = () => {
    document
      .getElementById('form-section')
      ?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToOpportunity = () => {
    document
      .getElementById('opportunity-section')
      ?.scrollIntoView({ behavior: 'smooth' });
  };

  // Theme-aware colors
  const bgColor = isDark ? '#001E2B' : '#f5f7fa';
  const textColor = isDark ? '#fff' : '#1a1a2e';
  const textSecondary = isDark ? alpha('#fff', 0.7) : alpha('#000', 0.6);
  const textMuted = isDark ? alpha('#fff', 0.5) : alpha('#000', 0.4);
  const borderColor = isDark ? alpha('#fff', 0.1) : alpha('#000', 0.1);
  const paperBg = isDark ? alpha('#fff', 0.03) : '#ffffff';

  return (
    <Box
      sx={{
        minHeight: '60vh',
        bgcolor: bgColor,
      }}
    >
      {/* Back to home */}
      <Box
        sx={{
          position: 'fixed',
          top: 16,
          left: 16,
          zIndex: 100,
        }}
      >
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
          minHeight: '40vh',
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
          {/* Collaborator logo */}
          <Box sx={{ mb: 2 }}>
            <Image
              src="/netpad-collaborater-color.png"
              alt="NetPad Collaborator"
              width={200}
              height={200}
              priority
              style={{
                filter: isDark ? 'none' : 'invert(1)',
                opacity: isDark ? 1 : 0.9,
              }}
            />
          </Box>

          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: '2.5rem', md: '5.5rem' },
              fontWeight: 800,
              color: textColor,
              mb: 3,
              lineHeight: 1.1,
            }}
          >
            Build NetPad With Me
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
            I&apos;m looking for 1-2 people who want to shape what a
            MongoDB-native development platform becomes.
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
                '&:hover': {
                  bgcolor: '#00FF6A',
                },
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
              What is NetPad?
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Section 2: The Opportunity */}
      <Box
        id="opportunity-section"
        sx={{
          py: { xs: 10, md: 14 },
          px: 2,
        }}
      >
        <Container maxWidth="md">
          <Typography
            variant="h3"
            sx={{
              fontWeight: 700,
              color: textColor,
              mb: 5,
              textAlign: 'center',
            }}
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
            <Typography
              sx={{ color: textSecondary, fontSize: '1.1rem', lineHeight: 1.8, mb: 4 }}
            >
              <strong style={{ color: textColor }}>What NetPad is:</strong> A
              platform that lets you build forms that write directly to MongoDB,
              workflows that automate what happens next, and a data layer that
              makes it all queryable. Think of it as the missing piece between
              &quot;I need to collect some data&quot; and &quot;I need a full application.&quot;
            </Typography>

            <Typography
              sx={{ color: textSecondary, fontSize: '1.1rem', lineHeight: 1.8, mb: 4 }}
            >
              <strong style={{ color: textColor }}>Where it&apos;s at:</strong> The
              core form builder is solid. Templates are working. The workflow
              engine exists but needs love. What&apos;s working: people understand
              the value proposition immediately. What&apos;s missing: the polish,
              the integrations, and the second pair of eyes that makes good
              products great.
            </Typography>

            <Typography
              sx={{ color: textSecondary, fontSize: '1.1rem', lineHeight: 1.8, mb: 4 }}
            >
              <strong style={{ color: textColor }}>Why now:</strong> I&apos;ve been
              building this solo, and I&apos;ve hit the point where the product
              needs more than one perspective. I&apos;m not looking for someone to
              execute a spec—I&apos;m looking for someone who wants to shape what
              this becomes.
            </Typography>

            <Typography
              sx={{ color: textSecondary, fontSize: '1.1rem', lineHeight: 1.8 }}
            >
              <strong style={{ color: textColor }}>What this isn&apos;t:</strong> This
              isn&apos;t a job posting. I&apos;m not looking for contractors to execute
              tasks. I&apos;m looking for a collaborator—someone who sees something
              in this idea and wants to help build it.
            </Typography>
          </Paper>
        </Container>
      </Box>

      {/* Section 3: What I'm Looking For */}
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
            sx={{
              fontWeight: 700,
              color: textColor,
              mb: 2,
              textAlign: 'center',
            }}
          >
            What I&apos;m Looking For
          </Typography>
          <Typography
            sx={{
              color: textSecondary,
              textAlign: 'center',
              mb: 6,
              maxWidth: 600,
              mx: 'auto',
            }}
          >
            Three lanes, each representing a different way to contribute. Pick
            the one that resonates, or tell me you&apos;re not sure yet.
          </Typography>

          <Grid container spacing={3}>
            {lanes.map((lane) => {
              const Icon = lane.icon;
              return (
                <Grid item xs={12} md={4} key={lane.id}>
                  <SpotlightCard
                    spotlightColor={hexToRgb(lane.color)}
                    hoverBorderColor={alpha(lane.color, 0.5)}
                    sx={{
                      height: '100%',
                      p: 0,
                      bgcolor: paperBg,
                    }}
                  >
                    <Box sx={{ p: 3 }}>
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

                      <Typography
                        variant="h6"
                        sx={{ fontWeight: 700, color: textColor, mb: 2 }}
                      >
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
                          letterSpacing: 0.5,
                        }}
                      >
                        You might be a fit if:
                      </Typography>
                      <Box component="ul" sx={{ pl: 2, mb: 3, mt: 0 }}>
                        {lane.youMightBeFitIf.map((item, i) => (
                          <Typography
                            component="li"
                            key={i}
                            sx={{
                              color: textSecondary,
                              fontSize: '0.9rem',
                              mb: 0.5,
                              lineHeight: 1.5,
                            }}
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
                          letterSpacing: 0.5,
                        }}
                      >
                        What you&apos;d work on:
                      </Typography>
                      <Box component="ul" sx={{ pl: 2, mb: 3, mt: 0 }}>
                        {lane.whatYoudWorkOn.map((item, i) => (
                          <Typography
                            component="li"
                            key={i}
                            sx={{
                              color: textSecondary,
                              fontSize: '0.9rem',
                              mb: 0.5,
                              lineHeight: 1.5,
                            }}
                          >
                            {item}
                          </Typography>
                        ))}
                      </Box>

                      <Typography
                        sx={{
                          color: textMuted,
                          fontSize: '0.85rem',
                          fontStyle: 'italic',
                        }}
                      >
                        {lane.time}
                      </Typography>
                    </Box>
                  </SpotlightCard>
                </Grid>
              );
            })}
          </Grid>
        </Container>
      </Box>

      {/* Section 4: How It Works */}
      <Box
        sx={{
          py: { xs: 10, md: 14 },
          px: 2,
        }}
      >
        <Container maxWidth="md">
          <Typography
            variant="h3"
            sx={{
              fontWeight: 700,
              color: textColor,
              mb: 5,
              textAlign: 'center',
            }}
          >
            How It Works
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 3, md: 4 },
                bgcolor: paperBg,
                border: '1px solid',
                borderColor: borderColor,
                borderRadius: 2,
              }}
            >
              <Typography
                variant="h6"
                sx={{ fontWeight: 700, color: textColor, mb: 2 }}
              >
                The trial period
              </Typography>
              <Typography sx={{ color: textSecondary, lineHeight: 1.7 }}>
                I&apos;m not asking for a commitment upfront. Let&apos;s work together on
                something small—a 2-4 week project—and see if we click. If it
                works, we&apos;ll figure out what a longer-term partnership looks
                like.
              </Typography>
            </Paper>

            <Paper
              elevation={0}
              sx={{
                p: { xs: 3, md: 4 },
                bgcolor: paperBg,
                border: '1px solid',
                borderColor: borderColor,
                borderRadius: 2,
              }}
            >
              <Typography
                variant="h6"
                sx={{ fontWeight: 700, color: textColor, mb: 2 }}
              >
                On compensation
              </Typography>
              <Typography sx={{ color: textSecondary, lineHeight: 1.7 }}>
                I&apos;m bootstrapping NetPad, so I can&apos;t offer market-rate salaries.
                What I can offer: meaningful equity for a long-term partner,
                paid project work if that&apos;s your preference, or simply the
                chance to build something real with high autonomy. Let&apos;s talk
                about what makes sense for you.
              </Typography>
            </Paper>

            <Paper
              elevation={0}
              sx={{
                p: { xs: 3, md: 4 },
                bgcolor: paperBg,
                border: '1px solid',
                borderColor: borderColor,
                borderRadius: 2,
              }}
            >
              <Typography
                variant="h6"
                sx={{ fontWeight: 700, color: textColor, mb: 2 }}
              >
                What happens after you submit
              </Typography>
              <Typography sx={{ color: textSecondary, lineHeight: 1.7 }}>
                I read every submission personally. If there&apos;s a fit, I&apos;ll reply
                within a few days to set up a call. If I don&apos;t think it&apos;s the
                right match, I&apos;ll let you know—no ghosting.
              </Typography>
            </Paper>
          </Box>
        </Container>
      </Box>

      {/* Section 5: The Form */}
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
            sx={{
              fontWeight: 700,
              color: textColor,
              mb: 2,
              textAlign: 'center',
            }}
          >
            Tell Me About Yourself
          </Typography>
          <Typography
            sx={{
              color: textSecondary,
              textAlign: 'center',
              mb: 3,
            }}
          >
            This form is built with NetPad—dogfooding at its finest.
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
                    '&:hover': {
                      bgcolor: alpha('#00ED64', 0.2),
                    },
                  },
                  '&:hover': {
                    bgcolor: isDark ? alpha('#fff', 0.05) : alpha('#000', 0.05),
                  },
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
                    sx={{
                      mb: 3,
                      bgcolor: alpha('#f44336', 0.1),
                      color: '#f44336',
                    }}
                  >
                    {error}
                  </Alert>
                </Collapse>

                {/* Conversational Mode */}
                {mode === 'conversational' && (
                  <Box sx={{ minHeight: 400 }}>
                    <Suspense
                      fallback={
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'center',
                            py: 8,
                          }}
                        >
                          <CircularProgress sx={{ color: '#00ED64' }} />
                        </Box>
                      }
                    >
                      <ConversationalFormChat
                        formId="collaborator-intake"
                        config={collaboratorConversationalConfig}
                        onComplete={handleConversationalComplete}
                        endpoint="/api/demo/conversational-stream"
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
                  <>
                    {formLoading ? (
                      <Box
                        sx={{ display: 'flex', justifyContent: 'center', py: 8 }}
                      >
                        <CircularProgress sx={{ color: '#00ED64' }} />
                      </Box>
                    ) : formError ? (
                      <Alert severity="error" sx={{ mb: 2 }}>
                        {formError}
                      </Alert>
                    ) : themedFormConfig ? (
                      <Suspense
                        fallback={
                          <Box
                            sx={{
                              display: 'flex',
                              justifyContent: 'center',
                              py: 8,
                            }}
                          >
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

                <Typography
                  variant="h5"
                  sx={{ fontWeight: 700, color: textColor, mb: 2 }}
                >
                  Thanks for reaching out!
                </Typography>

                <Typography sx={{ color: textSecondary, mb: 4 }}>
                  I&apos;ll be in touch within a few days if I think there&apos;s a fit.
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
                    '&:hover': {
                      borderColor: '#00FF6A',
                      bgcolor: alpha('#00ED64', 0.1),
                    },
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
      <Box
        sx={{
          py: 4,
          px: 2,
          borderTop: '1px solid',
          borderColor: borderColor,
        }}
      >
        <Container maxWidth="md">
          <Typography
            sx={{
              color: textMuted,
              textAlign: 'center',
              fontSize: '0.875rem',
            }}
          >
            NetPad — Forms that write to MongoDB, workflows that automate what
            happens next.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}

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
