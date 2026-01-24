'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Container, Typography, Breadcrumbs, Link as MuiLink } from '@mui/material';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import { SystemStatusDashboard } from '@/components/Admin/SystemStatusDashboard';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { Home, NavigateNext } from '@mui/icons-material';

export default function SystemStatusPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  // Redirect non-admins
  useEffect(() => {
    if (!authLoading && (!user || user.platformRole !== 'admin')) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
        }}
      >
        <NetPadLoader size="large" variant="ascii" message="Loading..." />
      </Box>
    );
  }

  if (!user || user.platformRole !== 'admin') {
    return null;
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs
        separator={<NavigateNext fontSize="small" />}
        sx={{ mb: 3 }}
      >
        <MuiLink
          component={Link}
          href="/admin"
          underline="hover"
          color="inherit"
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
        >
          <Home fontSize="small" />
          Admin
        </MuiLink>
        <Typography color="text.primary">System Status</Typography>
      </Breadcrumbs>

      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          System Status
        </Typography>
        <Typography color="text.secondary">
          Monitor the health and performance of all platform services
        </Typography>
      </Box>

      {/* Dashboard */}
      <SystemStatusDashboard />
    </Container>
  );
}
