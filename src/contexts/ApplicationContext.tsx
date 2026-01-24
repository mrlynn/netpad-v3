'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
  useMemo,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useOrganization } from './OrganizationContext';
import { Application } from '@/types/application';
import { useApplications, useRecentApplications as useSWRRecentApplications } from '@/lib/swr/useApplications';

// ============================================
// Types
// ============================================

interface ApplicationState {
  currentApplication: Application | null;
  applications: Application[];
  recentApplications: Application[];
  isLoading: boolean;
  error: string | null;
}

interface ApplicationContextValue extends ApplicationState {
  // Current app helpers
  currentAppId: string | null;
  currentAppSlug: string | null;
  currentProjectId: string | null;

  // Application management
  selectApplication: (appId: string, options?: { navigate?: boolean; application?: Application }) => Promise<void>;
  selectApplicationBySlug: (slug: string, options?: { navigate?: boolean }) => Promise<void>;
  refreshApplications: () => Promise<void>;
  clearApplicationContext: () => void;
  recordApplicationAccess: (appId: string) => Promise<void>;

  // Computed helpers
  hasApplications: boolean;
  isMultiApp: boolean;
}

// ============================================
// Constants
// ============================================

const STORAGE_KEYS = {
  LAST_APP_ID: 'netpad_last_application_id',
  RECENT_APPS: 'netpad_recent_applications',
  COLLAPSED_PROJECTS: 'netpad_collapsed_projects',
} as const;

const MAX_RECENT_APPS = 10;

// ============================================
// Context
// ============================================

const ApplicationContext = createContext<ApplicationContextValue | undefined>(undefined);

// ============================================
// Helper Functions
// ============================================

/**
 * Parse application ID or slug from URL path
 * Supports both /apps/:slug and /orgs/:org/projects/:proj/applications/:appId patterns
 */
function parseApplicationFromPath(pathname: string): { appId?: string; appSlug?: string } {
  // New simplified route: /apps/:slug/...
  const appsMatch = pathname.match(/^\/apps\/([^/]+)/);
  if (appsMatch) {
    return { appSlug: appsMatch[1] };
  }

  // Legacy route: /orgs/:org/projects/:proj/applications/:appId/...
  const legacyMatch = pathname.match(/\/applications\/([^/]+)/);
  if (legacyMatch) {
    return { appId: legacyMatch[1] };
  }

  return {};
}

/**
 * Get from localStorage with error handling
 */
function getFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Set to localStorage with error handling
 */
function setToStorage(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`[ApplicationContext] Failed to save to localStorage:`, error);
  }
}

/**
 * Remove from localStorage with error handling
 */
function removeFromStorage(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn(`[ApplicationContext] Failed to remove from localStorage:`, error);
  }
}

// ============================================
// Provider
// ============================================

