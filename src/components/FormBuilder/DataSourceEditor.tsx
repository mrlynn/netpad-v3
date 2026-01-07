'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Paper,
  Chip,
  alpha,
  Link,
  Autocomplete,
  Collapse,
  IconButton,
  InputAdornment,
} from '@mui/material';
import {
  Storage,
  VpnKey,
  Add,
  CheckCircle,
  Warning,
  Lock,
  Visibility,
  VisibilityOff,
  PlayArrow,
  Close,
  Bolt,
  Edit,
  Info,
  Folder,
} from '@mui/icons-material';
import { FormDataSource } from '@/types/form';
import NextLink from 'next/link';

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

interface DataSourceEditorProps {
  value?: FormDataSource;
  organizationId?: string;
  projectId?: string;                    // Optional: project context for showing defaults
  onChange: (value: FormDataSource | undefined, orgId?: string) => void;
  disabled?: boolean;
}

export function DataSourceEditor({
  value,
  organizationId,
  projectId,
  onChange,
  disabled = false,
}: DataSourceEditorProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>(organizationId || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [projectDefaultVault, setProjectDefaultVault] = useState<{
    vaultId: string;
    name: string;
    database: string;
  } | null>(null);
  const [loadingProjectVault, setLoadingProjectVault] = useState(false);

  // Inline connection creation state
  const [showInlineCreate, setShowInlineCreate] = useState(false);
  const [newConnectionName, setNewConnectionName] = useState('');
  const [newConnectionString, setNewConnectionString] = useState('');
  const [newDatabase, setNewDatabase] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    collections?: string[];
  } | null>(null);
  const [saving, setSaving] = useState(false);

  // Fetch organizations on mount
  useEffect(() => {
    fetchOrganizations();
  }, []);

  // Fetch connections when org changes
  useEffect(() => {
    if (selectedOrgId) {
      fetchConnections(selectedOrgId);
    }
  }, [selectedOrgId]);

  // Fetch project default vault if projectId is provided
  useEffect(() => {
    const fetchProjectDefaultVault = async () => {
      if (!projectId || !selectedOrgId) {
        setProjectDefaultVault(null);
        return;
      }

      try {
        setLoadingProjectVault(true);
        const response = await fetch(`/api/projects/${projectId}/default-vault`);
        const data = await response.json();

        if (data.hasDefaultVault && data.vault) {
          setProjectDefaultVault({
            vaultId: data.vault.vaultId,
            name: data.vault.name,
            database: data.vault.database,
          });
        } else {
          setProjectDefaultVault(null);
        }
      } catch (err) {
        console.error('Failed to fetch project default vault:', err);
        setProjectDefaultVault(null);
      } finally {
        setLoadingProjectVault(false);
      }
    };

    fetchProjectDefaultVault();
  }, [projectId, selectedOrgId]);

  const fetchOrganizations = async () => {
    try {
      const response = await fetch('/api/organizations');
      const data = await response.json();

      if (response.ok && data.organizations) {
        setOrganizations(data.organizations);

        // If we have an organizationId, use it; otherwise use first org
        if (organizationId) {
          setSelectedOrgId(organizationId);
        } else if (data.organizations.length > 0) {
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

  const handleOrgChange = (orgId: string) => {
    setSelectedOrgId(orgId);
    // Clear selection when org changes
    onChange(undefined, orgId);
  };

  const handleConnectionChange = (vaultId: string) => {
    const connection = connections.find((c) => c.vaultId === vaultId);
    if (connection) {
      onChange(
        {
          vaultId,
          collection: value?.collection || '',
        },
        selectedOrgId
      );
    }
  };

  const handleCollectionChange = (collection: string) => {
    if (value) {
      onChange({ ...value, collection }, selectedOrgId);
    }
  };

  const handleTestConnection = async () => {
    if (!newConnectionString || !newDatabase) {
      setTestResult({
        success: false,
        message: 'Connection string and database are required',
      });
      return;
    }

    try {
      setTesting(true);
      setTestResult(null);

      const response = await fetch('/api/mongodb/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionString: newConnectionString,
          database: newDatabase,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setTestResult({
          success: true,
          message: `Connected! Found ${data.collections?.length || 0} collections`,
          collections: data.collections,
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Connection failed',
        });
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: 'Failed to test connection',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleCreateConnection = async () => {
    if (!newConnectionString || !newDatabase || !selectedOrgId) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const response = await fetch(`/api/organizations/${selectedOrgId}/vault`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newConnectionName || `Connection ${new Date().toLocaleDateString()}`,
          connectionString: newConnectionString,
          database: newDatabase,
          allowedCollections: [],
          testFirst: true,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Add the new connection to the list
        const newConn: Connection = {
          vaultId: data.connection.vaultId,
          name: newConnectionName || `Connection ${new Date().toLocaleDateString()}`,
          database: newDatabase,
          allowedCollections: [],
          status: 'active',
        };
        setConnections((prev) => [...prev, newConn]);

        // Auto-select the new connection
        onChange({ vaultId: newConn.vaultId, collection: '' }, selectedOrgId);

        // Reset form
        resetInlineForm();
      } else {
        setError(data.error || 'Failed to create connection');
      }
    } catch (err) {
      setError('Failed to create connection');
    } finally {
      setSaving(false);
    }
  };

  const resetInlineForm = () => {
    setShowInlineCreate(false);
    setNewConnectionName('');
    setNewConnectionString('');
    setNewDatabase('');
    setTestResult(null);
  };

  const selectedConnection = connections.find((c) => c.vaultId === value?.vaultId);
  const availableCollections = selectedConnection?.allowedCollections || [];
  
  // Check if we're using project default vault
  const isUsingProjectDefault = projectDefaultVault && value?.vaultId === projectDefaultVault.vaultId;
  const currentOrg = organizations.find(o => o.orgId === selectedOrgId);

  if (organizations.length === 0) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 3,
          border: '2px dashed',
          borderColor: 'divider',
          borderRadius: 2,
          textAlign: 'center',
        }}
      >
        <VpnKey sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No Organizations Found
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Create an organization and add a connection to store form submissions securely.
        </Typography>
        <Button
          component={NextLink}
          href="/settings?tab=organizations"
          variant="outlined"
          startIcon={<Add />}
          sx={{ borderColor: '#00ED64', color: '#00ED64' }}
        >
          Create Organization
        </Button>
      </Paper>
    );
  }

  return (
    <Box>
      {/* Context Display */}
      {(currentOrg || projectId) && (
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Info sx={{ color: '#00ED64', fontSize: 18 }} />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Current Context
            </Typography>
          </Box>
          <Box sx={{ pl: 3, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {currentOrg && (
              <Typography variant="caption" color="text.secondary">
                Organization: <strong>{currentOrg.name}</strong>
              </Typography>
            )}
            {projectId && (
              <Typography variant="caption" color="text.secondary">
                Project: <strong>{projectId}</strong>
              </Typography>
            )}
            {projectDefaultVault && (
              <Typography variant="caption" color="text.secondary">
                Default Database: <strong>{projectDefaultVault.database}</strong>
              </Typography>
            )}
          </Box>
        </Paper>
      )}

      <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
        Where should form data be stored?
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Simplified View: Using Project Default */}
      {!showAdvanced && isUsingProjectDefault && projectDefaultVault && value?.collection && (
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            mb: 2,
            bgcolor: alpha('#00ED64', 0.05),
            border: '2px solid',
            borderColor: alpha('#00ED64', 0.3),
            borderRadius: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
            <CheckCircle sx={{ color: '#00ED64', fontSize: 24, mt: 0.25 }} />
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  ✅ Using Project Default
                </Typography>
                <Chip
                  label="Default"
                  size="small"
                  sx={{
                    bgcolor: alpha('#00ED64', 0.2),
                    color: '#00ED64',
                    fontWeight: 600,
                    fontSize: '0.7rem',
                  }}
                />
              </Box>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 1, color: 'text.primary' }}>
                {projectDefaultVault.database}.{value.collection}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                Connection: {projectDefaultVault.name} • Encrypted storage
              </Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Edit />}
                onClick={() => setShowAdvanced(true)}
                sx={{
                  borderColor: '#00ED64',
                  color: '#00ED64',
                  '&:hover': {
                    borderColor: '#00CC55',
                    bgcolor: alpha('#00ED64', 0.05),
                  },
                }}
              >
                Change Database
              </Button>
            </Box>
          </Box>
        </Paper>
      )}

      {/* Simplified View: No Project Default or Not Using Default */}
      {!showAdvanced && (!isUsingProjectDefault || !projectDefaultVault) && value?.vaultId && value?.collection && (
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            mb: 2,
            bgcolor: alpha('#2196f3', 0.05),
            border: '1px solid',
            borderColor: alpha('#2196f3', 0.2),
            borderRadius: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
            <Storage sx={{ color: '#2196f3', fontSize: 24, mt: 0.25 }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                Custom Database Configuration
              </Typography>
              {selectedConnection && (
                <>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 1 }}>
                    {selectedConnection.database}.{value.collection}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                    Connection: {selectedConnection.name}
                  </Typography>
                </>
              )}
              <Button
                variant="outlined"
                size="small"
                startIcon={<Edit />}
                onClick={() => setShowAdvanced(true)}
                sx={{
                  borderColor: '#2196f3',
                  color: '#2196f3',
                  '&:hover': {
                    borderColor: '#1976d2',
                    bgcolor: alpha('#2196f3', 0.05),
                  },
                }}
              >
                Change Database
              </Button>
            </Box>
          </Box>
        </Paper>
      )}

      {/* Advanced View: Full Configuration */}
      {showAdvanced && (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
              Advanced Configuration
            </Typography>
            {value?.vaultId && value?.collection && (
              <Button
                size="small"
                onClick={() => setShowAdvanced(false)}
                sx={{ textTransform: 'none' }}
              >
                Use Default
              </Button>
            )}
          </Box>

      {/* Organization Selector */}
      <FormControl fullWidth sx={{ mb: 2 }} disabled={disabled}>
        <InputLabel>Organization</InputLabel>
        <Select
          value={selectedOrgId}
          label="Organization"
          onChange={(e) => handleOrgChange(e.target.value)}
        >
          {organizations.map((org) => (
            <MenuItem key={org.orgId} value={org.orgId}>
              {org.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

          {/* Connection Selector */}
          {loading ? (
        <Box sx={{ textAlign: 'center', py: 2 }}>
          <CircularProgress size={24} sx={{ color: '#00ED64' }} />
        </Box>
      ) : connections.length === 0 && !showInlineCreate ? (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            border: '2px dashed',
            borderColor: 'divider',
            borderRadius: 2,
            textAlign: 'center',
          }}
        >
          <Lock sx={{ fontSize: 36, color: 'text.disabled', mb: 1 }} />
          <Typography variant="body1" color="text.secondary" gutterBottom>
            No connections in this organization
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Add a secure MongoDB connection to store form submissions.
          </Typography>
          <Button
            variant="contained"
            startIcon={<Bolt />}
            size="small"
            onClick={() => setShowInlineCreate(true)}
            sx={{
              background: 'linear-gradient(135deg, #00ED64 0%, #4DFF9F 100%)',
              color: '#001E2B',
              '&:hover': {
                background: 'linear-gradient(135deg, #00CC55 0%, #3DFF8F 100%)',
              },
            }}
          >
            Quick Connect
          </Button>
        </Paper>
      ) : connections.length === 0 && showInlineCreate ? (
        // Inline connection creation form
        <Paper
          elevation={0}
          sx={{
            p: 2,
            border: '1px solid',
            borderColor: alpha('#00ED64', 0.3),
            borderRadius: 2,
            bgcolor: alpha('#00ED64', 0.02),
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Bolt sx={{ color: '#00ED64', fontSize: 18 }} />
              Quick Connect
            </Typography>
            <IconButton size="small" onClick={resetInlineForm}>
              <Close fontSize="small" />
            </IconButton>
          </Box>

          <TextField
            fullWidth
            size="small"
            label="Connection Name (optional)"
            value={newConnectionName}
            onChange={(e) => setNewConnectionName(e.target.value)}
            placeholder="My MongoDB Connection"
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            size="small"
            label="MongoDB Connection String"
            value={newConnectionString}
            onChange={(e) => setNewConnectionString(e.target.value)}
            type={showPassword ? 'text' : 'password'}
            placeholder="mongodb+srv://user:pass@cluster.mongodb.net/"
            required
            sx={{ mb: 2 }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <TextField
            fullWidth
            size="small"
            label="Database Name"
            value={newDatabase}
            onChange={(e) => setNewDatabase(e.target.value)}
            placeholder="my_database"
            required
            sx={{ mb: 2 }}
          />

          {testResult && (
            <Alert
              severity={testResult.success ? 'success' : 'error'}
              sx={{ mb: 2 }}
              icon={testResult.success ? <CheckCircle /> : <Warning />}
            >
              {testResult.message}
            </Alert>
          )}

          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={testing ? <CircularProgress size={14} /> : <PlayArrow />}
              onClick={handleTestConnection}
              disabled={testing || !newConnectionString || !newDatabase}
              sx={{ borderColor: '#00ED64', color: '#00ED64' }}
            >
              Test
            </Button>
            <Button
              size="small"
              variant="contained"
              startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <Storage />}
              onClick={handleCreateConnection}
              disabled={saving || !newConnectionString || !newDatabase}
              sx={{
                background: 'linear-gradient(135deg, #00ED64 0%, #4DFF9F 100%)',
                color: '#001E2B',
                '&:hover': {
                  background: 'linear-gradient(135deg, #00CC55 0%, #3DFF8F 100%)',
                },
              }}
            >
              {saving ? 'Creating...' : 'Create Connection'}
            </Button>
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, textAlign: 'center' }}>
            Connection strings are encrypted with AES-256 before storage
          </Typography>
        </Paper>
      ) : (
        <>
          <FormControl fullWidth sx={{ mb: 2 }} disabled={disabled}>
            <InputLabel>Connection</InputLabel>
            <Select
              value={value?.vaultId || ''}
              label="Connection"
              onChange={(e) => handleConnectionChange(e.target.value)}
            >
              {connections
                .filter((c) => c.status === 'active')
                .map((conn) => (
                  <MenuItem key={conn.vaultId} value={conn.vaultId}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Storage sx={{ color: '#00ED64', fontSize: 18 }} />
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

          {/* Collection Selector */}
          {selectedConnection && (
            <Box>
              {availableCollections.length > 0 ? (
                <Autocomplete
                  freeSolo
                  options={availableCollections}
                  value={value?.collection || ''}
                  onChange={(_, newValue) => handleCollectionChange(newValue || '')}
                  onInputChange={(_, newValue) => handleCollectionChange(newValue)}
                  disabled={disabled}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Collection"
                      placeholder="Select or enter collection name"
                      helperText={
                        availableCollections.length > 0
                          ? 'Select from allowed collections or enter a new name'
                          : 'Enter the collection name for form submissions'
                      }
                    />
                  )}
                />
              ) : (
                <TextField
                  fullWidth
                  label="Collection"
                  value={value?.collection || ''}
                  onChange={(e) => handleCollectionChange(e.target.value)}
                  placeholder="form_submissions"
                  disabled={disabled}
                  helperText="Enter the collection name for form submissions"
                />
              )}
            </Box>
          )}
        </>
      )}
        </Box>
      )}

      {/* No Configuration State */}
      {!showAdvanced && !value?.vaultId && (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            border: '2px dashed',
            borderColor: 'divider',
            borderRadius: 2,
            textAlign: 'center',
            bgcolor: alpha('#ff9800', 0.02),
          }}
        >
          <Storage sx={{ fontSize: 36, color: 'text.disabled', mb: 1 }} />
          <Typography variant="body1" color="text.secondary" gutterBottom>
            {projectDefaultVault 
              ? 'Click "Use Project Default" to configure'
              : 'No database configured'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {projectDefaultVault
              ? `This project has a default database (${projectDefaultVault.database}). Configure it below.`
              : 'Configure a database connection to store form submissions.'}
          </Typography>
          {projectDefaultVault ? (
            <Button
              variant="contained"
              startIcon={<CheckCircle />}
              onClick={() => {
                const collectionName = value?.collection || 'form_responses';
                onChange({
                  vaultId: projectDefaultVault.vaultId,
                  collection: collectionName,
                }, selectedOrgId);
              }}
              sx={{
                background: 'linear-gradient(135deg, #00ED64 0%, #4DFF9F 100%)',
                color: '#001E2B',
                '&:hover': {
                  background: 'linear-gradient(135deg, #00CC55 0%, #3DFF8F 100%)',
                },
              }}
            >
              Use Project Default
            </Button>
          ) : (
            <Button
              variant="outlined"
              startIcon={<Add />}
              onClick={() => setShowAdvanced(true)}
              sx={{ borderColor: '#00ED64', color: '#00ED64' }}
            >
              Configure Database
            </Button>
          )}
        </Paper>
      )}

      {/* Selected Connection Info - Only show in advanced view */}
      {showAdvanced && selectedConnection && value?.collection && (
        <Paper
          elevation={0}
          sx={{
            mt: 2,
            p: 2,
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
              <Typography
                variant="body2"
                sx={{ fontFamily: 'monospace', mt: 0.5 }}
              >
                {selectedConnection.database}.{value.collection}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Connection: {selectedConnection.name} • Encrypted storage
              </Typography>
            </Box>
          </Box>
        </Paper>
      )}

      {/* Security Notice - Only show in advanced view */}
      {showAdvanced && (
        <Paper
          elevation={0}
          sx={{
            mt: 2,
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
                processing form submissions. Your credentials are never exposed to the browser.
              </Typography>
            </Box>
          </Box>
        </Paper>
      )}
    </Box>
  );
}
