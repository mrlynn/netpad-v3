'use client';

import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  alpha,
  Skeleton,
  Chip,
  IconButton,
  Tooltip,
  LinearProgress,
  Divider,
} from '@mui/material';
import {
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  HelpOutline,
  Refresh,
  Storage,
  Psychology,
  Email,
  CloudQueue,
  Api,
  Speed,
  PlayArrow,
} from '@mui/icons-material';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
} from 'recharts';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface ServiceStatus {
  serviceName: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  latencyMs: number;
  lastCheckedAt: string;
  nextCheckAt: string;
  errorMessage?: string;
  consecutiveFailures: number;
  uptimePercent24h: number;
}

interface SystemStatusResponse {
  success: boolean;
  timestamp: string;
  overallStatus: 'healthy' | 'degraded' | 'unhealthy';
  avgUptime24h: number;
  services: ServiceStatus[];
  uptimes: Array<{ service: string; uptime: number }>;
  history?: Record<string, Array<{ status: string; latencyMs: number; recordedAt: string }>>;
}

const COLORS = {
  healthy: '#00ED64',
  degraded: '#FF9800',
  unhealthy: '#f44336',
  unknown: '#9e9e9e',
};

const SERVICE_ICONS: Record<string, React.ReactNode> = {
  api: <Api />,
  database: <Storage />,
  ai: <Psychology />,
  email: <Email />,
  storage: <CloudQueue />,
};

const SERVICE_LABELS: Record<string, string> = {
  api: 'API Server',
  database: 'MongoDB',
  ai: 'AI Services',
  email: 'Email (SMTP)',
  storage: 'Blob Storage',
};

function getStatusIcon(status: string) {
  switch (status) {
    case 'healthy':
      return <CheckCircle sx={{ color: COLORS.healthy }} />;
    case 'degraded':
      return <Warning sx={{ color: COLORS.degraded }} />;
    case 'unhealthy':
      return <ErrorIcon sx={{ color: COLORS.unhealthy }} />;
    default:
      return <HelpOutline sx={{ color: COLORS.unknown }} />;
  }
}

function getStatusColor(status: string): string {
  return COLORS[status as keyof typeof COLORS] || COLORS.unknown;
}

function formatLatency(ms: number): string {
  if (ms < 1) return '<1ms';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

interface ServiceCardProps {
  service: ServiceStatus;
  history?: Array<{ status: string; latencyMs: number; recordedAt: string }>;
}

function ServiceCard({ service, history }: ServiceCardProps) {
  const statusColor = getStatusColor(service.status);

  // Prepare chart data
  const chartData = history?.slice(-20).map((h) => ({
    time: new Date(h.recordedAt).getTime(),
    latency: h.latencyMs,
    status: h.status,
  })) || [];

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        height: '100%',
        border: '1px solid',
        borderColor: alpha(statusColor, 0.3),
        borderRadius: 2,
        bgcolor: alpha(statusColor, 0.05),
        transition: 'all 0.2s ease',
        '&:hover': {
          borderColor: alpha(statusColor, 0.5),
          boxShadow: `0 4px 20px ${alpha(statusColor, 0.15)}`,
        },
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              p: 1,
              borderRadius: 1.5,
              bgcolor: alpha(statusColor, 0.15),
              color: statusColor,
              display: 'flex',
            }}
          >
            {SERVICE_ICONS[service.serviceName] || <Api />}
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {SERVICE_LABELS[service.serviceName] || service.serviceName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Last checked: {formatTime(service.lastCheckedAt)}
            </Typography>
          </Box>
        </Box>
        {getStatusIcon(service.status)}
      </Box>

      {/* Metrics */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={6}>
          <Typography variant="caption" color="text.secondary">
            Latency
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {formatLatency(service.latencyMs)}
          </Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="caption" color="text.secondary">
            Uptime (24h)
          </Typography>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              color: service.uptimePercent24h >= 99 ? COLORS.healthy : service.uptimePercent24h >= 95 ? COLORS.degraded : COLORS.unhealthy,
            }}
          >
            {service.uptimePercent24h.toFixed(1)}%
          </Typography>
        </Grid>
      </Grid>

      {/* Uptime bar */}
      <Box sx={{ mb: 2 }}>
        <LinearProgress
          variant="determinate"
          value={service.uptimePercent24h}
          sx={{
            height: 6,
            borderRadius: 1,
            bgcolor: alpha(statusColor, 0.2),
            '& .MuiLinearProgress-bar': {
              bgcolor: statusColor,
              borderRadius: 1,
            },
          }}
        />
      </Box>

      {/* Latency Chart */}
      {chartData.length > 0 && (
        <Box sx={{ height: 60, mt: 1 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <Area
                type="monotone"
                dataKey="latency"
                stroke={statusColor}
                fill={alpha(statusColor, 0.3)}
                strokeWidth={1.5}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      )}

      {/* Error message */}
      {service.errorMessage && (
        <Box
          sx={{
            mt: 2,
            p: 1.5,
            bgcolor: alpha(COLORS.unhealthy, 0.1),
            borderRadius: 1,
            border: '1px solid',
            borderColor: alpha(COLORS.unhealthy, 0.3),
          }}
        >
          <Typography variant="caption" sx={{ color: COLORS.unhealthy }}>
            {service.errorMessage}
          </Typography>
        </Box>
      )}

      {/* Consecutive failures */}
      {service.consecutiveFailures > 0 && (
        <Chip
          label={`${service.consecutiveFailures} consecutive failures`}
          size="small"
          color="error"
          sx={{ mt: 1 }}
        />
      )}
    </Paper>
  );
}

