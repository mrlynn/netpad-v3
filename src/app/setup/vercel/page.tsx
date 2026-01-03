'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Button,
  Alert,
  TextField,
  CircularProgress,
  Chip,
  alpha,
  Divider,
  IconButton,
  Tooltip,
  Grid,
} from '@mui/material';
import {
  Cloud,
  Storage,
  Check,
  ContentCopy,
  Visibility,
  VisibilityOff,
  Refresh,
  CheckCircle,
  ArrowForward,
} from '@mui/icons-material';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useClusterProvisioning } from '@/hooks/useClusterProvisioning';

interface EnvVar {
  value: string;
  description: string;
  required: boolean;
}

interface EnvVarsData {
  MONGODB_URI: EnvVar;
  MONGODB_DATABASE: EnvVar;
  SESSION_SECRET: EnvVar;
  VAULT_ENCRYPTION_KEY: EnvVar;
  NEXT_PUBLIC_APP_URL: EnvVar;
  APP_URL?: EnvVar;
  OPENAI_API_KEY?: EnvVar;
  BLOB_READ_WRITE_TOKEN?: EnvVar;
}

interface ConnectionInfo {
  vaultId: string;
  name: string;
  database: string;
  allowedCollections: string[];
}

const steps = [
  'Connect MongoDB',
  'Configure Environment',
  'Deploy & Verify',
];

