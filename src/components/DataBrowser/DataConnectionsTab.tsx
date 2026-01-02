'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  alpha,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Container,
} from '@mui/material';
import {
  Add,
  VpnKey,
  Storage,
  CheckCircle,
  Delete,
  PlayArrow,
  Lock,
  ContentCopy,
  TableChart,
} from '@mui/icons-material';
import { AddConnectionDialog } from '@/components/Settings/AddConnectionDialog';
import { DuplicateConnectionDialog } from '@/components/Settings/DuplicateConnectionDialog';
import { SampleDataLoader } from '@/components/Settings/SampleDataLoader';
import { usePipeline } from '@/contexts/PipelineContext';
import { useOrganization } from '@/contexts/OrganizationContext';

interface Connection {
  vaultId: string;
  name: string;
  description?: string;
  database: string;
  allowedCollections: string[];
  status: 'active' | 'disabled' | 'deleted';
  lastTestedAt?: string;
  lastUsedAt?: string;
  usageCount: number;
  createdAt: string;
}

interface Organization {
  orgId: string;
  name: string;
}

interface DataConnectionsTabProps {
  onConnectAndBrowse?: () => void;
}

export function DataConnectionsTab({ onConnectAndBrowse }: DataConnectionsTabProps) {
  const { dispatch } = usePipeline();
  const { currentOrgId } = useOrganization();

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>(currentOrgId || '');
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);

  // Create connection dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Duplicate connection dialog
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [connectionToDuplicate, setConnectionToDuplicate] = useState<Connection | null>(null);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  useEffect(() => {
    if (currentOrgId && !selectedOrgId) {
      setSelectedOrgId(currentOrgId);
    }
  }, [currentOrgId, selectedOrgId]);

  useEffect(() => {
    if (selectedOrgId) {
      fetchConnections(selectedOrgId);
    }
  }, [selectedOrgId]);

  const fetchOrganizations = async () => {
    try {
      const response = await fetch('/api/organizations');
      const data = await response.json();

      if (response.ok && data.organizations) {
        setOrganizations(data.organizations);
        if (data.organizations.length > 0 && !selectedOrgId) {
          setSelectedOrgId(data.organizations[0].orgId);
        }
      }
    } catch (err) {
      console.error('Failed to fetch organizations:', err);
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
      } else {
        setError(data.error || 'Failed to load connections');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleTestSavedConnection = async (vaultId: string) => {
    try {
      const response = await fetch(`/api/organizations/${selectedOrgId}/vault/${vaultId}/test`, {
        method: 'POST',
      });

      await response.json();
      fetchConnections(selectedOrgId);
    } catch (err) {
      console.error('Failed to test connection:', err);
    }
  };

  const handleDeleteConnection = async (vaultId: string) => {
    if (!confirm('Are you sure you want to delete this connection? This cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/organizations/${selectedOrgId}/vault/${vaultId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchConnections(selectedOrgId);
      }
    } catch (err) {
      console.error('Failed to delete connection:', err);
    }
  };

  const handleConnectAndBrowse = async (conn: Connection) => {
    setConnecting(conn.vaultId);
    try {
      // Decrypt the connection string
      const response = await fetch(`/api/organizations/${selectedOrgId}/vault/${conn.vaultId}/decrypt`);
      const data = await response.json();

      if (response.ok && data.connectionString) {
        // Set the connection in pipeline context
        dispatch({
          type: 'SET_CONNECTION',
          payload: {
            connectionString: data.connectionString,
            databaseName: conn.database,
            vaultId: conn.vaultId,
          },
        });

        // If there's a default collection, set it
        if (conn.allowedCollections.length > 0) {
          dispatch({
            type: 'SET_COLLECTION',
            payload: { collection: conn.allowedCollections[0] },
          });
        }

        // Switch to browse tab
        onConnectAndBrowse?.();
      } else {
        setError(data.error || 'Failed to decrypt connection');
      }
    } catch (err) {
      setError('Failed to connect');
    } finally {
      setConnecting(null);
    }
  };

  const handleConnectionCreated = () => {
    setCreateDialogOpen(false);
    fetchConnections(selectedOrgId);
  };

  const handleDuplicateConnection = (conn: Connection) => {
    setConnectionToDuplicate(conn);
    setDuplicateDialogOpen(true);
  };

  const handleDuplicateSuccess = () => {
    setDuplicateDialogOpen(false);
    setConnectionToDuplicate(null);
    fetchConnections(selectedOrgId);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  if (organizations.length === 0) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Card
          sx={{
            border: '2px dashed',
            borderColor: 'divider',
            bgcolor: 'transparent',
            textAlign: 'center',
            py: 6,
          }}
        >
          <VpnKey sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No organizations yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create an organization first to add secure connections.
          </Typography>
        </Card>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Database Connections
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your MongoDB connections and connect to browse data
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Organization</InputLabel>
            <Select
              value={selectedOrgId}
              label="Organization"
              onChange={(e) => setSelectedOrgId(e.target.value)}
            >
              {organizations.map((org) => (
                <MenuItem key={org.orgId} value={org.orgId}>
                  {org.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setCreateDialogOpen(true)}
            disabled={!selectedOrgId}
            sx={{
              bgcolor: '#00ED64',
              color: '#001E2B',
              fontWeight: 600,
              '&:hover': { bgcolor: '#00c853' },
            }}
          >
            Add Connection
          </Button>
        </Box>
      </Box>

      {/* Sample Data Loader */}
      {selectedOrgId && (
        <Box sx={{ mb: 3 }}>
          <SampleDataLoader
            organizationId={selectedOrgId}
            onDataLoaded={() => {
              fetchConnections(selectedOrgId);
            }}
          />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress sx={{ color: '#00ED64' }} />
        </Box>
      ) : connections.length === 0 ? (
        <Card
          sx={{
            border: '2px dashed',
            borderColor: 'divider',
            bgcolor: 'transparent',
            textAlign: 'center',
            py: 6,
          }}
        >
          <Lock sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No connections yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Add a MongoDB connection to browse your data.
            <br />
            Connection strings are encrypted at rest.
          </Typography>
          <Button
            variant="outlined"
            startIcon={<Add />}
            onClick={() => setCreateDialogOpen(true)}
            sx={{ borderColor: '#00ED64', color: '#00ED64' }}
          >
            Add Your First Connection
          </Button>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {connections.map((conn) => (
            <Grid item xs={12} key={conn.vaultId}>
              <Card
                sx={{
                  border: '1px solid',
                  borderColor: conn.status === 'active' ? 'divider' : alpha('#f44336', 0.5),
                  transition: 'border-color 0.2s',
                  '&:hover': {
                    borderColor: '#00ED64',
                  },
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 2,
                          bgcolor: alpha('#00ED64', 0.1),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Storage sx={{ color: '#00ED64' }} />
                      </Box>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {conn.name}
                          </Typography>
                          <Chip
                            label={conn.status}
                            size="small"
                            sx={{
                              bgcolor: conn.status === 'active'
                                ? alpha('#00ED64', 0.1)
                                : alpha('#f44336', 0.1),
                              color: conn.status === 'active' ? '#00ED64' : '#f44336',
                              fontWeight: 500,
                              textTransform: 'capitalize',
                            }}
                          />
                        </Box>
                        {conn.description && (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            {conn.description}
                          </Typography>
                        )}
                        <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            Database: <strong>{conn.database}</strong>
                          </Typography>
                          {conn.allowedCollections.length > 0 && (
                            <Typography variant="caption" color="text.secondary">
                              Collections: <strong>{conn.allowedCollections.join(', ')}</strong>
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      {/* Connect & Browse Button */}
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={connecting === conn.vaultId ? <CircularProgress size={14} color="inherit" /> : <TableChart />}
                        onClick={() => handleConnectAndBrowse(conn)}
                        disabled={connecting !== null || conn.status !== 'active'}
                        sx={{
                          bgcolor: '#00ED64',
                          color: '#001E2B',
                          fontWeight: 600,
                          '&:hover': { bgcolor: '#00c853' },
                          mr: 1,
                        }}
                      >
                        {connecting === conn.vaultId ? 'Connecting...' : 'Connect & Browse'}
                      </Button>
                      <Tooltip title="Test connection">
                        <IconButton
                          size="small"
                          onClick={() => handleTestSavedConnection(conn.vaultId)}
                        >
                          <PlayArrow fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Duplicate connection">
                        <IconButton
                          size="small"
                          onClick={() => handleDuplicateConnection(conn)}
                          sx={{ color: 'primary.main' }}
                        >
                          <ContentCopy fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete connection">
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteConnection(conn.vaultId)}
                          sx={{ color: 'error.main' }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Last Tested
                      </Typography>
                      <Typography variant="body2">
                        {formatDate(conn.lastTestedAt)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Last Used
                      </Typography>
                      <Typography variant="body2">
                        {formatDate(conn.lastUsedAt)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Usage Count
                      </Typography>
                      <Typography variant="body2">
                        {conn.usageCount} submissions
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Vault ID
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        {conn.vaultId}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create Connection Dialog */}
      <AddConnectionDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        organizationId={selectedOrgId}
        organizationName={organizations.find((o) => o.orgId === selectedOrgId)?.name}
        onSuccess={handleConnectionCreated}
      />

      {/* Duplicate Connection Dialog */}
      {connectionToDuplicate && (
        <DuplicateConnectionDialog
          open={duplicateDialogOpen}
          onClose={() => {
            setDuplicateDialogOpen(false);
            setConnectionToDuplicate(null);
          }}
          organizationId={selectedOrgId}
          sourceConnection={connectionToDuplicate}
          onSuccess={handleDuplicateSuccess}
        />
      )}
    </Container>
  );
}
