'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Chip,
  alpha,
  Tooltip,
  Popover,
  Paper,
  Divider,
  CircularProgress,
  Button,
} from '@mui/material';
import {
  Storage,
  CheckCircle,
  Error as ErrorIcon,
  CloudQueue,
  Settings,
} from '@mui/icons-material';
import Link from 'next/link';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useClusterProvisioning } from '@/hooks/useClusterProvisioning';
import { ClusterProvisioningStatus } from '@/types/platform';

interface ConnectionInfo {
  vaultId: string;
  name: string;
  database: string;
  allowedCollections: string[];
}

const STATUS_CONFIG: Record<ClusterProvisioningStatus, {
  label: string;
  color: string;
  icon: React.ReactElement;
  shortLabel: string;
}> = {
  pending: {
    label: 'Preparing database...',
    color: '#2196f3',
    icon: <CircularProgress size={12} sx={{ color: '#2196f3' }} />,
    shortLabel: 'Pending',
  },
  creating_project: {
    label: 'Creating Atlas project...',
    color: '#2196f3',
    icon: <CircularProgress size={12} sx={{ color: '#2196f3' }} />,
    shortLabel: 'Creating',
  },
  creating_cluster: {
    label: 'Provisioning cluster...',
    color: '#2196f3',
    icon: <CircularProgress size={12} sx={{ color: '#2196f3' }} />,
    shortLabel: 'Provisioning',
  },
  creating_user: {
    label: 'Setting up credentials...',
    color: '#2196f3',
    icon: <CircularProgress size={12} sx={{ color: '#2196f3' }} />,
    shortLabel: 'Configuring',
  },
  configuring_network: {
    label: 'Configuring network...',
    color: '#2196f3',
    icon: <CircularProgress size={12} sx={{ color: '#2196f3' }} />,
    shortLabel: 'Configuring',
  },
  ready: {
    label: 'Database ready',
    color: '#00ED64',
    icon: <CheckCircle sx={{ fontSize: 14, color: '#00ED64' }} />,
    shortLabel: 'Ready',
  },
  failed: {
    label: 'Database setup failed',
    color: '#f44336',
    icon: <ErrorIcon sx={{ fontSize: 14, color: '#f44336' }} />,
    shortLabel: 'Failed',
  },
  deleted: {
    label: 'Database deleted',
    color: '#9e9e9e',
    icon: <Storage sx={{ fontSize: 14, color: '#9e9e9e' }} />,
    shortLabel: 'Deleted',
  },
};

