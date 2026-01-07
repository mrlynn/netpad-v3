/**
 * Legacy Route: /workflows/[workflowId]
 * 
 * Redirects to new org/project structure
 */

'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useOrganization } from '@/contexts/OrganizationContext';
import { getOrgProjectUrl } from '@/lib/routing';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import { Box } from '@mui/material';

export default function WorkflowEditorRedirect() {
  const router = useRouter();
  const params = useParams();
  const { organization } = useOrganization();
  const workflowId = params.workflowId as string;

  useEffect(() => {
    if (!organization?.orgId) {
      router.replace('/settings');
      return;
    }

    const storedProjectId = localStorage.getItem('selected_project_id');
    
    const redirectToWorkflow = (projectId: string) => {
      router.replace(getOrgProjectUrl(organization.orgId, projectId, 'workflows', workflowId));
    };

    if (storedProjectId) {
      redirectToWorkflow(storedProjectId);
    } else {
      fetch(`/api/projects?orgId=${organization.orgId}`)
        .then(res => res.json())
        .then(data => {
          const projects = data.projects || [];
          if (projects.length > 0) {
            const defaultProject = projects.find((p: any) => p.slug === 'general') || projects[0];
            redirectToWorkflow(defaultProject.projectId);
          } else {
            router.replace(`/orgs/${organization.orgId}/projects`);
          }
        })
        .catch(() => {
          router.replace(`/orgs/${organization.orgId}/projects`);
        });
    }
  }, [organization, router, workflowId]);

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <NetPadLoader size="large" message="Redirecting..." />
    </Box>
  );
}
