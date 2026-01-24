'use client';

/**
 * Cluster Node Component
 * Displays a MongoDB Atlas cluster in the explorer tree
 */

import React from 'react';
import {
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Chip,
  Stack,
  alpha,
} from '@mui/material';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import {
  CloudQueue as ClusterIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
} from '@mui/icons-material';
import type { ClusterTreeNode } from '@/types/dataExplorer';

interface ClusterNodeProps {
  cluster: ClusterTreeNode;
  onToggle: () => void;
}

export function ClusterNode({ cluster, onToggle }: ClusterNodeProps) {
  const isReady = cluster.status === 'ready';
  const isProvisioning = [
    'pending',
    'creating_project',
    'creating_cluster',
    'creating_user',
    'configuring_network',
  ].includes(cluster.status);
  const isFailed = cluster.status === 'failed';

  const getStatusColor = () => {
    if (isReady) return '#00ED64';
    if (isProvisioning) return '#2196f3';
    if (isFailed) return '#f44336';
    return '#9e9e9e';
  };

  const getStatusLabel = () => {
    if (isReady) return 'Active';
    if (isProvisioning) return 'Provisioning';
    if (isFailed) return 'Failed';
    return cluster.status;
  };

  return (
    <ListItemButton
      onClick={onToggle}
      sx={{
        borderRadius: 1,
        mb: 0.5,
        '&:hover': {
          bgcolor: alpha('#2196F3', 0.08),
        },
      }}
    >
      <ListItemIcon sx={{ minWidth: 36 }}>
        <ClusterIcon sx={{ color: '#2196F3' }} />
      </ListItemIcon>
      <ListItemText
        primary={cluster.name}
        secondary={
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
            <Chip
              label={getStatusLabel()}
              size="small"
              sx={{
                height: 20,
                fontSize: '0.7rem',
                bgcolor: alpha(getStatusColor(), 0.15),
                color: getStatusColor(),
                fontWeight: 500,
                ...(isProvisioning && {
                  animation: 'pulse 1.5s infinite',
                  '@keyframes pulse': {
                    '0%': { opacity: 1 },
                    '50%': { opacity: 0.6 },
                    '100%': { opacity: 1 },
                  },
                }),
              }}
            />
            <Chip
              label={cluster.provider}
              size="small"
              variant="outlined"
              sx={{
                height: 20,
                fontSize: '0.65rem',
                borderColor: 'divider',
              }}
            />
          </Stack>
        }
        primaryTypographyProps={{
          variant: 'body2',
          fontWeight: 500,
        }}
      />
      {cluster.isLoading ? (
        <NetPadLoader size="small" variant="svg" showPhrases={false} />
      ) : cluster.isExpanded ? (
        <CollapseIcon fontSize="small" sx={{ color: 'text.secondary' }} />
      ) : (
        <ExpandIcon fontSize="small" sx={{ color: 'text.secondary' }} />
      )}
    </ListItemButton>
  );
}
