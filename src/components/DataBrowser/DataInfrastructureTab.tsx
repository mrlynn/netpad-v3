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
  alpha,
  Container,
  Grid,
  Paper,
  Divider,
  Link as MuiLink,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  Snackbar,
  Collapse,
} from '@mui/material';
import {
  Storage,
  CheckCircle,
  CloudQueue,
  OpenInNew,
  Speed,
  DataObject,
  Security,
  ContentCopy,
  Visibility,
  VisibilityOff,
  VpnKey,
  TableChart,
  Person,
  AccountTree,
  ArrowForward,
  Info,
  BugReport,
  ExpandMore,
  ExpandLess,
  Add,
} from '@mui/icons-material';
import Link from 'next/link';
import { ClusterManagement } from '@/components/Settings/ClusterManagement';
import { AddConnectionDialog } from '@/components/Settings/AddConnectionDialog';
import { DeployToVercelButton } from '@/components/Deploy';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useClusterProvisioning } from '@/hooks/useClusterProvisioning';

interface ConnectionInfo {
  vaultId: string;
  name: string;
  database: string;
  allowedCollections: string[];
}

export function DataInfrastructureTab() {
  const { currentOrgId, organization } = useOrganization();
  const { status, loading, refetch } = useClusterProvisioning(currentOrgId || undefined);
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo | null>(null);
  const [connectionCount, setConnectionCount] = useState<number>(0);

  // Connection string visibility state
  const [showConnectionString, setShowConnectionString] = useState(false);
  const [connectionString, setConnectionString] = useState<string | null>(null);
  const [loadingConnectionString, setLoadingConnectionString] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Database initialization state
  const [initializingDb, setInitializingDb] = useState(false);

  // Admin debug panel state
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  // Add connection dialog state
  const [addConnectionDialogOpen, setAddConnectionDialogOpen] = useState(false);

  // Initialize database for clusters without vault
  const handleInitializeDatabase = async () => {
    if (!currentOrgId) return;

    setInitializingDb(true);
    try {
      const response = await fetch(`/api/organizations/${currentOrgId}/cluster/initialize`, {
        method: 'POST',
      });
      const data = await response.json();

      console.log('[Infrastructure] Initialize response:', data);

      if (response.ok && data.success) {
        setSnackbarMessage(data.alreadyInitialized
          ? 'Database already initialized!'
          : 'Database initialized successfully!');
        setSnackbarOpen(true);

        // Wait a moment for backend to settle, then refresh everything
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Refetch cluster status to get the new vaultId
        await refetch();

        // Fetch connection info directly
        const vaultResponse = await fetch(`/api/organizations/${currentOrgId}/vault`);
        const vaultData = await vaultResponse.json();
        console.log('[Infrastructure] Vault response:', vaultData);

        if (vaultResponse.ok && vaultData.connections && vaultData.connections.length > 0) {
          setConnectionCount(vaultData.connections.length);

          // Find the connection by vaultId from the initialize response
          let conn = vaultData.connections.find((c: ConnectionInfo) => c.vaultId === data.vaultId);
          console.log('[Infrastructure] Looking for vaultId:', data.vaultId, 'Found:', !!conn);

          // If not found by exact vaultId, try to find by name pattern (auto-provisioned)
          if (!conn) {
            conn = vaultData.connections.find((c: ConnectionInfo) =>
              c.name?.includes('Auto-provisioned') || c.name?.includes('Default Database')
            );
            console.log('[Infrastructure] Fallback by name, Found:', !!conn);
          }

          // If still not found, just use the first connection
          if (!conn && vaultData.connections.length > 0) {
            conn = vaultData.connections[0];
            console.log('[Infrastructure] Using first connection');
          }

          if (conn) {
            setConnectionInfo(conn);
            console.log('[Infrastructure] Set connection info:', conn.vaultId, conn.name);
          } else {
            console.log('[Infrastructure] No connection found to set');
          }
        } else {
          console.log('[Infrastructure] No connections returned from vault API');
        }
      } else {
        setSnackbarMessage(data.error || 'Failed to initialize database');
        setSnackbarOpen(true);
      }
    } catch (err: any) {
      console.error('[Infrastructure] Initialize error:', err);
      setSnackbarMessage(err.message || 'Failed to initialize database');
      setSnackbarOpen(true);
    } finally {
      setInitializingDb(false);
    }
  };

  // Fetch connection info when cluster is ready
  useEffect(() => {
    const fetchConnectionInfo = async () => {
      if (!currentOrgId) return;

      try {
        const response = await fetch(`/api/organizations/${currentOrgId}/vault`);
        const data = await response.json();

        if (response.ok && data.connections) {
          setConnectionCount(data.connections.length);

          // Try to find connection for the auto-provisioned cluster
          if (status?.vaultId) {
            // Match by vaultId from cluster status
            const conn = data.connections.find(
              (c: ConnectionInfo) => c.vaultId === status.vaultId
            );
            if (conn) {
              setConnectionInfo(conn);
              return;
            }
          }

          // Fallback: Look for auto-provisioned connection by name
          const autoProvisionedConn = data.connections.find(
            (c: ConnectionInfo) =>
              c.name?.includes('Auto-provisioned') || c.name?.includes('Default Database')
          );
          if (autoProvisionedConn) {
            setConnectionInfo(autoProvisionedConn);
            return;
          }

          // No matching connection found
          // Only clear if we have no connections at all - preserve any manually set connection
          if (data.connections.length === 0) {
            setConnectionInfo(null);
          }
        }
      } catch (err) {
        console.error('Failed to load connection info:', err);
      }
    };

    fetchConnectionInfo();
  }, [currentOrgId, status?.vaultId]);

  // Fetch connection string when user clicks "reveal"
  const handleRevealConnectionString = async () => {
    if (!connectionInfo?.vaultId || !currentOrgId) return;

    if (connectionString) {
      // Already fetched, just toggle visibility
      setShowConnectionString(!showConnectionString);
      return;
    }

    setLoadingConnectionString(true);
    try {
      const response = await fetch(`/api/organizations/${currentOrgId}/vault/${connectionInfo.vaultId}/decrypt`);
      const data = await response.json();

      if (response.ok && data.connectionString) {
        setConnectionString(data.connectionString);
        setShowConnectionString(true);
      } else {
        setSnackbarMessage(data.error || 'Failed to retrieve connection string');
        setSnackbarOpen(true);
      }
    } catch (err) {
      setSnackbarMessage('Failed to retrieve connection string');
      setSnackbarOpen(true);
    } finally {
      setLoadingConnectionString(false);
    }
  };

  const handleCopyConnectionString = async () => {
    if (!connectionString) {
      // Need to fetch first
      if (!connectionInfo?.vaultId || !currentOrgId) return;

      setLoadingConnectionString(true);
      try {
        const response = await fetch(`/api/organizations/${currentOrgId}/vault/${connectionInfo.vaultId}/decrypt`);
        const data = await response.json();

        if (response.ok && data.connectionString) {
          await navigator.clipboard.writeText(data.connectionString);
          setConnectionString(data.connectionString);
          setSnackbarMessage('Connection string copied to clipboard');
          setSnackbarOpen(true);
        } else {
          setSnackbarMessage(data.error || 'Failed to retrieve connection string');
          setSnackbarOpen(true);
        }
      } catch (err) {
        setSnackbarMessage('Failed to copy connection string');
        setSnackbarOpen(true);
      } finally {
        setLoadingConnectionString(false);
      }
    } else {
      await navigator.clipboard.writeText(connectionString);
      setSnackbarMessage('Connection string copied to clipboard');
      setSnackbarOpen(true);
    }
  };

  if (!currentOrgId) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="info">
          Please select an organization to view infrastructure details.
        </Alert>
      </Container>
    );
  }

  const isReady = status?.status === 'ready';
  const isProvisioning = status?.status && [
    'pending', 'creating_project', 'creating_cluster', 'creating_user', 'configuring_network'
  ].includes(status.status);

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3 }, px: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Box sx={{ mb: { xs: 3, sm: 4 } }}>
        <Typography 
          variant="h5" 
          sx={{ 
            fontWeight: 600,
            fontSize: { xs: '1.5rem', sm: '1.75rem' },
            wordBreak: 'break-word',
          }}
        >
          Database Infrastructure
        </Typography>
        <Typography 
          variant="body2" 
          color="text.secondary"
          sx={{ mt: 0.5, wordBreak: 'break-word' }}
        >
          View and manage your MongoDB Atlas cluster and database resources
        </Typography>
      </Box>

      {/* Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Status Card */}
        <Grid item xs={12} md={4}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              border: '1px solid',
              borderColor: isReady ? alpha('#00ED64', 0.3) : 'divider',
              bgcolor: isReady ? alpha('#00ED64', 0.02) : 'background.paper',
              height: '100%',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              {isReady ? (
                <CheckCircle sx={{ color: '#00ED64' }} />
              ) : isProvisioning ? (
                <CircularProgress size={20} sx={{ color: '#2196f3' }} />
              ) : (
                <CloudQueue sx={{ color: 'text.secondary' }} />
              )}
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Cluster Status
              </Typography>
            </Box>
            <Chip
              label={isReady ? 'Active' : isProvisioning ? 'Provisioning' : status?.status || 'Not Provisioned'}
              size="small"
              sx={{
                bgcolor: isReady
                  ? alpha('#00ED64', 0.1)
                  : isProvisioning
                  ? alpha('#2196f3', 0.1)
                  : alpha('#9e9e9e', 0.1),
                color: isReady ? '#00ED64' : isProvisioning ? '#2196f3' : 'text.secondary',
                fontWeight: 500,
                textTransform: 'capitalize',
              }}
            />
            {status?.cluster && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  {status.cluster.provider} / {status.cluster.region?.replace(/_/g, ' ')}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  Tier: {status.cluster.instanceSize}
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Database Info Card */}
        <Grid item xs={12} md={4}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              border: '1px solid',
              borderColor: 'divider',
              height: '100%',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Storage sx={{ color: '#00ED64' }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Database
              </Typography>
            </Box>
            {connectionInfo ? (
              <>
                <Typography
                  variant="body1"
                  sx={{ fontFamily: 'monospace', fontWeight: 600, mb: 1 }}
                >
                  {connectionInfo.database}
                </Typography>
                {connectionInfo.allowedCollections.length > 0 && (
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {connectionInfo.allowedCollections.slice(0, 3).map((col) => (
                      <Chip
                        key={col}
                        label={col}
                        size="small"
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                    ))}
                    {connectionInfo.allowedCollections.length > 3 && (
                      <Chip
                        label={`+${connectionInfo.allowedCollections.length - 3} more`}
                        size="small"
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                    )}
                  </Box>
                )}
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No database connected
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Connections Card */}
        <Grid item xs={12} md={4}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              border: '1px solid',
              borderColor: 'divider',
              height: '100%',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Security sx={{ color: '#2196f3' }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Connections
              </Typography>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#00ED64' }}>
              {connectionCount}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Encrypted connections in vault
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Button
                size="small"
                startIcon={<Add sx={{ fontSize: 16 }} />}
                onClick={() => setAddConnectionDialogOpen(true)}
                sx={{ color: '#00ED64' }}
              >
                Add External Connection
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Database Initialization Prompt - Show when cluster is ready but no connection info */}
      {isReady && !connectionInfo && (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            mb: 4,
            border: '2px solid',
            borderColor: '#ff9800',
            bgcolor: alpha('#ff9800', 0.05),
            borderRadius: 2,
            textAlign: 'center',
          }}
        >
          <Storage sx={{ fontSize: 48, color: '#ff9800', mb: 2 }} />
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
            Your Cluster is Ready!
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 500, mx: 'auto' }}>
            Your MongoDB cluster has been deployed but needs a database connection set up.
            Click below to create your database with default collections and a secure connection.
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={handleInitializeDatabase}
            disabled={initializingDb}
            startIcon={initializingDb ? <CircularProgress size={20} color="inherit" /> : <Storage />}
            sx={{
              bgcolor: '#00ED64',
              color: 'black',
              fontWeight: 600,
              px: 4,
              py: 1.5,
              '&:hover': { bgcolor: '#00c853' },
            }}
          >
            {initializingDb ? 'Initializing...' : 'Initialize Database'}
          </Button>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
            This will create a database connection and default collections for your forms, contacts, and workflows.
          </Typography>
        </Paper>
      )}

      {/* Getting Started Guide - Show when cluster is ready and has connection */}
      {isReady && connectionInfo && (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 4,
            border: '1px solid',
            borderColor: alpha('#00ED64', 0.3),
            bgcolor: alpha('#00ED64', 0.02),
            borderRadius: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Info sx={{ color: '#00ED64' }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Your Database is Ready!
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            We&apos;ve set up your MongoDB database with default collections. Here&apos;s where your data will be stored:
          </Typography>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            {/* form_responses collection */}
            <Grid item xs={12} md={4}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  height: '100%',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <TableChart sx={{ color: '#2196f3', fontSize: 20 }} />
                  <Typography variant="subtitle2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                    form_responses
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  All form submissions are automatically saved here. Each response includes the form data and metadata.
                </Typography>
              </Paper>
            </Grid>

            {/* contacts collection */}
            <Grid item xs={12} md={4}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  height: '100%',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Person sx={{ color: '#9c27b0', fontSize: 20 }} />
                  <Typography variant="subtitle2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                    contacts
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Store contact information from your forms. Great for building email lists or CRM data.
                </Typography>
              </Paper>
            </Grid>

            {/* workflow_data collection */}
            <Grid item xs={12} md={4}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  height: '100%',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <AccountTree sx={{ color: '#ff9800', fontSize: 20 }} />
                  <Typography variant="subtitle2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                    workflow_data
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Data produced by workflow executions. Use workflows to process and transform your data.
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              component={Link}
              href="/data?tab=browse"
              variant="contained"
              size="small"
              endIcon={<ArrowForward />}
              sx={{
                bgcolor: '#00ED64',
                color: 'black',
                '&:hover': { bgcolor: '#00c853' },
              }}
            >
              Browse Your Data
            </Button>
            <Button
              component={Link}
              href="/builder"
              variant="outlined"
              size="small"
              sx={{ borderColor: '#00ED64', color: '#00ED64' }}
            >
              Create a Form
            </Button>
            <Button
              component={Link}
              href="/workflows"
              variant="outlined"
              size="small"
              sx={{ borderColor: '#ff9800', color: '#ff9800' }}
            >
              Build a Workflow
            </Button>
          </Box>
        </Paper>
      )}

      {/* Connection String Section */}
      {connectionInfo && isReady && (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 4,
            border: '1px solid',
            borderColor: alpha('#9c27b0', 0.2),
            bgcolor: alpha('#9c27b0', 0.02),
            borderRadius: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <VpnKey sx={{ color: '#9c27b0' }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Connection String
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Use this connection string to connect to your database from external tools like MongoDB Compass,
            mongosh, or your own applications.
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField
              fullWidth
              size="small"
              value={showConnectionString && connectionString ? connectionString : '••••••••••••••••••••••••••••••••••••••••'}
              type={showConnectionString ? 'text' : 'password'}
              InputProps={{
                readOnly: true,
                sx: {
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  bgcolor: 'background.paper',
                },
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title={showConnectionString ? 'Hide' : 'Reveal'}>
                      <IconButton
                        size="small"
                        onClick={handleRevealConnectionString}
                        disabled={loadingConnectionString}
                      >
                        {loadingConnectionString ? (
                          <CircularProgress size={18} />
                        ) : showConnectionString ? (
                          <VisibilityOff fontSize="small" />
                        ) : (
                          <Visibility fontSize="small" />
                        )}
                      </IconButton>
                    </Tooltip>
                  </InputAdornment>
                ),
              }}
            />
            <Tooltip title="Copy connection string">
              <IconButton
                onClick={handleCopyConnectionString}
                disabled={loadingConnectionString}
                sx={{
                  bgcolor: alpha('#9c27b0', 0.1),
                  '&:hover': { bgcolor: alpha('#9c27b0', 0.2) },
                }}
              >
                {loadingConnectionString ? (
                  <CircularProgress size={20} />
                ) : (
                  <ContentCopy sx={{ color: '#9c27b0' }} />
                )}
              </IconButton>
            </Tooltip>
          </Box>

          <Alert severity="warning" sx={{ mt: 2 }} icon={<Security />}>
            <Typography variant="body2">
              <strong>Keep this secret!</strong> Your connection string contains credentials.
              Never share it publicly or commit it to version control.
            </Typography>
          </Alert>
        </Paper>
      )}

      {/* Cluster Management Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          MongoDB Atlas Cluster
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Your forms data is stored in a MongoDB Atlas M0 free tier cluster. This is automatically
          provisioned when you create your first form.
        </Typography>
        <ClusterManagement organizationId={currentOrgId} />
      </Box>

      {/* Admin Debug Panel - Collapsible */}
      {status?.cluster && (
        <Paper
          elevation={0}
          sx={{
            mb: 4,
            border: '1px solid',
            borderColor: alpha('#ff9800', 0.3),
            bgcolor: alpha('#ff9800', 0.02),
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <Box
            onClick={() => setShowDebugPanel(!showDebugPanel)}
            sx={{
              p: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              '&:hover': { bgcolor: alpha('#ff9800', 0.05) },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <BugReport sx={{ color: '#ff9800', fontSize: 20 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Admin Troubleshooting
              </Typography>
              <Chip
                label="Debug Info"
                size="small"
                sx={{
                  height: 18,
                  fontSize: '0.65rem',
                  bgcolor: alpha('#ff9800', 0.1),
                  color: '#ff9800',
                }}
              />
            </Box>
            {showDebugPanel ? <ExpandLess /> : <ExpandMore />}
          </Box>

          <Collapse in={showDebugPanel}>
            <Divider />
            <Box sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                Use this information to troubleshoot cluster issues in the MongoDB Atlas console.
              </Typography>

              <Grid container spacing={2}>
                {/* Atlas Project */}
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Atlas Project ID
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {status.cluster.atlasProjectId || 'Not available'}
                    </Typography>
                    {status.cluster.atlasProjectId && (
                      <Tooltip title="Copy">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(status.cluster!.atlasProjectId!);
                            setSnackbarMessage('Copied to clipboard');
                            setSnackbarOpen(true);
                          }}
                        >
                          <ContentCopy sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </Grid>

                {/* Atlas Project Name */}
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Atlas Project Name
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    {status.cluster.atlasProjectName || 'Not available'}
                  </Typography>
                </Grid>

                {/* Cluster Name */}
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Cluster Name
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    {status.cluster.atlasClusterName || 'Not available'}
                  </Typography>
                </Grid>

                {/* Database User */}
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Database User
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    {status.cluster.databaseUsername || 'Not available'}
                  </Typography>
                </Grid>

                {/* Vault ID */}
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Vault ID
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    {status.vaultId || 'No vault connected'}
                  </Typography>
                </Grid>

                {/* Internal Cluster ID */}
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Internal Cluster ID
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    {status.cluster.clusterId}
                  </Typography>
                </Grid>

                {/* Status Message */}
                {status.cluster.statusMessage && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      Status Message
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#f44336' }}>
                      {status.cluster.statusMessage}
                    </Typography>
                  </Grid>
                )}
              </Grid>

              {/* Atlas Console Link */}
              {status.cluster.atlasProjectId && (
                <Box sx={{ mt: 3 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    href={`https://cloud.mongodb.com/v2/${status.cluster.atlasProjectId}#/clusters`}
                    target="_blank"
                    rel="noopener noreferrer"
                    endIcon={<OpenInNew sx={{ fontSize: 14 }} />}
                    sx={{
                      borderColor: '#ff9800',
                      color: '#ff9800',
                      '&:hover': {
                        borderColor: '#ff9800',
                        bgcolor: alpha('#ff9800', 0.1),
                      },
                    }}
                  >
                    Open in Atlas Console
                  </Button>
                </Box>
              )}
            </Box>
          </Collapse>
        </Paper>
      )}

      {/* Info Section */}
      <Divider sx={{ my: 4 }} />

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              border: '1px solid',
              borderColor: alpha('#2196f3', 0.2),
              bgcolor: alpha('#2196f3', 0.02),
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Speed sx={{ color: '#2196f3' }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                M0 Free Tier Limits
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Your free tier cluster includes:
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 2 }}>
              <Typography component="li" variant="body2" color="text.secondary">
                512 MB storage
              </Typography>
              <Typography component="li" variant="body2" color="text.secondary">
                Shared RAM and vCPU
              </Typography>
              <Typography component="li" variant="body2" color="text.secondary">
                100 max connections
              </Typography>
              <Typography component="li" variant="body2" color="text.secondary">
                No dedicated support
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              border: '1px solid',
              borderColor: alpha('#00ED64', 0.2),
              bgcolor: alpha('#00ED64', 0.02),
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <DataObject sx={{ color: '#00ED64' }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Data Ownership
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              You have full control over your data:
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 2, mb: 2 }}>
              <Typography component="li" variant="body2" color="text.secondary">
                Export your data anytime
              </Typography>
              <Typography component="li" variant="body2" color="text.secondary">
                Transfer ownership to your own Atlas project
              </Typography>
              <Typography component="li" variant="body2" color="text.secondary">
                Use your own MongoDB connection instead
              </Typography>
              <Typography component="li" variant="body2" color="text.secondary">
                Delete all data on request
              </Typography>
            </Box>
            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Want complete control? Deploy your own NetPad instance:
            </Typography>
            <DeployToVercelButton variant="contained" size="small" />
          </Paper>
        </Grid>
      </Grid>

      {/* External Links */}
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <MuiLink
          href="https://www.mongodb.com/atlas"
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            color: 'text.secondary',
            textDecoration: 'none',
            '&:hover': { color: '#00ED64' },
          }}
        >
          Learn more about MongoDB Atlas <OpenInNew sx={{ fontSize: 14 }} />
        </MuiLink>
      </Box>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />

      {/* Add External Connection Dialog */}
      <AddConnectionDialog
        open={addConnectionDialogOpen}
        onClose={() => setAddConnectionDialogOpen(false)}
        organizationId={currentOrgId || ''}
        organizationName={organization?.name}
        onSuccess={() => {
          setAddConnectionDialogOpen(false);
          // Refresh connection count
          if (currentOrgId) {
            fetch(`/api/organizations/${currentOrgId}/vault`)
              .then(res => res.json())
              .then(data => {
                if (data.connections) {
                  setConnectionCount(data.connections.length);
                }
              })
              .catch(console.error);
          }
          setSnackbarMessage('Connection added successfully!');
          setSnackbarOpen(true);
        }}
      />
    </Container>
  );
}
