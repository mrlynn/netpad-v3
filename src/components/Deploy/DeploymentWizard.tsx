'use client';

/**
 * Deployment Wizard Component
 *
 * A multi-step wizard for deploying NetPad projects to Vercel.
 * Steps:
 * 1. Project Selection & Preview
 * 2. Deployment Configuration
 * 3. Environment Variables
 * 4. Review & Deploy
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  TextField,
  FormControl,
  FormControlLabel,
  RadioGroup,
  Radio,
  Switch,
  Chip,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  Divider,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  alpha,
  Collapse,
  LinearProgress,
} from '@mui/material';
import {
  Cloud as CloudIcon,
  Rocket as RocketIcon,
  Settings as SettingsIcon,
  Key as KeyIcon,
  CheckCircle as CheckIcon,
  ContentCopy as CopyIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Article as FormIcon,
  AccountTree as WorkflowIcon,
  Storage as DatabaseIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  OpenInNew as OpenInNewIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { Project } from '@/types/platform';
import { BundleExport, EnvVarSpec } from '@/types/template';
import { DeploymentStatus, DeploymentStatusResponse } from '@/types/deployment';

const STEPS = ['Select Project', 'Configure', 'Environment', 'Deploy'];

interface DeploymentWizardProps {
  open: boolean;
  onClose: () => void;
  project: Project | null;
  organizationId: string;
  onDeploymentStart?: (deploymentId: string) => void;
}

interface DeploymentConfig {
  appName: string;
  customDomain: string;
  databaseOption: 'auto' | 'byod' | 'existing';
  connectionString: string;
  selectedClusterId?: string;
}

interface BundlePreview {
  formsCount: number;
  workflowsCount: number;
  bundle: BundleExport;
}

interface VercelIntegration {
  installationId: string;
  connected: boolean;
}

interface DeploymentProgress {
  deploymentId: string;
  status: DeploymentStatus;
  statusMessage?: string;
  deployedUrl?: string;
  vercelStatus?: {
    state: string;
    url?: string;
  };
  error?: string;
}

export function DeploymentWizard({
  open,
  onClose,
  project,
  organizationId,
  onDeploymentStart,
}: DeploymentWizardProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Project preview
  const [bundlePreview, setBundlePreview] = useState<BundlePreview | null>(null);

  // Step 2: Configuration
  const [config, setConfig] = useState<DeploymentConfig>({
    appName: '',
    customDomain: '',
    databaseOption: 'auto',
    connectionString: '',
  });

  // Step 3: Environment variables
  const [envVars, setEnvVars] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);

  // Step 4: Deployment
  const [deploying, setDeploying] = useState(false);
  const [deploymentUrl, setDeploymentUrl] = useState<string | null>(null);
  const [deploymentProgress, setDeploymentProgress] = useState<DeploymentProgress | null>(null);

  // Vercel integration
  const [vercelIntegration, setVercelIntegration] = useState<VercelIntegration | null>(null);
  const [checkingVercel, setCheckingVercel] = useState(false);

  // Polling ref for cleanup
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open && project) {
      setActiveStep(0);
      setError(null);
      setConfig({
        appName: project.name.toLowerCase().replace(/\s+/g, '-'),
        customDomain: '',
        databaseOption: 'auto',
        connectionString: '',
      });
      setEnvVars({});
      setDeploymentUrl(null);
      setDeploymentProgress(null);
      loadBundlePreview();
      checkVercelIntegration();
    }

    // Cleanup polling when dialog closes
    if (!open && pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, [open, project]);

  // Check for Vercel integration
  const checkVercelIntegration = async () => {
    setCheckingVercel(true);
    try {
      // Check if user has Vercel integration by fetching env config
      const response = await fetch(
        `/api/integrations/vercel/env?organizationId=${organizationId}`
      );
      const data = await response.json();

      // If we get a successful response with status, we have an integration
      if (data.success) {
        // For now, we'll work without requiring a specific installation ID
        // The deployment API will handle finding/creating the integration
        setVercelIntegration({
          installationId: data.installationId || 'default',
          connected: true,
        });
      } else {
        setVercelIntegration({
          installationId: '',
          connected: false,
        });
      }
    } catch (err) {
      console.error('Failed to check Vercel integration:', err);
      setVercelIntegration({
        installationId: '',
        connected: false,
      });
    } finally {
      setCheckingVercel(false);
    }
  };

  const loadBundlePreview = async () => {
    if (!project) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/projects/${project.projectId}/bundle?orgId=${organizationId}&format=json`
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to load project data');
      }

      const data = await response.json();
      setBundlePreview({
        formsCount: data.metadata.formsCount,
        workflowsCount: data.metadata.workflowsCount,
        bundle: data.bundle,
      });

      // Pre-populate env vars from bundle
      if (data.bundle.deployment?.environment) {
        const vars: Record<string, string> = {};
        for (const envVar of data.bundle.deployment.environment.required) {
          vars[envVar.name] = envVar.default || generateEnvValue(envVar);
        }
        setEnvVars(vars);
      }
    } catch (err) {
      console.error('Error loading bundle preview:', err);
      setError(err instanceof Error ? err.message : 'Failed to load project data');
    } finally {
      setLoading(false);
    }
  };

  const generateEnvValue = (envVar: EnvVarSpec): string => {
    if (envVar.generator === 'secret') {
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      if (envVar.name.includes('KEY')) {
        return btoa(String.fromCharCode(...array));
      }
      return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
    }
    if (envVar.generator === 'uuid') {
      return crypto.randomUUID();
    }
    return envVar.default || '';
  };

  const handleNext = () => {
    if (activeStep === STEPS.length - 1) {
      handleDeploy();
    } else {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  // Poll deployment status
  const pollDeploymentStatus = useCallback(async (deploymentId: string) => {
    try {
      const response = await fetch(`/api/deployments/${deploymentId}/status`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to get deployment status');
      }

      const status: DeploymentStatusResponse = await response.json();

      setDeploymentProgress({
        deploymentId,
        status: status.status,
        statusMessage: status.statusMessage,
        deployedUrl: status.deployedUrl,
        vercelStatus: status.vercelStatus,
        error: status.error,
      });

      // Check if deployment is complete
      if (['active', 'failed', 'paused'].includes(status.status)) {
        // Stop polling
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }

        if (status.status === 'active' && status.deployedUrl) {
          setDeploymentUrl(status.deployedUrl);
          setDeploying(false);
        } else if (status.status === 'failed') {
          setError(status.error || 'Deployment failed');
          setDeploying(false);
        }
      }
    } catch (err) {
      console.error('Error polling deployment status:', err);
    }
  }, []);

  const handleDeploy = async () => {
    if (!project || !bundlePreview) return;

    setDeploying(true);
    setError(null);
    setDeploymentProgress(null);

    try {
      // Step 1: Create the deployment
      setDeploymentProgress({
        deploymentId: '',
        status: 'draft',
        statusMessage: 'Creating deployment configuration...',
      });

      const createResponse = await fetch('/api/deployments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.projectId,
          organizationId,
          target: 'vercel',
          appName: config.appName,
          environment: 'production',
          database: {
            provisioning: config.databaseOption === 'auto' ? 'auto' : 'manual',
            connectionString: config.databaseOption === 'byod' ? config.connectionString : undefined,
            databaseName: 'forms',
          },
          environmentVariables: envVars,
          vercelInstallationId: vercelIntegration?.installationId,
        }),
      });

      if (!createResponse.ok) {
        const data = await createResponse.json();
        throw new Error(data.error || 'Failed to create deployment');
      }

      const { deployment } = await createResponse.json();
      const deploymentId = deployment.deploymentId;

      setDeploymentProgress({
        deploymentId,
        status: 'draft',
        statusMessage: 'Deployment created, injecting bundle...',
      });

      if (onDeploymentStart) {
        onDeploymentStart(deploymentId);
      }

      // Step 2: Inject bundle into template
      setDeploymentProgress({
        deploymentId,
        status: 'configuring',
        statusMessage: 'Injecting application bundle...',
      });

      const injectResponse = await fetch(
        `/api/deployments/${deploymentId}/inject-bundle`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bundle: bundlePreview.bundle }),
        }
      );

      if (!injectResponse.ok) {
        const data = await injectResponse.json();
        throw new Error(data.error || 'Failed to inject bundle');
      }

      setDeploymentProgress({
        deploymentId,
        status: 'configuring',
        statusMessage: 'Bundle injected, starting deployment...',
      });

      // Step 3: Trigger the deployment
      const deployResponse = await fetch(`/api/deployments/${deploymentId}/deploy`, {
        method: 'POST',
      });

      if (!deployResponse.ok) {
        const data = await deployResponse.json();
        throw new Error(data.error || 'Failed to start deployment');
      }

      const deployData = await deployResponse.json();

      setDeploymentProgress({
        deploymentId,
        status: 'deploying',
        statusMessage: deployData.message || 'Deployment in progress...',
        deployedUrl: deployData.deployment?.deployedUrl,
      });

      // Step 4: Start polling for status
      pollingRef.current = setInterval(() => {
        pollDeploymentStatus(deploymentId);
      }, 3000);

      // Initial poll
      await pollDeploymentStatus(deploymentId);

    } catch (err) {
      console.error('Deployment error:', err);
      setError(err instanceof Error ? err.message : 'Deployment failed');
      setDeploying(false);
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

  const isStepValid = (): boolean => {
    switch (activeStep) {
      case 0:
        return bundlePreview !== null;
      case 1:
        return (
          config.appName.length > 0 &&
          (config.databaseOption !== 'byod' || config.connectionString.length > 0)
        );
      case 2:
        const requiredVars = bundlePreview?.bundle.deployment?.environment.required || [];
        return requiredVars.every(
          (v) => envVars[v.name] && envVars[v.name].length > 0
        );
      case 3:
        return true;
      default:
        return false;
    }
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return renderProjectPreview();
      case 1:
        return renderConfiguration();
      case 2:
        return renderEnvironmentVariables();
      case 3:
        return renderReviewAndDeploy();
      default:
        return null;
    }
  };

  const renderProjectPreview = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : bundlePreview ? (
        <>
          <Alert severity="info" icon={<InfoIcon />}>
            Review the project contents that will be deployed.
          </Alert>

          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Project: {project?.name}
            </Typography>
            {project?.description && (
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {project.description}
              </Typography>
            )}

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', gap: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FormIcon color="action" />
                <Typography variant="body2">
                  {bundlePreview.formsCount} Form{bundlePreview.formsCount !== 1 ? 's' : ''}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <WorkflowIcon color="action" />
                <Typography variant="body2">
                  {bundlePreview.workflowsCount} Workflow
                  {bundlePreview.workflowsCount !== 1 ? 's' : ''}
                </Typography>
              </Box>
            </Box>
          </Paper>

          {/* Forms List */}
          {bundlePreview.bundle.forms && bundlePreview.bundle.forms.length > 0 && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Forms to Deploy
              </Typography>
              <List dense disablePadding>
                {bundlePreview.bundle.forms.map((form, index) => (
                  <ListItem key={index} disablePadding sx={{ py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <CheckIcon fontSize="small" color="success" />
                    </ListItemIcon>
                    <ListItemText
                      primary={form.name}
                      secondary={form.description}
                      primaryTypographyProps={{ variant: 'body2' }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}
        </>
      ) : (
        <Alert severity="warning">
          No project data available. Please try again.
        </Alert>
      )}
    </Box>
  );

  const renderConfiguration = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <TextField
        label="Application Name"
        value={config.appName}
        onChange={(e) =>
          setConfig({ ...config, appName: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })
        }
        helperText="This will be used for your Vercel project and URL"
        fullWidth
        required
      />

      <TextField
        label="Custom Domain (optional)"
        value={config.customDomain}
        onChange={(e) => setConfig({ ...config, customDomain: e.target.value })}
        placeholder="app.example.com"
        helperText="You can add a custom domain later in Vercel settings"
        fullWidth
      />

      <Divider />

      <FormControl component="fieldset">
        <Typography variant="subtitle2" gutterBottom>
          Database Configuration
        </Typography>
        <RadioGroup
          value={config.databaseOption}
          onChange={(e) =>
            setConfig({ ...config, databaseOption: e.target.value as 'auto' | 'byod' | 'existing' })
          }
        >
          <FormControlLabel
            value="auto"
            control={<Radio />}
            label={
              <Box>
                <Typography variant="body2">
                  Auto-provision MongoDB Atlas cluster (Recommended)
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Creates a free M0 cluster for your application
                </Typography>
              </Box>
            }
          />
          <FormControlLabel
            value="byod"
            control={<Radio />}
            label={
              <Box>
                <Typography variant="body2">Bring your own database</Typography>
                <Typography variant="caption" color="text.secondary">
                  Provide your own MongoDB connection string
                </Typography>
              </Box>
            }
          />
        </RadioGroup>
      </FormControl>

      {config.databaseOption === 'byod' && (
        <TextField
          label="MongoDB Connection String"
          value={config.connectionString}
          onChange={(e) => setConfig({ ...config, connectionString: e.target.value })}
          placeholder="mongodb+srv://user:pass@cluster.mongodb.net/database"
          helperText="Your MongoDB Atlas or self-hosted connection string"
          fullWidth
          required
          type="password"
        />
      )}
    </Box>
  );

  const renderEnvironmentVariables = () => {
    const requiredVars = bundlePreview?.bundle.deployment?.environment.required || [];
    const optionalVars = bundlePreview?.bundle.deployment?.environment.optional || [];

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Alert severity="info">
          These environment variables will be configured in your Vercel deployment.
          Auto-generated values are secure and ready to use.
        </Alert>

        {requiredVars.length > 0 && (
          <>
            <Typography variant="subtitle2">Required Variables</Typography>
            {requiredVars.map((envVar) => (
              <Paper key={envVar.name} variant="outlined" sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontFamily: 'monospace' }}>
                      {envVar.name}
                    </Typography>
                    {envVar.generator === 'secret' && (
                      <Chip label="Auto-generated" size="small" color="success" />
                    )}
                  </Box>
                  <Box>
                    <IconButton
                      size="small"
                      onClick={() =>
                        setShowSecrets({ ...showSecrets, [envVar.name]: !showSecrets[envVar.name] })
                      }
                    >
                      {showSecrets[envVar.name] ? (
                        <VisibilityOffIcon fontSize="small" />
                      ) : (
                        <VisibilityIcon fontSize="small" />
                      )}
                    </IconButton>
                    <Tooltip title={copied === envVar.name ? 'Copied!' : 'Copy'}>
                      <IconButton
                        size="small"
                        onClick={() => copyToClipboard(envVar.name, envVars[envVar.name] || '')}
                      >
                        <CopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
                <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                  {envVar.description}
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  value={envVars[envVar.name] || ''}
                  onChange={(e) => setEnvVars({ ...envVars, [envVar.name]: e.target.value })}
                  type={showSecrets[envVar.name] ? 'text' : 'password'}
                  placeholder={envVar.default || 'Enter value...'}
                  sx={{ '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '0.85rem' } }}
                />
              </Paper>
            ))}
          </>
        )}

        {optionalVars.length > 0 && (
          <>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2" color="text.secondary">
              Optional Variables
            </Typography>
            <Typography variant="caption" color="text.secondary">
              These can be configured later if needed.
            </Typography>
          </>
        )}
      </Box>
    );
  };

  // Get status color
  const getStatusColor = (status: DeploymentStatus) => {
    switch (status) {
      case 'active':
        return '#00ED64';
      case 'failed':
        return '#F44336';
      case 'draft':
        return '#9E9E9E';
      case 'configuring':
      case 'provisioning':
      case 'deploying':
        return '#2196F3';
      case 'paused':
        return '#FFC107';
      default:
        return '#9E9E9E';
    }
  };

  // Get status display name
  const getStatusDisplayName = (status: DeploymentStatus) => {
    switch (status) {
      case 'draft':
        return 'Preparing...';
      case 'configuring':
        return 'Configuring...';
      case 'provisioning':
        return 'Provisioning Database...';
      case 'deploying':
        return 'Deploying to Vercel...';
      case 'active':
        return 'Active';
      case 'failed':
        return 'Failed';
      case 'paused':
        return 'Paused';
      default:
        return status;
    }
  };

  const renderReviewAndDeploy = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {deploymentUrl ? (
        <>
          <Alert severity="success" icon={<CheckIcon />}>
            <Typography variant="subtitle2">Deployment Complete!</Typography>
            <Typography variant="body2">
              Your application has been deployed successfully.
            </Typography>
          </Alert>

          <Paper
            variant="outlined"
            sx={{
              p: 3,
              textAlign: 'center',
              bgcolor: alpha('#00ED64', 0.05),
              borderColor: alpha('#00ED64', 0.3),
            }}
          >
            <RocketIcon sx={{ fontSize: 48, color: '#00ED64', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              {config.appName}
            </Typography>
            <Button
              variant="contained"
              href={deploymentUrl}
              target="_blank"
              startIcon={<OpenInNewIcon />}
              sx={{
                mt: 1,
                background: 'linear-gradient(135deg, #00ED64 0%, #4DFF9F 100%)',
                color: '#000',
              }}
            >
              Open Application
            </Button>
            <Typography variant="caption" display="block" sx={{ mt: 2, color: 'text.secondary' }}>
              {deploymentUrl}
            </Typography>
          </Paper>
        </>
      ) : deploying && deploymentProgress ? (
        <>
          {/* Deployment in progress */}
          <Alert
            severity={deploymentProgress.status === 'failed' ? 'error' : 'info'}
            icon={
              deploymentProgress.status === 'failed' ? (
                <ErrorIcon />
              ) : (
                <CircularProgress size={20} />
              )
            }
          >
            <Typography variant="subtitle2">
              {getStatusDisplayName(deploymentProgress.status)}
            </Typography>
            {deploymentProgress.statusMessage && (
              <Typography variant="body2">
                {deploymentProgress.statusMessage}
              </Typography>
            )}
          </Alert>

          <Paper variant="outlined" sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Chip
                label={getStatusDisplayName(deploymentProgress.status)}
                size="small"
                sx={{
                  bgcolor: alpha(getStatusColor(deploymentProgress.status), 0.1),
                  color: getStatusColor(deploymentProgress.status),
                  fontWeight: 600,
                }}
              />
              {['configuring', 'provisioning', 'deploying'].includes(deploymentProgress.status) && (
                <LinearProgress
                  sx={{
                    flex: 1,
                    borderRadius: 1,
                    bgcolor: alpha('#2196F3', 0.1),
                    '& .MuiLinearProgress-bar': {
                      bgcolor: '#2196F3',
                    },
                  }}
                />
              )}
            </Box>

            <Typography variant="subtitle2" gutterBottom>
              Deployment Progress
            </Typography>
            <List dense>
              <ListItem>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  {deploymentProgress.status === 'draft' && !deploymentProgress.deploymentId ? (
                    <CircularProgress size={16} />
                  ) : (
                    <CheckIcon fontSize="small" color="success" />
                  )}
                </ListItemIcon>
                <ListItemText primary="Create deployment configuration" />
              </ListItem>
              <ListItem>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  {deploymentProgress.status === 'draft' && deploymentProgress.deploymentId ? (
                    <CircularProgress size={16} />
                  ) : deploymentProgress.status === 'configuring' &&
                    deploymentProgress.statusMessage?.includes('Injecting') ? (
                    <CircularProgress size={16} />
                  ) : ['configuring', 'provisioning', 'deploying', 'active'].includes(
                      deploymentProgress.status
                    ) ? (
                    <CheckIcon fontSize="small" color="success" />
                  ) : (
                    <Box sx={{ width: 16 }} />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary="Inject application bundle"
                  secondary={`${bundlePreview?.formsCount || 0} forms, ${bundlePreview?.workflowsCount || 0} workflows`}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  {deploymentProgress.status === 'configuring' &&
                  !deploymentProgress.statusMessage?.includes('Injecting') ? (
                    <CircularProgress size={16} />
                  ) : ['provisioning', 'deploying', 'active'].includes(deploymentProgress.status) ? (
                    <CheckIcon fontSize="small" color="success" />
                  ) : (
                    <Box sx={{ width: 16 }} />
                  )}
                </ListItemIcon>
                <ListItemText primary="Configure environment variables" />
              </ListItem>
              {config.databaseOption === 'auto' && (
                <ListItem>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {deploymentProgress.status === 'provisioning' ? (
                      <CircularProgress size={16} />
                    ) : ['deploying', 'active'].includes(deploymentProgress.status) ? (
                      <CheckIcon fontSize="small" color="success" />
                    ) : (
                      <Box sx={{ width: 16 }} />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary="Provision MongoDB Atlas cluster"
                    secondary={
                      deploymentProgress.status === 'provisioning'
                        ? 'This may take 2-5 minutes...'
                        : undefined
                    }
                  />
                </ListItem>
              )}
              <ListItem>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  {deploymentProgress.status === 'deploying' ? (
                    <CircularProgress size={16} />
                  ) : deploymentProgress.status === 'active' ? (
                    <CheckIcon fontSize="small" color="success" />
                  ) : (
                    <Box sx={{ width: 16 }} />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary="Deploy to Vercel"
                  secondary={
                    deploymentProgress.vercelStatus?.state
                      ? `Vercel: ${deploymentProgress.vercelStatus.state}`
                      : undefined
                  }
                />
              </ListItem>
            </List>

            {deploymentProgress.deployedUrl && (
              <Box sx={{ mt: 2, p: 2, bgcolor: alpha('#00ED64', 0.05), borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Estimated URL:
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  {deploymentProgress.deployedUrl}
                </Typography>
              </Box>
            )}
          </Paper>

          {deploymentProgress.error && (
            <Alert severity="error" icon={<ErrorIcon />}>
              <Typography variant="subtitle2">Deployment Failed</Typography>
              <Typography variant="body2">{deploymentProgress.error}</Typography>
            </Alert>
          )}
        </>
      ) : (
        <>
          <Alert severity="info">
            Review your deployment configuration before proceeding.
          </Alert>

          {!vercelIntegration?.connected && (
            <Alert severity="warning" icon={<WarningIcon />}>
              <Typography variant="subtitle2">Vercel Integration</Typography>
              <Typography variant="body2">
                For the best experience, connect your Vercel account first.
                Without it, you may need to manually configure some settings.
              </Typography>
              <Button
                size="small"
                href="/setup/vercel"
                target="_blank"
                sx={{ mt: 1 }}
              >
                Connect Vercel
              </Button>
            </Alert>
          )}

          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Deployment Summary
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText
                  primary="Application Name"
                  secondary={config.appName}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Database"
                  secondary={
                    config.databaseOption === 'auto'
                      ? 'Auto-provisioned MongoDB Atlas (M0 Free)'
                      : 'User-provided connection'
                  }
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Forms"
                  secondary={`${bundlePreview?.formsCount || 0} form(s) will be deployed`}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Workflows"
                  secondary={`${bundlePreview?.workflowsCount || 0} workflow(s) will be deployed`}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Environment Variables"
                  secondary={`${Object.keys(envVars).length} variable(s) configured`}
                />
              </ListItem>
            </List>
          </Paper>

          <Alert severity="warning" icon={<WarningIcon />}>
            <Typography variant="body2">
              Clicking "Deploy" will create a new Vercel project and deploy your application.
              {config.databaseOption === 'auto' && ' Database provisioning may take 2-5 minutes.'}
            </Typography>
          </Alert>
        </>
      )}
    </Box>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CloudIcon sx={{ color: '#00ED64' }} />
        Deploy to Vercel
        {project && (
          <Chip
            label={project.name}
            size="small"
            sx={{ ml: 1, bgcolor: alpha('#00ED64', 0.1), color: '#00ED64' }}
          />
        )}
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {renderStepContent()}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={deploying}>
          {deploymentUrl ? 'Close' : 'Cancel'}
        </Button>

        {!deploymentUrl && (
          <>
            <Button onClick={handleBack} disabled={activeStep === 0 || deploying}>
              Back
            </Button>
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={!isStepValid() || deploying}
              startIcon={
                deploying ? (
                  <CircularProgress size={16} />
                ) : activeStep === STEPS.length - 1 ? (
                  <RocketIcon />
                ) : null
              }
              sx={{
                background:
                  activeStep === STEPS.length - 1
                    ? 'linear-gradient(135deg, #00ED64 0%, #4DFF9F 100%)'
                    : undefined,
                color: activeStep === STEPS.length - 1 ? '#000' : undefined,
              }}
            >
              {deploying
                ? 'Deploying...'
                : activeStep === STEPS.length - 1
                ? 'Deploy'
                : 'Next'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default DeploymentWizard;
