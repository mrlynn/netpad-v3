'use client';

import { Box, Typography, Button, Container, Grid, Paper, alpha, Chip } from '@mui/material';
import {
  ArrowForward,
  GitHub,
  Storage,
  Rule,
  Link as LinkIcon,
  Functions,
  Webhook,
  AutoAwesome,
  CloudQueue,
  Security,
  DataObject,
  ImportExport,
  Person,
  Groups,
  Lock,
  Fingerprint,
  Tune,
  Code,
  AccountTree,
  PlayArrow,
  Schedule,
  Description,
  Search,
  TableChart,
} from '@mui/icons-material';
import Link from 'next/link';
import Image from 'next/image';

// The three pillars of NetPad
const pillars = [
  {
    id: 'forms',
    icon: <Description sx={{ fontSize: 40 }} />,
    title: 'Collect',
    subtitle: 'Forms',
    description: 'Build beautiful, MongoDB-connected forms with 30+ field types, validation, and conditional logic.',
    href: '/builder',
    cta: 'Build a Form',
    color: '#00ED64',
  },
  {
    id: 'workflows',
    icon: <AccountTree sx={{ fontSize: 40 }} />,
    title: 'Automate',
    subtitle: 'Workflows',
    description: 'Create visual automation flows triggered by form submissions, schedules, or database events.',
    href: '/workflows',
    cta: 'Create Workflow',
    color: '#9C27B0',
  },
  {
    id: 'data',
    icon: <Storage sx={{ fontSize: 40 }} />,
    title: 'Explore',
    subtitle: 'Data',
    description: 'Browse, search, and manage your MongoDB collections with a powerful visual data explorer.',
    href: '/data',
    cta: 'Explore Data',
    color: '#2196F3',
  },
];

const heroStats = [
  { value: '30+', label: 'Field Types' },
  { value: '100+', label: 'API Endpoints' },
  { value: 'Free', label: 'MongoDB Atlas' },
];

// Forms features
const formFeatures = [
  {
    icon: <Storage sx={{ fontSize: 28 }} />,
    title: 'Schema Import',
    description: 'Auto-generate forms from your MongoDB collection schema.',
  },
  {
    icon: <Rule sx={{ fontSize: 28 }} />,
    title: 'Conditional Logic',
    description: 'Show or hide fields based on user input dynamically.',
  },
  {
    icon: <LinkIcon sx={{ fontSize: 28 }} />,
    title: 'Lookup Fields',
    description: 'Reference data from other collections with autocomplete.',
  },
  {
    icon: <Functions sx={{ fontSize: 28 }} />,
    title: 'Computed Fields',
    description: 'Formula-based calculations that update in real-time.',
  },
];

// Data Explorer features
const dataFeatures = [
  {
    icon: <Search sx={{ fontSize: 28 }} />,
    title: 'Visual Search',
    description: 'Find documents instantly with full-text and field-specific search.',
  },
  {
    icon: <TableChart sx={{ fontSize: 28 }} />,
    title: 'Multiple Views',
    description: 'Switch between table, card, and JSON views for your data.',
  },
  {
    icon: <DataObject sx={{ fontSize: 28 }} />,
    title: 'Document Editor',
    description: 'Edit documents directly with a schema-aware visual editor.',
  },
  {
    icon: <ImportExport sx={{ fontSize: 28 }} />,
    title: 'Import & Export',
    description: 'Bulk import data or export to JSON and CSV formats.',
  },
];

const platformFeatures = [
  {
    icon: <CloudQueue sx={{ fontSize: 28 }} />,
    title: 'Auto-Provisioned Database',
    description: 'Get a free MongoDB Atlas M0 cluster automatically when you sign up. Zero configuration required.',
  },
  {
    icon: <Security sx={{ fontSize: 28 }} />,
    title: 'Field-Level Encryption',
    description: 'Protect sensitive data with MongoDB Queryable Encryption. Your data stays secure.',
  },
  {
    icon: <ImportExport sx={{ fontSize: 28 }} />,
    title: 'Data Portability',
    description: 'Export your data anytime as JSON or CSV. Take ownership and transfer to your own cluster.',
  },
  {
    icon: <Groups sx={{ fontSize: 28 }} />,
    title: 'Organization Management',
    description: 'Create organizations, invite team members, and manage permissions.',
  },
];

