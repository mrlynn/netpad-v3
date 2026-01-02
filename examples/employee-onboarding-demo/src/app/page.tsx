'use client';

import { Box, Container, Typography, Button, Paper, Chip, Grid } from '@mui/material';
import { useRouter } from 'next/navigation';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import CodeIcon from '@mui/icons-material/Code';
import SpeedIcon from '@mui/icons-material/Speed';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

export default function HomePage() {
  const router = useRouter();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #001E2B 0%, #00303F 100%)',
      }}
    >
      {/* Hero Section */}
      <Container maxWidth="lg" sx={{ pt: 8, pb: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Chip
            label="Built with @netpad/forms"
            sx={{
              bgcolor: 'rgba(0, 237, 100, 0.2)',
              color: '#00ED64',
              fontWeight: 'bold',
              mb: 3,
            }}
          />
          <Typography variant="h2" fontWeight="bold" color="white" gutterBottom>
            Employee Onboarding Portal
          </Typography>
          <Typography variant="h5" sx={{ color: 'rgba(255,255,255,0.8)', maxWidth: 700, mx: 'auto' }}>
            A complete 3-page wizard with conditional logic, nested data, and validation —
            built in under 300 lines of code.
          </Typography>
        </Box>

        {/* Stats Row */}
        <Grid container spacing={3} sx={{ mb: 6 }}>
          {[
            { icon: <CodeIcon />, stat: '~80', label: 'Lines of Config' },
            { icon: <SpeedIcon />, stat: '3', label: 'Wizard Pages' },
            { icon: <CheckCircleOutlineIcon />, stat: '15+', label: 'Form Fields' },
          ].map((item, i) => (
            <Grid item xs={12} md={4} key={i}>
              <Paper
                sx={{
                  p: 3,
                  textAlign: 'center',
                  bgcolor: 'rgba(255,255,255,0.05)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <Box sx={{ color: '#00ED64', mb: 1 }}>{item.icon}</Box>
                <Typography variant="h3" fontWeight="bold" color="white">
                  {item.stat}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                  {item.label}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Main CTA Card */}
        <Paper
          elevation={3}
          sx={{
            p: 6,
            textAlign: 'center',
            borderRadius: 3,
            maxWidth: 600,
            mx: 'auto',
          }}
        >
          <PersonAddIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />

          <Typography variant="h4" gutterBottom fontWeight="bold">
            Try the Demo
          </Typography>

          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Experience a production-ready employee onboarding wizard. See how NetPad
            handles multi-page forms, conditional fields, validation, and nested data
            structures — all with minimal code.
          </Typography>

          <Button
            variant="contained"
            size="large"
            onClick={() => router.push('/onboarding')}
            sx={{
              px: 6,
              py: 1.5,
              fontSize: '1.1rem',
              backgroundColor: '#00ED64',
              color: '#001E2B',
              '&:hover': {
                backgroundColor: '#00C853',
              },
            }}
          >
            Start Onboarding Demo
          </Button>

          <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid #eee' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Want to see how this compares to building from scratch?
            </Typography>
            <Button
              variant="outlined"
              startIcon={<CompareArrowsIcon />}
              onClick={() => router.push('/why-netpad')}
              sx={{
                borderColor: '#001E2B',
                color: '#001E2B',
                '&:hover': {
                  borderColor: '#00ED64',
                  bgcolor: 'rgba(0, 237, 100, 0.1)',
                },
              }}
            >
              Why NetPad? See the Comparison
            </Button>
          </Box>
        </Paper>

        {/* Features List */}
        <Box sx={{ mt: 8, textAlign: 'center' }}>
          <Typography variant="h5" color="white" fontWeight="bold" gutterBottom>
            Features Demonstrated
          </Typography>
          <Grid container spacing={2} sx={{ mt: 2, maxWidth: 800, mx: 'auto' }}>
            {[
              'Multi-page wizard with progress bar',
              'Conditional field visibility',
              'Nested data structures',
              'Required field validation',
              'Multiple field types',
              'Section headers & layout',
              'Custom theming',
              'Type-safe configuration',
            ].map((feature, i) => (
              <Grid item xs={12} sm={6} md={3} key={i}>
                <Chip
                  icon={<CheckCircleOutlineIcon sx={{ color: '#00ED64 !important' }} />}
                  label={feature}
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.1)',
                    color: 'white',
                    width: '100%',
                    justifyContent: 'flex-start',
                    py: 2,
                  }}
                />
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Footer */}
        <Box sx={{ mt: 8, textAlign: 'center', pb: 4 }}>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
            Ready to build your own?{' '}
            <Typography
              component="code"
              sx={{
                bgcolor: 'rgba(255,255,255,0.1)',
                px: 1.5,
                py: 0.5,
                borderRadius: 1,
                color: '#00ED64',
              }}
            >
              npm install @netpad/forms
            </Typography>
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
