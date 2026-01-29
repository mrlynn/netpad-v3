/**
 * Storage Mode Settings
 *
 * Component for managing RAG storage mode (platform vs user-cluster)
 * Includes setup wizard, validation, and migration options
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  Chip,
  RadioGroup,
  FormControlLabel,
  Radio,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Cloud as CloudIcon,
  Storage as StorageIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Settings as SettingsIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import ClusterSetupWizard from './ClusterSetupWizard';
import ValidationResultDisplay from './ValidationResultDisplay';

interface StorageModeSettingsProps {
  organizationId: string;
  onConfigUpdate?: () => void;
}

interface RAGConfig {
  mode: 'platform' | 'user-cluster';
  platform?: {
    region: string;
  };
  userCluster?: {
    connectionId: string;
    clusterTier?: string;
    mongoVersion?: string;
    clusterName?: string;
    region?: string;
    maskedConnectionString?: string;
  };
  limits: {
    maxDocuments: number;
    maxStorageBytes: number;
    maxQueriesPerDay: number;
  };
}

export default function StorageModeSettings({
  organizationId,
  onConfigUpdate,
}: StorageModeSettingsProps) {
  const [config, setConfig] = useState<RAGConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [setupWizardOpen, setSetupWizardOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingMode, setPendingMode] = useState<'platform' | 'user-cluster' | null>(null);
  const [switching, setSwitching] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    loadConfig();
  }, [organizationId]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/rag/config?organizationId=${organizationId}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load configuration');
      }

      setConfig(data.config);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleModeChange = (mode: 'platform' | 'user-cluster') => {
    if (mode === config?.mode) return;

    if (mode === 'user-cluster') {
      // Open setup wizard for user-cluster
      setSetupWizardOpen(true);
    } else {
      // Confirm switch to platform
      setPendingMode(mode);
      setConfirmDialogOpen(true);
    }
  };

  const handleConfirmSwitch = async () => {
    if (!pendingMode) return;

    setSwitching(true);
    setError(null);

    try {
      const response = await fetch('/api/rag/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          config: {
            mode: pendingMode,
            // Clear user-cluster config when switching to platform
            ...(pendingMode === 'platform' && { userCluster: undefined }),
          },
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to update configuration');
      }

      await loadConfig();
      onConfigUpdate?.();
      setConfirmDialogOpen(false);
      setPendingMode(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update configuration');
    } finally {
      setSwitching(false);
    }
  };

  const handleSetupComplete = () => {
    loadConfig();
    onConfigUpdate?.();
  };

  const handleTestConnection = async () => {
    if (!config?.userCluster?.connectionId) return;

    setTestingConnection(true);
    setConnectionTestResult(null);

    try {
      const response = await fetch('/api/rag/cluster/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          connectionId: config.userCluster.connectionId,
        }),
      });

      const data = await response.json();

      if (data.success && data.validation.isValid) {
        setConnectionTestResult({
          success: true,
          message: `✓ Connected successfully (MongoDB ${data.validation.mongoVersion}, ${data.validation.clusterTier}, ${data.validation.latencyMs}ms latency)`,
        });
      } else {
        setConnectionTestResult({
          success: false,
          message: data.validation.issues?.join(', ') || 'Connection validation failed',
        });
      }
    } catch (err) {
      setConnectionTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Failed to test connection',
      });
    } finally {
      setTestingConnection(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !config) {
    return (
      <Alert severity="error">
        {error}
        <Button size="small" onClick={loadConfig} sx={{ mt: 1 }}>
          Retry
        </Button>
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Storage Mode
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Choose where your RAG documents and embeddings are stored
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Current Mode Display */}
      {config && (
        <>
          <Alert
            severity="info"
            icon={config.mode === 'platform' ? <CloudIcon /> : <StorageIcon />}
            sx={{ mb: 2 }}
          >
            <Typography variant="body2" fontWeight="medium">
              Current Mode: {config.mode === 'platform' ? 'Platform Storage' : 'User-Cluster Storage'}
            </Typography>
            <Typography variant="body2">
              {config.mode === 'platform'
                ? `Using NetPad's managed MongoDB Atlas cluster (${config.platform?.region || 'us-east'})`
                : `Using your own MongoDB Atlas cluster (${config.userCluster?.clusterTier || 'Unknown tier'})`}
            </Typography>
          </Alert>

          {/* User-Cluster Connection Details */}
          {config.mode === 'user-cluster' && config.userCluster && (
            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <InfoIcon color="primary" />
                    <Typography variant="h6">Connection Details</Typography>
                  </Box>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={testingConnection ? <CircularProgress size={16} /> : <RefreshIcon />}
                    onClick={handleTestConnection}
                    disabled={testingConnection}
                  >
                    Test Connection
                  </Button>
                </Box>

                <Box display="flex" flexDirection="column" gap={1.5}>
                  {config.userCluster.clusterName && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Cluster Name
                      </Typography>
                      <Typography variant="body2" fontFamily="monospace">
                        {config.userCluster.clusterName}
                      </Typography>
                    </Box>
                  )}

                  {config.userCluster.maskedConnectionString && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Connection String
                      </Typography>
                      <Typography variant="body2" fontFamily="monospace" sx={{ wordBreak: 'break-all' }}>
                        {config.userCluster.maskedConnectionString}
                      </Typography>
                    </Box>
                  )}

                  <Box display="flex" gap={3}>
                    {config.userCluster.mongoVersion && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          MongoDB Version
                        </Typography>
                        <Typography variant="body2">{config.userCluster.mongoVersion}</Typography>
                      </Box>
                    )}

                    {config.userCluster.clusterTier && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Cluster Tier
                        </Typography>
                        <Typography variant="body2">{config.userCluster.clusterTier}</Typography>
                      </Box>
                    )}

                    {config.userCluster.region && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Region
                        </Typography>
                        <Typography variant="body2">{config.userCluster.region}</Typography>
                      </Box>
                    )}
                  </Box>

                  {connectionTestResult && (
                    <Alert
                      severity={connectionTestResult.success ? 'success' : 'error'}
                      sx={{ mt: 1 }}
                      onClose={() => setConnectionTestResult(null)}
                    >
                      {connectionTestResult.message}
                    </Alert>
                  )}
                </Box>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Mode Selection */}
      <RadioGroup
        value={config?.mode || 'platform'}
        onChange={(e) => handleModeChange(e.target.value as 'platform' | 'user-cluster')}
      >
        {/* Platform Storage Option */}
        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box display="flex" alignItems="center" flex={1}>
                <FormControlLabel
                  value="platform"
                  control={<Radio />}
                  label={
                    <Box>
                      <Box display="flex" alignItems="center" gap={1}>
                        <CloudIcon color="primary" />
                        <Typography variant="subtitle1" fontWeight="medium">
                          Platform Storage
                        </Typography>
                        <Chip label="Free & Pro" size="small" color="primary" />
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        NetPad manages everything for you
                      </Typography>
                    </Box>
                  }
                />
              </Box>
            </Box>

            <List dense sx={{ mt: 1 }}>
              <ListItem disableGutters>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <CheckCircleIcon fontSize="small" color="success" />
                </ListItemIcon>
                <ListItemText
                  primary="No setup required"
                  primaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
              <ListItem disableGutters>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <CheckCircleIcon fontSize="small" color="success" />
                </ListItemIcon>
                <ListItemText
                  primary="Automatic scaling and backups"
                  primaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
              <ListItem disableGutters>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <CheckCircleIcon fontSize="small" color="success" />
                </ListItemIcon>
                <ListItemText
                  primary="Included in tier pricing"
                  primaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
            </List>
          </CardContent>
        </Card>

        {/* User-Cluster Storage Option */}
        <Card variant="outlined">
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box display="flex" alignItems="center" flex={1}>
                <FormControlLabel
                  value="user-cluster"
                  control={<Radio />}
                  label={
                    <Box>
                      <Box display="flex" alignItems="center" gap={1}>
                        <StorageIcon color="primary" />
                        <Typography variant="subtitle1" fontWeight="medium">
                          User-Cluster Storage
                        </Typography>
                        <Chip label="Team & Enterprise" size="small" color="secondary" />
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Use your own MongoDB Atlas cluster
                      </Typography>
                    </Box>
                  }
                />
              </Box>
            </Box>

            <List dense sx={{ mt: 1 }}>
              <ListItem disableGutters>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <SecurityIcon fontSize="small" color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Full data ownership and control"
                  primaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
              <ListItem disableGutters>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <StorageIcon fontSize="small" color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Unlimited storage capacity"
                  primaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
              <ListItem disableGutters>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <SpeedIcon fontSize="small" color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Enterprise-grade performance"
                  primaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
              <ListItem disableGutters>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <WarningIcon fontSize="small" color="warning" />
                </ListItemIcon>
                <ListItemText
                  primary="Requires M10+ Atlas cluster with Vector Search"
                  primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                />
              </ListItem>
            </List>
          </CardContent>
        </Card>
      </RadioGroup>

      {/* Cluster Setup Wizard */}
      <ClusterSetupWizard
        open={setupWizardOpen}
        onClose={() => setSetupWizardOpen(false)}
        organizationId={organizationId}
        onComplete={handleSetupComplete}
      />

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onClose={() => !switching && setConfirmDialogOpen(false)}>
        <DialogTitle>Switch to Platform Storage?</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
              Switching back to platform storage will require migrating your documents. Your
              current user-cluster configuration will be removed.
            </Typography>
          </Alert>
          <Typography variant="body2">
            Are you sure you want to proceed?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)} disabled={switching}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmSwitch}
            color="primary"
            variant="contained"
            disabled={switching}
          >
            {switching ? <CircularProgress size={20} /> : 'Switch to Platform'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
