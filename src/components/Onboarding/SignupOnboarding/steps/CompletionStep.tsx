'use client';

/**
 * CompletionStep Component
 *
 * Final step - success message with actionable next step cards.
 */

import React from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  alpha,
  useTheme,
  Fade,
  Grow,
} from '@mui/material';
import {
  CheckCircle,
  Description,
  AccountTree,
  Apps,
  People,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useSignupOnboarding } from '@/contexts/SignupOnboardingContext';

interface ActionCard {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  primary?: boolean;
}

const ACTION_CARDS: ActionCard[] = [
  {
    icon: <Description />,
    title: 'Create your first form',
    description: 'Design forms that save directly to MongoDB.',
    href: '/builder',
    primary: true,
  },
  {
    icon: <AccountTree />,
    title: 'Build a workflow',
    description: 'Automate actions when forms are submitted.',
    href: '/workflows',
  },
  {
    icon: <Apps />,
    title: 'Explore templates',
    description: 'Start with pre-built forms and workflows.',
    href: '/templates',
  },
  {
    icon: <People />,
    title: 'Invite team members',
    description: 'Collaborate with your team on forms.',
    href: '/settings?tab=organizations',
  },
];

interface CompletionStepProps {
  onComplete: () => void;
}

export function CompletionStep({ onComplete }: CompletionStepProps) {
  const theme = useTheme();
  const router = useRouter();
  const { complete, organizationId } = useSignupOnboarding();

  const handleCardClick = async (href: string) => {
    await complete();
    router.push(href);
  };

  const handleOpenApp = async () => {
    await complete();
    onComplete();
    router.push('/');
  };

  return (
    <Fade in timeout={500}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: 600,
          mx: 'auto',
        }}
      >
        {/* Success Icon */}
        <Grow in timeout={700}>
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              bgcolor: alpha(theme.palette.success.main, 0.1),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 3,
            }}
          >
            <CheckCircle
              sx={{ fontSize: 48, color: theme.palette.success.main }}
            />
          </Box>
        </Grow>

        {/* Header */}
        <Typography
          variant="h3"
          sx={{ fontWeight: 700, mb: 1, textAlign: 'center' }}
        >
          You're all set!
        </Typography>

        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ mb: 5, textAlign: 'center' }}
        >
          Your workspace is ready. Here's what you can do next.
        </Typography>

        {/* Action Cards */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {ACTION_CARDS.map((card, index) => (
            <Grid item xs={12} sm={6} key={card.title}>
              <Grow in timeout={800 + index * 100}>
                <Paper
                  elevation={0}
                  onClick={() => handleCardClick(card.href)}
                  sx={{
                    p: 2.5,
                    height: '100%',
                    border: '1px solid',
                    borderColor: card.primary
                      ? theme.palette.primary.main
                      : 'divider',
                    borderRadius: 3,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    bgcolor: card.primary
                      ? alpha(theme.palette.primary.main, 0.02)
                      : 'background.paper',
                    '&:hover': {
                      borderColor: theme.palette.primary.main,
                      bgcolor: alpha(theme.palette.primary.main, 0.04),
                      transform: 'translateY(-2px)',
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 2,
                      color: theme.palette.primary.main,
                    }}
                  >
                    {card.icon}
                  </Box>
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 600, mb: 0.5 }}
                  >
                    {card.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontSize: 13 }}
                  >
                    {card.description}
                  </Typography>
                </Paper>
              </Grow>
            </Grid>
          ))}
        </Grid>

        {/* Open App Button */}
        <Button
          variant="contained"
          size="large"
          onClick={handleOpenApp}
          sx={{
            px: 6,
            py: 1.5,
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '1rem',
          }}
        >
          Open NetPad
        </Button>
      </Box>
    </Fade>
  );
}
