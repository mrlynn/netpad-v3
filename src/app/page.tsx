'use client';

import { Box, Typography, Button, Container, Grid, Paper, alpha, Chip, Divider } from '@mui/material';
import {
  ArrowForward,
  GitHub,
  Storage,
  CheckCircle,
  Rule,
  Link as LinkIcon,
  ViewCarousel,
  Publish,
  Functions,
  Analytics,
  History,
  Webhook,
  DragIndicator,
  Visibility,
  Speed,
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
  TrendingUp,
} from '@mui/icons-material';
import Link from 'next/link';

const heroStats = [
  { value: '30+', label: 'Field Types' },
  { value: '100+', label: 'API Endpoints' },
  { value: 'Free', label: 'M0 Cluster' },
];

const features = [
  {
    icon: <Storage sx={{ fontSize: 32 }} />,
    title: 'Schema Import',
    description: 'Auto-generate forms from your MongoDB collection schema. Connect and build in seconds.',
  },
  {
    icon: <Rule sx={{ fontSize: 32 }} />,
    title: 'Conditional Logic',
    description: 'Show or hide fields based on user input. Create dynamic, intelligent forms.',
  },
  {
    icon: <LinkIcon sx={{ fontSize: 32 }} />,
    title: 'Lookup Fields',
    description: 'Reference data from other collections with autocomplete. Build relational forms.',
  },
  {
    icon: <ViewCarousel sx={{ fontSize: 32 }} />,
    title: 'Multi-Page Forms',
    description: 'Break long forms into manageable steps. Track progress and improve completion.',
  },
  {
    icon: <Functions sx={{ fontSize: 32 }} />,
    title: 'Computed Fields',
    description: 'Formula-based calculations that update in real-time. Totals, scores, and more.',
  },
  {
    icon: <Publish sx={{ fontSize: 32 }} />,
    title: 'One-Click Publish',
    description: 'Share forms instantly with a public URL. Collect responses immediately.',
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

const useCases = [
  {
    title: 'Customer Feedback',
    description: 'Collect surveys, NPS scores, and product feedback with real-time analytics.',
    fields: ['Rating', 'Multi-choice', 'Text', 'Email'],
  },
  {
    title: 'Event Registration',
    description: 'Conference signups, ticket selection, and session preferences.',
    fields: ['Text', 'Select', 'Date', 'Checkbox'],
  },
  {
    title: 'Job Applications',
    description: 'Resume intake, work history, and candidate screening forms.',
    fields: ['File Upload', 'Text Area', 'Select', 'Phone'],
  },
  {
    title: 'Order Intake',
    description: 'Product orders, shipping details, and payment information collection.',
    fields: ['Select', 'Number', 'Address', 'Computed'],
  },
];

const steps = [
  {
    icon: <DragIndicator sx={{ fontSize: 40 }} />,
    title: 'Design',
    description: 'Start from scratch or import fields from your MongoDB collection schema.',
  },
  {
    icon: <Visibility sx={{ fontSize: 40 }} />,
    title: 'Configure',
    description: 'Add validation, conditional logic, computed fields, and customize styling.',
  },
  {
    icon: <Speed sx={{ fontSize: 40 }} />,
    title: 'Publish',
    description: 'Share with a public URL or embed in your website. Start collecting responses.',
  },
  {
    icon: <TrendingUp sx={{ fontSize: 40 }} />,
    title: 'Analyze',
    description: 'View submissions, track trends, and export data for deeper analysis.',
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
          pt: { xs: 8, md: 12 },
          pb: { xs: 8, md: 10 },
          background: 'radial-gradient(ellipse at top, rgba(0, 237, 100, 0.12) 0%, transparent 50%)'
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Chip
              label="Open Source"
              icon={<GitHub sx={{ fontSize: 16 }} />}
              sx={{
                mb: 3,
                bgcolor: alpha('#00ED64', 0.1),
                color: '#00ED64',
                fontWeight: 600,
                '& .MuiChip-icon': { color: '#00ED64' }
              }}
            />
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: '2.5rem', md: '3.5rem', lg: '4rem' },
                fontWeight: 700,
                color: '#fff',
                mb: 2,
                lineHeight: 1.2
              }}
            >
              Build MongoDB Forms
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
                Without Writing Code
              </Box>
            </Typography>
            <Typography
              variant="h5"
              sx={{
                color: alpha('#fff', 0.7),
                maxWidth: 750,
                mx: 'auto',
                mb: 4,
                fontWeight: 400,
                lineHeight: 1.6
              }}
            >
              Create beautiful data entry forms, surveys, and search interfaces connected directly to MongoDB.
              AI-powered. Enterprise-ready. Free to start.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap', mb: 4 }}>
              <Button
                component={Link}
                href="/builder"
                variant="contained"
                size="large"
                endIcon={<ArrowForward />}
                sx={{
                  px: 4,
                  py: 1.5,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, #00ED64 0%, #00CC55 100%)',
                  color: '#001E2B',
                  borderRadius: 2,
                  textTransform: 'none',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #00FF6A 0%, #00ED64 100%)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 24px rgba(0, 237, 100, 0.3)'
                  },
                  transition: 'all 0.2s ease'
                }}
              >
                Start Building Free
              </Button>
              <Button
                component={Link}
                href="/my-forms"
                variant="outlined"
                size="large"
                sx={{
                  px: 4,
                  py: 1.5,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  borderColor: alpha('#fff', 0.3),
                  color: '#fff',
                  borderRadius: 2,
                  textTransform: 'none',
                  '&:hover': {
                    borderColor: '#00ED64',
                    bgcolor: alpha('#00ED64', 0.1)
                  }
                }}
              >
                Forms
              </Button>
            </Box>

            {/* Hero Stats */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                gap: { xs: 4, md: 6 },
                flexWrap: 'wrap',
              }}
            >
              {heroStats.map((stat, index) => (
                <Box key={index} sx={{ textAlign: 'center' }}>
                  <Typography
                    sx={{
                      fontSize: { xs: '1.75rem', md: '2rem' },
                      fontWeight: 700,
                      color: '#00ED64',
                    }}
                  >
                    {stat.value}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: alpha('#fff', 0.5), fontWeight: 500 }}
                  >
                    {stat.label}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Features Grid */}
      <Box sx={{ py: { xs: 8, md: 12 }, bgcolor: alpha('#000', 0.2) }}>
        <Container maxWidth="lg">
          <Typography
            variant="h3"
            sx={{
              textAlign: 'center',
              fontWeight: 700,
              color: '#fff',
              mb: 2
            }}
          >
            Powerful Form Building
          </Typography>
          <Typography
            variant="body1"
            sx={{
              textAlign: 'center',
              color: alpha('#fff', 0.6),
              mb: 6,
              maxWidth: 600,
              mx: 'auto'
            }}
          >
            Everything you need to build professional, database-connected forms.
          </Typography>

          <Grid container spacing={3}>
            {features.map((feature, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    height: '100%',
                    bgcolor: alpha('#fff', 0.03),
                    border: '1px solid',
                    borderColor: alpha('#fff', 0.1),
                    borderRadius: 3,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      bgcolor: alpha('#00ED64', 0.05),
                      borderColor: alpha('#00ED64', 0.3),
                      transform: 'translateY(-4px)'
                    }
                  }}
                >
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: 2,
                      bgcolor: alpha('#00ED64', 0.1),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#00ED64',
                      mb: 2
                    }}
                  >
                    {feature.icon}
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#fff', mb: 1 }}>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: alpha('#fff', 0.6), lineHeight: 1.6 }}>
                    {feature.description}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* AI Features Section */}
      <Box sx={{ py: { xs: 8, md: 10 } }}>
        <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={5}>
              <Chip
                label="AI-Powered"
                icon={<AutoAwesome sx={{ fontSize: 16 }} />}
                sx={{
                  mb: 2,
                  bgcolor: alpha('#00ED64', 0.1),
                  color: '#00ED64',
                  fontWeight: 600,
                  '& .MuiChip-icon': { color: '#00ED64' }
                }}
              />
              <Typography variant="h3" sx={{ fontWeight: 700, color: '#fff', mb: 2 }}>
                Let AI Build
                <br />Your Forms
              </Typography>
              <Typography variant="body1" sx={{ color: alpha('#fff', 0.6), mb: 3, lineHeight: 1.8 }}>
                Describe what you need in plain English, and our AI will generate a complete form
                with the right field types, validation rules, and conditional logic.
              </Typography>
              <Button
                component={Link}
                href="/builder"
                variant="outlined"
                sx={{
                  borderColor: '#00ED64',
                  color: '#00ED64',
                  textTransform: 'none',
                  '&:hover': { bgcolor: alpha('#00ED64', 0.1) }
                }}
              >
                Try AI Form Generation
              </Button>
            </Grid>
            <Grid item xs={12} md={7}>
              <Grid container spacing={2}>
                {aiFeatures.map((feature, index) => (
                  <Grid item xs={12} sm={6} key={index}>
                    <Box
                      sx={{
                        p: 3,
                        borderRadius: 2,
                        bgcolor: alpha('#fff', 0.03),
                        border: '1px solid',
                        borderColor: alpha('#fff', 0.1),
                      }}
                    >
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
                          mb: 2
                        }}
                      >
                        {feature.icon}
                      </Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#fff', mb: 0.5 }}>
                        {feature.title}
                      </Typography>
                      <Typography variant="body2" sx={{ color: alpha('#fff', 0.5) }}>
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

      {/* How It Works */}
      <Box sx={{ py: { xs: 8, md: 12 }, bgcolor: alpha('#000', 0.2) }}>
        <Container maxWidth="lg">
          <Typography
            variant="h3"
            sx={{
              textAlign: 'center',
              fontWeight: 700,
              color: '#fff',
              mb: 6
            }}
          >
            From Idea to Production in Minutes
          </Typography>

          <Grid container spacing={4} justifyContent="center">
            {steps.map((step, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Box sx={{ textAlign: 'center', position: 'relative' }}>
                  <Box
                    sx={{
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      bgcolor: alpha('#00ED64', 0.1),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#00ED64',
                      mx: 'auto',
                      mb: 3,
                      position: 'relative',
                    }}
                  >
                    {step.icon}
                    <Box
                      sx={{
                        position: 'absolute',
                        top: -8,
                        right: -8,
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        bgcolor: '#00ED64',
                        color: '#001E2B',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.875rem'
                      }}
                    >
                      {index + 1}
                    </Box>
                  </Box>
                  <Typography variant="h5" sx={{ fontWeight: 600, color: '#fff', mb: 1 }}>
                    {step.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: alpha('#fff', 0.6), maxWidth: 220, mx: 'auto' }}>
                    {step.description}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Platform Features */}
      <Box sx={{ py: { xs: 8, md: 10 } }}>
        <Container maxWidth="lg">
          <Typography
            variant="h3"
            sx={{
              textAlign: 'center',
              fontWeight: 700,
              color: '#fff',
              mb: 2
            }}
          >
            Your Data, Your Control
          </Typography>
          <Typography
            variant="body1"
            sx={{
              textAlign: 'center',
              color: alpha('#fff', 0.6),
              mb: 6,
              maxWidth: 600,
              mx: 'auto'
            }}
          >
            Built on MongoDB Atlas with complete data ownership and portability.
          </Typography>

          <Grid container spacing={3}>
            {platformFeatures.map((feature, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: 2,
                      bgcolor: alpha('#00ED64', 0.1),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#00ED64',
                      mx: 'auto',
                      mb: 2
                    }}
                  >
                    {feature.icon}
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#fff', mb: 1 }}>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: alpha('#fff', 0.6), lineHeight: 1.6 }}>
                    {feature.description}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Use Cases */}
      <Box sx={{ py: { xs: 8, md: 10 }, bgcolor: alpha('#000', 0.2) }}>
        <Container maxWidth="lg">
          <Typography
            variant="h3"
            sx={{
              textAlign: 'center',
              fontWeight: 700,
              color: '#fff',
              mb: 2
            }}
          >
            Built for Every Use Case
          </Typography>
          <Typography
            variant="body1"
            sx={{
              textAlign: 'center',
              color: alpha('#fff', 0.6),
              mb: 6,
              maxWidth: 600,
              mx: 'auto'
            }}
          >
            From simple contact forms to complex multi-step applications.
          </Typography>

          <Grid container spacing={3}>
            {useCases.map((useCase, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    height: '100%',
                    bgcolor: alpha('#fff', 0.03),
                    border: '1px solid',
                    borderColor: alpha('#fff', 0.1),
                    borderRadius: 3,
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#fff', mb: 1 }}>
                    {useCase.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: alpha('#fff', 0.6), mb: 2, lineHeight: 1.6 }}>
                    {useCase.description}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {useCase.fields.map((field, i) => (
                      <Chip
                        key={i}
                        label={field}
                        size="small"
                        sx={{
                          bgcolor: alpha('#00ED64', 0.1),
                          color: '#00ED64',
                          fontSize: '0.7rem',
                        }}
                      />
                    ))}
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Security Section */}
      <Box sx={{ py: { xs: 6, md: 8 } }}>
        <Container maxWidth="lg">
          <Typography
            variant="h4"
            sx={{
              textAlign: 'center',
              fontWeight: 700,
              color: '#fff',
              mb: 4
            }}
          >
            Enterprise-Grade Security
          </Typography>

          <Grid container spacing={2} justifyContent="center">
            {securityFeatures.map((feature, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 2,
                    p: 2,
                    borderRadius: 2,
                  }}
                >
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
                      flexShrink: 0
                    }}
                  >
                    {feature.icon}
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#fff', mb: 0.5 }}>
                      {feature.title}
                    </Typography>
                    <Typography variant="caption" sx={{ color: alpha('#fff', 0.5) }}>
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
      <Box sx={{ py: { xs: 6, md: 8 }, bgcolor: alpha('#000', 0.2) }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#fff', mb: 2 }}>
                Built for Developers
              </Typography>
              <Typography variant="body1" sx={{ color: alpha('#fff', 0.6), mb: 3, lineHeight: 1.8 }}>
                Full REST API access, webhooks for automation, and complete code export.
                Self-host on your own infrastructure or use our managed service.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Chip
                  icon={<Code sx={{ fontSize: 16 }} />}
                  label="100+ API Endpoints"
                  sx={{ bgcolor: alpha('#fff', 0.1), color: '#fff' }}
                />
                <Chip
                  icon={<Webhook sx={{ fontSize: 16 }} />}
                  label="Webhook Support"
                  sx={{ bgcolor: alpha('#fff', 0.1), color: '#fff' }}
                />
                <Chip
                  icon={<DataObject sx={{ fontSize: 16 }} />}
                  label="JSON Export"
                  sx={{ bgcolor: alpha('#fff', 0.1), color: '#fff' }}
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  bgcolor: '#0D1117',
                  borderRadius: 2,
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  color: alpha('#fff', 0.9),
                  overflow: 'auto',
                }}
              >
                <Box sx={{ color: '#8B949E' }}>// Create a form via API</Box>
                <Box sx={{ color: '#79C0FF' }}>POST</Box>{' '}
                <Box component="span" sx={{ color: '#A5D6FF' }}>/api/forms</Box>
                <Box sx={{ mt: 2, color: '#8B949E' }}>// Fetch submissions</Box>
                <Box sx={{ color: '#79C0FF' }}>GET</Box>{' '}
                <Box component="span" sx={{ color: '#A5D6FF' }}>/api/forms/:id/submissions</Box>
                <Box sx={{ mt: 2, color: '#8B949E' }}>// Webhook on submit</Box>
                <Box sx={{ color: '#FFA657' }}>{`{ "url": "https://...", "events": ["submit"] }`}</Box>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box
        sx={{
          py: { xs: 8, md: 10 },
          background: 'linear-gradient(180deg, transparent 0%, rgba(0, 237, 100, 0.05) 100%)'
        }}
      >
        <Container maxWidth="md">
          <Paper
            elevation={0}
            sx={{
              p: { xs: 4, md: 6 },
              textAlign: 'center',
              bgcolor: alpha('#00ED64', 0.05),
              border: '1px solid',
              borderColor: alpha('#00ED64', 0.2),
              borderRadius: 4
            }}
          >
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#fff', mb: 2 }}>
              Ready to build your first form?
            </Typography>
            <Typography variant="body1" sx={{ color: alpha('#fff', 0.6), mb: 4, maxWidth: 500, mx: 'auto' }}>
              Start with a free MongoDB cluster and unlimited forms.
              No credit card required.
            </Typography>
            <Button
              component={Link}
              href="/builder"
              variant="contained"
              size="large"
              endIcon={<ArrowForward />}
              sx={{
                px: 5,
                py: 1.5,
                fontSize: '1.1rem',
                fontWeight: 600,
                background: 'linear-gradient(135deg, #00ED64 0%, #00CC55 100%)',
                color: '#001E2B',
                borderRadius: 2,
                textTransform: 'none',
                '&:hover': {
                  background: 'linear-gradient(135deg, #00FF6A 0%, #00ED64 100%)'
                }
              }}
            >
              Start Building Now
            </Button>
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
            <Typography variant="body2" sx={{ color: alpha('#fff', 0.4) }}>
              Built with MongoDB, Next.js, and Material-UI
            </Typography>
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
                href="https://github.com/mrlynn/aggregation-builder"
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
