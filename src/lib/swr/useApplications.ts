/**
 * SWR hooks for applications data fetching
 *
 * Provides caching and automatic revalidation for:
 * - Application list (by org or project)
 * - Application details
 */

import useSWR, { SWRConfiguration } from 'swr';
import { fetcher } from './fetcher';
import { Application, ApplicationStatus } from '@/types/application';

// ============================================
// Response Types
// ============================================

interface ApplicationsResponse {
  success: boolean;
  applications: Application[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface ApplicationResponse {
  application: Application;
}

// ============================================
// Default Config
// ============================================

// Default SWR config for applications
// - 5 minute cache (dedupingInterval)
// - Revalidate on focus with throttle
// - Revalidate on reconnect
const defaultConfig: SWRConfiguration = {
  dedupingInterval: 5 * 60 * 1000, // 5 minutes
  revalidateOnFocus: true,
  focusThrottleInterval: 60 * 1000, // Throttle focus revalidation to once per minute
  revalidateOnReconnect: true,
  errorRetryCount: 2,
  errorRetryInterval: 1000,
};

// ============================================
// Hook Options
// ============================================

export interface UseApplicationsOptions {
  orgId?: string;
  projectId?: string;
  status?: ApplicationStatus;
  page?: number;
  pageSize?: number;
  sortBy?: 'name' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  search?: string;
  includeStats?: boolean;
}

export interface UseApplicationsReturn {
  applications: Application[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  mutate: () => Promise<void>;
}

// ============================================
// Hooks
// ============================================

/**
 * Hook for fetching applications
 *
 * @param options - Query options (orgId required, projectId optional)
 * @param config - Optional SWR configuration override
 */
export function useApplications(
  options: UseApplicationsOptions = {},
  config?: SWRConfiguration
): UseApplicationsReturn {
  const { orgId, projectId, status, page, pageSize, sortBy, sortOrder, search } = options;

  // Build query params
  const params = new URLSearchParams();
  if (orgId) params.set('orgId', orgId);
  if (projectId) params.set('projectId', projectId);
  if (status) params.set('status', status);
  if (page) params.set('page', page.toString());
  if (pageSize) params.set('pageSize', pageSize.toString());
  if (sortBy) params.set('sortBy', sortBy);
  if (sortOrder) params.set('sortOrder', sortOrder);
  if (search) params.set('search', search);

  // Only fetch if orgId is provided
  const key = orgId ? `/api/applications?${params.toString()}` : null;

  const { data, error, isLoading, mutate } = useSWR<ApplicationsResponse>(
    key,
    fetcher,
    { ...defaultConfig, ...config }
  );

  return {
    applications: data?.applications || [],
    total: data?.total || 0,
    page: data?.page || 1,
    pageSize: data?.pageSize || 20,
    totalPages: data?.totalPages || 0,
    isLoading,
    isError: !!error,
    error: error || null,
    mutate: async () => {
      await mutate();
    },
  };
}

/**
 * Hook for fetching a single application by ID
 *
 * @param applicationId - Application ID to fetch
 * @param orgId - Organization ID (required for permissions)
 * @param config - Optional SWR configuration override
 */
export function useApplication(
  applicationId: string | undefined,
  orgId: string | undefined,
  config?: SWRConfiguration
) {
  const params = new URLSearchParams();
  if (orgId) params.set('orgId', orgId);

  const key = applicationId && orgId
    ? `/api/applications/${applicationId}?${params.toString()}`
    : null;

  const { data, error, isLoading, mutate } = useSWR<ApplicationResponse>(
    key,
    fetcher,
    { ...defaultConfig, ...config }
  );

  return {
    application: data?.application || null,
    isLoading,
    isError: !!error,
    error: error || null,
    mutate: async () => {
      await mutate();
    },
  };
}

/**
 * Hook for fetching grouped applications (for app switcher)
 *
 * @param orgId - Organization ID
 * @param status - Optional status filter
 * @param config - Optional SWR configuration override
 */
export function useGroupedApplications(
  orgId: string | undefined,
  status?: ApplicationStatus,
  config?: SWRConfiguration
) {
  const params = new URLSearchParams();
  if (orgId) params.set('orgId', orgId);
  if (status) params.set('status', status);

  const key = orgId ? `/api/applications/grouped?${params.toString()}` : null;

  interface GroupedApplicationsResponse {
    success: boolean;
    groups: Array<{
      project: { id: string; name: string; slug?: string };
      applications: Application[];
    }>;
    ungrouped: Application[];
    total: number;
  }

  const { data, error, isLoading, mutate } = useSWR<GroupedApplicationsResponse>(
    key,
    fetcher,
    { ...defaultConfig, ...config }
  );

  return {
    groups: data?.groups || [],
    ungrouped: data?.ungrouped || [],
    total: data?.total || 0,
    isLoading,
    isError: !!error,
    error: error || null,
    mutate: async () => {
      await mutate();
    },
  };
}

/**
 * Hook for fetching recent applications
 *
 * @param orgId - Organization ID
 * @param limit - Maximum number of recent apps to return (default: 10)
 * @param config - Optional SWR configuration override
 */
export function useRecentApplications(
  orgId: string | undefined,
  limit: number = 10,
  config?: SWRConfiguration
) {
  const params = new URLSearchParams();
  if (orgId) params.set('orgId', orgId);
  if (limit) params.set('limit', limit.toString());

  const key = orgId ? `/api/applications/recent?${params.toString()}` : null;

  interface RecentApplicationsResponse {
    success: boolean;
    applications: Application[];
    total: number;
  }

  const { data, error, isLoading, mutate } = useSWR<RecentApplicationsResponse>(
    key,
    fetcher,
    {
      ...defaultConfig,
      // Recent apps change frequently, shorter cache
      dedupingInterval: 1 * 60 * 1000, // 1 minute
      ...config,
    }
  );

  return {
    applications: data?.applications || [],
    total: data?.total || 0,
    isLoading,
    isError: !!error,
    error: error || null,
    mutate: async () => {
      await mutate();
    },
  };
}

// ============================================
// Cache Keys
// ============================================

/**
 * Generate cache keys for manual cache manipulation
 * Useful for invalidating cache after mutations
 */
export const applicationsCacheKeys = {
  list: (options: UseApplicationsOptions) => {
    const params = new URLSearchParams();
    if (options.orgId) params.set('orgId', options.orgId);
    if (options.projectId) params.set('projectId', options.projectId);
    if (options.status) params.set('status', options.status);
    if (options.page) params.set('page', options.page.toString());
    if (options.pageSize) params.set('pageSize', options.pageSize.toString());
    if (options.sortBy) params.set('sortBy', options.sortBy);
    if (options.sortOrder) params.set('sortOrder', options.sortOrder);
    if (options.search) params.set('search', options.search);
    return `/api/applications?${params.toString()}`;
  },

  detail: (applicationId: string, orgId: string) =>
    `/api/applications/${applicationId}?orgId=${orgId}`,

  grouped: (orgId: string, status?: ApplicationStatus) => {
    const params = new URLSearchParams();
    params.set('orgId', orgId);
    if (status) params.set('status', status);
    return `/api/applications/grouped?${params.toString()}`;
  },

  recent: (orgId: string, limit?: number) => {
    const params = new URLSearchParams();
    params.set('orgId', orgId);
    if (limit) params.set('limit', limit.toString());
    return `/api/applications/recent?${params.toString()}`;
  },
};
