import { redirect } from 'next/navigation';
import { Box, Typography, Breadcrumbs, Link as MuiLink } from '@mui/material';
import Link from 'next/link';
import { getSession } from '@/lib/auth/session';
import { isPlatformAdmin } from '@/lib/platform/users';
import { BroadcastManager } from '@/components/Admin/BroadcastManager';

export const metadata = {
  title: 'Broadcasts | Admin | NetPad',
  description: 'Manage system announcements and broadcasts',
};

export default async function BroadcastsPage() {
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
        <Typography color="text.primary">Broadcasts</Typography>
      </Breadcrumbs>

      <BroadcastManager />
    </Box>
  );
}
