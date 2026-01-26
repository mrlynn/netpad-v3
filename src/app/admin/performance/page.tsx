/**
 * Admin Performance Dashboard
 *
 * Displays real-time performance metrics including:
 * - API response times (avg, p50, p95, p99)
 * - Client-side navigation timing
 * - Slow queries
 * - Route-by-route breakdown
 */

import { redirect } from 'next/navigation';
import { Box, Typography, Breadcrumbs, Link as MuiLink } from '@mui/material';
import Link from 'next/link';
import { getSession } from '@/lib/auth/session';
import { isPlatformAdmin } from '@/lib/platform/users';
import { PerformanceDashboard } from '@/components/Admin/PerformanceDashboard';

export const metadata = {
  title: 'Performance Dashboard | Admin | NetPad',
  description: 'Monitor API and client-side performance metrics',
};

export default async function PerformancePage() {
  const session = await getSession();

  if (!session.userId) {
    redirect('/auth/login');
  }

  const isAdmin = await isPlatformAdmin(session.userId);
  if (!isAdmin) {
    redirect('/');
  }

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs sx={{ mb: 3 }}>
        <MuiLink component={Link} href="/admin" underline="hover" color="inherit">
          Admin
        </MuiLink>
        <Typography color="text.primary">Performance</Typography>
      </Breadcrumbs>

      <PerformanceDashboard />
    </Box>
  );
}
