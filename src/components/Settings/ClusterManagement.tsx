'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  CircularProgress,
  Chip,
  LinearProgress,
  alpha,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
  Paper,
  Stepper,
  Step,
  StepLabel,
  StepContent,
} from '@mui/material';
import {
  Storage,
  CheckCircle,
  Error,
  CloudQueue,
  Refresh,
  ExpandMore,
  ContentCopy,
  Download,
  Upload,
  Person,
  Key,
  Security,
  Info,
  DataObject,
  ArrowForward,
  CloudDownload,
  Lightbulb,
  Add,
  Delete,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import { useClusterProvisioning } from '@/hooks/useClusterProvisioning';
import { ClusterProvisioningStatus as ProvisioningStatusType } from '@/types/platform';
import { ProjectSelector } from '@/components/Projects/ProjectSelector';

interface ClusterManagementProps {
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

export function ClusterManagement({ organizationId }: ClusterManagementProps) {
  const { status, loading, error, refetch, triggerProvisioning, deleteCluster } = useClusterProvisioning(organizationId);
  const [provisioning, setProvisioning] = useState(false);
  const [provisionError, setProvisionError] = useState<string | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showConnectionString, setShowConnectionString] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  const handleProvision = async () => {
    if (!selectedProjectId) {
      setProvisionError('Please select a project first');
      return;
    }

    setProvisioning(true);
    setProvisionError(null);

    const result = await triggerProvisioning({ projectId: selectedProjectId });

    if (!result.success) {
      setProvisionError(result.error || 'Failed to provision cluster');
    }

    setProvisioning(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError(null);

    const result = await deleteCluster();

    if (result.success) {
      setDeleteDialogOpen(false);
    } else {
      setDeleteError(result.error || 'Failed to delete cluster');
    }

    setDeleting(false);
  };

  if (loading && !status) {
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress size={32} sx={{ color: '#00ED64' }} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Loading cluster information...
          </Typography>
        </CardContent>
      </Card>
    );
  }

  // No provisioning available or configured
  if (status && !status.provisioningAvailable && !status.hasCluster) {
    return (
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          Automatic Database Provisioning Not Available
        </Typography>
        <Typography variant="body2">
          You can add your own MongoDB connection in the Connections section below.
        </Typography>
      </Alert>
    );
  }

  const config = status?.status ? STATUS_CONFIG[status.status as ProvisioningStatusType] : null;
  const isInProgress = ['pending', 'creating_project', 'creating_cluster', 'creating_user', 'configuring_network'].includes(status?.status || '');
  const isReady = status?.status === 'ready';

  return (
    <Box sx={{ mb: 4 }}>
      {/* Main Status Card */}
      {status?.hasCluster && status.cluster && (
        <Card
          sx={{
            mb: 3,
            border: '1px solid',
            borderColor: isReady
              ? alpha('#00ED64', 0.3)
              : status?.status === 'failed'
              ? alpha('#f44336', 0.3)
              : 'divider',
            bgcolor: isReady
              ? alpha('#00ED64', 0.02)
              : status?.status === 'failed'
              ? alpha('#f44336', 0.02)
              : 'transparent',
          }}
        >
          <CardContent>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 3 }}>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 2,
                  bgcolor: isReady
                    ? alpha('#00ED64', 0.1)
                    : status?.status === 'failed'
                    ? alpha('#f44336', 0.1)
                    : alpha('#2196f3', 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isReady ? (
                  <CheckCircle sx={{ color: '#00ED64', fontSize: 28 }} />
                ) : status?.status === 'failed' ? (
                  <Error sx={{ color: '#f44336', fontSize: 28 }} />
                ) : (
                  <CloudQueue sx={{ color: '#2196f3', fontSize: 28 }} />
                )}
              </Box>

              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Typography variant="h5" sx={{ fontWeight: 600 }}>
                    Your Form Database
                  </Typography>
                  {config && (
                    <Chip
                      label={config.label}
                      size="small"
                      color={config.color}
                    />
                  )}
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {config?.description}
                </Typography>
              </Box>

              <Tooltip title="Refresh status">
                <IconButton onClick={() => refetch()} size="small">
                  <Refresh />
                </IconButton>
              </Tooltip>
            </Box>

            {/* Progress bar for in-progress states */}
            {isInProgress && config && (
              <Box sx={{ mb: 3 }}>
                <LinearProgress
                  variant="determinate"
                  value={config.progress}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    bgcolor: alpha('#2196f3', 0.1),
                    '& .MuiLinearProgress-bar': {
                      bgcolor: '#2196f3',
                      borderRadius: 4,
                    },
                  }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  {config.progress}% complete
                </Typography>
              </Box>
            )}

            {/* Cluster Details when ready */}
            {isReady && status.cluster && (
              <>
                <Paper
                  variant="outlined"
                  sx={{ p: 2, mb: 3, bgcolor: alpha('#00ED64', 0.02) }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Storage sx={{ fontSize: 18 }} />
                    Cluster Details
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 2 }}>
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
                        {status.cluster.region?.replace(/_/g, ' ')}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Tier
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {status.cluster.instanceSize} (Free Tier)
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Storage
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {status.cluster.storageLimitMb} MB
                      </Typography>
                    </Box>
                  </Box>
                </Paper>

                {/* Data Location Info */}
                <Alert
                  severity="info"
                  icon={<Info />}
                  sx={{ mb: 3 }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Where is your data stored?
                  </Typography>
                  <Typography variant="body2">
                    Your form submissions are securely stored in a MongoDB Atlas M0 cluster.
                    This is a fully managed, free-tier database hosted on {status.cluster.provider}
                    in the {status.cluster.region?.replace(/_/g, ' ')} region.
                  </Typography>
                </Alert>

                {/* Action Buttons */}
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Button
                    variant="outlined"
                    startIcon={<Download />}
                    onClick={() => setExportDialogOpen(true)}
                    sx={{ borderColor: '#00ED64', color: '#00ED64' }}
                  >
                    Export Data
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<ArrowForward />}
                    onClick={() => setTransferDialogOpen(true)}
                  >
                    Transfer Ownership
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<Delete />}
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    Delete Cluster
                  </Button>
                </Box>
              </>
            )}

            {/* Failed state actions */}
            {status?.status === 'failed' && (
              <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
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
          </CardContent>
        </Card>
      )}

      {/* No cluster - show option to provision */}
      {status?.provisioningAvailable && !status.hasCluster && (
        <Card
          sx={{
            mb: 3,
            border: '2px dashed',
            borderColor: 'divider',
            bgcolor: 'transparent',
          }}
        >
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Storage sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Get a Free MongoDB Database
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 500, mx: 'auto' }}>
              We&apos;ll automatically provision a free MongoDB Atlas M0 cluster for you.
              Your form submissions will be securely stored and you can export or transfer your data anytime.
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 3, flexWrap: 'wrap' }}>
              <Chip icon={<CheckCircle sx={{ fontSize: 16 }} />} label="512 MB Storage" variant="outlined" />
              <Chip icon={<CheckCircle sx={{ fontSize: 16 }} />} label="500 Connections" variant="outlined" />
              <Chip icon={<CheckCircle sx={{ fontSize: 16 }} />} label="Free Forever" variant="outlined" />
            </Box>

            {provisionError && (
              <Alert severity="error" sx={{ mb: 2, maxWidth: 400, mx: 'auto' }}>
                {provisionError}
              </Alert>
            )}

            <Box sx={{ maxWidth: 400, mx: 'auto', mb: 3 }}>
              <ProjectSelector
                organizationId={organizationId}
                value={selectedProjectId}
                onChange={setSelectedProjectId}
                required
                label="Select Project"
                helperText="Choose a project to provision the cluster in"
              />
            </Box>

            <Button
              variant="contained"
              size="large"
              startIcon={provisioning ? <CircularProgress size={20} color="inherit" /> : <CloudQueue />}
              onClick={handleProvision}
              disabled={provisioning || !selectedProjectId}
              sx={{
                bgcolor: '#00ED64',
                color: '#001E2B',
                fontWeight: 600,
                px: 4,
                '&:hover': { bgcolor: '#00c853' },
              }}
            >
              {provisioning ? 'Provisioning...' : 'Create Free Database'}
            </Button>

            <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 2 }}>
              Takes about 30 seconds • Hosted on MongoDB Atlas
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Data Ownership Accordion */}
      {isReady && (
        <Accordion
          defaultExpanded={false}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            '&:before': { display: 'none' },
            borderRadius: '8px !important',
            mb: 2,
          }}
        >
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Key sx={{ color: '#00ED64' }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Data Ownership & Control
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" color="text.secondary" paragraph>
              Your data belongs to you. Here&apos;s how you can take full control:
            </Typography>

            <List dense>
              <ListItem>
                <ListItemIcon>
                  <Download sx={{ color: '#00ED64' }} />
                </ListItemIcon>
                <ListItemText
                  primary="Export Your Data"
                  secondary="Download all your form submissions as JSON or CSV files anytime."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <ArrowForward sx={{ color: '#00ED64' }} />
                </ListItemIcon>
                <ListItemText
                  primary="Transfer to Your Own Cluster"
                  secondary="Migrate your data to your own MongoDB Atlas account with full credentials."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Security sx={{ color: '#00ED64' }} />
                </ListItemIcon>
                <ListItemText
                  primary="Bring Your Own Database"
                  secondary="Connect your existing MongoDB cluster for complete control."
                />
              </ListItem>
            </List>

            <Alert severity="success" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>No lock-in:</strong> You can export your data or connect your own database at any time.
                We believe your data should always be portable.
              </Typography>
            </Alert>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Export Data Dialog */}
      <ExportDataDialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        organizationId={organizationId}
      />

      {/* Transfer Ownership Dialog */}
      <TransferOwnershipDialog
        open={transferDialogOpen}
        onClose={() => setTransferDialogOpen(false)}
        organizationId={organizationId}
        cluster={status?.cluster}
      />

      {/* Delete Cluster Confirmation Dialog */}
      <DeleteClusterDialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setDeleteError(null);
        }}
        onConfirm={handleDelete}
        deleting={deleting}
        error={deleteError}
        cluster={status?.cluster}
      />
    </Box>
  );
}

