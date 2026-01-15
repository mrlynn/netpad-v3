/**
 * Update Notification Banner
 *
 * Banner component showing available updates for installed applications.
 */

'use client';

import { useState } from 'react';
import {
  Alert,
  AlertTitle,
  Button,
  Box,
  alpha,
  Link,
} from '@mui/material';
import {
  Upgrade as UpgradeIcon,
  Close as CloseIcon,
} from '@mui/icons-material';

interface UpdateNotificationBannerProps {
  updatesCount: number;
  onViewUpdates?: () => void;
  onDismiss?: () => void;
}

export function UpdateNotificationBanner({
  updatesCount,
  onViewUpdates,
  onDismiss,
}: UpdateNotificationBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || updatesCount === 0) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <Alert
      severity="info"
      icon={<UpgradeIcon />}
      action={
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {onViewUpdates && (
            <Button
              color="inherit"
              size="small"
              onClick={onViewUpdates}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              View Updates
            </Button>
          )}
          <Button
            color="inherit"
            size="small"
            onClick={handleDismiss}
            sx={{ minWidth: 'auto', p: 0.5 }}
          >
            <CloseIcon fontSize="small" />
          </Button>
        </Box>
      }
      sx={{
        mb: 3,
        bgcolor: alpha('#2196f3', 0.1),
        border: '1px solid',
        borderColor: alpha('#2196f3', 0.3),
        '& .MuiAlert-icon': {
          color: '#2196f3',
        },
      }}
    >
      <AlertTitle>
        {updatesCount} update{updatesCount !== 1 ? 's' : ''} available
      </AlertTitle>
      {updatesCount === 1
        ? 'An installed application has a new version available.'
        : `${updatesCount} installed applications have new versions available.`}
    </Alert>
  );
}
