/**
 * SWR hooks for collections data fetching
 *
 * Provides caching and automatic revalidation for:
 * - Database list
 * - Collection list with stats
 * - Linked resources (forms/workflows)
 */

import useSWR, { SWRConfiguration } from 'swr';
import { fetcher } from './fetcher';
import type {
  DatabaseInfo,
  CollectionStats,
  LinkedResourcesResponse,
} from '@/types/dataExplorer';

interface DatabasesResponse {
  databases: DatabaseInfo[];
}

interface CollectionsResponse {
  database: string;
  collections: CollectionStats[];
  total: number;
}

// Default SWR config for data explorer
// - 5 minute cache (dedupingInterval)
// - Revalidate on focus with throttle to catch stale data without excess requests
// - Don't retry on error (user can manually refresh)
const defaultConfig: SWRConfiguration = {
  dedupingInterval: 5 * 60 * 1000, // 5 minutes - don't refetch if called within this window
  revalidateOnFocus: true, // Refetch when tab regains focus to catch stale data
  focusThrottleInterval: 60 * 1000, // Throttle focus revalidation to once per minute
  revalidateOnReconnect: true, // Refetch when network reconnects
  errorRetryCount: 2,
  errorRetryInterval: 1000,
};

/**
 * Hook for fetching databases for a vault
 */
export function useDatabases(
  orgId: string | undefined,
  vaultId: string | undefined,
  config?: SWRConfiguration
) {
  const key = orgId && vaultId
    ? `/api/collections?organizationId=${orgId}&vaultId=${vaultId}`
    : null;

  return useSWR<DatabasesResponse>(
    key,
    fetcher,
    { ...defaultConfig, ...config }
  );
}

/**
 * Hook for fetching collections with stats for a database
 */
export function useCollections(
  orgId: string | undefined,
  vaultId: string | undefined,
  database: string | undefined,
  options?: { includeStats?: boolean; includeSample?: boolean },
  config?: SWRConfiguration
) {
  const params = new URLSearchParams();
  if (orgId) params.set('organizationId', orgId);
  if (vaultId) params.set('vaultId', vaultId);
  if (database) params.set('database', database);
  if (options?.includeStats) params.set('includeStats', 'true');
  if (options?.includeSample) params.set('includeSample', 'true');

  const key = orgId && vaultId && database
    ? `/api/collections?${params.toString()}`
    : null;

  return useSWR<CollectionsResponse>(
    key,
    fetcher,
    { ...defaultConfig, ...config }
  );
}

/**
 * Hook for fetching linked resources (forms/workflows) for a collection
 */
export function useLinkedResources(
  orgId: string | undefined,
  vaultId: string | undefined,
  collection: string | undefined,
  config?: SWRConfiguration
) {
  const params = new URLSearchParams();
  if (orgId) params.set('organizationId', orgId);
  if (collection) params.set('collection', collection);
  if (vaultId) params.set('vaultId', vaultId);

  const key = orgId && collection
    ? `/api/data-explorer/linked-resources?${params.toString()}`
    : null;

  return useSWR<LinkedResourcesResponse>(
    key,
    fetcher,
    {
      ...defaultConfig,
      // Linked resources change less frequently, longer cache
      dedupingInterval: 10 * 60 * 1000, // 10 minutes
      ...config,
    }
  );
}

/**
 * Generate cache keys for manual cache manipulation
 * Useful for invalidating cache after mutations
 */
export const cacheKeys = {
  databases: (orgId: string, vaultId: string) =>
    `/api/collections?organizationId=${orgId}&vaultId=${vaultId}`,

  collections: (orgId: string, vaultId: string, database: string, includeStats = true) =>
    `/api/collections?organizationId=${orgId}&vaultId=${vaultId}&database=${database}${includeStats ? '&includeStats=true' : ''}`,

  linkedResources: (orgId: string, collection: string, vaultId?: string) =>
    `/api/data-explorer/linked-resources?organizationId=${orgId}&collection=${collection}${vaultId ? `&vaultId=${vaultId}` : ''}`,
};
