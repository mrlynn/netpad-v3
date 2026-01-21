'use client';

/**
 * DatabaseStep Component
 *
 * Third step - MongoDB connection setup.
 * Default: Auto-provision free Atlas cluster
 * Alternative: Bring your own connection (BYOC)
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  alpha,
  useTheme,
  Fade,
  CircularProgress,
} from '@mui/material';
import {
  ArrowForward,
  ArrowBack,
  Storage,
  ExpandMore,
  Cloud,
  Link as LinkIcon,
} from '@mui/icons-material';
import { useSignupOnboarding } from '@/contexts/SignupOnboardingContext';
import { BenefitsList } from '../components/BenefitsList';

interface DatabaseStepProps {
  onContinue: () => void;
  onBack: () => void;
}

const AUTO_PROVISION_BENEFITS = [
  { text: '512 MB free storage', emphasis: true },
  { text: '500 connections included' },
  { text: 'No configuration needed' },
  { text: 'Managed backups and security' },
  { text: 'Free forever on the free tier' },
];

export function DatabaseStep({ onContinue, onBack }: DatabaseStepProps) {
  const theme = useTheme();
  const {
    databaseChoice,
    setDatabaseChoice,
    connectionString,
    setConnectionString,
    databaseName,
    setDatabaseName,
    setupDatabase,
    skipStep,
    isProcessing,
    provisioningStatus,
    provisioningProgress,
    error,
  } = useSignupOnboarding();

  const [expanded, setExpanded] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleAutoProvision = async () => {
    setDatabaseChoice('auto-provision');
    const success = await setupDatabase();
    if (success) {
      onContinue();
    }
  };

  const handleBYOC = async () => {
    if (!connectionString.trim()) {
      setLocalError('Connection string is required');
      return;
    }

    if (!connectionString.startsWith('mongodb://') && !connectionString.startsWith('mongodb+srv://')) {
      setLocalError('Invalid MongoDB connection string format');
      return;
    }

    setDatabaseChoice('byoc');
    const success = await setupDatabase();
    if (success) {
      onContinue();
    }
  };

  const handleSkip = () => {
    setDatabaseChoice('skip');
    skipStep();
    onContinue();
  };

  const displayError = localError || error;
  const isProvisioning = isProcessing && provisioningStatus;

  return (
    <Fade in timeout={500}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: 520,
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
          <Storage sx={{ fontSize: 32, color: theme.palette.primary.main }} />
        </Box>

        {/* Header */}
        <Typography
          variant="h4"
          sx={{ fontWeight: 700, mb: 1, textAlign: 'center' }}
        >
          Set up your database
        </Typography>

        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ mb: 4, textAlign: 'center' }}
        >
          NetPad stores your form submissions in MongoDB.
        </Typography>

        {/* Auto-provision Option (Primary) */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            width: '100%',
            border: '2px solid',
            borderColor: theme.palette.primary.main,
            borderRadius: 3,
            bgcolor: alpha(theme.palette.primary.main, 0.02),
            mb: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Cloud sx={{ color: theme.palette.primary.main }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Free MongoDB Atlas Cluster
            </Typography>
            <Box
              sx={{
                px: 1.5,
                py: 0.5,
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                borderRadius: 1,
                ml: 'auto',
              }}
            >
              <Typography
                variant="caption"
                sx={{ fontWeight: 600, color: theme.palette.primary.main }}
              >
                Recommended
              </Typography>
            </Box>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            We'll automatically provision a free MongoDB Atlas cluster for you.
          </Typography>

          <BenefitsList benefits={AUTO_PROVISION_BENEFITS} />

          {isProvisioning && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {provisioningStatus === 'creating'
                  ? 'Creating your cluster...'
                  : provisioningStatus === 'configuring_network'
                  ? 'Configuring network access...'
                  : 'Setting up your database...'}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={provisioningProgress}
                sx={{
                  borderRadius: 1,
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  '& .MuiLinearProgress-bar': {
                    bgcolor: theme.palette.primary.main,
                  },
                }}
              />
            </Box>
          )}

          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={handleAutoProvision}
            disabled={isProcessing}
            endIcon={
              isProcessing && !expanded ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <ArrowForward />
              )
            }
            sx={{
              mt: 3,
              py: 1.5,
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            {isProvisioning ? 'Provisioning...' : 'Continue with free cluster'}
          </Button>
        </Paper>

        {/* BYOC Option (Secondary, Collapsed) */}
        <Accordion
          expanded={expanded}
          onChange={(_, isExpanded) => setExpanded(isExpanded)}
          elevation={0}
          sx={{
            width: '100%',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: '12px !important',
            '&:before': { display: 'none' },
            '&.Mui-expanded': {
              margin: 0,
            },
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMore />}
            sx={{
              borderRadius: 3,
              '&.Mui-expanded': {
                borderBottomLeftRadius: 0,
                borderBottomRightRadius: 0,
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <LinkIcon sx={{ color: 'text.secondary' }} />
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                Use your own MongoDB cluster
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0, pb: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Connect to an existing MongoDB Atlas cluster or self-hosted instance.
            </Typography>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                Connection String
              </Typography>
              <TextField
                fullWidth
                placeholder="mongodb+srv://user:pass@cluster.mongodb.net"
                value={connectionString}
                onChange={(e) => {
                  setLocalError(null);
                  setConnectionString(e.target.value);
                }}
                disabled={isProcessing}
                error={!!localError}
                type="password"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    fontFamily: 'monospace',
                  },
                }}
              />
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                Database Name
              </Typography>
              <TextField
                fullWidth
                placeholder="netpad_data"
                value={databaseName}
                onChange={(e) => setDatabaseName(e.target.value)}
                disabled={isProcessing}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />
            </Box>

            {localError && (
              <Typography
                variant="body2"
                color="error"
                sx={{ mb: 2 }}
              >
                {localError}
              </Typography>
            )}

            <Button
              fullWidth
              variant="outlined"
              size="large"
              onClick={handleBYOC}
              disabled={isProcessing || !connectionString.trim()}
              endIcon={
                isProcessing && expanded ? (
                  <CircularProgress size={20} />
                ) : (
                  <ArrowForward />
                )
              }
              sx={{
                py: 1.5,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              {isProcessing && expanded ? 'Connecting...' : 'Connect my cluster'}
            </Button>
          </AccordionDetails>
        </Accordion>

        {displayError && !localError && (
          <Typography
            variant="body2"
            color="error"
            sx={{ mt: 2, textAlign: 'center' }}
          >
            {displayError}
          </Typography>
        )}

        {/* Actions */}
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            mt: 4,
            width: '100%',
            justifyContent: 'space-between',
            alignItems: 'center',
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
            variant="text"
            onClick={handleSkip}
            disabled={isProcessing}
            sx={{
              textTransform: 'none',
              color: 'text.secondary',
            }}
          >
            I'll do this later
          </Button>
        </Box>
      </Box>
    </Fade>
  );
}
