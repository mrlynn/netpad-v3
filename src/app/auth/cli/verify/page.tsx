'use client';

/**
 * CLI Device Flow - Verification Page
 * 
 * User enters the code displayed by the CLI to authorize access.
 */

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  Terminal as TerminalIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';

export default function CLIVerifyPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [code, setCode] = useState(searchParams.get('code') || '');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Check if user is authenticated
  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => setIsAuthenticated(data?.authenticated === true))
      .catch(() => setIsAuthenticated(false));
  }, []);

  // Auto-submit if code is in URL and user is authenticated
  useEffect(() => {
    if (code && isAuthenticated === true && status === 'idle') {
      handleAuthorize();
    }
  }, [code, isAuthenticated]);

  const handleAuthorize = async () => {
    if (!code.trim()) {
      setError('Please enter the code from your terminal');
      return;
    }

    setStatus('loading');
    setError('');

    try {
      const response = await fetch('/api/auth/cli/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_code: code.toUpperCase() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authorization failed');
      }

      setStatus('success');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Authorization failed');
    }
  };

  const handleLogin = () => {
    // Redirect to login with return URL
    const returnUrl = `/auth/cli/verify?code=${code}`;
    router.push(`/auth/login?redirect=${encodeURIComponent(returnUrl)}`);
  };

  // Loading auth state
  if (isAuthenticated === null) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress />
          <Typography sx={{ mt: 2 }} color="text.secondary">
            Loading...
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper sx={{ p: 4 }}>
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <TerminalIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
          <Typography variant="h4" gutterBottom>
            Authorize CLI
          </Typography>
          <Typography color="text.secondary">
            Enter the code displayed in your terminal to authorize the NetPad CLI.
          </Typography>
        </Box>

        {/* Success State */}
        {status === 'success' && (
          <Alert 
            severity="success" 
            icon={<CheckCircleIcon />}
            sx={{ mb: 3 }}
          >
            <Typography variant="subtitle1" fontWeight={600}>
              CLI Authorized Successfully!
            </Typography>
            <Typography variant="body2">
              You can close this window and return to your terminal.
            </Typography>
          </Alert>
        )}

        {/* Error State */}
        {status === 'error' && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Not Authenticated */}
        {!isAuthenticated && status !== 'success' && (
          <>
            <Alert severity="warning" sx={{ mb: 3 }}>
              You need to log in first to authorize the CLI.
            </Alert>
            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={handleLogin}
            >
              Log In to Continue
            </Button>
          </>
        )}

        {/* Authenticated - Show Form */}
        {isAuthenticated && status !== 'success' && (
          <>
            <TextField
              fullWidth
              label="Enter Code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="XXXXXXXX"
              inputProps={{ 
                maxLength: 8,
                style: { 
                  textAlign: 'center', 
                  fontSize: '1.5rem',
                  letterSpacing: '0.3em',
                  fontFamily: 'monospace',
                },
              }}
              sx={{ mb: 3 }}
              disabled={status === 'loading'}
            />

            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={handleAuthorize}
              disabled={status === 'loading' || !code.trim()}
            >
              {status === 'loading' ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Authorizing...
                </>
              ) : (
                'Authorize CLI'
              )}
            </Button>

            <Divider sx={{ my: 3 }} />

            <Typography variant="body2" color="text.secondary" textAlign="center">
              This will create an API key for CLI access. You can revoke it anytime
              from your account settings.
            </Typography>
          </>
        )}
      </Paper>
    </Container>
  );
}
