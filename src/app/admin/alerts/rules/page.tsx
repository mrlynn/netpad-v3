import { redirect } from 'next/navigation';
import { Box, Typography, Breadcrumbs, Link as MuiLink } from '@mui/material';
import Link from 'next/link';
import { getSession } from '@/lib/auth/session';
import { isPlatformAdmin } from '@/lib/platform/users';
import { AlertRulesManager } from '@/components/Admin/AlertRulesManager';

export const metadata = {
  title: 'Alert Rules | Admin | NetPad',
  description: 'Configure alert rules and notification channels',
};

export default async function AlertRulesPage() {
  const session = await getSession();

  if (!session.userId) {
    redirect('/login');
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
        <MuiLink component={Link} href="/admin/alerts" underline="hover" color="inherit">
          Alerts
        </MuiLink>
        <Typography color="text.primary">Rules</Typography>
      </Breadcrumbs>

      <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
        <MuiLink
          component={Link}
          href="/admin/alerts"
          sx={{
            px: 2,
            py: 1,
            borderRadius: 1,
            bgcolor: 'action.hover',
            color: 'text.primary',
            textDecoration: 'none',
            fontWeight: 500,
            '&:hover': { bgcolor: 'action.selected' },
          }}
        >
          History
        </MuiLink>
        <MuiLink
          component={Link}
          href="/admin/alerts/rules"
          sx={{
            px: 2,
            py: 1,
            borderRadius: 1,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            textDecoration: 'none',
            fontWeight: 500,
          }}
        >
          Rules
        </MuiLink>
      </Box>

      <AlertRulesManager />
    </Box>
  );
}
