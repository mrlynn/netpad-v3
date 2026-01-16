'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useApplication } from '@/contexts/ApplicationContext';
import { getOrgProjectUrl } from '@/lib/routing';

/**
 * Hook for auto-navigating authenticated users to their last application
 *
 * Logic:
 * 1. If user has a deep link (specific URL), respect that
 * 2. If user has a last-used application, go there
 * 3. If user has exactly one application, go to that
 * 4. Otherwise, stay on current page (show app switcher or landing)
 */
export interface UseAutoNavigateOptions {
  /** Skip auto-navigation (e.g., if on a specific page that shouldn't redirect) */
  disabled?: boolean;
  /** Pages that should not trigger auto-navigation */
  excludePaths?: string[];
  /** Callback when navigation is triggered */
  onNavigate?: (path: string) => void;
}

export interface UseAutoNavigateResult {
  /** Whether auto-navigation is in progress */
  isNavigating: boolean;
  /** Whether we're still determining where to navigate */
  isResolving: boolean;
  /** The destination URL (if resolved) */
  destination: string | null;
  /** Manually trigger navigation to last app */
  navigateToLastApp: () => Promise<void>;
  /** Whether user should see app selection (no auto-nav target) */
  shouldShowAppSelection: boolean;
}

const DEFAULT_EXCLUDE_PATHS = [
  '/auth',
  '/settings',
  '/api-playground',
  '/pricing',
  '/admin',
  '/apps/', // Already in an app context
  '/orgs/', // Already in org/project context
];

export function useAutoNavigateToApp(
  options: UseAutoNavigateOptions = {}
): UseAutoNavigateResult {
  const { disabled = false, excludePaths = DEFAULT_EXCLUDE_PATHS, onNavigate } = options;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { organization, currentOrgId, isLoading: isOrgLoading } = useOrganization();
  const {
    currentApplication,
    applications,
    recentApplications,
    isLoading: isAppLoading,
  } = useApplication();

  const [isNavigating, setIsNavigating] = useState(false);
  const [destination, setDestination] = useState<string | null>(null);
  const [hasAttemptedNavigation, setHasAttemptedNavigation] = useState(false);

  // Check if current path should be excluded from auto-navigation
  const isExcludedPath = excludePaths.some(path => pathname.startsWith(path));

  // Check if there's a redirect parameter in the URL
  const redirectParam = searchParams.get('redirect');

  // Overall loading state
  const isResolving = isAuthLoading || isOrgLoading || isAppLoading;

  // Determine if we should show app selection
  const shouldShowAppSelection =
    !isResolving &&
    isAuthenticated &&
    !currentApplication &&
    applications.length > 1 &&
    !destination;

  /**
   * Navigate to a specific application
   */
  const navigateToApp = useCallback(
    (appId: string) => {
      const app = applications.find(a => a.applicationId === appId);
      if (!app || !currentOrgId) return null;

      const url = getOrgProjectUrl(currentOrgId, app.projectId, 'applications', app.applicationId);
      return url;
    },
    [applications, currentOrgId]
  );

  /**
   * Navigate to the last-used or default application
   */
  const navigateToLastApp = useCallback(async () => {
    if (!currentOrgId || applications.length === 0) return;

    setIsNavigating(true);

    try {
      let targetUrl: string | null = null;

      // Priority 1: Recent applications (last accessed)
      if (recentApplications.length > 0) {
        const lastApp = recentApplications[0];
        targetUrl = navigateToApp(lastApp.applicationId);
      }

      // Priority 2: Current application in context
      if (!targetUrl && currentApplication) {
        targetUrl = navigateToApp(currentApplication.applicationId);
      }

      // Priority 3: Single application - auto-select
      if (!targetUrl && applications.length === 1) {
        targetUrl = navigateToApp(applications[0].applicationId);
      }

      // Priority 4: First application as fallback
      if (!targetUrl && applications.length > 0) {
        targetUrl = navigateToApp(applications[0].applicationId);
      }

      if (targetUrl) {
        setDestination(targetUrl);
        onNavigate?.(targetUrl);
        router.push(targetUrl);
      }
    } finally {
      setIsNavigating(false);
    }
  }, [
    currentOrgId,
    applications,
    recentApplications,
    currentApplication,
    navigateToApp,
    router,
    onNavigate,
  ]);

  /**
   * Auto-navigation effect
   * Runs once when all data is loaded
   */
  useEffect(() => {
    // Don't run if disabled or already attempted
    if (disabled || hasAttemptedNavigation) return;

    // Don't run while loading
    if (isResolving) return;

    // Don't run if not authenticated
    if (!isAuthenticated) return;

    // Don't run on excluded paths
    if (isExcludedPath) return;

    // Don't run if already in an app context
    if (currentApplication) return;

    // Don't run if there's a redirect parameter (will be handled elsewhere)
    if (redirectParam) return;

    // Mark as attempted to prevent re-runs
    setHasAttemptedNavigation(true);

    // Only auto-navigate from the landing page
    if (pathname !== '/') return;

    // If user has no applications, don't navigate
    if (applications.length === 0) return;

    // If user has exactly one application, auto-navigate
    if (applications.length === 1) {
      navigateToLastApp();
      return;
    }

    // If user has a recent app, navigate to it
    if (recentApplications.length > 0) {
      navigateToLastApp();
      return;
    }

    // Otherwise, don't auto-navigate - let user choose via switcher
  }, [
    disabled,
    hasAttemptedNavigation,
    isResolving,
    isAuthenticated,
    isExcludedPath,
    currentApplication,
    redirectParam,
    pathname,
    applications,
    recentApplications,
    navigateToLastApp,
  ]);

  return {
    isNavigating,
    isResolving,
    destination,
    navigateToLastApp,
    shouldShowAppSelection,
  };
}

export default useAutoNavigateToApp;
