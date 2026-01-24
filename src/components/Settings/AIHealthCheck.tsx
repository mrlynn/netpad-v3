'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  Chip,
  Grid,
  Divider,
  alpha,
  IconButton,
  Tooltip,
} from '@mui/material';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  SmartToy as SmartToyIcon,
  Cloud as CloudIcon,
  Memory as MemoryIcon,
  Speed as SpeedIcon,
  VpnKey as VpnKeyIcon,
} from '@mui/icons-material';
import { SettingsSection } from './SettingsSection';

interface AIHealthData {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'not_configured';
  timestamp: string;
  provider?: {
    type: 'openai' | 'ollama' | 'openrouter';
    name: string;
    configured: boolean;
    available: boolean;
    baseURL?: string;
    defaultModel?: string;
    error?: string;
  };
  test?: {
    completed: boolean;
    success: boolean;
    responseTime?: number;
    error?: string;
    sampleResponse?: string;
  };
  models?: {
    available: boolean;
    count?: number;
    models?: string[];
    error?: string;
  };
  environment: {
    openaiConfigured: boolean;
    ollamaConfigured: boolean;
    openrouterConfigured: boolean;
    activeProvider: 'openai' | 'ollama' | 'openrouter' | 'none';
  };
}

export function AIHealthCheck() {
  const [health, setHealth] = useState<AIHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/ai/health');
      const data = await response.json();
      setHealth(data);
      setLastChecked(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch health status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'success';
      case 'degraded':
        return 'warning';
      case 'unhealthy':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircleIcon color="success" />;
      case 'degraded':
        return <WarningIcon color="warning" />;
      case 'unhealthy':
        return <ErrorIcon color="error" />;
      default:
        return <ErrorIcon />;
    }
  };

  const formatResponseTime = (ms?: number) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  if (loading && !health) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <NetPadLoader size="large" variant="ascii" message="Checking AI/LLM configuration..." />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
            AI/LLM Health Check
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Verify your AI provider configuration and connectivity
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchHealth}
          disabled={loading}
          size="small"
        >
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {health && (
        <>
          {/* Overall Status */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                {getStatusIcon(health.status)}
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Overall Status
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {health.status === 'healthy' && 'AI service is operational'}
                    {health.status === 'degraded' && 'AI service is working but may have issues'}
                    {health.status === 'unhealthy' && 'AI service is not available'}
                    {health.status === 'not_configured' && 'No AI provider is configured'}
                  </Typography>
                </Box>
                <Chip
                  label={health.status.toUpperCase()}
                  color={getStatusColor(health.status) as any}
                  size="small"
                />
              </Box>
              {lastChecked && (
                <Typography variant="caption" color="text.secondary">
                  Last checked: {lastChecked.toLocaleTimeString()}
                </Typography>
              )}
            </CardContent>
          </Card>

          {/* Provider Configuration */}
          <SettingsSection
            title="Provider Configuration"
            description="Current AI/LLM provider settings"
            icon={<SmartToyIcon />}
            defaultExpanded={true}
          >
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Active Provider
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    {health.environment.activeProvider === 'ollama' && <MemoryIcon />}
                    {health.environment.activeProvider === 'openai' && <CloudIcon />}
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {health.environment.activeProvider === 'none'
                        ? 'Not Configured'
                        : health.provider?.name || health.environment.activeProvider.toUpperCase()}
                    </Typography>
                  </Box>
                </Box>
              </Grid>

              {health.provider && (
                <>
                  {health.provider.defaultModel && (
                    <Grid item xs={12} md={6}>
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          Default Model
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {health.provider.defaultModel}
                        </Typography>
                      </Box>
                    </Grid>
                  )}

                  {health.provider.baseURL && (
                    <Grid item xs={12}>
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          Base URL
                        </Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {health.provider.baseURL}
                        </Typography>
                      </Box>
                    </Grid>
                  )}

                  <Grid item xs={12}>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Availability
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {health.provider.available ? (
                          <Chip
                            icon={<CheckCircleIcon />}
                            label="Available"
                            color="success"
                            size="small"
                          />
                        ) : (
                          <Chip
                            icon={<ErrorIcon />}
                            label="Unavailable"
                            color="error"
                            size="small"
                          />
                        )}
                        {health.provider.error && (
                          <Typography variant="caption" color="error">
                            {health.provider.error}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </Grid>
                </>
              )}
            </Grid>
          </SettingsSection>

          {/* Environment Variables */}
          <SettingsSection
            title="Environment Variables"
            description="Configured AI provider environment variables"
            icon={<VpnKeyIcon />}
            defaultExpanded={false}
          >
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 1,
                    bgcolor: health.environment.openaiConfigured
                      ? alpha('#4caf50', 0.1)
                      : alpha('#000', 0.05),
                    border: `1px solid ${health.environment.openaiConfigured ? '#4caf50' : '#ddd'}`,
                  }}
                >
                  <Typography variant="subtitle2" gutterBottom>
                    OpenAI
                  </Typography>
                  <Chip
                    label={health.environment.openaiConfigured ? 'Configured' : 'Not Set'}
                    color={health.environment.openaiConfigured ? 'success' : 'default'}
                    size="small"
                  />
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 1,
                    bgcolor: health.environment.ollamaConfigured
                      ? alpha('#2196f3', 0.1)
                      : alpha('#000', 0.05),
                    border: `1px solid ${health.environment.ollamaConfigured ? '#2196f3' : '#ddd'}`,
                  }}
                >
                  <Typography variant="subtitle2" gutterBottom>
                    Ollama
                  </Typography>
                  <Chip
                    label={health.environment.ollamaConfigured ? 'Configured' : 'Not Set'}
                    color={health.environment.ollamaConfigured ? 'success' : 'default'}
                    size="small"
                  />
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 1,
                    bgcolor: health.environment.openrouterConfigured
                      ? alpha('#9c27b0', 0.1)
                      : alpha('#000', 0.05),
                    border: `1px solid ${health.environment.openrouterConfigured ? '#9c27b0' : '#ddd'}`,
                  }}
                >
                  <Typography variant="subtitle2" gutterBottom>
                    OpenRouter
                  </Typography>
                  <Chip
                    label={health.environment.openrouterConfigured ? 'Configured' : 'Not Set'}
                    color={health.environment.openrouterConfigured ? 'success' : 'default'}
                    size="small"
                  />
                </Box>
              </Grid>
            </Grid>
          </SettingsSection>

          {/* Connection Test */}
          {health.test && (
            <SettingsSection
              title="Connection Test"
              description="Test AI provider with a sample request"
              icon={<SpeedIcon />}
              defaultExpanded={true}
            >
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Test Status
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {health.test.success ? (
                        <Chip
                          icon={<CheckCircleIcon />}
                          label="Success"
                          color="success"
                          size="small"
                        />
                      ) : (
                        <Chip
                          icon={<ErrorIcon />}
                          label="Failed"
                          color="error"
                          size="small"
                        />
                      )}
                    </Box>
                  </Box>
                </Grid>

                {health.test.responseTime && (
                  <Grid item xs={12} md={6}>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Response Time
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {formatResponseTime(health.test.responseTime)}
                      </Typography>
                    </Box>
                  </Grid>
                )}

                {health.test.sampleResponse && (
                  <Grid item xs={12}>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Sample Response
                      </Typography>
                      <Alert severity="success" sx={{ fontFamily: 'monospace' }}>
                        {health.test.sampleResponse}
                      </Alert>
                    </Box>
                  </Grid>
                )}

                {health.test.error && (
                  <Grid item xs={12}>
                    <Alert severity="error">{health.test.error}</Alert>
                  </Grid>
                )}
              </Grid>
            </SettingsSection>
          )}

          {/* Available Models */}
          {health.models && (
            <SettingsSection
              title="Available Models"
              description="Models available from your AI provider"
              icon={<MemoryIcon />}
              defaultExpanded={false}
            >
              {health.models.available ? (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    {health.models.count || 0} model(s) available
                  </Typography>
                  {health.models.models && health.models.models.length > 0 && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                      {health.models.models.map((model, index) => (
                        <Chip
                          key={index}
                          label={model}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                      {health.models.count && health.models.count > 10 && (
                        <Chip
                          label={`+${health.models.count - 10} more`}
                          size="small"
                          variant="outlined"
                          color="default"
                        />
                      )}
                    </Box>
                  )}
                </Box>
              ) : (
                <Alert severity="warning">
                  {health.models.error || 'Unable to fetch available models'}
                </Alert>
              )}
            </SettingsSection>
          )}

          {/* Not Configured Message */}
          {health.status === 'not_configured' && (
            <Alert severity="info" sx={{ mt: 3 }}>
              <Typography variant="body2" gutterBottom sx={{ fontWeight: 600 }}>
                No AI provider is currently configured.
              </Typography>
              <Typography variant="body2">
                To enable AI features, set one of the following environment variables:
              </Typography>
              <Box component="ul" sx={{ mt: 1, pl: 3 }}>
                <li>
                  <code>OLLAMA_BASE_URL</code> - For self-hosted Ollama (e.g.,{' '}
                  <code>http://localhost:11434</code>)
                </li>
                <li>
                  <code>OPENAI_API_KEY</code> - For OpenAI (cloud)
                </li>
                <li>
                  <code>OPENROUTER_API_KEY</code> - For OpenRouter
                </li>
              </Box>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Restart your server after setting environment variables.
              </Typography>
            </Alert>
          )}
        </>
      )}

      {loading && health && (
        <Box sx={{ textAlign: 'center', py: 2 }}>
          <NetPadLoader size="small" variant="ascii" showPhrases={false} />
        </Box>
      )}
    </Box>
  );
}