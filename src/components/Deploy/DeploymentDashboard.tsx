'use client';

/**
 * Deployment Dashboard Component
 *
 * Displays a list of deployments for a project with status, actions, and real-time updates.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Button,
  Menu,
  MenuItem,
  Tooltip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  alpha,
  Skeleton,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  MoreVert as MoreVertIcon,
  OpenInNew as OpenInNewIcon,
  Delete as DeleteIcon,
  Replay as ReplayIcon,
  Visibility as ViewIcon,
  Cloud as CloudIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { Deployment, DeploymentStatus, DeploymentStatusResponse } from '@/types/deployment';
import { Project } from '@/types/platform';
import { DeployProjectButton } from './DeployProjectButton';

interface DeploymentDashboardProps {
  project: Project;
  organizationId: string;
}

interface DeploymentWithStatus extends Deployment {
  liveStatus?: DeploymentStatusResponse;
}

export function DeploymentDashboard({ project, organizationId }: DeploymentDashboardProps) {
  const [deployments, setDeployments] = useState<DeploymentWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Menu state
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedDeployment, setSelectedDeployment] = useState<DeploymentWithStatus | null>(null);

  // Delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Details dialog
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  // Polling ref
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Load deployments
  const loadDeployments = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/deployments?projectId=${project.projectId}&pageSize=50`
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to load deployments');
      }

      const data = await response.json();
      setDeployments(data.deployments || []);
      setError(null);
    } catch (err) {
      console.error('Error loading deployments:', err);
      setError(err instanceof Error ? err.message : 'Failed to load deployments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [project.projectId]);

  // Poll status for active deployments
  const pollActiveDeployments = useCallback(async () => {
    const activeDeployments = deployments.filter((d) =>
      ['configuring', 'provisioning', 'deploying'].includes(d.status)
    );

    if (activeDeployments.length === 0) return;

    for (const deployment of activeDeployments) {
      try {
        const response = await fetch(`/api/deployments/${deployment.deploymentId}/status`);
        if (response.ok) {
          const status: DeploymentStatusResponse = await response.json();

          setDeployments((prev) =>
            prev.map((d) =>
              d.deploymentId === deployment.deploymentId
                ? {
                    ...d,
                    status: status.status,
                    statusMessage: status.statusMessage,
                    deployedUrl: status.deployedUrl,
                    liveStatus: status,
                  }
                : d
            )
          );
        }
      } catch (err) {
        console.error('Error polling deployment status:', err);
      }
    }
  }, [deployments]);

  // Initial load
  useEffect(() => {
    loadDeployments();
  }, [loadDeployments]);

  // Start polling when there are active deployments
  useEffect(() => {
    const hasActive = deployments.some((d) =>
      ['configuring', 'provisioning', 'deploying'].includes(d.status)
    );

    if (hasActive && !pollingRef.current) {
      pollingRef.current = setInterval(pollActiveDeployments, 5000);
    } else if (!hasActive && pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [deployments, pollActiveDeployments]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadDeployments();
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, deployment: DeploymentWithStatus) => {
    setMenuAnchor(event.currentTarget);
    setSelectedDeployment(deployment);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleViewDetails = () => {
    setDetailsDialogOpen(true);
    handleMenuClose();
  };

  const handleOpenApp = () => {
    if (selectedDeployment?.deployedUrl) {
      window.open(selectedDeployment.deployedUrl, '_blank');
    }
    handleMenuClose();
  };

  const handleRedeploy = async () => {
    if (!selectedDeployment) return;
    handleMenuClose();

    try {
      const response = await fetch(
        `/api/deployments/${selectedDeployment.deploymentId}/deploy`,
        { method: 'POST' }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to trigger redeployment');
      }

      // Reload deployments to get updated status
      await loadDeployments();
    } catch (err) {
      console.error('Redeploy error:', err);
      setError(err instanceof Error ? err.message : 'Failed to redeploy');
    }
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteConfirm = async () => {
    if (!selectedDeployment) return;

    setDeleting(true);
    try {
      const response = await fetch(
        `/api/deployments/${selectedDeployment.deploymentId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete deployment');
      }

      // Remove from list
      setDeployments((prev) =>
        prev.filter((d) => d.deploymentId !== selectedDeployment.deploymentId)
      );
      setDeleteDialogOpen(false);
    } catch (err) {
      console.error('Delete error:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete deployment');
    } finally {
      setDeleting(false);
    }
  };

  // Get status chip color
  const getStatusColor = (status: DeploymentStatus) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'failed':
        return 'error';
      case 'draft':
        return 'default';
      case 'configuring':
      case 'provisioning':
      case 'deploying':
        return 'info';
      case 'paused':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: DeploymentStatus) => {
    switch (status) {
      case 'draft':
        return 'Draft';
      case 'configuring':
        return 'Configuring';
      case 'provisioning':
        return 'Provisioning';
      case 'deploying':
        return 'Deploying';
      case 'active':
        return 'Active';
      case 'failed':
        return 'Failed';
      case 'paused':
        return 'Paused';
      default:
        return status;
    }
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="rectangular" height={60} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={300} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={600}>
            Deployments
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage deployed instances of {project.name}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={refreshing ? <CircularProgress size={16} /> : <RefreshIcon />}
            onClick={handleRefresh}
            disabled={refreshing}
          >
            Refresh
          </Button>
          <DeployProjectButton
            project={project}
            organizationId={organizationId}
            onDeploymentStart={() => {
              // Reload deployments when a new deployment starts
              setTimeout(loadDeployments, 1000);
            }}
          />
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {deployments.length === 0 ? (
        <Paper
          sx={{
            p: 6,
            textAlign: 'center',
            bgcolor: alpha('#000', 0.02),
          }}
        >
          <CloudIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No Deployments Yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Deploy your project to Vercel to make it available online.
          </Typography>
          <DeployProjectButton
            project={project}
            organizationId={organizationId}
            onDeploymentStart={() => setTimeout(loadDeployments, 1000)}
          />
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>App Name</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Environment</TableCell>
                <TableCell>URL</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Last Updated</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {deployments.map((deployment) => (
                <TableRow key={deployment.deploymentId} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {deployment.appName}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusLabel(deployment.status)}
                      color={getStatusColor(deployment.status)}
                      size="small"
                      icon={
                        ['configuring', 'provisioning', 'deploying'].includes(
                          deployment.status
                        ) ? (
                          <CircularProgress size={12} color="inherit" />
                        ) : undefined
                      }
                    />
                    {deployment.statusMessage && (
                      <Typography
                        variant="caption"
                        display="block"
                        color="text.secondary"
                        sx={{ mt: 0.5 }}
                      >
                        {deployment.statusMessage}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip label={deployment.environment} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    {deployment.deployedUrl ? (
                      <Tooltip title="Open in new tab">
                        <Button
                          size="small"
                          href={deployment.deployedUrl}
                          target="_blank"
                          startIcon={<OpenInNewIcon fontSize="small" />}
                          sx={{ textTransform: 'none' }}
                        >
                          {deployment.deployedUrl.replace('https://', '')}
                        </Button>
                      </Tooltip>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        -
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatDate(deployment.createdAt)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatDate(deployment.updatedAt)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, deployment)}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Actions Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleViewDetails}>
          <ViewIcon fontSize="small" sx={{ mr: 1 }} />
          View Details
        </MenuItem>
        {selectedDeployment?.deployedUrl && (
          <MenuItem onClick={handleOpenApp}>
            <OpenInNewIcon fontSize="small" sx={{ mr: 1 }} />
            Open Application
          </MenuItem>
        )}
        {selectedDeployment?.status === 'active' && (
          <MenuItem onClick={handleRedeploy}>
            <ReplayIcon fontSize="small" sx={{ mr: 1 }} />
            Redeploy
          </MenuItem>
        )}
        <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Deployment</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the deployment "{selectedDeployment?.appName}"?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This will remove the deployment configuration. The Vercel project may still
            exist and need to be deleted separately.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} /> : <DeleteIcon />}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Details Dialog */}
      <Dialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Deployment Details
          {selectedDeployment && (
            <Chip
              label={getStatusLabel(selectedDeployment.status)}
              color={getStatusColor(selectedDeployment.status)}
              size="small"
              sx={{ ml: 2 }}
            />
          )}
        </DialogTitle>
        <DialogContent>
          {selectedDeployment && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Application Name
                </Typography>
                <Typography variant="body1">{selectedDeployment.appName}</Typography>
              </Paper>

              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Deployment ID
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  {selectedDeployment.deploymentId}
                </Typography>
              </Paper>

              {selectedDeployment.deployedUrl && (
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Deployed URL
                  </Typography>
                  <Button
                    href={selectedDeployment.deployedUrl}
                    target="_blank"
                    startIcon={<OpenInNewIcon />}
                    sx={{ textTransform: 'none' }}
                  >
                    {selectedDeployment.deployedUrl}
                  </Button>
                </Paper>
              )}

              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Database
                </Typography>
                <Typography variant="body1">
                  {selectedDeployment.database.provisioning === 'auto'
                    ? 'Auto-provisioned MongoDB Atlas'
                    : selectedDeployment.database.provisioning === 'existing'
                    ? 'Existing Database'
                    : 'Manual Connection'}
                </Typography>
              </Paper>

              {selectedDeployment.statusMessage && (
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Status Message
                  </Typography>
                  <Typography variant="body2">{selectedDeployment.statusMessage}</Typography>
                </Paper>
              )}

              {selectedDeployment.lastError && (
                <Alert severity="error">
                  <Typography variant="subtitle2">Last Error</Typography>
                  <Typography variant="body2">{selectedDeployment.lastError}</Typography>
                </Alert>
              )}

              <Box sx={{ display: 'flex', gap: 2 }}>
                <Paper variant="outlined" sx={{ p: 2, flex: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Created
                  </Typography>
                  <Typography variant="body2">
                    {formatDate(selectedDeployment.createdAt)}
                  </Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 2, flex: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Last Updated
                  </Typography>
                  <Typography variant="body2">
                    {formatDate(selectedDeployment.updatedAt)}
                  </Typography>
                </Paper>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
          {selectedDeployment?.deployedUrl && (
            <Button
              variant="contained"
              href={selectedDeployment.deployedUrl}
              target="_blank"
              startIcon={<OpenInNewIcon />}
            >
              Open Application
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default DeploymentDashboard;
