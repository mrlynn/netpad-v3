/**
 * Admin AI Analytics Dashboard
 *
 * Platform admins can view AI usage statistics, token consumption,
 * cost estimates, and usage trends across all users and organizations.
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  ToggleButton,
  ToggleButtonGroup,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  alpha,
  Skeleton,
  Breadcrumbs,
  Link as MuiLink,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  Alert,
} from '@mui/material';
import Link from 'next/link';
import {
  Psychology as PsychologyIcon,
  Token as TokenIcon,
  AttachMoney as MoneyIcon,
  Speed as SpeedIcon,
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  Error as ErrorIcon,
  CheckCircle as SuccessIcon,
  NavigateNext as NavigateNextIcon,
  Visibility as VisibilityIcon,
  Science as ScienceIcon,
} from '@mui/icons-material';
import { AppNavBar } from '@/components/Navigation/AppNavBar';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import { useAuth } from '@/contexts/AuthContext';
import { AIUsageSummary } from '@/types/ai-analytics';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

// Color palette
const COLORS = ['#00ED64', '#2196F3', '#FF9800', '#9C27B0', '#E91E63', '#00BCD4', '#8BC34A', '#FF5722'];

interface AIAnalyticsData {
  success: boolean;
  period: {
    days: number;
    startDate: string;
    endDate: string;
  };
  summary: {
    totalRequests: number;
    totalTokens: number;
    promptTokens: number;
    completionTokens: number;
    totalCostUsd: number;
    avgLatencyMs: number;
    uniqueUsers: number;
    uniqueOrgs: number;
    successRate: number;
  };
  trends: Array<{
    date: string;
    requests: number;
    tokens: number;
    costUsd: number;
    avgLatencyMs: number;
  }>;
  byFeature: Array<{
    feature: string;
    requests: number;
    tokens: number;
    costUsd: number;
  }>;
  byModel: Array<{
    model: string;
    requests: number;
    tokens: number;
    costUsd: number;
  }>;
  topOrganizations: Array<{
    organizationId: string;
    requests: number;
    tokens: number;
    costUsd: number;
  }>;
  errors: {
    totalErrors: number;
    errorRate: number;
    byErrorCode: Array<{ code: string; count: number }>;
  };
  efficiency: {
    avgTokensPerRequest: number;
    avgCostPerRequest: number;
    avgPromptTokensPerRequest: number;
    avgCompletionTokensPerRequest: number;
    tokenEfficiency: number;
  };
  hourly: Array<{
    hour: number;
    requests: number;
    tokens: number;
    costUsd: number;
    avgLatencyMs: number;
  }>;
  modelPerformance: Array<{
    model: string;
    requests: number;
    totalTokens: number;
    totalCostUsd: number;
    avgLatencyMs: number;
    successRate: number;
    errorRate: number;
    avgCostPerRequest: number;
    avgTokensPerRequest: number;
    p50Latency: number;
    p95Latency: number;
    p99Latency: number;
  }>;
  costProjection: {
    currentPeriodCost: number;
    projectedMonthlyCost: number;
    projectedYearlyCost: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    growthRate: number;
    daysAnalyzed: number;
    avgDailyCost: number;
  };
  featureAdoption: Array<{
    feature: string;
    totalUsers: number;
    activeUsers: number;
    adoptionRate: number;
    avgRequestsPerUser: number;
    retentionRate: number;
    totalRequests: number;
    totalTokens: number;
  }>;
  quotaMetrics: Array<{
    orgId: string;
    limitHits: number;
    limitHitsByFeature: Record<string, number>;
    avgUsageBeforeLimit: number;
    upgradeSuggestions: string[];
    currentUsage: {
      generations: number;
      agentSessions: number;
      processingRuns: number;
    };
    limits: {
      generations: number;
      agentSessions: number;
      processingRuns: number;
    };
  }>;
  userJourneys?: Array<{
    userId: string;
    featureSequence: string[];
    sessionDuration: number;
    featuresUsed: string[];
    totalCost: number;
    totalTokens: number;
    outcome: 'completed' | 'abandoned' | 'error';
    startTime: string;
    endTime: string;
  }>;
  costAnomalies?: Array<{
    orgId: string;
    anomalyType: 'spike' | 'drop' | 'unusual_pattern';
    detectedAt: string;
    expectedCost: number;
    actualCost: number;
    deviation: number;
    possibleCauses: string[];
    date: string;
  }>;
  qualityMetrics?: Array<{
    feature: string;
    avgConfidence: number;
    retryRate: number;
    acceptanceRate: number;
    avgLatencyMs: number;
    successRate: number;
    totalRequests: number;
  }>;
  comparative?: {
    period1: {
      label: string;
      startDate: string;
      endDate: string;
      summary: AIUsageSummary;
    };
    period2: {
      label: string;
      startDate: string;
      endDate: string;
      summary: AIUsageSummary;
    };
    change: {
      requests: number;
      tokens: number;
      cost: number;
      latency: number;
      users: number;
    };
    insights: string[];
  };
  organizations?: Array<{
    organizationId: string;
    name?: string;
    requests: number;
    tokens: number;
    costUsd: number;
    isDemo: boolean;
  }>;
  demoAnalytics?: {
    totalRequests: number;
    totalTokens: number;
    totalCostUsd: number;
    uniqueVisitors: number;
    avgLatencyMs: number;
    successRate: number;
    byTemplate: Array<{
      templateId: string;
      requests: number;
      tokens: number;
    }>;
    byDay: Array<{
      date: string;
      requests: number;
      tokens: number;
    }>;
    topIPs: Array<{
      ip: string;
      requests: number;
    }>;
  };
}

interface TopUsersData {
  success: boolean;
  users: Array<{
    userId: string;
    email?: string;
    name?: string;
    requests: number;
    tokens: number;
    costUsd: number;
    avgLatencyMs: number;
  }>;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatCurrency(n: number): string {
  if (n === 0) return '$0.00';
  if (n < 0.01) return '<$0.01';
  return `$${n.toFixed(2)}`;
}

function formatFeatureName(feature: string): string {
  return feature
    .replace(/_/g, ' ')
    .replace(/ai /i, '')
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  loading?: boolean;
}

function StatCard({ title, value, subtitle, icon, color, loading }: StatCardProps) {
  return (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: alpha(color, 0.1),
              color: color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </Box>
          <Box sx={{ flex: 1 }}>
            {loading ? (
              <>
                <Skeleton width={80} height={36} />
                <Skeleton width={60} height={20} />
              </>
            ) : (
              <>
                <Typography variant="h5" fontWeight={700}>
                  {value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {title}
                </Typography>
                {subtitle && (
                  <Typography variant="caption" color="text.secondary">
                    {subtitle}
                  </Typography>
                )}
              </>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function AIAnalyticsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [days, setDays] = useState(30);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string>(''); // Empty = all orgs
  const [showDemoAnalytics, setShowDemoAnalytics] = useState(true);

  // Build API URL with optional Phase 3 parameters
  const apiUrl = user?.platformRole === 'admin'
    ? `/api/admin/ai-analytics?days=${days}${selectedOrgId ? `&orgId=${selectedOrgId}` : ''}${showAdvanced ? '&includeJourneys=true&includeAnomalies=true&includeQuality=true&comparePeriod=30' : ''}&includeDemoAnalytics=${showDemoAnalytics}`
    : null;

  // Fetch main analytics data
  const { data: analyticsData, isLoading: analyticsLoading } = useSWR<AIAnalyticsData>(
    apiUrl,
    fetcher,
    { refreshInterval: 60000 }
  );

  // Fetch top users
  const { data: topUsersData, isLoading: usersLoading } = useSWR<TopUsersData>(
    user?.platformRole === 'admin' ? `/api/admin/ai-analytics/top-users?days=${days}&limit=10` : null,
    fetcher,
    { refreshInterval: 60000 }
  );

  // Redirect non-admins
  useEffect(() => {
    if (!authLoading && (!user || user.platformRole !== 'admin')) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <NetPadLoader size="large" variant="ascii" message="Loading AI analytics..." />
      </Box>
    );
  }

  if (!user || user.platformRole !== 'admin') {
    return null;
  }

  const summary = analyticsData?.summary;
  const trends = analyticsData?.trends || [];
  const byFeature = analyticsData?.byFeature || [];
  const byModel = analyticsData?.byModel || [];
  const topUsers = topUsersData?.users || [];
  const efficiency = analyticsData?.efficiency;
  const hourly = analyticsData?.hourly || [];
  const modelPerformance = analyticsData?.modelPerformance || [];
  const costProjection = analyticsData?.costProjection;
  const featureAdoption = analyticsData?.featureAdoption || [];
  const quotaMetrics = analyticsData?.quotaMetrics || [];
  const userJourneys = analyticsData?.userJourneys || [];
  const costAnomalies = analyticsData?.costAnomalies || [];
  const qualityMetrics = analyticsData?.qualityMetrics || [];
  const comparative = analyticsData?.comparative;
  const organizations = analyticsData?.organizations || [];
  const demoAnalytics = analyticsData?.demoAnalytics;

  return (
    <>
      <AppNavBar />
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Breadcrumb Navigation */}
        <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 2 }}>
          <MuiLink component={Link} href="/admin" color="inherit" underline="hover">
            Admin Dashboard
          </MuiLink>
          <Typography color="text.primary">AI Analytics</Typography>
        </Breadcrumbs>

        {/* Header */}
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight={700}>
              AI Usage Analytics
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Monitor AI usage, token consumption, and costs across all organizations
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Organization Filter */}
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Organization</InputLabel>
              <Select
                value={selectedOrgId}
                label="Organization"
                onChange={(e) => setSelectedOrgId(e.target.value)}
              >
                <MenuItem value="">
                  <em>All Organizations</em>
                </MenuItem>
                <Divider />
                {organizations.filter(o => o.isDemo).map((org) => (
                  <MenuItem key={org.organizationId} value={org.organizationId}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ScienceIcon fontSize="small" color="warning" />
                      {org.name || org.organizationId}
                      <Chip size="small" label={formatNumber(org.requests)} sx={{ ml: 'auto' }} />
                    </Box>
                  </MenuItem>
                ))}
                {organizations.filter(o => o.isDemo).length > 0 && <Divider />}
                {organizations.filter(o => !o.isDemo).map((org) => (
                  <MenuItem key={org.organizationId} value={org.organizationId}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                        {org.name || org.organizationId.slice(0, 20)}
                      </Typography>
                      <Chip size="small" label={formatNumber(org.requests)} sx={{ ml: 'auto' }} />
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <ToggleButtonGroup
              value={days}
              exclusive
              onChange={(_, value) => value && setDays(value)}
              size="small"
            >
              <ToggleButton value={7}>7 Days</ToggleButton>
              <ToggleButton value={30}>30 Days</ToggleButton>
              <ToggleButton value={90}>90 Days</ToggleButton>
            </ToggleButtonGroup>
            <ToggleButton
              value="advanced"
              selected={showAdvanced}
              onChange={() => setShowAdvanced(!showAdvanced)}
              size="small"
            >
              Advanced Metrics
            </ToggleButton>
          </Box>
        </Box>

        {/* Selected Org Alert */}
        {selectedOrgId && (
          <Alert
            severity={selectedOrgId === 'demo_guest' ? 'warning' : 'info'}
            sx={{ mb: 3 }}
            action={
              <Chip
                label="Clear Filter"
                size="small"
                onClick={() => setSelectedOrgId('')}
                sx={{ cursor: 'pointer' }}
              />
            }
          >
            {selectedOrgId === 'demo_guest'
              ? 'Showing Demo/Guest usage only. This data is from unauthenticated template previews.'
              : `Filtered to organization: ${organizations.find(o => o.organizationId === selectedOrgId)?.name || selectedOrgId}`
            }
          </Alert>
        )}

        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={6} sm={4} md={3} lg={2}>
            <StatCard
              title="Total Requests"
              value={formatNumber(summary?.totalRequests || 0)}
              icon={<PsychologyIcon />}
              color="#2196F3"
              loading={analyticsLoading}
            />
          </Grid>
          <Grid item xs={6} sm={4} md={3} lg={2}>
            <StatCard
              title="Total Tokens"
              value={formatNumber(summary?.totalTokens || 0)}
              subtitle={`${formatNumber(summary?.promptTokens || 0)} in / ${formatNumber(summary?.completionTokens || 0)} out`}
              icon={<TokenIcon />}
              color="#00ED64"
              loading={analyticsLoading}
            />
          </Grid>
          <Grid item xs={6} sm={4} md={3} lg={2}>
            <StatCard
              title="Estimated Cost"
              value={formatCurrency(summary?.totalCostUsd || 0)}
              icon={<MoneyIcon />}
              color="#FF9800"
              loading={analyticsLoading}
            />
          </Grid>
          <Grid item xs={6} sm={4} md={3} lg={2}>
            <StatCard
              title="Avg Latency"
              value={`${summary?.avgLatencyMs || 0}ms`}
              icon={<SpeedIcon />}
              color="#9C27B0"
              loading={analyticsLoading}
            />
          </Grid>
          <Grid item xs={6} sm={4} md={3} lg={2}>
            <StatCard
              title="Unique Users"
              value={summary?.uniqueUsers || 0}
              subtitle={`${summary?.uniqueOrgs || 0} organizations`}
              icon={<PeopleIcon />}
              color="#00BCD4"
              loading={analyticsLoading}
            />
          </Grid>
          <Grid item xs={6} sm={4} md={3} lg={2}>
            <StatCard
              title="Success Rate"
              value={`${summary?.successRate || 0}%`}
              icon={summary?.successRate && summary.successRate > 95 ? <SuccessIcon /> : <ErrorIcon />}
              color={summary?.successRate && summary.successRate > 95 ? '#00ED64' : '#f44336'}
              loading={analyticsLoading}
            />
          </Grid>
        </Grid>

        {/* Efficiency Metrics Cards */}
        {efficiency && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12}>
              <Typography variant="h5" fontWeight={600} sx={{ mb: 2 }}>
                Efficiency Metrics
              </Typography>
            </Grid>
            <Grid item xs={6} sm={4} md={3}>
              <StatCard
                title="Avg Tokens/Request"
                value={formatNumber(efficiency.avgTokensPerRequest)}
                subtitle={`${formatNumber(efficiency.avgPromptTokensPerRequest)} in / ${formatNumber(efficiency.avgCompletionTokensPerRequest)} out`}
                icon={<TokenIcon />}
                color="#00ED64"
                loading={analyticsLoading}
              />
            </Grid>
            <Grid item xs={6} sm={4} md={3}>
              <StatCard
                title="Avg Cost/Request"
                value={formatCurrency(efficiency.avgCostPerRequest)}
                icon={<MoneyIcon />}
                color="#FF9800"
                loading={analyticsLoading}
              />
            </Grid>
            <Grid item xs={6} sm={4} md={3}>
              <StatCard
                title="Token Efficiency"
                value={efficiency.tokenEfficiency.toFixed(2)}
                subtitle={efficiency.tokenEfficiency > 1 ? 'More output than input' : 'More input than output'}
                icon={<TrendingUpIcon />}
                color={efficiency.tokenEfficiency > 1 ? '#00ED64' : '#2196F3'}
                loading={analyticsLoading}
              />
            </Grid>
            <Grid item xs={6} sm={4} md={3}>
              <StatCard
                title="Prompt Efficiency"
                value={`${formatNumber(efficiency.avgPromptTokensPerRequest)} tokens`}
                subtitle="Average input size"
                icon={<PsychologyIcon />}
                color="#9C27B0"
                loading={analyticsLoading}
              />
            </Grid>
          </Grid>
        )}

        {/* Demo Analytics Section */}
        {demoAnalytics && !selectedOrgId && (
          <Paper sx={{ p: 3, mb: 4, bgcolor: alpha('#FF9800', 0.05), border: '1px solid', borderColor: alpha('#FF9800', 0.3) }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: alpha('#FF9800', 0.1),
                  color: '#FF9800',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ScienceIcon />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" fontWeight={600}>
                  Demo / Guest Usage
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  AI usage from template previews and unauthenticated demo sessions
                </Typography>
              </Box>
              <Chip
                label="View Details"
                color="warning"
                variant="outlined"
                onClick={() => setSelectedOrgId('demo_guest')}
                sx={{ cursor: 'pointer' }}
              />
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={6} sm={4} md={2}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" fontWeight={700} color="warning.main">
                    {formatNumber(demoAnalytics.totalRequests)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Demo Requests
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" fontWeight={700} color="warning.main">
                    {formatNumber(demoAnalytics.totalTokens)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Tokens Used
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" fontWeight={700} color="warning.main">
                    {formatCurrency(demoAnalytics.totalCostUsd)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Demo Cost
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" fontWeight={700} color="warning.main">
                    {demoAnalytics.uniqueVisitors}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Unique Visitors
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" fontWeight={700} color="warning.main">
                    {demoAnalytics.avgLatencyMs}ms
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Avg Latency
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" fontWeight={700} color={demoAnalytics.successRate > 90 ? 'success.main' : 'error.main'}>
                    {demoAnalytics.successRate}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Success Rate
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            {/* Top Demo Visitors */}
            {demoAnalytics.topIPs.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Top Demo Visitors (by IP)
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {demoAnalytics.topIPs.slice(0, 5).map((ip, idx) => (
                    <Chip
                      key={idx}
                      size="small"
                      label={`${ip.ip.slice(0, 10)}... (${ip.requests} req)`}
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Box>
            )}
          </Paper>
        )}

        {/* Charts Row */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Usage Trend Chart */}
          <Grid item xs={12} lg={8}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                Usage Trend
              </Typography>
              {analyticsLoading ? (
                <Skeleton variant="rectangular" height={300} />
              ) : trends.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return `${date.getMonth() + 1}/${date.getDate()}`;
                      }}
                    />
                    <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                      formatter={(value, name) => [
                        name === 'tokens' ? formatNumber(value as number) : value,
                        name === 'tokens' ? 'Tokens' : 'Requests',
                      ]}
                    />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="tokens"
                      stroke="#00ED64"
                      strokeWidth={2}
                      dot={false}
                      name="Tokens"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="requests"
                      stroke="#2196F3"
                      strokeWidth={2}
                      dot={false}
                      name="Requests"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography color="text.secondary">No data available for this period</Typography>
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Model Distribution */}
          <Grid item xs={12} lg={4}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                Usage by Model
              </Typography>
              {analyticsLoading ? (
                <Skeleton variant="rectangular" height={300} />
              ) : byModel.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={byModel}
                      dataKey="tokens"
                      nameKey="model"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ name, percent }) =>
                        (percent || 0) > 0.05 ? `${String(name).split('-').pop()} (${((percent || 0) * 100).toFixed(0)}%)` : ''
                      }
                      labelLine={false}
                    >
                      {byModel.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                      formatter={(value) => [formatNumber(value as number), 'Tokens']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography color="text.secondary">No data available</Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>

        {/* Hourly Usage Chart */}
        {hourly.length > 0 && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                  Hourly Usage Pattern
                </Typography>
                {analyticsLoading ? (
                  <Skeleton variant="rectangular" height={300} />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={hourly}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis
                        dataKey="hour"
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => `${value}:00`}
                      />
                      <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                        formatter={(value, name) => [
                          name === 'tokens' ? formatNumber(value as number) : value,
                          name === 'tokens' ? 'Tokens' : name === 'requests' ? 'Requests' : 'Cost',
                        ]}
                        labelFormatter={(value) => `Hour ${value}:00`}
                      />
                      <Legend />
                      <Bar yAxisId="left" dataKey="tokens" fill="#00ED64" name="Tokens" />
                      <Bar yAxisId="right" dataKey="requests" fill="#2196F3" name="Requests" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Paper>
            </Grid>
          </Grid>
        )}

        {/* Model Performance Table */}
        {modelPerformance.length > 0 && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                  Model Performance Comparison
                </Typography>
                {analyticsLoading ? (
                  <Skeleton variant="rectangular" height={400} />
                ) : (
                  <TableContainer>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell>Model</TableCell>
                          <TableCell align="right">Requests</TableCell>
                          <TableCell align="right">Total Tokens</TableCell>
                          <TableCell align="right">Total Cost</TableCell>
                          <TableCell align="right">Avg Cost/Req</TableCell>
                          <TableCell align="right">Success Rate</TableCell>
                          <TableCell align="right">Avg Latency</TableCell>
                          <TableCell align="right">P50</TableCell>
                          <TableCell align="right">P95</TableCell>
                          <TableCell align="right">P99</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {modelPerformance.map((model) => (
                          <TableRow key={model.model} hover>
                            <TableCell>
                              <Typography variant="body2" fontWeight={500}>
                                {model.model}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">{formatNumber(model.requests)}</TableCell>
                            <TableCell align="right">{formatNumber(model.totalTokens)}</TableCell>
                            <TableCell align="right">{formatCurrency(model.totalCostUsd)}</TableCell>
                            <TableCell align="right">{formatCurrency(model.avgCostPerRequest)}</TableCell>
                            <TableCell align="right">
                              <Chip
                                size="small"
                                label={`${model.successRate}%`}
                                color={model.successRate > 95 ? 'success' : model.successRate > 80 ? 'warning' : 'error'}
                                sx={{ minWidth: 60 }}
                              />
                            </TableCell>
                            <TableCell align="right">{formatNumber(model.avgLatencyMs)}ms</TableCell>
                            <TableCell align="right">{formatNumber(model.p50Latency)}ms</TableCell>
                            <TableCell align="right">{formatNumber(model.p95Latency)}ms</TableCell>
                            <TableCell align="right">{formatNumber(model.p99Latency)}ms</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Paper>
            </Grid>
          </Grid>
        )}

        {/* Cost Projection */}
        {costProjection && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                  Cost Projections
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={4}>
                    <Box sx={{ textAlign: 'center', p: 2 }}>
                      <Typography variant="h4" fontWeight={700} color="primary">
                        {formatCurrency(costProjection.projectedMonthlyCost)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Projected Monthly Cost
                      </Typography>
                      <Chip
                        label={costProjection.trend}
                        color={
                          costProjection.trend === 'increasing'
                            ? 'warning'
                            : costProjection.trend === 'decreasing'
                              ? 'success'
                              : 'default'
                        }
                        size="small"
                        sx={{ mt: 1 }}
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Box sx={{ textAlign: 'center', p: 2 }}>
                      <Typography variant="h4" fontWeight={700} color="primary">
                        {formatCurrency(costProjection.projectedYearlyCost)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Projected Yearly Cost
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        Based on {costProjection.daysAnalyzed} days of data
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Box sx={{ textAlign: 'center', p: 2 }}>
                      <Typography variant="h4" fontWeight={700} color="primary">
                        {formatCurrency(costProjection.avgDailyCost)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Average Daily Cost
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        {costProjection.growthRate > 0 ? '+' : ''}
                        {costProjection.growthRate.toFixed(1)}% growth rate
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        )}

        {/* Feature Adoption */}
        {featureAdoption.length > 0 && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                  Feature Adoption Metrics
                </Typography>
                {analyticsLoading ? (
                  <Skeleton variant="rectangular" height={400} />
                ) : (
                  <TableContainer>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell>Feature</TableCell>
                          <TableCell align="right">Total Users</TableCell>
                          <TableCell align="right">Active Users (7d)</TableCell>
                          <TableCell align="right">Adoption Rate</TableCell>
                          <TableCell align="right">Avg Req/User</TableCell>
                          <TableCell align="right">Retention Rate</TableCell>
                          <TableCell align="right">Total Requests</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {featureAdoption.map((feature) => (
                          <TableRow key={feature.feature} hover>
                            <TableCell>
                              <Typography variant="body2" fontWeight={500}>
                                {formatFeatureName(feature.feature)}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">{formatNumber(feature.totalUsers)}</TableCell>
                            <TableCell align="right">{formatNumber(feature.activeUsers)}</TableCell>
                            <TableCell align="right">
                              <Chip
                                size="small"
                                label={`${feature.adoptionRate}%`}
                                color={
                                  feature.adoptionRate > 50
                                    ? 'success'
                                    : feature.adoptionRate > 20
                                      ? 'warning'
                                      : 'default'
                                }
                                sx={{ minWidth: 60 }}
                              />
                            </TableCell>
                            <TableCell align="right">
                              {feature.avgRequestsPerUser.toFixed(1)}
                            </TableCell>
                            <TableCell align="right">
                              <Chip
                                size="small"
                                label={`${feature.retentionRate}%`}
                                color={feature.retentionRate > 30 ? 'success' : 'default'}
                                sx={{ minWidth: 60 }}
                              />
                            </TableCell>
                            <TableCell align="right">{formatNumber(feature.totalRequests)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Paper>
            </Grid>
          </Grid>
        )}

        {/* Quota Metrics (only show if org-specific or if there are orgs hitting limits) */}
        {quotaMetrics.length > 0 && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                  Quota & Rate Limit Status
                </Typography>
                {analyticsLoading ? (
                  <Skeleton variant="rectangular" height={400} />
                ) : (
                  <TableContainer>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell>Organization</TableCell>
                          <TableCell align="right">Limit Hits</TableCell>
                          <TableCell align="right">Generations</TableCell>
                          <TableCell align="right">Agent Sessions</TableCell>
                          <TableCell align="right">Processing Runs</TableCell>
                          <TableCell>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {quotaMetrics
                          .filter((q) => q.limitHits > 0 || q.upgradeSuggestions.length > 0)
                          .slice(0, 10)
                          .map((quota) => {
                            const genPercent =
                              quota.limits.generations !== -1
                                ? (quota.currentUsage.generations / quota.limits.generations) * 100
                                : 0;
                            const agentPercent =
                              quota.limits.agentSessions !== -1
                                ? (quota.currentUsage.agentSessions / quota.limits.agentSessions) * 100
                                : 0;
                            const procPercent =
                              quota.limits.processingRuns !== -1
                                ? (quota.currentUsage.processingRuns / quota.limits.processingRuns) * 100
                                : 0;

                            return (
                              <TableRow key={quota.orgId} hover>
                                <TableCell>
                                  <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                                    {quota.orgId}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Chip
                                    size="small"
                                    label={quota.limitHits}
                                    color={quota.limitHits > 0 ? 'error' : 'default'}
                                  />
                                </TableCell>
                                <TableCell align="right">
                                  {quota.limits.generations === -1 ? (
                                    'Unlimited'
                                  ) : (
                                    <>
                                      {formatNumber(quota.currentUsage.generations)} /{' '}
                                      {formatNumber(quota.limits.generations)}
                                      <Chip
                                        size="small"
                                        label={`${Math.round(genPercent)}%`}
                                        color={
                                          genPercent >= 100
                                            ? 'error'
                                            : genPercent >= 80
                                              ? 'warning'
                                              : 'default'
                                        }
                                        sx={{ ml: 1 }}
                                      />
                                    </>
                                  )}
                                </TableCell>
                                <TableCell align="right">
                                  {quota.limits.agentSessions === -1 ? (
                                    'Unlimited'
                                  ) : (
                                    <>
                                      {formatNumber(quota.currentUsage.agentSessions)} /{' '}
                                      {formatNumber(quota.limits.agentSessions)}
                                      <Chip
                                        size="small"
                                        label={`${Math.round(agentPercent)}%`}
                                        color={
                                          agentPercent >= 100
                                            ? 'error'
                                            : agentPercent >= 80
                                              ? 'warning'
                                              : 'default'
                                        }
                                        sx={{ ml: 1 }}
                                      />
                                    </>
                                  )}
                                </TableCell>
                                <TableCell align="right">
                                  {quota.limits.processingRuns === -1 ? (
                                    'Unlimited'
                                  ) : (
                                    <>
                                      {formatNumber(quota.currentUsage.processingRuns)} /{' '}
                                      {formatNumber(quota.limits.processingRuns)}
                                      <Chip
                                        size="small"
                                        label={`${Math.round(procPercent)}%`}
                                        color={
                                          procPercent >= 100
                                            ? 'error'
                                            : procPercent >= 80
                                              ? 'warning'
                                              : 'default'
                                        }
                                        sx={{ ml: 1 }}
                                      />
                                    </>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {quota.upgradeSuggestions.length > 0 && (
                                    <Typography variant="caption" color="warning.main">
                                      {quota.upgradeSuggestions[0]}
                                    </Typography>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Paper>
            </Grid>
          </Grid>
        )}

        {/* Feature Breakdown and Top Users */}
        <Grid container spacing={3}>
          {/* Feature Breakdown */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                Usage by Feature
              </Typography>
              {analyticsLoading ? (
                <Skeleton variant="rectangular" height={300} />
              ) : byFeature.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={byFeature.slice(0, 8)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis
                      dataKey="feature"
                      type="category"
                      tick={{ fontSize: 11 }}
                      width={120}
                      tickFormatter={formatFeatureName}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                      formatter={(value) => [formatNumber(value as number), 'Tokens']}
                      labelFormatter={(label) => formatFeatureName(String(label))}
                    />
                    <Bar dataKey="tokens" fill="#00ED64" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography color="text.secondary">No data available</Typography>
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Top Users Table */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                Top Users by Token Usage
              </Typography>
              {usersLoading ? (
                <Skeleton variant="rectangular" height={300} />
              ) : topUsers.length > 0 ? (
                <TableContainer sx={{ maxHeight: 300 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>User</TableCell>
                        <TableCell align="right">Requests</TableCell>
                        <TableCell align="right">Tokens</TableCell>
                        <TableCell align="right">Cost</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {topUsers.map((user, index) => (
                        <TableRow key={user.userId} hover>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Chip
                                size="small"
                                label={index + 1}
                                sx={{
                                  minWidth: 24,
                                  height: 24,
                                  bgcolor: index < 3 ? alpha(COLORS[index], 0.2) : 'transparent',
                                  color: index < 3 ? COLORS[index] : 'text.secondary',
                                }}
                              />
                              <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                                {user.email || user.name || user.userId.slice(0, 12)}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="right">{formatNumber(user.requests)}</TableCell>
                          <TableCell align="right">{formatNumber(user.tokens)}</TableCell>
                          <TableCell align="right">{formatCurrency(user.costUsd)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography color="text.secondary">No user data available</Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>

        {/* Phase 3: Advanced Metrics */}
        {showAdvanced && (
          <>
            {/* Comparative Analytics */}
            {comparative && (
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                      Period Comparison
                    </Typography>
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                            {comparative.period1.label}
                          </Typography>
                          <Grid container spacing={2}>
                            <Grid item xs={6}>
                              <Typography variant="body2">Requests</Typography>
                              <Typography variant="h6">{formatNumber(comparative.period1.summary.totalRequests)}</Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="body2">Cost</Typography>
                              <Typography variant="h6">{formatCurrency(comparative.period1.summary.totalCostUsd)}</Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="body2">Tokens</Typography>
                              <Typography variant="h6">{formatNumber(comparative.period1.summary.totalTokens)}</Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="body2">Users</Typography>
                              <Typography variant="h6">{comparative.period1.summary.uniqueUsers}</Typography>
                            </Grid>
                          </Grid>
                        </Box>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                            {comparative.period2.label}
                          </Typography>
                          <Grid container spacing={2}>
                            <Grid item xs={6}>
                              <Typography variant="body2">Requests</Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="h6">{formatNumber(comparative.period2.summary.totalRequests)}</Typography>
                                <Chip
                                  size="small"
                                  label={`${comparative.change.requests > 0 ? '+' : ''}${comparative.change.requests.toFixed(1)}%`}
                                  color={comparative.change.requests > 0 ? 'success' : 'error'}
                                />
                              </Box>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="body2">Cost</Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="h6">{formatCurrency(comparative.period2.summary.totalCostUsd)}</Typography>
                                <Chip
                                  size="small"
                                  label={`${comparative.change.cost > 0 ? '+' : ''}${comparative.change.cost.toFixed(1)}%`}
                                  color={comparative.change.cost > 0 ? 'error' : 'success'}
                                />
                              </Box>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="body2">Tokens</Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="h6">{formatNumber(comparative.period2.summary.totalTokens)}</Typography>
                                <Chip
                                  size="small"
                                  label={`${comparative.change.tokens > 0 ? '+' : ''}${comparative.change.tokens.toFixed(1)}%`}
                                  color={comparative.change.tokens > 0 ? 'success' : 'error'}
                                />
                              </Box>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="body2">Users</Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="h6">{comparative.period2.summary.uniqueUsers}</Typography>
                                <Chip
                                  size="small"
                                  label={`${comparative.change.users > 0 ? '+' : ''}${comparative.change.users.toFixed(1)}%`}
                                  color={comparative.change.users > 0 ? 'success' : 'default'}
                                />
                              </Box>
                            </Grid>
                          </Grid>
                        </Box>
                      </Grid>
                      {comparative.insights.length > 0 && (
                        <Grid item xs={12}>
                          <Box sx={{ mt: 2, p: 2, bgcolor: alpha('#2196F3', 0.1), borderRadius: 1 }}>
                            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                              Key Insights
                            </Typography>
                            {comparative.insights.map((insight, idx) => (
                              <Typography key={idx} variant="body2" sx={{ mb: 0.5 }}>
                                • {insight}
                              </Typography>
                            ))}
                          </Box>
                        </Grid>
                      )}
                    </Grid>
                  </Paper>
                </Grid>
              </Grid>
            )}

            {/* Cost Anomalies */}
            {costAnomalies.length > 0 && (
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                      Cost Anomalies Detected
                    </Typography>
                    <TableContainer>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell>Date</TableCell>
                            <TableCell>Organization</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell align="right">Expected</TableCell>
                            <TableCell align="right">Actual</TableCell>
                            <TableCell align="right">Deviation</TableCell>
                            <TableCell>Possible Causes</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {costAnomalies.slice(0, 10).map((anomaly, idx) => (
                            <TableRow key={idx} hover>
                              <TableCell>{anomaly.date}</TableCell>
                              <TableCell>
                                <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                                  {anomaly.orgId}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  size="small"
                                  label={anomaly.anomalyType}
                                  color={
                                    anomaly.anomalyType === 'spike'
                                      ? 'error'
                                      : anomaly.anomalyType === 'drop'
                                        ? 'warning'
                                        : 'default'
                                  }
                                />
                              </TableCell>
                              <TableCell align="right">{formatCurrency(anomaly.expectedCost)}</TableCell>
                              <TableCell align="right">{formatCurrency(anomaly.actualCost)}</TableCell>
                              <TableCell align="right">
                                <Chip
                                  size="small"
                                  label={`${anomaly.deviation > 0 ? '+' : ''}${anomaly.deviation.toFixed(1)}%`}
                                  color={Math.abs(anomaly.deviation) > 100 ? 'error' : 'warning'}
                                />
                              </TableCell>
                              <TableCell>
                                <Typography variant="caption" color="text.secondary">
                                  {anomaly.possibleCauses[0]}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                </Grid>
              </Grid>
            )}

            {/* Quality Metrics */}
            {qualityMetrics.length > 0 && (
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                      Response Quality Metrics
                    </Typography>
                    <TableContainer>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell>Feature</TableCell>
                            <TableCell align="right">Total Requests</TableCell>
                            <TableCell align="right">Success Rate</TableCell>
                            <TableCell align="right">Retry Rate</TableCell>
                            <TableCell align="right">Avg Latency</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {qualityMetrics.map((quality) => (
                            <TableRow key={quality.feature} hover>
                              <TableCell>
                                <Typography variant="body2" fontWeight={500}>
                                  {formatFeatureName(quality.feature)}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">{formatNumber(quality.totalRequests)}</TableCell>
                              <TableCell align="right">
                                <Chip
                                  size="small"
                                  label={`${quality.successRate}%`}
                                  color={quality.successRate > 95 ? 'success' : quality.successRate > 80 ? 'warning' : 'error'}
                                  sx={{ minWidth: 60 }}
                                />
                              </TableCell>
                              <TableCell align="right">
                                <Chip
                                  size="small"
                                  label={`${quality.retryRate}%`}
                                  color={quality.retryRate > 20 ? 'warning' : 'default'}
                                  sx={{ minWidth: 60 }}
                                />
                              </TableCell>
                              <TableCell align="right">{formatNumber(quality.avgLatencyMs)}ms</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                </Grid>
              </Grid>
            )}

            {/* User Journeys */}
            {userJourneys.length > 0 && (
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                      Top User Journeys (by Cost)
                    </Typography>
                    <TableContainer>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell>User</TableCell>
                            <TableCell>Feature Sequence</TableCell>
                            <TableCell align="right">Duration</TableCell>
                            <TableCell align="right">Features</TableCell>
                            <TableCell align="right">Cost</TableCell>
                            <TableCell align="right">Tokens</TableCell>
                            <TableCell>Outcome</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {userJourneys.slice(0, 10).map((journey, idx) => (
                            <TableRow key={idx} hover>
                              <TableCell>
                                <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                                  {journey.userId.slice(0, 20)}...
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                  {journey.featureSequence.slice(0, 5).map((feature, fIdx) => (
                                    <Chip
                                      key={fIdx}
                                      size="small"
                                      label={formatFeatureName(feature)}
                                      sx={{ fontSize: '0.7rem', height: 20 }}
                                    />
                                  ))}
                                  {journey.featureSequence.length > 5 && (
                                    <Chip
                                      size="small"
                                      label={`+${journey.featureSequence.length - 5}`}
                                      sx={{ fontSize: '0.7rem', height: 20 }}
                                    />
                                  )}
                                </Box>
                              </TableCell>
                              <TableCell align="right">{journey.sessionDuration.toFixed(1)}m</TableCell>
                              <TableCell align="right">{journey.featuresUsed.length}</TableCell>
                              <TableCell align="right">{formatCurrency(journey.totalCost)}</TableCell>
                              <TableCell align="right">{formatNumber(journey.totalTokens)}</TableCell>
                              <TableCell>
                                <Chip
                                  size="small"
                                  label={journey.outcome}
                                  color={
                                    journey.outcome === 'completed'
                                      ? 'success'
                                      : journey.outcome === 'error'
                                        ? 'error'
                                        : 'default'
                                  }
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                </Grid>
              </Grid>
            )}
          </>
        )}
      </Container>
    </>
  );
}
