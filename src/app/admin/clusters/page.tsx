/**
 * Admin Cluster Management Console
 *
 * Platform admins can view and manage all provisioned M0 clusters.
 * Includes activity tracking, inactivity detection, and deactivation controls.
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tabs,
  Tab,
  Card,
  CardContent,
  Divider,
  Stack,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Grid,
  TablePagination,
  Breadcrumbs,
  Link as MuiLink,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  alpha,
} from '@mui/material';
import Link from 'next/link';
import {
  Storage as StorageIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Pause as PauseIcon,
  PlayArrow as PlayIcon,
  Delete as DeleteIcon,
  NavigateNext as NavigateNextIcon,
  Business as BusinessIcon,
  Schedule as ScheduleIcon,
  CloudOff as CloudOffIcon,
  ArrowBack as ArrowBackIcon,
  Replay as RetryIcon,
  CleaningServices as CleanupIcon,
  Info as InfoIcon,
  Cancel as CancelIcon,
  Link as LinkIcon,
  ContentCopy as ContentCopyIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { AppNavBar } from '@/components/Navigation/AppNavBar';
import { useAuth } from '@/contexts/AuthContext';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr';

interface ClusterStats {
  total: number;
  ready: number;
  failed: number;
  deleted: number;
  provisioning: number;
  inactive30Days: number;
}

interface ClusterEntry {
  clusterId: string;
  organizationId: string;
  projectId: string;
  atlasProjectId: string;
  atlasProjectName: string;
  atlasClusterName: string;
  provider: string;
  region: string;
  instanceSize: string;
  status: string;
  statusMessage?: string;
  vaultId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  provisioningCompletedAt?: string;
  deletedAt?: string;

  // Enriched metrics
  organizationName?: string;
  ownerName?: string;
  ownerEmail?: string;
  vaultUsageCount?: number;
  vaultLastUsedAt?: string | null;
  daysSinceLastActivity?: number;
  isInactive?: boolean;
}

type FilterTab = 'all' | 'ready' | 'inactive' | 'provisioning' | 'failed' | 'deleted';

export default function AdminClustersPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Filters
  const [tab, setTab] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Dialogs
  const [selectedCluster, setSelectedCluster] = useState<ClusterEntry | null>(null);
  const [actionDialog, setActionDialog] = useState<'deactivate' | 'delete' | 'retry' | 'cleanup' | 'details' | 'purge' | 'purgeAll' | 'cancel' | 'connectionString' | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Connection string state
  const [connectionString, setConnectionString] = useState<string | null>(null);
  const [connectionStringLoading, setConnectionStringLoading] = useState(false);
  const [connectionStringError, setConnectionStringError] = useState<string | null>(null);
  const [showConnectionString, setShowConnectionString] = useState(false);

  // Check admin access
  const isAdmin = user?.platformRole === 'admin';

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Build query params
  const buildQueryParams = () => {
    const params = new URLSearchParams();
    params.set('limit', rowsPerPage.toString());
    params.set('offset', (page * rowsPerPage).toString());

    if (tab === 'ready') params.set('status', 'ready');
    if (tab === 'inactive') {
      params.set('status', 'ready');
      params.set('inactiveOnly', 'true');
    }
    if (tab === 'provisioning') params.set('status', 'provisioning');
    if (tab === 'failed') params.set('status', 'failed');
    if (tab === 'deleted') params.set('status', 'deleted');
    if (debouncedSearch) params.set('search', debouncedSearch);

    return params.toString();
  };

  // Fetch clusters
  const { data, error, isLoading, mutate } = useSWR<{
    clusters: ClusterEntry[];
    total: number;
    stats: ClusterStats;
  }>(isAdmin ? `/api/admin/clusters?${buildQueryParams()}` : null, fetcher, {
    refreshInterval: 30000, // Refresh every 30 seconds
  });

  // Redirect non-admins
  useEffect(() => {
    if (!authLoading && user && !isAdmin) {
      router.push('/');
    }
  }, [authLoading, user, isAdmin, router]);

  if (authLoading || !isAdmin) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <AppNavBar />
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  const handleTabChange = (_: React.SyntheticEvent, newValue: FilterTab) => {
    setTab(newValue);
    setPage(0);
  };

  const handleDeactivate = async () => {
    if (!selectedCluster) return;

    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/clusters/${selectedCluster.clusterId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deactivate' }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to deactivate cluster');
      }

      mutate();
      setActionDialog(null);
      setSelectedCluster(null);
    } catch (err) {
      console.error('Deactivate error:', err);
      alert(err instanceof Error ? err.message : 'Failed to deactivate cluster');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCluster) return;

    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/clusters/${selectedCluster.clusterId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete cluster');
      }

      mutate();
      setActionDialog(null);
      setSelectedCluster(null);
    } catch (err) {
      console.error('Delete error:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete cluster');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetry = async () => {
    if (!selectedCluster) return;

    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/clusters/${selectedCluster.clusterId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'retry' }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to retry provisioning');
      }

      mutate();
      setActionDialog(null);
      setSelectedCluster(null);
    } catch (err) {
      console.error('Retry error:', err);
      alert(err instanceof Error ? err.message : 'Failed to retry provisioning');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCleanup = async () => {
    if (!selectedCluster) return;

    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/clusters/${selectedCluster.clusterId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cleanup' }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cleanup cluster');
      }

      mutate();
      setActionDialog(null);
      setSelectedCluster(null);
    } catch (err) {
      console.error('Cleanup error:', err);
      alert(err instanceof Error ? err.message : 'Failed to cleanup cluster');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePurge = async () => {
    if (!selectedCluster) return;

    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/clusters/${selectedCluster.clusterId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'purge' }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to purge record');
      }

      mutate();
      setActionDialog(null);
      setSelectedCluster(null);
    } catch (err) {
      console.error('Purge error:', err);
      alert(err instanceof Error ? err.message : 'Failed to purge record');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePurgeAll = async () => {
    setActionLoading(true);
    try {
      const response = await fetch('/api/admin/clusters/purge-deleted', {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to purge deleted records');
      }

      const result = await response.json();
      mutate();
      setActionDialog(null);
      alert(`Successfully purged ${result.deletedCount} records`);
    } catch (err) {
      console.error('Purge all error:', err);
      alert(err instanceof Error ? err.message : 'Failed to purge deleted records');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!selectedCluster) return;

    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/clusters/${selectedCluster.clusterId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cancel provisioning');
      }

      mutate();
      setActionDialog(null);
      setSelectedCluster(null);
    } catch (err) {
      console.error('Cancel error:', err);
      alert(err instanceof Error ? err.message : 'Failed to cancel provisioning');
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewConnectionString = async (cluster: ClusterEntry) => {
    setSelectedCluster(cluster);
    setActionDialog('connectionString');
    setConnectionString(null);
    setConnectionStringError(null);
    setShowConnectionString(false);
    setConnectionStringLoading(true);

    try {
      const response = await fetch(`/api/admin/clusters/${cluster.clusterId}/connection-string`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch connection string');
      }

      const data = await response.json();
      setConnectionString(data.connectionString);
    } catch (err) {
      console.error('Connection string error:', err);
      setConnectionStringError(err instanceof Error ? err.message : 'Failed to fetch connection string');
    } finally {
      setConnectionStringLoading(false);
    }
  };

  const handleCopyConnectionString = async () => {
    if (!connectionString) return;

    try {
      await navigator.clipboard.writeText(connectionString);
      // You could add a toast notification here if you have one
    } catch (err) {
      console.error('Copy error:', err);
      alert('Failed to copy to clipboard');
    }
  };

  const isProvisioningStatus = (status: string) => {
    return ['pending', 'creating_project', 'creating_cluster', 'creating_user', 'configuring_network'].includes(status);
  };

  const getStatusChip = (status: string, isInactive?: boolean) => {
    if (isInactive) {
      return (
        <Chip
          icon={<WarningIcon />}
          label="Inactive 30+ days"
          size="small"
          color="warning"
        />
      );
    }

    switch (status) {
      case 'ready':
        return <Chip icon={<CheckCircleIcon />} label="Ready" size="small" color="success" />;
      case 'failed':
        return <Chip icon={<ErrorIcon />} label="Failed" size="small" color="error" />;
      case 'deleted':
        return <Chip icon={<CloudOffIcon />} label="Deleted" size="small" color="default" />;
      case 'pending':
      case 'creating_project':
      case 'creating_cluster':
      case 'creating_user':
      case 'configuring_network':
        return <Chip icon={<CircularProgress size={14} />} label="Provisioning" size="small" color="info" />;
      default:
        return <Chip label={status} size="small" />;
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const stats = data?.stats;
  const clusters = data?.clusters || [];
  const total = data?.total || 0;

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <AppNavBar />

      <Container maxWidth="xl" sx={{ py: 4, flex: 1 }}>
        {/* Breadcrumbs */}
        <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 3 }}>
          <MuiLink
            component={Link}
            href="/admin"
            underline="hover"
            color="inherit"
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
          >
            <ArrowBackIcon fontSize="small" />
            Admin Dashboard
          </MuiLink>
          <Typography color="text.primary">Cluster Management</Typography>
        </Breadcrumbs>

        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
              Cluster Management
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Monitor and manage all M0 clusters provisioned by NetPad
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => mutate()}
            disabled={isLoading}
          >
            Refresh
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            Failed to load clusters: {error.message}
          </Alert>
        )}

        {/* Stats Cards */}
        {stats && (
          <Grid container spacing={2} sx={{ mb: 4 }}>
            <Grid item xs={6} sm={4} md={2}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                    {stats.total}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Clusters
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                    {stats.ready}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.main' }}>
                    {stats.inactive30Days}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Inactive 30+ Days
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'info.main' }}>
                    {stats.provisioning}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Provisioning
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'error.main' }}>
                    {stats.failed}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Failed
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.disabled' }}>
                    {stats.deleted}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Deleted
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Filters */}
        <Paper sx={{ mb: 3 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tab} onChange={handleTabChange}>
              <Tab label={`All (${stats?.total || 0})`} value="all" />
              <Tab label={`Active (${stats?.ready || 0})`} value="ready" />
              <Tab
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    Inactive 30+ Days
                    {(stats?.inactive30Days || 0) > 0 && (
                      <Chip label={stats?.inactive30Days} size="small" color="warning" />
                    )}
                  </Box>
                }
                value="inactive"
              />
              <Tab
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    Provisioning
                    {(stats?.provisioning || 0) > 0 && (
                      <Chip label={stats?.provisioning} size="small" color="info" />
                    )}
                  </Box>
                }
                value="provisioning"
              />
              <Tab label={`Failed (${stats?.failed || 0})`} value="failed" />
              <Tab label={`Deleted (${stats?.deleted || 0})`} value="deleted" />
            </Tabs>
          </Box>

          <Box sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              placeholder="Search by org ID, cluster name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              size="small"
              sx={{ minWidth: 300 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            {tab === 'deleted' && (stats?.deleted || 0) > 0 && (
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<DeleteIcon />}
                onClick={() => setActionDialog('purgeAll')}
              >
                Purge All Deleted ({stats?.deleted})
              </Button>
            )}
          </Box>
        </Paper>

        {/* Clusters Table */}
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Cluster</TableCell>
                  <TableCell>Organization / Admin</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Activity</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : clusters.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">No clusters found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  clusters.map((cluster) => (
                    <TableRow
                      key={cluster.clusterId}
                      sx={{
                        bgcolor: cluster.isInactive ? alpha('#ff9800', 0.05) : undefined,
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                    >
                      <TableCell>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {cluster.atlasClusterName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {cluster.provider} / {cluster.region}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                          <BusinessIcon fontSize="small" color="action" sx={{ mt: 0.5 }} />
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {cluster.organizationName || cluster.organizationId.slice(0, 12) + '...'}
                            </Typography>
                            {(cluster.ownerName || cluster.ownerEmail) && (
                              <Box sx={{ mt: 0.5 }}>
                                {cluster.ownerName && (
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                    {cluster.ownerName}
                                  </Typography>
                                )}
                                {cluster.ownerEmail && (
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', opacity: 0.8 }}>
                                    {cluster.ownerEmail}
                                  </Typography>
                                )}
                              </Box>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {getStatusChip(cluster.status, cluster.isInactive)}
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <ScheduleIcon fontSize="small" color="action" />
                            <Typography variant="body2">
                              {cluster.daysSinceLastActivity !== undefined
                                ? `${cluster.daysSinceLastActivity} days ago`
                                : 'Unknown'}
                            </Typography>
                          </Box>
                          {cluster.vaultUsageCount !== undefined && (
                            <Typography variant="caption" color="text.secondary">
                              {cluster.vaultUsageCount} DB connections
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(cluster.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {cluster.status === 'ready' && (
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            {cluster.vaultId && (
                              <Tooltip title="View connection string">
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => handleViewConnectionString(cluster)}
                                >
                                  <LinkIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title="Deactivate cluster (revoke access)">
                              <IconButton
                                size="small"
                                color="warning"
                                onClick={() => {
                                  setSelectedCluster(cluster);
                                  setActionDialog('deactivate');
                                }}
                              >
                                <PauseIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete cluster permanently">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => {
                                  setSelectedCluster(cluster);
                                  setActionDialog('delete');
                                }}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        )}
                        {cluster.status === 'failed' && (
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Tooltip title="View failure details">
                              <IconButton
                                size="small"
                                color="info"
                                onClick={() => {
                                  setSelectedCluster(cluster);
                                  setActionDialog('details');
                                }}
                              >
                                <InfoIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Retry provisioning">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => {
                                  setSelectedCluster(cluster);
                                  setActionDialog('retry');
                                }}
                              >
                                <RetryIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Cleanup and remove">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => {
                                  setSelectedCluster(cluster);
                                  setActionDialog('cleanup');
                                }}
                              >
                                <CleanupIcon />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        )}
                        {cluster.status === 'deleted' && (
                          <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
                            <Typography variant="caption" color="text.disabled">
                              {formatDate(cluster.deletedAt)}
                            </Typography>
                            <Tooltip title="Remove record from database">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => {
                                  setSelectedCluster(cluster);
                                  setActionDialog('purge');
                                }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        )}
                        {isProvisioningStatus(cluster.status) && (
                          <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
                            <Typography variant="caption" color="text.secondary">
                              {cluster.daysSinceLastActivity !== undefined && cluster.daysSinceLastActivity > 0
                                ? `${cluster.daysSinceLastActivity}d`
                                : 'In progress'}
                            </Typography>
                            <Tooltip title="Cancel stuck provisioning">
                              <IconButton
                                size="small"
                                color="warning"
                                onClick={() => {
                                  setSelectedCluster(cluster);
                                  setActionDialog('cancel');
                                }}
                              >
                                <CancelIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 25, 50, 100]}
          />
        </Paper>
      </Container>

      {/* Deactivate Dialog */}
      <Dialog open={actionDialog === 'deactivate'} onClose={() => setActionDialog(null)}>
        <DialogTitle>Deactivate Cluster</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Are you sure you want to deactivate this cluster?
          </Typography>
          {selectedCluster && (
            <Box sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 1 }}>
              <Typography variant="body2">
                <strong>Cluster:</strong> {selectedCluster.atlasClusterName}
              </Typography>
              <Typography variant="body2">
                <strong>Organization:</strong> {selectedCluster.organizationName || selectedCluster.organizationId}
              </Typography>
              <Typography variant="body2">
                <strong>Last Activity:</strong> {selectedCluster.daysSinceLastActivity} days ago
              </Typography>
            </Box>
          )}
          <Alert severity="warning" sx={{ mt: 2 }}>
            This will revoke access to the database connection. The Atlas cluster will remain but users won't be able to use it.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialog(null)} disabled={actionLoading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleDeactivate}
            disabled={actionLoading}
            startIcon={actionLoading ? <CircularProgress size={16} /> : <PauseIcon />}
          >
            Deactivate
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={actionDialog === 'delete'} onClose={() => setActionDialog(null)}>
        <DialogTitle>Delete Cluster Permanently</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Are you sure you want to permanently delete this cluster and all associated resources?
          </Typography>
          {selectedCluster && (
            <Box sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 1 }}>
              <Typography variant="body2">
                <strong>Cluster:</strong> {selectedCluster.atlasClusterName}
              </Typography>
              <Typography variant="body2">
                <strong>Organization:</strong> {selectedCluster.organizationName || selectedCluster.organizationId}
              </Typography>
            </Box>
          )}
          <Alert severity="error" sx={{ mt: 2 }}>
            <strong>This action cannot be undone!</strong> The Atlas cluster, project, database user, and connection vault will be permanently deleted.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialog(null)} disabled={actionLoading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={actionLoading}
            startIcon={actionLoading ? <CircularProgress size={16} /> : <DeleteIcon />}
          >
            Delete Permanently
          </Button>
        </DialogActions>
      </Dialog>

      {/* Failure Details Dialog */}
      <Dialog open={actionDialog === 'details'} onClose={() => setActionDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ErrorIcon color="error" />
          Cluster Failure Details
        </DialogTitle>
        <DialogContent>
          {selectedCluster && (
            <>
              <Box sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 1, mb: 2 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Cluster:</strong> {selectedCluster.atlasClusterName || 'Not created'}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Organization:</strong> {selectedCluster.organizationName || selectedCluster.organizationId}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Atlas Project ID:</strong> {selectedCluster.atlasProjectId || 'Not created'}
                </Typography>
                <Typography variant="body2">
                  <strong>Created:</strong> {formatDate(selectedCluster.createdAt)}
                </Typography>
              </Box>

              <Alert severity="error" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Error Message:
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                  {selectedCluster.statusMessage || 'No error message recorded'}
                </Typography>
              </Alert>

              <Typography variant="body2" color="text.secondary">
                <strong>Common causes:</strong>
              </Typography>
              <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
                <li><Typography variant="body2" color="text.secondary">Atlas API rate limits or quota exceeded</Typography></li>
                <li><Typography variant="body2" color="text.secondary">Network timeout during cluster creation</Typography></li>
                <li><Typography variant="body2" color="text.secondary">Invalid Atlas API credentials</Typography></li>
                <li><Typography variant="body2" color="text.secondary">M0 cluster limit reached for Atlas organization</Typography></li>
              </ul>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialog(null)}>
            Close
          </Button>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => setActionDialog('retry')}
            startIcon={<RetryIcon />}
          >
            Retry Provisioning
          </Button>
        </DialogActions>
      </Dialog>

      {/* Retry Dialog */}
      <Dialog open={actionDialog === 'retry'} onClose={() => setActionDialog(null)}>
        <DialogTitle>Retry Cluster Provisioning</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            This will attempt to provision a new cluster for this organization. The failed record will be marked as superseded.
          </Typography>
          {selectedCluster && (
            <Box sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 1 }}>
              <Typography variant="body2">
                <strong>Organization:</strong> {selectedCluster.organizationName || selectedCluster.organizationId}
              </Typography>
              <Typography variant="body2">
                <strong>Original Error:</strong> {selectedCluster.statusMessage?.slice(0, 100) || 'Unknown'}...
              </Typography>
            </Box>
          )}
          <Alert severity="info" sx={{ mt: 2 }}>
            The provisioning will run in the background. Refresh the cluster list to see the new provisioning status.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialog(null)} disabled={actionLoading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleRetry}
            disabled={actionLoading}
            startIcon={actionLoading ? <CircularProgress size={16} /> : <RetryIcon />}
          >
            Retry Provisioning
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cleanup Dialog */}
      <Dialog open={actionDialog === 'cleanup'} onClose={() => setActionDialog(null)}>
        <DialogTitle>Cleanup Failed Cluster</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            This will attempt to clean up any partial Atlas resources (project, cluster) created before the failure, and mark this record as deleted.
          </Typography>
          {selectedCluster && (
            <Box sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 1 }}>
              <Typography variant="body2">
                <strong>Cluster:</strong> {selectedCluster.atlasClusterName || 'Not created'}
              </Typography>
              <Typography variant="body2">
                <strong>Atlas Project:</strong> {selectedCluster.atlasProjectId || 'Not created'}
              </Typography>
              <Typography variant="body2">
                <strong>Organization:</strong> {selectedCluster.organizationName || selectedCluster.organizationId}
              </Typography>
            </Box>
          )}
          <Alert severity="warning" sx={{ mt: 2 }}>
            This will remove the failed cluster record. If you want to try again, use "Retry Provisioning" instead.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialog(null)} disabled={actionLoading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleCleanup}
            disabled={actionLoading}
            startIcon={actionLoading ? <CircularProgress size={16} /> : <CleanupIcon />}
          >
            Cleanup & Remove
          </Button>
        </DialogActions>
      </Dialog>

      {/* Purge Record Dialog */}
      <Dialog open={actionDialog === 'purge'} onClose={() => setActionDialog(null)}>
        <DialogTitle>Remove Cluster Record</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            This will permanently remove this cluster record from the database. Use this to clean up old or duplicate entries.
          </Typography>
          {selectedCluster && (
            <Box sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 1 }}>
              <Typography variant="body2">
                <strong>Cluster:</strong> {selectedCluster.atlasClusterName || 'N/A'}
              </Typography>
              <Typography variant="body2">
                <strong>Organization:</strong> {selectedCluster.organizationName || selectedCluster.organizationId}
              </Typography>
              <Typography variant="body2">
                <strong>Status:</strong> {selectedCluster.status}
              </Typography>
              <Typography variant="body2">
                <strong>Deleted At:</strong> {formatDate(selectedCluster.deletedAt)}
              </Typography>
              {selectedCluster.statusMessage && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  <strong>Message:</strong> {selectedCluster.statusMessage.slice(0, 100)}...
                </Typography>
              )}
            </Box>
          )}
          <Alert severity="info" sx={{ mt: 2 }}>
            This only removes the database record. Any Atlas resources were already cleaned up when the cluster was deleted/deactivated.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialog(null)} disabled={actionLoading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handlePurge}
            disabled={actionLoading}
            startIcon={actionLoading ? <CircularProgress size={16} /> : <DeleteIcon />}
          >
            Remove Record
          </Button>
        </DialogActions>
      </Dialog>

      {/* Purge All Deleted Dialog */}
      <Dialog open={actionDialog === 'purgeAll'} onClose={() => setActionDialog(null)}>
        <DialogTitle>Purge All Deleted Records</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            This will permanently remove <strong>{stats?.deleted || 0}</strong> deleted cluster records from the database.
          </Typography>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This action cannot be undone. Make sure you want to remove all deleted/deactivated cluster records.
          </Alert>
          <Alert severity="info">
            This only removes database records. Atlas resources were already cleaned up when clusters were deleted/deactivated.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialog(null)} disabled={actionLoading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handlePurgeAll}
            disabled={actionLoading}
            startIcon={actionLoading ? <CircularProgress size={16} /> : <DeleteIcon />}
          >
            Purge All ({stats?.deleted || 0}) Records
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cancel Provisioning Dialog */}
      <Dialog open={actionDialog === 'cancel'} onClose={() => setActionDialog(null)}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CancelIcon color="warning" />
          Cancel Stuck Provisioning
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            This cluster appears to be stuck in provisioning for an extended period. Cancelling will mark it as failed, allowing you to retry or cleanup.
          </Typography>
          {selectedCluster && (
            <Box sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 1 }}>
              <Typography variant="body2">
                <strong>Cluster:</strong> {selectedCluster.atlasClusterName || 'Not created yet'}
              </Typography>
              <Typography variant="body2">
                <strong>Organization:</strong> {selectedCluster.organizationName || selectedCluster.organizationId}
              </Typography>
              <Typography variant="body2">
                <strong>Current Status:</strong> {selectedCluster.status}
              </Typography>
              <Typography variant="body2">
                <strong>Started:</strong> {formatDate(selectedCluster.createdAt)}
                {selectedCluster.daysSinceLastActivity !== undefined && selectedCluster.daysSinceLastActivity > 0 && (
                  <span> ({selectedCluster.daysSinceLastActivity} days ago)</span>
                )}
              </Typography>
            </Box>
          )}
          <Alert severity="warning" sx={{ mt: 2 }}>
            After cancelling, you can use "Retry" to attempt provisioning again, or "Cleanup" to remove any partial Atlas resources.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialog(null)} disabled={actionLoading}>
            Keep Waiting
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleCancel}
            disabled={actionLoading}
            startIcon={actionLoading ? <CircularProgress size={16} /> : <CancelIcon />}
          >
            Cancel Provisioning
          </Button>
        </DialogActions>
      </Dialog>

      {/* Connection String Dialog */}
      <Dialog 
        open={actionDialog === 'connectionString'} 
        onClose={() => {
          setActionDialog(null);
          setConnectionString(null);
          setConnectionStringError(null);
          setShowConnectionString(false);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LinkIcon color="primary" />
          Connection String
        </DialogTitle>
        <DialogContent>
          {selectedCluster && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Cluster:</strong> {selectedCluster.atlasClusterName}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Organization:</strong> {selectedCluster.organizationName || selectedCluster.organizationId}
              </Typography>
            </Box>
          )}

          {connectionStringLoading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : connectionStringError ? (
            <Alert severity="error">
              {connectionStringError}
            </Alert>
          ) : connectionString ? (
            <Box>
              <Alert severity="warning" sx={{ mb: 2 }}>
                <strong>Security Warning:</strong> This connection string contains credentials. Keep it secure and never share it publicly.
              </Alert>
              
              <Box sx={{ position: 'relative' }}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  value={showConnectionString ? connectionString : '••••••••••••••••••••••••••••••••'}
                  InputProps={{
                    readOnly: true,
                    sx: {
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                    },
                  }}
                  sx={{ mb: 2 }}
                />
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                  <Button
                    variant="outlined"
                    startIcon={showConnectionString ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    onClick={() => setShowConnectionString(!showConnectionString)}
                  >
                    {showConnectionString ? 'Hide' : 'Show'}
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<ContentCopyIcon />}
                    onClick={handleCopyConnectionString}
                    disabled={!showConnectionString}
                  >
                    Copy
                  </Button>
                </Box>
              </Box>
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setActionDialog(null);
            setConnectionString(null);
            setConnectionStringError(null);
            setShowConnectionString(false);
          }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
