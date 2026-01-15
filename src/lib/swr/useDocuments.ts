/**
 * SWR hooks for document data fetching in the DataBrowser
 *
 * Provides caching for document queries with pagination support.
 */

import useSWR from 'swr';
import type { SWRConfiguration } from 'swr';
import { postFetcher } from './fetcher';

interface Document {
  _id: string;
  [key: string]: unknown;
}

interface QueryResponse {
  success: boolean;
  documents: Document[];
  totalCount: number;
  error?: string;
}

interface UseDocumentsParams {
  connectionString: string | null;
  databaseName: string | null;
  collection: string | null;
  query?: Record<string, unknown>;
  sort?: Record<string, 1 | -1>;
  limit?: number;
  skip?: number;
}

// Default config for document queries
// Shorter cache since documents can change frequently
const defaultConfig: SWRConfiguration = {
  dedupingInterval: 30 * 1000, // 30 seconds
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  errorRetryCount: 1,
};

/**
 * Hook for fetching documents with pagination
 *
 * Uses POST requests since we need to send query/sort params in body.
 * Key is constructed from all params to ensure proper caching per page/sort.
 */
export function useDocuments(
  params: UseDocumentsParams,
  config?: SWRConfiguration
) {
  const { connectionString, databaseName, collection, query = {}, sort = { _id: -1 }, limit = 25, skip = 0 } = params;

  // Only fetch if we have all required params
  const isReady = connectionString && databaseName && collection;

  // Create a stable cache key from params
  // Include all query params to differentiate pages/sorts
  const key = isReady
    ? JSON.stringify({
        url: '/api/mongodb/query',
        connectionString,
        databaseName,
        collection,
        query,
        sort,
        limit,
        skip,
      })
    : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR<QueryResponse>(
    key,
    async () => {
      const response = await postFetcher<QueryResponse>('/api/mongodb/query', {
        connectionString,
        databaseName,
        collection,
        query,
        sort,
        limit,
        skip,
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch documents');
      }

      return response;
    },
    { ...defaultConfig, ...config }
  );

  return {
    documents: data?.documents || [],
    totalCount: data?.totalCount || 0,
    error: error?.message || null,
    isLoading,
    isValidating,
    refresh: () => mutate(),
  };
}

/**
 * Generate cache key for manual invalidation
 */
export function documentsCacheKey(params: Omit<UseDocumentsParams, 'connectionString'> & { connectionString: string }) {
  return JSON.stringify({
    url: '/api/mongodb/query',
    ...params,
  });
}
