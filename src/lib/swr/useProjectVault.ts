/**
 * SWR hook for project default vault
 *
 * Provides cached fetching of a project's default vault connection.
 * Used by FormBuilder and other components that need vault info.
 */

import useSWR, { SWRConfiguration } from 'swr';
import { fetcher } from './fetcher';

interface VaultInfo {
  vaultId: string;
  name: string;
  database?: string;
}

interface ProjectDefaultVaultResponse {
  hasDefaultVault: boolean;
  vault?: VaultInfo;
  message?: string;
}

// Default SWR config for vault data
// - 10 minute cache (vault config changes infrequently)
// - Revalidate on reconnect
const defaultConfig: SWRConfiguration = {
  dedupingInterval: 10 * 60 * 1000, // 10 minutes
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  errorRetryCount: 2,
  errorRetryInterval: 1000,
};

/**
 * Hook for fetching a project's default vault
 *
 * @param projectId - The project ID to fetch vault for
 * @param config - Optional SWR configuration overrides
 * @returns SWR response with vault data
 */
export function useProjectDefaultVault(
  projectId: string | undefined,
  config?: SWRConfiguration
) {
  const key = projectId ? `/api/projects/${projectId}/default-vault` : null;

  return useSWR<ProjectDefaultVaultResponse>(
    key,
    fetcher,
    { ...defaultConfig, ...config }
  );
}

/**
 * Generate cache key for manual cache manipulation
 */
export const projectVaultCacheKey = (projectId: string) =>
  `/api/projects/${projectId}/default-vault`;
