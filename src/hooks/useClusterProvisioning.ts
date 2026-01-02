/**
 * Hook for monitoring cluster provisioning status
 */

import { useState, useEffect, useCallback } from 'react';
import { ClusterProvisioningStatus, ProvisionedClusterInfo } from '@/types/platform';

interface ClusterStatus {
  provisioningAvailable: boolean;
  hasCluster: boolean;
  status: ClusterProvisioningStatus | null;
  message: string | null;
  vaultId: string | null;
  cluster: ProvisionedClusterInfo | null;
}

interface UseClusterProvisioningResult {
  status: ClusterStatus | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  triggerProvisioning: (options?: {
    provider?: 'AWS' | 'GCP' | 'AZURE';
    region?: string;
    databaseName?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  deleteCluster: () => Promise<{ success: boolean; error?: string; warning?: string }>;
}

export function useClusterProvisioning(orgId: string | undefined): UseClusterProvisioningResult {
  const [status, setStatus] = useState<ClusterStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!orgId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/organizations/${orgId}/cluster`);
      const data = await response.json();

      if (response.ok) {
        setStatus(data);
      } else {
        setError(data.error || 'Failed to fetch cluster status');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect to server');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  const triggerProvisioning = useCallback(async (options?: {
    provider?: 'AWS' | 'GCP' | 'AZURE';
    region?: string;
    databaseName?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    if (!orgId) {
      return { success: false, error: 'No organization selected' };
    }

    try {
      const response = await fetch(`/api/organizations/${orgId}/cluster`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options || {}),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Refetch status after successful provisioning
        await fetchStatus();
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Failed to provision cluster' };
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to connect to server' };
    }
  }, [orgId, fetchStatus]);

  const deleteCluster = useCallback(async (): Promise<{ success: boolean; error?: string; warning?: string }> => {
    if (!orgId) {
      return { success: false, error: 'No organization selected' };
    }

    try {
      const response = await fetch(`/api/organizations/${orgId}/cluster`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Refetch status after successful deletion
        await fetchStatus();
        return { success: true, warning: data.warning };
      } else {
        return { success: false, error: data.error || 'Failed to delete cluster' };
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to connect to server' };
    }
  }, [orgId, fetchStatus]);

  // Fetch status on mount and when orgId changes
  useEffect(() => {
    if (orgId) {
      fetchStatus();
    }
  }, [orgId, fetchStatus]);

  // Poll for status updates when provisioning is in progress
  useEffect(() => {
    if (!orgId || !status) return;

    const inProgressStatuses: ClusterProvisioningStatus[] = [
      'pending',
      'creating_project',
      'creating_cluster',
      'creating_user',
      'configuring_network',
    ];

    if (status.status && inProgressStatuses.includes(status.status)) {
      const pollInterval = setInterval(fetchStatus, 5000); // Poll every 5 seconds
      return () => clearInterval(pollInterval);
    }
  }, [orgId, status, fetchStatus]);

  return {
    status,
    loading,
    error,
    refetch: fetchStatus,
    triggerProvisioning,
    deleteCluster,
  };
}
