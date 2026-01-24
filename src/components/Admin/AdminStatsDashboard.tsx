'use client';

import {
  Box,
  Paper,
  Typography,
  Grid,
  alpha,
  Skeleton,
  Divider,
  Tooltip,
  IconButton,
  Chip,
} from '@mui/material';
import {
  People,
  Business,
  Storage,
  Psychology,
  Memory,
  TrendingUp,
  TrendingDown,
  Schedule,
  Speed,
  AttachMoney,
  Description,
  AccountTree,
  Apps,
  Inbox,
  Refresh,
  CheckCircle,
  Error as ErrorIcon,
} from '@mui/icons-material';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts';
import useSWR from 'swr';
import { StatCard } from './StatCard';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface PlatformStats {
  users: {
    total: number;
    verified: number;
    active7Days: number;
    active30Days: number;
    newThisWeek: number;
    newThisMonth: number;
    byRole: { admin: number; support: number; regular: number };
    byAuth: { passkey: number; oauth: number; password: number };
    trend: number;
  };
  organizations: {
    total: number;
    active7Days: number;
    active30Days: number;
    avgUsersPerOrg: number;
  };
  clusters: {
    total: number;
    ready: number;
    provisioning: number;
    failed: number;
    inactive30Days: number;
  };
  ai: {
    totalRequests30Days: number;
    totalTokens30Days: number;
    totalCostUsd30Days: number;
    avgLatencyMs: number;
    successRate: number;
    uniqueUsers: number;
    projectedMonthlyCost: number;
    topFeatures: Array<{ feature: string; requests: number; tokens: number }>;
    dailyTrend: Array<{ date: string; requests: number; tokens: number; costUsd: number }>;
  };
  system: {
    uptime: string;
    uptimeMs: number;
    memoryUsedMB: number;
    memoryTotalMB: number;
    nodeVersion: string;
    environment: string;
    extensionsLoaded: number;
  };
  content: {
    totalForms: number;
    totalWorkflows: number;
    totalApps: number;
    totalSubmissions: number;
  };
}

const COLORS = {
  primary: '#00ED64', // MongoDB green
  secondary: '#2196F3',
  warning: '#FF9800',
  error: '#f44336',
  purple: '#9C27B0',
  cyan: '#00BCD4',
  pink: '#E91E63',
};

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatCurrency(n: number): string {
  if (n < 0.01 && n > 0) return '<$0.01';
  return `$${n.toFixed(2)}`;
}

function formatFeatureName(feature: string): string {
  return feature
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

interface SectionHeaderProps {
  title: string;
  icon: React.ReactNode;
  color: string;
}

function SectionHeader({ title, icon, color }: SectionHeaderProps) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
      <Box
        sx={{
          p: 1,
          borderRadius: 1.5,
          bgcolor: alpha(color, 0.1),
          color: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </Box>
      <Typography variant="h6" sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
    </Box>
  );
}

interface MiniStatProps {
  label: string;
  value: string | number;
  color?: string;
  subtitle?: string;
}

function MiniStat({ label, value, color, subtitle }: MiniStatProps) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
        {label}
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 600, color: color || 'text.primary' }}>
        {typeof value === 'number' ? formatNumber(value) : value}
      </Typography>
      {subtitle && (
        <Typography variant="caption" color="text.secondary">
          {subtitle}
        </Typography>
      )}
    </Box>
  );
}

