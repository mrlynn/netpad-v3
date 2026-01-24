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
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  ToggleButton,
  ToggleButtonGroup,
  LinearProgress,
} from '@mui/material';
import {
  Speed,
  Refresh,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Error as ErrorIcon,
  AccessTime,
  Api,
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
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface MetricsSummary {
  totalRequests: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  errorRate: number;
  topEndpoints: Array<{ endpoint: string; requests: number; avgLatency: number }>;
  slowestEndpoints: Array<{ endpoint: string; p95Latency: number; requests: number }>;
  statusCodeDistribution: Record<string, number>;
  requestsByHour: Array<{ hour: string; requests: number; errors: number }>;
}

interface MetricsResponse {
  success: boolean;
  metrics: Array<{
    _id: string;
    period: string;
    periodType: 'hourly' | 'daily';
    endpoints: Record<
      string,
      {
        totalRequests: number;
        successCount: number;
        errorCount: number;
        avgLatencyMs: number;
        p95LatencyMs: number;
        statusCodes: Record<number, number>;
      }
    >;
    createdAt: string;
  }>;
  summary?: MetricsSummary;
}

const STATUS_COLORS: Record<string, string> = {
  '2xx': '#00ED64',
  '3xx': '#2196F3',
  '4xx': '#FF9800',
  '5xx': '#f44336',
};

function formatLatency(ms: number): string {
  if (ms < 1) return '<1ms';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export function APIHealthDashboard() {
  const [timeRange, setTimeRange] = useState<'6h' | '24h' | '7d'>('24h');

  const hours = timeRange === '6h' ? 6 : timeRange === '24h' ? 24 : 168;

  const { data, error, isLoading, mutate } = useSWR<MetricsResponse>(
    `/api/admin/api-metrics?hours=${hours}&includeSummary=true`,
    fetcher,
    { refreshInterval: 60000 }
  );

  const handleAggregation = async () => {
    try {
      await fetch('/api/admin/api-metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'aggregate-hourly' }),
      });
      mutate();
    } catch (err) {
      console.error('Failed to aggregate metrics:', err);
    }
  };

  if (error) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 4,
          bgcolor: alpha('#f44336', 0.1),
          border: '1px solid',
          borderColor: alpha('#f44336', 0.3),
          borderRadius: 2,
        }}
      >
        <Typography color="error">Failed to load API metrics</Typography>
      </Paper>
    );
  }

  const summary = data?.summary;
  const chartData = summary?.requestsByHour || [];

  // Prepare pie chart data for status codes
  const pieData = summary?.statusCodeDistribution
    ? Object.entries(summary.statusCodeDistribution).map(([code, count]) => ({
        name: code,
        value: count,
        color: STATUS_COLORS[code] || '#9e9e9e',
      }))
    : [];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: alpha('#9C27B0', 0.15),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Speed sx={{ fontSize: 32, color: '#9C27B0' }} />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              API Health
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Request volume, latency, and error rates
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <ToggleButtonGroup
            value={timeRange}
            exclusive
            onChange={(_, value) => value && setTimeRange(value)}
            size="small"
          >
            <ToggleButton value="6h">6H</ToggleButton>
            <ToggleButton value="24h">24H</ToggleButton>
            <ToggleButton value="7d">7D</ToggleButton>
          </ToggleButtonGroup>
          <Tooltip title="Refresh">
            <IconButton onClick={() => mutate()}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Button variant="outlined" size="small" onClick={handleAggregation}>
            Aggregate Now
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ py: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Api fontSize="small" color="action" />
                <Typography variant="caption" color="text.secondary">
                  Total Requests
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {isLoading ? (
                  <Skeleton width={80} />
                ) : (
                  formatNumber(summary?.totalRequests || 0)
                )}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ py: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <AccessTime fontSize="small" color="action" />
                <Typography variant="caption" color="text.secondary">
                  Avg Latency
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#2196F3' }}>
                {isLoading ? (
                  <Skeleton width={80} />
                ) : (
                  formatLatency(summary?.avgLatencyMs || 0)
                )}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ py: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <TrendingUp fontSize="small" color="action" />
                <Typography variant="caption" color="text.secondary">
                  P95 Latency
                </Typography>
              </Box>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  color: (summary?.p95LatencyMs || 0) > 1000 ? '#FF9800' : '#00ED64',
                }}
              >
                {isLoading ? (
                  <Skeleton width={80} />
                ) : (
                  formatLatency(summary?.p95LatencyMs || 0)
                )}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ py: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <ErrorIcon fontSize="small" color="action" />
                <Typography variant="caption" color="text.secondary">
                  Error Rate
                </Typography>
              </Box>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  color: (summary?.errorRate || 0) > 5 ? '#f44336' : '#00ED64',
                }}
              >
                {isLoading ? <Skeleton width={80} /> : `${summary?.errorRate || 0}%`}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Row */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Request Volume Chart */}
        <Grid item xs={12} md={8}>
          <Paper
            elevation={0}
            sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, height: 300 }}
          >
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
              Request Volume
            </Typography>
            {isLoading ? (
              <Skeleton variant="rounded" height={240} />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="hour"
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    }}
                    tick={{ fontSize: 11 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      border: 'none',
                      borderRadius: 8,
                      color: '#fff',
                    }}
                    formatter={(value, name) => {
                      const numValue = typeof value === 'number' ? value : 0;
                      return [numValue.toLocaleString(), name === 'requests' ? 'Requests' : 'Errors'];
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="requests"
                    stroke="#2196F3"
                    fill={alpha('#2196F3', 0.3)}
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="errors"
                    stroke="#f44336"
                    fill={alpha('#f44336', 0.3)}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        {/* Status Code Distribution */}
        <Grid item xs={12} md={4}>
          <Paper
            elevation={0}
            sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, height: 300 }}
          >
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
              Status Code Distribution
            </Typography>
            {isLoading ? (
              <Skeleton variant="rounded" height={240} />
            ) : pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, value }) => `${name}: ${formatNumber(value)}`}
                    labelLine={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      border: 'none',
                      borderRadius: 8,
                      color: '#fff',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Box
                sx={{
                  height: 240,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography color="text.secondary">No data available</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Tables Row */}
      <Grid container spacing={2}>
        {/* Top Endpoints */}
        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}
          >
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Top Endpoints by Traffic
              </Typography>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'background.default' }}>
                    <TableCell>Endpoint</TableCell>
                    <TableCell align="right">Requests</TableCell>
                    <TableCell align="right">Avg Latency</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {isLoading
                    ? Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={3}>
                            <Skeleton variant="rounded" height={24} />
                          </TableCell>
                        </TableRow>
                      ))
                    : summary?.topEndpoints?.map((ep, i) => (
                        <TableRow key={i} hover>
                          <TableCell>
                            <Typography
                              variant="body2"
                              sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
                            >
                              {ep.endpoint}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {formatNumber(ep.requests)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Chip
                              label={formatLatency(ep.avgLatency)}
                              size="small"
                              sx={{
                                bgcolor: alpha(
                                  ep.avgLatency > 500 ? '#FF9800' : '#00ED64',
                                  0.15
                                ),
                                color: ep.avgLatency > 500 ? '#FF9800' : '#00ED64',
                                fontWeight: 500,
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                  {!isLoading && (!summary?.topEndpoints || summary.topEndpoints.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">No data available</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Slowest Endpoints */}
        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}
          >
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Slowest Endpoints (P95)
              </Typography>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'background.default' }}>
                    <TableCell>Endpoint</TableCell>
                    <TableCell align="right">P95 Latency</TableCell>
                    <TableCell align="right">Requests</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {isLoading
                    ? Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={3}>
                            <Skeleton variant="rounded" height={24} />
                          </TableCell>
                        </TableRow>
                      ))
                    : summary?.slowestEndpoints?.map((ep, i) => (
                        <TableRow key={i} hover>
                          <TableCell>
                            <Typography
                              variant="body2"
                              sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
                            >
                              {ep.endpoint}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Chip
                              label={formatLatency(ep.p95Latency)}
                              size="small"
                              sx={{
                                bgcolor: alpha(
                                  ep.p95Latency > 1000 ? '#f44336' : '#FF9800',
                                  0.15
                                ),
                                color: ep.p95Latency > 1000 ? '#f44336' : '#FF9800',
                                fontWeight: 500,
                              }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" color="text.secondary">
                              {formatNumber(ep.requests)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                  {!isLoading && (!summary?.slowestEndpoints || summary.slowestEndpoints.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">No data available</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
