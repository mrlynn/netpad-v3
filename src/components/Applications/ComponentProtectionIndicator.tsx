/**
 * Component Protection Indicator
 * 
 * Shows lock status and protection information for forms/workflows
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  Alert,
  Box,
  Chip,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  Lock,
  LockOpen,
  Info,
} from '@mui/icons-material';
import { ProtectedComponent } from '@/types/application';

interface ComponentProtectionIndicatorProps {
  componentId: string;
  componentType: 'form' | 'workflow';
  orgId: string;
  applicationId: string;
  onLockChange?: () => void;
}

export function ComponentProtectionIndicator({
  componentId,
  componentType,
  orgId,
  applicationId,
  onLockChange,
}: ComponentProtectionIndicatorProps) {
  const [protection, setProtection] = useState<ProtectedComponent | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const loadProtection = async () => {
      try {
        const response = await fetch(
          `/api/applications/${applicationId}/components/protected?orgId=${orgId}`
        );
        if (response.ok) {
          const data = await response.json();
          const component = data.components?.find(
            (c: ProtectedComponent) =>
              c.componentId === componentId && c.componentType === componentType
          );
          setProtection(component || null);
        }
      } catch (error) {
        console.error('Failed to load component protection:', error);
      } finally {
        setLoading(false);
      }
    };

    if (componentId && orgId && applicationId) {
      loadProtection();
    }
  }, [componentId, componentType, orgId, applicationId, onLockChange]);

  if (loading || !protection || !protection.locked) {
    return null;
  }

  return (
    <>
      <Alert
        severity="warning"
        icon={<Lock />}
        action={
          <Tooltip title="View protection details">
            <IconButton size="small" onClick={() => setShowDetails(true)}>
              <Info />
            </IconButton>
          </Tooltip>
        }
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
            This {componentType} is locked and protected
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Editing is restricted to prevent breaking changes. Unlock to make modifications.
          </Typography>
          {protection.editableFields && protection.editableFields.length > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              Editable fields: {protection.editableFields.join(', ')}
            </Typography>
          )}
        </Box>
      </Alert>

      <Dialog open={showDetails} onClose={() => setShowDetails(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Lock sx={{ color: 'warning.main' }} />
            <Typography variant="h6">Component Protection Details</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <List>
            <ListItem>
              <ListItemText
                primary="Status"
                secondary={
                  <Chip
                    label={protection.locked ? 'Locked' : 'Unlocked'}
                    size="small"
                    color={protection.locked ? 'warning' : 'default'}
                  />
                }
              />
            </ListItem>
            {protection.contractId && (
              <ListItem>
                <ListItemText
                  primary="Contract ID"
                  secondary={protection.contractId}
                />
              </ListItem>
            )}
            {protection.lockedAt && (
              <ListItem>
                <ListItemText
                  primary="Locked At"
                  secondary={new Date(protection.lockedAt).toLocaleString()}
                />
              </ListItem>
            )}
            {protection.lockedBy && (
              <ListItem>
                <ListItemText
                  primary="Locked By"
                  secondary={protection.lockedBy}
                />
              </ListItem>
            )}
            {protection.editableFields && protection.editableFields.length > 0 && (
              <ListItem>
                <ListItemText
                  primary="Editable Fields"
                  secondary={protection.editableFields.join(', ')}
                />
              </ListItem>
            )}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetails(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