// Export Data Dialog Component
function ExportDataDialog({
  open,
  onClose,
  organizationId
}: {
  open: boolean;
  onClose: () => void;
  organizationId: string;
}) {
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await fetch(`/api/organizations/${organizationId}/export?format=${exportFormat}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `form-data-export.${exportFormat}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        onClose();
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Export Your Data</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" paragraph>
          Download all your form submissions. Choose your preferred format:
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, my: 3 }}>
          <Card
            onClick={() => setExportFormat('json')}
            sx={{
              flex: 1,
              p: 2,
              cursor: 'pointer',
              border: '2px solid',
              borderColor: exportFormat === 'json' ? '#00ED64' : 'divider',
              bgcolor: exportFormat === 'json' ? alpha('#00ED64', 0.05) : 'transparent',
            }}
          >
            <DataObject sx={{ color: exportFormat === 'json' ? '#00ED64' : 'text.secondary', mb: 1 }} />
            <Typography variant="subtitle2">JSON</Typography>
            <Typography variant="caption" color="text.secondary">
              Best for importing into MongoDB
            </Typography>
          </Card>
          <Card
            onClick={() => setExportFormat('csv')}
            sx={{
              flex: 1,
              p: 2,
              cursor: 'pointer',
              border: '2px solid',
              borderColor: exportFormat === 'csv' ? '#00ED64' : 'divider',
              bgcolor: exportFormat === 'csv' ? alpha('#00ED64', 0.05) : 'transparent',
            }}
          >
            <Storage sx={{ color: exportFormat === 'csv' ? '#00ED64' : 'text.secondary', mb: 1 }} />
            <Typography variant="subtitle2">CSV</Typography>
            <Typography variant="caption" color="text.secondary">
              Best for spreadsheets & analysis
            </Typography>
          </Card>
        </Box>

        <Alert severity="info">
          This will export all submissions from all your forms.
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleExport}
          disabled={exporting}
          startIcon={exporting ? <CircularProgress size={16} /> : <Download />}
          sx={{ bgcolor: '#00ED64', color: '#001E2B', '&:hover': { bgcolor: '#00c853' } }}
        >
          {exporting ? 'Exporting...' : 'Export'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// Transfer Ownership Dialog Component
function TransferOwnershipDialog({
  open,
  onClose,
  organizationId,
  cluster
}: {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  cluster?: any;
}) {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      label: 'Create Your Atlas Account',
      description: 'Sign up for a free MongoDB Atlas account if you don\'t have one.',
      action: (
        <Button
          variant="outlined"
          href="https://www.mongodb.com/cloud/atlas/register"
          target="_blank"
          startIcon={<ArrowForward />}
        >
          Go to MongoDB Atlas
        </Button>
      ),
    },
    {
      label: 'Create a New Cluster',
      description: 'Create an M0 (free) or larger cluster in your Atlas account.',
      tips: [
        'Choose the same region as your current cluster for faster transfer',
        'M0 is free, but you can choose M10+ for more features',
      ],
    },
    {
      label: 'Export Your Data',
      description: 'Download your form data from this platform.',
      action: (
        <Button
          variant="outlined"
          startIcon={<Download />}
          onClick={() => {/* trigger export */}}
        >
          Export Data as JSON
        </Button>
      ),
    },
    {
      label: 'Import to Your Cluster',
      description: 'Use MongoDB Compass or mongoimport to load your data.',
      tips: [
        'Install MongoDB Compass for a visual import experience',
        'Or use: mongoimport --uri "your-connection-string" --file export.json',
      ],
    },
    {
      label: 'Update Your Connection',
      description: 'Add your new cluster\'s connection string to this platform.',
      tips: [
        'Go to Settings > Connections > Add Connection',
        'Paste your new cluster\'s connection string',
        'Update your forms to use the new connection',
      ],
    },
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ArrowForward sx={{ color: '#00ED64' }} />
          Transfer Data Ownership
        </Box>
      </DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            Follow these steps to migrate your data to your own MongoDB Atlas account.
            This gives you full control over your database.
          </Typography>
        </Alert>

        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((step, index) => (
            <Step key={step.label}>
              <StepLabel
                onClick={() => setActiveStep(index)}
                sx={{ cursor: 'pointer' }}
              >
                {step.label}
              </StepLabel>
              <StepContent>
                <Typography variant="body2" color="text.secondary" paragraph>
                  {step.description}
                </Typography>

                {step.tips && (
                  <Box sx={{ mb: 2 }}>
                    {step.tips.map((tip, i) => (
                      <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 0.5 }}>
                        <Lightbulb sx={{ fontSize: 16, color: '#FFC107', mt: 0.3 }} />
                        <Typography variant="caption" color="text.secondary">
                          {tip}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}

                {step.action}

                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="contained"
                    onClick={() => setActiveStep(index + 1)}
                    disabled={index === steps.length - 1}
                    sx={{ mr: 1, bgcolor: '#00ED64', color: '#001E2B' }}
                  >
                    {index === steps.length - 1 ? 'Done' : 'Continue'}
                  </Button>
                  <Button
                    disabled={index === 0}
                    onClick={() => setActiveStep(index - 1)}
                  >
                    Back
                  </Button>
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>

        {activeStep === steps.length && (
          <Alert severity="success" sx={{ mt: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Congratulations!
            </Typography>
            <Typography variant="body2">
              Your data is now in your own MongoDB Atlas cluster. You have full control
              over your database, backups, and access.
            </Typography>
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

// Delete Cluster Confirmation Dialog Component
function DeleteClusterDialog({
  open,
  onClose,
  onConfirm,
  deleting,
  error,
  cluster
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  deleting: boolean;
  error: string | null;
  cluster?: any;
}) {
  const [confirmText, setConfirmText] = useState('');
  const confirmPhrase = 'DELETE';
  const canDelete = confirmText === confirmPhrase;

  const handleClose = () => {
    setConfirmText('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Delete sx={{ color: '#f44336' }} />
        Delete Cluster
      </DialogTitle>
      <DialogContent>
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            This action cannot be undone!
          </Typography>
          <Typography variant="body2">
            Deleting this cluster will permanently remove:
          </Typography>
          <List dense sx={{ py: 0, pl: 2 }}>
            <ListItem sx={{ py: 0.25, px: 0 }}>
              <ListItemText primary="• Your MongoDB Atlas M0 cluster" />
            </ListItem>
            <ListItem sx={{ py: 0.25, px: 0 }}>
              <ListItemText primary="• All stored form submissions and data" />
            </ListItem>
            <ListItem sx={{ py: 0.25, px: 0 }}>
              <ListItemText primary="• Database credentials and connection strings" />
            </ListItem>
            <ListItem sx={{ py: 0.25, px: 0 }}>
              <ListItemText primary="• Any pending Atlas console invitations" />
            </ListItem>
          </List>
        </Alert>

        {cluster && (
          <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'action.hover' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Cluster to be deleted:
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Provider: <strong>{cluster.provider}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Region: <strong>{cluster.region?.replace(/_/g, ' ')}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Tier: <strong>{cluster.instanceSize}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Storage: <strong>{cluster.storageLimitMb} MB</strong>
              </Typography>
            </Box>
          </Paper>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          To confirm deletion, type <strong>{confirmPhrase}</strong> below:
        </Typography>

        <TextField
          fullWidth
          size="small"
          placeholder={`Type "${confirmPhrase}" to confirm`}
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
          error={!!error}
          helperText={error}
          disabled={deleting}
          sx={{
            '& .MuiOutlinedInput-root': {
              '&.Mui-focused fieldset': {
                borderColor: canDelete ? '#f44336' : undefined,
              },
            },
          }}
        />

        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>Tip:</strong> Export your data before deleting if you want to keep a backup.
            You can provision a new cluster after deletion.
          </Typography>
        </Alert>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={deleting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={onConfirm}
          disabled={!canDelete || deleting}
          startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : <Delete />}
        >
          {deleting ? 'Deleting...' : 'Delete Cluster'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
