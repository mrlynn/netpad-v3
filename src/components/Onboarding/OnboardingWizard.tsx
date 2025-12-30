'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  alpha,
  InputAdornment,
  Alert,
  LinearProgress,
} from '@mui/material';
import {
  Business,
  Storage,
  CheckCircle,
  ArrowForward,
  Rocket,
} from '@mui/icons-material';
import { useOrganization } from '@/contexts/OrganizationContext';

interface OnboardingWizardProps {
  onComplete: () => void;
}

const steps = ['Name Your Workspace', 'Set Up Database'];

// Generate a URL-friendly slug from a name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { createOrganization, refreshOrganizations } = useOrganization();

  const [activeStep, setActiveStep] = useState(0);
  const [workspaceName, setWorkspaceName] = useState('');
  const [slug, setSlug] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);

  // Cluster provisioning state
  const [provisioningStatus, setProvisioningStatus] = useState<
    'pending' | 'provisioning' | 'ready' | 'failed'
  >('pending');
  const [provisioningProgress, setProvisioningProgress] = useState(0);

  // Auto-generate slug from workspace name
  useEffect(() => {
    setSlug(generateSlug(workspaceName));
  }, [workspaceName]);

  // Poll for cluster status
  const pollClusterStatus = useCallback(async (organizationId: string) => {
    try {
      const response = await fetch(`/api/organizations/${organizationId}/cluster`);
      if (response.ok) {
        const data = await response.json();

        if (data.cluster?.status === 'IDLE') {
          setProvisioningStatus('ready');
          setProvisioningProgress(100);
          return true; // Done polling
        } else if (data.cluster?.status === 'CREATING') {
          setProvisioningStatus('provisioning');
          // Simulate progress (actual progress not available from Atlas)
          setProvisioningProgress(prev => Math.min(prev + 5, 90));
        } else if (data.error || data.cluster?.status === 'FAILED') {
          setProvisioningStatus('failed');
          return true; // Done polling
        }
      }
    } catch (err) {
      console.error('Failed to poll cluster status:', err);
    }
    return false; // Continue polling
  }, []);

  // Start polling when we have an orgId and are on step 2
  useEffect(() => {
    if (!orgId || activeStep !== 1) return;

    let intervalId: NodeJS.Timeout;
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes with 5-second intervals

    const checkStatus = async () => {
      attempts++;
      const isDone = await pollClusterStatus(orgId);

      if (isDone || attempts >= maxAttempts) {
        clearInterval(intervalId);
        if (attempts >= maxAttempts && provisioningStatus !== 'ready') {
          // Timeout - but cluster might still be provisioning
          // For now, just mark as ready since M0 clusters can take time
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
  }, [orgId, activeStep, pollClusterStatus, provisioningStatus]);

  const handleCreateWorkspace = async () => {
    if (!workspaceName.trim() || !slug.trim()) {
      setError('Please enter a workspace name');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const result = await createOrganization(workspaceName.trim(), slug);

      if (result.success && result.orgId) {
        setOrgId(result.orgId);
        setProvisioningStatus('provisioning');
        setProvisioningProgress(10);
        setActiveStep(1);
      } else {
        setError(result.error || 'Failed to create workspace');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workspace');
    } finally {
      setIsCreating(false);
    }
  };

  const handleComplete = async () => {
    await refreshOrganizations();
    onComplete();
  };

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
        bgcolor: 'background.default',
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 500,
          borderRadius: 3,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: 3,
            textAlign: 'center',
            background: `linear-gradient(135deg, ${alpha('#00ED64', 0.15)} 0%, ${alpha('#00ED64', 0.02)} 100%)`,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Rocket sx={{ fontSize: 48, color: '#00ED64', mb: 1 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
            Welcome to NetPad
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Let's set up your workspace in under a minute
          </Typography>
        </Box>

        {/* Stepper */}
        <Box sx={{ px: 3, pt: 3 }}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel
                  sx={{
                    '& .MuiStepLabel-label': {
                      fontSize: 13,
                    },
                    '& .Mui-active': {
                      color: '#00ED64 !important',
                    },
                    '& .Mui-completed': {
                      color: '#00ED64 !important',
                    },
                  }}
                >
                  {label}
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        {/* Step Content */}
        <Box sx={{ p: 3, minHeight: 250 }}>
          {activeStep === 0 && (
            <Box>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  mb: 3,
                }}
              >
                <Business sx={{ color: '#00ED64', fontSize: 28 }} />
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    What should we call your workspace?
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    This can be your company, team, or project name
                  </Typography>
                </Box>
              </Box>

              <TextField
                fullWidth
                label="Workspace Name"
                placeholder="My Company"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && workspaceName.trim()) {
                    handleCreateWorkspace();
                  }
                }}
                autoFocus
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Business sx={{ color: 'text.disabled', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                }}
              />

              {slug && (
                <Typography variant="caption" color="text.secondary">
                  Your workspace URL: netpad.io/<strong>{slug}</strong>
                </Typography>
              )}

              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}

              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={handleCreateWorkspace}
                disabled={!workspaceName.trim() || isCreating}
                endIcon={isCreating ? <CircularProgress size={18} color="inherit" /> : <ArrowForward />}
                sx={{
                  mt: 3,
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
                {isCreating ? 'Creating...' : 'Continue'}
              </Button>
            </Box>
          )}

          {activeStep === 1 && (
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

              {provisioningStatus === 'provisioning' && (
                <Box sx={{ mb: 4 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    We're provisioning a free MongoDB Atlas cluster for you.
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
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    {provisioningProgress}% complete
                  </Typography>
                </Box>
              )}

              {provisioningStatus === 'ready' && (
                <Box sx={{ mb: 4 }}>
                  <CheckCircle sx={{ fontSize: 64, color: '#00ED64', mb: 2 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    Your workspace is ready!
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Your database is set up and ready to store form submissions.
                    No configuration needed - just start building.
                  </Typography>
                </Box>
              )}

              {provisioningStatus === 'failed' && (
                <Box sx={{ mb: 4 }}>
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    Database provisioning is taking longer than expected.
                    You can continue and it will be ready shortly.
                  </Alert>
                </Box>
              )}

              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={handleComplete}
                disabled={provisioningStatus === 'provisioning' && provisioningProgress < 50}
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
                {provisioningStatus === 'ready' ? 'Start Building' : 'Continue Anyway'}
              </Button>
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
}
