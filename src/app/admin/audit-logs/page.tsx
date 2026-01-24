import { redirect } from 'next/navigation';
import { Box, Typography, Breadcrumbs, Link as MuiLink } from '@mui/material';
import Link from 'next/link';
import { getSession } from '@/lib/auth/session';
import { isPlatformAdmin } from '@/lib/platform/users';
import { AuditLogViewer } from '@/components/Admin/AuditLogViewer';

export const metadata = {
  title: 'Audit Logs | Admin | NetPad',
  description: 'View and search platform audit logs',
};

export default async function AuditLogsPage() {
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
        <Typography color="text.primary">Audit Logs</Typography>
      </Breadcrumbs>

      <AuditLogViewer />
    </Box>
  );
}
