'use client';

/**
 * Organization Creation Step
 *
 * First step in the onboarding flow - creates the user's workspace/organization
 */

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  alpha,
  InputAdornment,
  Alert,
} from '@mui/material';
import { Business, ArrowForward } from '@mui/icons-material';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOnboardingGate } from '@/contexts/OnboardingGateContext';

// Generate a URL-friendly slug from a name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

export function OrgStep() {
  const { createOrganization } = useOrganization();
  const { setCurrentStep, refreshStatus } = useOnboardingGate();

  const [workspaceName, setWorkspaceName] = useState('');
  const [slug, setSlug] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-generate slug from workspace name
  useEffect(() => {
    setSlug(generateSlug(workspaceName));
  }, [workspaceName]);

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
        // Refresh status to pick up the new org
        await refreshStatus();
        // Move to database step
        setCurrentStep('database');
      } else {
        setError(result.error || 'Failed to create workspace');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workspace');
    } finally {
      setIsCreating(false);
    }
  };

  return (
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
        endIcon={
          isCreating ? <CircularProgress size={18} color="inherit" /> : <ArrowForward />
        }
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
  );
}
