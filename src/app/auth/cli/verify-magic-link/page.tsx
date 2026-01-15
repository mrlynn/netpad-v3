'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Box, Typography } from '@mui/material';
import NetPadLoader from '@/components/common/NetPadLoader';

export default function VerifyMagicLinkPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('Verifying magic link...');

  useEffect(() => {
    const token = searchParams.get('token');
    const cliToken = searchParams.get('cliToken');

    console.log('[CLI Verify Page] URL params:', { 
      hasToken: !!token, 
      hasCliToken: !!cliToken,
      cliTokenPrefix: cliToken ? cliToken.substring(0, 8) + '...' : 'none'
    });

    if (!token) {
      setStatus('error');
      setMessage('Missing verification token');
      return;
    }

    // Call the API to verify the magic link
    const verifyLink = async () => {
      try {
        const apiUrl = `/api/auth/cli/magic-link/${token}${cliToken ? `?cliToken=${encodeURIComponent(cliToken)}` : ''}`;
        console.log('[CLI Verify Page] Calling API:', apiUrl.substring(0, 100) + '...');
        const response = await fetch(apiUrl);

        if (response.ok) {
          setStatus('success');
          setMessage('Magic link verified successfully! You can close this window and return to the CLI.');
        } else {
          const data = await response.json();
          setStatus('error');
          setMessage(data.error || 'Failed to verify magic link');
        }
      } catch (error: any) {
        setStatus('error');
        setMessage(error.message || 'An error occurred while verifying the link');
      }
    };

    verifyLink();
  }, [searchParams]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '2rem',
        backgroundColor: '#001E2B',
        color: '#ffffff',
      }}
    >
      <Box
        sx={{
          maxWidth: '480px',
          width: '100%',
          backgroundColor: '#0a2633',
          borderRadius: '12px',
          padding: '2rem',
          textAlign: 'center',
        }}
      >
        {status === 'verifying' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, py: 2 }}>
            <NetPadLoader size="large" message="Verifying magic link..." />
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#ffffff' }}>
              Verifying Magic Link
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              Please wait while we verify your magic link...
            </Typography>
          </Box>
        )}

        {status === 'success' && (
          <>
            <Box
              sx={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'rgba(0, 237, 100, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
              }}
            >
              <Typography sx={{ fontSize: '32px', color: '#00ED64' }}>✓</Typography>
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 600, marginBottom: '0.5rem', color: '#00ED64' }}>
              Success!
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              {message}
            </Typography>
          </>
        )}

        {status === 'error' && (
          <>
            <Box
              sx={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 152, 0, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
              }}
            >
              <Typography sx={{ fontSize: '32px', color: '#ff9800' }}>✕</Typography>
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 600, marginBottom: '0.5rem', color: '#ff9800' }}>
              Verification Failed
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              {message}
            </Typography>
          </>
        )}
      </Box>
    </Box>
  );
}
