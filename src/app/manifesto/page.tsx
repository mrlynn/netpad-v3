'use client';

import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Divider,
  Button,
  alpha,
} from '@mui/material';
import Link from 'next/link';
import Image from 'next/image';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { AppNavBar } from '@/components/Navigation/AppNavBar';

const principles = [
  {
    title: 'Data is a Flow',
    description:
      'Data doesn\'t sit in databases. It moves through organizations—from intake to decisions to action. NetPad designs for this movement, not just storage.',
    icon: '→',
  },
  {
    title: 'People and Systems, Together',
    description:
      'The best automation includes human judgment. NetPad workflows orchestrate people, systems, and AI in the same flow—with clear handoffs and governance.',
    icon: '⚡',
  },
  {
    title: 'Forms are Interfaces, Not Endpoints',
    description:
      'Forms collect data. But that data must route, transform, approve, and act. NetPad treats forms as the start of a lifecycle, not a destination.',
    icon: '📋',
  },
  {
    title: 'Visual Design, Technical Precision',
    description:
      'NetPad balances approachability with technical precision. You can build without code, but the platform respects your data model, security, and scale.',
    icon: '🎯',
  },
  {
    title: 'Governance by Design',
    description:
      'Security, compliance, and audit trails aren\'t add-ons. They\'re built into every form, workflow, and data connection from day one.',
    icon: '🔒',
  },
  {
    title: 'Open and Portable',
    description:
      'Your data lives in MongoDB. Your workflows are versioned. Your applications are exportable. NetPad doesn\'t lock you in—it connects you out.',
    icon: '🔓',
  },
];

const values = [
  {
    title: 'Clarity over Hype',
    description: 'We speak clearly and precisely. No "magic" promises—just honest capabilities and clear limitations.',
  },
  {
    title: 'Flow over Features',
    description: 'We optimize for how data moves through your organization, not for feature checklists.',
  },
  {
    title: 'Orchestration over Automation',
    description: 'Automation is a tool. Orchestration—coordinating people, systems, and AI—is the goal.',
  },
  {
    title: 'Governance over Speed',
    description: 'Fast is good. Fast with security, compliance, and audit trails is essential.',
  },
];

