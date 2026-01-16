'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useApplication } from '@/contexts/ApplicationContext';
import { getOrgProjectUrl } from '@/lib/routing';

/**
 * /apps/[appSlug]/settings
 *
 * This page redirects to the canonical application settings URL while maintaining
 * the application context. The simplified URL is for user convenience.
 */
export default function AppSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const appSlug = params.appSlug as string;

  const { currentOrgId, isLoading: isOrgLoading } = useOrganization();
  const { currentApplication, applications, isLoading: isAppLoading } = useApplication();

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Wait for data to load
    if (isOrgLoading || isAppLoading) return;

    // Find the app by slug
    const app = applications.find(a => a.slug === appSlug) || currentApplication;

    if (!app) {
      setError(`Application "${appSlug}" not found`);
      return;
    }

    if (!currentOrgId) {
      setError('No organization context');
      return;
    }

    // Redirect to canonical application settings URL
    const canonicalUrl = getOrgProjectUrl(
      currentOrgId,
      app.projectId,
      'applications',
      app.applicationId
    );
    router.replace(canonicalUrl);
  }, [appSlug, currentOrgId, currentApplication, applications, isOrgLoading, isAppLoading, router]);

  if (error) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 'calc(100vh - 48px)',
          gap: 2,
          p: 3,
        }}
      >
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 48px)',
        gap: 2,
      }}
    >
      <CircularProgress size={32} />
      <Typography variant="body2" color="text.secondary">
        Loading application settings...
      </Typography>
    </Box>
  );
}
