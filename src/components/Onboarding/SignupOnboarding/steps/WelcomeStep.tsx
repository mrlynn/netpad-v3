'use client';

/**
 * WelcomeStep Component
 *
 * First step of signup onboarding - displays NetPad logo,
 * welcome message, and a single "Get Started" CTA.
 */

import React from 'react';
import {
  Box,
  Typography,
  Button,
  alpha,
  useTheme,
  Fade,
} from '@mui/material';
import { ArrowForward, Rocket } from '@mui/icons-material';

interface WelcomeStepProps {
  onContinue: () => void;
}

export function WelcomeStep({ onContinue }: WelcomeStepProps) {
  const theme = useTheme();

  return (
    <Fade in timeout={500}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        {/* Logo */}
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '20px',
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 4,
          }}
        >
          <Rocket sx={{ fontSize: 40, color: theme.palette.primary.main }} />
        </Box>

        {/* Welcome Message */}
        <Typography
          variant="h3"
          sx={{
            fontWeight: 700,
            mb: 2,
            background: `linear-gradient(135deg, ${theme.palette.text.primary} 0%, ${alpha(theme.palette.text.primary, 0.7)} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Welcome to NetPad
        </Typography>

        <Typography
          variant="h6"
          color="text.secondary"
          sx={{
            maxWidth: 400,
            mb: 6,
            fontWeight: 400,
          }}
        >
          Build MongoDB forms and workflows in minutes, not months.
        </Typography>

        {/* CTA Button */}
        <Button
          variant="contained"
          size="large"
          onClick={onContinue}
          endIcon={<ArrowForward />}
          sx={{
            px: 6,
            py: 1.5,
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '1.1rem',
          }}
        >
          Get Started
        </Button>
      </Box>
    </Fade>
  );
}
