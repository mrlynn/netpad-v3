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
  TablePagination,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Collapse,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import {
  History,
  Refresh,
  ExpandMore,
  ExpandLess,
  NotificationsActive,
  Check,
  Visibility,
  FilterList,
  Email,
  Webhook,
  CheckCircle,
  Warning,
  Error as ErrorIcon,
} from '@mui/icons-material';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
} from 'recharts';
import useSWR from 'swr';
import { AlertHistoryStatus, AlertDeliveryStatus } from '@/types/observability';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface AlertHistoryEntry {
  _id: string;
  alertId: string;
  ruleId: string;
  ruleName: string;
  triggeredAt: string;
  metric: string;
  metricValue: number;
  threshold: number;
  channels: AlertDeliveryStatus[];
  status: AlertHistoryStatus;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  autoResolvedAt?: string;
}

interface AlertStats {
  totalAlerts: number;
  activeAlerts: number;
  acknowledgedAlerts: number;
  resolvedAlerts: number;
  alertsByRule: Array<{ ruleId: string; ruleName: string; count: number }>;
  alertsByDay: Array<{ date: string; count: number }>;
}

interface HistoryResponse {
  success: boolean;
  alerts: AlertHistoryEntry[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  stats?: AlertStats;
}

const STATUS_COLORS: Record<AlertHistoryStatus, string> = {
  active: '#f44336',
  acknowledged: '#FF9800',
  resolved: '#00ED64',
  auto_resolved: '#4CAF50',
};

function getStatusIcon(status: AlertHistoryStatus) {
  switch (status) {
    case 'active':
      return <ErrorIcon sx={{ color: STATUS_COLORS.active }} />;
    case 'acknowledged':
      return <Visibility sx={{ color: STATUS_COLORS.acknowledged }} />;
    case 'resolved':
      return <CheckCircle sx={{ color: STATUS_COLORS.resolved }} />;
    case 'auto_resolved':
      return <CheckCircle sx={{ color: STATUS_COLORS.auto_resolved }} />;
    default:
      return <Warning />;
  }
}

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

interface AlertRowProps {
  alert: AlertHistoryEntry;
  expanded: boolean;
  onToggle: () => void;
  onAction: (action: 'acknowledge' | 'resolve') => void;
}

function AlertRow({ alert, expanded, onToggle, onAction }: AlertRowProps) {
  const statusColor = STATUS_COLORS[alert.status];

  return (
    <>
      <TableRow
        hover
        sx={{
          cursor: 'pointer',
          bgcolor: alert.status === 'active' ? alpha(statusColor, 0.05) : undefined,
          '&:hover': { bgcolor: alpha(statusColor, 0.08) },
        }}
        onClick={onToggle}
      >
        <TableCell sx={{ width: 40 }}>
          <IconButton size="small">
            {expanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </TableCell>
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {getStatusIcon(alert.status)}
            <Chip
              label={alert.status}
              size="small"
              sx={{
                bgcolor: alpha(statusColor, 0.15),
                color: statusColor,
                fontWeight: 600,
                textTransform: 'capitalize',
              }}
            />
          </Box>
        </TableCell>
        <TableCell>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {alert.ruleName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {alert.metric}
          </Typography>
        </TableCell>
        <TableCell>
          <Typography
            variant="body2"
            sx={{ fontWeight: 600, color: '#f44336', fontFamily: 'monospace' }}
          >
            {alert.metricValue}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            threshold: {alert.threshold}
          </Typography>
        </TableCell>
        <TableCell>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {alert.channels.map((channel, i) => (
              <Tooltip
                key={i}
                title={`${channel.channelType}: ${channel.status}${channel.error ? ` - ${channel.error}` : ''}`}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    color: channel.status === 'sent' ? '#00ED64' : '#f44336',
                  }}
                >
                  {channel.channelType === 'email' ? (
                    <Email fontSize="small" />
                  ) : (
                    <Webhook fontSize="small" />
                  )}
                </Box>
              </Tooltip>
            ))}
          </Box>
        </TableCell>
        <TableCell>
          <Tooltip title={new Date(alert.triggeredAt).toLocaleString()}>
            <Typography variant="body2" color="text.secondary">
              {formatRelativeTime(alert.triggeredAt)}
            </Typography>
          </Tooltip>
        </TableCell>
        <TableCell>
          <Box sx={{ display: 'flex', gap: 0.5 }} onClick={(e) => e.stopPropagation()}>
            {alert.status === 'active' && (
              <Tooltip title="Acknowledge">
                <IconButton size="small" onClick={() => onAction('acknowledge')}>
                  <Visibility fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {alert.status !== 'resolved' && (
              <Tooltip title="Resolve">
                <IconButton
                  size="small"
                  color="success"
                  onClick={() => onAction('resolve')}
                >
                  <Check fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={7} sx={{ py: 0, borderBottom: expanded ? undefined : 'none' }}>
          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <Box sx={{ py: 2, px: 2, bgcolor: 'background.default', borderRadius: 1, my: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="text.secondary">
                    Alert ID
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {alert.alertId}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="text.secondary">
                    Rule ID
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {alert.ruleId}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="text.secondary">
                    Triggered At
                  </Typography>
                  <Typography variant="body2">
                    {new Date(alert.triggeredAt).toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="text.secondary">
                    Status
                  </Typography>
                  <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                    {alert.status}
                  </Typography>
                </Grid>
                {alert.acknowledgedAt && (
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="caption" color="text.secondary">
                      Acknowledged At
                    </Typography>
                    <Typography variant="body2">
                      {new Date(alert.acknowledgedAt).toLocaleString()}
                    </Typography>
                  </Grid>
                )}
                {alert.resolvedAt && (
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="caption" color="text.secondary">
                      Resolved At
                    </Typography>
                    <Typography variant="body2">
                      {new Date(alert.resolvedAt).toLocaleString()}
                    </Typography>
                  </Grid>
                )}
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    Notification Channels
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                    {alert.channels.map((channel, i) => (
                      <Chip
                        key={i}
                        icon={channel.channelType === 'email' ? <Email /> : <Webhook />}
                        label={`${channel.channelType}: ${channel.status}`}
                        size="small"
                        color={channel.status === 'sent' ? 'success' : 'error'}
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

export function AlertHistoryViewer() {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const buildQueryString = () => {
    const params = new URLSearchParams();
    params.set('limit', rowsPerPage.toString());
    params.set('offset', (page * rowsPerPage).toString());
    params.set('includeStats', 'true');
    params.set('statsDays', '7');

    if (statusFilter) params.set('statuses', statusFilter);

    return params.toString();
  };

  const { data, error, isLoading, mutate } = useSWR<HistoryResponse>(
    `/api/admin/alerts/history?${buildQueryString()}`,
    fetcher
  );

  const handleAction = async (alertId: string, action: 'acknowledge' | 'resolve') => {
    try {
      const status = action === 'acknowledge' ? 'acknowledged' : 'resolved';
      const response = await fetch(`/api/admin/alerts/history/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        mutate();
      }
    } catch (err) {
      console.error('Failed to update alert:', err);
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
        <Typography color="error">Failed to load alert history</Typography>
      </Paper>
    );
  }

  const stats = data?.stats;

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
            <History sx={{ fontSize: 32, color: '#9C27B0' }} />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Alert History
            </Typography>
            <Typography variant="body2" color="text.secondary">
              View and manage triggered alerts
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh">
            <IconButton onClick={() => mutate()}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Button
            variant={showFilters ? 'contained' : 'outlined'}
            startIcon={<FilterList />}
            onClick={() => setShowFilters(!showFilters)}
          >
            Filters
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ py: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Total (7d)
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {isLoading ? <Skeleton width={50} /> : stats?.totalAlerts || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ py: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Active
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#f44336' }}>
                {isLoading ? <Skeleton width={50} /> : stats?.activeAlerts || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ py: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Acknowledged
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#FF9800' }}>
                {isLoading ? <Skeleton width={50} /> : stats?.acknowledgedAlerts || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ py: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Resolved
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#00ED64' }}>
                {isLoading ? <Skeleton width={50} /> : stats?.resolvedAlerts || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Alerts by Day Chart */}
      {stats?.alertsByDay && stats.alertsByDay.length > 0 && (
        <Paper
          elevation={0}
          sx={{ p: 2, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
        >
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
            Alerts Over Time (Last 7 Days)
          </Typography>
          <Box sx={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.alertsByDay}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) =>
                    new Date(value).toLocaleDateString([], { month: 'short', day: 'numeric' })
                  }
                  tick={{ fontSize: 12 }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    border: 'none',
                    borderRadius: 8,
                    color: '#fff',
                  }}
                />
                <Bar dataKey="count" fill="#FF9800" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Paper>
      )}

      {/* Filters */}
      <Collapse in={showFilters}>
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 3,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
          }}
        >
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(0);
                  }}
                >
                  <MenuItem value="">All</MenuItem>
                  <Divider />
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="acknowledged">Acknowledged</MenuItem>
                  <MenuItem value="resolved">Resolved</MenuItem>
                  <MenuItem value="active,acknowledged">Active & Acknowledged</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>
      </Collapse>

      {/* Alerts Table */}
      <Paper
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'background.default' }}>
                <TableCell sx={{ width: 40 }} />
                <TableCell>Status</TableCell>
                <TableCell>Rule</TableCell>
                <TableCell>Value</TableCell>
                <TableCell>Channels</TableCell>
                <TableCell>Triggered</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading
                ? Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7}>
                        <Skeleton variant="rounded" height={40} />
                      </TableCell>
                    </TableRow>
                  ))
                : data?.alerts.map((alert) => (
                    <AlertRow
                      key={alert._id}
                      alert={alert}
                      expanded={expandedRow === alert._id}
                      onToggle={() =>
                        setExpandedRow(expandedRow === alert._id ? null : alert._id)
                      }
                      onAction={(action) => handleAction(alert.alertId, action)}
                    />
                  ))}
              {!isLoading && data?.alerts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                    <NotificationsActive
                      sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }}
                    />
                    <Typography color="text.secondary">No alerts triggered</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Alerts will appear here when rule conditions are met
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {data?.pagination && (
          <TablePagination
            component="div"
            count={data.pagination.total}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 25, 50, 100]}
          />
        )}
      </Paper>
    </Box>
  );
}
