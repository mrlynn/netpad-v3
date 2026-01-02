'use client';

import { useEffect, useState } from 'react';
import { use } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Avatar,
  Divider,
  Skeleton,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  ContentCopy as ContentCopyIcon,
  Email as EmailIcon,
  Home as HomeIcon,
} from '@mui/icons-material';
import Confetti from 'react-confetti';
import ReactMarkdown from 'react-markdown';
import { useBranding } from '@/contexts/OnboardingBrandingContext';

interface PageProps {
  params: Promise<{ submissionId: string }>;
}

export default function OnboardingSuccessPage({ params }: PageProps) {
  const { submissionId } = use(params);
  const router = useRouter();
  const { branding, isLoading } = useBranding();
  const [showConfetti, setShowConfetti] = useState(true);
  const [copied, setCopied] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  // Get window size for confetti
  useEffect(() => {
    const updateSize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    updateSize();
    window.addEventListener('resize', updateSize);

    // Stop confetti after 5 seconds
    const timer = setTimeout(() => setShowConfetti(false), 5000);

    return () => {
      window.removeEventListener('resize', updateSize);
      clearTimeout(timer);
    };
  }, []);

  const handleCopyReference = async () => {
    try {
      await navigator.clipboard.writeText(submissionId.toUpperCase());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Container maxWidth="sm">
          <Paper elevation={0} sx={{ p: 6, textAlign: 'center' }}>
            <Skeleton variant="circular" width={80} height={80} sx={{ mx: 'auto', mb: 3 }} />
            <Skeleton variant="text" width="60%" sx={{ mx: 'auto', mb: 2 }} />
            <Skeleton variant="text" width="80%" sx={{ mx: 'auto', mb: 1 }} />
            <Skeleton variant="text" width="70%" sx={{ mx: 'auto' }} />
          </Paper>
        </Container>
      </Box>
    );
  }

  return (
    <>
      {/* Confetti Effect */}
      {showConfetti && windowSize.width > 0 && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={200}
          colors={[branding.primaryColor, '#00ED64', '#001E2B', '#1976d2', '#ff9800']}
        />
      )}

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          py: { xs: 4, md: 8 },
        }}
      >
        <Container maxWidth="sm">
          {/* Header with Logo */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            {branding.logoUrl ? (
              <Box
                component="img"
                src={branding.logoUrl}
                alt={branding.companyName}
                sx={{
                  maxHeight: 60,
                  maxWidth: 200,
                  objectFit: 'contain',
                  mb: 2,
                }}
              />
            ) : (
              <Avatar
                sx={{
                  width: 60,
                  height: 60,
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  mx: 'auto',
                  mb: 2,
                }}
              >
                {branding.companyName.charAt(0)}
              </Avatar>
            )}
          </Box>

          {/* Success Card */}
          <Paper
            elevation={0}
            sx={{
              p: { xs: 3, md: 5 },
              textAlign: 'center',
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            {/* Success Icon */}
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                bgcolor: 'success.light',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 3,
              }}
            >
              <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main' }} />
            </Box>

            {/* Title */}
            <Typography
              variant="h4"
              component="h1"
              gutterBottom
              sx={{ fontWeight: 700, color: 'text.primary' }}
            >
              {branding.successTitle}
            </Typography>

            {/* Message */}
            <Box
              sx={{
                mb: 4,
                '& p': {
                  color: 'text.secondary',
                  lineHeight: 1.7,
                  mb: 2,
                },
              }}
            >
              <ReactMarkdown>{branding.successMessage}</ReactMarkdown>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Reference Number */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Your Reference Number
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                  p: 2,
                  bgcolor: 'grey.100',
                  borderRadius: 2,
                }}
              >
                <Typography
                  variant="h5"
                  sx={{
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    letterSpacing: 2,
                    color: 'text.primary',
                  }}
                >
                  {submissionId.toUpperCase()}
                </Typography>
                <Tooltip title={copied ? 'Copied!' : 'Copy to clipboard'}>
                  <IconButton size="small" onClick={handleCopyReference}>
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Save this reference number for your records
              </Typography>
            </Box>

            {/* Next Steps */}
            <Paper
              variant="outlined"
              sx={{
                p: 3,
                mb: 4,
                bgcolor: 'info.light',
                borderColor: 'info.main',
                textAlign: 'left',
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'info.dark' }}>
                What happens next?
              </Typography>
              <Typography variant="body2" color="text.secondary">
                1. Our HR team will review your submission within 1-2 business days.
                <br />
                2. You'll receive an email confirmation shortly.
                <br />
                3. Check your email for next steps and your first-day schedule.
              </Typography>
            </Paper>

            {/* Actions */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<HomeIcon />}
                onClick={() => router.push('/onboarding')}
                sx={{ py: 1.5 }}
              >
                Back to Home
              </Button>
            </Box>
          </Paper>

          {/* Footer */}
          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Typography variant="caption" color="text.secondary">
              Questions? Contact{' '}
              <Box
                component="a"
                href="mailto:hr@company.com"
                sx={{ color: 'primary.main', textDecoration: 'none' }}
              >
                HR Support
              </Box>
            </Typography>
          </Box>
        </Container>
      </Box>
    </>
  );
}
