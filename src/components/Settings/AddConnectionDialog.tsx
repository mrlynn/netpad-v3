'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  TextField,
  Alert,
  CircularProgress,
  alpha,
  IconButton,
  Chip,
  Collapse,
  Autocomplete,
} from '@mui/material';
import {
  Lock,
  Visibility,
  VisibilityOff,
  PlayArrow,
  CheckCircle,
  Error,
  Close,
} from '@mui/icons-material';
import { ProjectSelector } from '@/components/Projects/ProjectSelector';

interface AddConnectionDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (connection: {
    vaultId: string;
    name: string;
    database: string;
    allowedCollections: string[];
  }) => void;
  organizationId: string;
  organizationName?: string;
  projectId?: string; // Optional: if provided, use this project instead of showing selector
}

export function AddConnectionDialog({
  open,
  onClose,
  onSuccess,
  organizationId,
  organizationName,
  projectId: propProjectId,
}: AddConnectionDialogProps) {
  const [connectionName, setConnectionName] = useState('');
  const [connectionDescription, setConnectionDescription] = useState('');
  const [connectionString, setConnectionString] = useState('');
  const [database, setDatabase] = useState('');
  const [allowedCollections, setAllowedCollections] = useState<string[]>([]);
  const [showConnectionString, setShowConnectionString] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(propProjectId || '');

  // Test connection
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    collections?: string[];
    error?: string;
  } | null>(null);

  // Available collections from test
  const [availableCollections, setAvailableCollections] = useState<string[]>([]);

  const handleTestConnection = async () => {
    if (!connectionString || !database) {
      setTestResult({
        success: false,
        error: 'Connection string and database are required',
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
        setTestResult({ success: true, collections: data.collections });
        setAvailableCollections(data.collections || []);
      } else {
        setTestResult({
          success: false,
          error: data.error || 'Connection test failed',
        });
      }
    } catch (err) {
      setTestResult({ success: false, error: 'Failed to test connection' });
    } finally {
      setTesting(false);
    }
  };

  const handleCreateConnection = async () => {
    if (!connectionName || !connectionString || !database) {
      setCreateError('Name, connection string, and database are required');
      return;
    }

    const projectIdToUse = propProjectId || selectedProjectId;
    if (!projectIdToUse) {
      setCreateError('Please select a project');
      return;
    }

    try {
      setCreating(true);
      setCreateError(null);

      const response = await fetch(`/api/organizations/${organizationId}/vault`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: connectionName,
          description: connectionDescription,
          connectionString,
          database,
          allowedCollections,
          projectId: projectIdToUse,
          testFirst: true,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        onSuccess({
          vaultId: data.connection.vaultId,
          name: connectionName,
          database,
          allowedCollections,
        });
        resetForm();
        onClose();
      } else {
        setCreateError(data.error || 'Failed to create connection');
      }
    } catch (err) {
      setCreateError('Failed to connect to server');
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setConnectionName('');
    setConnectionDescription('');
    setConnectionString('');
    setDatabase('');
    setAllowedCollections([]);
    setTestResult(null);
    setAvailableCollections([]);
    setCreateError(null);
    setSelectedProjectId('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                background: 'linear-gradient(135deg, #00ED64 0%, #4DFF9F 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Lock sx={{ color: '#001E2B' }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Add New Connection
              </Typography>
              {organizationName && (
                <Typography variant="caption" color="text.secondary">
                  For: {organizationName}
                </Typography>
              )}
            </Box>
          </Box>
          <IconButton onClick={handleClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 3 }}>
          Connection strings are encrypted with AES-256 before storage. They are only
          decrypted server-side when processing form submissions.
        </Alert>

        {createError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setCreateError(null)}>
            {createError}
          </Alert>
        )}

        {!propProjectId && (
          <Box sx={{ mb: 2 }}>
            <ProjectSelector
              organizationId={organizationId}
              value={selectedProjectId}
              onChange={setSelectedProjectId}
              required
              label="Project"
              helperText="Select a project for this connection"
            />
          </Box>
        )}

        <TextField
          autoFocus
          label="Connection Name"
          fullWidth
          value={connectionName}
          onChange={(e) => setConnectionName(e.target.value)}
          placeholder="Production Database"
          sx={{ mb: 2 }}
          required
        />

        <TextField
          label="Description (optional)"
          fullWidth
          value={connectionDescription}
          onChange={(e) => setConnectionDescription(e.target.value)}
          placeholder="Main production MongoDB cluster"
          sx={{ mb: 2 }}
        />

        <TextField
          label="MongoDB Connection String"
          fullWidth
          value={connectionString}
          onChange={(e) => setConnectionString(e.target.value)}
          type={showConnectionString ? 'text' : 'password'}
          placeholder="mongodb+srv://user:pass@cluster.mongodb.net/"
          sx={{ mb: 2 }}
          required
          InputProps={{
            endAdornment: (
              <IconButton
                onClick={() => setShowConnectionString(!showConnectionString)}
                edge="end"
              >
                {showConnectionString ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            ),
          }}
        />

        <TextField
          label="Database Name"
          fullWidth
          value={database}
          onChange={(e) => setDatabase(e.target.value)}
          placeholder="my_database"
          sx={{ mb: 2 }}
          required
        />

        <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
          <Button
            variant="outlined"
            startIcon={testing ? <CircularProgress size={16} /> : <PlayArrow />}
            onClick={handleTestConnection}
            disabled={testing || !connectionString || !database}
            sx={{ borderColor: '#00ED64', color: '#00ED64' }}
          >
            Test Connection
          </Button>
          {testResult && (
            <Chip
              icon={testResult.success ? <CheckCircle /> : <Error />}
              label={
                testResult.success
                  ? `Connected! (${testResult.collections?.length || 0} collections)`
                  : testResult.error
              }
              color={testResult.success ? 'success' : 'error'}
              variant="outlined"
              sx={{ maxWidth: 300 }}
            />
          )}
        </Box>

        <Collapse in={availableCollections.length > 0}>
          <Autocomplete
            multiple
            options={availableCollections}
            value={allowedCollections}
            onChange={(_, newValue) => setAllowedCollections(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Allowed Collections (optional)"
                placeholder="Select collections"
                helperText="Leave empty to allow all collections. Restricting collections adds a layer of security."
              />
            )}
          />
        </Collapse>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          onClick={handleCreateConnection}
          variant="contained"
          disabled={creating || !connectionName || !connectionString || !database || !(propProjectId || selectedProjectId)}
          startIcon={creating ? <CircularProgress size={16} color="inherit" /> : <Lock />}
          sx={{
            background: 'linear-gradient(135deg, #00ED64 0%, #4DFF9F 100%)',
            color: '#001E2B',
            '&:hover': {
              background: 'linear-gradient(135deg, #00CC55 0%, #3DFF8F 100%)',
            },
          }}
        >
          {creating ? 'Saving...' : 'Save Connection'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
