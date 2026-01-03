'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  CircularProgress,
  Tooltip,
  alpha,
  useTheme,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  TableChart as SheetsIcon,
  Storage as DatabaseIcon,
  Cloud as CloudIcon,
  Key as KeyIcon,
  Check as CheckIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import { useOrganization } from '@/contexts/OrganizationContext';

interface IntegrationCredential {
  credentialId: string;
  provider: string;
  name: string;
  description?: string;
  authType: string;
  status: string;
  lastUsedAt?: string;
  usageCount: number;
  oauthMetadata?: {
    connectedEmail?: string;
    scopes?: string[];
    expiresAt?: string;
  };
  serviceAccountMetadata?: {
    clientEmail?: string;
    projectId?: string;
  };
  createdAt: string;
}

const PROVIDER_CONFIG: Record<string, { name: string; icon: React.ReactNode; color: string }> = {
  google_sheets: { name: 'Google Sheets', icon: <SheetsIcon />, color: '#0F9D58' },
  google_drive: { name: 'Google Drive', icon: <CloudIcon />, color: '#4285F4' },
  google_calendar: { name: 'Google Calendar', icon: <ScheduleIcon />, color: '#4285F4' },
  slack: { name: 'Slack', icon: <CloudIcon />, color: '#4A154B' },
  notion: { name: 'Notion', icon: <DatabaseIcon />, color: '#000000' },
  mongodb_atlas: { name: 'MongoDB Atlas Admin API', icon: <DatabaseIcon />, color: '#00684A' },
  mongodb_atlas_data_api: { name: 'MongoDB Atlas Data API', icon: <DatabaseIcon />, color: '#00684A' },
  custom_api_key: { name: 'API Key', icon: <KeyIcon />, color: '#607D8B' },
};