export function AdminStatsDashboard() {
  const { data, error, isLoading, mutate } = useSWR<{ success: boolean; stats: PlatformStats }>(
    '/api/admin/platform-stats',
    fetcher,
    { refreshInterval: 0 } // Manual refresh only
  );

  const stats = data?.stats;

  if (error) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 4,
          bgcolor: alpha(COLORS.error, 0.1),
          border: '1px solid',
          borderColor: alpha(COLORS.error, 0.3),
          borderRadius: 2,
        }}
      >
        <Typography color="error">Failed to load platform statistics</Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ mb: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Platform Overview
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Enterprise statistics and metrics
          </Typography>
        </Box>
        <Tooltip title="Refresh statistics">
          <IconButton onClick={() => mutate()} disabled={isLoading}>
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Top-level KPIs */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={6} sm={4} md={2}>
          {isLoading ? (
            <Skeleton variant="rounded" height={100} />
          ) : (
            <StatCard
              title="Total Users"
              value={formatNumber(stats?.users.total || 0)}
              icon={<People />}
              color="primary"
              trend={
                stats?.users.trend
                  ? {
                      value: Math.abs(stats.users.trend),
                      direction: stats.users.trend > 0 ? 'up' : stats.users.trend < 0 ? 'down' : 'neutral',
                      label: 'vs last month',
                    }
                  : undefined
              }
            />
          )}
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          {isLoading ? (
            <Skeleton variant="rounded" height={100} />
          ) : (
            <StatCard
              title="Organizations"
              value={formatNumber(stats?.organizations.total || 0)}
              icon={<Business />}
              color="info"
              subtitle={`${stats?.organizations.active30Days || 0} active`}
            />
          )}
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          {isLoading ? (
            <Skeleton variant="rounded" height={100} />
          ) : (
            <StatCard
              title="Active Clusters"
              value={stats?.clusters.ready || 0}
              icon={<Storage />}
              color={stats?.clusters.inactive30Days ? 'warning' : 'success'}
              subtitle={stats?.clusters.inactive30Days ? `${stats.clusters.inactive30Days} inactive` : 'All active'}
            />
          )}
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          {isLoading ? (
            <Skeleton variant="rounded" height={100} />
          ) : (
            <StatCard
              title="AI Requests"
              value={formatNumber(stats?.ai.totalRequests30Days || 0)}
              icon={<Psychology />}
              color="primary"
              subtitle="Last 30 days"
            />
          )}
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          {isLoading ? (
            <Skeleton variant="rounded" height={100} />
          ) : (
            <StatCard
              title="AI Cost"
              value={formatCurrency(stats?.ai.totalCostUsd30Days || 0)}
              icon={<AttachMoney />}
              color="warning"
              subtitle={`~${formatCurrency(stats?.ai.projectedMonthlyCost || 0)}/mo`}
            />
          )}
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          {isLoading ? (
            <Skeleton variant="rounded" height={100} />
          ) : (
            <StatCard
              title="Uptime"
              value={stats?.system.uptime || '—'}
              icon={<Schedule />}
              color="success"
              subtitle={stats?.system.environment}
            />
          )}
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Users & Organizations Section */}
        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              height: '100%',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
            }}
          >
            <SectionHeader title="Users & Organizations" icon={<People />} color={COLORS.secondary} />

            {isLoading ? (
              <Skeleton variant="rounded" height={200} />
            ) : (
              <>
                <Grid container spacing={3} sx={{ mb: 3 }}>
                  <Grid item xs={4}>
                    <MiniStat
                      label="Verified"
                      value={stats?.users.verified || 0}
                      color={COLORS.primary}
                      subtitle={`${stats?.users.total ? Math.round((stats.users.verified / stats.users.total) * 100) : 0}%`}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <MiniStat
                      label="Active (7d)"
                      value={stats?.users.active7Days || 0}
                      color={COLORS.secondary}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <MiniStat
                      label="New This Week"
                      value={stats?.users.newThisWeek || 0}
                      color={COLORS.primary}
                    />
                  </Grid>
                </Grid>

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                  Authentication Methods
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip
                    label={`Passkey: ${stats?.users.byAuth.passkey || 0}`}
                    size="small"
                    sx={{ bgcolor: alpha(COLORS.primary, 0.1), color: COLORS.primary }}
                  />
                  <Chip
                    label={`OAuth: ${stats?.users.byAuth.oauth || 0}`}
                    size="small"
                    sx={{ bgcolor: alpha(COLORS.secondary, 0.1), color: COLORS.secondary }}
                  />
                  <Chip
                    label={`Password: ${stats?.users.byAuth.password || 0}`}
                    size="small"
                    sx={{ bgcolor: alpha(COLORS.warning, 0.1), color: COLORS.warning }}
                  />
                </Box>

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                  User Roles
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip
                    label={`Admin: ${stats?.users.byRole.admin || 0}`}
                    size="small"
                    color="error"
                    variant="outlined"
                  />
                  <Chip
                    label={`Support: ${stats?.users.byRole.support || 0}`}
                    size="small"
                    color="warning"
                    variant="outlined"
                  />
                  <Chip
                    label={`Regular: ${stats?.users.byRole.regular || 0}`}
                    size="small"
                    color="default"
                    variant="outlined"
                  />
                </Box>
              </>
            )}
          </Paper>
        </Grid>

        {/* AI Usage Section */}
        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              height: '100%',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
            }}
          >
            <SectionHeader title="AI Usage (30 Days)" icon={<Psychology />} color={COLORS.primary} />

            {isLoading ? (
              <Skeleton variant="rounded" height={200} />
            ) : (
              <>
                <Grid container spacing={3} sx={{ mb: 3 }}>
                  <Grid item xs={4}>
                    <MiniStat
                      label="Total Tokens"
                      value={formatNumber(stats?.ai.totalTokens30Days || 0)}
                      color={COLORS.primary}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <MiniStat
                      label="Avg Latency"
                      value={`${Math.round(stats?.ai.avgLatencyMs || 0)}ms`}
                      color={COLORS.secondary}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <MiniStat
                      label="Success Rate"
                      value={`${((stats?.ai.successRate || 0) * 100).toFixed(1)}%`}
                      color={(stats?.ai.successRate || 0) > 0.95 ? COLORS.primary : COLORS.warning}
                    />
                  </Grid>
                </Grid>

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                  Top AI Features
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {stats?.ai.topFeatures.slice(0, 4).map((feature, index) => (
                    <Box
                      key={feature.feature}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Typography variant="body2">
                        {formatFeatureName(feature.feature)}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Typography variant="caption" color="text.secondary">
                          {formatNumber(feature.requests)} requests
                        </Typography>
                        <Typography variant="caption" sx={{ color: COLORS.primary }}>
                          {formatNumber(feature.tokens)} tokens
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                  {(!stats?.ai.topFeatures || stats.ai.topFeatures.length === 0) && (
                    <Typography variant="body2" color="text.secondary">
                      No AI usage data available
                    </Typography>
                  )}
                </Box>
              </>
            )}
          </Paper>
        </Grid>

        {/* AI Trend Chart */}
        <Grid item xs={12}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
            }}
          >
            <SectionHeader title="AI Usage Trend (14 Days)" icon={<TrendingUp />} color={COLORS.primary} />

            {isLoading ? (
              <Skeleton variant="rounded" height={300} />
            ) : (
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={stats?.ai.dailyTrend || []}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return `${date.getMonth() + 1}/${date.getDate()}`;
                      }}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => formatNumber(value)}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `$${value.toFixed(2)}`}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        border: 'none',
                        borderRadius: 8,
                        color: '#fff',
                      }}
                      formatter={(value, name) => {
                        const numValue = typeof value === 'number' ? value : 0;
                        if (name === 'costUsd') return [`$${numValue.toFixed(4)}`, 'Cost'];
                        if (name === 'tokens') return [formatNumber(numValue), 'Tokens'];
                        return [formatNumber(numValue), 'Requests'];
                      }}
                    />
                    <Legend />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="requests"
                      stroke={COLORS.secondary}
                      fill={alpha(COLORS.secondary, 0.3)}
                      name="Requests"
                    />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="tokens"
                      stroke={COLORS.primary}
                      fill={alpha(COLORS.primary, 0.3)}
                      name="Tokens"
                    />
                    <Area
                      yAxisId="right"
                      type="monotone"
                      dataKey="costUsd"
                      stroke={COLORS.warning}
                      fill={alpha(COLORS.warning, 0.3)}
                      name="Cost ($)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* System Health */}
        <Grid item xs={12} md={4}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              height: '100%',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
            }}
          >
            <SectionHeader title="System Health" icon={<Memory />} color={COLORS.cyan} />

            {isLoading ? (
              <Skeleton variant="rounded" height={150} />
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Memory Usage
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {stats?.system.memoryUsedMB.toFixed(1)} / {stats?.system.memoryTotalMB.toFixed(1)} MB
                  </Typography>
                </Box>
                <Box sx={{ position: 'relative', height: 8, bgcolor: alpha(COLORS.cyan, 0.2), borderRadius: 1 }}>
                  <Box
                    sx={{
                      position: 'absolute',
                      height: '100%',
                      width: `${stats?.system.memoryTotalMB ? (stats.system.memoryUsedMB / stats.system.memoryTotalMB) * 100 : 0}%`,
                      bgcolor: COLORS.cyan,
                      borderRadius: 1,
                    }}
                  />
                </Box>

                <Divider />

                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Node Version
                  </Typography>
                  <Typography variant="body2">{stats?.system.nodeVersion}</Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Environment
                  </Typography>
                  <Chip
                    label={stats?.system.environment}
                    size="small"
                    color={stats?.system.environment === 'vercel' ? 'primary' : 'default'}
                  />
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Extensions
                  </Typography>
                  <Typography variant="body2">{stats?.system.extensionsLoaded} loaded</Typography>
                </Box>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Cluster Status */}
        <Grid item xs={12} md={4}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              height: '100%',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
            }}
          >
            <SectionHeader title="Cluster Status" icon={<Storage />} color={COLORS.purple} />

            {isLoading ? (
              <Skeleton variant="rounded" height={150} />
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircle sx={{ color: COLORS.primary, fontSize: 18 }} />
                    <Typography variant="body2">Ready</Typography>
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: COLORS.primary }}>
                    {stats?.clusters.ready || 0}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Schedule sx={{ color: COLORS.warning, fontSize: 18 }} />
                    <Typography variant="body2">Provisioning</Typography>
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: COLORS.warning }}>
                    {stats?.clusters.provisioning || 0}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ErrorIcon sx={{ color: COLORS.error, fontSize: 18 }} />
                    <Typography variant="body2">Failed</Typography>
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: COLORS.error }}>
                    {stats?.clusters.failed || 0}
                  </Typography>
                </Box>

                <Divider />

                {(stats?.clusters.inactive30Days || 0) > 0 && (
                  <Box
                    sx={{
                      p: 1.5,
                      bgcolor: alpha(COLORS.warning, 0.1),
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: alpha(COLORS.warning, 0.3),
                    }}
                  >
                    <Typography variant="body2" sx={{ color: COLORS.warning, fontWeight: 500 }}>
                      {stats?.clusters.inactive30Days} clusters inactive for 30+ days
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Content Stats */}
        <Grid item xs={12} md={4}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              height: '100%',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
            }}
          >
            <SectionHeader title="Platform Content" icon={<Apps />} color={COLORS.pink} />

            {isLoading ? (
              <Skeleton variant="rounded" height={150} />
            ) : (
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box
                    sx={{
                      p: 2,
                      bgcolor: alpha(COLORS.secondary, 0.1),
                      borderRadius: 1,
                      textAlign: 'center',
                    }}
                  >
                    <Description sx={{ color: COLORS.secondary, mb: 0.5 }} />
                    <Typography variant="h5" sx={{ fontWeight: 600 }}>
                      {formatNumber(stats?.content.totalForms || 0)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Forms
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box
                    sx={{
                      p: 2,
                      bgcolor: alpha(COLORS.purple, 0.1),
                      borderRadius: 1,
                      textAlign: 'center',
                    }}
                  >
                    <AccountTree sx={{ color: COLORS.purple, mb: 0.5 }} />
                    <Typography variant="h5" sx={{ fontWeight: 600 }}>
                      {formatNumber(stats?.content.totalWorkflows || 0)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Workflows
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box
                    sx={{
                      p: 2,
                      bgcolor: alpha(COLORS.primary, 0.1),
                      borderRadius: 1,
                      textAlign: 'center',
                    }}
                  >
                    <Apps sx={{ color: COLORS.primary, mb: 0.5 }} />
                    <Typography variant="h5" sx={{ fontWeight: 600 }}>
                      {formatNumber(stats?.content.totalApps || 0)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Apps
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box
                    sx={{
                      p: 2,
                      bgcolor: alpha(COLORS.cyan, 0.1),
                      borderRadius: 1,
                      textAlign: 'center',
                    }}
                  >
                    <Inbox sx={{ color: COLORS.cyan, mb: 0.5 }} />
                    <Typography variant="h5" sx={{ fontWeight: 600 }}>
                      {formatNumber(stats?.content.totalSubmissions || 0)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Submissions
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
