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
  Modal,
  IconButton,
  ImageList,
  ImageListItem,
  ImageListItemBar,
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
  MenuBook,
  Storefront,
  GitHub,
  Terminal,
  Widgets,
  AccountTree,
  SmartToy,
  OpenInNew,
  Close,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
} from '@mui/icons-material';
import Link from 'next/link';
import Image from 'next/image';
import { FormRenderer } from '@/components/FormRenderer/FormRenderer';
import { ConversationalFormChat } from '@/components/ConversationalForm';
import { FormConfiguration } from '@/types/form';
import { ConversationState, ConversationalFormConfig } from '@/types/conversational';
import { SpotlightCard, hexToRgb, NetPadAnnotation } from '@/components/marketing';

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

// Screenshot gallery data with descriptive titles
const screenshots = [
  {
    src: '/screenshots/NetPad-Screenshots/netpad-1.38.30-PM.jpg',
    title: 'AI Form Generator',
    description: 'Build conversational forms in seconds with AI',
  },
  {
    src: '/screenshots/NetPad-Screenshots/netpad-1.39.10-PM.jpg',
    title: 'MongoDB-Native Forms',
    description: 'Schema import, conditional logic, and computed fields',
  },
  {
    src: '/screenshots/NetPad-Screenshots/netpad-1.39.25-PM.jpg',
    title: 'Visual Workflow Automation',
    description: 'Drag-and-drop workflow builder with triggers and scheduling',
  },
  {
    src: '/screenshots/NetPad-Screenshots/netpad-1.39.31-PM.jpg',
    title: 'Visual Data Browser',
    description: 'Search, view, and edit MongoDB documents without queries',
  },
  {
    src: '/screenshots/NetPad-Screenshots/netpad-1.39.34-PM.jpg',
    title: 'Conversational Data Collection',
    description: 'AI-powered chat forms with RAG knowledge base',
  },
  {
    src: '/screenshots/NetPad-Screenshots/netpad-1.39.51-PM.jpg',
    title: '15+ AI Agents',
    description: 'Form generation, validation, compliance, and translation',
  },
  {
    src: '/screenshots/NetPad-Screenshots/netpad-1.39.58-PM.jpg',
    title: 'Template Gallery',
    description: '100+ professional form templates across 15 industries',
  },
  {
    src: '/screenshots/NetPad-Screenshots/netpad-1.40.08-PM.jpg',
    title: 'Template Marketplace',
    description: 'Browse and deploy pre-built forms in minutes',
  },
  {
    src: '/screenshots/NetPad-Screenshots/netpad-1.40.35-PM.jpg',
    title: 'Template Details',
    description: 'NPS survey with key features and use cases',
  },
  {
    src: '/screenshots/NetPad-Screenshots/netpad-1.41.12-PM.jpg',
    title: 'Application Settings',
    description: 'Configure apps with standalone export and data schema',
  },
  {
    src: '/screenshots/NetPad-Screenshots/netpad-1.42.05-PM.jpg',
    title: 'Analytics Dashboard',
    description: 'Conversation metrics, completion rates, and drop-off analysis',
  },
  {
    src: '/screenshots/NetPad-Screenshots/netpad-1.42.22-PM.jpg',
    title: 'Admin Dashboard',
    description: 'User management, waitlist, and cluster monitoring',
  },
  {
    src: '/screenshots/NetPad-Screenshots/netpad-1.42.44-PM.jpg',
    title: 'Cluster Management',
    description: 'Monitor and manage M0 MongoDB clusters',
  },
  {
    src: '/screenshots/NetPad-Screenshots/netpad-1.43.10-PM.jpg',
    title: 'Waitlist Management',
    description: 'Review and approve pending applications',
  },
  {
    src: '/screenshots/NetPad-Screenshots/netpad-1.43.36-PM.jpg',
    title: 'AI Usage Analytics',
    description: 'Token consumption, costs, and model performance',
  },
  {
    src: '/screenshots/NetPad-Screenshots/netpad-1.44.02-PM.jpg',
    title: 'Advanced AI Metrics',
    description: 'Usage trends, cost projections, and feature adoption',
  },
  {
    src: '/screenshots/NetPad-Screenshots/netpad-1.44.39-PM.jpg',
    title: 'Organization Settings',
    description: 'Team management with self-host deployment options',
  },
  {
    src: '/screenshots/NetPad-Screenshots/netpad-1.44.49-PM.jpg',
    title: 'Connection Vault',
    description: 'Secure MongoDB connections with cluster details',
  },
  {
    src: '/screenshots/NetPad-Screenshots/netpad-1.45.29-PM.jpg',
    title: 'AI Health Check',
    description: 'LLM provider configuration and connectivity status',
  },
  {
    src: '/screenshots/NetPad-Screenshots/netpad-1.47.45-PM.jpg',
    title: 'Workflow Editor',
    description: 'IT ticket routing with email and Slack notifications',
  },
  {
    src: '/screenshots/NetPad-Screenshots/netpad-1.48.19-PM.jpg',
    title: 'Workflow Canvas',
    description: 'Visual workflow with conditional branching',
  },
  {
    src: '/screenshots/NetPad-Screenshots/netpad-1.48.38-PM.jpg',
    title: 'Context Help System',
    description: 'Searchable documentation with 14+ help topics',
  },
];

