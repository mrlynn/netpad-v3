'use client';

import { Box, Paper, Typography, Button, alpha } from '@mui/material';
import { Rocket, Login } from '@mui/icons-material';

interface WelcomeScreenProps {
  /** Optional title override - defaults to "Welcome to NetPad" */
  title?: string;
  /** Optional subtitle override */
  subtitle?: string;
  /** Optional description override */
  description?: string;
}

/**
 * Welcome screen shown to unauthenticated users who need to sign in
 * before they can create a workspace or use the app.
 */
export function WelcomeScreen({
  title = 'Welcome to NetPad',
  subtitle = 'Build forms, automate workflows, and explore your MongoDB data',
  description = 'Sign in to create your workspace and start building',
}: WelcomeScreenProps) {
  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
        bgcolor: 'background.default',
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 500,
          borderRadius: 3,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: 3,
            textAlign: 'center',
            background: `linear-gradient(135deg, ${alpha('#00ED64', 0.15)} 0%, ${alpha('#00ED64', 0.02)} 100%)`,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Rocket sx={{ fontSize: 48, color: '#00ED64', mb: 1 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        </Box>

        {/* Content */}
        <Box sx={{ p: 3 }}>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
            {description}
          </Typography>

          <Button
            fullWidth
            variant="contained"
            size="large"
            href="/auth/login"
            startIcon={<Login />}
            sx={{
              bgcolor: '#00ED64',
              color: '#001E2B',
              fontWeight: 600,
              '&:hover': { bgcolor: '#00c853' },
            }}
          >
            Sign In to Get Started
          </Button>

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', textAlign: 'center', mt: 2 }}
          >
            Free to use • No credit card required
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
