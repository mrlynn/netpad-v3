import { redirect } from 'next/navigation';
import { Box, Typography, Breadcrumbs, Link as MuiLink, Tabs, Tab } from '@mui/material';
import Link from 'next/link';
import { getSession } from '@/lib/auth/session';
import { isPlatformAdmin } from '@/lib/platform/users';
import { AlertHistoryViewer } from '@/components/Admin/AlertHistoryViewer';

export const metadata = {
  title: 'Alerts | Admin | NetPad',
  description: 'View and manage platform alerts',
};

export default async function AlertsPage() {
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
        <Typography color="text.primary">Alerts</Typography>
      </Breadcrumbs>

      <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
        <MuiLink
          component={Link}
          href="/admin/alerts"
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
          History
        </MuiLink>
        <MuiLink
          component={Link}
          href="/admin/alerts/rules"
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
          Rules
        </MuiLink>
      </Box>

      <AlertHistoryViewer />
    </Box>
  );
}
