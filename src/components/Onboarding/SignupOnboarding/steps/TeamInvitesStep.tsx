'use client';

/**
 * TeamInvitesStep Component
 *
 * Fourth step - invite team members via email.
 * Includes prominent skip option.
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Chip,
  IconButton,
  alpha,
  useTheme,
  Fade,
} from '@mui/material';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import {
  ArrowForward,
  ArrowBack,
  People,
  Add,
  Close,
} from '@mui/icons-material';
import { useSignupOnboarding } from '@/contexts/SignupOnboardingContext';

interface TeamInvitesStepProps {
  onContinue: () => void;
  onBack: () => void;
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function TeamInvitesStep({ onContinue, onBack }: TeamInvitesStepProps) {
  const theme = useTheme();
  const {
    teamInvites,
    addTeamInvite,
    removeTeamInvite,
    sendInvites,
    skipStep,
    isProcessing,
    error,
  } = useSignupOnboarding();

  const [emailInput, setEmailInput] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleAddEmail = () => {
    const email = emailInput.trim().toLowerCase();

    if (!email) return;

    if (!isValidEmail(email)) {
      setLocalError('Please enter a valid email address');
      return;
    }

    if (teamInvites.includes(email)) {
      setLocalError('This email has already been added');
      return;
    }

    addTeamInvite(email);
    setEmailInput('');
    setLocalError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddEmail();
    }
  };

  const handleContinue = async () => {
    if (teamInvites.length > 0) {
      const success = await sendInvites();
      if (!success) return;
    }
    onContinue();
  };

  const handleSkip = () => {
    skipStep();
    onContinue();
  };

  const displayError = localError || error;

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
          <People sx={{ fontSize: 32, color: theme.palette.primary.main }} />
        </Box>

        {/* Header */}
        <Typography
          variant="h4"
          sx={{ fontWeight: 700, mb: 1, textAlign: 'center' }}
        >
          Invite your team
        </Typography>

        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ mb: 4, textAlign: 'center' }}
        >
          NetPad is better with your team. Invite co-workers to collaborate.
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
          <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
            Email addresses
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField
              fullWidth
              placeholder="colleague@company.com"
              value={emailInput}
              onChange={(e) => {
                setLocalError(null);
                setEmailInput(e.target.value);
              }}
              onKeyDown={handleKeyDown}
              disabled={isProcessing}
              error={!!localError}
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />
            <Button
              variant="outlined"
              onClick={handleAddEmail}
              disabled={isProcessing || !emailInput.trim()}
              sx={{
                minWidth: 48,
                borderRadius: 2,
              }}
            >
              <Add />
            </Button>
          </Box>

          {displayError && (
            <Typography
              variant="body2"
              color="error"
              sx={{ mb: 2 }}
            >
              {displayError}
            </Typography>
          )}

          {/* Email chips */}
          {teamInvites.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              {teamInvites.map((email) => (
                <Chip
                  key={email}
                  label={email}
                  onDelete={() => removeTeamInvite(email)}
                  deleteIcon={
                    <IconButton size="small" sx={{ p: 0 }}>
                      <Close sx={{ fontSize: 16 }} />
                    </IconButton>
                  }
                  sx={{
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    '& .MuiChip-deleteIcon': {
                      color: 'text.secondary',
                      '&:hover': {
                        color: 'text.primary',
                      },
                    },
                  }}
                />
              ))}
            </Box>
          )}

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontSize: 13 }}
          >
            You can always invite more team members later from Settings.
          </Typography>
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

          {teamInvites.length === 0 ? (
            <Button
              variant="contained"
              size="large"
              onClick={handleSkip}
              disabled={isProcessing}
              sx={{
                px: 4,
                py: 1.5,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              Skip for now
            </Button>
          ) : (
            <Button
              variant="contained"
              size="large"
              onClick={handleContinue}
              disabled={isProcessing}
              endIcon={
                isProcessing ? (
                  <NetPadLoader size="small" variant="svg" showPhrases={false} />
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
              {isProcessing
                ? 'Sending invites...'
                : `Send ${teamInvites.length} invite${teamInvites.length > 1 ? 's' : ''}`}
            </Button>
          )}
        </Box>

        {teamInvites.length > 0 && (
          <Button
            variant="text"
            onClick={handleSkip}
            disabled={isProcessing}
            sx={{
              mt: 2,
              textTransform: 'none',
              color: 'text.secondary',
              fontSize: 13,
            }}
          >
            Skip and don't send invites
          </Button>
        )}
      </Box>
    </Fade>
  );
}