export function ApplicationProvider({ children }: { children: ReactNode }) {
  const { organization, currentOrgId, isLoading: isOrgLoading } = useOrganization();
  const pathname = usePathname();
  const router = useRouter();

  // Use SWR hooks for caching and automatic revalidation
  const {
    applications: swrApplications,
    isLoading: isSwrLoading,
    isError: isSwrError,
    error: swrError,
    mutate: mutateApplications,
  } = useApplications({ orgId: currentOrgId || undefined }); // Include all statuses (active, draft) so users can work on new apps

  const {
    applications: swrRecentApps,
    mutate: mutateRecentApps,
  } = useSWRRecentApplications(currentOrgId || undefined, MAX_RECENT_APPS);

  // Local state for current application selection (not fetched from SWR)
  const [currentApplication, setCurrentApplication] = useState<Application | null>(null);
  const [localRecentApps, setLocalRecentApps] = useState<Application[]>([]);

  // Derive applications from SWR data
  const applications = useMemo(() => swrApplications || [], [swrApplications]);

  // Combine server recent apps with local cache for immediate updates
  const recentApplications = useMemo(() => {
    // Prefer local state for immediate updates, fall back to SWR data
    if (localRecentApps.length > 0) {
      return localRecentApps;
    }
    return swrRecentApps || [];
  }, [localRecentApps, swrRecentApps]);

  // Loading state combines SWR loading with initial hydration
  const isLoading = isOrgLoading || isSwrLoading;
  const error = swrError?.message || null;

  // ----------------------------------------
  // Sync current app with applications list and URL
  // ----------------------------------------

  useEffect(() => {
    // Don't run while loading, but DO run if applications is empty (to clear stale state)
    if (isSwrLoading) return;

    // If current app no longer exists in the applications list, clear it
    // This handles the case where an application was deleted
    // IMPORTANT: Only check if we actually have applications loaded (length > 0)
    // If applications is empty, don't clear - it might just be a temporary state during revalidation
    if (currentApplication && applications.length > 0) {
      const stillExists = applications.some(a => a.applicationId === currentApplication.applicationId);
      if (!stillExists) {
        console.warn(`[ApplicationContext] Current app ${currentApplication.applicationId} no longer exists. Clearing.`);
        removeFromStorage(STORAGE_KEYS.LAST_APP_ID);
        setCurrentApplication(null);
        return;
      }
    }

    // Skip further processing if no applications
    if (applications.length === 0) return;

    // Try to determine current application from URL
    const { appId: urlAppId, appSlug: urlAppSlug } = parseApplicationFromPath(pathname);
    let selectedApp: Application | null = null;

    if (urlAppId) {
      selectedApp = applications.find(a => a.applicationId === urlAppId) || null;
    } else if (urlAppSlug) {
      selectedApp = applications.find(a => a.slug === urlAppSlug) || null;
    }

    // Fall back to localStorage if not in URL
    if (!selectedApp) {
      const savedAppId = getFromStorage<string | null>(STORAGE_KEYS.LAST_APP_ID, null);
      if (savedAppId) {
        selectedApp = applications.find(a => a.applicationId === savedAppId) || null;
        if (!selectedApp) {
          console.warn(`[ApplicationContext] Saved app ${savedAppId} not found. Clearing stale selection.`);
          removeFromStorage(STORAGE_KEYS.LAST_APP_ID);
        }
      }
    }

    // If we have a selected app, update localStorage and state
    if (selectedApp && selectedApp.applicationId !== currentApplication?.applicationId) {
      setToStorage(STORAGE_KEYS.LAST_APP_ID, selectedApp.applicationId);
      setCurrentApplication(selectedApp);
    } else if (!selectedApp && currentApplication) {
      // URL changed to a non-app page, keep current app selected
    }
  }, [pathname, applications, isSwrLoading, currentApplication?.applicationId]);

  // Sync local recent apps when SWR data arrives
  useEffect(() => {
    if (swrRecentApps && swrRecentApps.length > 0 && localRecentApps.length === 0) {
      setLocalRecentApps(swrRecentApps);
    }
  }, [swrRecentApps, localRecentApps.length]);

  // ----------------------------------------
  // Refresh Applications (triggers SWR revalidation)
  // ----------------------------------------

  const refreshApplications = useCallback(async () => {
    await Promise.all([
      mutateApplications(),
      mutateRecentApps(),
    ]);
  }, [mutateApplications, mutateRecentApps]);

  // ----------------------------------------
  // Select Application
  // ----------------------------------------

  const selectApplication = useCallback(async (
    appId: string,
    options: { navigate?: boolean; application?: Application } = {}
  ) => {
    const { navigate = false, application: providedApp } = options;
    // Use provided application if available, otherwise look up from cache
    const app = providedApp || applications.find(a => a.applicationId === appId);

    if (!app) {
      console.warn(`[ApplicationContext] Application ${appId} not found in cache. Try providing the application object directly.`);
      return;
    }

    // Update localStorage
    setToStorage(STORAGE_KEYS.LAST_APP_ID, appId);

    // Update recent apps in localStorage
    const currentRecentIds = localRecentApps.map(a => a.applicationId);
    const newRecentIds = [
      appId,
      ...currentRecentIds.filter(id => id !== appId),
    ].slice(0, MAX_RECENT_APPS);
    setToStorage(STORAGE_KEYS.RECENT_APPS, newRecentIds);

    // Update local state immediately for responsive UI
    setCurrentApplication(app);
    setLocalRecentApps(
      newRecentIds
        .map(id => applications.find(a => a.applicationId === id))
        .filter((a): a is Application => a !== undefined)
    );

    // Record access on server (non-blocking) and revalidate SWR cache
    recordApplicationAccess(appId)
      .then(() => mutateRecentApps())
      .catch(() => {
        // Silently fail - this is non-critical
      });

    // Navigate if requested
    if (navigate && currentOrgId) {
      router.push(`/orgs/${currentOrgId}/projects/${app.projectId}/applications/${app.applicationId}`);
    }
  }, [applications, localRecentApps, currentOrgId, router, mutateRecentApps]);

  const selectApplicationBySlug = useCallback(async (
    slug: string,
    options: { navigate?: boolean } = {}
  ) => {
    const app = applications.find(a => a.slug === slug);
    if (app) {
      await selectApplication(app.applicationId, options);
    } else {
      console.warn(`[ApplicationContext] Application with slug "${slug}" not found`);
    }
  }, [applications, selectApplication]);

  // ----------------------------------------
  // Record Application Access
  // ----------------------------------------

  const recordApplicationAccess = useCallback(async (appId: string): Promise<void> => {
    if (!currentOrgId) return;

    try {
      await fetch(`/api/applications/${appId}/access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: currentOrgId }),
      });
    } catch (error) {
      // Non-critical - just log
      console.warn('[ApplicationContext] Failed to record application access:', error);
    }
  }, [currentOrgId]);

  // ----------------------------------------
  // Clear Context
  // ----------------------------------------

  const clearApplicationContext = useCallback(() => {
    removeFromStorage(STORAGE_KEYS.LAST_APP_ID);
    setCurrentApplication(null);
    setLocalRecentApps([]);
  }, []);

  // ----------------------------------------
  // Effects
  // ----------------------------------------

  // Sync with URL changes (e.g., back/forward navigation)
  useEffect(() => {
    if (isSwrLoading || applications.length === 0) return;

    const { appId: urlAppId, appSlug: urlAppSlug } = parseApplicationFromPath(pathname);

    if (urlAppId && currentApplication?.applicationId !== urlAppId) {
      const app = applications.find(a => a.applicationId === urlAppId);
      if (app) {
        selectApplication(app.applicationId);
      }
    } else if (urlAppSlug && currentApplication?.slug !== urlAppSlug) {
      const app = applications.find(a => a.slug === urlAppSlug);
      if (app) {
        selectApplication(app.applicationId);
      }
    }
  }, [pathname, applications, currentApplication, selectApplication, isSwrLoading]);

  // ----------------------------------------
  // Context Value
  // ----------------------------------------

  // Build the state object for context value
  const state: ApplicationState = useMemo(() => ({
    currentApplication,
    applications,
    recentApplications,
    isLoading,
    error,
  }), [currentApplication, applications, recentApplications, isLoading, error]);

  const value: ApplicationContextValue = useMemo(() => ({
    ...state,
    currentAppId: currentApplication?.applicationId || null,
    currentAppSlug: currentApplication?.slug || null,
    currentProjectId: currentApplication?.projectId || null,
    selectApplication,
    selectApplicationBySlug,
    refreshApplications,
    clearApplicationContext,
    recordApplicationAccess,
    hasApplications: applications.length > 0,
    isMultiApp: applications.length > 1,
  }), [
    state,
    currentApplication,
    applications,
    selectApplication,
    selectApplicationBySlug,
    refreshApplications,
    clearApplicationContext,
    recordApplicationAccess,
  ]);

  return (
    <ApplicationContext.Provider value={value}>
      {children}
    </ApplicationContext.Provider>
  );
}

// ============================================
// Hook
// ============================================

export function useApplication() {
  const context = useContext(ApplicationContext);
  if (context === undefined) {
    throw new Error('useApplication must be used within an ApplicationProvider');
  }
  return context;
}

/**
 * Safe version of useApplication that returns null when outside provider
 * Use this in components that may render before providers are ready (e.g., during navigation)
 */
export function useApplicationSafe(): ApplicationContextValue | null {
  const context = useContext(ApplicationContext);
  return context ?? null;
}

// ============================================
// Helper Hooks
// ============================================

/**
 * Require an application to be selected
 * Useful for pages that need an active application context
 */
export function useRequireApplication() {
  const {
    currentApplication,
    isLoading,
    applications,
    hasApplications
  } = useApplication();

  const needsApp = !isLoading && !currentApplication && hasApplications;
  const needsCreate = !isLoading && !hasApplications;
  const isReady = !isLoading && currentApplication !== null;

  return {
    application: currentApplication,
    isLoading,
    needsApp,
    needsCreate,
    isReady,
    applications,
  };
}

/**
 * Get recent applications for the switcher
 */
export function useRecentApplications(limit: number = 5) {
  const context = useApplicationSafe();
  const recentApplications = context?.recentApplications ?? [];
  const isLoading = context?.isLoading ?? true;

  return {
    recentApps: recentApplications.slice(0, limit),
    isLoading,
  };
}

/**
 * Get applications grouped by project for the switcher
 */
export function useApplicationsByProject() {
  const context = useApplicationSafe();
  const applications = context?.applications ?? [];
  const isLoading = context?.isLoading ?? true;

  const grouped = useMemo(() => {
    const groups: Map<string, { projectId: string; applications: Application[] }> = new Map();

    for (const app of applications) {
      const projectId = app.projectId;
      if (!groups.has(projectId)) {
        groups.set(projectId, { projectId, applications: [] });
      }
      groups.get(projectId)!.applications.push(app);
    }

    return Array.from(groups.values());
  }, [applications]);

  return {
    groups: grouped,
    isLoading,
    total: applications.length,
  };
}
