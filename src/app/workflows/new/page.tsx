/**
 * Route: /workflows/new
 * 
 * Redirects to org/project workflow creation with template parameter preserved.
 * Handles the "Use Template" flow from template galleries.
 */

'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useOrganization } from '@/contexts/OrganizationContext';
import { getOrgProjectUrl } from '@/lib/routing';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import { Box } from '@mui/material';

export default function WorkflowNewRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { organization } = useOrganization();

  // Get template ID from query params
  const templateId = searchParams?.get('template') || '';

  useEffect(() => {
    if (!organization?.orgId) {
      // No org context - redirect to settings
      router.replace('/settings');
      return;
    }

    const storedProjectId = localStorage.getItem('selected_project_id');
    
    // Build the redirect URL with createNew and templateId
    const buildRedirectUrl = (orgId: string, projectId: string) => {
      const params = new URLSearchParams();
      params.set('createNew', 'true');
      if (templateId) {
        params.set('templateId', templateId);
      }
      return `${getOrgProjectUrl(orgId, projectId, 'workflows')}?${params.toString()}`;
    };

    if (storedProjectId) {
      router.replace(buildRedirectUrl(organization.orgId, storedProjectId));
    } else {
      // Fetch projects to find the default one
      fetch(`/api/projects?orgId=${organization.orgId}`)
        .then(res => res.json())
        .then(data => {
          const projects = data.projects || [];
          if (projects.length > 0) {
            const defaultProject = projects.find((p: any) => p.slug === 'general') || projects[0];
            router.replace(buildRedirectUrl(organization.orgId, defaultProject.projectId));
          } else {
            // No projects - go to projects page
            router.replace(`/orgs/${organization.orgId}/projects`);
          }
        })
        .catch(() => {
          router.replace(`/orgs/${organization.orgId}/projects`);
        });
    }
  }, [organization, router, templateId]);

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <NetPadLoader size="large" variant="ascii" />
    </Box>
  );
}
