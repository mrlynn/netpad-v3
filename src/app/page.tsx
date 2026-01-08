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
  CompareArrows,
  Terminal,
  ContentCopy,
  RocketLaunch,
  School,
  Cloud,
  SmartToy,
  ChatBubble,
  FolderSpecial,
  Speed as SpeedIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { AppNavBar } from '@/components/Navigation/AppNavBar';
import { DeployToVercelButton } from '@/components/Deploy';
import { netpadColors } from '@/theme/theme';
import { SpotlightCard, hexToRgb } from '@/components/marketing';

// The four pillars of NetPad
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
  {
    id: 'ai',
    icon: <ChatBubble sx={{ fontSize: 40 }} />,
    title: 'Engage',
    subtitle: 'AI & Conversational',
    description: 'Collect data through natural language conversations. AI-powered forms that feel like chatting with a helpful assistant.',
    href: '/builder',
    cta: 'Try Conversational',
    color: '#E91E63',
  },
];

const heroStats = [
  { value: '30+', label: 'Field Types' },
  { value: '160+', label: 'API Endpoints' },
  { value: '12+', label: 'AI Agents' },
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
    icon: <FolderSpecial sx={{ fontSize: 28 }} />,
    title: 'Projects & Environments',
    description: 'Organize work by environment (dev, staging, prod) or initiative. Project-level analytics and exports.',
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
  {
    icon: <RocketLaunch sx={{ fontSize: 28 }} />,
    title: 'One-Click Deployment',
    description: 'Deploy your own instance to Vercel with auto-provisioned database. From database to production in minutes.',
  },
];

// AI Features organized by category
const aiFeaturesByCategory = [
  {
    category: 'Form Building',
    color: '#E91E63',
    features: [
      { icon: <AutoAwesome />, title: 'AI Form Generation', description: 'Describe what you need, get a complete form' },
      { icon: <Tune />, title: 'Smart Validation', description: 'Auto-suggest validation rules for your fields' },
      { icon: <Rule />, title: 'Logic Builder', description: 'AI-assisted conditional logic configuration' },
      { icon: <Functions />, title: 'Formula Helper', description: 'Generate and explain calculated field formulas' },
    ],
  },
  {
    category: 'Optimization & Insights',
    color: '#9C27B0',
    features: [
      { icon: <SpeedIcon />, title: 'Form Optimization', description: 'Analyze and improve form performance' },
      { icon: <DataObject />, title: 'Response Insights', description: 'Analyze submission patterns and trends' },
      { icon: <Tune />, title: 'Response Processing', description: 'Process and transform responses automatically' },
    ],
  },
  {
    category: 'Compliance & Translation',
    color: '#2196F3',
    features: [
      { icon: <Security />, title: 'Compliance Audit', description: 'Check for regulatory compliance (HIPAA, GDPR)' },
      { icon: <AutoAwesome />, title: 'Auto-Translation', description: 'Translate forms to multiple languages' },
    ],
  },
  {
    category: 'Workflow & Automation',
    color: '#00ED64',
    features: [
      { icon: <AccountTree />, title: 'Workflow Generator', description: 'Generate workflows from natural language' },
    ],
  },
];

// Legacy aiFeatures for backward compatibility
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

// NPM Package features
const npmPackageFeatures = [
  { title: '28+ Field Types', description: 'Text, email, date, select, rating, file upload, and more' },
  { title: 'Multi-page Wizards', description: 'Progress tracking, page navigation, step validation' },
  { title: 'Conditional Logic', description: 'Show/hide fields based on user input' },
  { title: 'TypeScript', description: 'Full type safety with exported types' },
];

// Workflows API features
const workflowsApiFeatures = [
  { title: 'Execute Workflows', description: 'Trigger workflows programmatically with custom payloads' },
  { title: 'Wait for Completion', description: 'Built-in polling with waitForExecution helper' },
  { title: 'Lifecycle Control', description: 'Activate, pause, archive workflows via API' },
  { title: 'TypeScript', description: 'Full type safety with comprehensive type exports' },
];

// MCP Server features
const mcpServerFeatures = [
  { title: '22 AI Tools', description: 'Form generation, workflow integration, app scaffolding & more' },
  { title: 'Natural Language', description: 'Describe your form in plain English, get complete configs' },
  { title: 'Best Practices', description: 'Built-in guidance for form design, security & workflows' },
  { title: 'Full Stack Generation', description: 'Generate Next.js apps, API routes & MongoDB queries' },
];

