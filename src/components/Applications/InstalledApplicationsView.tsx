/**
 * Installed Applications View Component
 *
 * Shows marketplace applications that have been installed in this organization/project.
 * Displays update availability and allows upgrading.
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  alpha,
  Stack,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
} from '@mui/material';
import {
  Upgrade as UpgradeIcon,
  CheckCircle as CheckCircleIcon,
  Update as UpdateIcon,
  MoreVert as MoreVertIcon,
  Visibility as VisibilityIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useOrganization } from '@/contexts/OrganizationContext';
import { ApplicationUpgradeDialog } from './ApplicationUpgradeDialog';
import { ApplicationDetailDialog } from '@/components/Marketplace/ApplicationDetailDialog';

interface InstalledApplication {
  installationId: string;
  organizationId: string;
  projectId: string;
  marketplaceApplicationId: string;
  marketplaceApplicationName: string;
  installedVersion: string;
  latestAvailableVersion?: string;
  installedAt: string;
  lastCheckedAt?: string;
  lastUpdatedAt?: string;
  installedForms: Array<{
    formId: string;
    originalFormId?: string;
    originalSlug?: string;
    name: string;
  }>;
  installedWorkflows: Array<{
    workflowId: string;
    originalWorkflowId?: string;
    originalSlug?: string;
    name: string;
  }>;
  status: 'installed' | 'update-available' | 'updating' | 'error';
  updateAvailable?: {
    version: string;
    changelog?: string;
    publishedAt: string;
  };
  hasUpdate?: boolean;
  updateInfo?: {
    version: string;
    changelog?: string;
    publishedAt: string;
  };
}

interface InstalledApplicationsViewProps {
  organizationId: string;
  projectId: string;
}

export function InstalledApplicationsView({
  organizationId,
  projectId,
}: InstalledApplicationsViewProps) {
  const [installations, setInstallations] = useState<InstalledApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [installationToUpgrade, setInstallationToUpgrade] = useState<InstalledApplication | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement; installation: InstalledApplication } | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailAppId, setDetailAppId] = useState<string | null>(null);
  const [checkingUpdates, setCheckingUpdates] = useState<string | null>(null);

  useEffect(() => {
    loadInstallations();
  }, [organizationId, projectId]);

  const loadInstallations = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/applications/installed?orgId=${organizationId}&projectId=${projectId}`
      );

      if (!response.ok) {
        throw new Error('Failed to load installed applications');
      }

      const data = await response.json();
      setInstallations(data.installations || []);
    } catch (err) {
      console.error('Error loading installed applications:', err);
      setError(err instanceof Error ? err.message : 'Failed to load installed applications');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckUpdates = async (installation: InstalledApplication) => {
    setCheckingUpdates(installation.installationId);
    try {
      const response = await fetch(
        `/api/applications/installed/${installation.installationId}/updates?orgId=${organizationId}`
      );

      if (!response.ok) {
        throw new Error('Failed to check for updates');
      }

      await loadInstallations(); // Reload to get updated status
    } catch (err) {
      console.error('Error checking for updates:', err);
      setError(err instanceof Error ? err.message : 'Failed to check for updates');
    } finally {
      setCheckingUpdates(null);
    }
  };

  const handleUpgrade = (installation: InstalledApplication) => {
    setInstallationToUpgrade(installation);
    setUpgradeDialogOpen(true);
    setMenuAnchor(null);
  };

  const handleViewDetails = (installation: InstalledApplication) => {
    setDetailAppId(installation.marketplaceApplicationId);
    setDetailDialogOpen(true);
    setMenuAnchor(null);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Installed Applications
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Marketplace applications installed in this project
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadInstallations}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {installations.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            bgcolor: alpha('#00ED64', 0.05),
            borderRadius: 2,
            border: '2px dashed',
            borderColor: alpha('#00ED64', 0.3),
          }}
        >
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No installed applications
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Install applications from the Marketplace to see them here
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {installations.map((installation) => (
            <Grid item xs={12} sm={6} md={4} key={installation.installationId}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                }}
              >
                <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
                  <IconButton
                    size="small"
                    onClick={(e) => setMenuAnchor({ el: e.currentTarget, installation })}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </Box>

                <CardContent sx={{ flexGrow: 1 }}>
                  <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                    {installation.hasUpdate && (
                      <Chip
                        icon={<UpdateIcon />}
                        label="Update Available"
                        size="small"
                        color="warning"
                        sx={{
                          bgcolor: alpha('#ff9800', 0.1),
                          color: '#ff9800',
                        }}
                      />
                    )}
                    {installation.status === 'installed' && !installation.hasUpdate && (
                      <Chip
                        icon={<CheckCircleIcon />}
                        label="Up to Date"
                        size="small"
                        sx={{
                          bgcolor: alpha('#00ED64', 0.1),
                          color: '#00ED64',
                        }}
                      />
                    )}
                  </Stack>

                  <Typography variant="h6" gutterBottom>
                    {installation.marketplaceApplicationName}
                  </Typography>

                  <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                    <Chip
                      label={`v${installation.installedVersion}`}
                      size="small"
                      variant="outlined"
                    />
                    {installation.latestAvailableVersion && (
                      <Chip
                        label={`Latest: v${installation.latestAvailableVersion}`}
                        size="small"
                        variant="outlined"
                        color={installation.hasUpdate ? 'warning' : 'default'}
                      />
                    )}
                  </Stack>

                  <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                    <Chip
                      label={`${installation.installedForms.length} forms`}
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      label={`${installation.installedWorkflows.length} workflows`}
                      size="small"
                      variant="outlined"
                    />
                  </Stack>

                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    Installed {formatDate(installation.installedAt)}
                    {installation.lastUpdatedAt && ` • Updated ${formatDate(installation.lastUpdatedAt)}`}
                  </Typography>
                </CardContent>

                <CardActions>
                  {installation.hasUpdate ? (
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<UpgradeIcon />}
                      onClick={() => handleUpgrade(installation)}
                      sx={{
                        bgcolor: '#ff9800',
                        '&:hover': { bgcolor: '#f57c00' },
                      }}
                    >
                      Upgrade
                    </Button>
                  ) : (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<RefreshIcon />}
                      onClick={() => handleCheckUpdates(installation)}
                      disabled={checkingUpdates === installation.installationId}
                    >
                      {checkingUpdates === installation.installationId ? 'Checking...' : 'Check Updates'}
                    </Button>
                  )}
                  <Button
                    size="small"
                    onClick={() => handleViewDetails(installation)}
                  >
                    View
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchor?.el}
        open={!!menuAnchor}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem onClick={() => menuAnchor && handleViewDetails(menuAnchor.installation)}>
          <ListItemIcon>
            <VisibilityIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View Details</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => menuAnchor && handleCheckUpdates(menuAnchor.installation)}
          disabled={checkingUpdates === menuAnchor?.installation.installationId}
        >
          <ListItemIcon>
            <RefreshIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>
            {checkingUpdates === menuAnchor?.installation.installationId ? 'Checking...' : 'Check for Updates'}
          </ListItemText>
        </MenuItem>
        {menuAnchor?.installation.hasUpdate && (
          <MenuItem onClick={() => menuAnchor && handleUpgrade(menuAnchor.installation)}>
            <ListItemIcon>
              <UpgradeIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Upgrade to Latest</ListItemText>
          </MenuItem>
        )}
      </Menu>

      {/* Upgrade Dialog */}
      {installationToUpgrade && (
        <ApplicationUpgradeDialog
          open={upgradeDialogOpen}
          onClose={() => {
            setUpgradeDialogOpen(false);
            setInstallationToUpgrade(null);
          }}
          installation={installationToUpgrade}
          organizationId={organizationId}
          projectId={projectId}
          onUpgraded={async () => {
            await loadInstallations();
            setUpgradeDialogOpen(false);
            setInstallationToUpgrade(null);
          }}
        />
      )}

      {/* Detail Dialog */}
      {detailAppId && (
        <ApplicationDetailDialog
          open={detailDialogOpen}
          onClose={() => {
            setDetailDialogOpen(false);
            setDetailAppId(null);
          }}
          applicationId={detailAppId}
          organizationId={organizationId}
        />
      )}
    </Container>
  );
}
