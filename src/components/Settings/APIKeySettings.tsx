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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Divider,
  Paper,
} from '@mui/material';
import {
  Add,
  Key,
  ContentCopy,
  Delete,
  Visibility,
  VisibilityOff,
  CheckCircle,
  Warning,
  Schedule,
} from '@mui/icons-material';

interface APIKeyListItem {
  id: string;
  name: string;
  description?: string;
  keyPrefix: string;
  permissions: string[];
  environment: 'live' | 'test';
  status: 'active' | 'revoked' | 'expired';
  lastUsedAt?: string;
  usageCount: number;
  createdAt: string;
  expiresAt?: string;
}

interface CreateAPIKeyForm {
  name: string;
  description: string;
  permissions: string[];
  environment: 'live' | 'test';
  expiresIn?: number;
}

const PERMISSIONS = [
  { value: 'forms:read', label: 'Read Forms', description: 'View form definitions' },
  { value: 'forms:write', label: 'Write Forms', description: 'Create and update forms' },
  { value: 'forms:delete', label: 'Delete Forms', description: 'Delete forms' },
  { value: 'submissions:read', label: 'Read Submissions', description: 'View form submissions' },
  { value: 'submissions:write', label: 'Write Submissions', description: 'Create submissions' },
  { value: 'submissions:delete', label: 'Delete Submissions', description: 'Delete submissions' },
  { value: 'analytics:read', label: 'Read Analytics', description: 'View analytics data' },
  { value: 'webhooks:manage', label: 'Manage Webhooks', description: 'Configure webhooks' },
];

