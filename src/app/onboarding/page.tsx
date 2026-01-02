'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Skeleton,
  Avatar,
} from '@mui/material';
import {
  Person as PersonIcon,
  ContactPhone as ContactPhoneIcon,
  AccountBalance as AccountBalanceIcon,
  Computer as ComputerIcon,
  Description as DescriptionIcon,
  ArrowForward as ArrowForwardIcon,
  AccessTime as AccessTimeIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useBranding } from '@/contexts/OnboardingBrandingContext';
import ReactMarkdown from 'react-markdown';

const STEPS = [
  { icon: <PersonIcon />, text: 'Personal Information' },
  { icon: <ContactPhoneIcon />, text: 'Emergency Contacts' },
  { icon: <AccountBalanceIcon />, text: 'Payroll & Tax Setup' },
  { icon: <ComputerIcon />, text: 'IT Equipment Preferences' },
  { icon: <DescriptionIcon />, text: 'Policy Acknowledgments' },
];

export default function OnboardingLandingPage() {
  const router = useRouter();
  const { branding, isLoading } = useBranding();

  const handleStartOnboarding = () => {
    router.push('/onboarding/form');
  };

  if (isLoading) {
    return (
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Container maxWidth="md">
          <Paper elevation={0} sx={{ p: 6, textAlign: 'center', bgcolor: 'background.paper' }}>
            <Skeleton variant="rectangular" width={120} height={60} sx={{ mx: 'auto', mb: 3 }} />
            <Skeleton variant="text" width="60%" sx={{ mx: 'auto', mb: 2 }} />
            <Skeleton variant="text" width="80%" sx={{ mx: 'auto', mb: 1 }} />
            <Skeleton variant="text" width="70%" sx={{ mx: 'auto', mb: 4 }} />
            <Skeleton variant="rectangular" width={200} height={48} sx={{ mx: 'auto' }} />
          </Paper>
        </Container>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        py: { xs: 4, md: 8 },
      }}
    >
      <Container maxWidth="md">
        {/* Header with Logo */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          {branding.logoUrl ? (
            <Box
              component="img"
              src={branding.logoUrl}
              alt={branding.companyName}
              sx={{
                maxHeight: 80,
                maxWidth: 240,
                objectFit: 'contain',
                mb: 2,
              }}
            />
          ) : (
            <Avatar
              sx={{
                width: 80,
                height: 80,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                fontSize: '2rem',
                fontWeight: 700,
                mx: 'auto',
                mb: 2,
              }}
            >
              {branding.companyName.charAt(0)}
            </Avatar>
          )}
          <Typography variant="body2" color="text.secondary">
            {branding.companyName}
          </Typography>
        </Box>

        {/* Main Card */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, md: 5 },
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          {/* Welcome Title */}
          <Typography
            variant="h3"
            component="h1"
            gutterBottom
            sx={{
              fontWeight: 700,
              color: 'text.primary',
              textAlign: 'center',
              mb: 3,
            }}
          >
            {branding.welcomeTitle}
          </Typography>

          {/* Welcome Message */}
          <Box
            sx={{
              mb: 4,
              '& p': {
                color: 'text.secondary',
                lineHeight: 1.7,
                mb: 2,
              },
              '& strong': {
                color: 'text.primary',
                fontWeight: 600,
              },
              '& ul': {
                pl: 2,
              },
              '& li': {
                color: 'text.secondary',
                mb: 0.5,
              },
            }}
          >
            <ReactMarkdown>{branding.welcomeMessage}</ReactMarkdown>
          </Box>

          {/* Steps Preview */}
          <Paper
            variant="outlined"
            sx={{
              p: 3,
              mb: 4,
              bgcolor: 'grey.50',
              borderColor: 'grey.200',
            }}
          >
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <CheckCircleIcon color="primary" fontSize="small" />
              What you'll complete:
            </Typography>
            <List dense disablePadding>
              {STEPS.map((step, index) => (
                <ListItem key={index} disableGutters sx={{ py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 36, color: 'primary.main' }}>
                    {step.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={step.text}
                    primaryTypographyProps={{
                      variant: 'body2',
                      color: 'text.primary',
                    }}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>

          {/* Time Estimate */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              mb: 4,
              color: 'text.secondary',
            }}
          >
            <AccessTimeIcon fontSize="small" />
            <Typography variant="body2">Estimated time: 10-15 minutes</Typography>
          </Box>

          {/* CTA Button */}
          <Box sx={{ textAlign: 'center' }}>
            <Button
              variant="contained"
              size="large"
              endIcon={<ArrowForwardIcon />}
              onClick={handleStartOnboarding}
              sx={{
                px: 6,
                py: 1.5,
                fontSize: '1.1rem',
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                '&:hover': {
                  bgcolor: 'primary.dark',
                },
              }}
            >
              Start Onboarding
            </Button>
          </Box>
        </Paper>

        {/* Footer */}
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography variant="caption" color="text.secondary">
            Your information is securely stored and protected. Need help?{' '}
            <Box
              component="a"
              href="mailto:hr@company.com"
              sx={{ color: 'primary.main', textDecoration: 'none' }}
            >
              Contact HR
            </Box>
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
