/**
 * Legacy Route: /projects
 * 
 * Redirects to new org/project structure
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOrganization } from '@/contexts/OrganizationContext';
import { getProjectsUrl } from '@/lib/routing';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import { Box } from '@mui/material';

export default function ProjectsRedirect() {
  const router = useRouter();
  const { organization } = useOrganization();

  useEffect(() => {
    if (!organization?.orgId) {
      router.replace('/settings');
      return;
    }

    router.replace(getProjectsUrl(organization.orgId));
  }, [organization, router]);

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <NetPadLoader size="large" message="Redirecting..." />
    </Box>
  );
}
