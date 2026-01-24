'use client';

import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  AlertTitle,
  Collapse,
  alpha,
  LinearProgress,
  Chip,
} from '@mui/material';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import {
  Storage,
  Cloud,
  RocketLaunch,
  CheckCircle,
  Warning,
  Link as LinkIcon,
} from '@mui/icons-material';
import { useClusterStatus } from '@/hooks/useClusterStatus';

interface ClusterSetupBannerProps {
  orgId: string;
  projectId: string;
  /** Compact mode for embedding in other components */
  compact?: boolean;
  /** Called when cluster becomes ready */
  onClusterReady?: () => void;
}

/**
 * Banner component that shows when no cluster/connection exists for an organization.
 * Prompts users to set up database infrastructure before creating forms.
 */
export function ClusterSetupBanner({
  orgId,
  projectId,
  compact = false,
  onClusterReady,
}: ClusterSetupBannerProps) {
  const { clusterStatus, isLoading, error, startProvisioning, refetch } = useClusterStatus(orgId, projectId, {
    pollWhileProvisioning: true,
    pollInterval: 3000,
  });

  const [provisioning, setProvisioning] = useState(false);
  const [provisionError, setProvisionError] = useState<string | null>(null);

  // Don't show if loading or has cluster
  if (isLoading) {
    return compact ? null : (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <NetPadLoader size="large" variant="ascii" message="Loading..." />
      </Box>
    );
  }

  // Cluster is ready - don't show banner
  if (clusterStatus?.isReady) {
    onClusterReady?.();
    return null;
  }

  // Show provisioning progress
  if (clusterStatus?.isProvisioning) {
    const statusMessages: Record<string, string> = {
      pending: 'Initializing cluster setup...',
      creating_project: 'Creating Atlas project...',
      creating_cluster: 'Provisioning M0 cluster (this may take a few minutes)...',
      creating_user: 'Creating database user...',
      configuring_network: 'Configuring network access...',
    };

    const message = statusMessages[clusterStatus.status || ''] || 'Setting up your database...';

    if (compact) {
      return (
        <Alert
          severity="info"
          icon={<NetPadLoader size="small" variant="svg" showPhrases={false} />}
          sx={{ mb: 2 }}
        >
          <AlertTitle>Database Setup in Progress</AlertTitle>
          {message}
          <LinearProgress sx={{ mt: 1 }} />
        </Alert>
      );
    }

    return (
      <Paper
        sx={{
          p: 4,
          mb: 4,
          bgcolor: alpha('#2196f3', 0.05),
          border: '1px solid',
          borderColor: alpha('#2196f3', 0.3),
          borderRadius: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <NetPadLoader size="large" variant="ascii" message="" />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#2196f3' }}>
              Setting Up Your Database
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {message}
            </Typography>
          </Box>
        </Box>
        <LinearProgress sx={{ borderRadius: 1 }} />
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          This usually takes 2-3 minutes. You can stay on this page or navigate away - setup will continue in the background.
        </Typography>
      </Paper>
    );
  }

  // No cluster - show setup prompt
  const handleProvision = async () => {
    setProvisioning(true);
    setProvisionError(null);

    const result = await startProvisioning(projectId);

    if (!result.success) {
      setProvisionError(result.error || 'Failed to start provisioning');
    }

    setProvisioning(false);
  };

  if (compact) {
    return (
      <Alert
        severity="warning"
        icon={<Storage />}
        sx={{ mb: 2 }}
        action={
          clusterStatus?.provisioningAvailable ? (
            <Button
              color="inherit"
              size="small"
              onClick={handleProvision}
              disabled={provisioning}
              startIcon={provisioning ? <NetPadLoader size="small" variant="svg" showPhrases={false} /> : <RocketLaunch />}
            >
              {provisioning ? 'Starting...' : 'Set Up'}
            </Button>
          ) : null
        }
      >
        <AlertTitle>Database Connection Required</AlertTitle>
        Set up a database connection to save form submissions.
        {provisionError && (
          <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
            {provisionError}
          </Typography>
        )}
      </Alert>
    );
  }

  return (
    <Paper
      sx={{
        p: 4,
        mb: 4,
        bgcolor: alpha('#ff9800', 0.05),
        border: '1px solid',
        borderColor: alpha('#ff9800', 0.3),
        borderRadius: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3 }}>
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: 2,
            bgcolor: alpha('#ff9800', 0.15),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Storage sx={{ fontSize: 28, color: '#ff9800' }} />
        </Box>

        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Database Setup Required
            </Typography>
            <Chip label="Action Needed" size="small" color="warning" />
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Your organization doesn't have a database connection configured. Form submissions need a MongoDB database to store data.
            {clusterStatus?.provisioningAvailable
              ? " We can automatically provision a free M0 cluster for you, or you can provide your own connection string."
              : " Please provide a MongoDB connection string to continue."}
          </Typography>

          <Collapse in={!!provisionError}>
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setProvisionError(null)}>
              {provisionError}
            </Alert>
          </Collapse>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {clusterStatus?.provisioningAvailable && (
              <Button
                variant="contained"
                startIcon={provisioning ? <NetPadLoader size="small" variant="svg" showPhrases={false} /> : <Cloud />}
                onClick={handleProvision}
                disabled={provisioning}
                sx={{
                  bgcolor: '#ff9800',
                  color: '#fff',
                  fontWeight: 600,
                  textTransform: 'none',
                  '&:hover': { bgcolor: '#f57c00' },
                }}
              >
                {provisioning ? 'Starting Provisioning...' : 'Provision Free M0 Cluster'}
              </Button>
            )}

            <Button
              variant="outlined"
              startIcon={<LinkIcon />}
              href={`/settings?tab=connections&orgId=${orgId}`}
              sx={{
                borderColor: alpha('#ff9800', 0.5),
                color: '#ff9800',
                fontWeight: 600,
                textTransform: 'none',
                '&:hover': {
                  borderColor: '#ff9800',
                  bgcolor: alpha('#ff9800', 0.05),
                },
              }}
            >
              Use Existing Connection
            </Button>
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
            {clusterStatus?.provisioningAvailable
              ? "The free M0 cluster includes 512MB storage and is perfect for development and testing."
              : "Configure a connection in Settings to use your own MongoDB cluster."}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
}

export default ClusterSetupBanner;
