'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Paper,
  alpha,
  Chip,
  IconButton,
  Autocomplete,
  Divider,
} from '@mui/material';
import {
  Storage,
  VpnKey,
  Add,
  CheckCircle,
  Close,
  ArrowForward,
  ArrowBack,
  Business,
  Lock,
  Folder,
} from '@mui/icons-material';
import { FormDataSource } from '@/types/form';
import NextLink from 'next/link';
import { AddConnectionDialog } from '@/components/Settings/AddConnectionDialog';

interface Connection {
  vaultId: string;
  name: string;
  description?: string;
  database: string;
  allowedCollections: string[];
  status: 'active' | 'disabled';
}

interface Organization {
  orgId: string;
  name: string;
}

interface DataSourceSetupModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: (dataSource: FormDataSource, organizationId: string) => void;
  currentDataSource?: FormDataSource;
  currentOrganizationId?: string;
  formName?: string;
}

// Steps are dynamic based on context
const getSteps = (singleOrg: boolean) => {
  if (singleOrg) {
    return [
      { label: 'Choose Connection', description: 'Select or create a MongoDB connection' },
      { label: 'Set Collection', description: 'Where should submissions be stored?' },
    ];
  }
  return [
    { label: 'Select Organization', description: 'Choose which organization owns this form' },
    { label: 'Choose Connection', description: 'Select or create a MongoDB connection' },
    { label: 'Set Collection', description: 'Where should submissions be stored?' },
  ];
};