export default function LandingPage() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#001E2B' }}>
      {/* Show AppNavBar for authenticated users */}
      {!isLoading && isAuthenticated && <AppNavBar />}

      {/* Hero Section */}
      <Box
        sx={{
          pt: { xs: 6, md: 8 },
          pb: { xs: 6, md: 8 },
          position: 'relative',
          overflow: 'hidden',
          // Layered background for depth
          background: `
            radial-gradient(ellipse at top, rgba(0, 237, 100, 0.15) 0%, transparent 60%),
            radial-gradient(ellipse at 80% 20%, rgba(0, 212, 170, 0.08) 0%, transparent 40%)
          `,
          // NetPad signature grid pattern overlay
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            backgroundImage: netpadColors.gridPatternDark,
            backgroundSize: '32px 32px',
            opacity: 0.5,
            pointerEvents: 'none',
          },
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
                src="/logo-300px.png"
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
                mb: 4,
                fontWeight: 400,
                lineHeight: 1.6,
                fontSize: { xs: '0.95rem', md: '1.1rem' }
              }}
            >
              Collect data with forms or conversations. Automate with workflows. Explore with a visual data browser.
              All connected to MongoDB. Powered by AI. No code required.
            </Typography>

            {/* Primary CTAs - deliberate, not pushy */}
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap', mb: 4 }}>
              <Button
                component={Link}
                href="/why-netpad"
                variant="outlined"
                size="large"
                sx={{
                  px: 4,
                  py: 1.5,
                  borderColor: alpha('#00ED64', 0.5),
                  color: '#00ED64',
                  fontWeight: 600,
                  '&:hover': {
                    borderColor: '#00ED64',
                    bgcolor: alpha('#00ED64', 0.1),
                  },
                }}
              >
                Explore how it works
              </Button>
              <Button
                component={Link}
                href="/auth/login"
                variant="contained"
                size="large"
                sx={{
                  px: 4,
                  py: 1.5,
                  background: 'linear-gradient(135deg, #00ED64 0%, #00CC55 100%)',
                  color: '#001E2B',
                  fontWeight: 600,
                  '&:hover': {
                    background: 'linear-gradient(135deg, #00FF6A 0%, #00ED64 100%)',
                  },
                }}
              >
                Get access
              </Button>
            </Box>
          </Box>

          {/* Four Pillars - The Core Value Proposition */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {pillars.map((pillar, index) => (
              <Grid item xs={12} sm={6} md={3} key={pillar.id}>
                <SpotlightCard
                  component={Link}
                  href={pillar.href}
                  spotlightColor={hexToRgb(pillar.color)}
                  hoverBorderColor={alpha(pillar.color, 0.4)}
                  sx={{
                    p: 3,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    textDecoration: 'none',
                    borderRadius: 3,
                    transition: 'all 0.3s ease, border-color 0.2s ease',
                    '&:hover': {
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
                </SpotlightCard>
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
              <ArrowForward sx={{ color: alpha('#fff', 0.3), fontSize: 16 }} />
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#E91E63' }} />
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
                    <SpotlightCard
                      spotlightColor="0, 237, 100"
                      hoverBorderColor={alpha('#00ED64', 0.3)}
                      sx={{ p: 2.5, height: '100%' }}
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
                    </SpotlightCard>
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
                    <SpotlightCard
                      spotlightColor="156, 39, 176"
                      hoverBorderColor={alpha('#9C27B0', 0.3)}
                      sx={{ p: 2.5, height: '100%' }}
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
                    </SpotlightCard>
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
                    <SpotlightCard
                      spotlightColor="33, 150, 243"
                      hoverBorderColor={alpha('#2196F3', 0.3)}
                      sx={{ p: 2.5, height: '100%' }}
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
                    </SpotlightCard>
                  </Grid>
                ))}
              </Grid>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Conversational Forms Section - 4th Pillar */}
      <Box sx={{ py: { xs: 6, md: 8 } }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={5}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 1.5,
                    bgcolor: alpha('#E91E63', 0.1),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#E91E63',
                  }}
                >
                  <ChatBubble />
                </Box>
                <Typography variant="overline" sx={{ color: '#E91E63', fontWeight: 700, letterSpacing: 1.5 }}>
                  Engage
                </Typography>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 700, color: '#fff', mb: 2, fontSize: { xs: '1.75rem', md: '2.25rem' } }}>
                Collect Data Through
                <br />Conversation
              </Typography>
              <Typography variant="body1" sx={{ color: alpha('#fff', 0.6), mb: 3, lineHeight: 1.8 }}>
                Replace traditional form fields with natural language dialogue. AI-powered conversational forms guide users through data collection, ask clarifying questions, and extract structured data automatically.
              </Typography>
              <Button
                component={Link}
                href="/builder"
                variant="contained"
                startIcon={<ChatBubble />}
                sx={{
                  background: 'linear-gradient(135deg, #E91E63 0%, #C2185B 100%)',
                  color: '#fff',
                  textTransform: 'none',
                  fontWeight: 600,
                  '&:hover': {
                    background: 'linear-gradient(135deg, #F06292 0%, #E91E63 100%)',
                  }
                }}
              >
                Try Conversational Forms
              </Button>
            </Grid>
            <Grid item xs={12} md={7}>
              <Paper
                sx={{
                  bgcolor: '#1e1e1e',
                  borderRadius: 2,
                  overflow: 'hidden',
                  border: '1px solid',
                  borderColor: alpha('#E91E63', 0.2),
                }}
              >
                <Box sx={{ bgcolor: '#E91E63', px: 2, py: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle2" sx={{ color: '#fff', fontWeight: 'bold' }}>
                    IT Helpdesk Example
                  </Typography>
                  <Chip label="Template" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: '0.7rem' }} />
                </Box>
                <Box sx={{ p: 3 }}>
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', gap: 1, mb: 1.5, alignItems: 'flex-start' }}>
                      <Box sx={{ bgcolor: alpha('#E91E63', 0.2), borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <SmartToy sx={{ fontSize: 18, color: '#E91E63' }} />
                      </Box>
                      <Box sx={{ flex: 1, bgcolor: alpha('#E91E63', 0.1), borderRadius: 2, p: 1.5 }}>
                        <Typography variant="body2" sx={{ color: '#fff', lineHeight: 1.6 }}>
                          Hi! I&apos;m here to help you submit an IT support ticket. What kind of issue are you experiencing?
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, mb: 1.5, alignItems: 'flex-start', flexDirection: 'row-reverse' }}>
                      <Box sx={{ bgcolor: alpha('#00ED64', 0.2), borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Person sx={{ fontSize: 18, color: '#00ED64' }} />
                      </Box>
                      <Box sx={{ flex: 1, bgcolor: alpha('#00ED64', 0.1), borderRadius: 2, p: 1.5 }}>
                        <Typography variant="body2" sx={{ color: '#fff', lineHeight: 1.6 }}>
                          My laptop won&apos;t turn on
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                      <Box sx={{ bgcolor: alpha('#E91E63', 0.2), borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <SmartToy sx={{ fontSize: 18, color: '#E91E63' }} />
                      </Box>
                      <Box sx={{ flex: 1, bgcolor: alpha('#E91E63', 0.1), borderRadius: 2, p: 1.5 }}>
                        <Typography variant="body2" sx={{ color: '#fff', lineHeight: 1.6 }}>
                          I&apos;m sorry to hear that. When you say it won&apos;t turn on, does the screen stay completely black, or do you see any lights or error messages?
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: alpha('#fff', 0.1) }}>
                    <Typography variant="caption" sx={{ color: alpha('#fff', 0.5), fontStyle: 'italic' }}>
                      → Extracted Data: issueCategory: &quot;hardware&quot;, urgencyLevel: &quot;high&quot;, description: &quot;Laptop won&apos;t power on...&quot;
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* AI Features Section - Expanded */}
      <Box sx={{ py: { xs: 6, md: 8 }, bgcolor: alpha('#000', 0.2) }}>
        <Container maxWidth="lg">
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
              12+ AI Agents at Your Service
            </Typography>
            <Typography variant="body1" sx={{ color: alpha('#fff', 0.6), maxWidth: 600, mx: 'auto' }}>
              Generate forms and workflows from natural language. AI helps you build faster, optimize performance, ensure compliance, and translate content.
            </Typography>
          </Box>
          <Grid container spacing={3}>
            {aiFeaturesByCategory.map((category, catIndex) => (
              <Grid item xs={12} md={6} key={catIndex}>
                <Paper
                  sx={{
                    p: 3,
                    bgcolor: alpha('#fff', 0.03),
                    border: '1px solid',
                    borderColor: alpha(category.color, 0.2),
                    borderRadius: 2,
                    height: '100%',
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      color: category.color,
                      mb: 2,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    {category.category}
                  </Typography>
                  <Grid container spacing={2}>
                    {category.features.map((feature, featIndex) => (
                      <Grid item xs={12} sm={6} key={featIndex}>
                        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                          <Box
                            sx={{
                              width: 36,
                              height: 36,
                              borderRadius: 1.5,
                              bgcolor: alpha(category.color, 0.1),
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: category.color,
                              flexShrink: 0,
                            }}
                          >
                            {feature.icon}
                          </Box>
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#fff', mb: 0.25 }}>
                              {feature.title}
                            </Typography>
                            <Typography variant="caption" sx={{ color: alpha('#fff', 0.5), lineHeight: 1.4 }}>
                              {feature.description}
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
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

          {/* Mid-page CTA - catches those who've read enough */}
          <Box
            sx={{
              mt: 6,
              p: 4,
              borderRadius: 3,
              bgcolor: alpha('#00ED64', 0.05),
              border: '1px solid',
              borderColor: alpha('#00ED64', 0.15),
              textAlign: 'center',
            }}
          >
            <Typography variant="h5" fontWeight="bold" sx={{ color: 'white', mb: 1 }}>
              Ready to build your first workflow?
            </Typography>
            <Typography variant="body1" sx={{ color: alpha('#fff', 0.65), mb: 3, maxWidth: 600, mx: 'auto' }}>
              Design intake-to-decision flows with forms, approvals, and automation — all connected to MongoDB.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                component={Link}
                href="/auth/login"
                variant="contained"
                sx={{
                  px: 4,
                  py: 1.25,
                  background: 'linear-gradient(135deg, #00ED64 0%, #00CC55 100%)',
                  color: '#001E2B',
                  fontWeight: 600,
                  '&:hover': {
                    background: 'linear-gradient(135deg, #00FF6A 0%, #00ED64 100%)',
                  },
                }}
              >
                Get access
              </Button>
              <Button
                component={Link}
                href="/why-netpad"
                variant="text"
                sx={{
                  px: 3,
                  py: 1.25,
                  color: alpha('#fff', 0.7),
                  fontWeight: 500,
                  '&:hover': {
                    color: '#fff',
                    bgcolor: alpha('#fff', 0.05),
                  },
                }}
              >
                Learn more
              </Button>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* NPM Package Section */}
      <Box sx={{ py: { xs: 6, md: 8 } }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Chip
                label="npm package"
                icon={<Terminal sx={{ fontSize: 14 }} />}
                size="small"
                sx={{
                  mb: 2,
                  bgcolor: alpha('#CB3837', 0.1),
                  color: '#CB3837',
                  fontWeight: 600,
                  '& .MuiChip-icon': { color: '#CB3837' }
                }}
              />
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#fff', mb: 2 }}>
                Use NetPad Forms in
                <br />Your Own Apps
              </Typography>
              <Typography variant="body1" sx={{ color: alpha('#fff', 0.6), mb: 3, lineHeight: 1.8 }}>
                Install <code style={{ color: '#00ED64', background: alpha('#00ED64', 0.1), padding: '2px 6px', borderRadius: 4 }}>@netpad/forms</code> and
                render sophisticated multi-page wizards with validation, conditional logic, and nested data — all from JSON configuration.
              </Typography>

              {/* Install command */}
              <Paper
                sx={{
                  p: 2,
                  mb: 3,
                  bgcolor: '#1e1e1e',
                  borderRadius: 2,
                  fontFamily: 'monospace',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Typography sx={{ color: '#d4d4d4', fontSize: '0.9rem' }}>
                  <span style={{ color: '#00ED64' }}>$</span> npm install @netpad/forms
                </Typography>
                <ContentCopy sx={{ color: alpha('#fff', 0.4), fontSize: 18, cursor: 'pointer', '&:hover': { color: '#fff' } }} />
              </Paper>

              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  component="a"
                  href="https://www.npmjs.com/package/@netpad/forms"
                  target="_blank"
                  variant="contained"
                  size="small"
                  startIcon={<Terminal />}
                  sx={{
                    background: 'linear-gradient(135deg, #CB3837 0%, #A32B2A 100%)',
                    color: '#fff',
                    textTransform: 'none',
                    fontWeight: 600,
                    '&:hover': {
                      background: 'linear-gradient(135deg, #E04241 0%, #CB3837 100%)',
                    }
                  }}
                >
                  View on npm
                </Button>
                <Button
                  component="a"
                  href="https://github.com/mrlynn/netpad-v3/tree/main/packages/forms"
                  target="_blank"
                  variant="outlined"
                  size="small"
                  startIcon={<GitHub />}
                  sx={{
                    borderColor: alpha('#fff', 0.3),
                    color: '#fff',
                    textTransform: 'none',
                    fontWeight: 600,
                    '&:hover': {
                      borderColor: '#fff',
                      bgcolor: alpha('#fff', 0.1),
                    }
                  }}
                >
                  Documentation
                </Button>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Grid container spacing={2}>
                {npmPackageFeatures.map((feature, index) => (
                  <Grid item xs={6} key={index}>
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        bgcolor: alpha('#fff', 0.03),
                        border: '1px solid',
                        borderColor: alpha('#fff', 0.1),
                        height: '100%',
                      }}
                    >
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

      {/* Example App Section */}
      <Box sx={{ py: { xs: 6, md: 8 }, bgcolor: alpha('#000', 0.2) }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6} sx={{ order: { xs: 2, md: 1 } }}>
              {/* Code preview */}
              <Paper
                sx={{
                  bgcolor: '#1e1e1e',
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                <Box sx={{ bgcolor: '#00ED64', px: 2, py: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle2" sx={{ color: '#001E2B', fontWeight: 'bold' }}>
                    Employee Onboarding Demo
                  </Typography>
                  <Chip label="~300 lines" size="small" sx={{ bgcolor: 'rgba(0,30,43,0.2)', color: '#001E2B', fontSize: '0.7rem' }} />
                </Box>
                <Box sx={{ p: 2 }}>
                  <pre style={{ margin: 0, color: '#d4d4d4', fontSize: '11px', lineHeight: 1.4, overflow: 'auto', maxHeight: 200 }}>
{`// Complete 3-page wizard with:
// ✓ Progress tracking
// ✓ Conditional fields
// ✓ Nested data (emergencyContact.name)
// ✓ Validation

const onboardingForm: FormConfiguration = {
  name: 'Employee Onboarding',
  fieldConfigs: [
    { path: 'firstName', type: 'short_text', required: true },
    { path: 'email', type: 'email', required: true },
    { path: 'department', type: 'dropdown', options: [...] },
    { path: 'officeLocation', type: 'dropdown',
      conditionalLogic: {
        action: 'show',
        conditions: [{ field: 'workType', operator: 'equals', value: 'hybrid' }]
      }
    },
  ],
  multiPage: {
    enabled: true,
    pages: [...]
  },
};`}
                  </pre>
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6} sx={{ order: { xs: 1, md: 2 } }}>
              <Chip
                label="Example App"
                icon={<School sx={{ fontSize: 14 }} />}
                size="small"
                sx={{
                  mb: 2,
                  bgcolor: alpha('#9C27B0', 0.1),
                  color: '#9C27B0',
                  fontWeight: 600,
                  '& .MuiChip-icon': { color: '#9C27B0' }
                }}
              />
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#fff', mb: 2 }}>
                Start with a
                <br />Working Example
              </Typography>
              <Typography variant="body1" sx={{ color: alpha('#fff', 0.6), mb: 3, lineHeight: 1.8 }}>
                Clone the Employee Onboarding Demo to see how to build a complete multi-page form wizard.
                What would take 2-4 weeks from scratch takes under 300 lines with @netpad/forms.
              </Typography>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                <Chip label="3-Page Wizard" size="small" sx={{ bgcolor: alpha('#00ED64', 0.1), color: '#00ED64' }} />
                <Chip label="Conditional Fields" size="small" sx={{ bgcolor: alpha('#00ED64', 0.1), color: '#00ED64' }} />
                <Chip label="Nested Data" size="small" sx={{ bgcolor: alpha('#00ED64', 0.1), color: '#00ED64' }} />
                <Chip label="Form Validation" size="small" sx={{ bgcolor: alpha('#00ED64', 0.1), color: '#00ED64' }} />
              </Box>

              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  component="a"
                  href="https://github.com/mrlynn/netpad-v3/tree/main/examples/employee-onboarding-demo"
                  target="_blank"
                  variant="contained"
                  size="small"
                  startIcon={<RocketLaunch />}
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
                  View Example
                </Button>
                <Button
                  component={Link}
                  href="/why-netpad"
                  variant="outlined"
                  size="small"
                  startIcon={<CompareArrows />}
                  sx={{
                    borderColor: alpha('#fff', 0.3),
                    color: '#fff',
                    textTransform: 'none',
                    fontWeight: 600,
                    '&:hover': {
                      borderColor: '#fff',
                      bgcolor: alpha('#fff', 0.1),
                    }
                  }}
                >
                  See Code Comparison
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Workflows API Section */}
      <Box sx={{ py: { xs: 6, md: 8 } }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Chip
                label="npm package"
                icon={<Terminal sx={{ fontSize: 14 }} />}
                size="small"
                sx={{
                  mb: 2,
                  bgcolor: alpha('#9C27B0', 0.1),
                  color: '#9C27B0',
                  fontWeight: 600,
                  '& .MuiChip-icon': { color: '#9C27B0' }
                }}
              />
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#fff', mb: 2 }}>
                Automate Workflows
                <br />From Your Code
              </Typography>
              <Typography variant="body1" sx={{ color: alpha('#fff', 0.6), mb: 3, lineHeight: 1.8 }}>
                Use <code style={{ color: '#9C27B0', background: alpha('#9C27B0', 0.1), padding: '2px 6px', borderRadius: 4 }}>@netpad/workflows</code> to
                trigger workflow executions, poll for completion, and manage workflows programmatically from your backend services.
              </Typography>

              {/* Install command */}
              <Paper
                sx={{
                  p: 2,
                  mb: 3,
                  bgcolor: '#1e1e1e',
                  borderRadius: 2,
                  fontFamily: 'monospace',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Typography sx={{ color: '#d4d4d4', fontSize: '0.9rem' }}>
                  <span style={{ color: '#9C27B0' }}>$</span> npm install @netpad/workflows
                </Typography>
                <ContentCopy sx={{ color: alpha('#fff', 0.4), fontSize: 18, cursor: 'pointer', '&:hover': { color: '#fff' } }} />
              </Paper>

              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  component="a"
                  href="https://www.npmjs.com/package/@netpad/workflows"
                  target="_blank"
                  variant="contained"
                  size="small"
                  startIcon={<Terminal />}
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
                  View on npm
                </Button>
                <Button
                  component="a"
                  href="https://github.com/mrlynn/netpad-v3/tree/main/packages/workflows"
                  target="_blank"
                  variant="outlined"
                  size="small"
                  startIcon={<GitHub />}
                  sx={{
                    borderColor: alpha('#fff', 0.3),
                    color: '#fff',
                    textTransform: 'none',
                    fontWeight: 600,
                    '&:hover': {
                      borderColor: '#fff',
                      bgcolor: alpha('#fff', 0.1),
                    }
                  }}
                >
                  Documentation
                </Button>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Grid container spacing={2}>
                {workflowsApiFeatures.map((feature, index) => (
                  <Grid item xs={6} key={index}>
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        bgcolor: alpha('#fff', 0.03),
                        border: '1px solid',
                        borderColor: alpha('#fff', 0.1),
                        height: '100%',
                      }}
                    >
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

      {/* Workflow Integration Demo Section */}
      <Box sx={{ py: { xs: 6, md: 8 }, bgcolor: alpha('#000', 0.2) }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6} sx={{ order: { xs: 2, md: 1 } }}>
              {/* Code preview */}
              <Paper
                sx={{
                  bgcolor: '#1e1e1e',
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                <Box sx={{ bgcolor: '#9C27B0', px: 2, py: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle2" sx={{ color: '#fff', fontWeight: 'bold' }}>
                    Workflow Integration Demo
                  </Typography>
                  <Chip label="Interactive" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: '0.7rem' }} />
                </Box>
                <Box sx={{ p: 2 }}>
                  <pre style={{ margin: 0, color: '#d4d4d4', fontSize: '11px', lineHeight: 1.4, overflow: 'auto', maxHeight: 200 }}>
{`import { createNetPadWorkflowClient } from '@netpad/workflows';

const client = createNetPadWorkflowClient({
  baseUrl: 'https://your-netpad.com',
  apiKey: 'np_live_xxx',
  organizationId: 'org_123',
});

// Execute a workflow
const { executionId } = await client.executeWorkflow(
  'order-processing',
  { payload: { orderId, customerId } }
);

// Wait for completion
const result = await client.waitForExecution(executionId, {
  timeoutMs: 60000,
  intervalMs: 2000,
});

console.log('Status:', result.execution.status);
console.log('Output:', result.execution.result?.output);`}
                  </pre>
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6} sx={{ order: { xs: 1, md: 2 } }}>
              <Chip
                label="Example App"
                icon={<School sx={{ fontSize: 14 }} />}
                size="small"
                sx={{
                  mb: 2,
                  bgcolor: alpha('#9C27B0', 0.1),
                  color: '#9C27B0',
                  fontWeight: 600,
                  '& .MuiChip-icon': { color: '#9C27B0' }
                }}
              />
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#fff', mb: 2 }}>
                Try the Interactive
                <br />Workflow Demo
              </Typography>
              <Typography variant="body1" sx={{ color: alpha('#fff', 0.6), mb: 3, lineHeight: 1.8 }}>
                Explore the Workflow Integration Demo to see how to connect to NetPad, trigger executions,
                and monitor workflow status from your own applications.
              </Typography>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                <Chip label="Live Connection" size="small" sx={{ bgcolor: alpha('#9C27B0', 0.1), color: '#9C27B0' }} />
                <Chip label="Execute & Monitor" size="small" sx={{ bgcolor: alpha('#9C27B0', 0.1), color: '#9C27B0' }} />
                <Chip label="Code Examples" size="small" sx={{ bgcolor: alpha('#9C27B0', 0.1), color: '#9C27B0' }} />
                <Chip label="Error Handling" size="small" sx={{ bgcolor: alpha('#9C27B0', 0.1), color: '#9C27B0' }} />
              </Box>

              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  component="a"
                  href="https://github.com/mrlynn/netpad-v3/tree/main/examples/workflow-integration-demo"
                  target="_blank"
                  variant="contained"
                  size="small"
                  startIcon={<RocketLaunch />}
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
                  View Demo
                </Button>
                <Button
                  component="a"
                  href="https://github.com/mrlynn/netpad-v3/blob/main/packages/workflows/README.md"
                  target="_blank"
                  variant="outlined"
                  size="small"
                  startIcon={<Code />}
                  sx={{
                    borderColor: alpha('#fff', 0.3),
                    color: '#fff',
                    textTransform: 'none',
                    fontWeight: 600,
                    '&:hover': {
                      borderColor: '#fff',
                      bgcolor: alpha('#fff', 0.1),
                    }
                  }}
                >
                  API Reference
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* MCP Server Section */}
      <Box sx={{ py: { xs: 6, md: 8 } }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Chip
                label="ai assistant"
                icon={<SmartToy sx={{ fontSize: 14 }} />}
                size="small"
                sx={{
                  mb: 2,
                  bgcolor: alpha('#FF6B35', 0.1),
                  color: '#FF6B35',
                  fontWeight: 600,
                  '& .MuiChip-icon': { color: '#FF6B35' }
                }}
              />
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#fff', mb: 2 }}>
                Build Forms with
                <br />AI Assistance
              </Typography>
              <Typography variant="body1" sx={{ color: alpha('#fff', 0.6), mb: 3, lineHeight: 1.8 }}>
                Use <code style={{ color: '#FF6B35', background: alpha('#FF6B35', 0.1), padding: '2px 6px', borderRadius: 4 }}>@netpad/mcp-server</code> with
                Claude, Cursor, or any MCP-compatible AI to generate forms, scaffold apps, and integrate workflows using natural language.
              </Typography>

              {/* Install command */}
              <Paper
                sx={{
                  p: 2,
                  mb: 3,
                  bgcolor: '#1e1e1e',
                  borderRadius: 2,
                  fontFamily: 'monospace',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Typography sx={{ color: '#d4d4d4', fontSize: '0.9rem' }}>
                  <span style={{ color: '#FF6B35' }}>$</span> npx @netpad/mcp-server
                </Typography>
                <ContentCopy sx={{ color: alpha('#fff', 0.4), fontSize: 18, cursor: 'pointer', '&:hover': { color: '#fff' } }} />
              </Paper>

              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  component="a"
                  href="https://www.npmjs.com/package/@netpad/mcp-server"
                  target="_blank"
                  variant="contained"
                  size="small"
                  startIcon={<Terminal />}
                  sx={{
                    background: 'linear-gradient(135deg, #FF6B35 0%, #E85A24 100%)',
                    color: '#fff',
                    textTransform: 'none',
                    fontWeight: 600,
                    '&:hover': {
                      background: 'linear-gradient(135deg, #FF7D4D 0%, #FF6B35 100%)',
                    }
                  }}
                >
                  View on npm
                </Button>
                <Button
                  component="a"
                  href="https://github.com/mrlynn/netpad-v3/tree/main/packages/mcp-server"
                  target="_blank"
                  variant="outlined"
                  size="small"
                  startIcon={<GitHub />}
                  sx={{
                    borderColor: alpha('#fff', 0.3),
                    color: '#fff',
                    textTransform: 'none',
                    fontWeight: 600,
                    '&:hover': {
                      borderColor: '#fff',
                      bgcolor: alpha('#fff', 0.1),
                    }
                  }}
                >
                  Documentation
                </Button>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Grid container spacing={2}>
                {mcpServerFeatures.map((feature, index) => (
                  <Grid item xs={6} key={index}>
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        bgcolor: alpha('#fff', 0.03),
                        border: '1px solid',
                        borderColor: alpha('#fff', 0.1),
                        height: '100%',
                      }}
                    >
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

      {/* MCP Server Demo Section */}
      <Box sx={{ py: { xs: 6, md: 8 }, bgcolor: alpha('#000', 0.2) }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6} sx={{ order: { xs: 2, md: 1 } }}>
              {/* Code preview */}
              <Paper
                sx={{
                  bgcolor: '#1e1e1e',
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                <Box sx={{ bgcolor: '#FF6B35', px: 2, py: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle2" sx={{ color: '#fff', fontWeight: 'bold' }}>
                    AI Form Generation
                  </Typography>
                  <Chip label="22 Tools" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: '0.7rem' }} />
                </Box>
                <Box sx={{ p: 2 }}>
                  <pre style={{ margin: 0, color: '#d4d4d4', fontSize: '11px', lineHeight: 1.4, overflow: 'auto', maxHeight: 200 }}>
{`// Claude Desktop config
{
  "mcpServers": {
    "netpad-forms": {
      "command": "npx",
      "args": ["@netpad/mcp-server"]
    }
  }
}

// Then just ask Claude:
"Create a lead capture form for a SaaS product
 with company size dropdown and interest checkboxes"

// Claude generates complete form config,
// API routes, and MongoDB queries automatically`}
                  </pre>
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6} sx={{ order: { xs: 1, md: 2 } }}>
              <Chip
                label="MCP Protocol"
                icon={<SmartToy sx={{ fontSize: 14 }} />}
                size="small"
                sx={{
                  mb: 2,
                  bgcolor: alpha('#FF6B35', 0.1),
                  color: '#FF6B35',
                  fontWeight: 600,
                  '& .MuiChip-icon': { color: '#FF6B35' }
                }}
              />
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#fff', mb: 2 }}>
                Natural Language
                <br />Form Development
              </Typography>
              <Typography variant="body1" sx={{ color: alpha('#fff', 0.6), mb: 3, lineHeight: 1.8 }}>
                The MCP server provides 22 specialized tools for AI assistants. Generate forms, validate configs,
                scaffold Next.js apps, and get best practices — all through conversation.
              </Typography>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                <Chip label="Form Generation" size="small" sx={{ bgcolor: alpha('#FF6B35', 0.1), color: '#FF6B35' }} />
                <Chip label="App Scaffolding" size="small" sx={{ bgcolor: alpha('#FF6B35', 0.1), color: '#FF6B35' }} />
                <Chip label="Workflow Integration" size="small" sx={{ bgcolor: alpha('#FF6B35', 0.1), color: '#FF6B35' }} />
                <Chip label="Debug & Validate" size="small" sx={{ bgcolor: alpha('#FF6B35', 0.1), color: '#FF6B35' }} />
              </Box>

              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  component="a"
                  href="https://github.com/mrlynn/netpad-v3/tree/main/packages/mcp-server#available-tools-22-total"
                  target="_blank"
                  variant="contained"
                  size="small"
                  startIcon={<AutoAwesome />}
                  sx={{
                    background: 'linear-gradient(135deg, #FF6B35 0%, #E85A24 100%)',
                    color: '#fff',
                    textTransform: 'none',
                    fontWeight: 600,
                    '&:hover': {
                      background: 'linear-gradient(135deg, #FF7D4D 0%, #FF6B35 100%)',
                    }
                  }}
                >
                  View All Tools
                </Button>
                <Button
                  component="a"
                  href="https://github.com/mrlynn/netpad-v3/blob/main/packages/mcp-server/README.md#usage-with-claude-desktop"
                  target="_blank"
                  variant="outlined"
                  size="small"
                  startIcon={<Code />}
                  sx={{
                    borderColor: alpha('#fff', 0.3),
                    color: '#fff',
                    textTransform: 'none',
                    fontWeight: 600,
                    '&:hover': {
                      borderColor: '#fff',
                      bgcolor: alpha('#fff', 0.1),
                    }
                  }}
                >
                  Setup Guide
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Deployment Platform Section */}
      <Box sx={{ py: { xs: 6, md: 8 } }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Chip
                label="Deployment"
                icon={<RocketLaunch sx={{ fontSize: 14 }} />}
                size="small"
                sx={{
                  mb: 2,
                  bgcolor: alpha('#00ED64', 0.1),
                  color: '#00ED64',
                  fontWeight: 600,
                  '& .MuiChip-icon': { color: '#00ED64' }
                }}
              />
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#fff', mb: 2 }}>
                From Database to Production
                <br />in Minutes
              </Typography>
              <Typography variant="body1" sx={{ color: alpha('#fff', 0.6), mb: 3, lineHeight: 1.8 }}>
                Deploy your own NetPad instance with one click. Auto-provision a MongoDB Atlas cluster, configure custom branding, and go live in minutes. Perfect for self-hosting or white-label deployments.
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                <Chip label="One-Click Deploy" size="small" sx={{ bgcolor: alpha('#00ED64', 0.1), color: '#00ED64' }} />
                <Chip label="Auto-Provision DB" size="small" sx={{ bgcolor: alpha('#00ED64', 0.1), color: '#00ED64' }} />
                <Chip label="Custom Branding" size="small" sx={{ bgcolor: alpha('#00ED64', 0.1), color: '#00ED64' }} />
                <Chip label="Custom Domain" size="small" sx={{ bgcolor: alpha('#00ED64', 0.1), color: '#00ED64' }} />
              </Box>
              <DeployToVercelButton variant="contained" size="small" />
            </Grid>
            <Grid item xs={12} md={6}>
              <Grid container spacing={2}>
                {[
                  { title: 'Vercel', description: 'Primary deployment target with full integration' },
                  { title: 'Netlify', description: 'Framework support for alternative hosting' },
                  { title: 'Railway', description: 'Self-hosted deployment options' },
                  { title: 'Self-Hosted', description: 'Full control with Docker support' },
                ].map((item, index) => (
                  <Grid item xs={6} key={index}>
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        bgcolor: alpha('#fff', 0.03),
                        border: '1px solid',
                        borderColor: alpha('#fff', 0.1),
                        height: '100%',
                      }}
                    >
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#fff', mb: 0.5 }}>
                        {item.title}
                      </Typography>
                      <Typography variant="caption" sx={{ color: alpha('#fff', 0.5), lineHeight: 1.5 }}>
                        {item.description}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Developer Section */}
      <Box sx={{ py: { xs: 5, md: 6 }, bgcolor: alpha('#000', 0.2) }}>
        <Container maxWidth="md">
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#fff', mb: 1 }}>
              Built for Developers
            </Typography>
            <Typography variant="body2" sx={{ color: alpha('#fff', 0.6) }}>
              Full REST API, webhooks, and JSON export. Self-host or use our managed service.
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap', mb: 3 }}>
            <Chip
              icon={<Terminal sx={{ fontSize: 14 }} />}
              label="@netpad/forms"
              size="small"
              sx={{ bgcolor: alpha('#CB3837', 0.2), color: '#fff', fontWeight: 600 }}
            />
            <Chip
              icon={<AccountTree sx={{ fontSize: 14 }} />}
              label="@netpad/workflows"
              size="small"
              sx={{ bgcolor: alpha('#9C27B0', 0.2), color: '#fff', fontWeight: 600 }}
            />
            <Chip
              icon={<Code sx={{ fontSize: 14 }} />}
              label="160+ API Endpoints"
              size="small"
              sx={{ bgcolor: alpha('#fff', 0.1), color: '#fff' }}
            />
            <Chip
              icon={<AutoAwesome sx={{ fontSize: 14 }} />}
              label="12+ AI Agents"
              size="small"
              sx={{ bgcolor: alpha('#E91E63', 0.2), color: '#fff', fontWeight: 600 }}
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

          {/* Self-hosting deployment options */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <DeployToVercelButton variant="contained" size="small" />
            <Button
              component="a"
              href="https://github.com/mrlynn/netpad-v3"
              target="_blank"
              variant="outlined"
              size="small"
              startIcon={<GitHub />}
              sx={{
                borderColor: alpha('#fff', 0.3),
                color: '#fff',
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': {
                  borderColor: '#fff',
                  bgcolor: alpha('#fff', 0.1),
                }
              }}
            >
              View on GitHub
            </Button>
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

            {/* Deploy to Vercel - Self-hosting option */}
            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Typography variant="caption" sx={{ color: alpha('#fff', 0.4), display: 'block', mb: 1.5 }}>
                Or deploy your own instance
              </Typography>
              <DeployToVercelButton
                variant="outlined"
                size="small"
                sx={{
                  px: 2.5,
                  borderColor: alpha('#fff', 0.3),
                  color: '#fff',
                  '&:hover': {
                    borderColor: '#fff',
                    bgcolor: alpha('#fff', 0.1)
                  }
                }}
              />
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
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              <Typography
                component={Link}
                href="/auth/login"
                variant="body2"
                sx={{
                  color: alpha('#fff', 0.5),
                  textDecoration: 'none',
                  '&:hover': { color: alpha('#fff', 0.8) }
                }}
              >
                Sign in
              </Typography>
              <Typography
                component={Link}
                href="/auth/login"
                variant="body2"
                sx={{
                  color: alpha('#fff', 0.5),
                  textDecoration: 'none',
                  '&:hover': { color: alpha('#fff', 0.8) }
                }}
              >
                Request access
              </Typography>
              <Box sx={{ width: '1px', bgcolor: alpha('#fff', 0.1) }} />
              <Typography
                component={Link}
                href="/why-netpad"
                variant="body2"
                sx={{
                  color: alpha('#fff', 0.4),
                  textDecoration: 'none',
                  '&:hover': { color: '#00ED64' }
                }}
              >
                Why NetPad?
              </Typography>
              <Typography
                component={Link}
                href="/pricing"
                variant="body2"
                sx={{
                  color: alpha('#fff', 0.4),
                  textDecoration: 'none',
                  '&:hover': { color: '#00ED64' }
                }}
              >
                Pricing
              </Typography>
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
                href="https://www.npmjs.com/package/@netpad/mcp-server"
                target="_blank"
                variant="body2"
                sx={{
                  color: alpha('#fff', 0.4),
                  textDecoration: 'none',
                  '&:hover': { color: '#FF6B35' }
                }}
              >
                MCP Server
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
                href="https://status.netpad.io"
                target="_blank"
                rel="noopener noreferrer"
                variant="body2"
                sx={{
                  color: alpha('#fff', 0.4),
                  textDecoration: 'none',
                  '&:hover': { color: '#00ED64' }
                }}
              >
                Status
              </Typography>
              <Typography
                component="a"
                href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fmrlynn%2Fnetpad-v3&env=MONGODB_URI,SESSION_SECRET,VAULT_ENCRYPTION_KEY&envDescription=Required%20environment%20variables%20for%20NetPad&envLink=https%3A%2F%2Fgithub.com%2Fmrlynn%2Fnetpad-v3%2Fblob%2Fmain%2Fdocs%2FDEPLOY.md&project-name=my-netpad&repository-name=my-netpad"
                target="_blank"
                variant="body2"
                sx={{
                  color: alpha('#fff', 0.4),
                  textDecoration: 'none',
                  '&:hover': { color: '#00ED64' }
                }}
              >
                Deploy
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
