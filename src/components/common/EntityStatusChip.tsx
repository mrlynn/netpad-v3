'use client';

import React from 'react';
import { Chip, CircularProgress, Tooltip, alpha, useTheme } from '@mui/material';
import {
  CheckCircle as SavedIcon,
  RadioButtonUnchecked as UnsavedIcon,
  ErrorOutline as ErrorIcon,
  Refresh as RetryIcon,
} from '@mui/icons-material';

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

interface EntityStatusChipProps {
  status: SaveStatus;
  lastSaved?: Date | null;
  onRetry?: () => void;
  entityType?: 'form' | 'workflow';
  size?: 'small' | 'medium';
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);

  if (diffSecs < 10) return 'just now';
  if (diffSecs < 60) return `${diffSecs}s ago`;
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
}

export function EntityStatusChip({
  status,
  lastSaved,
  onRetry,
  size = 'small',
}: EntityStatusChipProps) {
  const theme = useTheme();

  const config = {
    saved: {
      label: lastSaved ? `Saved ${formatRelativeTime(lastSaved)}` : 'All changes saved',
      icon: <SavedIcon sx={{ fontSize: size === 'small' ? 14 : 16 }} />,
      color: theme.palette.success.main,
      bgColor: alpha(theme.palette.success.main, 0.1),
      tooltip: lastSaved
        ? `Last saved: ${lastSaved.toLocaleString()}`
        : 'All changes have been saved',
    },
    saving: {
      label: 'Saving...',
      icon: <CircularProgress size={size === 'small' ? 12 : 14} sx={{ color: 'inherit' }} />,
      color: theme.palette.info.main,
      bgColor: alpha(theme.palette.info.main, 0.1),
      tooltip: 'Saving changes...',
    },
    unsaved: {
      label: 'Unsaved changes',
      icon: <UnsavedIcon sx={{ fontSize: size === 'small' ? 14 : 16 }} />,
      color: theme.palette.warning.main,
      bgColor: alpha(theme.palette.warning.main, 0.1),
      tooltip: 'You have unsaved changes',
    },
    error: {
      label: 'Save failed',
      icon: onRetry ? (
        <RetryIcon sx={{ fontSize: size === 'small' ? 14 : 16 }} />
      ) : (
        <ErrorIcon sx={{ fontSize: size === 'small' ? 14 : 16 }} />
      ),
      color: theme.palette.error.main,
      bgColor: alpha(theme.palette.error.main, 0.1),
      tooltip: onRetry ? 'Click to retry saving' : 'Failed to save changes',
    },
  };

  const currentConfig = config[status];

  return (
    <Tooltip title={currentConfig.tooltip} arrow>
      <Chip
        size={size}
        icon={currentConfig.icon}
        label={currentConfig.label}
        onClick={status === 'error' && onRetry ? onRetry : undefined}
        sx={{
          color: currentConfig.color,
          bgcolor: currentConfig.bgColor,
          borderColor: alpha(currentConfig.color, 0.3),
          border: '1px solid',
          fontWeight: 500,
          fontSize: size === 'small' ? '0.75rem' : '0.8125rem',
          height: size === 'small' ? 24 : 28,
          cursor: status === 'error' && onRetry ? 'pointer' : 'default',
          '& .MuiChip-icon': {
            color: 'inherit',
            marginLeft: '8px',
          },
          '&:hover': status === 'error' && onRetry ? {
            bgcolor: alpha(currentConfig.color, 0.15),
          } : {},
        }}
      />
    </Tooltip>
  );
}
