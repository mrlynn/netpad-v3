'use client';

/**
 * Provisioning Step
 *
 * Shows Atlas cluster provisioning progress with polling
 */

import { useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  alpha,
  LinearProgress,
  Alert,
} from '@mui/material';
import { Storage, CheckCircle, Rocket } from '@mui/icons-material';
import { useOnboardingGate } from '@/contexts/OnboardingGateContext';

export function ProvisioningStep() {
  const {
    status,
    provisioningStatus,
    provisioningProgress,
    setProvisioningStatus,
    setProvisioningProgress,
    refreshStatus,
    completeOnboarding,
  } = useOnboardingGate();

  const orgId = status?.organization?.orgId;

  // Use ref to track progress for polling without causing re-renders
  const progressRef = useRef(provisioningProgress);
  progressRef.current = provisioningProgress;

  // Poll for cluster status
  const pollClusterStatus = useCallback(async () => {
    if (!orgId) return false;

    try {
      const response = await fetch(`/api/organizations/${orgId}/cluster`);
      if (response.ok) {
        const data = await response.json();

        // Check internal status values from our ProvisionedCluster
        // Status values: 'pending', 'creating_project', 'creating_cluster',
        //                'creating_user', 'configuring_network', 'ready', 'failed', 'deleted'
        const clusterStatus = data.cluster?.status;

        if (clusterStatus === 'ready') {
          setProvisioningStatus('ready');
          setProvisioningProgress(100);
          return true; // Done polling
        } else if (
          clusterStatus === 'pending' ||
          clusterStatus === 'creating_project' ||
          clusterStatus === 'creating_cluster' ||
          clusterStatus === 'creating_user' ||
          clusterStatus === 'configuring_network'
        ) {
          setProvisioningStatus('creating');
          // Simulate progress based on status
          let baseProgress = 10;
          if (clusterStatus === 'creating_project') baseProgress = 20;
          else if (clusterStatus === 'creating_cluster') baseProgress = 40;
          else if (clusterStatus === 'creating_user') baseProgress = 70;
          else if (clusterStatus === 'configuring_network') baseProgress = 85;

          const newProgress = Math.max(progressRef.current, baseProgress);
          setProvisioningProgress(Math.min(newProgress + 2, 90));
        } else if (data.error || clusterStatus === 'failed') {
          setProvisioningStatus('failed');
          return true; // Done polling
        } else if (!data.hasCluster) {
          // No cluster exists yet - keep waiting
          setProvisioningStatus('creating');
          const newProgress = Math.min(progressRef.current + 2, 20);
          setProvisioningProgress(newProgress);
        }
      }
    } catch (err) {
      console.error('[Provisioning] Failed to poll cluster status:', err);
    }
    return false; // Continue polling
  }, [orgId, setProvisioningStatus, setProvisioningProgress]);

  // Start polling when component mounts
  useEffect(() => {
    if (!orgId || provisioningStatus === 'ready') return;

    let intervalId: NodeJS.Timeout;
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes with 5-second intervals

    const checkStatus = async () => {
      attempts++;
      const isDone = await pollClusterStatus();

      if (isDone || attempts >= maxAttempts) {
        clearInterval(intervalId);
        if (attempts >= maxAttempts && progressRef.current < 100) {
          // Timeout - but cluster might still be provisioning
          // Mark as ready anyway since M0 clusters can take time
          setProvisioningStatus('ready');
          setProvisioningProgress(100);
        }
      }
    };

    // Check immediately
    checkStatus();

    // Then poll every 5 seconds
    intervalId = setInterval(checkStatus, 5000);

    return () => clearInterval(intervalId);
  }, [orgId, provisioningStatus, pollClusterStatus, setProvisioningStatus, setProvisioningProgress]);

  const handleComplete = async () => {
    await refreshStatus();
    completeOnboarding();
  };

  const handleContinueAnyway = async () => {
    // Allow continuing even if not fully ready
    await refreshStatus();
    completeOnboarding();
  };

  return (
    <Box sx={{ textAlign: 'center' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1.5,
          mb: 3,
        }}
      >
        <Storage sx={{ color: '#00ED64', fontSize: 28 }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Setting up your database
        </Typography>
      </Box>

      {provisioningStatus === 'creating' && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            We're provisioning a free MongoDB Atlas cluster for you.
            <br />
            This usually takes 1-3 minutes.
          </Typography>
          <LinearProgress
            variant="determinate"
            value={provisioningProgress}
            sx={{
              height: 8,
              borderRadius: 4,
              bgcolor: alpha('#00ED64', 0.1),
              '& .MuiLinearProgress-bar': {
                bgcolor: '#00ED64',
                borderRadius: 4,
              },
            }}
          />
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 1, display: 'block' }}
          >
            {provisioningProgress}% complete
          </Typography>
        </Box>
      )}

      {provisioningStatus === 'ready' && (
        <Box sx={{ mb: 4 }}>
          <CheckCircle sx={{ fontSize: 64, color: '#00ED64', mb: 2 }} />
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
            Your database is ready!
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Your MongoDB Atlas cluster is set up and ready to store data.
            <br />
            No additional configuration needed - just start building.
          </Typography>
        </Box>
      )}

      {provisioningStatus === 'failed' && (
        <Box sx={{ mb: 4 }}>
          <Alert severity="warning" sx={{ mb: 2, textAlign: 'left' }}>
            Database provisioning is taking longer than expected.
            <br />
            You can continue and it will be ready shortly.
          </Alert>
        </Box>
      )}

      {provisioningStatus === 'ready' ? (
        <Button
          fullWidth
          variant="contained"
          size="large"
          onClick={handleComplete}
          startIcon={<Rocket />}
          sx={{
            bgcolor: '#00ED64',
            color: '#001E2B',
            fontWeight: 600,
            '&:hover': { bgcolor: '#00c853' },
          }}
        >
          Start Building
        </Button>
      ) : (
        <Button
          fullWidth
          variant="contained"
          size="large"
          onClick={handleContinueAnyway}
          disabled={provisioningProgress < 50}
          startIcon={<Rocket />}
          sx={{
            bgcolor: '#00ED64',
            color: '#001E2B',
            fontWeight: 600,
            '&:hover': { bgcolor: '#00c853' },
            '&:disabled': {
              bgcolor: alpha('#00ED64', 0.3),
              color: alpha('#001E2B', 0.5),
            },
          }}
        >
          {provisioningProgress < 50 ? 'Please wait...' : 'Continue Anyway'}
        </Button>
      )}
    </Box>
  );
}
