'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, CircularProgress } from '@mui/material';
import { getAppUrl } from '@/lib/routing';

interface LegacyFormRedirectProps {
  orgId: string;
  projectId: string;
  formId?: string;
}

/**
 * Redirects from legacy /orgs/.../projects/.../forms URLs to app-centric /apps/[slug]/forms URLs.
 * If the form belongs to an application, redirects to that app's forms page.
 * If no application is found, redirects to the first available app.
 */
export function LegacyFormRedirect({ orgId, projectId, formId }: LegacyFormRedirectProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function findAppAndRedirect() {
      try {
        // If we have a formId, try to find which application owns it
        if (formId) {
          const formRes = await fetch(`/api/forms/${formId}?orgId=${orgId}`);
          const formData = await formRes.json();

          if (formData.form?.applicationId) {
            // Find the application to get its slug
            const appsRes = await fetch(`/api/applications?orgId=${orgId}&projectId=${projectId}`);
            const appsData = await appsRes.json();
            const app = appsData.applications?.find((a: any) => a.applicationId === formData.form.applicationId);

            if (app?.slug) {
              router.replace(getAppUrl(app.slug, 'forms') + `/${formId}`);
              return;
            }
          }
        }

        // No specific form or form doesn't have an app - get the first/default app
        const appsRes = await fetch(`/api/applications?orgId=${orgId}&projectId=${projectId}`);
        const appsData = await appsRes.json();

        if (appsData.applications?.length > 0) {
          const defaultApp = appsData.applications[0];
          const targetUrl = formId
            ? getAppUrl(defaultApp.slug, 'forms') + `/${formId}`
            : getAppUrl(defaultApp.slug, 'forms');
          router.replace(targetUrl);
        } else {
          setError('No applications found. Please create an application first.');
        }
      } catch (err) {
        console.error('Error during redirect:', err);
        setError('Failed to redirect. Please try again.');
      }
    }

    findAppAndRedirect();
  }, [orgId, projectId, formId, router]);

  if (error) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 2 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 2 }}>
      <CircularProgress />
      <Typography color="text.secondary">Redirecting...</Typography>
    </Box>
  );
}

/**
 * Redirects from legacy workflow URLs to app-centric URLs.
 */
export function LegacyWorkflowRedirect({ orgId, projectId, workflowId }: { orgId: string; projectId: string; workflowId?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function findAppAndRedirect() {
      try {
        // If we have a workflowId, try to find which application owns it
        if (workflowId) {
          const wfRes = await fetch(`/api/workflows/${workflowId}?orgId=${orgId}&projectId=${projectId}`);
          const wfData = await wfRes.json();

          if (wfData.workflow?.applicationId) {
            const appsRes = await fetch(`/api/applications?orgId=${orgId}&projectId=${projectId}`);
            const appsData = await appsRes.json();
            const app = appsData.applications?.find((a: any) => a.applicationId === wfData.workflow.applicationId);

            if (app?.slug) {
              router.replace(getAppUrl(app.slug, 'workflows') + `/${workflowId}`);
              return;
            }
          }
        }

        // Get the first/default app
        const appsRes = await fetch(`/api/applications?orgId=${orgId}&projectId=${projectId}`);
        const appsData = await appsRes.json();

        if (appsData.applications?.length > 0) {
          const defaultApp = appsData.applications[0];
          const targetUrl = workflowId
            ? getAppUrl(defaultApp.slug, 'workflows') + `/${workflowId}`
            : getAppUrl(defaultApp.slug, 'workflows');
          router.replace(targetUrl);
        } else {
          setError('No applications found. Please create an application first.');
        }
      } catch (err) {
        console.error('Error during redirect:', err);
        setError('Failed to redirect. Please try again.');
      }
    }

    findAppAndRedirect();
  }, [orgId, projectId, workflowId, router]);

  if (error) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 2 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 2 }}>
      <CircularProgress />
      <Typography color="text.secondary">Redirecting...</Typography>
    </Box>
  );
}