const aiFeatures = [
  { icon: <AutoAwesome />, title: 'AI Form Generation', description: 'Describe what you need, get a complete form' },
  { icon: <Tune />, title: 'Smart Validation', description: 'Auto-suggest validation rules for your fields' },
  { icon: <Rule />, title: 'Logic Builder', description: 'AI-assisted conditional logic configuration' },
  { icon: <Functions />, title: 'Formula Helper', description: 'Generate and explain calculated field formulas' },
];

const workflowFeatures = [
  {
    icon: <AccountTree sx={{ fontSize: 28 }} />,
    title: 'Visual Workflow Builder',
    description: 'Design automation flows with our drag-and-drop canvas. No coding required.',
  },
  {
    icon: <PlayArrow sx={{ fontSize: 28 }} />,
    title: 'MongoDB Triggers',
    description: 'React to database events like inserts, updates, and deletes automatically.',
  },
  {
    icon: <Schedule sx={{ fontSize: 28 }} />,
    title: 'Scheduled Jobs',
    description: 'Run workflows on a schedule with cron expressions. Perfect for reports and maintenance.',
  },
  {
    icon: <Webhook sx={{ fontSize: 28 }} />,
    title: 'Data Transformations',
    description: 'Transform, filter, and route data between collections and external services.',
  },
];

const securityFeatures = [
  { icon: <Lock />, title: 'Encrypted Vault', description: 'Connection strings encrypted at rest' },
  { icon: <Fingerprint />, title: 'Passkey Login', description: 'WebAuthn/FIDO2 biometric authentication' },
  { icon: <Security />, title: 'Bot Protection', description: 'Turnstile CAPTCHA integration' },
  { icon: <Person />, title: 'Access Control', description: 'Role-based permissions per form' },
];

