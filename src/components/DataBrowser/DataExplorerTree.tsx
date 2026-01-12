'use client';

/**
 * Data Explorer Tree Component
 * Renders the hierarchical tree view of Cluster > Database > Collection
 */

import React from 'react';
import {
  Box,
  List,
  Collapse,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Paper,
  alpha,
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  CloudOff as NoClusterIcon,
} from '@mui/icons-material';
import { ClusterNode, DatabaseNode, CollectionNode } from './nodes';
import type {
  ClusterTreeNode,
  DatabaseTreeNode,
  CollectionTreeNode,
  SelectedNode,
} from '@/types/dataExplorer';

interface DataExplorerTreeProps {
  clusters: ClusterTreeNode[];
  selectedNode: SelectedNode | null;
  loading: boolean;
  error: string | null;
  searchQuery: string;

  onExpandCluster: (clusterId: string) => void;
  onCollapseCluster: (clusterId: string) => void;
  onExpandDatabase: (clusterId: string, database: string) => Promise<void>;
  onCollapseDatabase: (clusterId: string, database: string) => void;
  onSelectCollection: (
    clusterId: string,
    database: string,
    collection: string,
    vaultId: string
  ) => void;
  onSearchChange: (query: string) => void;
  onRefresh: () => void;
}

export function DataExplorerTree({
  clusters,
  selectedNode,
  loading,
  error,
  searchQuery,
  onExpandCluster,
  onCollapseCluster,
  onExpandDatabase,
  onCollapseDatabase,
  onSelectCollection,
  onSearchChange,
  onRefresh,
}: DataExplorerTreeProps) {
  // Filter collections by search query
  const filterCollections = (collections: CollectionTreeNode[]): CollectionTreeNode[] => {
    if (!searchQuery) return collections;
    const query = searchQuery.toLowerCase();
    return collections.filter((c) => c.name.toLowerCase().includes(query));
  };

  // Check if any collections match the search
  const hasMatchingCollections = (database: DatabaseTreeNode): boolean => {
    if (!searchQuery) return true;
    return filterCollections(database.collections).length > 0;
  };

  const handleToggleCluster = (cluster: ClusterTreeNode) => {
    if (cluster.isExpanded) {
      onCollapseCluster(cluster.clusterId);
    } else {
      onExpandCluster(cluster.clusterId);
    }
  };

  const handleToggleDatabase = (clusterId: string, database: DatabaseTreeNode) => {
    if (database.isExpanded) {
      onCollapseDatabase(clusterId, database.name);
    } else {
      onExpandDatabase(clusterId, database.name);
    }
  };

  const isCollectionSelected = (
    clusterId: string,
    database: string,
    collection: string
  ): boolean => {
    return (
      selectedNode?.type === 'collection' &&
      selectedNode.clusterId === clusterId &&
      selectedNode.database === database &&
      selectedNode.collection === collection
    );
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      {/* Header with search */}
      <Box
        sx={{
          p: 1.5,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <TextField
          placeholder="Search collections..."
          size="small"
          fullWidth
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <Tooltip title="Refresh">
                  <IconButton
                    size="small"
                    onClick={onRefresh}
                    disabled={loading}
                  >
                    {loading ? (
                      <CircularProgress size={16} />
                    ) : (
                      <RefreshIcon fontSize="small" />
                    )}
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            ),
            sx: {
              borderRadius: 2,
              fontSize: '0.875rem',
            },
          }}
        />
      </Box>

      {/* Error message */}
      {error && (
        <Alert severity="error" sx={{ m: 1, borderRadius: 1 }} onClose={() => {}}>
          {error}
        </Alert>
      )}

      {/* Tree content */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
        {loading && clusters.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
            }}
          >
            <CircularProgress size={32} sx={{ color: '#00ED64' }} />
          </Box>
        ) : clusters.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: 2,
              color: 'text.secondary',
            }}
          >
            <NoClusterIcon sx={{ fontSize: 48, opacity: 0.5 }} />
            <Typography variant="body2" color="text.secondary" textAlign="center">
              No cluster provisioned
            </Typography>
            <Typography variant="caption" color="text.secondary" textAlign="center">
              Go to Infrastructure tab to provision a cluster
            </Typography>
          </Box>
        ) : (
          <List disablePadding>
            {clusters.map((cluster) => (
              <React.Fragment key={cluster.clusterId}>
                <ClusterNode
                  cluster={cluster}
                  onToggle={() => handleToggleCluster(cluster)}
                />

                <Collapse in={cluster.isExpanded}>
                  <List disablePadding>
                    {cluster.databases.length === 0 && !cluster.isLoading && (
                      <Box sx={{ pl: 4, py: 2 }}>
                        <Typography variant="body2" color="text.secondary" fontStyle="italic">
                          No databases found
                        </Typography>
                      </Box>
                    )}

                    {cluster.databases
                      .filter((db) => hasMatchingCollections(db) || !searchQuery)
                      .map((database) => (
                        <React.Fragment key={database.name}>
                          <DatabaseNode
                            database={database}
                            onToggle={() => handleToggleDatabase(cluster.clusterId, database)}
                          />

                          <Collapse in={database.isExpanded}>
                            <List disablePadding>
                              {database.collections.length === 0 && !database.isLoading && (
                                <Box sx={{ pl: 7, py: 1 }}>
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    fontStyle="italic"
                                    fontSize="0.8rem"
                                  >
                                    No collections
                                  </Typography>
                                </Box>
                              )}

                              {filterCollections(database.collections).map((collection) => (
                                <CollectionNode
                                  key={collection.name}
                                  collection={collection}
                                  isSelected={isCollectionSelected(
                                    cluster.clusterId,
                                    database.name,
                                    collection.name
                                  )}
                                  onSelect={() =>
                                    onSelectCollection(
                                      cluster.clusterId,
                                      database.name,
                                      collection.name,
                                      cluster.vaultId
                                    )
                                  }
                                />
                              ))}
                            </List>
                          </Collapse>
                        </React.Fragment>
                      ))}
                  </List>
                </Collapse>
              </React.Fragment>
            ))}
          </List>
        )}
      </Box>
    </Paper>
  );
}