export function DataSourceSetupModal({
  open,
  onClose,
  onComplete,
  currentDataSource,
  currentOrganizationId,
  formName,
}: DataSourceSetupModalProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>(currentOrganizationId || '');
  const [selectedVaultId, setSelectedVaultId] = useState<string>(currentDataSource?.vaultId || '');
  const [collection, setCollection] = useState<string>(currentDataSource?.collection || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addConnectionDialogOpen, setAddConnectionDialogOpen] = useState(false);

  // Determine if we should use simplified flow (single org = skip org selection)
  const isSingleOrg = organizations.length === 1;
  const steps = getSteps(isSingleOrg);

  // Map logical step to actual step based on flow
  const getActualStep = (logicalStep: number) => {
    if (isSingleOrg) {
      // In single-org mode: step 0 = connection, step 1 = collection
      return logicalStep;
    }
    // In multi-org mode: step 0 = org, step 1 = connection, step 2 = collection
    return logicalStep;
  };

  // Get which logical step we're on
  const getLogicalStep = () => {
    if (isSingleOrg) {
      // Single org: 0 = connection, 1 = collection
      return activeStep;
    }
    // Multi-org: 0 = org, 1 = connection, 2 = collection
    return activeStep;
  };

  // Fetch organizations on mount
  useEffect(() => {
    if (open) {
      fetchOrganizations();
    }
  }, [open]);

  // Fetch connections when org changes
  useEffect(() => {
    if (selectedOrgId) {
      fetchConnections(selectedOrgId);
    }
  }, [selectedOrgId]);

  // Reset step when modal opens
  useEffect(() => {
    if (open) {
      // If we have existing values, skip to appropriate step
      if (currentOrganizationId && currentDataSource?.vaultId && currentDataSource?.collection) {
        setActiveStep(2);
      } else if (currentOrganizationId && currentDataSource?.vaultId) {
        setActiveStep(2);
      } else if (currentOrganizationId) {
        setActiveStep(1);
      } else {
        setActiveStep(0);
      }
      setSelectedOrgId(currentOrganizationId || '');
      setSelectedVaultId(currentDataSource?.vaultId || '');
      setCollection(currentDataSource?.collection || '');
    }
  }, [open, currentOrganizationId, currentDataSource]);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/organizations');
      const data = await response.json();

      if (response.ok && data.organizations) {
        setOrganizations(data.organizations);

        // If we have a current org, use it
        if (currentOrganizationId) {
          setSelectedOrgId(currentOrganizationId);
        } else if (data.organizations.length === 1) {
          // Auto-select if only one org - no need to advance step since we skip org selection
          setSelectedOrgId(data.organizations[0].orgId);
          // Start at step 0 which is now "Choose Connection" in single-org mode
          setActiveStep(0);
        }
      }
    } catch (err) {
      setError('Failed to fetch organizations');
    } finally {
      setLoading(false);
    }
  };

  const fetchConnections = async (orgId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/organizations/${orgId}/vault`);
      const data = await response.json();

      if (response.ok) {
        setConnections(data.connections || []);

        // If we have a current vault, keep it selected
        if (currentDataSource?.vaultId) {
          const exists = (data.connections || []).find(
            (c: Connection) => c.vaultId === currentDataSource.vaultId
          );
          if (exists) {
            setSelectedVaultId(currentDataSource.vaultId);
          }
        } else if ((data.connections || []).length === 1) {
          // Auto-select if only one connection
          setSelectedVaultId(data.connections[0].vaultId);
        }
      } else {
        setError(data.error || 'Failed to load connections');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (isSingleOrg) {
      // Single org mode: step 0 = connection, step 1 = collection
      if (activeStep === 0 && selectedVaultId) {
        setActiveStep(1);
      } else if (activeStep === 1 && collection) {
        handleComplete();
      }
    } else {
      // Multi-org mode: step 0 = org, step 1 = connection, step 2 = collection
      if (activeStep === 0 && selectedOrgId) {
        setActiveStep(1);
      } else if (activeStep === 1 && selectedVaultId) {
        setActiveStep(2);
      } else if (activeStep === 2 && collection) {
        handleComplete();
      }
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => Math.max(0, prev - 1));
  };

  const handleComplete = () => {
    if (selectedVaultId && collection && selectedOrgId) {
      onComplete({ vaultId: selectedVaultId, collection }, selectedOrgId);
      onClose();
    }
  };

  const selectedConnection = connections.find((c) => c.vaultId === selectedVaultId);
  const availableCollections = selectedConnection?.allowedCollections || [];

  const canProceed = () => {
    if (isSingleOrg) {
      // Single org mode
      switch (activeStep) {
        case 0:
          return !!selectedVaultId;
        case 1:
          return !!collection;
        default:
          return false;
      }
    } else {
      // Multi-org mode
      switch (activeStep) {
        case 0:
          return !!selectedOrgId;
        case 1:
          return !!selectedVaultId;
        case 2:
          return !!collection;
        default:
          return false;
      }
    }
  };

  // Determine which step content to show
  const isOrgStep = !isSingleOrg && activeStep === 0;
  const isConnectionStep = isSingleOrg ? activeStep === 0 : activeStep === 1;
  const isCollectionStep = isSingleOrg ? activeStep === 1 : activeStep === 2;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: 'hidden',
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                background: 'linear-gradient(135deg, #00ED64 0%, #4DFF9F 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Storage sx={{ color: '#001E2B' }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Configure Data Storage
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formName ? `For: ${formName}` : 'Where should form submissions be saved?'}
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loading && organizations.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress sx={{ color: '#00ED64' }} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Loading...
            </Typography>
          </Box>
        ) : organizations.length === 0 ? (
          <Paper
            elevation={0}
            sx={{
              p: 4,
              textAlign: 'center',
              border: '2px dashed',
              borderColor: 'divider',
              borderRadius: 2,
            }}
          >
            <Business sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No Organizations Found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Create an organization first to set up secure data storage for your forms.
            </Typography>
            <Button
              component={NextLink}
              href="/settings?tab=organizations"
              variant="contained"
              startIcon={<Add />}
              sx={{
                background: 'linear-gradient(135deg, #00ED64 0%, #4DFF9F 100%)',
                color: '#001E2B',
                '&:hover': {
                  background: 'linear-gradient(135deg, #00CC55 0%, #3DFF8F 100%)',
                },
              }}
            >
              Create Organization
            </Button>
          </Paper>
        ) : (
          <Stepper activeStep={activeStep} orientation="vertical" sx={{ mt: 2 }}>
            {/* Step: Organization (only in multi-org mode) */}
            {!isSingleOrg && (
              <Step>
                <StepLabel
                  StepIconProps={{
                    sx: {
                      '&.Mui-active': { color: '#00ED64' },
                      '&.Mui-completed': { color: '#00ED64' },
                    },
                  }}
                >
                  <Typography variant="subtitle2">{steps[0].label}</Typography>
                </StepLabel>
                <StepContent>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                    {steps[0].description}
                  </Typography>

                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Organization</InputLabel>
                    <Select
                      value={selectedOrgId}
                      label="Organization"
                      onChange={(e) => {
                        setSelectedOrgId(e.target.value);
                        setSelectedVaultId('');
                        setCollection('');
                      }}
                    >
                      {organizations.map((org) => (
                        <MenuItem key={org.orgId} value={org.orgId}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Business sx={{ fontSize: 18, color: 'text.secondary' }} />
                            {org.name}
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="contained"
                      onClick={handleNext}
                      disabled={!selectedOrgId}
                      endIcon={<ArrowForward />}
                      sx={{
                        background: 'linear-gradient(135deg, #00ED64 0%, #4DFF9F 100%)',
                        color: '#001E2B',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #00CC55 0%, #3DFF8F 100%)',
                        },
                      }}
                    >
                      Continue
                    </Button>
                  </Box>
                </StepContent>
              </Step>
            )}

            {/* Step: Connection */}
            <Step>
              <StepLabel
                StepIconProps={{
                  sx: {
                    '&.Mui-active': { color: '#00ED64' },
                    '&.Mui-completed': { color: '#00ED64' },
                  },
                }}
              >
                <Typography variant="subtitle2">
                  {isSingleOrg ? steps[0].label : steps[1].label}
                </Typography>
              </StepLabel>
              <StepContent>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                  {isSingleOrg ? steps[0].description : steps[1].description}
                </Typography>

                {/* Show org chip in single-org mode */}
                {isSingleOrg && organizations[0] && (
                  <Chip
                    size="small"
                    icon={<Business sx={{ fontSize: 14 }} />}
                    label={organizations[0].name}
                    sx={{ mb: 2, bgcolor: alpha('#2196f3', 0.1) }}
                  />
                )}

                {loading ? (
                  <Box sx={{ textAlign: 'center', py: 2 }}>
                    <CircularProgress size={24} sx={{ color: '#00ED64' }} />
                  </Box>
                ) : connections.length === 0 ? (
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      textAlign: 'center',
                      border: '2px dashed',
                      borderColor: 'divider',
                      borderRadius: 2,
                      mb: 2,
                    }}
                  >
                    <Lock sx={{ fontSize: 36, color: 'text.disabled', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      No connections in this organization
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<Add />}
                      size="small"
                      onClick={() => setAddConnectionDialogOpen(true)}
                      sx={{
                        mt: 1,
                        background: 'linear-gradient(135deg, #00ED64 0%, #4DFF9F 100%)',
                        color: '#001E2B',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #00CC55 0%, #3DFF8F 100%)',
                        },
                      }}
                    >
                      Add Connection
                    </Button>
                  </Paper>
                ) : (
                  <>
                    <FormControl fullWidth sx={{ mb: 1 }}>
                      <InputLabel>Connection</InputLabel>
                      <Select
                        value={selectedVaultId}
                        label="Connection"
                        onChange={(e) => {
                          setSelectedVaultId(e.target.value);
                          setCollection('');
                        }}
                      >
                        {connections
                          .filter((c) => c.status === 'active')
                          .map((conn) => (
                            <MenuItem key={conn.vaultId} value={conn.vaultId}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <VpnKey sx={{ color: '#00ED64', fontSize: 18 }} />
                                <Box>
                                  <Typography variant="body2">{conn.name}</Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    Database: {conn.database}
                                  </Typography>
                                </Box>
                              </Box>
                            </MenuItem>
                          ))}
                      </Select>
                    </FormControl>
                    <Button
                      size="small"
                      startIcon={<Add />}
                      onClick={() => setAddConnectionDialogOpen(true)}
                      sx={{
                        mb: 2,
                        color: '#00ED64',
                        '&:hover': {
                          bgcolor: alpha('#00ED64', 0.05),
                        },
                      }}
                    >
                      Add New Connection
                    </Button>
                  </>
                )}

                <Box sx={{ display: 'flex', gap: 1 }}>
                  {!isSingleOrg && (
                    <Button onClick={handleBack} startIcon={<ArrowBack />}>
                      Back
                    </Button>
                  )}
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    disabled={!selectedVaultId}
                    endIcon={<ArrowForward />}
                    sx={{
                      background: 'linear-gradient(135deg, #00ED64 0%, #4DFF9F 100%)',
                      color: '#001E2B',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #00CC55 0%, #3DFF8F 100%)',
                      },
                    }}
                  >
                    Continue
                  </Button>
                </Box>
              </StepContent>
            </Step>

            {/* Step: Collection */}
            <Step>
              <StepLabel
                StepIconProps={{
                  sx: {
                    '&.Mui-active': { color: '#00ED64' },
                    '&.Mui-completed': { color: '#00ED64' },
                  },
                }}
              >
                <Typography variant="subtitle2">
                  {isSingleOrg ? steps[1].label : steps[2].label}
                </Typography>
              </StepLabel>
              <StepContent>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                  {isSingleOrg ? steps[1].description : steps[2].description}
                </Typography>

                {availableCollections.length > 0 ? (
                  <Autocomplete
                    freeSolo
                    options={availableCollections}
                    value={collection}
                    onChange={(_, newValue) => setCollection(newValue || '')}
                    onInputChange={(_, newValue) => setCollection(newValue)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Collection"
                        placeholder="Select or enter collection name"
                        helperText="Choose an existing collection or enter a new name"
                      />
                    )}
                    sx={{ mb: 2 }}
                  />
                ) : (
                  <TextField
                    fullWidth
                    label="Collection"
                    value={collection}
                    onChange={(e) => setCollection(e.target.value)}
                    placeholder="form_submissions"
                    helperText="Enter the collection name for form submissions"
                    sx={{ mb: 2 }}
                  />
                )}

                {selectedConnection && collection && (
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      mb: 2,
                      bgcolor: alpha('#00ED64', 0.05),
                      border: '1px solid',
                      borderColor: alpha('#00ED64', 0.2),
                      borderRadius: 2,
                    }}
                  >
                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                      <CheckCircle sx={{ color: '#00ED64', fontSize: 20, mt: 0.25 }} />
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          Form submissions will be stored in:
                        </Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', mt: 0.5 }}>
                          {selectedConnection.database}.{collection}
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                )}

                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button onClick={handleBack} startIcon={<ArrowBack />}>
                    Back
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleComplete}
                    disabled={!collection}
                    startIcon={<CheckCircle />}
                    sx={{
                      background: 'linear-gradient(135deg, #00ED64 0%, #4DFF9F 100%)',
                      color: '#001E2B',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #00CC55 0%, #3DFF8F 100%)',
                      },
                    }}
                  >
                    Save Configuration
                  </Button>
                </Box>
              </StepContent>
            </Step>
          </Stepper>
        )}

        {/* Security Notice */}
        <Paper
          elevation={0}
          sx={{
            mt: 3,
            p: 2,
            bgcolor: alpha('#2196f3', 0.05),
            border: '1px solid',
            borderColor: alpha('#2196f3', 0.2),
            borderRadius: 2,
          }}
        >
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
            <Lock sx={{ color: '#2196f3', fontSize: 20, mt: 0.25 }} />
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                Secure Connection Storage
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Connection strings are encrypted with AES-256 and only decrypted server-side when
                processing form submissions.
              </Typography>
            </Box>
          </Box>
        </Paper>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>

      {/* Add Connection Dialog */}
      <AddConnectionDialog
        open={addConnectionDialogOpen}
        onClose={() => setAddConnectionDialogOpen(false)}
        organizationId={selectedOrgId}
        organizationName={organizations.find((o) => o.orgId === selectedOrgId)?.name}
        onSuccess={(newConnection) => {
          // Add the new connection to the list
          setConnections((prev) => [
            ...prev,
            {
              vaultId: newConnection.vaultId,
              name: newConnection.name,
              database: newConnection.database,
              allowedCollections: newConnection.allowedCollections,
              status: 'active' as const,
            },
          ]);
          // Auto-select the new connection
          setSelectedVaultId(newConnection.vaultId);
          // Clear any previous collection selection
          setCollection('');
        }}
      />
    </Dialog>
  );
}
