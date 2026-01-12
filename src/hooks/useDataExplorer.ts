/**
 * Hook for managing the Data Explorer tree state
 *
 * Handles:
 * - Loading cluster and vault information
 * - Lazy loading databases and collections
 * - Fetching linked forms/workflows for selected collections
 * - Search/filter functionality
 */

import { useState, useEffect, useCallback } from 'react';
import { useClusterProvisioning } from './useClusterProvisioning';
import type {
  ClusterTreeNode,
  DatabaseTreeNode,
  CollectionTreeNode,
  SelectedNode,
  LinkedResourceInfo,
  DatabaseInfo,
  CollectionStats,
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
  const { status: clusterStatus, loading: clusterLoading, refetch: refetchCluster } = useClusterProvisioning(orgId);

  const [clusters, setClusters] = useState<ClusterTreeNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Linked resources state
  const [linkedForms, setLinkedForms] = useState<LinkedResourceInfo[]>([]);
  const [linkedWorkflows, setLinkedWorkflows] = useState<LinkedResourceInfo[]>([]);
  const [linkedLoading, setLinkedLoading] = useState(false);

  // Initialize tree from cluster status
  useEffect(() => {
    if (!clusterStatus?.hasCluster || !clusterStatus.cluster) {
      setClusters([]);
      return;
    }

    const cluster = clusterStatus.cluster;

    // Build initial tree with cluster node
    // Note: database name is not stored on cluster, it will be loaded dynamically from the vault
    const clusterNode: ClusterTreeNode = {
      clusterId: cluster.clusterId || 'default',
      name: cluster.atlasClusterName || 'NetPad Cluster',
      status: clusterStatus.status || 'ready',
      statusMessage: clusterStatus.message || undefined,
      provider: (cluster.provider as 'AWS' | 'GCP' | 'AZURE') || 'AWS',
      region: cluster.region || 'US_EAST_1',
      vaultId: clusterStatus.vaultId || '',
      database: 'forms', // Default database name, actual databases loaded on expand
      databases: [],
      isExpanded: false,
      isLoading: false,
    };

    setClusters([clusterNode]);
  }, [clusterStatus]);

  // Fetch databases for a cluster
  const fetchDatabases = useCallback(
    async (clusterId: string, vaultId: string): Promise<DatabaseInfo[]> => {
      if (!vaultId || !orgId) return [];

      try {
        const response = await fetch(
          `/api/collections?organizationId=${orgId}&vaultId=${vaultId}`
        );
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Failed to fetch databases');
        }
        const data = await response.json();
        return data.databases || [];
      } catch (err) {
        console.error('Failed to fetch databases:', err);
        throw err;
      }
    },
    [orgId]
  );

  // Fetch collections for a database
  const fetchCollections = useCallback(
    async (vaultId: string, database: string): Promise<CollectionStats[]> => {
      if (!vaultId || !database || !orgId) return [];

      try {
        const response = await fetch(
          `/api/collections?organizationId=${orgId}&vaultId=${vaultId}&database=${database}&includeStats=true`
        );
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Failed to fetch collections');
        }
        const data = await response.json();
        return data.collections || [];
      } catch (err) {
        console.error('Failed to fetch collections:', err);
        throw err;
      }
    },
    [orgId]
  );

  // Fetch linked resources for a collection
  const fetchLinkedResources = useCallback(
    async (vaultId: string, collection: string) => {
      if (!orgId || !collection) return;

      setLinkedLoading(true);
      try {
        const params = new URLSearchParams({
          organizationId: orgId,
          collection,
          ...(vaultId && { vaultId }),
        });

        const response = await fetch(`/api/data-explorer/linked-resources?${params}`);
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Failed to fetch linked resources');
        }

        const data = await response.json();
        setLinkedForms(data.forms || []);
        setLinkedWorkflows(data.workflows || []);
      } catch (err) {
        console.error('Failed to fetch linked resources:', err);
        setLinkedForms([]);
        setLinkedWorkflows([]);
      } finally {
        setLinkedLoading(false);
      }
    },
    [orgId]
  );

  // Expand cluster - loads databases
  const expandCluster = useCallback(
    async (clusterId: string) => {
      setClusters((prev) =>
        prev.map((cluster) => {
          if (cluster.clusterId !== clusterId) return cluster;

          // If already expanded and has databases, just toggle
          if (cluster.isExpanded && cluster.databases.length > 0) {
            return cluster;
          }

          return { ...cluster, isExpanded: true, isLoading: true };
        })
      );

      const cluster = clusters.find((c) => c.clusterId === clusterId);
      if (!cluster || !cluster.vaultId) return;

      try {
        const databases = await fetchDatabases(clusterId, cluster.vaultId);

        setClusters((prev) =>
          prev.map((c) => {
            if (c.clusterId !== clusterId) return c;

            const dbNodes: DatabaseTreeNode[] = databases.map((db) => ({
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
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load databases');
        setClusters((prev) =>
          prev.map((c) =>
            c.clusterId === clusterId ? { ...c, isLoading: false } : c
          )
        );
      }
    },
    [clusters, fetchDatabases]
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

  // Expand database - loads collections
  const expandDatabase = useCallback(
    async (clusterId: string, database: string) => {
      setClusters((prev) =>
        prev.map((cluster) => {
          if (cluster.clusterId !== clusterId) return cluster;

          return {
            ...cluster,
            databases: cluster.databases.map((db) => {
              if (db.name !== database) return db;

              // If already expanded and has collections, just toggle
              if (db.isExpanded && db.collections.length > 0) {
                return db;
              }

              return { ...db, isExpanded: true, isLoading: true };
            }),
          };
        })
      );

      const cluster = clusters.find((c) => c.clusterId === clusterId);
      const dbNode = cluster?.databases.find((d) => d.name === database);
      if (!cluster || !dbNode) return;

      try {
        const collections = await fetchCollections(cluster.vaultId, database);

        setClusters((prev) =>
          prev.map((c) => {
            if (c.clusterId !== clusterId) return c;

            return {
              ...c,
              databases: c.databases.map((db) => {
                if (db.name !== database) return db;

                const collNodes: CollectionTreeNode[] = collections.map((coll) => ({
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
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load collections');
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
      }
    },
    [clusters, fetchCollections]
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

  // Select a collection
  const selectCollection = useCallback(
    (clusterId: string, database: string, collection: string, vaultId: string) => {
      setSelectedNode({
        type: 'collection',
        clusterId,
        vaultId,
        database,
        collection,
      });

      // Fetch linked resources for this collection
      fetchLinkedResources(vaultId, collection);
    },
    [fetchLinkedResources]
  );

  const clearSelection = useCallback(() => {
    setSelectedNode(null);
    setLinkedForms([]);
    setLinkedWorkflows([]);
  }, []);

  // Refresh all data
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await refetchCluster();
      // Reset tree state to trigger re-load
      setClusters([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh');
    } finally {
      setLoading(false);
    }
  }, [refetchCluster]);

  return {
    clusters,
    selectedNode,
    loading: loading || clusterLoading,
    error,

    expandCluster,
    collapseCluster,
    expandDatabase,
    collapseDatabase,
    selectCollection,
    clearSelection,

    linkedForms,
    linkedWorkflows,
    linkedLoading,

    searchQuery,
    setSearchQuery,

    refresh,
  };
}
