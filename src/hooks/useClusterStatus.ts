'use client';

import { useState, useEffect, useCallback } from 'react';

export interface ClusterStatus {
  hasCluster: boolean;
  isProvisioning: boolean;
  isReady: boolean;
  status: string | null;
  message: string | null;
  vaultId: string | null;
  provisioningAvailable: boolean;
  cluster: {
    clusterId: string;
    projectId: string;
    provider: string;
    region: string;
    instanceSize: string;
    status: string;
  } | null;
}

export interface UseClusterStatusOptions {
  /** Poll for status updates while provisioning */
  pollWhileProvisioning?: boolean;
  /** Poll interval in ms (default: 5000) */
  pollInterval?: number;
}

export interface UseClusterStatusResult {
  clusterStatus: ClusterStatus | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  startProvisioning: (projectId: string) => Promise<{ success: boolean; error?: string }>;
}

const defaultStatus: ClusterStatus = {
  hasCluster: false,
  isProvisioning: false,
  isReady: false,
  status: null,
  message: null,
  vaultId: null,
  provisioningAvailable: false,
  cluster: null,
};

/**
 * Hook to check and manage cluster status for an organization
 */
export function useClusterStatus(
  orgId: string | null | undefined,
  projectId?: string | null,
  options: UseClusterStatusOptions = {}
): UseClusterStatusResult {
  const { pollWhileProvisioning = true, pollInterval = 5000 } = options;

  const [clusterStatus, setClusterStatus] = useState<ClusterStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!orgId) {
      setClusterStatus(defaultStatus);
      setIsLoading(false);
      return;
    }

    try {
      const url = projectId
        ? `/api/organizations/${orgId}/cluster?projectId=${projectId}`
        : `/api/organizations/${orgId}/cluster`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch cluster status');
      }

      const data = await response.json();

      const status: ClusterStatus = {
        hasCluster: data.hasCluster || false,
        isProvisioning: ['pending', 'creating_project', 'creating_cluster', 'creating_user', 'configuring_network'].includes(data.status),
        isReady: data.status === 'ready',
        status: data.status,
        message: data.message,
        vaultId: data.vaultId,
        provisioningAvailable: data.provisioningAvailable || false,
        cluster: data.cluster,
      };

      setClusterStatus(status);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setClusterStatus(defaultStatus);
    } finally {
      setIsLoading(false);
    }
  }, [orgId, projectId]);

  const startProvisioning = useCallback(async (targetProjectId: string): Promise<{ success: boolean; error?: string }> => {
    if (!orgId) {
      return { success: false, error: 'No organization ID' };
    }

    try {
      const response = await fetch(`/api/organizations/${orgId}/cluster`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: targetProjectId }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to start provisioning' };
      }

      // Refetch status after starting provisioning
      await fetchStatus();
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, error: message };
    }
  }, [orgId, fetchStatus]);

  // Initial fetch
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Poll while provisioning
  useEffect(() => {
    if (!pollWhileProvisioning || !clusterStatus?.isProvisioning) {
      return;
    }

    const interval = setInterval(fetchStatus, pollInterval);
    return () => clearInterval(interval);
  }, [pollWhileProvisioning, pollInterval, clusterStatus?.isProvisioning, fetchStatus]);

  return {
    clusterStatus,
    isLoading,
    error,
    refetch: fetchStatus,
    startProvisioning,
  };
}

export default useClusterStatus;
