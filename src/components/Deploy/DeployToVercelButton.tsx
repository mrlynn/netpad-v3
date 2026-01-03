'use client';

import { useState, useEffect } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  TextField,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Chip,
  alpha,
  Divider,
} from '@mui/material';
import {
  Cloud,
  ContentCopy,
  Check,
  Visibility,
  VisibilityOff,
  OpenInNew,
  Info,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';

interface DeployToVercelButtonProps {
  variant?: 'contained' | 'outlined' | 'text';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  showLabel?: boolean;
  sx?: object;
}

interface EnvVarConfig {
  value: string;
  description: string;
  sensitive: boolean;
  source?: 'generated' | 'existing' | 'placeholder';
}

interface DeployConfig {
  envVars: Record<string, EnvVarConfig>;
  hasExistingDatabase: boolean;
  organizationId?: string;
  vaultId?: string;
}

/**
 * Smart Deploy to Vercel button that:
 * - For logged-in users with a database: Prepopulates env vars from their existing setup
 * - For logged-in users without a database: Offers to provision or use manual setup
 * - For anonymous users: Standard deploy flow with generated secrets
 */
export function DeployToVercelButton({
  variant = 'outlined',
  size = 'small',
  fullWidth = false,
  showLabel = true,
  sx = {},
}: DeployToVercelButtonProps) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { organization, currentOrgId } = useOrganization();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deployConfig, setDeployConfig] = useState<DeployConfig | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch deployment config when dialog opens
  useEffect(() => {
    if (dialogOpen && isAuthenticated && currentOrgId) {
      fetchDeployConfig();
    }
  }, [dialogOpen, isAuthenticated, currentOrgId]);

  const fetchDeployConfig = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch env vars with organization context
      const response = await fetch(
        `/api/integrations/vercel/env?organizationId=${currentOrgId}`
      );
      const data = await response.json();

      if (data.success) {
        // Transform the response to our format
        const envVars: Record<string, EnvVarConfig> = {};

        for (const [key, config] of Object.entries(data.envVars || {})) {
          const c = config as { value: string; description: string; required: boolean };
          envVars[key] = {
            value: c.value || '',
            description: c.description,
            sensitive: key.includes('SECRET') || key.includes('KEY') || key.includes('URI'),
            source: c.value && c.value !== '' && !c.value.startsWith('[') ? 'existing' : 'generated',
          };
        }

        setDeployConfig({
          envVars,
          hasExistingDatabase: data.status === 'ready' || (envVars.MONGODB_URI?.source === 'existing'),
          organizationId: currentOrgId || undefined,
        });
      } else {
        // Fallback to generated values
        setDeployConfig(generateDefaultConfig());
      }
    } catch (err) {
      console.error('Failed to fetch deploy config:', err);
      setDeployConfig(generateDefaultConfig());
    } finally {
      setLoading(false);
    }
  };

  const generateDefaultConfig = (): DeployConfig => {
    // Generate secure defaults
    const sessionSecret = generateSecretKey(32);
    const vaultKey = generateBase64Key();

    return {
      envVars: {
        MONGODB_URI: {
          value: '',
          description: 'MongoDB connection string',
          sensitive: true,
          source: 'placeholder',
        },
        MONGODB_DATABASE: {
          value: 'forms',
          description: 'Database name',
          sensitive: false,
          source: 'generated',
        },
        SESSION_SECRET: {
          value: sessionSecret,
          description: 'Session encryption secret (auto-generated)',
          sensitive: true,
          source: 'generated',
        },
        VAULT_ENCRYPTION_KEY: {
          value: vaultKey,
          description: 'Vault encryption key (auto-generated)',
          sensitive: true,
          source: 'generated',
        },
        NEXT_PUBLIC_APP_URL: {
          value: '${VERCEL_URL}',
          description: 'Public URL (auto-detected by Vercel)',
          sensitive: false,
          source: 'generated',
        },
      },
      hasExistingDatabase: false,
    };
  };

  const generateSecretKey = (length: number): string => {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
  };

  const generateBase64Key = (): string => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array));
  };

  const handleClick = () => {
    if (!isAuthenticated || !currentOrgId) {
      // For anonymous users, redirect directly to Vercel deploy
      window.open(getVercelDeployUrl(), '_blank');
    } else {
      // For logged-in users, show the dialog with prepopulated values
      setDialogOpen(true);
    }
  };

  const getVercelDeployUrl = (envVars?: Record<string, EnvVarConfig>): string => {
    const baseUrl = 'https://vercel.com/new/clone';
    const params = new URLSearchParams({
      'repository-url': 'https://github.com/mrlynn/netpad-v3',
      'env': 'MONGODB_URI,SESSION_SECRET,VAULT_ENCRYPTION_KEY',
      'envDescription': 'Required environment variables for NetPad',
      'envLink': 'https://github.com/mrlynn/netpad-v3/blob/main/docs/DEPLOY.md',
      'project-name': 'my-netpad',
      'repository-name': 'my-netpad',
      'demo-title': 'NetPad',
      'demo-description': 'MongoDB-connected forms, workflows, and data explorer',
      'demo-url': 'https://netpad.io',
    });

    return `${baseUrl}?${params.toString()}`;
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

  const copyAllEnvVars = async () => {
    if (!deployConfig) return;

    const envString = Object.entries(deployConfig.envVars)
      .filter(([_, config]) => config.value && !config.value.startsWith('['))
      .map(([key, config]) => `${key}=${config.value}`)
      .join('\n');

    try {
      await navigator.clipboard.writeText(envString);
      setCopied('all');
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const toggleShowSecret = (key: string) => {
    setShowSecrets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleDeploy = () => {
    window.open(getVercelDeployUrl(deployConfig?.envVars), '_blank');
  };

  if (authLoading) {
    return (
      <Button
        variant={variant}
        size={size}
        disabled
        startIcon={<CircularProgress size={16} />}
        sx={sx}
      >
        {showLabel && 'Loading...'}
      </Button>
    );
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        fullWidth={fullWidth}
        startIcon={<Cloud />}
        onClick={handleClick}
        sx={{
          textTransform: 'none',
          fontWeight: 600,
          ...(variant === 'contained' && {
            background: 'linear-gradient(135deg, #000 0%, #333 100%)',
            color: '#fff',
            '&:hover': {
              background: 'linear-gradient(135deg, #222 0%, #444 100%)',
            },
          }),
          ...sx,
        }}
      >
        {showLabel && 'Deploy to Vercel'}
      </Button>

      {/* Smart Deploy Dialog for logged-in users */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Cloud />
          Deploy Your Own NetPad Instance
        </DialogTitle>

        <DialogContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          ) : deployConfig ? (
            <>
              {deployConfig.hasExistingDatabase && (
                <Alert severity="success" sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" fontWeight={600}>
                    Database Connection Found
                  </Typography>
                  <Typography variant="body2">
                    We've detected your existing MongoDB connection. The environment variables
                    below are prepopulated with your configuration.
                  </Typography>
                </Alert>
              )}

              {!deployConfig.hasExistingDatabase && (
                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" fontWeight={600}>
                    MongoDB Connection Required
                  </Typography>
                  <Typography variant="body2">
                    You'll need to provide a MongoDB connection string. Get a free cluster at{' '}
                    <a
                      href="https://www.mongodb.com/cloud/atlas/register"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'inherit' }}
                    >
                      MongoDB Atlas
                    </a>
                    .
                  </Typography>
                </Alert>
              )}

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  Environment Variables
                </Typography>
                <Button
                  size="small"
                  startIcon={copied === 'all' ? <Check /> : <ContentCopy />}
                  onClick={copyAllEnvVars}
                >
                  {copied === 'all' ? 'Copied!' : 'Copy All'}
                </Button>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {Object.entries(deployConfig.envVars).map(([key, config]) => (
                  <Box
                    key={key}
                    sx={{
                      p: 2,
                      borderRadius: 1,
                      bgcolor: alpha('#000', 0.02),
                      border: '1px solid',
                      borderColor: alpha('#000', 0.1),
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle2" fontWeight={600}>
                          {key}
                        </Typography>
                        {config.source === 'existing' && (
                          <Chip label="From your setup" size="small" color="success" />
                        )}
                        {config.source === 'generated' && (
                          <Chip label="Auto-generated" size="small" />
                        )}
                      </Box>
                      <Box>
                        {config.sensitive && (
                          <IconButton size="small" onClick={() => toggleShowSecret(key)}>
                            {showSecrets[key] ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                          </IconButton>
                        )}
                        <Tooltip title={copied === key ? 'Copied!' : 'Copy'}>
                          <IconButton
                            size="small"
                            onClick={() => copyToClipboard(key, config.value)}
                            disabled={!config.value || config.value.startsWith('[')}
                          >
                            {copied === key ? <Check fontSize="small" color="success" /> : <ContentCopy fontSize="small" />}
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
                      value={config.value || '(not set)'}
                      type={config.sensitive && !showSecrets[key] ? 'password' : 'text'}
                      InputProps={{ readOnly: true }}
                      sx={{
                        '& .MuiInputBase-input': {
                          fontFamily: 'monospace',
                          fontSize: '0.85rem',
                        },
                      }}
                    />
                  </Box>
                ))}
              </Box>

              <Divider sx={{ my: 3 }} />

              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Next Steps:
              </Typography>
              <Box component="ol" sx={{ pl: 2, mt: 1, mb: 0 }}>
                <li>
                  <Typography variant="body2">
                    Click "Deploy to Vercel" to start the deployment
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2">
                    Copy and paste each environment variable when prompted
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2">
                    Wait for the deployment to complete (~2-3 minutes)
                  </Typography>
                </li>
              </Box>
            </>
          ) : null}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            startIcon={<OpenInNew />}
            onClick={handleDeploy}
            sx={{
              background: 'linear-gradient(135deg, #000 0%, #333 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #222 0%, #444 100%)',
              },
            }}
          >
            Deploy to Vercel
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default DeployToVercelButton;