export default function LandingPage() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#001E2B' }}>
      {/* Hero Section */}
      <Box
        sx={{
          pt: { xs: 6, md: 8 },
          pb: { xs: 6, md: 8 },
          background: 'radial-gradient(ellipse at top, rgba(0, 237, 100, 0.15) 0%, transparent 60%)'
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            {/* Logo */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                mb: 2,
              }}
            >
              <Image
                src="/logo-250x250-trans.png"
                alt="NetPad"
                width={100}
                height={100}
                priority
                style={{
                  filter: 'drop-shadow(0 8px 24px rgba(0, 237, 100, 0.2))',
                }}
              />
            </Box>

            {/* Brand Name */}
            <Typography
              variant="h2"
              sx={{
                fontSize: { xs: '1.75rem', md: '2rem' },
                fontWeight: 800,
                background: 'linear-gradient(135deg, #00ED64 0%, #4DFF9F 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 1,
                letterSpacing: '-0.02em',
              }}
            >
              NetPad
            </Typography>

            <Chip
              label="Open Source"
              icon={<GitHub sx={{ fontSize: 14 }} />}
              size="small"
              sx={{
                mb: 2,
                bgcolor: alpha('#00ED64', 0.1),
                color: '#00ED64',
                fontWeight: 600,
                '& .MuiChip-icon': { color: '#00ED64' }
              }}
            />

            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: '1.75rem', md: '2.5rem', lg: '3rem' },
                fontWeight: 700,
                color: '#fff',
                mb: 2,
                lineHeight: 1.2
              }}
            >
              The Complete MongoDB
              <Box
                component="span"
                sx={{
                  display: 'block',
                  background: 'linear-gradient(135deg, #00ED64 0%, #4DFF9F 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}
              >
                Data Platform
              </Box>
            </Typography>
            <Typography
              variant="h5"
              sx={{
                color: alpha('#fff', 0.7),
                maxWidth: 700,
                mx: 'auto',
                mb: 3,
                fontWeight: 400,
                lineHeight: 1.6,
                fontSize: { xs: '0.95rem', md: '1.1rem' }
              }}
            >
              Collect data with forms. Automate with workflows. Explore with a visual data browser.
              All connected to MongoDB. No code required.
            </Typography>
          </Box>

          {/* Three Pillars - The Core Value Proposition */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {pillars.map((pillar, index) => (
              <Grid item xs={12} md={4} key={pillar.id}>
                <Paper
                  component={Link}
                  href={pillar.href}
                  elevation={0}
                  sx={{
                    p: 3,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    textDecoration: 'none',
                    bgcolor: alpha('#fff', 0.03),
                    border: '1px solid',
                    borderColor: alpha('#fff', 0.1),
                    borderRadius: 3,
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    overflow: 'hidden',
                    '&:hover': {
                      bgcolor: alpha(pillar.color, 0.08),
                      borderColor: alpha(pillar.color, 0.4),
                      transform: 'translateY(-4px)',
                      '& .pillar-icon': {
                        transform: 'scale(1.1)',
                      }
                    }
                  }}
                >
                  {/* Step indicator */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 12,
                      left: 12,
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      bgcolor: alpha(pillar.color, 0.2),
                      color: pillar.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                  >
                    {index + 1}
                  </Box>

                  <Box
                    className="pillar-icon"
                    sx={{
                      width: 72,
                      height: 72,
                      borderRadius: 3,
                      bgcolor: alpha(pillar.color, 0.1),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: pillar.color,
                      mb: 2,
                      transition: 'transform 0.3s ease',
                    }}
                  >
                    {pillar.icon}
                  </Box>

                  <Typography
                    variant="overline"
                    sx={{
                      color: pillar.color,
                      fontWeight: 700,
                      letterSpacing: 1.5,
                      mb: 0.5,
                    }}
                  >
                    {pillar.title}
                  </Typography>

                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 700,
                      color: '#fff',
                      mb: 1,
                    }}
                  >
                    {pillar.subtitle}
                  </Typography>

                  <Typography
                    variant="body2"
                    sx={{
                      color: alpha('#fff', 0.6),
                      lineHeight: 1.6,
                      mb: 2,
                      flex: 1,
                    }}
                  >
                    {pillar.description}
                  </Typography>

                  <Button
                    variant="outlined"
                    size="small"
                    sx={{
                      borderColor: alpha(pillar.color, 0.5),
                      color: pillar.color,
                      textTransform: 'none',
                      fontWeight: 600,
                      '&:hover': {
                        borderColor: pillar.color,
                        bgcolor: alpha(pillar.color, 0.1),
                      }
                    }}
                  >
                    {pillar.cta}
                  </Button>
                </Paper>
              </Grid>
            ))}
          </Grid>

          {/* Flow arrow indicators on desktop */}
          <Box
            sx={{
              display: { xs: 'none', md: 'flex' },
              justifyContent: 'center',
              gap: 2,
              mb: 3,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#00ED64' }} />
              <ArrowForward sx={{ color: alpha('#fff', 0.3), fontSize: 16 }} />
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#9C27B0' }} />
              <ArrowForward sx={{ color: alpha('#fff', 0.3), fontSize: 16 }} />
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#2196F3' }} />
            </Box>
          </Box>

          {/* Hero Stats */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              gap: { xs: 3, md: 5 },
              flexWrap: 'wrap',
            }}
          >
            {heroStats.map((stat, index) => (
              <Box key={index} sx={{ textAlign: 'center' }}>
                <Typography
                  sx={{
                    fontSize: { xs: '1.5rem', md: '1.75rem' },
                    fontWeight: 700,
                    color: '#00ED64',
                  }}
                >
                  {stat.value}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: alpha('#fff', 0.5), fontWeight: 500, fontSize: '0.8rem' }}
                >
                  {stat.label}
                </Typography>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* Forms Section */}
      <Box sx={{ py: { xs: 6, md: 8 }, bgcolor: alpha('#000', 0.2) }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={5}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 1.5,
                    bgcolor: alpha('#00ED64', 0.1),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#00ED64',
                  }}
                >
                  <Description />
                </Box>
                <Typography variant="overline" sx={{ color: '#00ED64', fontWeight: 700, letterSpacing: 1.5 }}>
                  Collect
                </Typography>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 700, color: '#fff', mb: 2, fontSize: { xs: '1.75rem', md: '2.25rem' } }}>
                Build Forms That
                <br />Connect to MongoDB
              </Typography>
              <Typography variant="body1" sx={{ color: alpha('#fff', 0.6), mb: 3, lineHeight: 1.8 }}>
                Create professional data collection forms with 30+ field types, validation,
                conditional logic, and computed fields. Data flows directly to your MongoDB collections.
              </Typography>
              <Button
                component={Link}
                href="/builder"
                variant="contained"
                startIcon={<Description />}
                sx={{
                  background: 'linear-gradient(135deg, #00ED64 0%, #00CC55 100%)',
                  color: '#001E2B',
                  textTransform: 'none',
                  fontWeight: 600,
                  '&:hover': {
                    background: 'linear-gradient(135deg, #00FF6A 0%, #00ED64 100%)',
                  }
                }}
              >
                Start Building
              </Button>
            </Grid>
            <Grid item xs={12} md={7}>
              <Grid container spacing={2}>
                {formFeatures.map((feature, index) => (
                  <Grid item xs={12} sm={6} key={index}>
                    <Box
                      sx={{
                        p: 2.5,
                        borderRadius: 2,
                        bgcolor: alpha('#fff', 0.03),
                        border: '1px solid',
                        borderColor: alpha('#fff', 0.1),
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          bgcolor: alpha('#00ED64', 0.05),
                          borderColor: alpha('#00ED64', 0.3),
                        }
                      }}
                    >
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: 1.5,
                          bgcolor: alpha('#00ED64', 0.1),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#00ED64',
                          mb: 1.5
                        }}
                      >
                        {feature.icon}
                      </Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#fff', mb: 0.5 }}>
                        {feature.title}
                      </Typography>
                      <Typography variant="caption" sx={{ color: alpha('#fff', 0.5), lineHeight: 1.5 }}>
                        {feature.description}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Workflows Section */}
      <Box sx={{ py: { xs: 6, md: 8 } }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={7} sx={{ order: { xs: 2, md: 1 } }}>
              <Grid container spacing={2}>
                {workflowFeatures.map((feature, index) => (
                  <Grid item xs={12} sm={6} key={index}>
                    <Box
                      sx={{
                        p: 2.5,
                        borderRadius: 2,
                        bgcolor: alpha('#fff', 0.03),
                        border: '1px solid',
                        borderColor: alpha('#fff', 0.1),
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          bgcolor: alpha('#9C27B0', 0.05),
                          borderColor: alpha('#9C27B0', 0.3),
                        }
                      }}
                    >
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: 1.5,
                          bgcolor: alpha('#9C27B0', 0.1),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#9C27B0',
                          mb: 1.5
                        }}
                      >
                        {feature.icon}
                      </Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#fff', mb: 0.5 }}>
                        {feature.title}
                      </Typography>
                      <Typography variant="caption" sx={{ color: alpha('#fff', 0.5), lineHeight: 1.5 }}>
                        {feature.description}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Grid>
            <Grid item xs={12} md={5} sx={{ order: { xs: 1, md: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 1.5,
                    bgcolor: alpha('#9C27B0', 0.1),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#9C27B0',
                  }}
                >
                  <AccountTree />
                </Box>
                <Typography variant="overline" sx={{ color: '#9C27B0', fontWeight: 700, letterSpacing: 1.5 }}>
                  Automate
                </Typography>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 700, color: '#fff', mb: 2, fontSize: { xs: '1.75rem', md: '2.25rem' } }}>
                Visual Workflow
                <br />Automation
              </Typography>
              <Typography variant="body1" sx={{ color: alpha('#fff', 0.6), mb: 3, lineHeight: 1.8 }}>
                Build powerful automations with a drag-and-drop canvas. Trigger workflows from
                form submissions, schedules, or database events. AI-assisted workflow generation included.
              </Typography>
              <Button
                component={Link}
                href="/workflows"
                variant="contained"
                startIcon={<AccountTree />}
                sx={{
                  background: 'linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%)',
                  color: '#fff',
                  textTransform: 'none',
                  fontWeight: 600,
                  '&:hover': {
                    background: 'linear-gradient(135deg, #AB47BC 0%, #9C27B0 100%)',
                  }
                }}
              >
                Create Workflow
              </Button>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Data Explorer Section */}
      <Box sx={{ py: { xs: 6, md: 8 }, bgcolor: alpha('#000', 0.2) }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={5}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 1.5,
                    bgcolor: alpha('#2196F3', 0.1),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#2196F3',
                  }}
                >
                  <Storage />
                </Box>
                <Typography variant="overline" sx={{ color: '#2196F3', fontWeight: 700, letterSpacing: 1.5 }}>
                  Explore
                </Typography>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 700, color: '#fff', mb: 2, fontSize: { xs: '1.75rem', md: '2.25rem' } }}>
                Visual Data
                <br />Browser
              </Typography>
              <Typography variant="body1" sx={{ color: alpha('#fff', 0.6), mb: 3, lineHeight: 1.8 }}>
                Browse, search, and manage your MongoDB collections without writing queries.
                View data as tables, cards, or raw JSON. Edit documents with a schema-aware editor.
              </Typography>
              <Button
                component={Link}
                href="/data"
                variant="contained"
                startIcon={<Storage />}
                sx={{
                  background: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)',
                  color: '#fff',
                  textTransform: 'none',
                  fontWeight: 600,
                  '&:hover': {
                    background: 'linear-gradient(135deg, #42A5F5 0%, #2196F3 100%)',
                  }
                }}
              >
                Explore Data
              </Button>
            </Grid>
            <Grid item xs={12} md={7}>
              <Grid container spacing={2}>
                {dataFeatures.map((feature, index) => (
                  <Grid item xs={12} sm={6} key={index}>
                    <Box
                      sx={{
                        p: 2.5,
                        borderRadius: 2,
                        bgcolor: alpha('#fff', 0.03),
                        border: '1px solid',
                        borderColor: alpha('#fff', 0.1),
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          bgcolor: alpha('#2196F3', 0.05),
                          borderColor: alpha('#2196F3', 0.3),
                        }
                      }}
                    >
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: 1.5,
                          bgcolor: alpha('#2196F3', 0.1),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#2196F3',
                          mb: 1.5
                        }}
                      >
                        {feature.icon}
                      </Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#fff', mb: 0.5 }}>
                        {feature.title}
                      </Typography>
                      <Typography variant="caption" sx={{ color: alpha('#fff', 0.5), lineHeight: 1.5 }}>
                        {feature.description}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* AI Features Section - Applies to all pillars */}
      <Box sx={{ py: { xs: 6, md: 8 } }}>
        <Container maxWidth="md">
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Chip
              label="AI-Powered"
              icon={<AutoAwesome sx={{ fontSize: 14 }} />}
              size="small"
              sx={{
                mb: 2,
                bgcolor: alpha('#E91E63', 0.1),
                color: '#E91E63',
                fontWeight: 600,
                '& .MuiChip-icon': { color: '#E91E63' }
              }}
            />
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#fff', mb: 1.5 }}>
              AI Assistance Everywhere
            </Typography>
            <Typography variant="body1" sx={{ color: alpha('#fff', 0.6), maxWidth: 500, mx: 'auto' }}>
              Generate forms and workflows from natural language. AI helps you build faster.
            </Typography>
          </Box>
          <Grid container spacing={2} justifyContent="center">
            {aiFeatures.map((feature, index) => (
              <Grid item xs={6} sm={3} key={index}>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      bgcolor: alpha('#E91E63', 0.1),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#E91E63',
                      mx: 'auto',
                      mb: 1.5
                    }}
                  >
                    {feature.icon}
                  </Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#fff', mb: 0.5 }}>
                    {feature.title}
                  </Typography>
                  <Typography variant="caption" sx={{ color: alpha('#fff', 0.5) }}>
                    {feature.description}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Platform & Security Section - Combined */}
      <Box sx={{ py: { xs: 6, md: 8 }, bgcolor: alpha('#000', 0.2) }}>
        <Container maxWidth="lg">
          <Typography
            variant="h4"
            sx={{
              textAlign: 'center',
              fontWeight: 700,
              color: '#fff',
              mb: 1.5
            }}
          >
            Enterprise-Ready Platform
          </Typography>
          <Typography
            variant="body1"
            sx={{
              textAlign: 'center',
              color: alpha('#fff', 0.6),
              mb: 4,
              maxWidth: 500,
              mx: 'auto'
            }}
          >
            Built on MongoDB Atlas with complete data ownership, security, and portability.
          </Typography>

          <Grid container spacing={2}>
            {[...platformFeatures, ...securityFeatures].map((feature, index) => (
              <Grid item xs={6} sm={4} md={3} key={index}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1.5,
                    p: 1.5,
                  }}
                >
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 1.5,
                      bgcolor: alpha('#00ED64', 0.1),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#00ED64',
                      flexShrink: 0
                    }}
                  >
                    {feature.icon}
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#fff', mb: 0.25, fontSize: '0.85rem' }}>
                      {feature.title}
                    </Typography>
                    <Typography variant="caption" sx={{ color: alpha('#fff', 0.5), lineHeight: 1.4, fontSize: '0.7rem' }}>
                      {feature.description}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Developer Section */}
      <Box sx={{ py: { xs: 5, md: 6 } }}>
        <Container maxWidth="md">
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#fff', mb: 1 }}>
              Built for Developers
            </Typography>
            <Typography variant="body2" sx={{ color: alpha('#fff', 0.6) }}>
              Full REST API, webhooks, and JSON export. Self-host or use our managed service.
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Chip
              icon={<Code sx={{ fontSize: 14 }} />}
              label="100+ API Endpoints"
              size="small"
              sx={{ bgcolor: alpha('#fff', 0.1), color: '#fff' }}
            />
            <Chip
              icon={<Webhook sx={{ fontSize: 14 }} />}
              label="Webhook Support"
              size="small"
              sx={{ bgcolor: alpha('#fff', 0.1), color: '#fff' }}
            />
            <Chip
              icon={<DataObject sx={{ fontSize: 14 }} />}
              label="JSON Export"
              size="small"
              sx={{ bgcolor: alpha('#fff', 0.1), color: '#fff' }}
            />
            <Chip
              icon={<GitHub sx={{ fontSize: 14 }} />}
              label="Open Source"
              size="small"
              sx={{ bgcolor: alpha('#fff', 0.1), color: '#fff' }}
            />
          </Box>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box
        sx={{
          py: { xs: 6, md: 8 },
          background: 'linear-gradient(180deg, transparent 0%, rgba(0, 237, 100, 0.05) 100%)'
        }}
      >
        <Container maxWidth="sm">
          <Paper
            elevation={0}
            sx={{
              p: { xs: 3, md: 4 },
              textAlign: 'center',
              bgcolor: alpha('#00ED64', 0.05),
              border: '1px solid',
              borderColor: alpha('#00ED64', 0.2),
              borderRadius: 3
            }}
          >
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#fff', mb: 1.5 }}>
              Ready to get started?
            </Typography>
            <Typography variant="body2" sx={{ color: alpha('#fff', 0.6), mb: 3 }}>
              Free MongoDB Atlas cluster included. No credit card required.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                component={Link}
                href="/builder"
                variant="contained"
                size="small"
                sx={{
                  px: 3,
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, #00ED64 0%, #00CC55 100%)',
                  color: '#001E2B',
                  textTransform: 'none',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #00FF6A 0%, #00ED64 100%)'
                  }
                }}
              >
                Build a Form
              </Button>
              <Button
                component={Link}
                href="/workflows"
                variant="outlined"
                size="small"
                sx={{
                  px: 3,
                  fontWeight: 600,
                  borderColor: alpha('#9C27B0', 0.5),
                  color: '#9C27B0',
                  textTransform: 'none',
                  '&:hover': {
                    borderColor: '#9C27B0',
                    bgcolor: alpha('#9C27B0', 0.1)
                  }
                }}
              >
                Create Workflow
              </Button>
              <Button
                component={Link}
                href="/data"
                variant="outlined"
                size="small"
                sx={{
                  px: 3,
                  fontWeight: 600,
                  borderColor: alpha('#2196F3', 0.5),
                  color: '#2196F3',
                  textTransform: 'none',
                  '&:hover': {
                    borderColor: '#2196F3',
                    bgcolor: alpha('#2196F3', 0.1)
                  }
                }}
              >
                Explore Data
              </Button>
            </Box>
          </Paper>
        </Container>
      </Box>

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          py: 4,
          borderTop: '1px solid',
          borderColor: alpha('#fff', 0.1)
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 2
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Image
                src="/logo-250x250-trans.png"
                alt="NetPad"
                width={24}
                height={24}
              />
              <Typography variant="body2" sx={{ color: alpha('#fff', 0.5), fontWeight: 500 }}>
                NetPad
              </Typography>
              <Typography variant="body2" sx={{ color: alpha('#fff', 0.3) }}>
                Built with MongoDB, Next.js, and Material-UI
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 3 }}>
              <Typography
                component={Link}
                href="/privacy"
                variant="body2"
                sx={{
                  color: alpha('#fff', 0.4),
                  textDecoration: 'none',
                  '&:hover': { color: '#00ED64' }
                }}
              >
                Privacy
              </Typography>
              <Typography
                component={Link}
                href="/terms"
                variant="body2"
                sx={{
                  color: alpha('#fff', 0.4),
                  textDecoration: 'none',
                  '&:hover': { color: '#00ED64' }
                }}
              >
                Terms
              </Typography>
              <Typography
                component="a"
                href="https://github.com/mrlynn/netpad-v3"
                target="_blank"
                variant="body2"
                sx={{
                  color: alpha('#fff', 0.4),
                  textDecoration: 'none',
                  '&:hover': { color: '#00ED64' }
                }}
              >
                GitHub
              </Typography>
              <Typography
                component="a"
                href="https://mongodb.com"
                target="_blank"
                variant="body2"
                sx={{
                  color: alpha('#fff', 0.4),
                  textDecoration: 'none',
                  '&:hover': { color: '#00ED64' }
                }}
              >
                MongoDB
              </Typography>
            </Box>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
