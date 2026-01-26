'use client';

/**
 * Performance Dashboard Component
 *
 * Displays real-time performance metrics with auto-refresh.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  alpha,
  CircularProgress,
  Alert,
  Tooltip,
  IconButton,
  LinearProgress,
} from '@mui/material';
import {
  Speed,
  Timer,
  TrendingUp,
  Warning,
  Refresh,
  Delete,
  CheckCircle,
  Error as ErrorIcon,
  Schedule,
  Storage,
  Navigation,
} from '@mui/icons-material';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface APIStats {
  totalRequests: number;
  avgDuration: number;
  p50: number;
  p95: number;
  p99: number;
  errorRate: number;
  avgDbTime: number;
  avgQueryCount: number;
}

interface NavStats {
  totalNavigations: number;
  avgDuration: number;
  p50: number;
  p95: number;
}

interface RouteBreakdown {
  route: string;
  count: number;
  avgDuration: number;
  errorCount: number;
}

interface SlowestRoute {
  route: string;
  count: number;
  avgDuration: number;
  p95: number;
  maxDuration: number;
}

interface SlowQuery {
  operation: string;
  collection: string;
  duration: number;
  route?: string;
  timestamp: number;
}

interface PerformanceData {
  success: boolean;
  timeRangeMinutes: number;
  collectionStarted: number;
  stats: {
    api: APIStats;
    navigation: NavStats;
    routeBreakdown: RouteBreakdown[];
    slowestRoutes: SlowestRoute[];
    slowQueries: SlowQuery[];
  };
  totals: {
    apiRequests: number;
    navigations: number;
    slowQueries: number;
  };
}

function StatCard({
  title,
  value,
  unit,
  icon,
  color,
  subtitle,
}: {
  title: string;
  value: string | number;
  unit?: string;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}) {
  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Box
            sx={{
              p: 1,
              borderRadius: 1,
              bgcolor: alpha(color, 0.1),
              color: color,
              display: 'flex',
            }}
          >
            {icon}
          </Box>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 700, color }}>
          {value}
          {unit && (
            <Typography component="span" variant="body1" color="text.secondary">
              {' '}
              {unit}
            </Typography>
          )}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

function getDurationColor(duration: number): string {
  if (duration > 1000) return '#f44336';
  if (duration > 500) return '#ff9800';
  if (duration > 200) return '#2196f3';
  return '#4caf50';
}

function getDurationChip(duration: number) {
  const color = getDurationColor(duration);
  return (
    <Chip
      label={`${duration}ms`}
      size="small"
      sx={{
        bgcolor: alpha(color, 0.1),
        color: color,
        fontWeight: 600,
        fontFamily: 'monospace',
      }}
    />
  );
}

export function PerformanceDashboard() {
  const [timeRange, setTimeRange] = useState(60);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const {
    data,
    error,
    isLoading,
    mutate,
  } = useSWR<PerformanceData>(
    `/api/admin/performance?minutes=${timeRange}`,
    fetcher,
    {
      refreshInterval: autoRefresh ? 10000 : 0, // Auto-refresh every 10s
      revalidateOnFocus: false,
    }
  );

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset all performance metrics?')) {
      return;
    }

    try {
      await fetch('/api/admin/performance', { method: 'DELETE' });
      mutate();
    } catch (err) {
      console.error('Failed to reset metrics:', err);
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        Failed to load performance metrics. Please try again.
      </Alert>
    );
  }

  const stats = data?.stats;
  const hasData = (data?.totals?.apiRequests ?? 0) > 0 || (data?.totals?.navigations ?? 0) > 0;

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 3,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
            Performance Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Real-time API and client-side performance metrics
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              label="Time Range"
              onChange={(e) => setTimeRange(e.target.value as number)}
            >
              <MenuItem value={5}>Last 5 min</MenuItem>
              <MenuItem value={15}>Last 15 min</MenuItem>
              <MenuItem value={30}>Last 30 min</MenuItem>
              <MenuItem value={60}>Last 1 hour</MenuItem>
              <MenuItem value={360}>Last 6 hours</MenuItem>
              <MenuItem value={1440}>Last 24 hours</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant={autoRefresh ? 'contained' : 'outlined'}
            size="small"
            onClick={() => setAutoRefresh(!autoRefresh)}
            startIcon={<Refresh />}
            color={autoRefresh ? 'primary' : 'inherit'}
          >
            {autoRefresh ? 'Auto' : 'Manual'}
          </Button>

          <Tooltip title="Reset all metrics">
            <IconButton onClick={handleReset} color="error" size="small">
              <Delete />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {isLoading && !data ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : !hasData ? (
        <Paper
          elevation={0}
          sx={{
            p: 6,
            textAlign: 'center',
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: 2,
          }}
        >
          <Speed sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" sx={{ mb: 1 }}>
            No Performance Data Yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Performance metrics will appear here as API requests and page
            navigations are recorded. Make sure the <code>withTiming</code>{' '}
            middleware is enabled on your API routes.
          </Typography>
          <Button variant="outlined" onClick={() => mutate()}>
            Refresh
          </Button>
        </Paper>
      ) : (
        <>
          {/* API Stats Cards */}
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            API Performance
          </Typography>
          <Grid container spacing={2} sx={{ mb: 4 }}>
            <Grid item xs={6} sm={4} md={2}>
              <StatCard
                title="Total Requests"
                value={stats?.api.totalRequests || 0}
                icon={<Speed sx={{ fontSize: 20 }} />}
                color="#2196f3"
                subtitle={`${data?.totals?.apiRequests || 0} total recorded`}
              />
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <StatCard
                title="Avg Duration"
                value={stats?.api.avgDuration || 0}
                unit="ms"
                icon={<Timer sx={{ fontSize: 20 }} />}
                color={getDurationColor(stats?.api.avgDuration || 0)}
              />
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <StatCard
                title="P50"
                value={stats?.api.p50 || 0}
                unit="ms"
                icon={<TrendingUp sx={{ fontSize: 20 }} />}
                color={getDurationColor(stats?.api.p50 || 0)}
                subtitle="Median"
              />
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <StatCard
                title="P95"
                value={stats?.api.p95 || 0}
                unit="ms"
                icon={<TrendingUp sx={{ fontSize: 20 }} />}
                color={getDurationColor(stats?.api.p95 || 0)}
                subtitle="95th percentile"
              />
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <StatCard
                title="Error Rate"
                value={stats?.api?.errorRate ?? 0}
                unit="%"
                icon={
                  (stats?.api?.errorRate ?? 0) > 5 ? (
                    <ErrorIcon sx={{ fontSize: 20 }} />
                  ) : (
                    <CheckCircle sx={{ fontSize: 20 }} />
                  )
                }
                color={(stats?.api?.errorRate ?? 0) > 5 ? '#f44336' : '#4caf50'}
              />
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <StatCard
                title="Avg DB Time"
                value={stats?.api.avgDbTime || 0}
                unit="ms"
                icon={<Storage sx={{ fontSize: 20 }} />}
                color="#9c27b0"
                subtitle={`${stats?.api.avgQueryCount || 0} queries avg`}
              />
            </Grid>
          </Grid>

          {/* Navigation Stats */}
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Client Navigation
          </Typography>
          <Grid container spacing={2} sx={{ mb: 4 }}>
            <Grid item xs={6} sm={3}>
              <StatCard
                title="Navigations"
                value={stats?.navigation.totalNavigations || 0}
                icon={<Navigation sx={{ fontSize: 20 }} />}
                color="#00bcd4"
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatCard
                title="Avg Duration"
                value={stats?.navigation.avgDuration || 0}
                unit="ms"
                icon={<Timer sx={{ fontSize: 20 }} />}
                color={getDurationColor(stats?.navigation.avgDuration || 0)}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatCard
                title="P50"
                value={stats?.navigation.p50 || 0}
                unit="ms"
                icon={<TrendingUp sx={{ fontSize: 20 }} />}
                color={getDurationColor(stats?.navigation.p50 || 0)}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatCard
                title="P95"
                value={stats?.navigation.p95 || 0}
                unit="ms"
                icon={<TrendingUp sx={{ fontSize: 20 }} />}
                color={getDurationColor(stats?.navigation.p95 || 0)}
              />
            </Grid>
          </Grid>

          {/* Slowest Routes Table */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper
                elevation={0}
                sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
              >
                <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Slowest Routes (by P95)
                  </Typography>
                </Box>
                <TableContainer sx={{ maxHeight: 400 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Route</TableCell>
                        <TableCell align="right">Count</TableCell>
                        <TableCell align="right">P95</TableCell>
                        <TableCell align="right">Max</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {stats?.slowestRoutes?.map((route, idx) => (
                        <TableRow key={idx} hover>
                          <TableCell>
                            <Typography
                              variant="body2"
                              sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
                            >
                              {route.route}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">{route.count}</TableCell>
                          <TableCell align="right">{getDurationChip(route.p95)}</TableCell>
                          <TableCell align="right">{getDurationChip(route.maxDuration)}</TableCell>
                        </TableRow>
                      ))}
                      {(!stats?.slowestRoutes || stats.slowestRoutes.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                            <Typography variant="body2" color="text.secondary">
                              No route data available
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>

            {/* Most Active Routes */}
            <Grid item xs={12} md={6}>
              <Paper
                elevation={0}
                sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
              >
                <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Most Active Routes
                  </Typography>
                </Box>
                <TableContainer sx={{ maxHeight: 400 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Route</TableCell>
                        <TableCell align="right">Requests</TableCell>
                        <TableCell align="right">Avg</TableCell>
                        <TableCell align="right">Errors</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {stats?.routeBreakdown?.map((route, idx) => (
                        <TableRow key={idx} hover>
                          <TableCell>
                            <Typography
                              variant="body2"
                              sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
                            >
                              {route.route}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">{route.count}</TableCell>
                          <TableCell align="right">{getDurationChip(route.avgDuration)}</TableCell>
                          <TableCell align="right">
                            {route.errorCount > 0 ? (
                              <Chip
                                label={route.errorCount}
                                size="small"
                                color="error"
                                sx={{ fontWeight: 600 }}
                              />
                            ) : (
                              <Chip label="0" size="small" color="success" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!stats?.routeBreakdown || stats.routeBreakdown.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                            <Typography variant="body2" color="text.secondary">
                              No route data available
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          </Grid>

          {/* Slow Queries */}
          <Paper
            elevation={0}
            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, mt: 3 }}
          >
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Warning sx={{ color: '#ff9800' }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Recent Slow Queries ({'>'}500ms)
                </Typography>
              </Box>
            </Box>
            <TableContainer sx={{ maxHeight: 300 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Time</TableCell>
                    <TableCell>Operation</TableCell>
                    <TableCell>Collection</TableCell>
                    <TableCell>Route</TableCell>
                    <TableCell align="right">Duration</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stats?.slowQueries?.map((query, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {formatTime(query.timestamp)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={query.operation} size="small" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {query.collection || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
                        >
                          {query.route || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{getDurationChip(query.duration)}</TableCell>
                    </TableRow>
                  ))}
                  {(!stats?.slowQueries || stats.slowQueries.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                        <CheckCircle sx={{ color: '#4caf50', mb: 1 }} />
                        <Typography variant="body2" color="text.secondary">
                          No slow queries detected
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* Data Collection Info */}
          <Paper
            elevation={0}
            sx={{
              p: 2,
              mt: 3,
              bgcolor: alpha('#2196f3', 0.05),
              border: '1px solid',
              borderColor: alpha('#2196f3', 0.2),
              borderRadius: 2,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              <strong>Data Collection:</strong> Started{' '}
              {data?.collectionStarted
                ? new Date(data.collectionStarted).toLocaleString()
                : 'unknown'}
              . Metrics are stored in-memory with a rolling window of 1000 entries per type. Data
              will be lost on server restart. For persistent metrics, consider integrating with an
              external monitoring service.
            </Typography>
          </Paper>
        </>
      )}
    </Box>
  );
}
