/**
 * Data Explorer Types
 * Types for the tree/explorer view of MongoDB Atlas resources
 */

import { ProvisioningStatus } from '@/lib/atlas/types';

/**
 * Information about a linked form or workflow
 */
export interface LinkedResourceInfo {
  id: string;
  name: string;
  type: 'form' | 'workflow';
  status?: string;
  lastModified?: string;
  projectId?: string;
}

/**
 * Collection node in the explorer tree
 */
export interface CollectionTreeNode {
  name: string;
  database: string;
  vaultId: string;
  type: 'collection' | 'view' | 'timeseries';
  documentCount: number;
  storageSize: number;
  avgDocumentSize?: number;
  indexCount?: number;
  linkedForms: LinkedResourceInfo[];
  linkedWorkflows: LinkedResourceInfo[];
  isLoadingLinked: boolean;
}

/**
 * Database node in the explorer tree
 */
export interface DatabaseTreeNode {
  name: string;
  vaultId: string;
  sizeOnDisk?: number;
  collections: CollectionTreeNode[];
  isExpanded: boolean;
  isLoading: boolean;
  isEmpty?: boolean;
}

/**
 * Cluster node in the explorer tree
 */
export interface ClusterTreeNode {
  clusterId: string;
  name: string;
  status: ProvisioningStatus;
  statusMessage?: string;
  provider: 'AWS' | 'GCP' | 'AZURE';
  region: string;
  vaultId: string;
  database: string;
  databases: DatabaseTreeNode[];
  isExpanded: boolean;
  isLoading: boolean;
}

/**
 * Currently selected node in the tree
 */
export interface SelectedNode {
  type: 'cluster' | 'database' | 'collection';
  clusterId?: string;
  vaultId: string;
  database: string;
  collection?: string;
}

/**
 * Overall state of the data explorer
 */
export interface DataExplorerState {
  clusters: ClusterTreeNode[];
  selectedNode: SelectedNode | null;
  loading: boolean;
  error: string | null;
  searchQuery: string;
}

/**
 * API response for linked resources
 */
export interface LinkedResourcesResponse {
  forms: LinkedResourceInfo[];
  workflows: LinkedResourceInfo[];
}

/**
 * Collection stats from API
 */
export interface CollectionStats {
  name: string;
  type: 'collection' | 'view' | 'timeseries';
  documentCount: number;
  storageSize: number;
  avgObjSize?: number;
  indexCount?: number;
  totalIndexSize?: number;
}

/**
 * Database info from API
 */
export interface DatabaseInfo {
  name: string;
  sizeOnDisk?: number;
  empty?: boolean;
}
