'use client';

import { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  Chip,
  LinearProgress,
  alpha,
  Collapse,
} from '@mui/material';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import {
  Storage,
  CheckCircle,
  Error,
  CloudQueue,
  Refresh,
  Speed,
} from '@mui/icons-material';
import { useClusterProvisioning } from '@/hooks/useClusterProvisioning';
import { ClusterProvisioningStatus as ProvisioningStatusType } from '@/types/platform';

interface ClusterProvisioningStatusProps {
  organizationId: string;
}

const STATUS_CONFIG: Record<ProvisioningStatusType, {
  label: string;
  color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  progress: number;
  description: string;
}> = {
  pending: {
    label: 'Pending',
    color: 'info',
    progress: 10,
    description: 'Preparing to create your database...',
  },
  creating_project: {
    label: 'Creating Project',
    color: 'info',
    progress: 25,
    description: 'Setting up your MongoDB Atlas project...',
  },
  creating_cluster: {
    label: 'Creating Cluster',
    color: 'info',
    progress: 50,
    description: 'Provisioning your M0 cluster (this may take up to 2 minutes)...',
  },
  creating_user: {
    label: 'Creating User',
    color: 'info',
    progress: 75,
    description: 'Setting up database credentials...',
  },
  configuring_network: {
    label: 'Configuring Network',
    color: 'info',
    progress: 90,
    description: 'Configuring network access...',
  },
  ready: {
    label: 'Ready',
    color: 'success',
    progress: 100,
    description: 'Your database is ready to use!',
  },
  failed: {
    label: 'Failed',
    color: 'error',
    progress: 0,
    description: 'Failed to provision database. You can retry or add your own connection.',
  },
  deleted: {
    label: 'Deleted',
    color: 'default',
    progress: 0,
    description: 'The provisioned cluster has been deleted.',
  },
};

export function ClusterProvisioningStatus({ organizationId }: ClusterProvisioningStatusProps) {
  const { status, loading, error, refetch, triggerProvisioning } = useClusterProvisioning(organizationId);
  const [provisioning, setProvisioning] = useState(false);
  const [provisionError, setProvisionError] = useState<string | null>(null);

  const handleProvision = async () => {
    setProvisioning(true);
    setProvisionError(null);

    const result = await triggerProvisioning();

    if (!result.success) {
      setProvisionError(result.error || 'Failed to provision cluster');
    }

    setProvisioning(false);
  };

  if (loading && !status) {
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <NetPadLoader size="large" variant="ascii" message="Checking database status..." />
        </CardContent>
      </Card>
    );
  }

  // No provisioning available or configured
  if (status && !status.provisioningAvailable && !status.hasCluster) {
    return null; // Don't show anything if not available
  }

  // Has a cluster - show status
  if (status?.hasCluster && status.cluster) {
    const config = STATUS_CONFIG[status.status as ProvisioningStatusType] || STATUS_CONFIG.pending;
    const isInProgress = ['pending', 'creating_project', 'creating_cluster', 'creating_user', 'configuring_network'].includes(status.status || '');

    return (
      <Card
        sx={{
          mb: 3,
          border: '1px solid',
          borderColor: status.status === 'ready'
            ? alpha('#00ED64', 0.3)
            : status.status === 'failed'
            ? alpha('#f44336', 0.3)
            : 'divider',
          bgcolor: status.status === 'ready'
            ? alpha('#00ED64', 0.02)
            : status.status === 'failed'
            ? alpha('#f44336', 0.02)
            : 'transparent',
        }}
      >
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                bgcolor: status.status === 'ready'
                  ? alpha('#00ED64', 0.1)
                  : status.status === 'failed'
                  ? alpha('#f44336', 0.1)
                  : alpha('#2196f3', 0.1),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {status.status === 'ready' ? (
                <CheckCircle sx={{ color: '#00ED64' }} />
              ) : status.status === 'failed' ? (
                <Error sx={{ color: '#f44336' }} />
              ) : (
                <CloudQueue sx={{ color: '#2196f3' }} />
              )}
            </Box>

            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Auto-Provisioned Database
                </Typography>
                <Chip
                  label={config.label}
                  size="small"
                  color={config.color}
                />
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {config.description}
              </Typography>

              {isInProgress && (
                <Box sx={{ mb: 2 }}>
                  <LinearProgress
                    variant="determinate"
                    value={config.progress}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      bgcolor: alpha('#2196f3', 0.1),
                      '& .MuiLinearProgress-bar': {
                        bgcolor: '#2196f3',
                        borderRadius: 3,
                      },
                    }}
                  />
                </Box>
              )}

              {status.status === 'ready' && status.cluster && (
                <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Provider
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {status.cluster.provider}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Region
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {status.cluster.region.replace(/_/g, ' ')}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Instance
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {status.cluster.instanceSize} (Free Tier)
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Storage Limit
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {status.cluster.storageLimitMb} MB
                    </Typography>
                  </Box>
                </Box>
              )}

              {status.status === 'failed' && (
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    startIcon={<Refresh />}
                    onClick={handleProvision}
                    disabled={provisioning}
                  >
                    {provisioning ? 'Retrying...' : 'Retry'}
                  </Button>
                </Box>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  }

  // No cluster - show option to provision (if available)
  if (status?.provisioningAvailable && !status.hasCluster) {
    return (
      <Card
        sx={{
          mb: 3,
          border: '2px dashed',
          borderColor: 'divider',
          bgcolor: 'transparent',
        }}
      >
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <Storage sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Get a Free MongoDB Database
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
            We can automatically provision a free MongoDB Atlas M0 cluster for you.
            512 MB storage, perfect for getting started.
          </Typography>

          {provisionError && (
            <Alert severity="error" sx={{ mb: 2, maxWidth: 400, mx: 'auto' }}>
              {provisionError}
            </Alert>
          )}

          <Button
            variant="contained"
            size="large"
            startIcon={provisioning ? <NetPadLoader size="small" variant="svg" showPhrases={false} /> : <Speed />}
            onClick={handleProvision}
            disabled={provisioning}
            sx={{
              bgcolor: '#00ED64',
              color: '#001E2B',
              fontWeight: 600,
              '&:hover': { bgcolor: '#00c853' },
            }}
          >
            {provisioning ? 'Provisioning...' : 'Provision Free Database'}
          </Button>

          <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 2 }}>
            Takes about 30 seconds • Hosted on MongoDB Atlas
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return null;
}
