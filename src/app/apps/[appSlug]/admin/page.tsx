'use client';

import { Box, Container, Typography, Alert, CircularProgress } from '@mui/material';
import { useApplication } from '@/contexts/ApplicationContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { OrgAnalyticsDashboard } from '@/components/Admin';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

/**
 * /apps/[appSlug]/admin
 *
 * Organization Admin Dashboard page.
 * Shows analytics and metrics for org admins.
 */
export default function AppAdminPage() {
  const { currentOrgId, organization } = useOrganization();
  const { currentApplication, isLoading: isAppLoading } = useApplication();

  // Check if user has admin access
  const { data: accessData, isLoading: isAccessLoading } = useSWR(
    currentOrgId ? `/api/orgs/${currentOrgId}/analytics?days=1` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  if (isAppLoading || isAccessLoading) {
    return (
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <NetPadLoader fullPage variant="ascii" message="Loading admin dashboard..." />
      </Box>
    );
  }

  if (!currentApplication) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">Application not found</Alert>
      </Container>
    );
  }

  if (!currentOrgId) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">Organization context not available</Alert>
      </Container>
    );
  }

  // Check if access was denied (403 error)
  if (accessData && !accessData.success && accessData.error?.includes('access')) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          You do not have admin access to this organization. Admin access is required to view the dashboard.
        </Alert>
      </Container>
    );
  }

  return (
    <Box sx={{ flex: 1, bgcolor: 'background.default', overflow: 'auto' }}>
      <OrgAnalyticsDashboard
        orgId={currentOrgId}
        orgName={organization?.name}
      />
    </Box>
  );
}
