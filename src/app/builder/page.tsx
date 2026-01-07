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
  const { organization } = useOrganization();
  const formId = searchParams.get('formId');

  useEffect(() => {
    if (!organization?.orgId) {
      router.replace('/settings');
      return;
    }

    const storedProjectId = localStorage.getItem('selected_project_id');

    const redirectToBuilder = (projectId: string) => {
      const url = getOrgProjectUrl(organization.orgId, projectId, 'builder', formId || undefined);
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
  }, [organization, router, formId]);

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <NetPadLoader size="large" message="Redirecting..." />
    </Box>
  );
}

export default function BuilderRedirect() {
  return (
    <Suspense fallback={
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <NetPadLoader size="large" message="Loading..." />
      </Box>
    }>
      <BuilderRedirectContent />
    </Suspense>
  );
}
