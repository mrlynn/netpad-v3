/**
 * Legacy Route: /my-forms
 *
 * Redirects to app-centric /apps/[slug]/forms URL
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOrganization } from '@/contexts/OrganizationContext';
import { getAppUrl } from '@/lib/routing';
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

    // Get selected app from localStorage or fetch first available app
    const storedAppSlug = localStorage.getItem('selected_app_slug');

    // Check for valid slug (not null, undefined, empty, or literal "null" string)
    if (storedAppSlug && storedAppSlug !== 'null' && storedAppSlug !== 'undefined') {
      router.replace(getAppUrl(storedAppSlug, 'forms'));
    } else {
      // Fetch applications to get default
      fetch(`/api/applications?orgId=${organization.orgId}`)
        .then(res => res.json())
        .then(data => {
          const apps = data.applications || [];
          if (apps.length > 0) {
            const defaultApp = apps[0];
            // Only store and navigate if slug is valid
            if (defaultApp.slug && defaultApp.slug !== 'null') {
              localStorage.setItem('selected_app_slug', defaultApp.slug);
              router.replace(getAppUrl(defaultApp.slug, 'forms'));
            } else {
              // Invalid slug, redirect to projects
              router.replace(`/orgs/${organization.orgId}/projects`);
            }
          } else {
            // No apps, redirect to create one
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
