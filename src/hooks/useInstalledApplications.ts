/**
 * SWR Hook for Installed Applications
 *
 * Provides cached access to installed applications with automatic revalidation.
 */

import useSWR from 'swr';
import { fetcher } from '@/lib/swr/fetcher';

interface InstalledApplication {
  installationId: string;
  organizationId: string;
  projectId: string;
  marketplaceApplicationId: string;
  marketplaceApplicationName: string;
  installedVersion: string;
  latestAvailableVersion?: string;
  installedAt: string;
  lastCheckedAt?: string;
  lastUpdatedAt?: string;
  installedForms: Array<{
    formId: string;
    originalFormId?: string;
    originalSlug?: string;
    name: string;
  }>;
  installedWorkflows: Array<{
    workflowId: string;
    originalWorkflowId?: string;
    originalSlug?: string;
    name: string;
  }>;
  status: 'installed' | 'update-available' | 'updating' | 'error';
  updateAvailable?: {
    version: string;
    changelog?: string;
    publishedAt: string;
  };
  hasUpdate?: boolean;
  updateInfo?: {
    version: string;
    changelog?: string;
    publishedAt: string;
  };
}

interface UseInstalledApplicationsOptions {
  orgId: string;
  projectId?: string;
  status?: 'installed' | 'update-available' | 'updating' | 'error';
  refreshInterval?: number;
}

export function useInstalledApplications(options: UseInstalledApplicationsOptions) {
  const { orgId, projectId, status, refreshInterval } = options;

  const params = new URLSearchParams({ orgId });
  if (projectId) {
    params.append('projectId', projectId);
  }
  if (status) {
    params.append('status', status);
  }

  const { data, error, isLoading, mutate } = useSWR<{
    success: boolean;
    installations: InstalledApplication[];
    total: number;
  }>(
    `/api/applications/installed?${params.toString()}`,
    fetcher,
    {
      refreshInterval: refreshInterval || 0, // No auto-refresh by default
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  // Count updates available
  const updatesAvailable = data?.installations?.filter(inst => inst.hasUpdate).length || 0;

  return {
    installations: data?.installations || [],
    total: data?.total || 0,
    updatesAvailable,
    loading: isLoading,
    error,
    mutate,
  };
}
