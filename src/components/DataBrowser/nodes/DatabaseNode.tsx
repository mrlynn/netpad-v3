'use client';

/**
 * Database Node Component
 * Displays a MongoDB database in the explorer tree
 */

import React from 'react';
import {
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Chip,
  CircularProgress,
  Stack,
  alpha,
} from '@mui/material';
import {
  Storage as DatabaseIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
} from '@mui/icons-material';
import type { DatabaseTreeNode } from '@/types/dataExplorer';

interface DatabaseNodeProps {
  database: DatabaseTreeNode;
  onToggle: () => void;
}

function formatSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function DatabaseNode({ database, onToggle }: DatabaseNodeProps) {
  const collectionCount = database.collections.length;
  const hasCollections = database.isExpanded && collectionCount > 0;

  return (
    <ListItemButton
      onClick={onToggle}
      sx={{
        pl: 4,
        borderRadius: 1,
        mb: 0.5,
        '&:hover': {
          bgcolor: alpha('#00ED64', 0.08),
        },
      }}
    >
      <ListItemIcon sx={{ minWidth: 36 }}>
        <DatabaseIcon sx={{ color: '#00ED64', fontSize: 20 }} />
      </ListItemIcon>
      <ListItemText
        primary={database.name}
        secondary={
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.25 }}>
            {hasCollections && (
              <Chip
                label={`${collectionCount} collection${collectionCount !== 1 ? 's' : ''}`}
                size="small"
                variant="outlined"
                sx={{
                  height: 18,
                  fontSize: '0.65rem',
                  borderColor: 'divider',
                }}
              />
            )}
            {database.sizeOnDisk && database.sizeOnDisk > 0 && (
              <Chip
                label={formatSize(database.sizeOnDisk)}
                size="small"
                variant="outlined"
                sx={{
                  height: 18,
                  fontSize: '0.65rem',
                  borderColor: 'divider',
                }}
              />
            )}
          </Stack>
        }
        primaryTypographyProps={{
          variant: 'body2',
          fontWeight: 500,
        }}
      />
      {database.isLoading ? (
        <CircularProgress size={14} sx={{ color: '#00ED64' }} />
      ) : database.isExpanded ? (
        <CollapseIcon fontSize="small" sx={{ color: 'text.secondary' }} />
      ) : (
        <ExpandIcon fontSize="small" sx={{ color: 'text.secondary' }} />
      )}
    </ListItemButton>
  );
}
