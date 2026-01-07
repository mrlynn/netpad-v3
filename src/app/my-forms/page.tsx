/**
 * Legacy Route: /my-forms
 * 
 * Redirects to new org/project structure
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOrganization } from '@/contexts/OrganizationContext';
import { getOrgProjectUrl } from '@/lib/routing';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import { Box } from '@mui/material';

export default function MyFormsRedirect() {
  const router = useRouter();
  const { organization } = useOrganization();

  useEffect(() => {
    if (!organization?.orgId) {
      // No org selected, redirect to settings
      router.replace('/settings');
      return;
    }

    // Get default project from localStorage or use first project
    const storedProjectId = localStorage.getItem('selected_project_id');
    
    if (storedProjectId) {
      router.replace(getOrgProjectUrl(organization.orgId, storedProjectId, 'forms'));
    } else {
      // Fetch projects to get default
      fetch(`/api/projects?orgId=${organization.orgId}`)
        .then(res => res.json())
        .then(data => {
          const projects = data.projects || [];
          if (projects.length > 0) {
            const defaultProject = projects.find((p: any) => p.slug === 'general') || projects[0];
            router.replace(getOrgProjectUrl(organization.orgId, defaultProject.projectId, 'forms'));
      } else {
            // No projects, redirect to projects page
            router.replace(`/orgs/${organization.orgId}/projects`);
          }
        })
        .catch(() => {
          router.replace(`/orgs/${organization.orgId}/projects`);
        });
    }
  }, [organization, router]);

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <NetPadLoader size="large" message="Redirecting..." />
    </Box>
  );
}
