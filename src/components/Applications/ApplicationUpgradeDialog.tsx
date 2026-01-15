/**
 * Application Upgrade Dialog
 *
 * Dialog for upgrading an installed marketplace application to a newer version.
 * Shows version comparison, changelog, and preview of changes.
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Divider,
  Chip,
  alpha,
  Stack,
  FormControlLabel,
  Checkbox,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Upgrade as UpgradeIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

interface InstalledApplication {
  installationId: string;
  marketplaceApplicationId: string;
  marketplaceApplicationName: string;
  installedVersion: string;
  latestAvailableVersion?: string;
  updateAvailable?: {
    version: string;
    changelog?: string;
    publishedAt: string;
  };
  updateInfo?: {
    version: string;
    changelog?: string;
    publishedAt: string;
  };
}

interface ApplicationUpgradeDialogProps {
  open: boolean;
  onClose: () => void;
  installation: InstalledApplication;
  organizationId: string;
  projectId: string;
  onUpgraded?: () => void;
}

export function ApplicationUpgradeDialog({
  open,
  onClose,
  installation,
  organizationId,
  projectId,
  onUpgraded,
}: ApplicationUpgradeDialogProps) {
  const [upgrading, setUpgrading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preserveCustomizations, setPreserveCustomizations] = useState(true);
  const [overwriteExisting, setOverwriteExisting] = useState(true);

  const targetVersion = installation.updateInfo?.version || installation.latestAvailableVersion || '';
  const changelog = installation.updateInfo?.changelog || installation.updateAvailable?.changelog;

  const handleUpgrade = async () => {
    setUpgrading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/applications/installed/${installation.installationId}/upgrade`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orgId: organizationId,
            projectId: projectId,
            targetVersion: targetVersion,
            options: {
              preserveCustomizations,
              overwriteExisting,
            },
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to upgrade application');
      }

      onUpgraded?.();
    } catch (err) {
      console.error('Error upgrading application:', err);
      setError(err instanceof Error ? err.message : 'Failed to upgrade application');
    } finally {
      setUpgrading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <UpgradeIcon sx={{ color: '#ff9800' }} />
          <Typography variant="h6">Upgrade Application</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            {installation.marketplaceApplicationName}
          </Typography>
          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Current Version
              </Typography>
              <Chip
                label={`v${installation.installedVersion}`}
                size="small"
                sx={{ mt: 0.5, display: 'block' }}
              />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                New Version
              </Typography>
              <Chip
                label={`v${targetVersion}`}
                size="small"
                color="warning"
                sx={{ mt: 0.5, display: 'block' }}
              />
            </Box>
          </Stack>
        </Box>

        {changelog && (
          <Accordion sx={{ mb: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2">What's New in v{targetVersion}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography
                variant="body2"
                sx={{
                  whiteSpace: 'pre-wrap',
                  color: 'text.secondary',
                }}
              >
                {changelog}
              </Typography>
            </AccordionDetails>
          </Accordion>
        )}

        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            This upgrade will update forms and workflows to the latest version. Your data will be preserved.
          </Typography>
        </Alert>

        <Box sx={{ mb: 2 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={preserveCustomizations}
                onChange={(e) => setPreserveCustomizations(e.target.checked)}
              />
            }
            label="Preserve customizations (recommended)"
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 4 }}>
            Attempts to preserve your custom changes when possible
          </Typography>
        </Box>

        <Box>
          <FormControlLabel
            control={
              <Checkbox
                checked={overwriteExisting}
                onChange={(e) => setOverwriteExisting(e.target.checked)}
              />
            }
            label="Overwrite existing forms/workflows"
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 4 }}>
            Update existing forms and workflows with new versions
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={upgrading}>
          Cancel
        </Button>
        <Button
          onClick={handleUpgrade}
          variant="contained"
          disabled={upgrading || !targetVersion}
          startIcon={upgrading ? <CircularProgress size={16} /> : <UpgradeIcon />}
          sx={{
            bgcolor: '#ff9800',
            '&:hover': { bgcolor: '#f57c00' },
          }}
        >
          {upgrading ? 'Upgrading...' : 'Upgrade'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
