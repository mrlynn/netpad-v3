'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  alpha,
  CircularProgress,
  useTheme,
} from '@mui/material';
import {
  HourglassTop,
  Logout,
  Email,
  Support,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';

export default function WaitlistPendingPage() {
  const router = useRouter();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  // If user is approved, redirect to home
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      // If user is approved or has no waitlist status (legacy), redirect
      if (!user.waitlistStatus || user.waitlistStatus === 'approved') {
        router.push('/');
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  // Theme-aware colors
  const bgColor = isDark ? '#001E2B' : '#f5f7fa';
  const textColor = isDark ? '#fff' : '#1a1a2e';
  const textSecondary = isDark ? alpha('#fff', 0.6) : alpha('#000', 0.6);
  const textMuted = isDark ? alpha('#fff', 0.4) : alpha('#000', 0.4);
  const borderColor = isDark ? alpha('#fff', 0.1) : alpha('#000', 0.1);
  const paperBg = isDark ? alpha('#fff', 0.03) : '#ffffff';

  if (isLoading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: bgColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress sx={{ color: '#00ED64' }} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: bgColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        background: isDark
          ? 'radial-gradient(ellipse at top, rgba(255, 152, 0, 0.08) 0%, transparent 50%)'
          : 'radial-gradient(ellipse at top, rgba(255, 152, 0, 0.15) 0%, transparent 50%)',
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={isDark ? 0 : 2}
          sx={{
            p: { xs: 3, sm: 5 },
            bgcolor: paperBg,
            border: '1px solid',
            borderColor: borderColor,
            borderRadius: 3,
          }}
        >
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 80,
                height: 80,
                borderRadius: '50%',
                bgcolor: alpha('#ff9800', 0.15),
                mb: 3,
              }}
            >
              <HourglassTop sx={{ fontSize: 40, color: '#ff9800' }} />
            </Box>

            <Typography variant="h4" sx={{ fontWeight: 700, color: textColor, mb: 1 }}>
              You're on the Waitlist
            </Typography>

            <Typography sx={{ color: textSecondary, mb: 3 }}>
              Thanks for signing up! We're reviewing your application.
            </Typography>

            {user?.email && (
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 2,
                  py: 1,
                  borderRadius: 2,
                  bgcolor: isDark ? alpha('#fff', 0.05) : alpha('#000', 0.05),
                }}
              >
                <Email sx={{ fontSize: 18, color: textMuted }} />
                <Typography sx={{ color: textSecondary, fontSize: '0.9rem' }}>
                  {user.email}
                </Typography>
              </Box>
            )}
          </Box>

          {/* Info Section */}
          <Box
            sx={{
              bgcolor: alpha('#ff9800', 0.1),
              border: '1px solid',
              borderColor: alpha('#ff9800', 0.3),
              borderRadius: 2,
              p: 3,
              mb: 4,
            }}
          >
            <Typography sx={{ color: '#ff9800', fontWeight: 600, mb: 1 }}>
              What happens next?
            </Typography>
            <Typography sx={{ color: textSecondary, fontSize: '0.95rem', lineHeight: 1.7 }}>
              We're carefully onboarding users to ensure everyone has a great experience.
              You'll receive an email as soon as your access is approved - usually within 1-2 business days.
            </Typography>
          </Box>

          {/* Actions */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Button
              fullWidth
              variant="outlined"
              size="large"
              startIcon={<Support />}
              href="mailto:support@netpad.io"
              sx={{
                py: 1.5,
                borderColor: isDark ? alpha('#fff', 0.2) : alpha('#000', 0.2),
                color: textColor,
                textTransform: 'none',
                borderRadius: 2,
                '&:hover': {
                  borderColor: '#00ED64',
                  bgcolor: alpha('#00ED64', 0.1),
                },
              }}
            >
              Contact Support
            </Button>

            <Button
              fullWidth
              variant="text"
              size="large"
              startIcon={<Logout />}
              onClick={handleLogout}
              sx={{
                py: 1.5,
                color: textMuted,
                textTransform: 'none',
                borderRadius: 2,
                '&:hover': {
                  color: '#f44336',
                  bgcolor: alpha('#f44336', 0.1),
                },
              }}
            >
              Sign Out
            </Button>
          </Box>

          {/* Footer */}
          <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid', borderColor: borderColor }}>
            <Typography
              variant="caption"
              sx={{ color: textMuted, display: 'block', textAlign: 'center' }}
            >
              Questions? Reach out to us at{' '}
              <a
                href="mailto:support@netpad.io"
                style={{ color: '#00ED64', textDecoration: 'none' }}
              >
                support@netpad.io
              </a>
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
