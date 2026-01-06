'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { SearchOptionsSource } from '@/types/form';

/**
 * Result from the distinct values API
 */
export interface DistinctValueOption {
  value: any;
  label: string;
  count: number;
}

/**
 * Hook state
 */
export interface UseDistinctValuesState {
  options: DistinctValueOption[];
  isLoading: boolean;
  error: string | null;
  total: number;
}

/**
 * Hook options
 */
export interface UseDistinctValuesOptions {
  formId: string;
  field: string;
  collection?: string;
  optionsSource?: SearchOptionsSource;
  enabled?: boolean;
}

/**
 * Cache for distinct values to avoid repeated API calls
 */
const optionsCache = new Map<string, { options: DistinctValueOption[]; total: number; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute cache

/**
 * Hook for fetching distinct values from a MongoDB collection
 *
 * Features:
 * - Automatic fetching on mount (configurable)
 * - Caching to reduce API calls
 * - Auto-refresh capability
 * - Count badges support
 * - Label mapping
 *
 * @example
 * ```tsx
 * const { options, isLoading, refresh } = useDistinctValues({
 *   formId: 'my-form-id',
 *   field: 'issueCategory',
 *   optionsSource: {
 *     type: 'distinct',
 *     distinct: {
 *       showCounts: true,
 *       sortBy: 'count',
 *       labelMap: { hardware: 'Hardware', software: 'Software' }
 *     }
 *   }
 * });
 * ```
 */
export function useDistinctValues({
  formId,
  field,
  collection,
  optionsSource,
  enabled = true,
}: UseDistinctValuesOptions): UseDistinctValuesState & {
  refresh: () => Promise<void>;
  formatOptionLabel: (option: DistinctValueOption) => string;
} {
  const [state, setState] = useState<UseDistinctValuesState>({
    options: [],
    isLoading: false,
    error: null,
    total: 0,
  });

  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Generate cache key
  const cacheKey = `${formId}:${collection || 'default'}:${field}:${JSON.stringify(optionsSource?.distinct || {})}`;

  /**
   * Fetch distinct values from the API
   */
  const fetchDistinctValues = useCallback(async () => {
    if (!formId || !field || !enabled) return;

    // Check cache first
    const cached = optionsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setState({
        options: cached.options,
        total: cached.total,
        isLoading: false,
        error: null,
      });
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const distinctConfig = optionsSource?.distinct || {};

      const response = await fetch('/api/mongodb/distinct-values', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId,
          field: distinctConfig.field || field,
          collection,
          includeCounts: distinctConfig.showCounts !== false,
          sortBy: distinctConfig.sortBy || 'count',
          sortDirection: distinctConfig.sortDirection || 'desc',
          limit: distinctConfig.limit || 100,
          labelMap: distinctConfig.labelMap,
          filter: distinctConfig.filter,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Apply label mapping if provided
        const labelMap = distinctConfig.labelMap || {};
        const options = data.values.map((v: DistinctValueOption) => ({
          ...v,
          label: labelMap[v.value] || v.label || String(v.value),
        }));

        // Cache the result
        optionsCache.set(cacheKey, {
          options,
          total: data.total,
          timestamp: Date.now(),
        });

        setState({
          options,
          total: data.total,
          isLoading: false,
          error: null,
        });
      } else {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: data.error || 'Failed to fetch options',
        }));
      }
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to fetch options',
      }));
    }
  }, [formId, field, collection, optionsSource, enabled, cacheKey]);

  /**
   * Format option label with optional count
   */
  const formatOptionLabel = useCallback(
    (option: DistinctValueOption): string => {
      const showCounts = optionsSource?.distinct?.showCounts !== false;
      if (showCounts && option.count > 0) {
        return `${option.label} (${option.count})`;
      }
      return option.label;
    },
    [optionsSource]
  );

  /**
   * Manual refresh function
   */
  const refresh = useCallback(async () => {
    // Clear cache for this key
    optionsCache.delete(cacheKey);
    await fetchDistinctValues();
  }, [cacheKey, fetchDistinctValues]);

  // Fetch on mount if enabled
  useEffect(() => {
    if (enabled && optionsSource?.refreshOnMount !== false) {
      fetchDistinctValues();
    }
  }, [enabled, fetchDistinctValues, optionsSource?.refreshOnMount]);

  // Set up auto-refresh interval if configured
  useEffect(() => {
    if (optionsSource?.refreshInterval && optionsSource.refreshInterval > 0) {
      refreshIntervalRef.current = setInterval(() => {
        refresh();
      }, optionsSource.refreshInterval);

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [optionsSource?.refreshInterval, refresh]);

  return {
    ...state,
    refresh,
    formatOptionLabel,
  };
}

/**
 * Hook for fetching distinct values for multiple fields at once
 * Useful for search forms with multiple smart dropdowns
 */
export function useMultipleDistinctValues(
  formId: string,
  fields: Array<{
    field: string;
    collection?: string;
    optionsSource?: SearchOptionsSource;
  }>,
  enabled = true
): Record<string, UseDistinctValuesState> {
  const [states, setStates] = useState<Record<string, UseDistinctValuesState>>({});

  useEffect(() => {
    if (!enabled || !formId) return;

    const fetchAll = async () => {
      const results: Record<string, UseDistinctValuesState> = {};

      await Promise.all(
        fields.map(async ({ field, collection, optionsSource }) => {
          const distinctConfig = optionsSource?.distinct || {};

          try {
            const response = await fetch('/api/mongodb/distinct-values', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                formId,
                field: distinctConfig.field || field,
                collection,
                includeCounts: distinctConfig.showCounts !== false,
                sortBy: distinctConfig.sortBy || 'count',
                sortDirection: distinctConfig.sortDirection || 'desc',
                limit: distinctConfig.limit || 100,
                labelMap: distinctConfig.labelMap,
                filter: distinctConfig.filter,
              }),
            });

            const data = await response.json();

            if (data.success) {
              const labelMap = distinctConfig.labelMap || {};
              results[field] = {
                options: data.values.map((v: DistinctValueOption) => ({
                  ...v,
                  label: labelMap[v.value] || v.label || String(v.value),
                })),
                total: data.total,
                isLoading: false,
                error: null,
              };
            } else {
              results[field] = {
                options: [],
                total: 0,
                isLoading: false,
                error: data.error,
              };
            }
          } catch (error: any) {
            results[field] = {
              options: [],
              total: 0,
              isLoading: false,
              error: error.message,
            };
          }
        })
      );

      setStates(results);
    };

    // Initialize with loading state
    const initialState: Record<string, UseDistinctValuesState> = {};
    fields.forEach(({ field }) => {
      initialState[field] = { options: [], total: 0, isLoading: true, error: null };
    });
    setStates(initialState);

    fetchAll();
  }, [formId, fields, enabled]);

  return states;
}

/**
 * Clear the options cache (useful for testing or after data mutations)
 */
export function clearDistinctValuesCache(cacheKey?: string): void {
  if (cacheKey) {
    optionsCache.delete(cacheKey);
  } else {
    optionsCache.clear();
  }
}
