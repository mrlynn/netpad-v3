/**
 * Orphaned Forms Migration Banner
 *
 * Displays a banner to users who have forms that aren't attached to an application.
 * Provides a one-click migration to move forms into apps for easier publishing.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  AlertTitle,
  Button,
  Box,
  Collapse,
  CircularProgress,
  Typography,
  IconButton,
} from '@mui/material';
import {
  Close as CloseIcon,
  AutoFixHigh as MigrateIcon,
  CheckCircle as SuccessIcon,
} from '@mui/icons-material';

interface OrphanedFormsBannerProps {
  orgId: string;
  onMigrationComplete?: () => void;
}

type BannerState = 'checking' | 'has-orphans' | 'migrating' | 'success' | 'dismissed' | 'none';

export function OrphanedFormsBanner({ orgId, onMigrationComplete }: OrphanedFormsBannerProps) {
  const [state, setState] = useState<BannerState>('checking');
  const [orphanedCount, setOrphanedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Check localStorage for dismissed state
  useEffect(() => {
    const dismissedKey = `orphaned-forms-banner-dismissed-${orgId}`;
    const dismissed = localStorage.getItem(dismissedKey);
    if (dismissed === 'true') {
      setState('dismissed');
      return;
    }

    // Check for orphaned forms
    checkOrphanedForms();
  }, [orgId]);

  const checkOrphanedForms = useCallback(async () => {
    try {
      const response = await fetch(`/api/migration/orphaned-forms?orgId=${orgId}`);
      if (!response.ok) {
        throw new Error('Failed to check for orphaned forms');
      }

      const data = await response.json();
      if (data.hasOrphanedForms) {
        setOrphanedCount(data.orphanedCount);
        setState('has-orphans');
      } else {
        setState('none');
      }
    } catch (err) {
      console.error('Error checking orphaned forms:', err);
      setState('none'); // Don't show banner if check fails
    }
  }, [orgId]);

  const handleMigrate = useCallback(async () => {
    setState('migrating');
    setError(null);

    try {
      const response = await fetch('/api/migration/orphaned-forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Migration failed');
      }

      setState('success');
      onMigrationComplete?.();

      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        handleDismiss();
      }, 5000);
    } catch (err: any) {
      setError(err.message);
      setState('has-orphans');
    }
  }, [orgId, onMigrationComplete]);

  const handleDismiss = useCallback(() => {
    const dismissedKey = `orphaned-forms-banner-dismissed-${orgId}`;
    localStorage.setItem(dismissedKey, 'true');
    setState('dismissed');
  }, [orgId]);

  // Don't render anything if no orphans or dismissed
  if (state === 'none' || state === 'dismissed' || state === 'checking') {
    return null;
  }

  return (
    <Collapse in={true}>
      <Alert
        severity={state === 'success' ? 'success' : 'info'}
        icon={state === 'success' ? <SuccessIcon /> : <MigrateIcon />}
        action={
          state !== 'migrating' && (
            <IconButton
              aria-label="dismiss"
              color="inherit"
              size="small"
              onClick={handleDismiss}
            >
              <CloseIcon fontSize="inherit" />
            </IconButton>
          )
        }
        sx={{
          mb: 2,
          '& .MuiAlert-message': { width: '100%' },
        }}
      >
        {state === 'has-orphans' && (
          <>
            <AlertTitle sx={{ fontWeight: 600 }}>
              Move Your Forms to Apps
            </AlertTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
              <Typography variant="body2">
                You have {orphanedCount} form{orphanedCount !== 1 ? 's' : ''} not linked to an app.
                Moving them to apps enables publishing and easier management.
              </Typography>
              <Button
                variant="contained"
                size="small"
                onClick={handleMigrate}
                startIcon={<MigrateIcon />}
                sx={{
                  bgcolor: '#00ED64',
                  color: 'white',
                  '&:hover': { bgcolor: '#00CC55' },
                  flexShrink: 0,
                }}
              >
                Move to Apps
              </Button>
            </Box>
            {error && (
              <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                {error}
              </Typography>
            )}
          </>
        )}

        {state === 'migrating' && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CircularProgress size={20} />
            <Typography variant="body2">
              Moving forms to apps...
            </Typography>
          </Box>
        )}

        {state === 'success' && (
          <>
            <AlertTitle sx={{ fontWeight: 600 }}>
              Forms Moved Successfully!
            </AlertTitle>
            <Typography variant="body2">
              Your forms are now inside apps for easier publishing. This message will dismiss shortly.
            </Typography>
          </>
        )}
      </Alert>
    </Collapse>
  );
}
