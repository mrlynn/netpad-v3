'use client';

/**
 * Data Explorer Tab Component
 * Main container for the Data Explorer with tree view and detail panel
 */

import React, { useState, useCallback } from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import { ArrowBack as BackIcon } from '@mui/icons-material';
import { usePathname } from 'next/navigation';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useDataExplorer } from '@/hooks/useDataExplorer';
import { DataExplorerTree } from './DataExplorerTree';
import { CollectionDetailPanel } from './CollectionDetailPanel';
import { DataBrowser } from './DataBrowser';
import { parseOrgProjectFromPath } from '@/lib/routing';

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