export function SystemStatusDashboard() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRunningCron, setIsRunningCron] = useState(false);
  const [cronResult, setCronResult] = useState<{ success: boolean; message: string } | null>(null);

  const { data, error, isLoading, mutate } = useSWR<SystemStatusResponse>(
    '/api/admin/system-status?includeHistory=true&historyHours=6',
    fetcher,
    { refreshInterval: 60000 } // Refresh every minute
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetch('/api/admin/system-status', { method: 'POST' });
      await mutate();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRunCron = async () => {
    setIsRunningCron(true);
    setCronResult(null);
    try {
      const response = await fetch('/api/cron/observability');
      const result = await response.json();
      if (response.ok) {
        setCronResult({
          success: true,
          message: `Cron completed: ${result.healthChecks?.completed || 0} health checks, ${result.alertsEvaluated || 0} alerts evaluated`
        });
        // Refresh the dashboard data after cron runs
        await mutate();
      } else {
        setCronResult({ success: false, message: result.error || 'Cron job failed' });
      }
    } catch (err) {
      setCronResult({ success: false, message: 'Failed to run cron job' });
    } finally {
      setIsRunningCron(false);
      // Clear the result message after 5 seconds
      setTimeout(() => setCronResult(null), 5000);
    }
  };

  if (error) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 4,
          bgcolor: alpha(COLORS.unhealthy, 0.1),
          border: '1px solid',
          borderColor: alpha(COLORS.unhealthy, 0.3),
          borderRadius: 2,
        }}
      >
        <Typography color="error">Failed to load system status</Typography>
      </Paper>
    );
  }

  const overallStatusColor = data?.overallStatus ? getStatusColor(data.overallStatus) : COLORS.unknown;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: alpha(overallStatusColor, 0.15),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Speed sx={{ fontSize: 32, color: overallStatusColor }} />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              System Status
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              {isLoading ? (
                <Skeleton width={100} height={24} />
              ) : (
                <>
                  <Chip
                    label={data?.overallStatus?.toUpperCase() || 'UNKNOWN'}
                    size="small"
                    sx={{
                      bgcolor: alpha(overallStatusColor, 0.15),
                      color: overallStatusColor,
                      fontWeight: 600,
                    }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {data?.avgUptime24h?.toFixed(1)}% avg uptime (24h)
                  </Typography>
                </>
              )}
            </Box>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {cronResult && (
            <Chip
              label={cronResult.message}
              size="small"
              color={cronResult.success ? 'success' : 'error'}
              onDelete={() => setCronResult(null)}
            />
          )}
          <Tooltip title="Run observability cron job (health checks, alerts, metrics aggregation)">
            <IconButton
              onClick={handleRunCron}
              disabled={isLoading || isRunningCron}
              sx={{
                bgcolor: alpha('#00ED64', 0.1),
                '&:hover': { bgcolor: alpha('#00ED64', 0.2) },
              }}
            >
              <PlayArrow sx={{
                color: '#00ED64',
                animation: isRunningCron ? 'pulse 1s ease-in-out infinite' : 'none'
              }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Run health check">
            <IconButton onClick={handleRefresh} disabled={isLoading || isRefreshing}>
              <Refresh sx={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Service Cards */}
      <Grid container spacing={2}>
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <Grid item xs={12} sm={6} md={4} lg={2.4} key={i}>
                <Skeleton variant="rounded" height={220} />
              </Grid>
            ))
          : data?.services.map((service) => (
              <Grid item xs={12} sm={6} md={4} lg={2.4} key={service.serviceName}>
                <ServiceCard service={service} history={data.history?.[service.serviceName]} />
              </Grid>
            ))}
      </Grid>

      {/* Global Latency Chart */}
      {data?.history && Object.keys(data.history).length > 0 && (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mt: 3,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Latency Trend (Last 6 Hours)
          </Typography>
          <Box sx={{ height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={
                  data.history.database?.map((h, i) => ({
                    time: new Date(h.recordedAt).getTime(),
                    database: h.latencyMs,
                    ai: data.history?.ai?.[i]?.latencyMs || 0,
                    email: data.history?.email?.[i]?.latencyMs || 0,
                    storage: data.history?.storage?.[i]?.latencyMs || 0,
                  })) || []
                }
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis
                  dataKey="time"
                  tickFormatter={(value) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  tick={{ fontSize: 12 }}
                />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `${value}ms`} />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    border: 'none',
                    borderRadius: 8,
                    color: '#fff',
                  }}
                  formatter={(value, name) => {
                    const numValue = typeof value === 'number' ? value : 0;
                    const strName = String(name);
                    return [`${numValue}ms`, SERVICE_LABELS[strName] || strName];
                  }}
                  labelFormatter={(value) => new Date(value as number).toLocaleTimeString()}
                />
                <Area
                  type="monotone"
                  dataKey="database"
                  stroke="#2196F3"
                  fill={alpha('#2196F3', 0.3)}
                  name="database"
                />
                <Area
                  type="monotone"
                  dataKey="ai"
                  stroke="#00ED64"
                  fill={alpha('#00ED64', 0.3)}
                  name="ai"
                />
                <Area
                  type="monotone"
                  dataKey="email"
                  stroke="#9C27B0"
                  fill={alpha('#9C27B0', 0.3)}
                  name="email"
                />
                <Area
                  type="monotone"
                  dataKey="storage"
                  stroke="#00BCD4"
                  fill={alpha('#00BCD4', 0.3)}
                  name="storage"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
        </Paper>
      )}

      {/* CSS for animations */}
      <style jsx global>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </Box>
  );
}
