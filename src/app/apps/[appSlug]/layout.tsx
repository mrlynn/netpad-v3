'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Box, CircularProgress, Typography, Alert, Button } from '@mui/material';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useApplication } from '@/contexts/ApplicationContext';
import { AppNavBar } from '@/components/Navigation/AppNavBar';
import { Application } from '@/types/application';

/**
 * Layout for /apps/[appSlug]/* routes
 *
 * This layout:
 * 1. Looks up the application by slug (via API if needed)
 * 2. Sets the organization and application context
 * 3. Renders the app navbar and children
 */
export default function AppSlugLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const router = useRouter();
  const appSlug = params.appSlug as string;

  const { currentOrgId, isLoading: isOrgLoading, selectOrganization } = useOrganization();
  const { applications, selectApplication, currentApplication, isLoading: isAppLoading, refreshApplications } = useApplication();

  const [isResolving, setIsResolving] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track if we've already resolved this slug to prevent re-runs
  const resolvedSlugRef = useRef<string | null>(null);
  const isResolvingRef = useRef(false);

  // Lookup app by slug via API (used when we don't have the app in context)
  const lookupAppBySlug = useCallback(async (slug: string): Promise<{ app: Application; orgId: string } | null> => {
    try {
      const response = await fetch(`/api/applications/by-slug/${encodeURIComponent(slug)}`);
      if (!response.ok) {
        return null;
      }
      const data = await response.json();
      return {
        app: data.application,
        orgId: data.organizationId,
      };
    } catch (err) {
      console.error('[AppSlugLayout] Failed to lookup app by slug:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    // Prevent concurrent resolution
    if (isResolvingRef.current) return;

    async function resolveApp() {
      // Wait for org context to load
      if (isOrgLoading) return;

      // If we've already resolved this slug and have a current app, we're done
      if (resolvedSlugRef.current === appSlug && currentApplication?.slug === appSlug) {
        setIsResolving(false);
        return;
      }

      isResolvingRef.current = true;

      try {
        // First, try to find the app in our loaded applications (if we have org context)
        let app = applications.find(a => a.slug === appSlug);
        let targetOrgId = currentOrgId;

        // If not found and we have apps loaded, it might be in a different org
        // If we have no apps (no org context), we need to look it up via API
        if (!app) {
          const result = await lookupAppBySlug(appSlug);
          if (result) {
            app = result.app;
            targetOrgId = result.orgId;

            // If the app is in a different org, switch to that org
            if (targetOrgId && targetOrgId !== currentOrgId) {
              await selectOrganization(targetOrgId);
              // After switching org, refresh applications to get the full list
              await refreshApplications();
            }
          }
        }

        if (!app) {
          setError(`Application "${appSlug}" not found.`);
          setIsResolving(false);
          isResolvingRef.current = false;
          return;
        }

        // Found the app - set it as current
        resolvedSlugRef.current = appSlug;

        // Select the application (without navigating)
        await selectApplication(app.applicationId, { navigate: false });
        setError(null);
        setIsResolving(false);
      } catch (err) {
        console.error('[AppSlugLayout] Error resolving app:', err);
        setError('Failed to load application');
        setIsResolving(false);
      } finally {
        isResolvingRef.current = false;
      }
    }

    resolveApp();
  }, [appSlug, currentOrgId, applications, isOrgLoading, currentApplication?.slug, selectOrganization, selectApplication, lookupAppBySlug, refreshApplications]);

  // Loading state
  if (isOrgLoading || isAppLoading || isResolving) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <AppNavBar />
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
            Loading application...
          </Typography>
        </Box>
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <AppNavBar />
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
          <Alert
            severity="error"
            sx={{ maxWidth: 500 }}
            action={
              <Button color="inherit" size="small" onClick={() => router.push('/')}>
                Go Home
              </Button>
            }
          >
            {error}
          </Alert>
        </Box>
      </Box>
    );
  }

  // App resolved - render children
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppNavBar />
      {children}
    </Box>
  );
}