export default function ManifestoPage() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#001E2B' }}>
      <AppNavBar />
      
      {/* Hero Section */}
      <Box
        sx={{
          background: 'radial-gradient(ellipse at top, rgba(0, 237, 100, 0.15) 0%, transparent 60%)',
          color: 'white',
          py: 8,
        }}
      >
        <Container maxWidth="lg">
          <Button
            component={Link}
            href="/"
            startIcon={<ArrowBackIcon />}
            sx={{ color: 'white', mb: 4, '&:hover': { bgcolor: alpha('#fff', 0.1) } }}
          >
            Back to Home
          </Button>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
            <Image
              src="/logo-250x250-trans.png"
              alt="NetPad"
              width={64}
              height={64}
              style={{ filter: 'drop-shadow(0 4px 12px rgba(0, 237, 100, 0.3))' }}
            />
            <Typography
              variant="h3"
              sx={{
                fontWeight: 800,
                background: 'linear-gradient(135deg, #00ED64 0%, #4DFF9F 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              The NetPad Manifesto
            </Typography>
          </Box>

          <Typography 
            variant="h1" 
            fontWeight="bold" 
            gutterBottom 
            sx={{ 
              maxWidth: 900, 
              lineHeight: 1.1,
              fontSize: { xs: '2.5rem', md: '3.5rem' },
              mb: 3
            }}
          >
            NetPad is the connective tissue between people and data.
          </Typography>

          <Typography 
            variant="h5" 
            sx={{ 
              opacity: 0.9, 
              maxWidth: 850, 
              mb: 4, 
              lineHeight: 1.7,
              fontWeight: 400
            }}
          >
            Forms are the interface. Automation is the intelligence in between. 
            NetPad balances approachability with technical precision—modern, confident, and quietly powerful.
          </Typography>
        </Container>
      </Box>

      {/* Core Philosophy */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box sx={{ mb: 8 }}>
          <Typography 
            variant="h3" 
            fontWeight="bold" 
            gutterBottom
            sx={{
              background: 'linear-gradient(135deg, #00ED64 0%, #4DFF9F 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 4
            }}
          >
            Our Philosophy
          </Typography>

          <Paper
            sx={{
              bgcolor: alpha('#00ED64', 0.05),
              border: `1px solid ${alpha('#00ED64', 0.2)}`,
              borderRadius: 3,
              p: 4,
              mb: 6,
            }}
          >
            <Typography variant="h5" fontWeight="600" gutterBottom sx={{ color: '#00ED64', mb: 2 }}>
              Design how data moves through your organization.
            </Typography>
            <Typography variant="body1" sx={{ color: alpha('#fff', 0.85), lineHeight: 1.8, fontSize: '1.1rem' }}>
              NetPad is a visual platform for turning <strong>intake</strong> into <strong>decisions</strong> into <strong>action</strong> — 
              across people, systems, and AI — with governance built in.
            </Typography>
            <Typography variant="body1" sx={{ color: alpha('#fff', 0.7), mt: 3, lineHeight: 1.8 }}>
              Forms are one interface. The product is the <strong>document lifecycle</strong>: 
              capture → route → approve → automate → audit.
            </Typography>
          </Paper>

          <Grid container spacing={4}>
            {principles.map((principle, index) => (
              <Grid item xs={12} md={6} key={index}>
                <Paper
                  sx={{
                    bgcolor: alpha('#fff', 0.03),
                    border: `1px solid ${alpha('#fff', 0.1)}`,
                    borderRadius: 2,
                    p: 3,
                    height: '100%',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      bgcolor: alpha('#00ED64', 0.05),
                      borderColor: alpha('#00ED64', 0.3),
                      transform: 'translateY(-2px)',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                    <Typography
                      variant="h4"
                      sx={{
                        color: '#00ED64',
                        fontSize: '2rem',
                        lineHeight: 1,
                      }}
                    >
                      {principle.icon}
                    </Typography>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" fontWeight="600" gutterBottom sx={{ color: '#fff', mb: 1 }}>
                        {principle.title}
                      </Typography>
                      <Typography variant="body2" sx={{ color: alpha('#fff', 0.75), lineHeight: 1.7 }}>
                        {principle.description}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>

        <Divider sx={{ my: 8, borderColor: alpha('#fff', 0.1) }} />

        {/* Our Values */}
        <Box sx={{ mb: 8 }}>
          <Typography 
            variant="h3" 
            fontWeight="bold" 
            gutterBottom
            sx={{
              background: 'linear-gradient(135deg, #00ED64 0%, #4DFF9F 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 4
            }}
          >
            Our Values
          </Typography>

          <Grid container spacing={3}>
            {values.map((value, index) => (
              <Grid item xs={12} sm={6} key={index}>
                <Paper
                  sx={{
                    bgcolor: alpha('#fff', 0.03),
                    border: `1px solid ${alpha('#fff', 0.1)}`,
                    borderRadius: 2,
                    p: 3,
                    height: '100%',
                  }}
                >
                  <Typography variant="h6" fontWeight="600" gutterBottom sx={{ color: '#00ED64', mb: 1.5 }}>
                    {value.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: alpha('#fff', 0.75), lineHeight: 1.7 }}>
                    {value.description}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>

        <Divider sx={{ my: 8, borderColor: alpha('#fff', 0.1) }} />

        {/* Brand Voice */}
        <Box sx={{ mb: 8 }}>
          <Typography 
            variant="h3" 
            fontWeight="bold" 
            gutterBottom
            sx={{
              background: 'linear-gradient(135deg, #00ED64 0%, #4DFF9F 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 4
            }}
          >
            Our Voice
          </Typography>

          <Paper
            sx={{
              bgcolor: alpha('#fff', 0.03),
              border: `1px solid ${alpha('#fff', 0.1)}`,
              borderRadius: 2,
              p: 4,
            }}
          >
            <Typography variant="body1" sx={{ color: alpha('#fff', 0.85), lineHeight: 1.8, mb: 3 }}>
              NetPad speaks with <strong>clarity, calm, precision, and confidence</strong>. We never hype. 
              We explain what we do, how it works, and where the boundaries are.
            </Typography>

            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" fontWeight="600" gutterBottom sx={{ color: '#00ED64', mb: 2 }}>
                Language We Use
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                {['Flow', 'Route', 'Connect', 'Trigger', 'Orchestrate', 'Govern', 'Transform', 'Audit'].map((word) => (
                  <Box
                    key={word}
                    sx={{
                      px: 2,
                      py: 1,
                      bgcolor: alpha('#00ED64', 0.1),
                      border: `1px solid ${alpha('#00ED64', 0.3)}`,
                      borderRadius: 1,
                      color: '#00ED64',
                      fontWeight: 500,
                      fontSize: '0.9rem',
                    }}
                  >
                    {word}
                  </Box>
                ))}
              </Box>
            </Box>

            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" fontWeight="600" gutterBottom sx={{ color: '#00ED64', mb: 2 }}>
                Language We Avoid
              </Typography>
              <Typography variant="body2" sx={{ color: alpha('#fff', 0.65), fontStyle: 'italic' }}>
                "Magic", "Just works", over-promising language, and anything that obscures how things actually function.
              </Typography>
            </Box>
          </Paper>
        </Box>

        <Divider sx={{ my: 8, borderColor: alpha('#fff', 0.1) }} />

        {/* Call to Action */}
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ color: '#fff', mb: 2 }}>
            Ready to design how data moves?
          </Typography>
          <Typography variant="body1" sx={{ color: alpha('#fff', 0.75), mb: 4, maxWidth: 600, mx: 'auto' }}>
            Start building forms, workflows, and data experiences that connect people and systems with governance built in.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              component={Link}
              href="/"
              variant="contained"
              size="large"
              sx={{
                bgcolor: '#00ED64',
                color: '#001E2B',
                fontWeight: 600,
                px: 4,
                py: 1.5,
                '&:hover': {
                  bgcolor: '#4DFF9F',
                },
              }}
            >
              Get Started
            </Button>
            <Button
              component={Link}
              href="/why-netpad"
              variant="outlined"
              size="large"
              sx={{
                borderColor: alpha('#00ED64', 0.5),
                color: '#00ED64',
                fontWeight: 600,
                px: 4,
                py: 1.5,
                '&:hover': {
                  borderColor: '#00ED64',
                  bgcolor: alpha('#00ED64', 0.1),
                },
              }}
            >
              Learn More
            </Button>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
