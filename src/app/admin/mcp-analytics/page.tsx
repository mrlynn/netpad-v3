/**
 * Admin MCP Analytics Dashboard
 *
 * Platform admins can view MCP server usage statistics,
 * tool call metrics, and authentication breakdowns.
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
  Alert,
} from '@mui/material';
import Link from 'next/link';
import {
  SmartToy as McpIcon,
  Api as ApiIcon,
  Speed as SpeedIcon,
  Error as ErrorIcon,
  CheckCircle as SuccessIcon,
  NavigateNext as NavigateNextIcon,
  Business as OrgIcon,
  VpnKey as KeyIcon,
  Lock as OAuthIcon,
} from '@mui/icons-material';
import { AppNavBar } from '@/components/Navigation/AppNavBar';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import { useAuth } from '@/contexts/AuthContext';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const COLORS = ['#7C4DFF', '#00ED64', '#2196F3', '#FF9800', '#9C27B0', '#E91E63', '#00BCD4', '#8BC34A'];

interface MCPAnalyticsData {
  success: boolean;
  stats: {
    totalRequests: number;
    uniqueOrganizations: number;
    topTools: Array<{ name: string; count: number }>;
    errorRate: number;
  };
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
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

export default function MCPAnalyticsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  // Fetch MCP analytics data
  const { data: analyticsData, isLoading: analyticsLoading } = useSWR<MCPAnalyticsData>(
    user?.platformRole === 'admin' ? '/api/admin/mcp-analytics' : null,
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
        <NetPadLoader size="large" variant="ascii" message="Loading MCP analytics..." />
      </Box>
    );
  }

  if (!user || user.platformRole !== 'admin') {
    return null;
  }

  const stats = analyticsData?.stats;
  const topTools = stats?.topTools || [];
  const successRate = stats ? 100 - (stats.errorRate || 0) : 100;

  return (
    <>
      <AppNavBar />
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Breadcrumb Navigation */}
        <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 2 }}>
          <MuiLink component={Link} href="/admin" color="inherit" underline="hover">
            Admin Dashboard
          </MuiLink>
          <Typography color="text.primary">MCP Analytics</Typography>
        </Breadcrumbs>

        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight={700}>
            MCP Server Analytics
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Monitor MCP server usage, tool calls, and authentication metrics across all organizations
          </Typography>
        </Box>

        {/* Info Alert */}
        <Alert severity="info" sx={{ mb: 4 }}>
          MCP (Model Context Protocol) analytics track usage of the remote MCP server that enables Claude.ai
          and other AI assistants to interact with NetPad. Data is collected and aggregated monthly by organization.
        </Alert>

        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={6} sm={4} md={3}>
            <StatCard
              title="Total Requests"
              value={formatNumber(stats?.totalRequests || 0)}
              subtitle="This month"
              icon={<ApiIcon />}
              color="#7C4DFF"
              loading={analyticsLoading}
            />
          </Grid>
          <Grid item xs={6} sm={4} md={3}>
            <StatCard
              title="Organizations"
              value={stats?.uniqueOrganizations || 0}
              subtitle="Active this month"
              icon={<OrgIcon />}
              color="#2196F3"
              loading={analyticsLoading}
            />
          </Grid>
          <Grid item xs={6} sm={4} md={3}>
            <StatCard
              title="Unique Tools"
              value={topTools.length}
              subtitle="Tools called"
              icon={<McpIcon />}
              color="#00ED64"
              loading={analyticsLoading}
            />
          </Grid>
          <Grid item xs={6} sm={4} md={3}>
            <StatCard
              title="Success Rate"
              value={`${successRate}%`}
              icon={successRate > 95 ? <SuccessIcon /> : <ErrorIcon />}
              color={successRate > 95 ? '#00ED64' : '#f44336'}
              loading={analyticsLoading}
            />
          </Grid>
        </Grid>

        {/* Charts Row */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Tool Usage Chart */}
          <Grid item xs={12} lg={8}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                Top Tools by Usage
              </Typography>
              {analyticsLoading ? (
                <Skeleton variant="rectangular" height={300} />
              ) : topTools.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topTools.slice(0, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      tick={{ fontSize: 11 }}
                      width={180}
                      tickFormatter={(value) => {
                        // Truncate long tool names
                        const name = String(value);
                        return name.length > 25 ? name.slice(0, 22) + '...' : name;
                      }}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                      formatter={(value) => [formatNumber(value as number), 'Calls']}
                    />
                    <Bar dataKey="count" fill="#7C4DFF" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography color="text.secondary">No tool usage data available yet</Typography>
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Tool Distribution Pie */}
          <Grid item xs={12} lg={4}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                Tool Distribution
              </Typography>
              {analyticsLoading ? (
                <Skeleton variant="rectangular" height={300} />
              ) : topTools.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={topTools.slice(0, 8)}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ name, percent }) =>
                        (percent || 0) > 0.05 ? `${((percent || 0) * 100).toFixed(0)}%` : ''
                      }
                      labelLine={false}
                    >
                      {topTools.slice(0, 8).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                      formatter={(value) => [formatNumber(value as number), 'Calls']}
                    />
                    <Legend />
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

        {/* Top Tools Table */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
            All Tool Usage
          </Typography>
          {analyticsLoading ? (
            <Skeleton variant="rectangular" height={400} />
          ) : topTools.length > 0 ? (
            <TableContainer sx={{ maxHeight: 400 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Rank</TableCell>
                    <TableCell>Tool Name</TableCell>
                    <TableCell align="right">Calls</TableCell>
                    <TableCell align="right">% of Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {topTools.map((tool, index) => {
                    const totalCalls = topTools.reduce((sum, t) => sum + t.count, 0);
                    const percentage = totalCalls > 0 ? ((tool.count / totalCalls) * 100).toFixed(1) : '0';

                    return (
                      <TableRow key={tool.name} hover>
                        <TableCell>
                          <Chip
                            size="small"
                            label={index + 1}
                            sx={{
                              minWidth: 28,
                              height: 28,
                              bgcolor: index < 3 ? alpha(COLORS[index], 0.2) : 'transparent',
                              color: index < 3 ? COLORS[index] : 'text.secondary',
                              fontWeight: 600,
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>
                            {tool.name}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{formatNumber(tool.count)}</TableCell>
                        <TableCell align="right">
                          <Chip
                            size="small"
                            label={`${percentage}%`}
                            sx={{ minWidth: 60 }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <McpIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography color="text.secondary">
                No MCP tool usage data available yet.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Tool usage data will appear here once users start making requests through the MCP server.
              </Typography>
            </Box>
          )}
        </Paper>
      </Container>
    </>
  );
}
