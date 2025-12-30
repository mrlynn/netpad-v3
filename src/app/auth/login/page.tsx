'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  alpha,
  Divider,
  CircularProgress,
  Alert,
  Collapse,
  Checkbox,
  FormControlLabel,
  Chip,
  useTheme,
} from '@mui/material';
import {
  Email,
  Fingerprint,
  ArrowForward,
  CheckCircle,
  Key,
  DevicesOther,
  Home,
} from '@mui/icons-material';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

type LoginStep = 'email' | 'magic-link-sent' | 'passkey-prompt';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { sendMagicLink, loginWithPasskey, isAuthenticated, isLoading } = useAuth();

  // Get returnUrl from query params (for form access flow)
  const returnUrl = searchParams.get('returnUrl');

  const [step, setStep] = useState<LoginStep>('email');
  const [email, setEmail] = useState('');
  const [trustDevice, setTrustDevice] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPasskey, setHasPasskey] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      // Redirect to returnUrl if provided, otherwise to builder
      const destination = returnUrl ? decodeURIComponent(returnUrl) : '/builder';
      router.push(destination);
    }
  }, [isAuthenticated, isLoading, router, returnUrl]);

  // Check if passkeys are available on this device
  useEffect(() => {
    const checkPasskeySupport = async () => {
      if (window.PublicKeyCredential) {
        try {
          const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          setHasPasskey(available);
        } catch {
          setHasPasskey(false);
        }
      }
    };
    checkPasskeySupport();
  }, []);

  const handleSendMagicLink = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    setError(null);

    // Pass returnUrl so it's included in the magic link email
    const decodedReturnUrl = returnUrl ? decodeURIComponent(returnUrl) : undefined;
    const result = await sendMagicLink(email, decodedReturnUrl);

    setLoading(false);

    if (result.success) {
      setStep('magic-link-sent');
    } else {
      setError(result.message);
    }
  };

  const handlePasskeyLogin = async () => {
    setLoading(true);
    setError(null);

    const result = await loginWithPasskey(email || undefined);

    setLoading(false);

    if (result.success) {
      // Redirect to returnUrl if provided, otherwise to builder
      const destination = returnUrl ? decodeURIComponent(returnUrl) : '/builder';
      router.push(destination);
    } else {
      setError(result.message);
    }
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'background.default',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress sx={{ color: '#00ED64' }} />
      </Box>
    );
  }

  // Theme-aware colors
  const bgColor = isDark ? '#001E2B' : '#f5f7fa';
  const textColor = isDark ? '#fff' : '#1a1a2e';
  const textSecondary = isDark ? alpha('#fff', 0.6) : alpha('#000', 0.6);
  const textMuted = isDark ? alpha('#fff', 0.4) : alpha('#000', 0.4);
  const borderColor = isDark ? alpha('#fff', 0.1) : alpha('#000', 0.1);
  const inputBg = isDark ? alpha('#fff', 0.03) : alpha('#000', 0.02);
  const inputBgHover = isDark ? alpha('#fff', 0.05) : alpha('#000', 0.04);
  const paperBg = isDark ? alpha('#fff', 0.03) : '#ffffff';

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
          ? 'radial-gradient(ellipse at top, rgba(0, 237, 100, 0.08) 0%, transparent 50%)'
          : 'radial-gradient(ellipse at top, rgba(0, 237, 100, 0.15) 0%, transparent 50%)',
      }}
    >
      <Container maxWidth="sm">
        {/* Back to home */}
        <Box sx={{ mb: 3, textAlign: 'center' }}>
          <Button
            component={Link}
            href="/"
            startIcon={<Home />}
            sx={{
              color: textMuted,
              textTransform: 'none',
              '&:hover': { color: '#00ED64' },
            }}
          >
            Back to home
          </Button>
        </Box>

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
                width: 64,
                height: 64,
                borderRadius: 2,
                bgcolor: alpha('#00ED64', 0.15),
                mb: 2,
              }}
            >
              <Key sx={{ fontSize: 32, color: '#00ED64' }} />
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: textColor, mb: 1 }}>
              {step === 'magic-link-sent' ? 'Check Your Email' : 'Welcome'}
            </Typography>
            <Typography sx={{ color: textSecondary }}>
              {step === 'magic-link-sent'
                ? `We sent a login link to ${email}`
                : 'Sign in to NetPad'}
            </Typography>
          </Box>

          <Collapse in={!!error}>
            <Alert
              severity="error"
              onClose={() => setError(null)}
              sx={{ mb: 3, bgcolor: alpha('#f44336', 0.1), color: '#f44336' }}
            >
              {error}
            </Alert>
          </Collapse>

          {step === 'email' && (
            <>
              {/* Passkey Login Button (if supported) */}
              {hasPasskey && (
                <>
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    startIcon={loading ? <CircularProgress size={20} /> : <Fingerprint />}
                    onClick={handlePasskeyLogin}
                    disabled={loading}
                    sx={{
                      py: 1.5,
                      mb: 2,
                      background: 'linear-gradient(135deg, #00ED64 0%, #00CC55 100%)',
                      color: '#001E2B',
                      fontWeight: 600,
                      textTransform: 'none',
                      fontSize: '1rem',
                      borderRadius: 2,
                      '&:hover': {
                        background: 'linear-gradient(135deg, #00FF6A 0%, #00ED64 100%)',
                      },
                    }}
                  >
                    Sign in with Passkey
                  </Button>

                  <Box sx={{ display: 'flex', alignItems: 'center', my: 3 }}>
                    <Divider sx={{ flex: 1, borderColor: borderColor }} />
                    <Typography sx={{ px: 2, color: textMuted, fontSize: '0.875rem' }}>
                      or use email
                    </Typography>
                    <Divider sx={{ flex: 1, borderColor: borderColor }} />
                  </Box>
                </>
              )}

              {/* Email Input */}
              <TextField
                fullWidth
                type="email"
                label="Email address"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMagicLink()}
                disabled={loading}
                InputProps={{
                  startAdornment: <Email sx={{ mr: 1, color: textMuted }} />,
                }}
                sx={{
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    bgcolor: inputBg,
                    '&:hover': { bgcolor: inputBgHover },
                    '& fieldset': { borderColor: isDark ? alpha('#fff', 0.2) : alpha('#000', 0.2) },
                    '&:hover fieldset': { borderColor: isDark ? alpha('#fff', 0.3) : alpha('#000', 0.3) },
                    '&.Mui-focused fieldset': { borderColor: '#00ED64' },
                  },
                  '& .MuiInputLabel-root': { color: textMuted },
                  '& .MuiInputBase-input': { color: textColor },
                }}
              />

              {/* Trust Device Checkbox */}
              <FormControlLabel
                control={
                  <Checkbox
                    checked={trustDevice}
                    onChange={(e) => setTrustDevice(e.target.checked)}
                    sx={{
                      color: textMuted,
                      '&.Mui-checked': { color: '#00ED64' },
                    }}
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ color: isDark ? alpha('#fff', 0.7) : alpha('#000', 0.7), fontSize: '0.875rem' }}>
                      Trust this device for 30 days
                    </Typography>
                    <DevicesOther sx={{ fontSize: 16, color: textMuted }} />
                  </Box>
                }
                sx={{ mb: 3 }}
              />

              {/* Send Magic Link Button */}
              <Button
                fullWidth
                variant={hasPasskey ? 'outlined' : 'contained'}
                size="large"
                endIcon={loading ? <CircularProgress size={20} /> : <ArrowForward />}
                onClick={handleSendMagicLink}
                disabled={loading}
                sx={hasPasskey ? {
                  py: 1.5,
                  borderColor: isDark ? alpha('#fff', 0.3) : alpha('#000', 0.3),
                  color: textColor,
                  fontWeight: 600,
                  textTransform: 'none',
                  fontSize: '1rem',
                  borderRadius: 2,
                  '&:hover': {
                    borderColor: '#00ED64',
                    bgcolor: alpha('#00ED64', 0.1),
                  },
                } : {
                  py: 1.5,
                  background: 'linear-gradient(135deg, #00ED64 0%, #00CC55 100%)',
                  color: '#001E2B',
                  fontWeight: 600,
                  textTransform: 'none',
                  fontSize: '1rem',
                  borderRadius: 2,
                  '&:hover': {
                    background: 'linear-gradient(135deg, #00FF6A 0%, #00ED64 100%)',
                  },
                }}
              >
                Send Magic Link
              </Button>
            </>
          )}

          {step === 'magic-link-sent' && (
            <Box sx={{ textAlign: 'center' }}>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  bgcolor: alpha('#00ED64', 0.15),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 3,
                }}
              >
                <Email sx={{ fontSize: 40, color: '#00ED64' }} />
              </Box>

              <Typography sx={{ color: textSecondary, mb: 3 }}>
                Click the link in the email to sign in. The link expires in <strong style={{ color: '#00ED64' }}>5 minutes</strong>.
              </Typography>

              <Chip
                icon={<CheckCircle sx={{ fontSize: 16 }} />}
                label="Didn't receive it? Check your spam folder"
                sx={{
                  bgcolor: alpha('#ff9800', 0.1),
                  color: '#ff9800',
                  mb: 4,
                }}
              />

              <Button
                fullWidth
                variant="outlined"
                onClick={() => {
                  setStep('email');
                  setEmail('');
                }}
                sx={{
                  py: 1.5,
                  borderColor: isDark ? alpha('#fff', 0.2) : alpha('#000', 0.2),
                  color: isDark ? alpha('#fff', 0.7) : alpha('#000', 0.7),
                  textTransform: 'none',
                  borderRadius: 2,
                  '&:hover': {
                    borderColor: isDark ? alpha('#fff', 0.4) : alpha('#000', 0.4),
                    bgcolor: isDark ? alpha('#fff', 0.05) : alpha('#000', 0.05),
                  },
                }}
              >
                Use a different email
              </Button>
            </Box>
          )}

          {/* Security note */}
          <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid', borderColor: borderColor }}>
            <Typography
              variant="caption"
              sx={{ color: textMuted, display: 'block', textAlign: 'center' }}
            >
              No password required. We use secure magic links and passkeys for authentication.
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <Box
          sx={{
            minHeight: '100vh',
            bgcolor: 'background.default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CircularProgress sx={{ color: '#00ED64' }} />
        </Box>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
