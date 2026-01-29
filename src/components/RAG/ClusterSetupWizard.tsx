/**
 * Cluster Setup Wizard
 *
 * Multi-step wizard for configuring user-cluster RAG storage
 * Guides users through validation and setup process
 */

'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stepper,
  Step,
  StepLabel,
  Box,
  Typography,
  TextField,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Storage as StorageIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
} from '@mui/icons-material';

interface ClusterSetupWizardProps {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  onComplete: () => void;
}

interface ValidationResult {
  isValid: boolean;
  clusterTier: string | null;
  mongoVersion: string | null;
  vectorSearchAvailable: boolean;
  connectionSuccessful: boolean;
  latencyMs: number;
  issues: ValidationIssue[];
  summary: string;
}

interface ValidationIssue {
  code: string;
  severity: 'error' | 'warning';
  message: string;
  resolution?: string;
}

const steps = ['Connect Cluster', 'Validate', 'Configure'];

export default function ClusterSetupWizard({
  open,
  onClose,
  organizationId,
  onComplete,
}: ClusterSetupWizardProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [connectionString, setConnectionString] = useState('');
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [configuring, setConfiguring] = useState(false);

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
    setError(null);
  };

  const handleValidate = async () => {
    if (!connectionString.trim()) {
      setError('Connection string is required');
      return;
    }

    setValidating(true);
    setError(null);

    try {
      const response = await fetch('/api/rag/cluster/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          connectionString,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Validation failed');
      }

      setValidationResult(data.validation);

      if (data.validation.isValid) {
        handleNext();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed');
    } finally {
      setValidating(false);
    }
  };

  const handleConfigure = async () => {
    setConfiguring(true);
    setError(null);

    try {
      // Update organization RAG config
      const response = await fetch('/api/rag/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          config: {
            mode: 'user-cluster',
            userCluster: {
              connectionString,
              clusterTier: validationResult?.clusterTier,
              mongoVersion: validationResult?.mongoVersion,
            },
          },
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Configuration failed');
      }

      onComplete();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Configuration failed');
    } finally {
      setConfiguring(false);
    }
  };

  const handleClose = () => {
    setActiveStep(0);
    setConnectionString('');
    setValidationResult(null);
    setError(null);
    onClose();
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box sx={{ py: 2 }}>
            <Typography variant="body1" paragraph>
              Connect your MongoDB Atlas cluster to store RAG data in your own infrastructure.
            </Typography>

            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2" fontWeight="medium" gutterBottom>
                Requirements:
              </Typography>
              <List dense>
                <ListItem disableGutters>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <CheckCircleIcon fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText primary="MongoDB Atlas cluster (M10+ recommended)" />
                </ListItem>
                <ListItem disableGutters>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <CheckCircleIcon fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText primary="MongoDB version 6.0.11 or later" />
                </ListItem>
                <ListItem disableGutters>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <CheckCircleIcon fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText primary="Atlas Vector Search enabled" />
                </ListItem>
              </List>
            </Alert>

            <TextField
              fullWidth
              label="MongoDB Connection String"
              placeholder="mongodb+srv://username:password@cluster.mongodb.net"
              value={connectionString}
              onChange={(e) => setConnectionString(e.target.value)}
              type="password"
              helperText="Your connection string will be encrypted and stored securely"
              error={!!error}
              sx={{ mb: 2 }}
            />

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </Box>
        );

      case 1:
        return (
          <Box sx={{ py: 2 }}>
            {validating ? (
              <Box display="flex" flexDirection="column" alignItems="center" py={4}>
                <CircularProgress size={48} sx={{ mb: 2 }} />
                <Typography variant="body1" color="text.secondary">
                  Validating cluster connection and requirements...
                </Typography>
              </Box>
            ) : validationResult ? (
              <>
                <Alert
                  severity={validationResult.isValid ? 'success' : 'error'}
                  sx={{ mb: 3 }}
                  icon={validationResult.isValid ? <CheckCircleIcon /> : <ErrorIcon />}
                >
                  <Typography variant="body1" fontWeight="medium">
                    {validationResult.summary}
                  </Typography>
                </Alert>

                {/* Cluster Info */}
                {validationResult.connectionSuccessful && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Cluster Information
                    </Typography>
                    <Box display="flex" gap={1} flexWrap="wrap">
                      {validationResult.mongoVersion && (
                        <Chip
                          icon={<InfoIcon />}
                          label={`MongoDB ${validationResult.mongoVersion}`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      )}
                      {validationResult.clusterTier && (
                        <Chip
                          icon={<StorageIcon />}
                          label={validationResult.clusterTier}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      )}
                      <Chip
                        icon={<SpeedIcon />}
                        label={`${validationResult.latencyMs}ms latency`}
                        size="small"
                        color={validationResult.latencyMs < 100 ? 'success' : 'warning'}
                        variant="outlined"
                      />
                    </Box>
                  </Box>
                )}

                {/* Validation Issues */}
                {validationResult.issues.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Validation Results
                    </Typography>
                    <List>
                      {validationResult.issues.map((issue, index) => (
                        <ListItem
                          key={index}
                          sx={{
                            bgcolor: issue.severity === 'error' ? 'error.light' : 'warning.light',
                            borderRadius: 1,
                            mb: 1,
                          }}
                        >
                          <ListItemIcon>
                            {issue.severity === 'error' ? (
                              <ErrorIcon color="error" />
                            ) : (
                              <WarningIcon color="warning" />
                            )}
                          </ListItemIcon>
                          <ListItemText
                            primary={issue.message}
                            secondary={issue.resolution}
                            primaryTypographyProps={{
                              fontWeight: 'medium',
                              color: issue.severity === 'error' ? 'error.dark' : 'warning.dark',
                            }}
                            secondaryTypographyProps={{
                              color: issue.severity === 'error' ? 'error.dark' : 'warning.dark',
                            }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}

                {error && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {error}
                  </Alert>
                )}
              </>
            ) : null}
          </Box>
        );

      case 2:
        return (
          <Box sx={{ py: 2 }}>
            <Alert severity="success" sx={{ mb: 3 }} icon={<CheckCircleIcon />}>
              <Typography variant="body1" fontWeight="medium" gutterBottom>
                Cluster validated successfully!
              </Typography>
              <Typography variant="body2">
                Your cluster meets all requirements for RAG storage.
              </Typography>
            </Alert>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Configuration Summary
              </Typography>
              <List>
                <ListItem disableGutters>
                  <ListItemIcon>
                    <StorageIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Storage Mode"
                    secondary="User-Cluster (Your MongoDB Atlas)"
                  />
                </ListItem>
                <ListItem disableGutters>
                  <ListItemIcon>
                    <SecurityIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Data Location"
                    secondary="Your cluster (full ownership and control)"
                  />
                </ListItem>
                <ListItem disableGutters>
                  <ListItemIcon>
                    <InfoIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Database"
                    secondary="netpad_rag (will be created automatically)"
                  />
                </ListItem>
              </List>
            </Box>

            <Alert severity="info">
              <Typography variant="body2">
                After configuration, you'll need to create a vector search index in Atlas UI.
                We'll provide instructions in the next step.
              </Typography>
            </Alert>

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  const getStepActions = () => {
    switch (activeStep) {
      case 0:
        return (
          <>
            <Button onClick={handleClose}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleValidate}
              disabled={!connectionString.trim() || validating}
            >
              {validating ? <CircularProgress size={20} /> : 'Validate Cluster'}
            </Button>
          </>
        );

      case 1:
        return (
          <>
            <Button onClick={handleBack} disabled={validating}>
              Back
            </Button>
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={!validationResult?.isValid || validating}
            >
              Continue to Configuration
            </Button>
          </>
        );

      case 2:
        return (
          <>
            <Button onClick={handleBack} disabled={configuring}>
              Back
            </Button>
            <Button
              variant="contained"
              onClick={handleConfigure}
              disabled={configuring}
            >
              {configuring ? <CircularProgress size={20} /> : 'Complete Setup'}
            </Button>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      disableEscapeKeyDown={validating || configuring}
    >
      <DialogTitle>
        <Typography variant="h5" component="div">
          Setup User-Cluster Storage
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Configure your own MongoDB Atlas cluster for RAG storage
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {renderStepContent()}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        {getStepActions()}
      </DialogActions>
    </Dialog>
  );
}
