/**
 * Legacy Route: /builder
 *
 * Redirects to new org/project structure
 */

'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useOrganization } from '@/contexts/OrganizationContext';
import { getOrgProjectUrl } from '@/lib/routing';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import { Box } from '@mui/material';

function BuilderRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { organization, isLoading } = useOrganization();
  const formId = searchParams.get('formId');
  const restore = searchParams.get('restore');
  const templateId = searchParams.get('template');

  useEffect(() => {
    // Wait for organization context to finish loading
    if (isLoading) {
      return;
    }

    if (!organization?.orgId) {
      // If restoring a form or loading template and no org exists yet, preserve the param
      if (restore === 'true') {
        router.replace('/settings?restore=true');
      } else if (templateId) {
        router.replace(`/settings?template=${templateId}`);
      } else {
        router.replace('/settings');
      }
      return;
    }

    const storedProjectId = localStorage.getItem('selected_project_id');

    const redirectToBuilder = (projectId: string) => {
      let url = getOrgProjectUrl(organization.orgId, projectId, 'builder', formId || undefined);
      // Preserve restore param for landing page form restoration
      if (restore === 'true') {
        url += (url.includes('?') ? '&' : '?') + 'restore=true';
      }
      // Preserve template param
      if (templateId) {
        url += (url.includes('?') ? '&' : '?') + `template=${templateId}`;
      }
      router.replace(url);
    };

    if (storedProjectId) {
      redirectToBuilder(storedProjectId);
    } else {
      fetch(`/api/projects?orgId=${organization.orgId}`)
        .then(res => res.json())
        .then(data => {
          const projects = data.projects || [];
          if (projects.length > 0) {
            const defaultProject = projects.find((p: any) => p.slug === 'general') || projects[0];
            redirectToBuilder(defaultProject.projectId);
          } else {
            router.replace(`/orgs/${organization.orgId}/projects`);
          }
        })
        .catch(() => {
          router.replace(`/orgs/${organization.orgId}/projects`);
        });
    }
  }, [organization, router, formId, restore, templateId, isLoading]);

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <NetPadLoader size="large" variant="ascii" />
    </Box>
  );
}

export default function BuilderRedirect() {
  return (
    <Suspense fallback={
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <NetPadLoader size="large" variant="ascii" message="Loading..." />
      </Box>
    }>
      <BuilderRedirectContent />
    </Suspense>
  );
}
