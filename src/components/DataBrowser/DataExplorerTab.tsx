'use client';

/**
 * Data Explorer Tab Component
 * Main container for the Data Explorer with tree view and detail panel
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  IconButton,
  Tooltip,
  Paper,
  Typography,
  Button,
  alpha,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Storage,
  Search,
  TableChart,
  DataObject,
  ImportExport,
} from '@mui/icons-material';
import { usePathname } from 'next/navigation';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useDataExplorer } from '@/hooks/useDataExplorer';
import { DataExplorerTree } from './DataExplorerTree';
import { CollectionDetailPanel } from './CollectionDetailPanel';
import { DataBrowser } from './DataBrowser';
import { parseOrgProjectFromPath } from '@/lib/routing';
import { NetPadLoader } from '@/components/common/NetPadLoader';

interface DataExplorerTabProps {
  onNeedConnection?: () => void;
}

export function DataExplorerTab({ onNeedConnection }: DataExplorerTabProps) {
  const { currentOrgId } = useOrganization();
  const pathname = usePathname();
  const { projectId } = parseOrgProjectFromPath(pathname || '');
  const [browsing, setBrowsing] = useState(false);

  const {
    clusters,
    selectedNode,
    loading,
    error,
    searchQuery,
    expandCluster,
    collapseCluster,
    expandDatabase,
    collapseDatabase,
    selectCollection,
    clearSelection,
    linkedForms,
    linkedWorkflows,
    linkedLoading,
    setSearchQuery,
    refresh,
  } = useDataExplorer(currentOrgId || undefined);

  // Get selected collection stats
  const getSelectedCollectionStats = useCallback(() => {
    if (!selectedNode || selectedNode.type !== 'collection') {
      return { documentCount: undefined, storageSize: undefined };
    }

    for (const cluster of clusters) {
      if (cluster.clusterId === selectedNode.clusterId) {
        const db = cluster.databases.find((d) => d.name === selectedNode.database);
        if (db) {
          const coll = db.collections.find((c) => c.name === selectedNode.collection);
          if (coll) {
            return {
              documentCount: coll.documentCount,
              storageSize: coll.storageSize,
            };
          }
        }
      }
    }

    return { documentCount: undefined, storageSize: undefined };
  }, [clusters, selectedNode]);

  const { documentCount, storageSize } = getSelectedCollectionStats();

  const handleBrowseData = useCallback(() => {
    setBrowsing(true);
  }, []);

  const handleBackToExplorer = useCallback(() => {
    setBrowsing(false);
  }, []);

  // If browsing, show DataBrowser with back button
  if (browsing && selectedNode && selectedNode.collection) {
    return (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header with back button */}
        <Box
          sx={{
            px: 2,
            py: 1,
            borderBottom: 1,
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <Tooltip title="Back to Explorer">
            <IconButton size="small" onClick={handleBackToExplorer}>
              <BackIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Box sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
            {selectedNode.database} / <strong>{selectedNode.collection}</strong>
          </Box>
        </Box>

        {/* DataBrowser */}
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          <DataBrowser
            showConnectionPanel={false}
            initialDatabase={selectedNode.database}
            initialCollection={selectedNode.collection}
            initialVaultId={selectedNode.vaultId}
            projectId={projectId || undefined}
            onNeedConnection={onNeedConnection}
          />
        </Box>
      </Box>
    );
  }

  // Show loading state
  if (loading && clusters.length === 0) {
    return (
      <Box
        sx={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <NetPadLoader size="large" variant="ascii" message="Loading data connections..." />
      </Box>
    );
  }

  // Show empty state when no connections/clusters exist
  if (!loading && clusters.length === 0) {
    return (
      <Box
        sx={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 4,
        }}
      >
        <Paper
          sx={{
            p: 6,
            textAlign: 'center',
            bgcolor: alpha('#2196F3', 0.02),
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: 2,
            maxWidth: 600,
          }}
        >
          <Storage sx={{ fontSize: 48, color: '#2196F3', mb: 2 }} />
          <Typography variant="h5" sx={{ color: 'text.primary', mb: 1, fontWeight: 600 }}>
            Explore Your Data
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 500, mx: 'auto' }}>
            Browse, search, and manage your MongoDB collections. View documents,
            see linked forms and workflows, and import or export data.
          </Typography>

          {/* Data Features */}
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 4, flexWrap: 'wrap' }}>
            {[
              { icon: <Search sx={{ fontSize: 16 }} />, label: 'Visual search' },
              { icon: <TableChart sx={{ fontSize: 16 }} />, label: 'Multiple views' },
              { icon: <DataObject sx={{ fontSize: 16 }} />, label: 'Document editor' },
              { icon: <ImportExport sx={{ fontSize: 16 }} />, label: 'Import & export' },
            ].map((item) => (
              <Box
                key={item.label}
                sx={{
                  px: 2,
                  py: 1,
                  borderRadius: 2,
                  bgcolor: alpha('#2196F3', 0.08),
                  border: '1px solid',
                  borderColor: alpha('#2196F3', 0.2),
                }}
              >
                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {item.icon} {item.label}
                </Typography>
              </Box>
            ))}
          </Box>

          <Button
            variant="contained"
            size="large"
            onClick={onNeedConnection}
            sx={{
              bgcolor: '#2196F3',
              color: 'white',
              textTransform: 'none',
              fontWeight: 600,
              px: 4,
              py: 1.5,
              '&:hover': { bgcolor: '#1976D2' },
            }}
          >
            Set Up Database Connection
          </Button>

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3 }}>
            Connect to your MongoDB cluster to start exploring data
          </Typography>
        </Paper>
      </Box>
    );
  }

  // Default: Explorer view
  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        gap: 2,
        p: 2,
        overflow: 'hidden',
      }}
    >
      {/* Tree panel - left side */}
      <Box
        sx={{
          width: { xs: '100%', md: '35%' },
          minWidth: 280,
          maxWidth: 400,
          flexShrink: 0,
          display: { xs: selectedNode ? 'none' : 'block', md: 'block' },
        }}
      >
        <DataExplorerTree
          clusters={clusters}
          selectedNode={selectedNode}
          loading={loading}
          error={error}
          searchQuery={searchQuery}
          onExpandCluster={expandCluster}
          onCollapseCluster={collapseCluster}
          onExpandDatabase={expandDatabase}
          onCollapseDatabase={collapseDatabase}
          onSelectCollection={selectCollection}
          onSearchChange={setSearchQuery}
          onRefresh={refresh}
        />
      </Box>

      {/* Detail panel - right side */}
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          display: { xs: selectedNode ? 'block' : 'none', md: 'block' },
        }}
      >
        {/* Mobile back button */}
        <Box
          sx={{
            display: { xs: selectedNode ? 'flex' : 'none', md: 'none' },
            mb: 1,
          }}
        >
          <IconButton size="small" onClick={clearSelection}>
            <BackIcon fontSize="small" />
          </IconButton>
        </Box>

        <CollectionDetailPanel
          selectedNode={selectedNode}
          linkedForms={linkedForms}
          linkedWorkflows={linkedWorkflows}
          linkedLoading={linkedLoading}
          documentCount={documentCount}
          storageSize={storageSize}
          onBrowseData={handleBrowseData}
        />
      </Box>
    </Box>
  );
}
