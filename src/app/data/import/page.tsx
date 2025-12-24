'use client';

/**
 * Data Import Page
 * Provides a dedicated page for importing data into MongoDB collections
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Alert,
  CircularProgress,
  Breadcrumbs,
  Link as MuiLink,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  alpha,
} from '@mui/material';
import { NavigateNext, Storage, Upload, VpnKey } from '@mui/icons-material';
import Link from 'next/link';
import { AppNavBar } from '@/components/Navigation/AppNavBar';
import { DataImportWizard } from '@/components/DataImport';
import { useOrganization } from '@/contexts/OrganizationContext';

interface Connection {
  vaultId: string;
  name: string;
  database: string;
  status: 'active' | 'disabled' | 'deleted';
}

export default function DataImportPage() {
  const searchParams = useSearchParams();
  const { organization, currentOrgId, isLoading: orgLoading } = useOrganization();

  // Get params from URL
  const urlDatabase = searchParams.get('database');
  const urlCollection = searchParams.get('collection');
  const urlVaultId = searchParams.get('vaultId');

  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);
  const [connectionsLoading, setConnectionsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch connections when org is available
  useEffect(() => {
    if (currentOrgId) {
      fetchConnections(currentOrgId);
    }
  }, [currentOrgId, urlVaultId]);

  const fetchConnections = async (orgId: string) => {
    try {
      setConnectionsLoading(true);
      setError(null);
      const response = await fetch(`/api/organizations/${orgId}/vault`);
      if (response.ok) {
        const data = await response.json();
        const activeConnections = (data.connections || []).filter(
          (c: Connection) => c.status === 'active'
        );
        setConnections(activeConnections);

        // Auto-select if urlVaultId matches
        if (urlVaultId) {
          const match = activeConnections.find((c: Connection) => c.vaultId === urlVaultId);
          if (match) {
            setSelectedConnection(match);
          }
        } else if (activeConnections.length === 1) {
          // Auto-select if only one connection
          setSelectedConnection(activeConnections[0]);
        }
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to load connections');
      }
    } catch (err) {
      console.error('Failed to fetch connections:', err);
      setError('Failed to load connections');
    } finally {
      setConnectionsLoading(false);
    }
  };

  const handleComplete = () => {
    // Redirect to data browser after successful import
    const database = selectedConnection?.database || urlDatabase;
    const collection = urlCollection;
    window.location.href = `/data${database ? `?database=${database}` : ''}${collection ? `&collection=${collection}` : ''}`;
  };

  const handleCancel = () => {
    window.location.href = '/data';
  };

  // Show loading while org context is loading
  if (orgLoading) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
        <AppNavBar />
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  // Show error if no organization
  if (!currentOrgId) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
        <AppNavBar />
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Alert severity="warning">
            Please select or create an organization first. Go to{' '}
            <MuiLink component={Link} href="/settings">
              Settings
            </MuiLink>{' '}
            to set up your organization.
          </Alert>
        </Container>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
        <AppNavBar />
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Alert severity="error">{error}</Alert>
        </Container>
      </Box>
    );
  }

  // Show connection selector if no connection selected
  if (!selectedConnection) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
        <AppNavBar />
        <Container maxWidth="md" sx={{ py: 4 }}>
          {/* Breadcrumbs */}
          <Breadcrumbs
            separator={<NavigateNext fontSize="small" />}
            sx={{ mb: 3 }}
          >
            <MuiLink
              component={Link}
              href="/data"
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
              color="inherit"
              underline="hover"
            >
              <Storage fontSize="small" />
              Data Browser
            </MuiLink>
            <Typography
              color="text.primary"
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
            >
              <Upload fontSize="small" />
              Import Data
            </Typography>
          </Breadcrumbs>

          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <VpnKey sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              Select a Connection
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Choose a MongoDB connection to import data into.
            </Typography>

            {connectionsLoading ? (
              <CircularProgress size={24} />
            ) : connections.length === 0 ? (
              <Box>
                <Alert severity="info" sx={{ mb: 2 }}>
                  No active connections found. Please add a connection in Settings first.
                </Alert>
                <Button
                  component={Link}
                  href="/settings"
                  variant="contained"
                  sx={{
                    background: 'linear-gradient(135deg, #00ED64 0%, #4DFF9F 100%)',
                    color: '#001E2B',
                    fontWeight: 600,
                    '&:hover': {
                      background: 'linear-gradient(135deg, #00CC55 0%, #3DFF8F 100%)',
                    },
                  }}
                >
                  Go to Settings
                </Button>
              </Box>
            ) : (
              <Box sx={{ maxWidth: 400, mx: 'auto' }}>
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel>Connection</InputLabel>
                  <Select
                    value=""
                    label="Connection"
                    onChange={(e) => {
                      const conn = connections.find(c => c.vaultId === e.target.value);
                      if (conn) setSelectedConnection(conn);
                    }}
                  >
                    {connections.map((conn) => (
                      <MenuItem key={conn.vaultId} value={conn.vaultId}>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {conn.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Database: {conn.database}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}
          </Paper>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <AppNavBar />
      <Container maxWidth="lg" sx={{ py: 4, flex: 1, overflow: 'auto' }}>
        {/* Breadcrumbs */}
        <Breadcrumbs
          separator={<NavigateNext fontSize="small" />}
          sx={{ mb: 3 }}
        >
          <MuiLink
            component={Link}
            href="/data"
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
            color="inherit"
            underline="hover"
          >
            <Storage fontSize="small" />
            Data Browser
          </MuiLink>
          <Typography
            color="text.primary"
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
          >
            <Upload fontSize="small" />
            Import Data
          </Typography>
        </Breadcrumbs>

        {/* Connection info chip */}
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Importing to:
          </Typography>
          <Box
            sx={{
              px: 1.5,
              py: 0.5,
              borderRadius: 1,
              bgcolor: alpha('#00ED64', 0.1),
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <VpnKey sx={{ fontSize: 14, color: '#00ED64' }} />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {selectedConnection.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              ({selectedConnection.database})
            </Typography>
          </Box>
          <Button
            size="small"
            onClick={() => setSelectedConnection(null)}
            sx={{ ml: 1 }}
          >
            Change
          </Button>
        </Box>

        {/* Import Wizard */}
        <DataImportWizard
          organizationId={currentOrgId}
          vaultId={selectedConnection.vaultId}
          database={selectedConnection.database}
          defaultCollection={urlCollection || ''}
          onComplete={handleComplete}
          onCancel={handleCancel}
        />
      </Container>
    </Box>
  );
}
