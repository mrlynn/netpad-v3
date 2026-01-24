/**
 * Admin Instance Control Console
 *
 * Platform admins can view instance status and trigger restarts.
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Paper,
  Alert,
  Card,
  CardContent,
  Chip,
  Button,
  Breadcrumbs,
  Link as MuiLink,
  alpha,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  LinearProgress,
  Divider,
  Grid,
} from '@mui/material';
import Link from 'next/link';
import {
  NavigateNext,
  Refresh,
  RestartAlt,
  Memory,
  Schedule,
  Cloud,
  Storage,
  CheckCircle,
  Warning,
  Extension,
  Settings,
} from '@mui/icons-material';
import useSWR from 'swr';
import { useAuth } from '@/contexts/AuthContext';
import { NetPadLoader } from '@/components/common/NetPadLoader';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface InstanceStatus {
  instance: {
    startedAt: string;
    uptime: string;
    uptimeMs: number;
    wasRestarted?: boolean;
    restartTime?: string | null;
  };
  node: {
    version: string;
    platform: string;
    arch: string;
    pid: number;
  };
  memory: {
    heapUsed: string;
    heapTotal: string;
    rss: string;
    external: string;
    heapUsedMB: number;
    heapTotalMB: number;
    rssMB: number;
  };
  environment: {
    type: 'vercel' | 'docker' | 'kubernetes' | 'pm2' | 'systemd' | 'standalone' | 'unknown';
    details: Record<string, string | boolean | undefined>;
    canRestart: boolean;
    restartMethod: string;
    deploymentMode: string;
  };
  extensions: {
    initialized: boolean;
    count: number;
    loaded: string[];
    features: string[];
  };
  config: {
    mongodbUri: string;
    vercelToken: string;
    vercelProjectId: string | null;
  };
}

export default function AdminInstancePage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [restartDialogOpen, setRestartDialogOpen] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [restartResult, setRestartResult] = useState<{
    success: boolean;
    message: string;
    deploymentUrl?: string;
  } | null>(null);

  const isAdmin = user?.platformRole === 'admin';

  const { data, error, isLoading, mutate } = useSWR<InstanceStatus>(
    isAdmin ? '/api/admin/instance' : null,
    fetcher,
    { refreshInterval: 10000 } // Refresh every 10 seconds
  );

  // Redirect if not admin
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/');
    }
  }, [authLoading, isAdmin, router]);

  const handleRestart = async () => {
    setRestarting(true);
    setRestartResult(null);

    try {
      const response = await fetch('/api/admin/instance/restart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      });

      const result = await response.json();
      setRestartResult(result);

      if (result.success && result.environment !== 'vercel') {
        // For non-Vercel, the server will exit - start polling for it to come back
        setTimeout(() => {
          const checkServer = setInterval(async () => {
            try {
              const res = await fetch('/api/admin/instance');
              if (res.ok) {
                clearInterval(checkServer);
                setRestarting(false);
                setRestartDialogOpen(false);
                mutate();
              }
            } catch {
              // Server still down, keep polling
            }
          }, 2000);

          // Stop polling after 60 seconds
          setTimeout(() => clearInterval(checkServer), 60000);
        }, 1000);
      } else {
        setRestarting(false);
      }
    } catch (err) {
      setRestartResult({
        success: false,
        message: err instanceof Error ? err.message : 'Failed to trigger restart',
      });
      setRestarting(false);
    }
  };

  const getEnvironmentIcon = (type: string) => {
    switch (type) {
      case 'vercel':
        return <Cloud />;
      case 'docker':
      case 'kubernetes':
        return <Storage />;
      default:
        return <Settings />;
    }
  };

  const getEnvironmentColor = (type: string) => {
    switch (type) {
      case 'vercel':
        return '#000';
      case 'kubernetes':
        return '#326CE5';
      case 'docker':
        return '#2496ED';
      case 'pm2':
        return '#2B037A';
      default:
        return '#666';
    }
  };

  if (authLoading || isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <NetPadLoader size="large" variant="ascii" message="Loading instance status..." />
      </Box>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const memoryPercent = data ? (data.memory.heapUsedMB / data.memory.heapTotalMB) * 100 : 0;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs separator={<NavigateNext fontSize="small" />} sx={{ mb: 3 }}>
        <MuiLink component={Link} href="/admin" color="inherit" underline="hover">
          Admin
        </MuiLink>
        <Typography color="text.primary">Instance</Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Instance Control
          </Typography>
          <Typography color="text.secondary">
            Monitor instance health and trigger restarts
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => mutate()}
            disabled={isLoading}
          >
            Refresh
          </Button>
          {data?.environment.canRestart && (
            <Button
              variant="contained"
              color="warning"
              startIcon={<RestartAlt />}
              onClick={() => setRestartDialogOpen(true)}
            >
              Restart Instance
            </Button>
          )}
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to load instance status: {error.message || 'Unknown error'}
        </Alert>
      )}

      {data && (
        <Grid container spacing={3}>
          {/* Instance Info */}
          <Grid item xs={12} md={6}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Schedule sx={{ color: 'primary.main' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Instance
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Uptime
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: 'success.main' }}>
                      {data.instance.uptime}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Started At
                    </Typography>
                    <Typography variant="body1">
                      {new Date(data.instance.startedAt).toLocaleString()}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Process ID
                    </Typography>
                    <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                      {data.node.pid}
                    </Typography>
                  </Box>
                  {data.instance.wasRestarted && (
                    <Box>
                      <Chip
                        icon={<RestartAlt fontSize="small" />}
                        label={`Restarted via Admin UI${data.instance.restartTime ? ` at ${new Date(data.instance.restartTime).toLocaleTimeString()}` : ''}`}
                        size="small"
                        color="info"
                        variant="outlined"
                      />
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Environment Info */}
          <Grid item xs={12} md={6}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  {getEnvironmentIcon(data.environment.type)}
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Environment
                  </Typography>
                  <Chip
                    label={data.environment.type}
                    size="small"
                    sx={{
                      ml: 1,
                      bgcolor: alpha(getEnvironmentColor(data.environment.type), 0.1),
                      color: getEnvironmentColor(data.environment.type),
                      fontWeight: 600,
                    }}
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Deployment Mode
                    </Typography>
                    <Typography variant="body1">
                      {data.environment.deploymentMode}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Node.js
                    </Typography>
                    <Typography variant="body1">
                      {data.node.version} ({data.node.platform}/{data.node.arch})
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Restart Method
                    </Typography>
                    <Typography variant="body2">
                      {data.environment.restartMethod}
                    </Typography>
                  </Box>
                  {Object.entries(data.environment.details).filter(([_, v]) => v).length > 0 && (
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Details
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {Object.entries(data.environment.details)
                          .filter(([_, v]) => v)
                          .map(([key, value]) => (
                            <Chip
                              key={key}
                              label={`${key}: ${value}`}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: '0.7rem' }}
                            />
                          ))}
                      </Box>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Memory Usage */}
          <Grid item xs={12} md={6}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Memory sx={{ color: 'info.main' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Memory Usage
                  </Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Heap Used
                    </Typography>
                    <Typography variant="body2">
                      {data.memory.heapUsed} / {data.memory.heapTotal}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={memoryPercent}
                    sx={{
                      height: 8,
                      borderRadius: 1,
                      bgcolor: alpha('#2196F3', 0.1),
                      '& .MuiLinearProgress-bar': {
                        bgcolor: memoryPercent > 80 ? 'warning.main' : 'info.main',
                      },
                    }}
                  />
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      RSS
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {data.memory.rss}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      External
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {data.memory.external}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Extensions */}
          <Grid item xs={12} md={6}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Extension sx={{ color: 'success.main' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Extensions
                  </Typography>
                  <Chip
                    icon={data.extensions.initialized ? <CheckCircle fontSize="small" /> : <Warning fontSize="small" />}
                    label={data.extensions.initialized ? 'Initialized' : 'Not Initialized'}
                    size="small"
                    color={data.extensions.initialized ? 'success' : 'warning'}
                    sx={{ ml: 1 }}
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Loaded Extensions ({data.extensions.count})
                    </Typography>
                    {data.extensions.loaded.length > 0 ? (
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {data.extensions.loaded.map((ext) => (
                          <Chip key={ext} label={ext} size="small" />
                        ))}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No extensions loaded
                      </Typography>
                    )}
                  </Box>
                  {data.extensions.features.length > 0 && (
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Enabled Features
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {data.extensions.features.map((feature) => (
                          <Chip key={feature} label={feature} size="small" variant="outlined" />
                        ))}
                      </Box>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Configuration Status */}
          <Grid item xs={12}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  Configuration Status
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {data.config.mongodbUri === '***configured***' ? (
                        <CheckCircle sx={{ color: 'success.main' }} />
                      ) : (
                        <Warning sx={{ color: 'warning.main' }} />
                      )}
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          MongoDB
                        </Typography>
                        <Typography variant="body1">
                          {data.config.mongodbUri === '***configured***' ? 'Configured' : 'Not Configured'}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {data.config.vercelToken === '***configured***' ? (
                        <CheckCircle sx={{ color: 'success.main' }} />
                      ) : (
                        <Warning sx={{ color: 'text.secondary' }} />
                      )}
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Vercel Token
                        </Typography>
                        <Typography variant="body1">
                          {data.config.vercelToken === '***configured***' ? 'Configured' : 'Not Configured'}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {data.config.vercelProjectId ? (
                        <CheckCircle sx={{ color: 'success.main' }} />
                      ) : (
                        <Warning sx={{ color: 'text.secondary' }} />
                      )}
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Vercel Project ID
                        </Typography>
                        <Typography variant="body1">
                          {data.config.vercelProjectId || 'Not Configured'}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Restart Confirmation Dialog */}
      <Dialog
        open={restartDialogOpen}
        onClose={() => !restarting && setRestartDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <RestartAlt color="warning" />
            Restart Instance
          </Box>
        </DialogTitle>
        <DialogContent>
          {restarting ? (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <NetPadLoader size="medium" variant="ascii" message={restartResult?.success
                  ? 'Instance is restarting... Waiting for it to come back online.'
                  : 'Triggering restart...'} />
            </Box>
          ) : restartResult ? (
            <Alert severity={restartResult.success ? 'success' : 'error'} sx={{ mb: 2 }}>
              {restartResult.message}
              {restartResult.deploymentUrl && (
                <Box sx={{ mt: 1 }}>
                  <MuiLink href={restartResult.deploymentUrl} target="_blank" rel="noopener">
                    View deployment
                  </MuiLink>
                </Box>
              )}
            </Alert>
          ) : (
            <>
              <DialogContentText sx={{ mb: 2 }}>
                Are you sure you want to restart the NetPad instance?
              </DialogContentText>
              <Alert severity="warning" sx={{ mb: 2 }}>
                <strong>This will temporarily disconnect all users.</strong>
                <br />
                {data?.environment.type === 'vercel'
                  ? 'A new deployment will be triggered via the Vercel API.'
                  : data?.environment.type === 'standalone'
                  ? 'A new process will be spawned before the current one exits (self-restart).'
                  : `The process will exit and ${data?.environment.type} will restart it automatically.`}
              </Alert>
              {data?.environment.type === 'vercel' && data.config.vercelToken !== '***configured***' && (
                <Alert severity="error">
                  Vercel token is not configured. Set the VERCEL_TOKEN environment variable to enable redeployments.
                </Alert>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestartDialogOpen(false)} disabled={restarting}>
            Cancel
          </Button>
          {!restartResult && (
            <Button
              onClick={handleRestart}
              color="warning"
              variant="contained"
              disabled={restarting || (data?.environment.type === 'vercel' && data.config.vercelToken !== '***configured***')}
            >
              {restarting ? 'Restarting...' : 'Confirm Restart'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
}
