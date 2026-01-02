'use client';

import { useSearchParams } from 'next/navigation';
import { Box, Container, Paper, Typography, Button, Divider } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import Link from 'next/link';
import { Suspense } from 'react';

function SuccessContent() {
  const searchParams = useSearchParams();
  const submissionId = searchParams.get('id') || 'N/A';
  const name = searchParams.get('name') || 'there';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #001E2B 0%, #00303F 100%)',
      }}
    >
      <Container maxWidth="sm">
        <Paper elevation={3} sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
          <CheckCircleIcon sx={{ fontSize: 80, color: '#00ED64', mb: 2 }} />

          <Typography variant="h4" gutterBottom fontWeight="bold">
            Welcome aboard, {name}!
          </Typography>

          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Your onboarding information has been submitted successfully. Our HR team
            will review your details and reach out with next steps.
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 2, mb: 3 }}>
            <Typography variant="caption" color="text.secondary">
              Reference Number
            </Typography>
            <Typography variant="h6" fontFamily="monospace">
              {submissionId}
            </Typography>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Please save this reference number for your records. You&apos;ll receive a
            confirmation email shortly.
          </Typography>

          <Button
            component={Link}
            href="/"
            variant="outlined"
            sx={{ mr: 2 }}
          >
            Back to Home
          </Button>
          <Button
            component={Link}
            href="/onboarding"
            variant="contained"
            sx={{
              backgroundColor: '#00ED64',
              color: '#001E2B',
              '&:hover': { backgroundColor: '#00C853' },
            }}
          >
            Submit Another
          </Button>
        </Paper>
      </Container>
    </Box>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
