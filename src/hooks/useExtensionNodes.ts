'use client';

/**
 * Hook for fetching extension-provided workflow nodes
 *
 * Fetches custom workflow nodes from extensions and provides
 * them in a format compatible with the NodePalette.
 */

import { useState, useEffect, useCallback } from 'react';
import { NodeCategory } from '@/types/workflow';

/**
 * Extension node definition from the API
 */
export interface ExtensionNodeDefinition {
  type: string;
  label: string;
  description: string;
  category: NodeCategory;
  color: string;
  icon: string;
  configFields?: Array<{
    name: string;
    label: string;
    type: string;
    defaultValue?: unknown;
    placeholder?: string;
    helpText?: string;
    required?: boolean;
    options?: Array<{ label: string; value: string }>;
  }>;
  outputs?: Array<{
    id: string;
    label: string;
    description?: string;
    primary?: boolean;
  }>;
  multipleInputs?: boolean;
  providedBy: string;
  version: string;
  docsUrl?: string;
}

/**
 * API response structure
 */
interface ExtensionNodesResponse {
  success: boolean;
  data?: {
    nodes: ExtensionNodeDefinition[];
    stats: {
      total: number;
      byExtension: Record<string, number>;
      byCategory: Record<string, number>;
    };
  };
  error?: string;
}

/**
 * Hook return type
 */
interface UseExtensionNodesResult {
  nodes: ExtensionNodeDefinition[];
  loading: boolean;
  error: string | null;
  stats: {
    total: number;
    byExtension: Record<string, number>;
    byCategory: Record<string, number>;
  } | null;
  refresh: () => Promise<void>;
}

/**
 * Hook for fetching extension workflow nodes
 *
 * @param autoFetch - Whether to fetch on mount (default: true)
 * @returns Extension nodes, loading state, error, and refresh function
 *
 * @example
 * ```tsx
 * const { nodes, loading, error } = useExtensionNodes();
 *
 * if (loading) return <Spinner />;
 * if (error) return <Error message={error} />;
 *
 * return <NodeList nodes={nodes} />;
 * ```
 */
export function useExtensionNodes(autoFetch = true): UseExtensionNodesResult {
  const [nodes, setNodes] = useState<ExtensionNodeDefinition[]>([]);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<UseExtensionNodesResult['stats']>(null);

  const fetchNodes = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ext/workflow-nodes');
      const data: ExtensionNodesResponse = await response.json();

      if (!data.success || !data.data) {
        throw new Error(data.error || 'Failed to fetch extension nodes');
      }

      setNodes(data.data.nodes);
      setStats(data.data.stats);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('[useExtensionNodes] Error:', message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetchNodes();
    }
  }, [autoFetch, fetchNodes]);

  return {
    nodes,
    loading,
    error,
    stats,
    refresh: fetchNodes,
  };
}

/**
 * Get extension nodes by category
 */
export function useExtensionNodesByCategory(
  category: NodeCategory,
  autoFetch = true
): UseExtensionNodesResult {
  const result = useExtensionNodes(autoFetch);

  return {
    ...result,
    nodes: result.nodes.filter((node) => node.category === category),
  };
}

export default useExtensionNodes;
