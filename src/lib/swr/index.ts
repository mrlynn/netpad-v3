/**
 * SWR hooks and utilities
 *
 * Re-exports all SWR-related functionality for easy importing.
 */

export { fetcher, postFetcher, FetchError } from './fetcher';
export {
  useDatabases,
  useCollections,
  useLinkedResources,
  cacheKeys,
} from './useCollections';
export { useDocuments, documentsCacheKey } from './useDocuments';
