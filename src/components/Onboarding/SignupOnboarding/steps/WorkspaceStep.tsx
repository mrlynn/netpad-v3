'use client';

/**
 * WorkspaceStep Component
 *
 * Second step - workspace naming with auto-generated URL slug.
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  InputAdornment,
  alpha,
  useTheme,
  Fade,
  CircularProgress,
} from '@mui/material';
import { ArrowForward, ArrowBack, Business } from '@mui/icons-material';
import { useSignupOnboarding } from '@/contexts/SignupOnboardingContext';

interface WorkspaceStepProps {
  onContinue: () => void;
  onBack: () => void;
}

export function WorkspaceStep({ onContinue, onBack }: WorkspaceStepProps) {
  const theme = useTheme();
  const {
    workspaceName,
    workspaceSlug,
    setWorkspaceName,
    setWorkspaceSlug,
    createWorkspace,
    isProcessing,
    error,
  } = useSignupOnboarding();

  const [localError, setLocalError] = useState<string | null>(null);
  const [slugEdited, setSlugEdited] = useState(false);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalError(null);
    setWorkspaceName(e.target.value);
    // Only auto-update slug if user hasn't manually edited it
    if (!slugEdited) {
      // Slug is auto-generated in context
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalError(null);
    setSlugEdited(true);
    setWorkspaceSlug(e.target.value);
  };

  const handleContinue = async () => {
    if (!workspaceName.trim()) {
      setLocalError('Workspace name is required');
      return;
    }

    if (workspaceName.trim().length < 2) {
      setLocalError('Workspace name must be at least 2 characters');
      return;
    }

    const success = await createWorkspace();
    if (success) {
      onContinue();
    }
  };

  const displayError = localError || error;
  const isValid = workspaceName.trim().length >= 2;

  return (
    <Fade in timeout={500}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: 480,
          mx: 'auto',
        }}
      >
        {/* Icon */}
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: '16px',
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 3,
          }}
        >
          <Business sx={{ fontSize: 32, color: theme.palette.primary.main }} />
        </Box>

        {/* Header */}
        <Typography
          variant="h4"
          sx={{ fontWeight: 700, mb: 1, textAlign: 'center' }}
        >
          Name your workspace
        </Typography>

        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ mb: 4, textAlign: 'center' }}
        >
          This is where your team will build forms and workflows.
        </Typography>

        {/* Form */}
        <Paper
          elevation={0}
          sx={{
            p: 4,
            width: '100%',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 3,
            bgcolor: 'background.paper',
          }}
        >
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
              Workspace Name
            </Typography>
            <TextField
              fullWidth
              placeholder="Acme Inc"
              value={workspaceName}
              onChange={handleNameChange}
              disabled={isProcessing}
              error={!!displayError}
              autoFocus
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
              Workspace URL
            </Typography>
            <TextField
              fullWidth
              value={workspaceSlug}
              onChange={handleSlugChange}
              disabled={isProcessing}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Typography variant="body2" color="text.secondary">
                      netpad.io/
                    </Typography>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />
          </Box>

          {displayError && (
            <Typography
              variant="body2"
              color="error"
              sx={{ mb: 2, textAlign: 'center' }}
            >
              {displayError}
            </Typography>
          )}
        </Paper>

        {/* Actions */}
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            mt: 4,
            width: '100%',
            justifyContent: 'center',
          }}
        >
          <Button
            variant="text"
            onClick={onBack}
            startIcon={<ArrowBack />}
            disabled={isProcessing}
            sx={{
              textTransform: 'none',
              color: 'text.secondary',
            }}
          >
            Back
          </Button>

          <Button
            variant="contained"
            size="large"
            onClick={handleContinue}
            disabled={!isValid || isProcessing}
            endIcon={
              isProcessing ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <ArrowForward />
              )
            }
            sx={{
              px: 4,
              py: 1.5,
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            {isProcessing ? 'Creating...' : 'Continue'}
          </Button>
        </Box>
      </Box>
    </Fade>
  );
}
