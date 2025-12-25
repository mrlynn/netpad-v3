'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  IconButton,
  Collapse,
  CircularProgress,
  Alert,
  Chip,
  alpha,
  Tooltip,
  InputAdornment,
} from '@mui/material';
import {
  Storage,
  CheckCircle,
  Error,
  Visibility,
  VisibilityOff,
  PlayArrow,
  Close,
  Add,
  LinkOff,
  Edit,
  Bolt,
} from '@mui/icons-material';
import { FormDataSource } from '@/types/form';

interface QuickConnectCardProps {
  dataSource?: FormDataSource;
  organizationId?: string;
  onConnect: (dataSource: FormDataSource, orgId: string) => void;
  onOpenFullSetup: () => void;
  compact?: boolean;
}

interface ConnectionInfo {
  name: string;
  database: string;
  collection: string;
  status: 'active' | 'disabled';
}

export function QuickConnectCard({
  dataSource,
  organizationId,
  onConnect,
  onOpenFullSetup,
  compact = false,
}: QuickConnectCardProps) {
  // Existing connection info
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(false);

  // Quick connect form state
  const [showQuickConnect, setShowQuickConnect] = useState(false);
  const [connectionString, setConnectionString] = useState('');
  const [database, setDatabase] = useState('');
  const [collection, setCollection] = useState('');
  const [connectionName, setConnectionName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Testing state
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    collections?: string[];
  } | null>(null);

  // Saving state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Organization state
  const [defaultOrgId, setDefaultOrgId] = useState<string | null>(null);
  const [defaultOrgName, setDefaultOrgName] = useState<string | null>(null);

  // Load existing connection info
  useEffect(() => {
    if (dataSource?.vaultId && organizationId) {
      loadConnectionInfo();
    }
  }, [dataSource?.vaultId, organizationId]);

  // Load default organization
  useEffect(() => {
    loadDefaultOrg();
  }, []);

  const loadDefaultOrg = async () => {
    try {
      const response = await fetch('/api/organizations');
      const data = await response.json();
      if (response.ok && data.organizations?.length > 0) {
        // Use provided orgId or first org
        const org = organizationId
          ? data.organizations.find((o: { orgId: string }) => o.orgId === organizationId)
          : data.organizations[0];
        if (org) {
          setDefaultOrgId(org.orgId);
          setDefaultOrgName(org.name);
        }
      }
    } catch (err) {
      console.error('Failed to load organizations:', err);
    }
  };

  const loadConnectionInfo = async () => {
    if (!dataSource?.vaultId || !organizationId) return;

    try {
      setLoadingInfo(true);
      const response = await fetch(`/api/organizations/${organizationId}/vault`);
      const data = await response.json();

      if (response.ok && data.connections) {
        const conn = data.connections.find(
          (c: { vaultId: string }) => c.vaultId === dataSource.vaultId
        );
        if (conn) {
          setConnectionInfo({
            name: conn.name,
            database: conn.database,
            collection: dataSource.collection,
            status: conn.status,
          });
        }
      }
    } catch (err) {
      console.error('Failed to load connection info:', err);
    } finally {
      setLoadingInfo(false);
    }
  };

  const handleTestConnection = async () => {
    if (!connectionString || !database) {
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
        body: JSON.stringify({ connectionString, database }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setTestResult({
          success: true,
          message: `Connected! Found ${data.collections?.length || 0} collections`,
          collections: data.collections,
        });
        // Auto-suggest collection name if empty
        if (!collection && data.collections?.length > 0) {
          // Look for common collection names or use first one
          const suggested = data.collections.find((c: string) =>
            ['submissions', 'form_submissions', 'responses', 'entries'].includes(c.toLowerCase())
          );
          if (suggested) setCollection(suggested);
        }
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

  const handleQuickSave = async () => {
    if (!connectionString || !database || !collection || !defaultOrgId) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Create the connection in the vault
      const response = await fetch(`/api/organizations/${defaultOrgId}/vault`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: connectionName || `Connection ${new Date().toLocaleDateString()}`,
          connectionString,
          database,
          allowedCollections: [],
          testFirst: true,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Connect the form to this new connection
        onConnect(
          {
            vaultId: data.connection.vaultId,
            collection,
          },
          defaultOrgId
        );

        // Reset form
        setShowQuickConnect(false);
        setConnectionString('');
        setDatabase('');
        setCollection('');
        setConnectionName('');
        setTestResult(null);
      } else {
        setError(data.error || 'Failed to save connection');
      }
    } catch (err) {
      setError('Failed to save connection');
    } finally {
      setSaving(false);
    }
  };

  // Connected state - show current connection
  if (dataSource?.vaultId && dataSource?.collection) {
    if (loadingInfo) {
      return (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <CircularProgress size={20} sx={{ color: '#00ED64' }} />
          <Typography variant="body2" color="text.secondary">
            Loading connection...
          </Typography>
        </Paper>
      );
    }

    return (
      <Paper
        elevation={0}
        sx={{
          p: compact ? 1.5 : 2,
          background: `linear-gradient(135deg, ${alpha('#00ED64', 0.05)} 0%, ${alpha('#4DFF9F', 0.02)} 100%)`,
          border: '1px solid',
          borderColor: alpha('#00ED64', 0.3),
          borderRadius: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: compact ? 32 : 40,
                height: compact ? 32 : 40,
                borderRadius: '50%',
                bgcolor: alpha('#00ED64', 0.15),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircle sx={{ color: '#00ED64', fontSize: compact ? 18 : 22 }} />
            </Box>
            <Box>
              <Typography variant={compact ? 'body2' : 'subtitle2'} sx={{ fontWeight: 600 }}>
                {connectionInfo?.name || 'Connected'}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                {connectionInfo?.database || 'database'}.{dataSource.collection}
              </Typography>
            </Box>
          </Box>
          <Tooltip title="Change connection">
            <IconButton size="small" onClick={onOpenFullSetup}>
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>
    );
  }

  // Not connected - show quick connect option
  return (
    <Paper
      elevation={0}
      sx={{
        border: '2px dashed',
        borderColor: showQuickConnect ? '#00ED64' : 'divider',
        borderRadius: 2,
        overflow: 'hidden',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Header - always visible */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: showQuickConnect ? alpha('#00ED64', 0.03) : 'transparent',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              bgcolor: alpha('#ff9800', 0.1),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <LinkOff sx={{ color: '#ff9800', fontSize: 20 }} />
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              No Database Connected
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Connect to MongoDB to store form submissions
            </Typography>
          </Box>
        </Box>

        {!showQuickConnect && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              onClick={onOpenFullSetup}
              sx={{ borderColor: 'divider' }}
            >
              Browse
            </Button>
            <Button
              size="small"
              variant="contained"
              startIcon={<Bolt />}
              onClick={() => setShowQuickConnect(true)}
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
          </Box>
        )}

        {showQuickConnect && (
          <IconButton size="small" onClick={() => setShowQuickConnect(false)}>
            <Close fontSize="small" />
          </IconButton>
        )}
      </Box>

      {/* Quick Connect Form */}
      <Collapse in={showQuickConnect}>
        <Box sx={{ p: 2, pt: 0, borderTop: '1px solid', borderColor: 'divider' }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {defaultOrgName && (
            <Chip
              size="small"
              label={`Organization: ${defaultOrgName}`}
              sx={{ mb: 2, bgcolor: alpha('#2196f3', 0.1) }}
            />
          )}

          <TextField
            fullWidth
            size="small"
            label="Connection Name (optional)"
            value={connectionName}
            onChange={(e) => setConnectionName(e.target.value)}
            placeholder="My MongoDB Connection"
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            size="small"
            label="MongoDB Connection String"
            value={connectionString}
            onChange={(e) => setConnectionString(e.target.value)}
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

          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              size="small"
              label="Database"
              value={database}
              onChange={(e) => setDatabase(e.target.value)}
              placeholder="my_database"
              required
              sx={{ flex: 1 }}
            />
            <TextField
              size="small"
              label="Collection"
              value={collection}
              onChange={(e) => setCollection(e.target.value)}
              placeholder="form_submissions"
              required
              sx={{ flex: 1 }}
            />
          </Box>

          {/* Test Result */}
          {testResult && (
            <Alert
              severity={testResult.success ? 'success' : 'error'}
              sx={{ mb: 2 }}
              icon={testResult.success ? <CheckCircle /> : <Error />}
            >
              {testResult.message}
            </Alert>
          )}

          {/* Actions */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={testing ? <CircularProgress size={14} /> : <PlayArrow />}
              onClick={handleTestConnection}
              disabled={testing || !connectionString || !database}
              sx={{ borderColor: '#00ED64', color: '#00ED64' }}
            >
              Test
            </Button>
            <Button
              size="small"
              variant="contained"
              startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <Storage />}
              onClick={handleQuickSave}
              disabled={saving || !connectionString || !database || !collection}
              sx={{
                background: 'linear-gradient(135deg, #00ED64 0%, #4DFF9F 100%)',
                color: '#001E2B',
                '&:hover': {
                  background: 'linear-gradient(135deg, #00CC55 0%, #3DFF8F 100%)',
                },
              }}
            >
              {saving ? 'Saving...' : 'Connect'}
            </Button>
          </Box>

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mt: 2, textAlign: 'center' }}
          >
            Your connection string is encrypted with AES-256 before storage
          </Typography>
        </Box>
      </Collapse>
    </Paper>
  );
}
