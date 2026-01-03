'use client';

import { useState, useEffect } from 'react';
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
} from '@mui/material';
import {
  Cloud,
  Storage,
  Check,
  ContentCopy,
  Visibility,
  VisibilityOff,
  OpenInNew,
  Refresh,
} from '@mui/icons-material';
import Image from 'next/image';
import Link from 'next/link';

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

const steps = [
  'Connect MongoDB',
  'Configure Environment',
  'Deploy & Verify',
];

export default function VercelSetupPage() {
  const searchParams = useSearchParams();
  const installationId = searchParams.get('installation_id');
  const mode = searchParams.get('mode');
  const error = searchParams.get('error');

  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [envVars, setEnvVars] = useState<EnvVarsData | null>(null);
  const [mongoUri, setMongoUri] = useState('');
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [provisioningStatus, setProvisioningStatus] = useState<string | null>(null);

  // Fetch environment variables template
  useEffect(() => {
    const fetchEnvVars = async () => {
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

    fetchEnvVars();
  }, []);

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
          // Update env vars with provisioned values
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

  const renderStep0 = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Connect to MongoDB Atlas
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        NetPad needs a MongoDB database to store your forms, workflows, and data.
        You have two options:
      </Typography>

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
    </Box>
  );

  const renderStep1 = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Configure Environment Variables
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Copy these environment variables to your Vercel project settings.
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Go to your Vercel project → Settings → Environment Variables and add each variable below.
      </Alert>

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
                </Box>
                <Box>
                  {key.includes('SECRET') || key.includes('KEY') || key.includes('URI') ? (
                    <IconButton
                      size="small"
                      onClick={() => toggleShowSecret(key)}
                    >
                      {showSecrets[key] ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  ) : null}
                  <Tooltip title={copied === key ? 'Copied!' : 'Copy'}>
                    <IconButton
                      size="small"
                      onClick={() => copyToClipboard(key, config.value)}
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
                value={config.value}
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
              href="https://docs.netpad.io/deploy/vercel"
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