function VercelSetupContent() {
  const searchParams = useSearchParams();
  const installationId = searchParams.get('installation_id');
  const error = searchParams.get('error');

  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { currentOrgId } = useOrganization();
  const { status: clusterStatus, loading: clusterLoading } = useClusterProvisioning(currentOrgId || undefined);

  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [envVars, setEnvVars] = useState<EnvVarsData | null>(null);
  const [mongoUri, setMongoUri] = useState('');
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [provisioningStatus, setProvisioningStatus] = useState<string | null>(null);

  // Existing database state
  const [hasExistingDatabase, setHasExistingDatabase] = useState(false);
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo | null>(null);
  const [connectionString, setConnectionString] = useState<string | null>(null);
  const [loadingConnectionString, setLoadingConnectionString] = useState(false);

  // State for bulk copy view
  const [showBulkView, setShowBulkView] = useState(false);

  // Check for existing database when user is logged in
  useEffect(() => {
    const checkExistingDatabase = async () => {
      if (!isAuthenticated || !currentOrgId) return;

      try {
        // Check cluster status
        const isReady = clusterStatus?.status === 'ready';

        if (isReady) {
          setHasExistingDatabase(true);

          // Fetch connection info
          const vaultResponse = await fetch(`/api/organizations/${currentOrgId}/vault`);
          const vaultData = await vaultResponse.json();

          if (vaultResponse.ok && vaultData.connections && vaultData.connections.length > 0) {
            // Find the connection for the auto-provisioned cluster
            let conn = vaultData.connections.find(
              (c: ConnectionInfo) => c.vaultId === clusterStatus?.vaultId
            );

            // Fallback to first auto-provisioned connection
            if (!conn) {
              conn = vaultData.connections.find(
                (c: ConnectionInfo) =>
                  c.name?.includes('Auto-provisioned') || c.name?.includes('Default Database')
              );
            }

            // Or just use first connection
            if (!conn && vaultData.connections.length > 0) {
              conn = vaultData.connections[0];
            }

            if (conn) {
              setConnectionInfo(conn);
            }
          }

          // Fetch env vars with organization context
          const envResponse = await fetch(`/api/integrations/vercel/env?organizationId=${currentOrgId}`);
          const envData = await envResponse.json();

          if (envData.success && envData.envVars) {
            setEnvVars(envData.envVars);
          }
        }
      } catch (err) {
        console.error('Failed to check existing database:', err);
      }
    };

    checkExistingDatabase();
  }, [isAuthenticated, currentOrgId, clusterStatus]);

  // Fetch environment variables template (for non-logged-in users)
  useEffect(() => {
    const fetchEnvVars = async () => {
      if (hasExistingDatabase) return; // Already fetched with org context

      try {
        const response = await fetch('/api/integrations/vercel/env');
        const data = await response.json();
        if (data.success && data.envVars) {
          setEnvVars(data.envVars);
        }
      } catch (err) {
        console.error('Failed to fetch env vars:', err);
      }
    };

    if (!hasExistingDatabase) {
      fetchEnvVars();
    }
  }, [hasExistingDatabase]);

  // Fetch connection string for existing database
  const handleRevealConnectionString = async () => {
    if (!connectionInfo?.vaultId || !currentOrgId) return;

    if (connectionString) {
      setShowSecrets((prev) => ({ ...prev, MONGODB_URI: !prev.MONGODB_URI }));
      return;
    }

    setLoadingConnectionString(true);
    try {
      const response = await fetch(`/api/organizations/${currentOrgId}/vault/${connectionInfo.vaultId}/decrypt`);
      const data = await response.json();

      if (response.ok && data.connectionString) {
        setConnectionString(data.connectionString);
        setShowSecrets((prev) => ({ ...prev, MONGODB_URI: true }));

        // Update env vars with actual connection string
        if (envVars) {
          setEnvVars({
            ...envVars,
            MONGODB_URI: { ...envVars.MONGODB_URI, value: data.connectionString },
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch connection string:', err);
    } finally {
      setLoadingConnectionString(false);
    }
  };

  const copyToClipboard = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const toggleShowSecret = (key: string) => {
    setShowSecrets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleProvisionDatabase = async () => {
    setLoading(true);
    setProvisioningStatus('Starting...');

    try {
      const response = await fetch('/api/integrations/vercel/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ installationId }),
      });

      const data = await response.json();

      if (data.success) {
        setProvisioningStatus(data.status);
        if (data.envVars) {
          setEnvVars((prev) => ({
            ...prev!,
            MONGODB_URI: {
              ...prev!.MONGODB_URI,
              value: data.envVars.MONGODB_URI,
            },
          }));
        }

        if (data.status === 'ready') {
          setActiveStep(1);
        }
      } else {
        setProvisioningStatus(`Failed: ${data.error}`);
      }
    } catch (err) {
      setProvisioningStatus('Error: Failed to provision');
      console.error('Provision error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUseExistingDatabase = () => {
    // Skip to step 1 with existing database
    setActiveStep(1);
  };

  const renderExistingDatabaseCard = () => (
    <Paper
      sx={{
        p: 3,
        mb: 3,
        border: '2px solid',
        borderColor: '#00ED64',
        bgcolor: alpha('#00ED64', 0.05),
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <CheckCircle sx={{ color: '#00ED64' }} />
        <Typography variant="h6" fontWeight={600}>
          Existing Database Found
        </Typography>
        <Chip
          label="Ready"
          size="small"
          sx={{ bgcolor: '#00ED64', color: '#001E2B', fontWeight: 600, ml: 1 }}
        />
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        We found your existing MongoDB database. You can use this connection for your Vercel deployment.
      </Typography>

      {/* Cluster Details */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, bgcolor: alpha('#000', 0.02) }}>
            <Typography variant="caption" color="text.secondary">
              Provider
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {clusterStatus?.cluster?.provider || 'AWS'}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, bgcolor: alpha('#000', 0.02) }}>
            <Typography variant="caption" color="text.secondary">
              Region
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {clusterStatus?.cluster?.region?.replace(/_/g, ' ') || 'US EAST 1'}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, bgcolor: alpha('#000', 0.02) }}>
            <Typography variant="caption" color="text.secondary">
              Tier
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              M0 (Free Tier)
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, bgcolor: alpha('#000', 0.02) }}>
            <Typography variant="caption" color="text.secondary">
              Database
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {connectionInfo?.database || 'forms'}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Connection String */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Storage fontSize="small" />
          Connection String
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField
            fullWidth
            size="small"
            value={connectionString || '••••••••••••••••••••••••••••••••'}
            type={showSecrets.MONGODB_URI ? 'text' : 'password'}
            InputProps={{
              readOnly: true,
              sx: { fontFamily: 'monospace' },
            }}
          />
          <Tooltip title={showSecrets.MONGODB_URI ? 'Hide' : 'Reveal'}>
            <IconButton
              onClick={handleRevealConnectionString}
              disabled={loadingConnectionString}
            >
              {loadingConnectionString ? (
                <CircularProgress size={20} />
              ) : showSecrets.MONGODB_URI ? (
                <VisibilityOff />
              ) : (
                <Visibility />
              )}
            </IconButton>
          </Tooltip>
          <Tooltip title="Copy">
            <IconButton
              onClick={async () => {
                if (connectionString) {
                  copyToClipboard('connection', connectionString);
                } else if (connectionInfo?.vaultId && currentOrgId) {
                  setLoadingConnectionString(true);
                  try {
                    const response = await fetch(`/api/organizations/${currentOrgId}/vault/${connectionInfo.vaultId}/decrypt`);
                    const data = await response.json();
                    if (response.ok && data.connectionString) {
                      setConnectionString(data.connectionString);
                      copyToClipboard('connection', data.connectionString);
                      if (envVars) {
                        setEnvVars({
                          ...envVars,
                          MONGODB_URI: { ...envVars.MONGODB_URI, value: data.connectionString },
                        });
                      }
                    }
                  } finally {
                    setLoadingConnectionString(false);
                  }
                }
              }}
              disabled={loadingConnectionString}
            >
              {copied === 'connection' ? <Check color="success" /> : <ContentCopy />}
            </IconButton>
          </Tooltip>
        </Box>
        <Alert severity="warning" sx={{ mt: 1 }}>
          Keep this secret! Never share it publicly or commit it to version control.
        </Alert>
      </Box>

      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          startIcon={<ArrowForward />}
          onClick={handleUseExistingDatabase}
          sx={{
            background: 'linear-gradient(135deg, #00ED64 0%, #00CC55 100%)',
            color: '#001E2B',
          }}
        >
          Use This Database
        </Button>
        <Button
          variant="outlined"
          component={Link}
          href="/data?tab=infrastructure"
        >
          View Full Infrastructure
        </Button>
      </Box>
    </Paper>
  );

  const renderStep0 = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Connect to MongoDB Atlas
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        NetPad needs a MongoDB database to store your forms, workflows, and data.
        {hasExistingDatabase
          ? " We've found your existing database!"
          : ' You have two options:'}
      </Typography>

      {/* Show existing database if found */}
      {hasExistingDatabase && renderExistingDatabaseCard()}

      {/* Show other options */}
      {!hasExistingDatabase && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Option 1: Auto-provision */}
          <Paper
            sx={{
              p: 3,
              border: '2px solid',
              borderColor: alpha('#00ED64', 0.5),
              bgcolor: alpha('#00ED64', 0.05),
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Chip
                label="Recommended"
                size="small"
                sx={{ bgcolor: '#00ED64', color: '#001E2B', fontWeight: 600 }}
              />
            </Box>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Auto-provision MongoDB Atlas (Free M0)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              We'll create a free MongoDB Atlas M0 cluster for you automatically.
              Perfect for getting started quickly.
            </Typography>
            <Button
              variant="contained"
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <Storage />}
              onClick={handleProvisionDatabase}
              disabled={loading}
              sx={{
                background: 'linear-gradient(135deg, #00ED64 0%, #00CC55 100%)',
                color: '#001E2B',
              }}
            >
              {loading ? 'Provisioning...' : 'Create Free Database'}
            </Button>
            {provisioningStatus && (
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                Status: {provisioningStatus}
              </Typography>
            )}
          </Paper>

          <Divider>
            <Typography variant="caption" color="text.secondary">
              OR
            </Typography>
          </Divider>

          {/* Option 2: Bring your own */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Use Your Own MongoDB
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Already have a MongoDB Atlas cluster? Enter your connection string below.
            </Typography>
            <TextField
              fullWidth
              label="MongoDB Connection String"
              placeholder="mongodb+srv://username:password@cluster.mongodb.net/database"
              value={mongoUri}
              onChange={(e) => setMongoUri(e.target.value)}
              type={showSecrets['mongoUri'] ? 'text' : 'password'}
              InputProps={{
                endAdornment: (
                  <IconButton onClick={() => toggleShowSecret('mongoUri')} size="small">
                    {showSecrets['mongoUri'] ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                ),
              }}
              sx={{ mb: 2 }}
            />
            <Button
              variant="outlined"
              onClick={() => {
                if (mongoUri && envVars) {
                  setEnvVars({
                    ...envVars,
                    MONGODB_URI: { ...envVars.MONGODB_URI, value: mongoUri },
                  });
                  setActiveStep(1);
                }
              }}
              disabled={!mongoUri}
            >
              Use This Connection
            </Button>
          </Paper>
        </Box>
      )}

      {/* Additional option for existing database users */}
      {hasExistingDatabase && (
        <>
          <Divider sx={{ my: 3 }}>
            <Typography variant="caption" color="text.secondary">
              OR START FRESH
            </Typography>
          </Divider>

          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Use a Different MongoDB Connection
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Want to use a different database for this deployment? Enter your connection string below.
            </Typography>
            <TextField
              fullWidth
              label="MongoDB Connection String"
              placeholder="mongodb+srv://username:password@cluster.mongodb.net/database"
              value={mongoUri}
              onChange={(e) => setMongoUri(e.target.value)}
              type={showSecrets['mongoUri'] ? 'text' : 'password'}
              InputProps={{
                endAdornment: (
                  <IconButton onClick={() => toggleShowSecret('mongoUri')} size="small">
                    {showSecrets['mongoUri'] ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                ),
              }}
              sx={{ mb: 2 }}
            />
            <Button
              variant="outlined"
              onClick={() => {
                if (mongoUri && envVars) {
                  setEnvVars({
                    ...envVars,
                    MONGODB_URI: { ...envVars.MONGODB_URI, value: mongoUri },
                  });
                  setConnectionString(mongoUri);
                  setActiveStep(1);
                }
              }}
              disabled={!mongoUri}
            >
              Use This Connection Instead
            </Button>
          </Paper>
        </>
      )}
    </Box>
  );

  // Prepare all env vars for bulk copy
  const prepareBulkEnvVars = async (): Promise<string> => {
    let mongoUri = envVars?.MONGODB_URI?.value || '';

    // Check if we have a valid connection string (starts with mongodb)
    const hasValidMongoUri = mongoUri && mongoUri.startsWith('mongodb');

    // If we already have the connection string in state, use it
    if (connectionString && connectionString.startsWith('mongodb')) {
      mongoUri = connectionString;
    }
    // Otherwise, if we have an existing database but no valid URI, fetch it
    else if (hasExistingDatabase && !hasValidMongoUri && connectionInfo?.vaultId && currentOrgId) {
      try {
        const response = await fetch(`/api/organizations/${currentOrgId}/vault/${connectionInfo.vaultId}/decrypt`);
        const data = await response.json();
        if (response.ok && data.connectionString) {
          mongoUri = data.connectionString;
          setConnectionString(data.connectionString);
          if (envVars) {
            setEnvVars({
              ...envVars,
              MONGODB_URI: { ...envVars.MONGODB_URI, value: data.connectionString },
            });
          }
        }
      } catch (err) {
        console.error('Failed to fetch connection string:', err);
      }
    }

    if (!envVars) return '';

    const lines: string[] = [];
    for (const [key, config] of Object.entries(envVars)) {
      const value = key === 'MONGODB_URI' ? mongoUri : config.value;
      // Only include if value exists and is not a placeholder
      if (value && !value.startsWith('(') && !value.startsWith('[') && !value.startsWith('<')) {
        lines.push(`${key}=${value}`);
      }
    }
    return lines.join('\n');
  };

  const handleCopyAllEnvVars = async () => {
    setLoadingConnectionString(true);
    try {
      const bulkText = await prepareBulkEnvVars();
      await navigator.clipboard.writeText(bulkText);
      setCopied('all');
      setTimeout(() => setCopied(null), 3000);
    } catch (err) {
      console.error('Failed to copy all env vars:', err);
    } finally {
      setLoadingConnectionString(false);
    }
  };

  const getBulkEnvVarsPreview = (): string => {
    if (!envVars) return '';

    const lines: string[] = [];
    for (const [key, config] of Object.entries(envVars)) {
      let value = config.value;

      // For MONGODB_URI, use the decrypted connection string if available
      if (key === 'MONGODB_URI') {
        if (connectionString && connectionString.startsWith('mongodb')) {
          value = connectionString;
        } else if (!value || value.startsWith('[') || value.startsWith('(')) {
          value = '<click "Copy All" to fetch>';
        }
      }

      if (value && !value.startsWith('(') && !value.startsWith('[')) {
        // Mask sensitive values for preview
        const isSensitive = key.includes('SECRET') || key.includes('KEY') || key.includes('URI');
        const displayValue = isSensitive && !showSecrets[key] && value.length > 20
          ? value.substring(0, 20) + '...'
          : value;
        lines.push(`${key}=${displayValue}`);
      }
    }
    return lines.join('\n');
  };

  const renderStep1 = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Configure Environment Variables
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Copy these environment variables to your Vercel project settings.
      </Typography>

      {/* Quick Copy All Section */}
      <Paper
        sx={{
          p: 3,
          mb: 3,
          border: '2px solid',
          borderColor: '#00ED64',
          bgcolor: alpha('#00ED64', 0.05),
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ContentCopy sx={{ color: '#00ED64' }} />
            <Typography variant="subtitle1" fontWeight={600}>
              Quick Setup - Copy All Variables
            </Typography>
          </Box>
          <Chip
            label="Recommended"
            size="small"
            sx={{ bgcolor: '#00ED64', color: '#001E2B', fontWeight: 600 }}
          />
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Vercel supports pasting multiple environment variables at once. Click the button below to copy
          all variables in the correct format, then paste them in Vercel's "Add New" → "Paste" option.
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            startIcon={loadingConnectionString ? <CircularProgress size={16} color="inherit" /> : (copied === 'all' ? <Check /> : <ContentCopy />)}
            onClick={handleCopyAllEnvVars}
            disabled={loadingConnectionString}
            sx={{
              background: copied === 'all'
                ? 'linear-gradient(135deg, #00CC55 0%, #00AA44 100%)'
                : 'linear-gradient(135deg, #00ED64 0%, #00CC55 100%)',
              color: '#001E2B',
            }}
          >
            {loadingConnectionString ? 'Preparing...' : copied === 'all' ? 'Copied to Clipboard!' : 'Copy All Environment Variables'}
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setShowBulkView(!showBulkView)}
          >
            {showBulkView ? 'Hide Preview' : 'Show Preview'}
          </Button>
        </Box>

        {/* Bulk preview */}
        {showBulkView && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              Preview (sensitive values are masked):
            </Typography>
            <Paper
              sx={{
                p: 2,
                bgcolor: '#001E2B',
                borderRadius: 1,
                maxHeight: 200,
                overflow: 'auto',
              }}
            >
              <Typography
                component="pre"
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  color: '#00ED64',
                  m: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}
              >
                {getBulkEnvVarsPreview()}
              </Typography>
            </Paper>
          </Box>
        )}

        {copied === 'all' && (
          <Alert severity="success" sx={{ mt: 2 }}>
            All environment variables copied! Go to Vercel → Project Settings → Environment Variables →
            click "Add New" → then use the "Paste" option to add them all at once.
          </Alert>
        )}
      </Paper>

      <Divider sx={{ my: 3 }}>
        <Typography variant="caption" color="text.secondary">
          OR COPY INDIVIDUALLY
        </Typography>
      </Divider>

      {envVars && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {Object.entries(envVars).map(([key, config]) => (
            <Paper key={key} sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="subtitle2" fontWeight={600}>
                    {key}
                  </Typography>
                  {config.required && (
                    <Chip label="Required" size="small" color="primary" />
                  )}
                  {hasExistingDatabase && key === 'MONGODB_URI' && (
                    <Chip label="From your setup" size="small" color="success" />
                  )}
                </Box>
                <Box>
                  {key.includes('SECRET') || key.includes('KEY') || key.includes('URI') ? (
                    <IconButton
                      size="small"
                      onClick={() => {
                        if (key === 'MONGODB_URI' && !connectionString) {
                          handleRevealConnectionString();
                        } else {
                          toggleShowSecret(key);
                        }
                      }}
                    >
                      {showSecrets[key] ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  ) : null}
                  <Tooltip title={copied === key ? 'Copied!' : 'Copy'}>
                    <IconButton
                      size="small"
                      onClick={async () => {
                        if (key === 'MONGODB_URI' && !config.value && connectionInfo?.vaultId && currentOrgId) {
                          // Fetch and copy connection string
                          const response = await fetch(`/api/organizations/${currentOrgId}/vault/${connectionInfo.vaultId}/decrypt`);
                          const data = await response.json();
                          if (response.ok && data.connectionString) {
                            copyToClipboard(key, data.connectionString);
                            setConnectionString(data.connectionString);
                            setEnvVars({
                              ...envVars,
                              MONGODB_URI: { ...envVars.MONGODB_URI, value: data.connectionString },
                            });
                          }
                        } else {
                          copyToClipboard(key, config.value);
                        }
                      }}
                    >
                      {copied === key ? (
                        <Check fontSize="small" color="success" />
                      ) : (
                        <ContentCopy fontSize="small" />
                      )}
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                {config.description}
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={
                  key === 'MONGODB_URI' && !config.value && hasExistingDatabase
                    ? connectionString || '(click reveal to see)'
                    : config.value || '(not set)'
                }
                type={
                  (key.includes('SECRET') || key.includes('KEY') || key.includes('URI')) && !showSecrets[key]
                    ? 'password'
                    : 'text'
                }
                InputProps={{ readOnly: true }}
                sx={{ fontFamily: 'monospace' }}
              />
            </Paper>
          ))}
        </Box>
      )}

      <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
        <Button variant="outlined" onClick={() => setActiveStep(0)}>
          Back
        </Button>
        <Button
          variant="contained"
          onClick={() => setActiveStep(2)}
          sx={{
            background: 'linear-gradient(135deg, #00ED64 0%, #00CC55 100%)',
            color: '#001E2B',
          }}
        >
          I've Added the Variables
        </Button>
      </Box>
    </Box>
  );

  const renderStep2 = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Deploy & Verify
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        You're almost done! Follow these final steps to complete your deployment.
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                bgcolor: alpha('#00ED64', 0.1),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#00ED64',
                fontWeight: 700,
              }}
            >
              1
            </Box>
            <Typography variant="subtitle1" fontWeight={600}>
              Redeploy Your Project
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Go to your Vercel dashboard and trigger a new deployment to apply the environment variables.
          </Typography>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            component="a"
            href="https://vercel.com/dashboard"
            target="_blank"
          >
            Open Vercel Dashboard
          </Button>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                bgcolor: alpha('#00ED64', 0.1),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#00ED64',
                fontWeight: 700,
              }}
            >
              2
            </Box>
            <Typography variant="subtitle1" fontWeight={600}>
              Verify Deployment
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Once deployed, visit your app and check the health endpoint to verify everything is working.
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontFamily: 'monospace',
              bgcolor: alpha('#000', 0.05),
              p: 1,
              borderRadius: 1,
            }}
          >
            https://your-app.vercel.app/api/v1/health
          </Typography>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                bgcolor: alpha('#00ED64', 0.1),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#00ED64',
                fontWeight: 700,
              }}
            >
              3
            </Box>
            <Typography variant="subtitle1" fontWeight={600}>
              Start Building!
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            You're all set! Start creating forms, workflows, and exploring your data.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              component={Link}
              href="/builder"
              sx={{
                background: 'linear-gradient(135deg, #00ED64 0%, #00CC55 100%)',
                color: '#001E2B',
              }}
            >
              Create Your First Form
            </Button>
            <Button variant="outlined" component={Link} href="/workflows">
              Build a Workflow
            </Button>
          </Box>
        </Paper>
      </Box>

      <Box sx={{ mt: 3 }}>
        <Button variant="outlined" onClick={() => setActiveStep(1)}>
          Back
        </Button>
      </Box>
    </Box>
  );

  // Show loading state
  if (authLoading || clusterLoading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#001E2B', py: 6 }}>
        <Container maxWidth="md">
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress sx={{ color: '#00ED64' }} />
          </Box>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#001E2B', py: 6 }}>
      <Container maxWidth="md">
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mb: 2 }}>
            <Image src="/logo-250x250-trans.png" alt="NetPad" width={48} height={48} />
            <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700 }}>
              +
            </Typography>
            <Cloud sx={{ fontSize: 48, color: '#fff' }} />
          </Box>
          <Typography variant="h4" sx={{ color: '#fff', fontWeight: 700, mb: 1 }}>
            Deploy NetPad to Vercel
          </Typography>
          <Typography variant="body1" sx={{ color: alpha('#fff', 0.7) }}>
            Complete the setup to get your NetPad instance running
          </Typography>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error === 'missing_code'
              ? 'Authorization code missing. Please try again.'
              : error === 'token_exchange_failed'
              ? 'Failed to authenticate with Vercel. Please try again.'
              : `Error: ${error}`}
          </Alert>
        )}

        {/* Main Content */}
        <Paper sx={{ p: 4, borderRadius: 3 }}>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {activeStep === 0 && renderStep0()}
          {activeStep === 1 && renderStep1()}
          {activeStep === 2 && renderStep2()}
        </Paper>

        {/* Help Links */}
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: alpha('#fff', 0.5) }}>
            Need help?{' '}
            <Typography
              component="a"
              href="https://docs.netpad.io/deployment/vercel"
              target="_blank"
              sx={{
                color: '#00ED64',
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              Read the deployment guide
            </Typography>
            {' or '}
            <Typography
              component="a"
              href="https://github.com/mrlynn/netpad-v3/issues"
              target="_blank"
              sx={{
                color: '#00ED64',
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              open an issue on GitHub
            </Typography>
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}

export default function VercelSetupPage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ minHeight: '100vh', bgcolor: '#001E2B', py: 6 }}>
          <Container maxWidth="md">
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress sx={{ color: '#00ED64' }} />
            </Box>
          </Container>
        </Box>
      }
    >
      <VercelSetupContent />
    </Suspense>
  );
}
