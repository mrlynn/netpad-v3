'use client';

/**
 * Database Setup Step
 *
 * Second step in the onboarding flow - allows users to either:
 * 1. Auto-provision a free MongoDB Atlas M0 cluster
 * 2. Bring their own cluster (BYOC) by providing a connection string
 */

import { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  alpha,
  InputAdornment,
  Alert,
  Paper,
  Chip,
} from '@mui/material';
import {
  Storage,
  Cloud,
  Link as LinkIcon,
  CheckCircle,
  ArrowForward,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import { useOnboardingGate } from '@/contexts/OnboardingGateContext';

type SetupMethod = 'auto' | 'byoc' | null;

export function DatabaseStep() {
  const {
    status,
    setCurrentStep,
    setDatabaseMethod,
    setProvisioningStatus,
    refreshStatus,
    completeOnboarding,
  } = useOnboardingGate();

  const [selectedMethod, setSelectedMethod] = useState<SetupMethod>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // BYOC form state
  const [connectionString, setConnectionString] = useState('');
  const [database, setDatabase] = useState('');
  const [connectionName, setConnectionName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    databases?: string[];
    collections?: string[];
  } | null>(null);

  const orgId = status?.organization?.orgId;

  const handleSelectMethod = (method: SetupMethod) => {
    setSelectedMethod(method);
    setError(null);
    setTestResult(null);
  };

  const handleAutoProvision = async () => {
    if (!orgId) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/onboarding/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          method: 'auto',
        }),
      });

      const data = await response.json();

      if (data.success) {
        setDatabaseMethod('auto');
        setProvisioningStatus('creating');
        setCurrentStep('provisioning');
      } else {
        setError(data.error || 'Failed to start provisioning');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start provisioning');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBYOCSubmit = async () => {
    if (!orgId) return;

    if (!connectionString.trim()) {
      setError('Please enter a connection string');
      return;
    }

    if (!database.trim()) {
      setError('Please enter a database name');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/onboarding/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          method: 'byoc',
          connectionString: connectionString.trim(),
          database: database.trim(),
          name: connectionName.trim() || `${database} Connection`,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setTestResult({
          success: true,
          databases: data.databases,
          collections: data.collections,
        });
        setDatabaseMethod('byoc');
        // Refresh status and complete
        await refreshStatus();
        completeOnboarding();
      } else {
        setError(data.error || 'Failed to connect to database');
        setTestResult({ success: false });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to database');
      setTestResult({ success: false });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Method selection view
  if (!selectedMethod) {
    return (
      <Box>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            mb: 3,
          }}
        >
          <Storage sx={{ color: '#00ED64', fontSize: 28 }} />
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Set up your database
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Choose how you'd like to connect your data
            </Typography>
          </Box>
        </Box>

        {/* Option 1: Auto-provision */}
        <Paper
          onClick={() => handleSelectMethod('auto')}
          sx={{
            p: 2.5,
            mb: 2,
            cursor: 'pointer',
            border: '2px solid',
            borderColor: 'divider',
            borderRadius: 2,
            transition: 'all 0.2s ease',
            '&:hover': {
              borderColor: '#00ED64',
              bgcolor: alpha('#00ED64', 0.02),
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <Cloud sx={{ color: '#00ED64', fontSize: 32, mt: 0.5 }} />
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Auto-provision Free Cluster
                </Typography>
                <Chip
                  label="Recommended"
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.7rem',
                    bgcolor: alpha('#00ED64', 0.15),
                    color: '#00ED64',
                    fontWeight: 600,
                  }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                We'll create a free MongoDB Atlas M0 cluster for you automatically.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Typography variant="caption" color="text.secondary">
                  • 512MB storage
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  • Ready in ~3 minutes
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  • No credit card required
                </Typography>
              </Box>
            </Box>
            <ArrowForward sx={{ color: 'text.disabled' }} />
          </Box>
        </Paper>

        {/* Option 2: BYOC */}
        <Paper
          onClick={() => handleSelectMethod('byoc')}
          sx={{
            p: 2.5,
            cursor: 'pointer',
            border: '2px solid',
            borderColor: 'divider',
            borderRadius: 2,
            transition: 'all 0.2s ease',
            '&:hover': {
              borderColor: '#00ED64',
              bgcolor: alpha('#00ED64', 0.02),
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <LinkIcon sx={{ color: '#2196F3', fontSize: 32, mt: 0.5 }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                Bring Your Own Cluster
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Connect to your existing MongoDB Atlas cluster or self-hosted database.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Typography variant="caption" color="text.secondary">
                  • Any MongoDB version
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  • Any tier (M0, M10+)
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  • Self-hosted supported
                </Typography>
              </Box>
            </Box>
            <ArrowForward sx={{ color: 'text.disabled' }} />
          </Box>
        </Paper>
      </Box>
    );
  }

  // Auto-provision confirmation
  if (selectedMethod === 'auto') {
    return (
      <Box>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            mb: 3,
          }}
        >
          <Cloud sx={{ color: '#00ED64', fontSize: 28 }} />
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Auto-provision Free Cluster
            </Typography>
            <Typography variant="body2" color="text.secondary">
              We'll set up a MongoDB Atlas M0 cluster for you
            </Typography>
          </Box>
        </Box>

        <Paper
          sx={{
            p: 3,
            mb: 3,
            bgcolor: alpha('#00ED64', 0.05),
            border: '1px solid',
            borderColor: alpha('#00ED64', 0.2),
            borderRadius: 2,
          }}
        >
          <Typography variant="body2" sx={{ mb: 2 }}>
            Your free cluster includes:
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircle sx={{ color: '#00ED64', fontSize: 18 }} />
              <Typography variant="body2">512MB storage</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircle sx={{ color: '#00ED64', fontSize: 18 }} />
              <Typography variant="body2">Shared cluster on AWS</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircle sx={{ color: '#00ED64', fontSize: 18 }} />
              <Typography variant="body2">Pre-configured for NetPad</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircle sx={{ color: '#00ED64', fontSize: 18 }} />
              <Typography variant="body2">Automatic backups</Typography>
            </Box>
          </Box>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={() => handleSelectMethod(null)}
            disabled={isSubmitting}
            sx={{ flex: 1 }}
          >
            Back
          </Button>
          <Button
            variant="contained"
            onClick={handleAutoProvision}
            disabled={isSubmitting}
            endIcon={
              isSubmitting ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <ArrowForward />
              )
            }
            sx={{
              flex: 2,
              bgcolor: '#00ED64',
              color: '#001E2B',
              fontWeight: 600,
              '&:hover': { bgcolor: '#00c853' },
            }}
          >
            {isSubmitting ? 'Starting...' : 'Start Provisioning'}
          </Button>
        </Box>
      </Box>
    );
  }

  // BYOC form
  if (selectedMethod === 'byoc') {
    return (
      <Box>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            mb: 3,
          }}
        >
          <LinkIcon sx={{ color: '#2196F3', fontSize: 28 }} />
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Connect Your Database
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Enter your MongoDB connection details
            </Typography>
          </Box>
        </Box>

        <TextField
          fullWidth
          label="Connection String"
          placeholder="mongodb+srv://user:password@cluster.mongodb.net/"
          value={connectionString}
          onChange={(e) => setConnectionString(e.target.value)}
          type={showPassword ? 'text' : 'password'}
          sx={{ mb: 2 }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <Button
                  size="small"
                  onClick={() => setShowPassword(!showPassword)}
                  sx={{ minWidth: 'auto', p: 0.5 }}
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </Button>
              </InputAdornment>
            ),
          }}
          helperText="Your connection string is encrypted and stored securely"
        />

        <TextField
          fullWidth
          label="Database Name"
          placeholder="my_database"
          value={database}
          onChange={(e) => setDatabase(e.target.value)}
          sx={{ mb: 2 }}
          helperText="The database where NetPad will store data"
        />

        <TextField
          fullWidth
          label="Connection Name (Optional)"
          placeholder="Production Database"
          value={connectionName}
          onChange={(e) => setConnectionName(e.target.value)}
          sx={{ mb: 3 }}
          helperText="A friendly name to identify this connection"
        />

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {testResult?.success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Connection successful! Found {testResult.collections?.length || 0} collections.
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={() => handleSelectMethod(null)}
            disabled={isSubmitting}
            sx={{ flex: 1 }}
          >
            Back
          </Button>
          <Button
            variant="contained"
            onClick={handleBYOCSubmit}
            disabled={isSubmitting || !connectionString.trim() || !database.trim()}
            endIcon={
              isSubmitting ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <ArrowForward />
              )
            }
            sx={{
              flex: 2,
              bgcolor: '#00ED64',
              color: '#001E2B',
              fontWeight: 600,
              '&:hover': { bgcolor: '#00c853' },
              '&:disabled': {
                bgcolor: alpha('#00ED64', 0.3),
                color: alpha('#001E2B', 0.5),
              },
            }}
          >
            {isSubmitting ? 'Connecting...' : 'Connect & Continue'}
          </Button>
        </Box>
      </Box>
    );
  }

  return null;
}
