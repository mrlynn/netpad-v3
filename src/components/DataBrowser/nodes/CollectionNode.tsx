'use client';

/**
 * Collection Node Component
 * Displays a MongoDB collection in the explorer tree
 */

import React from 'react';
import {
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Chip,
  Badge,
  Stack,
  alpha,
  Tooltip,
} from '@mui/material';
import {
  TableChart as CollectionIcon,
  Visibility as ViewIcon,
  Timeline as TimeseriesIcon,
  Description as FormIcon,
  AccountTree as WorkflowIcon,
} from '@mui/icons-material';
import type { CollectionTreeNode } from '@/types/dataExplorer';

interface CollectionNodeProps {
  collection: CollectionTreeNode;
  isSelected: boolean;
  onSelect: () => void;
}

function formatDocCount(count: number): string {
  if (count < 1000) return count.toString();
  if (count < 1000000) return `${(count / 1000).toFixed(1)}K`;
  return `${(count / 1000000).toFixed(1)}M`;
}

function formatSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function CollectionNode({ collection, isSelected, onSelect }: CollectionNodeProps) {
  const formCount = collection.linkedForms.length;
  const workflowCount = collection.linkedWorkflows.length;
  const hasLinkedResources = formCount > 0 || workflowCount > 0;

  const getIcon = () => {
    switch (collection.type) {
      case 'view':
        return <ViewIcon sx={{ fontSize: 18, color: 'text.secondary' }} />;
      case 'timeseries':
        return <TimeseriesIcon sx={{ fontSize: 18, color: '#9c27b0' }} />;
      default:
        return <CollectionIcon sx={{ fontSize: 18, color: 'text.secondary' }} />;
    }
  };

  return (
    <ListItemButton
      onClick={onSelect}
      selected={isSelected}
      sx={{
        pl: 7,
        borderRadius: 1,
        mb: 0.5,
        '&.Mui-selected': {
          bgcolor: alpha('#00ED64', 0.12),
          '&:hover': {
            bgcolor: alpha('#00ED64', 0.18),
          },
        },
        '&:hover': {
          bgcolor: 'action.hover',
        },
      }}
    >
      <ListItemIcon sx={{ minWidth: 32 }}>
        {hasLinkedResources ? (
          <Badge
            variant="dot"
            sx={{
              '& .MuiBadge-badge': {
                bgcolor: '#9c27b0',
                width: 6,
                height: 6,
                minWidth: 6,
              },
            }}
          >
            {getIcon()}
          </Badge>
        ) : (
          getIcon()
        )}
      </ListItemIcon>
      <ListItemText
        primary={collection.name}
        secondary={
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.25 }}>
            <Chip
              label={formatDocCount(collection.documentCount)}
              size="small"
              sx={{
                height: 16,
                fontSize: '0.6rem',
                bgcolor: alpha('#00ED64', 0.1),
                color: 'text.secondary',
                '& .MuiChip-label': {
                  px: 0.75,
                },
              }}
            />
            {collection.type === 'view' && (
              <Chip
                label="view"
                size="small"
                sx={{
                  height: 16,
                  fontSize: '0.6rem',
                  bgcolor: alpha('#2196f3', 0.1),
                  color: '#2196f3',
                  '& .MuiChip-label': {
                    px: 0.75,
                  },
                }}
              />
            )}
            {collection.type === 'timeseries' && (
              <Chip
                label="timeseries"
                size="small"
                sx={{
                  height: 16,
                  fontSize: '0.6rem',
                  bgcolor: alpha('#9c27b0', 0.1),
                  color: '#9c27b0',
                  '& .MuiChip-label': {
                    px: 0.75,
                  },
                }}
              />
            )}
          </Stack>
        }
        primaryTypographyProps={{
          variant: 'body2',
          fontWeight: isSelected ? 600 : 400,
          sx: { fontSize: '0.85rem' },
        }}
      />
      {hasLinkedResources && (
        <Stack direction="row" spacing={0.5}>
          {formCount > 0 && (
            <Tooltip title={`${formCount} form${formCount !== 1 ? 's' : ''} linked`}>
              <Chip
                icon={<FormIcon sx={{ fontSize: '12px !important' }} />}
                label={formCount}
                size="small"
                sx={{
                  height: 18,
                  fontSize: '0.6rem',
                  bgcolor: alpha('#00ED64', 0.1),
                  color: '#00ED64',
                  '& .MuiChip-icon': {
                    color: '#00ED64',
                    ml: 0.5,
                  },
                  '& .MuiChip-label': {
                    px: 0.5,
                  },
                }}
              />
            </Tooltip>
          )}
          {workflowCount > 0 && (
            <Tooltip title={`${workflowCount} workflow${workflowCount !== 1 ? 's' : ''} linked`}>
              <Chip
                icon={<WorkflowIcon sx={{ fontSize: '12px !important' }} />}
                label={workflowCount}
                size="small"
                sx={{
                  height: 18,
                  fontSize: '0.6rem',
                  bgcolor: alpha('#9c27b0', 0.1),
                  color: '#9c27b0',
                  '& .MuiChip-icon': {
                    color: '#9c27b0',
                    ml: 0.5,
                  },
                  '& .MuiChip-label': {
                    px: 0.5,
                  },
                }}
              />
            </Tooltip>
          )}
        </Stack>
      )}
    </ListItemButton>
  );
}