export function IntegrationCredentialsSettings() {
  const theme = useTheme();
  const searchParams = useSearchParams();
  const { organization } = useOrganization();
  const [credentials, setCredentials] = useState<IntegrationCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Check for OAuth redirect results
  useEffect(() => {
    const successParam = searchParams.get('success');
    const errorParam = searchParams.get('error');

    if (successParam === 'google_connected') {
      setSuccess('Google account connected successfully!');
      // Clear URL params
      window.history.replaceState({}, '', '/settings?tab=integrations');
    }

    if (errorParam) {
      setError(decodeURIComponent(errorParam));
      window.history.replaceState({}, '', '/settings?tab=integrations');
    }
  }, [searchParams]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCredential, setSelectedCredential] = useState<IntegrationCredential | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formProvider, setFormProvider] = useState('google_sheets');
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formAuthType, setFormAuthType] = useState('oauth2'); // Default to OAuth for Google
  const [formServiceAccountJson, setFormServiceAccountJson] = useState('');
  const [formApiKey, setFormApiKey] = useState('');

  // MongoDB Atlas form state
  const [formAtlasOrgId, setFormAtlasOrgId] = useState('');
  const [formAtlasPublicKey, setFormAtlasPublicKey] = useState('');
  const [formAtlasPrivateKey, setFormAtlasPrivateKey] = useState('');
  const [formAtlasAppId, setFormAtlasAppId] = useState('');
  const [formAtlasDataApiKey, setFormAtlasDataApiKey] = useState('');
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Fetch credentials
  useEffect(() => {
    if (organization?.orgId) {
      fetchCredentials();
    }
  }, [organization?.orgId]);

  const fetchCredentials = async () => {
    if (!organization?.orgId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/organizations/${organization.orgId}/integrations`
      );
      const data = await response.json();

      if (data.success) {
        setCredentials(data.credentials);
      } else {
        setError(data.error || 'Failed to load credentials');
      }
    } catch (err) {
      setError('Failed to load integration credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!organization?.orgId) return;

    setSaving(true);
    setError(null);

    try {
      let credentialsPayload: Record<string, unknown> = {};

      if (formAuthType === 'service_account') {
        // Parse service account JSON
        try {
          const parsed = JSON.parse(formServiceAccountJson);
          credentialsPayload = {
            type: 'service_account',
            projectId: parsed.project_id,
            privateKeyId: parsed.private_key_id,
            privateKey: parsed.private_key,
            clientEmail: parsed.client_email,
            clientId: parsed.client_id,
            authUri: parsed.auth_uri,
            tokenUri: parsed.token_uri,
          };
        } catch {
          setError('Invalid service account JSON format');
          setSaving(false);
          return;
        }
      } else if (formAuthType === 'api_key') {
        // Handle different API key types based on provider
        if (formProvider === 'mongodb_atlas') {
          credentialsPayload = {
            publicKey: formAtlasPublicKey,
            privateKey: formAtlasPrivateKey,
            atlasOrgId: formAtlasOrgId,
          };
        } else if (formProvider === 'mongodb_atlas_data_api') {
          credentialsPayload = {
            appId: formAtlasAppId,
            apiKey: formAtlasDataApiKey,
          };
        } else {
          credentialsPayload = {
            apiKey: formApiKey,
          };
        }
      }

      // Add Atlas metadata if applicable
      const atlasMetadata = formProvider === 'mongodb_atlas' ? {
        atlasOrgId: formAtlasOrgId,
      } : undefined;

      const response = await fetch(
        `/api/organizations/${organization.orgId}/integrations`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: formProvider,
            name: formName,
            description: formDescription,
            authType: formAuthType,
            credentials: credentialsPayload,
            ...(atlasMetadata && { atlasMetadata }),
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setDialogOpen(false);
        resetForm();
        fetchCredentials();
      } else {
        setError(data.error || 'Failed to create credential');
      }
    } catch (err) {
      setError('Failed to create integration credential');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!organization?.orgId || !selectedCredential) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/organizations/${organization.orgId}/integrations/${selectedCredential.credentialId}`,
        { method: 'DELETE' }
      );

      const data = await response.json();

      if (data.success) {
        setDeleteDialogOpen(false);
        setSelectedCredential(null);
        fetchCredentials();
      } else {
        setError(data.error || 'Failed to delete credential');
      }
    } catch (err) {
      setError('Failed to delete integration credential');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormProvider('google_sheets');
    setFormName('');
    setFormDescription('');
    setFormAuthType('oauth2'); // Default to OAuth for Google
    setFormServiceAccountJson('');
    setFormApiKey('');
    // Reset Atlas fields
    setFormAtlasOrgId('');
    setFormAtlasPublicKey('');
    setFormAtlasPrivateKey('');
    setFormAtlasAppId('');
    setFormAtlasDataApiKey('');
    setConnectionTestResult(null);
  };

  // Test Atlas connection
  const handleTestAtlasConnection = async () => {
    if (!organization?.orgId) return;

    setTestingConnection(true);
    setConnectionTestResult(null);

    try {
      const response = await fetch(
        `/api/organizations/${organization.orgId}/integrations/test-atlas`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            publicKey: formAtlasPublicKey,
            privateKey: formAtlasPrivateKey,
            atlasOrgId: formAtlasOrgId,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setConnectionTestResult({
          success: true,
          message: 'Successfully connected to MongoDB Atlas!',
        });
      } else {
        setConnectionTestResult({
          success: false,
          message: data.error || 'Failed to connect to Atlas',
        });
      }
    } catch (err) {
      setConnectionTestResult({
        success: false,
        message: 'Failed to test connection',
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return theme.palette.success.main;
      case 'expired':
        return theme.palette.warning.main;
      case 'error':
      case 'revoked':
        return theme.palette.error.main;
      default:
        return theme.palette.grey[500];
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress sx={{ color: '#00ED64' }} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Integration Credentials
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage credentials for external services like Google Sheets, Slack, etc.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
          sx={{
            bgcolor: '#00ED64',
            color: '#001E2B',
            '&:hover': { bgcolor: '#00C853' },
          }}
        >
          Add Credential
        </Button>
      </Box>

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Credentials List */}
      {credentials.length === 0 ? (
        <Card
          variant="outlined"
          sx={{
            p: 4,
            textAlign: 'center',
            borderStyle: 'dashed',
          }}
        >
          <KeyIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No Integration Credentials
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Add credentials to connect your workflows to external services like Google Sheets.
          </Typography>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setDialogOpen(true)}
          >
            Add Your First Credential
          </Button>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {credentials.map((credential) => {
            const providerConfig = PROVIDER_CONFIG[credential.provider] || {
              name: credential.provider,
              icon: <KeyIcon />,
              color: '#607D8B',
            };

            return (
              <Card key={credential.credentialId} variant="outlined">
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {/* Provider Icon */}
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      bgcolor: alpha(providerConfig.color, 0.1),
                      color: providerConfig.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {providerConfig.icon}
                  </Box>

                  {/* Details */}
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {credential.name}
                      </Typography>
                      <Chip
                        label={credential.status}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.7rem',
                          bgcolor: alpha(getStatusColor(credential.status), 0.1),
                          color: getStatusColor(credential.status),
                        }}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {providerConfig.name} • {credential.authType === 'service_account' ? 'Service Account' : credential.authType === 'oauth2' ? 'OAuth2' : 'API Key'}
                    </Typography>
                    {credential.serviceAccountMetadata?.clientEmail && (
                      <Typography
                        variant="caption"
                        sx={{ fontFamily: 'monospace', color: 'text.secondary' }}
                      >
                        {credential.serviceAccountMetadata.clientEmail}
                      </Typography>
                    )}
                    {credential.oauthMetadata?.connectedEmail && (
                      <Typography
                        variant="caption"
                        sx={{ fontFamily: 'monospace', color: 'text.secondary' }}
                      >
                        {credential.oauthMetadata.connectedEmail}
                      </Typography>
                    )}
                  </Box>

                  {/* Usage Stats */}
                  <Box sx={{ textAlign: 'right', mr: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Used {credential.usageCount} times
                    </Typography>
                    {credential.lastUsedAt && (
                      <Typography variant="caption" color="text.secondary">
                        Last: {new Date(credential.lastUsedAt).toLocaleDateString()}
                      </Typography>
                    )}
                  </Box>

                  {/* Copy ID */}
                  <Tooltip title="Copy Credential ID">
                    <IconButton
                      size="small"
                      onClick={() => copyToClipboard(credential.credentialId)}
                    >
                      <CopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>

                  {/* Delete */}
                  <Tooltip title="Delete">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => {
                        setSelectedCredential(credential);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Integration Credential</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Provider</InputLabel>
              <Select
                value={formProvider}
                label="Provider"
                onChange={(e) => {
                  const newProvider = e.target.value;
                  setFormProvider(newProvider);
                  setConnectionTestResult(null);
                  // Default auth type based on provider
                  if (newProvider.startsWith('google_')) {
                    setFormAuthType('oauth2');
                  } else if (newProvider.startsWith('mongodb_atlas')) {
                    setFormAuthType('api_key');
                  } else {
                    setFormAuthType('api_key');
                  }
                }}
              >
                <MenuItem value="google_sheets">Google Sheets</MenuItem>
                <MenuItem value="google_drive">Google Drive</MenuItem>
                <MenuItem value="google_calendar">Google Calendar</MenuItem>
                <MenuItem value="slack">Slack</MenuItem>
                <MenuItem value="notion">Notion</MenuItem>
                <MenuItem value="mongodb_atlas">MongoDB Atlas (Admin API)</MenuItem>
                <MenuItem value="mongodb_atlas_data_api">MongoDB Atlas (Data API)</MenuItem>
                <MenuItem value="custom_api_key">Custom API Key</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              size="small"
              label="Name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g., Production Google Sheets"
            />

            <TextField
              fullWidth
              size="small"
              label="Description (optional)"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="e.g., For syncing form responses"
            />

            {/* Provider-specific configuration */}
            {formProvider.startsWith('google_') && (
              <>
                <FormControl fullWidth size="small">
                  <InputLabel>Authentication Type</InputLabel>
                  <Select
                    value={formAuthType}
                    label="Authentication Type"
                    onChange={(e) => setFormAuthType(e.target.value)}
                  >
                    <MenuItem value="oauth2">Connect with Google (Recommended)</MenuItem>
                    <MenuItem value="service_account">Service Account (JSON Key)</MenuItem>
                  </Select>
                </FormControl>

                <Divider />

                {formAuthType === 'oauth2' && (
                  <Box sx={{ textAlign: 'center', py: 2 }}>
                    <Alert severity="info" sx={{ mb: 2, textAlign: 'left' }}>
                      Click the button below to sign in with your Google account. You&apos;ll be asked to grant access to Google Sheets.
                    </Alert>
                    <Button
                      variant="contained"
                      size="large"
                      onClick={() => {
                        if (!organization?.orgId || !formName) {
                          setError('Please enter a name for this connection');
                          return;
                        }
                        // Redirect to OAuth flow
                        window.location.href = `/api/auth/google?provider=${formProvider}&orgId=${organization.orgId}&name=${encodeURIComponent(formName)}`;
                      }}
                      disabled={!formName}
                      sx={{
                        bgcolor: '#4285F4',
                        color: 'white',
                        textTransform: 'none',
                        px: 4,
                        py: 1.5,
                        fontSize: '1rem',
                        '&:hover': { bgcolor: '#3367D6' },
                      }}
                      startIcon={
                        <Box
                          component="img"
                          src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                          alt="Google"
                          sx={{ width: 20, height: 20, bgcolor: 'white', borderRadius: '50%', p: 0.25 }}
                        />
                      }
                    >
                      Sign in with Google
                    </Button>
                    {!formName && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        Enter a name above before connecting
                      </Typography>
                    )}
                  </Box>
                )}

                {formAuthType === 'service_account' && (
                  <>
                    <Alert severity="warning" sx={{ fontSize: '0.85rem' }}>
                      <strong>Note:</strong> Service Account keys may be blocked by your organization&apos;s security policy.
                      If you can&apos;t create keys, use &quot;Connect with Google&quot; instead.
                    </Alert>
                    <Alert severity="info" sx={{ fontSize: '0.85rem' }}>
                      <strong>Google Service Account Setup:</strong>
                      <ol style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                        <li>Go to <a href="https://console.cloud.google.com/iam-admin/serviceaccounts" target="_blank" rel="noopener noreferrer">Google Cloud Console</a></li>
                        <li>Create a service account or use existing</li>
                        <li>Create a JSON key for the service account</li>
                        <li>Enable the Google Sheets API in your project</li>
                        <li>Share your spreadsheet with the service account email</li>
                      </ol>
                    </Alert>
                    <TextField
                      fullWidth
                      multiline
                      rows={8}
                      label="Service Account JSON"
                      value={formServiceAccountJson}
                      onChange={(e) => setFormServiceAccountJson(e.target.value)}
                      placeholder='Paste the entire JSON key file contents here...'
                      sx={{
                        '& .MuiInputBase-input': {
                          fontFamily: 'monospace',
                          fontSize: '0.8rem',
                        },
                      }}
                    />
                  </>
                )}
              </>
            )}

            {/* MongoDB Atlas Admin API Configuration */}
            {formProvider === 'mongodb_atlas' && (
              <>
                <Alert severity="info" sx={{ fontSize: '0.85rem' }}>
                  <strong>MongoDB Atlas Admin API Setup:</strong>
                  <ol style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                    <li>Go to <a href="https://cloud.mongodb.com" target="_blank" rel="noopener noreferrer">MongoDB Atlas</a></li>
                    <li>Navigate to Organization Settings → API Keys</li>
                    <li>Create an API Key with &quot;Organization Project Creator&quot; role (or higher)</li>
                    <li>Copy your Organization ID from the URL or settings</li>
                    <li>Save the Public and Private keys (Private key is shown only once)</li>
                  </ol>
                </Alert>
                <TextField
                  fullWidth
                  size="small"
                  label="Atlas Organization ID"
                  value={formAtlasOrgId}
                  onChange={(e) => setFormAtlasOrgId(e.target.value)}
                  placeholder="e.g., 5f1234567890abcdef123456"
                  helperText="Found in Organization Settings or the URL"
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Public Key"
                  value={formAtlasPublicKey}
                  onChange={(e) => setFormAtlasPublicKey(e.target.value)}
                  placeholder="e.g., abcdefgh"
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Private Key"
                  type="password"
                  value={formAtlasPrivateKey}
                  onChange={(e) => setFormAtlasPrivateKey(e.target.value)}
                  placeholder="Enter your private key"
                  helperText="The private key is only shown once when you create the API key"
                />
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Button
                    variant="outlined"
                    onClick={handleTestAtlasConnection}
                    disabled={!formAtlasOrgId || !formAtlasPublicKey || !formAtlasPrivateKey || testingConnection}
                    startIcon={testingConnection ? <CircularProgress size={16} /> : null}
                  >
                    {testingConnection ? 'Testing...' : 'Test Connection'}
                  </Button>
                  {connectionTestResult && (
                    <Alert
                      severity={connectionTestResult.success ? 'success' : 'error'}
                      sx={{ flex: 1, py: 0 }}
                    >
                      {connectionTestResult.message}
                    </Alert>
                  )}
                </Box>
              </>
            )}

            {/* MongoDB Atlas Data API Configuration */}
            {formProvider === 'mongodb_atlas_data_api' && (
              <>
                <Alert severity="info" sx={{ fontSize: '0.85rem' }}>
                  <strong>MongoDB Atlas Data API Setup:</strong>
                  <ol style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                    <li>Go to <a href="https://cloud.mongodb.com" target="_blank" rel="noopener noreferrer">MongoDB Atlas</a></li>
                    <li>Navigate to your Project → App Services</li>
                    <li>Create or select a Data API application</li>
                    <li>Enable the Data API and create an API key</li>
                    <li>Copy the App ID and API Key</li>
                  </ol>
                </Alert>
                <TextField
                  fullWidth
                  size="small"
                  label="Data API App ID"
                  value={formAtlasAppId}
                  onChange={(e) => setFormAtlasAppId(e.target.value)}
                  placeholder="e.g., data-abcde"
                  helperText="Found in your App Services configuration"
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Data API Key"
                  type="password"
                  value={formAtlasDataApiKey}
                  onChange={(e) => setFormAtlasDataApiKey(e.target.value)}
                  placeholder="Enter your Data API key"
                />
              </>
            )}

            {/* Generic API Key providers */}
            {!formProvider.startsWith('google_') && !formProvider.startsWith('mongodb_atlas') && (
              <>
                <FormControl fullWidth size="small">
                  <InputLabel>Authentication Type</InputLabel>
                  <Select
                    value={formAuthType}
                    label="Authentication Type"
                    onChange={(e) => setFormAuthType(e.target.value)}
                  >
                    <MenuItem value="api_key">API Key</MenuItem>
                  </Select>
                </FormControl>
                <Divider />
                <TextField
                  fullWidth
                  size="small"
                  label="API Key"
                  type="password"
                  value={formApiKey}
                  onChange={(e) => setFormApiKey(e.target.value)}
                  placeholder="Enter your API key"
                />
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={
              saving ||
              !formName ||
              (formAuthType === 'service_account' && !formServiceAccountJson) ||
              (formProvider === 'mongodb_atlas' && (!formAtlasOrgId || !formAtlasPublicKey || !formAtlasPrivateKey)) ||
              (formProvider === 'mongodb_atlas_data_api' && (!formAtlasAppId || !formAtlasDataApiKey)) ||
              (formAuthType === 'api_key' && !formProvider.startsWith('mongodb_atlas') && !formApiKey)
            }
            sx={{
              bgcolor: '#00ED64',
              color: '#001E2B',
              '&:hover': { bgcolor: '#00C853' },
            }}
          >
            {saving ? <CircularProgress size={20} /> : 'Add Credential'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Credential?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete &quot;{selectedCredential?.name}&quot;? This action cannot be undone.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Any workflows using this credential will fail until a new credential is configured.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={saving}
          >
            {saving ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default IntegrationCredentialsSettings;
