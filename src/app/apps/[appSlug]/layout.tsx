'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Box, Alert, Button } from '@mui/material';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useApplication } from '@/contexts/ApplicationContext';
import { AppNavBar, GLOBAL_BAR_HEIGHT } from '@/components/Navigation/AppNavBar';
import { AppSidebar, SIDEBAR_WIDTH, SIDEBAR_WIDTH_COLLAPSED, SIDEBAR_TRANSITION } from '@/components/Navigation/AppSidebar';
import { useSidebarSafe } from '@/contexts/SidebarContext';
import { PersistentApplicationBar } from '@/components/Navigation/ApplicationContextBar';
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
  const { isCollapsed } = useSidebarSafe();

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
        // Pass the app object directly in case it's not in the cache yet (e.g., newly created)
        await selectApplication(app.applicationId, { navigate: false, application: app });

        // Refresh applications in the background so the new app appears in the switcher
        refreshApplications();

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
            minHeight: `calc(100vh - ${GLOBAL_BAR_HEIGHT}px)`,
            gap: 2,
          }}
        >
          <NetPadLoader size="large" variant="ascii" message="Loading application..." />
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
            minHeight: `calc(100vh - ${GLOBAL_BAR_HEIGHT}px)`,
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

  // App resolved - render children with new navigation layout
  return (
    <Box sx={{ height: '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Zone 1: Global Bar */}
      <AppNavBar />

      {/* Zone 2 + Zone 3: Sidebar + Main Content */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Zone 2: App Sidebar (desktop only) */}
        <AppSidebar />

        {/* Zone 3: Main Content Area */}
        <Box
          component="main"
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            // Account for sidebar width on desktop (dynamic based on collapse state)
            width: {
              xs: '100%',
              md: `calc(100% - ${isCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH}px)`,
            },
            transition: SIDEBAR_TRANSITION,
          }}
        >
          {/* Zone 3A: App Header with tabs */}
          <PersistentApplicationBar />

          {/* Zone 3B: Content Area */}
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            {children}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