const EXPIRATION_OPTIONS = [
  { value: 0, label: 'Never expires' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
  { value: 180, label: '6 months' },
  { value: 365, label: '1 year' },
];

export function APIKeySettings() {
  const [apiKeys, setApiKeys] = useState<APIKeyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState<CreateAPIKeyForm>({
    name: '',
    description: '',
    permissions: ['forms:read', 'submissions:read'],
    environment: 'live',
    expiresIn: 0,
  });

  // New key display state
  const [newKey, setNewKey] = useState<{ key: string; name: string } | null>(null);
  const [keyCopied, setKeyCopied] = useState(false);

  useEffect(() => {
    fetchAPIKeys();
  }, []);

  const fetchAPIKeys = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/api-keys');
      const data = await response.json();

      if (response.ok && data.success) {
        setApiKeys(data.data || []);
      } else {
        setError(data.error || 'Failed to load API keys');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async () => {
    if (!createForm.name.trim()) {
      return;
    }

    try {
      setCreating(true);

      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createForm.name,
          description: createForm.description || undefined,
          permissions: createForm.permissions,
          environment: createForm.environment,
          expiresIn: createForm.expiresIn || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setNewKey({ key: data.apiKey.key, name: data.apiKey.name });
        setCreateDialogOpen(false);
        setCreateForm({
          name: '',
          description: '',
          permissions: ['forms:read', 'submissions:read'],
          environment: 'live',
          expiresIn: 0,
        });
        fetchAPIKeys();
      } else {
        setError(data.error || 'Failed to create API key');
      }
    } catch (err) {
      setError('Failed to create API key');
    } finally {
      setCreating(false);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/api-keys/${keyId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchAPIKeys();
      }
    } catch (err) {
      console.error('Failed to revoke API key:', err);
    }
  };

  const handleCopyKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setKeyCopied(true);
      setTimeout(() => setKeyCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const togglePermission = (permission: string) => {
    setCreateForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((p) => p !== permission)
        : [...prev.permissions, permission],
    }));
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return { bg: alpha('#00ED64', 0.1), color: '#00ED64' };
      case 'revoked':
        return { bg: alpha('#f44336', 0.1), color: '#f44336' };
      case 'expired':
        return { bg: alpha('#ff9800', 0.1), color: '#ff9800' };
      default:
        return { bg: alpha('#9e9e9e', 0.1), color: '#9e9e9e' };
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            API Keys
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create and manage API keys for programmatic access to your forms
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setCreateDialogOpen(true)}
          sx={{
            bgcolor: '#00ED64',
            color: '#001E2B',
            fontWeight: 600,
            '&:hover': { bgcolor: '#00c853' },
          }}
        >
          Create API Key
        </Button>
      </Box>

      {/* Documentation Link */}
      <Alert
        severity="info"
        sx={{
          mb: 3,
          bgcolor: alpha('#2196f3', 0.1),
          '& .MuiAlert-icon': { color: '#2196f3' },
        }}
      >
        <Typography variant="body2">
          View the{' '}
          <a
            href="/api/docs"
            style={{ color: '#00ED64', fontWeight: 500 }}
          >
            interactive API documentation
          </a>
          {' '}or download the{' '}
          <a
            href="/api/v1/openapi.json"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#00ED64', fontWeight: 500 }}
          >
            OpenAPI spec
          </a>
          {' '}for use with Postman, Swagger, or code generators.
        </Typography>
      </Alert>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress sx={{ color: '#00ED64' }} />
        </Box>
      ) : apiKeys.length === 0 ? (
        <Card
          sx={{
            border: '2px dashed',
            borderColor: 'divider',
            bgcolor: 'transparent',
            textAlign: 'center',
            py: 6,
          }}
        >
          <Key sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No API keys yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Create an API key to programmatically access your forms and submissions.
          </Typography>
          <Button
            variant="outlined"
            startIcon={<Add />}
            onClick={() => setCreateDialogOpen(true)}
            sx={{ borderColor: '#00ED64', color: '#00ED64' }}
          >
            Create Your First API Key
          </Button>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {apiKeys.map((key) => {
            const statusColors = getStatusColor(key.status);
            return (
              <Grid item xs={12} key={key.id}>
                <Card
                  sx={{
                    border: '1px solid',
                    borderColor: key.status === 'active' ? 'divider' : alpha('#f44336', 0.3),
                    transition: 'border-color 0.2s',
                    '&:hover': {
                      borderColor: key.status === 'active' ? '#00ED64' : undefined,
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
                          <Key sx={{ color: '#00ED64' }} />
                        </Box>
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                              {key.name}
                            </Typography>
                            <Chip
                              label={key.status}
                              size="small"
                              sx={{
                                bgcolor: statusColors.bg,
                                color: statusColors.color,
                                fontWeight: 500,
                                textTransform: 'capitalize',
                              }}
                            />
                            <Chip
                              label={key.environment}
                              size="small"
                              variant="outlined"
                              sx={{
                                borderColor: key.environment === 'live' ? '#00ED64' : '#ff9800',
                                color: key.environment === 'live' ? '#00ED64' : '#ff9800',
                                fontWeight: 500,
                              }}
                            />
                          </Box>
                          {key.description && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                              {key.description}
                            </Typography>
                          )}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                            <Typography
                              variant="body2"
                              sx={{
                                fontFamily: 'monospace',
                                bgcolor: alpha('#000', 0.3),
                                px: 1,
                                py: 0.5,
                                borderRadius: 1,
                              }}
                            >
                              {key.keyPrefix}...
                            </Typography>
                          </Box>
                        </Box>
                      </Box>

                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {key.status === 'active' && (
                          <Tooltip title="Revoke key">
                            <IconButton
                              size="small"
                              onClick={() => handleRevokeKey(key.id)}
                              sx={{ color: 'error.main' }}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Permissions
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                          {key.permissions.map((perm) => (
                            <Chip
                              key={perm}
                              label={perm}
                              size="small"
                              sx={{
                                fontSize: '0.7rem',
                                height: 20,
                                bgcolor: alpha('#00ED64', 0.1),
                                color: '#00ED64',
                              }}
                            />
                          ))}
                        </Box>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Last Used
                        </Typography>
                        <Typography variant="body2">
                          {formatDate(key.lastUsedAt)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Usage Count
                        </Typography>
                        <Typography variant="body2">
                          {key.usageCount} requests
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Created
                        </Typography>
                        <Typography variant="body2">
                          {formatDate(key.createdAt)}
                        </Typography>
                      </Box>
                      {key.expiresAt && (
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Expires
                          </Typography>
                          <Typography variant="body2">
                            {formatDate(key.expiresAt)}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Create API Key Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600 }}>Create API Key</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
            <TextField
              label="Name"
              value={createForm.name}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Production API Key"
              fullWidth
              required
            />

            <TextField
              label="Description (optional)"
              value={createForm.description}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="What will this key be used for?"
              fullWidth
              multiline
              rows={2}
            />

            <FormControl fullWidth>
              <InputLabel>Environment</InputLabel>
              <Select
                value={createForm.environment}
                label="Environment"
                onChange={(e) => setCreateForm((prev) => ({
                  ...prev,
                  environment: e.target.value as 'live' | 'test'
                }))}
              >
                <MenuItem value="live">Live (Production)</MenuItem>
                <MenuItem value="test">Test (Development)</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Expiration</InputLabel>
              <Select
                value={createForm.expiresIn || 0}
                label="Expiration"
                onChange={(e) => setCreateForm((prev) => ({
                  ...prev,
                  expiresIn: e.target.value as number
                }))}
              >
                {EXPIRATION_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Permissions
              </Typography>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <FormGroup>
                  {PERMISSIONS.map((perm) => (
                    <FormControlLabel
                      key={perm.value}
                      control={
                        <Checkbox
                          checked={createForm.permissions.includes(perm.value)}
                          onChange={() => togglePermission(perm.value)}
                          sx={{
                            color: '#00ED64',
                            '&.Mui-checked': { color: '#00ED64' },
                          }}
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body2">{perm.label}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {perm.description}
                          </Typography>
                        </Box>
                      }
                    />
                  ))}
                </FormGroup>
              </Paper>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => setCreateDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateKey}
            disabled={!createForm.name.trim() || createForm.permissions.length === 0 || creating}
            sx={{
              bgcolor: '#00ED64',
              color: '#001E2B',
              '&:hover': { bgcolor: '#00c853' },
            }}
          >
            {creating ? <CircularProgress size={20} /> : 'Create Key'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* New Key Display Dialog */}
      <Dialog
        open={!!newKey}
        onClose={() => setNewKey(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckCircle sx={{ color: '#00ED64' }} />
          API Key Created
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Make sure to copy your API key now. You won't be able to see it again!
            </Typography>
          </Alert>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Your new API key for <strong>{newKey?.name}</strong>:
          </Typography>

          <Paper
            sx={{
              p: 2,
              bgcolor: alpha('#000', 0.3),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <Typography
              sx={{
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                wordBreak: 'break-all',
              }}
            >
              {newKey?.key}
            </Typography>
            <Tooltip title={keyCopied ? 'Copied!' : 'Copy to clipboard'}>
              <IconButton
                onClick={() => handleCopyKey(newKey?.key || '')}
                sx={{ color: keyCopied ? '#00ED64' : 'inherit' }}
              >
                {keyCopied ? <CheckCircle /> : <ContentCopy />}
              </IconButton>
            </Tooltip>
          </Paper>

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
            Use this key in the Authorization header: <code>Bearer {'{your-api-key}'}</code>
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button
            variant="contained"
            onClick={() => setNewKey(null)}
            sx={{
              bgcolor: '#00ED64',
              color: '#001E2B',
              '&:hover': { bgcolor: '#00c853' },
            }}
          >
            I've Saved My Key
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