export function ClusterStatusIndicator() {
  const { currentOrgId, organization } = useOrganization();
  const { status, loading } = useClusterProvisioning(currentOrgId || undefined);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo | null>(null);
  const [loadingConnection, setLoadingConnection] = useState(false);

  // Fetch connection info when cluster is ready
  useEffect(() => {
    const fetchConnectionInfo = async () => {
      if (!currentOrgId || status?.status !== 'ready' || !status?.vaultId) return;

      try {
        setLoadingConnection(true);
        const response = await fetch(`/api/organizations/${currentOrgId}/vault`);
        const data = await response.json();

        if (response.ok && data.connections) {
          // Only show connection info for the auto-provisioned cluster
          // Do NOT fall back to other connections
          const conn = data.connections.find(
            (c: ConnectionInfo) => c.vaultId === status.vaultId
          );
          if (conn) {
            setConnectionInfo(conn);
          } else {
            setConnectionInfo(null);
          }
        }
      } catch (err) {
        console.error('Failed to load connection info:', err);
      } finally {
        setLoadingConnection(false);
      }
    };

    fetchConnectionInfo();
  }, [currentOrgId, status?.status, status?.vaultId]);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  // Don't show if no org or loading
  if (!currentOrgId || loading || !status) {
    return null;
  }

  // Don't show if no cluster and provisioning not available
  if (!status.hasCluster && !status.provisioningAvailable) {
    return null;
  }

  const config = status.status ? STATUS_CONFIG[status.status] : null;
  const isReady = status.status === 'ready';
  const isInProgress = ['pending', 'creating_project', 'creating_cluster', 'creating_user', 'configuring_network'].includes(status.status || '');

  return (
    <>
      <Tooltip title="Your database status">
        <Chip
          icon={config ? config.icon : <Storage sx={{ fontSize: 14 }} />}
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 500, fontSize: '0.7rem' }}>
                {isReady ? 'MongoDB' : config?.shortLabel || 'Database'}
              </Typography>
            </Box>
          }
          size="small"
          onClick={handleClick}
          sx={{
            height: 24,
            cursor: 'pointer',
            bgcolor: alpha(config?.color || '#00ED64', 0.1),
            borderColor: alpha(config?.color || '#00ED64', 0.3),
            color: config?.color || '#00ED64',
            '& .MuiChip-icon': {
              color: config?.color || '#00ED64',
            },
            '&:hover': {
              bgcolor: alpha(config?.color || '#00ED64', 0.2),
            },
          }}
          variant="outlined"
        />
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        sx={{ mt: 1 }}
      >
        <Paper sx={{ width: 320, p: 0 }}>
          {/* Header */}
          <Box sx={{ p: 2, bgcolor: alpha(config?.color || '#00ED64', 0.05) }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Storage sx={{ color: config?.color || '#00ED64', fontSize: 20 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Your Database
              </Typography>
              <Box sx={{ flex: 1 }} />
              {config?.icon}
            </Box>
            <Typography variant="caption" color="text.secondary">
              {config?.label}
            </Typography>
          </Box>

          <Divider />

          {/* Cluster Details */}
          {isReady && status.cluster && (
            <Box sx={{ p: 2 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Provider
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {status.cluster.provider}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Region
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {status.cluster.region?.replace(/_/g, ' ')}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Tier
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {status.cluster.instanceSize} (Free)
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Storage
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {status.cluster.storageLimitMb} MB
                  </Typography>
                </Box>
              </Box>

              <Box sx={{
                p: 1.5,
                bgcolor: alpha('#2196f3', 0.05),
                borderRadius: 1,
                border: '1px solid',
                borderColor: alpha('#2196f3', 0.1),
              }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  Database Name
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
                  {connectionInfo?.database || 'netpad_forms'}
                </Typography>
                {connectionInfo?.allowedCollections && connectionInfo.allowedCollections.length > 0 && (
                  <>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, mb: 0.5 }}>
                      Collections
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {connectionInfo.allowedCollections.map((col) => (
                        <Chip key={col} label={col} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                      ))}
                    </Box>
                  </>
                )}
                {connectionInfo && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    Connection: {connectionInfo.name}
                  </Typography>
                )}
              </Box>
            </Box>
          )}

          {/* In Progress State */}
          {isInProgress && (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <CircularProgress size={32} sx={{ color: '#2196f3', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                Setting up your MongoDB Atlas cluster...
              </Typography>
              <Typography variant="caption" color="text.secondary">
                This usually takes about 30 seconds.
              </Typography>
            </Box>
          )}

          {/* Failed State */}
          {status.status === 'failed' && (
            <Box sx={{ p: 2 }}>
              <Typography variant="body2" color="error" sx={{ mb: 2 }}>
                Database provisioning failed. You can retry or add your own connection.
              </Typography>
              <Button
                component={Link}
                href="/data?tab=infrastructure"
                size="small"
                startIcon={<Settings />}
                onClick={handleClose}
              >
                Go to Settings
              </Button>
            </Box>
          )}

          <Divider />

          {/* Footer */}
          <Box sx={{ p: 1.5, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              component={Link}
              href="/data?tab=infrastructure"
              size="small"
              startIcon={<Settings />}
              onClick={handleClose}
              sx={{ fontSize: '0.75rem' }}
            >
              Manage Database
            </Button>
          </Box>
        </Paper>
      </Popover>
    </>
  );
}
