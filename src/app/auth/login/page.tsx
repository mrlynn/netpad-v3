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
  Google,
  GitHub,
} from '@mui/icons-material';
import Link from 'next/link';
import Image from 'next/image';
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
  const [oauthProviders, setOauthProviders] = useState<{ google: boolean; github: boolean }>({ google: false, github: false });

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

  // Check which OAuth providers are available
  useEffect(() => {
    const checkOAuthProviders = async () => {
      try {
        const response = await fetch('/api/auth/oauth/providers');
        if (response.ok) {
          const data = await response.json();
          setOauthProviders(data.providers);
        }
      } catch {
        // OAuth not available
      }
    };
    checkOAuthProviders();
  }, []);

  const handleOAuthLogin = (provider: 'google' | 'github') => {
    // Build the OAuth URL with optional returnUrl
    let oauthUrl = `/api/auth/oauth/${provider}`;
    if (returnUrl) {
      oauthUrl += `?redirectTo=${encodeURIComponent(decodeURIComponent(returnUrl))}`;
    }
    window.location.href = oauthUrl;
  };

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

              {/* OAuth Providers */}
              {(oauthProviders.google || oauthProviders.github) && (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', my: 3 }}>
                    <Divider sx={{ flex: 1, borderColor: borderColor }} />
                    <Typography sx={{ px: 2, color: textMuted, fontSize: '0.875rem' }}>
                      or continue with
                    </Typography>
                    <Divider sx={{ flex: 1, borderColor: borderColor }} />
                  </Box>

                  <Box sx={{ display: 'flex', gap: 2 }}>
                    {oauthProviders.google && (
                      <Button
                        fullWidth
                        variant="outlined"
                        size="large"
                        startIcon={
                          <Box
                            component="svg"
                            viewBox="0 0 24 24"
                            sx={{ width: 20, height: 20 }}
                          >
                            <path
                              fill="#4285F4"
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                              fill="#34A853"
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                              fill="#FBBC05"
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            />
                            <path
                              fill="#EA4335"
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                          </Box>
                        }
                        onClick={() => handleOAuthLogin('google')}
                        disabled={loading}
                        sx={{
                          py: 1.5,
                          borderColor: isDark ? alpha('#fff', 0.2) : alpha('#000', 0.2),
                          color: textColor,
                          fontWeight: 500,
                          textTransform: 'none',
                          fontSize: '0.9rem',
                          borderRadius: 2,
                          '&:hover': {
                            borderColor: isDark ? alpha('#fff', 0.4) : alpha('#000', 0.4),
                            bgcolor: isDark ? alpha('#fff', 0.05) : alpha('#000', 0.05),
                          },
                        }}
                      >
                        Google
                      </Button>
                    )}

                    {oauthProviders.github && (
                      <Button
                        fullWidth
                        variant="outlined"
                        size="large"
                        startIcon={<GitHub />}
                        onClick={() => handleOAuthLogin('github')}
                        disabled={loading}
                        sx={{
                          py: 1.5,
                          borderColor: isDark ? alpha('#fff', 0.2) : alpha('#000', 0.2),
                          color: textColor,
                          fontWeight: 500,
                          textTransform: 'none',
                          fontSize: '0.9rem',
                          borderRadius: 2,
                          '&:hover': {
                            borderColor: isDark ? alpha('#fff', 0.4) : alpha('#000', 0.4),
                            bgcolor: isDark ? alpha('#fff', 0.05) : alpha('#000', 0.05),
                          },
                        }}
                      >
                        GitHub
                      </Button>
                    )}
                  </Box>
                </>
              )}
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
