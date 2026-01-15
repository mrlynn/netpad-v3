/**
 * Hook for managing the Data Explorer tree state
 *
 * Handles:
 * - Loading cluster and vault information
 * - Lazy loading databases and collections with SWR caching
 * - Fetching linked forms/workflows for selected collections
 * - Search/filter functionality
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSWRConfig } from 'swr';
import { useClusterProvisioning } from './useClusterProvisioning';
import {
  useDatabases,
  useCollections,
  useLinkedResources,
  cacheKeys,
} from '@/lib/swr';
import type {
  ClusterTreeNode,
  DatabaseTreeNode,
  CollectionTreeNode,
  SelectedNode,
  LinkedResourceInfo,
} from '@/types/dataExplorer';

interface UseDataExplorerResult {
  // Tree state
  clusters: ClusterTreeNode[];
  selectedNode: SelectedNode | null;
  loading: boolean;
  error: string | null;

  // Tree actions
  expandCluster: (clusterId: string) => void;
  collapseCluster: (clusterId: string) => void;
  expandDatabase: (clusterId: string, database: string) => Promise<void>;
  collapseDatabase: (clusterId: string, database: string) => void;
  selectCollection: (
    clusterId: string,
    database: string,
    collection: string,
    vaultId: string
  ) => void;
  clearSelection: () => void;

  // Linked resources
  linkedForms: LinkedResourceInfo[];
  linkedWorkflows: LinkedResourceInfo[];
  linkedLoading: boolean;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Refresh
  refresh: () => Promise<void>;
}

export function useDataExplorer(
  orgId: string | undefined
): UseDataExplorerResult {
  const { mutate } = useSWRConfig();
  const { status: clusterStatus, loading: clusterLoading, refetch: refetchCluster } = useClusterProvisioning(orgId);

  const [clusters, setClusters] = useState<ClusterTreeNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Track which cluster/database is currently being expanded for SWR hooks
  const [expandingClusterId, setExpandingClusterId] = useState<string | null>(null);
  const [expandingDatabase, setExpandingDatabase] = useState<{ clusterId: string; database: string } | null>(null);

  // Get the current vaultId for the expanding cluster
  const expandingCluster = clusters.find(c => c.clusterId === expandingClusterId);
  const expandingVaultId = expandingCluster?.vaultId;

  // SWR hook for databases - only fetches when expandingClusterId is set
  const {
    data: databasesData,
    error: databasesError,
    isLoading: databasesLoading,
  } = useDatabases(orgId, expandingVaultId);

  // SWR hook for collections - only fetches when expandingDatabase is set
  const expandingDbCluster = clusters.find(c => c.clusterId === expandingDatabase?.clusterId);
  const {
    data: collectionsData,
    error: collectionsError,
    isLoading: collectionsLoading,
  } = useCollections(
    orgId,
    expandingDbCluster?.vaultId,
    expandingDatabase?.database,
    { includeStats: true }
  );

  // SWR hook for linked resources - fetches when a collection is selected
  const {
    data: linkedResourcesData,
    isLoading: linkedLoading,
  } = useLinkedResources(
    orgId,
    selectedNode?.vaultId,
    selectedNode?.collection
  );

  // Initialize tree from cluster status
  useEffect(() => {
    if (!clusterStatus?.hasCluster || !clusterStatus.cluster) {
      setClusters([]);
      return;
    }

    const cluster = clusterStatus.cluster;

    // Build initial tree with cluster node
    const clusterNode: ClusterTreeNode = {
      clusterId: cluster.clusterId || 'default',
      name: cluster.atlasClusterName || 'NetPad Cluster',
      status: clusterStatus.status || 'ready',
      statusMessage: clusterStatus.message || undefined,
      provider: (cluster.provider as 'AWS' | 'GCP' | 'AZURE') || 'AWS',
      region: cluster.region || 'US_EAST_1',
      vaultId: clusterStatus.vaultId || '',
      database: 'forms',
      databases: [],
      isExpanded: false,
      isLoading: false,
    };

    setClusters([clusterNode]);
  }, [clusterStatus]);

  // Handle databases data from SWR
  useEffect(() => {
    if (!expandingClusterId || !databasesData?.databases) return;

    const cluster = clusters.find(c => c.clusterId === expandingClusterId);
    if (!cluster) return;

    setClusters((prev) =>
      prev.map((c) => {
        if (c.clusterId !== expandingClusterId) return c;

        const dbNodes: DatabaseTreeNode[] = databasesData.databases.map((db) => ({
          name: db.name,
          vaultId: cluster.vaultId,
          sizeOnDisk: db.sizeOnDisk,
          collections: [],
          isExpanded: false,
          isLoading: false,
          isEmpty: db.empty,
        }));

        return { ...c, databases: dbNodes, isExpanded: true, isLoading: false };
      })
    );

    // Clear expanding state
    setExpandingClusterId(null);
  }, [databasesData, expandingClusterId, clusters]);

  // Handle databases error
  useEffect(() => {
    if (databasesError && expandingClusterId) {
      setError(databasesError.message || 'Failed to load databases');
      setClusters((prev) =>
        prev.map((c) =>
          c.clusterId === expandingClusterId ? { ...c, isLoading: false } : c
        )
      );
      setExpandingClusterId(null);
    }
  }, [databasesError, expandingClusterId]);

  // Handle collections data from SWR
  useEffect(() => {
    if (!expandingDatabase || !collectionsData?.collections) return;

    const { clusterId, database } = expandingDatabase;
    const cluster = clusters.find(c => c.clusterId === clusterId);
    if (!cluster) return;

    setClusters((prev) =>
      prev.map((c) => {
        if (c.clusterId !== clusterId) return c;

        return {
          ...c,
          databases: c.databases.map((db) => {
            if (db.name !== database) return db;

            const collNodes: CollectionTreeNode[] = collectionsData.collections.map((coll) => ({
              name: coll.name,
              database,
              vaultId: cluster.vaultId,
              type: coll.type || 'collection',
              documentCount: coll.documentCount || 0,
              storageSize: coll.storageSize || 0,
              avgDocumentSize: coll.avgObjSize,
              indexCount: coll.indexCount,
              linkedForms: [],
              linkedWorkflows: [],
              isLoadingLinked: false,
            }));

            return {
              ...db,
              collections: collNodes,
              isExpanded: true,
              isLoading: false,
            };
          }),
        };
      })
    );

    // Clear expanding state
    setExpandingDatabase(null);
  }, [collectionsData, expandingDatabase, clusters]);

  // Handle collections error
  useEffect(() => {
    if (collectionsError && expandingDatabase) {
      setError(collectionsError.message || 'Failed to load collections');
      const { clusterId, database } = expandingDatabase;
      setClusters((prev) =>
        prev.map((c) => {
          if (c.clusterId !== clusterId) return c;
          return {
            ...c,
            databases: c.databases.map((db) =>
              db.name === database ? { ...db, isLoading: false } : db
            ),
          };
        })
      );
      setExpandingDatabase(null);
    }
  }, [collectionsError, expandingDatabase]);

  // Expand cluster - triggers SWR fetch for databases
  const expandCluster = useCallback(
    (clusterId: string) => {
      setClusters((prev) =>
        prev.map((cluster) => {
          if (cluster.clusterId !== clusterId) return cluster;

          // If already expanded and has databases, just toggle visibility
          if (cluster.isExpanded && cluster.databases.length > 0) {
            return cluster;
          }

          // If databases already cached (from previous expand), use them
          if (cluster.databases.length > 0) {
            return { ...cluster, isExpanded: true };
          }

          return { ...cluster, isExpanded: true, isLoading: true };
        })
      );

      const cluster = clusters.find((c) => c.clusterId === clusterId);
      if (!cluster || !cluster.vaultId) return;

      // Only trigger fetch if we don't have databases yet
      if (cluster.databases.length === 0) {
        setExpandingClusterId(clusterId);
      }
    },
    [clusters]
  );

  const collapseCluster = useCallback((clusterId: string) => {
    setClusters((prev) =>
      prev.map((cluster) =>
        cluster.clusterId === clusterId
          ? { ...cluster, isExpanded: false }
          : cluster
      )
    );
  }, []);

  // Expand database - triggers SWR fetch for collections
  const expandDatabase = useCallback(
    async (clusterId: string, database: string) => {
      setClusters((prev) =>
        prev.map((cluster) => {
          if (cluster.clusterId !== clusterId) return cluster;

          return {
            ...cluster,
            databases: cluster.databases.map((db) => {
              if (db.name !== database) return db;

              // If already expanded and has collections, just toggle visibility
              if (db.isExpanded && db.collections.length > 0) {
                return db;
              }

              // If collections already cached, use them
              if (db.collections.length > 0) {
                return { ...db, isExpanded: true };
              }

              return { ...db, isExpanded: true, isLoading: true };
            }),
          };
        })
      );

      const cluster = clusters.find((c) => c.clusterId === clusterId);
      const dbNode = cluster?.databases.find((d) => d.name === database);
      if (!cluster || !dbNode) return;

      // Only trigger fetch if we don't have collections yet
      if (dbNode.collections.length === 0) {
        setExpandingDatabase({ clusterId, database });
      }
    },
    [clusters]
  );

  const collapseDatabase = useCallback((clusterId: string, database: string) => {
    setClusters((prev) =>
      prev.map((cluster) => {
        if (cluster.clusterId !== clusterId) return cluster;

        return {
          ...cluster,
          databases: cluster.databases.map((db) =>
            db.name === database ? { ...db, isExpanded: false } : db
          ),
        };
      })
    );
  }, []);

  // Select a collection - SWR will automatically fetch linked resources
  const selectCollection = useCallback(
    (clusterId: string, database: string, collection: string, vaultId: string) => {
      setSelectedNode({
        type: 'collection',
        clusterId,
        vaultId,
        database,
        collection,
      });
    },
    []
  );

  const clearSelection = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // Refresh all data - invalidates SWR cache
  const refresh = useCallback(async () => {
    setError(null);

    // Get all vaultIds from clusters to invalidate their caches
    const vaultIds = clusters.map(c => c.vaultId).filter(Boolean);

    // Invalidate all SWR caches for this org
    if (orgId) {
      for (const vaultId of vaultIds) {
        // Invalidate databases cache
        mutate(cacheKeys.databases(orgId, vaultId));

        // Invalidate collections cache for all expanded databases
        const cluster = clusters.find(c => c.vaultId === vaultId);
        if (cluster) {
          for (const db of cluster.databases) {
            mutate(cacheKeys.collections(orgId, vaultId, db.name));
          }
        }
      }

      // Invalidate linked resources if a collection is selected
      if (selectedNode?.collection) {
        mutate(
          cacheKeys.linkedResources(orgId, selectedNode.collection, selectedNode.vaultId)
        );
      }
    }

    // Refetch cluster status
    await refetchCluster();

    // Reset tree state to trigger re-load
    setClusters([]);
  }, [orgId, clusters, selectedNode, mutate, refetchCluster]);

  // Compute loading state
  const loading = clusterLoading || databasesLoading || collectionsLoading;

  return {
    clusters,
    selectedNode,
    loading,
    error,

    expandCluster,
    collapseCluster,
    expandDatabase,
    collapseDatabase,
    selectCollection,
    clearSelection,

    linkedForms: linkedResourcesData?.forms || [],
    linkedWorkflows: linkedResourcesData?.workflows || [],
    linkedLoading,

    searchQuery,
    setSearchQuery,

    refresh,
  };
}