function CollaborateContent() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [mode, setMode] = useState<IntakeMode>('form');
  const [form, setForm] = useState<FormConfiguration | null>(null);
  const [formLoading, setFormLoading] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Lightbox state for screenshot gallery
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const handleOpenLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const handleCloseLightbox = () => {
    setLightboxOpen(false);
  };

  const handlePrevImage = () => {
    setLightboxIndex((prev) => (prev === 0 ? screenshots.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setLightboxIndex((prev) => (prev === screenshots.length - 1 ? 0 : prev + 1));
  };

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

  // Handle conversational form completion - uses the form's conversational config
  const handleConversationalComplete = useCallback(
    async (conversationState: ConversationState) => {
      setError(null);
      try {
        // Extract data from the conversation
        const extractedData = conversationState.partialExtractions;

        // Get capture options from the form's conversational config
        const captureOptions = form?.conversationalConfig?.captureOptions;
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

          // Send email notification (fire and forget - don't block on this)
          console.log('[Collaborate] Sending notification with data:', {
            name: extractedData?.name,
            email: extractedData?.email,
            lane: extractedData?.lane,
            hasShipped: !!extractedData?.shipped,
            hasWhyNetpad: !!extractedData?.whyNetpad,
          });

          fetch('/api/collaborator/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: extractedData?.name,
              email: extractedData?.email,
              lane: extractedData?.lane,
              shipped: extractedData?.shipped,
              whyNetpad: extractedData?.whyNetpad,
              availability: extractedData?.availability,
              location: extractedData?.location,
              workLinks: extractedData?.workLinks,
              conversationId: conversationState.conversationId,
              turnCount: conversationState.turnCount,
            }),
          })
            .then(async (res) => {
              const data = await res.json();
              console.log('[Collaborate] Notification response:', data);
            })
            .catch((err) => {
              // Log but don't fail - notification is secondary
              console.error('[Collaborate] Failed to send notification:', err);
            });
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
    [form]
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
        <Container maxWidth="xl" sx={{ textAlign: 'center' }}>
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
              fontSize: { xs: '2.5rem', md: '12.5rem' },
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
        <Container maxWidth="md">
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
              <ToggleButton value="form">
                <Tooltip title="Traditional form - quick and straightforward">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ListAlt fontSize="small" />
                    Form
                  </Box>
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="conversational">
                <Tooltip title="Have a conversation with AI - more natural and interactive">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AutoAwesome fontSize="small" />
                    Chat
                  </Box>
                </Tooltip>
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Box
            sx={{
              position: 'relative',
            }}
          >
            {/* NetPad Annotation - only show on desktop */}
            <Box
              sx={{
                display: { xs: 'none', lg: 'block' }, // Show on large screens only
              }}
            >
              <NetPadAnnotation
                text="Built with NetPad"
                position="right"
                offset={{ x: -20, y: 0 }}
              />
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

                {/* Conversational Mode - uses the form's built-in conversational config */}
                {mode === 'conversational' && (
                  <Box sx={{ minHeight: 400 }}>
                    {formLoading ? (
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'center',
                          py: 8,
                        }}
                      >
                        <CircularProgress sx={{ color: '#00ED64' }} />
                      </Box>
                    ) : formError ? (
                      <Alert severity="error" sx={{ mb: 2 }}>
                        {formError}
                      </Alert>
                    ) : form?.conversationalConfig ? (
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
                          formId={form.id || COLLABORATOR_FORM_SLUG}
                          config={form.conversationalConfig as ConversationalFormConfig}
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
                    ) : (
                      <Alert severity="warning" sx={{ mb: 2 }}>
                        Conversational mode is not configured for this form.
                      </Alert>
                    )}
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
          </Box>
        </Container>
      </Box>

      {/* Section 6: Screenshot Gallery */}
      <Box
        id="gallery-section"
        sx={{
          py: { xs: 10, md: 14 },
          px: 2,
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
            See NetPad in Action
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
            Browse through the platform to see what you&apos;d be working on.
            Click any image to view it larger.
          </Typography>

          <ImageList
            variant="masonry"
            cols={3}
            gap={16}
            sx={{
              columnCount: { xs: 1, sm: 2, md: 3 },
              '& .MuiImageListItem-root': {
                overflow: 'hidden',
                borderRadius: 2,
                cursor: 'pointer',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: `0 8px 24px ${alpha('#00ED64', 0.2)}`,
                  '& .MuiImageListItemBar-root': {
                    opacity: 1,
                  },
                },
              },
            }}
          >
            {screenshots.map((screenshot, index) => (
              <ImageListItem
                key={screenshot.src}
                onClick={() => handleOpenLightbox(index)}
              >
                <Box
                  sx={{
                    position: 'relative',
                    width: '100%',
                    height: 'auto',
                    '& img': {
                      width: '100%',
                      height: 'auto',
                      display: 'block',
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: borderColor,
                    },
                  }}
                >
                  <Image
                    src={screenshot.src}
                    alt={screenshot.title}
                    width={400}
                    height={300}
                    style={{
                      width: '100%',
                      height: 'auto',
                      objectFit: 'cover',
                    }}
                    loading="lazy"
                  />
                </Box>
                <ImageListItemBar
                  title={screenshot.title}
                  subtitle={screenshot.description}
                  sx={{
                    opacity: 0,
                    transition: 'opacity 0.2s ease',
                    background: `linear-gradient(to top, ${alpha('#001E2B', 0.95)} 0%, ${alpha('#001E2B', 0.7)} 70%, transparent 100%)`,
                    '& .MuiImageListItemBar-title': {
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      color: '#00ED64',
                    },
                    '& .MuiImageListItemBar-subtitle': {
                      fontSize: '0.8rem',
                      color: 'rgba(255, 255, 255, 0.7)',
                    },
                  }}
                  actionIcon={
                    <IconButton
                      sx={{
                        color: 'rgba(255, 255, 255, 0.7)',
                        '&:hover': { color: '#00ED64' },
                      }}
                    >
                      <ZoomIn />
                    </IconButton>
                  }
                />
              </ImageListItem>
            ))}
          </ImageList>
        </Container>
      </Box>

      {/* Lightbox Modal */}
      <Modal
        open={lightboxOpen}
        onClose={handleCloseLightbox}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box
          sx={{
            position: 'relative',
            maxWidth: '90vw',
            maxHeight: '90vh',
            outline: 'none',
          }}
        >
          {/* Close button */}
          <IconButton
            onClick={handleCloseLightbox}
            sx={{
              position: 'absolute',
              top: -48,
              right: 0,
              color: '#fff',
              bgcolor: alpha('#000', 0.5),
              '&:hover': { bgcolor: alpha('#00ED64', 0.3) },
              zIndex: 10,
            }}
          >
            <Close />
          </IconButton>

          {/* Previous button */}
          <IconButton
            onClick={handlePrevImage}
            sx={{
              position: 'absolute',
              left: { xs: -16, md: -56 },
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#fff',
              bgcolor: alpha('#000', 0.5),
              '&:hover': { bgcolor: alpha('#00ED64', 0.3) },
              zIndex: 10,
            }}
          >
            <ChevronLeft fontSize="large" />
          </IconButton>

          {/* Next button */}
          <IconButton
            onClick={handleNextImage}
            sx={{
              position: 'absolute',
              right: { xs: -16, md: -56 },
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#fff',
              bgcolor: alpha('#000', 0.5),
              '&:hover': { bgcolor: alpha('#00ED64', 0.3) },
              zIndex: 10,
            }}
          >
            <ChevronRight fontSize="large" />
          </IconButton>

          {/* Image */}
          <Box
            sx={{
              position: 'relative',
              bgcolor: '#001E2B',
              borderRadius: 2,
              overflow: 'hidden',
              boxShadow: `0 24px 48px ${alpha('#000', 0.5)}`,
            }}
          >
            <Image
              src={screenshots[lightboxIndex]?.src || ''}
              alt={screenshots[lightboxIndex]?.title || ''}
              width={1200}
              height={800}
              style={{
                maxWidth: '90vw',
                maxHeight: '80vh',
                width: 'auto',
                height: 'auto',
                objectFit: 'contain',
              }}
              priority
            />

            {/* Caption */}
            <Box
              sx={{
                p: 2,
                bgcolor: alpha('#001E2B', 0.95),
                borderTop: '1px solid',
                borderColor: alpha('#00ED64', 0.2),
              }}
            >
              <Typography
                variant="h6"
                sx={{ color: '#00ED64', fontWeight: 600, mb: 0.5 }}
              >
                {screenshots[lightboxIndex]?.title}
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
              >
                {screenshots[lightboxIndex]?.description}
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: 'rgba(255, 255, 255, 0.4)', mt: 1, display: 'block' }}
              >
                {lightboxIndex + 1} of {screenshots.length}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Modal>

      {/* Section 7: Learn More Resources */}
      <Box
        sx={{
          py: { xs: 8, md: 12 },
          px: 2,
          bgcolor: isDark ? 'transparent' : alpha('#000', 0.01),
        }}
      >
        <Container maxWidth="lg">
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: textColor,
              mb: 2,
              textAlign: 'center',
            }}
          >
            Want to Learn More?
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
            Explore the NetPad ecosystem before you apply. Check out our packages,
            documentation, and marketplace.
          </Typography>

          <Grid container spacing={3}>
            {/* Documentation */}
            <Grid item xs={12} md={4}>
              <Paper
                component="a"
                href="https://docs.netpad.io"
                target="_blank"
                rel="noopener noreferrer"
                elevation={0}
                sx={{
                  p: 3,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  bgcolor: paperBg,
                  border: '1px solid',
                  borderColor: borderColor,
                  borderRadius: 2,
                  textDecoration: 'none',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: '#00ED64',
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <MenuBook sx={{ color: '#00ED64', mr: 1.5, fontSize: 28 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, color: textColor }}>
                    Documentation
                  </Typography>
                  <OpenInNew sx={{ color: textMuted, ml: 'auto', fontSize: 16 }} />
                </Box>
                <Typography sx={{ color: textSecondary, fontSize: '0.9rem', flexGrow: 1 }}>
                  Comprehensive guides, API references, and tutorials to understand
                  how NetPad works under the hood.
                </Typography>
              </Paper>
            </Grid>

            {/* Marketplace */}
            <Grid item xs={12} md={4}>
              <Paper
                component={Link}
                href="/marketplace"
                elevation={0}
                sx={{
                  p: 3,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  bgcolor: paperBg,
                  border: '1px solid',
                  borderColor: borderColor,
                  borderRadius: 2,
                  textDecoration: 'none',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: '#00ED64',
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Storefront sx={{ color: '#00ED64', mr: 1.5, fontSize: 28 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, color: textColor }}>
                    Marketplace
                  </Typography>
                </Box>
                <Typography sx={{ color: textSecondary, fontSize: '0.9rem', flexGrow: 1 }}>
                  Browse templates, forms, and workflows built by the community.
                  See what&apos;s possible with NetPad.
                </Typography>
              </Paper>
            </Grid>

            {/* GitHub */}
            <Grid item xs={12} md={4}>
              <Paper
                component="a"
                href="https://github.com/mrlynn/netpad-v3"
                target="_blank"
                rel="noopener noreferrer"
                elevation={0}
                sx={{
                  p: 3,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  bgcolor: paperBg,
                  border: '1px solid',
                  borderColor: borderColor,
                  borderRadius: 2,
                  textDecoration: 'none',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: '#00ED64',
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <GitHub sx={{ color: '#00ED64', mr: 1.5, fontSize: 28 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, color: textColor }}>
                    GitHub
                  </Typography>
                  <OpenInNew sx={{ color: textMuted, ml: 'auto', fontSize: 16 }} />
                </Box>
                <Typography sx={{ color: textSecondary, fontSize: '0.9rem', flexGrow: 1 }}>
                  NetPad is open source (MIT). Star the repo, explore the code,
                  and see how we build.
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* NPM Packages */}
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              color: textColor,
              mt: 6,
              mb: 3,
              textAlign: 'center',
            }}
          >
            NPM Packages
          </Typography>

          <Grid container spacing={2} justifyContent="center">
            {[
              {
                name: '@netpad/cli',
                description: 'Command-line interface',
                icon: Terminal,
                url: 'https://www.npmjs.com/package/@netpad/cli',
              },
              {
                name: '@netpad/forms',
                description: 'Form components',
                icon: Widgets,
                url: 'https://www.npmjs.com/package/@netpad/forms',
              },
              {
                name: '@netpad/workflows',
                description: 'Workflow engine',
                icon: AccountTree,
                url: 'https://www.npmjs.com/package/@netpad/workflows',
              },
              {
                name: '@netpad/mcp-server',
                description: 'AI model context',
                icon: SmartToy,
                url: 'https://www.npmjs.com/package/@netpad/mcp-server',
              },
            ].map((pkg) => (
              <Grid item xs={6} sm={3} key={pkg.name}>
                <Paper
                  component="a"
                  href={pkg.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  elevation={0}
                  sx={{
                    p: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    bgcolor: paperBg,
                    border: '1px solid',
                    borderColor: borderColor,
                    borderRadius: 2,
                    textDecoration: 'none',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: '#00ED64',
                      bgcolor: alpha('#00ED64', 0.05),
                    },
                  }}
                >
                  <pkg.icon sx={{ color: '#00ED64', mb: 1, fontSize: 24 }} />
                  <Typography
                    sx={{
                      fontWeight: 600,
                      color: textColor,
                      fontSize: '0.85rem',
                      fontFamily: 'monospace',
                    }}
                  >
                    {pkg.name}
                  </Typography>
                  <Typography
                    sx={{
                      color: textMuted,
                      fontSize: '0.75rem',
                      mt: 0.5,
                    }}
                  >
                    {pkg.description}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
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
