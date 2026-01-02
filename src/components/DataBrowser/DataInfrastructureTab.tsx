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
} from '@mui/icons-material';
import Link from 'next/link';
import { ClusterManagement } from '@/components/Settings/ClusterManagement';
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
  const { status, loading } = useClusterProvisioning(currentOrgId || undefined);
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo | null>(null);
  const [connectionCount, setConnectionCount] = useState<number>(0);

  // Connection string visibility state
  const [showConnectionString, setShowConnectionString] = useState(false);
  const [connectionString, setConnectionString] = useState<string | null>(null);
  const [loadingConnectionString, setLoadingConnectionString] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Fetch connection info when cluster is ready
  useEffect(() => {
    const fetchConnectionInfo = async () => {
      if (!currentOrgId) return;

      try {
        const response = await fetch(`/api/organizations/${currentOrgId}/vault`);
        const data = await response.json();

        if (response.ok && data.connections) {
          setConnectionCount(data.connections.length);

          // Only show connection info for the auto-provisioned cluster
          // Do NOT fall back to other connections - this tab is specifically
          // for the M0 cluster provisioned by the platform
          if (status?.vaultId) {
            const conn = data.connections.find(
              (c: ConnectionInfo) => c.vaultId === status.vaultId
            );
            if (conn) {
              setConnectionInfo(conn);
            } else {
              // Clear connection info if no match found
              setConnectionInfo(null);
            }
          } else {
            // No provisioned cluster vault ID - don't show any connection
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
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Database Infrastructure
        </Typography>
        <Typography variant="body2" color="text.secondary">
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
                component={Link}
                href="/data?tab=connections"
                size="small"
                sx={{ color: '#00ED64' }}
              >
                Manage Connections
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>

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
            <Box component="ul" sx={{ m: 0, pl: 2 }}>
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
    </Container>
  );
}
