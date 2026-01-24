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
  Collapse,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
} from '@mui/material';
import {
  BugReport,
  Warning,
  Error as ErrorIcon,
  CheckCircle,
  Refresh,
  ExpandMore,
  ExpandLess,
  Visibility,
  Check,
  Close,
  Replay,
  FilterList,
  TrendingUp,
  TrendingDown,
} from '@mui/icons-material';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import useSWR from 'swr';
import { ErrorSource, ErrorSeverity, ErrorStatus } from '@/types/observability';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface PlatformError {
  _id: string;
  errorId: string;
  message: string;
  stack?: string;
  source: ErrorSource;
  endpoint?: string;
  requestId?: string;
  userId?: string;
  organizationId?: string;
  severity: ErrorSeverity;
  fingerprint: string;
  count: number;
  firstSeenAt: string;
  lastSeenAt: string;
  status: ErrorStatus;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  resolution?: string;
}

interface ErrorStats {
  total: number;
  open: number;
  acknowledged: number;
  resolved: number;
  critical: number;
  bySource: Array<{ source: ErrorSource; count: number }>;
  bySeverity: Array<{ severity: ErrorSeverity; count: number }>;
  recentTrend: Array<{ date: string; count: number }>;
}

interface ErrorResponse {
  success: boolean;
  errors: PlatformError[];
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  stats?: ErrorStats;
}

const SEVERITY_COLORS: Record<ErrorSeverity, string> = {
  warning: '#FF9800',
  error: '#f44336',
  critical: '#d32f2f',
};

const STATUS_COLORS: Record<ErrorStatus, string> = {
  open: '#f44336',
  acknowledged: '#FF9800',
  resolved: '#00ED64',
  ignored: '#9e9e9e',
};

const SOURCE_COLORS: Record<string, string> = {
  api: '#2196F3',
  workflow: '#9C27B0',
  ai: '#00ED64',
  auth: '#FF9800',
  billing: '#00BCD4',
  integration: '#607D8B',
  system: '#795548',
};

function getSeverityIcon(severity: ErrorSeverity) {
  switch (severity) {
    case 'critical':
      return <ErrorIcon sx={{ color: SEVERITY_COLORS.critical }} />;
    case 'error':
      return <BugReport sx={{ color: SEVERITY_COLORS.error }} />;
    case 'warning':
      return <Warning sx={{ color: SEVERITY_COLORS.warning }} />;
    default:
      return <BugReport />;
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

interface ErrorRowProps {
  error: PlatformError;
  expanded: boolean;
  onToggle: () => void;
  onAction: (action: 'acknowledge' | 'resolve' | 'reopen') => void;
}

function ErrorRow({ error, expanded, onToggle, onAction }: ErrorRowProps) {
  const severityColor = SEVERITY_COLORS[error.severity];
  const statusColor = STATUS_COLORS[error.status];

  return (
    <>
      <TableRow
        hover
        sx={{
          cursor: 'pointer',
          bgcolor: error.status === 'open' ? alpha(severityColor, 0.05) : undefined,
          '&:hover': { bgcolor: alpha(severityColor, 0.08) },
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
            {getSeverityIcon(error.severity)}
            <Chip
              label={error.severity}
              size="small"
              sx={{
                bgcolor: alpha(severityColor, 0.15),
                color: severityColor,
                fontWeight: 600,
                textTransform: 'capitalize',
              }}
            />
          </Box>
        </TableCell>
        <TableCell>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 500,
              maxWidth: 400,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {error.message}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {error.source} {error.endpoint && `• ${error.endpoint}`}
          </Typography>
        </TableCell>
        <TableCell>
          <Chip
            label={error.count.toLocaleString()}
            size="small"
            color={error.count > 10 ? 'error' : error.count > 5 ? 'warning' : 'default'}
          />
        </TableCell>
        <TableCell>
          <Chip
            label={error.status}
            size="small"
            sx={{
              bgcolor: alpha(statusColor, 0.15),
              color: statusColor,
              fontWeight: 500,
              textTransform: 'capitalize',
            }}
          />
        </TableCell>
        <TableCell>
          <Tooltip title={new Date(error.lastSeenAt).toLocaleString()}>
            <Typography variant="body2" color="text.secondary">
              {formatRelativeTime(error.lastSeenAt)}
            </Typography>
          </Tooltip>
        </TableCell>
        <TableCell>
          <Box sx={{ display: 'flex', gap: 0.5 }} onClick={(e) => e.stopPropagation()}>
            {error.status === 'open' && (
              <Tooltip title="Acknowledge">
                <IconButton size="small" onClick={() => onAction('acknowledge')}>
                  <Visibility fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {error.status !== 'resolved' && (
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
            {error.status === 'resolved' && (
              <Tooltip title="Reopen">
                <IconButton size="small" onClick={() => onAction('reopen')}>
                  <Replay fontSize="small" />
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
                    Error ID
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {error.errorId}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="text.secondary">
                    Fingerprint
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>
                    {error.fingerprint}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="text.secondary">
                    First Seen
                  </Typography>
                  <Typography variant="body2">
                    {new Date(error.firstSeenAt).toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="text.secondary">
                    User ID
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {error.userId || 'N/A'}
                  </Typography>
                </Grid>
                {error.stack && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Stack Trace
                    </Typography>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 1.5,
                        mt: 0.5,
                        bgcolor: 'grey.900',
                        borderRadius: 1,
                        overflow: 'auto',
                        maxHeight: 200,
                      }}
                    >
                      <pre
                        style={{
                          margin: 0,
                          fontSize: '0.7rem',
                          color: '#ff6b6b',
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {error.stack}
                      </pre>
                    </Paper>
                  </Grid>
                )}
                {error.resolution && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Resolution
                    </Typography>
                    <Typography variant="body2">{error.resolution}</Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

export function ErrorTrackingDashboard() {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [selectedError, setSelectedError] = useState<PlatformError | null>(null);
  const [resolution, setResolution] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('open,acknowledged');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<string>('');

  // Build query string
  const buildQueryString = () => {
    const params = new URLSearchParams();
    params.set('limit', rowsPerPage.toString());
    params.set('offset', (page * rowsPerPage).toString());
    params.set('includeStats', 'true');
    params.set('statsDays', '7');

    if (statusFilter) params.set('statuses', statusFilter);
    if (severityFilter) params.set('severities', severityFilter);
    if (sourceFilter) params.set('sources', sourceFilter);

    return params.toString();
  };

  const { data, error, isLoading, mutate } = useSWR<ErrorResponse>(
    `/api/admin/errors?${buildQueryString()}`,
    fetcher,
    { refreshInterval: 30000 }
  );

  const handleAction = async (
    errorId: string,
    action: 'acknowledge' | 'resolve' | 'reopen',
    resolutionText?: string
  ) => {
    try {
      const response = await fetch(`/api/admin/errors/${errorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, resolution: resolutionText }),
      });

      if (response.ok) {
        mutate();
      }
    } catch (err) {
      console.error('Failed to update error:', err);
    }
  };

  const handleResolveClick = (errorObj: PlatformError) => {
    setSelectedError(errorObj);
    setResolution('');
    setResolveDialogOpen(true);
  };

  const handleResolveConfirm = () => {
    if (selectedError) {
      handleAction(selectedError.errorId, 'resolve', resolution);
      setResolveDialogOpen(false);
      setSelectedError(null);
    }
  };

  const stats = data?.stats;

  // Calculate trend
  const trendPercentage =
    stats?.recentTrend && stats.recentTrend.length >= 2
      ? Math.round(
          ((stats.recentTrend[stats.recentTrend.length - 1]?.count || 0) /
            (stats.recentTrend[0]?.count || 1) -
            1) *
            100
        )
      : 0;

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
        <Typography color="error">Failed to load error tracking data</Typography>
      </Paper>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: alpha('#f44336', 0.15),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <BugReport sx={{ fontSize: 32, color: '#f44336' }} />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Error Tracking
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Monitor and manage platform errors
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
        <Grid item xs={6} sm={4} md={2}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ py: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Open Errors
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#f44336' }}>
                {isLoading ? <Skeleton width={50} /> : stats?.open || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ py: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Critical
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#d32f2f' }}>
                {isLoading ? <Skeleton width={50} /> : stats?.critical || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ py: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Acknowledged
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#FF9800' }}>
                {isLoading ? <Skeleton width={50} /> : stats?.acknowledged || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ py: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Resolved
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#00ED64' }}>
                {isLoading ? <Skeleton width={50} /> : stats?.resolved || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ py: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Total (7d)
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {isLoading ? <Skeleton width={50} /> : stats?.total || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ py: 2 }}>
              <Typography variant="caption" color="text.secondary">
                7-Day Trend
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {trendPercentage > 0 ? (
                  <TrendingUp sx={{ color: '#f44336' }} />
                ) : (
                  <TrendingDown sx={{ color: '#00ED64' }} />
                )}
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 700,
                    color: trendPercentage > 0 ? '#f44336' : '#00ED64',
                  }}
                >
                  {trendPercentage > 0 ? '+' : ''}
                  {trendPercentage}%
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Row */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Error Trend Chart */}
        <Grid item xs={12} md={8}>
          <Paper
            elevation={0}
            sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, height: 250 }}
          >
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
              Error Trend (Last 7 Days)
            </Typography>
            {isLoading ? (
              <Skeleton variant="rounded" height={180} />
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart
                  data={stats?.recentTrend || []}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => new Date(value).toLocaleDateString([], { month: 'short', day: 'numeric' })}
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
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#f44336"
                    fill={alpha('#f44336', 0.3)}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        {/* Severity Distribution */}
        <Grid item xs={12} md={4}>
          <Paper
            elevation={0}
            sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, height: 250 }}
          >
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
              By Severity
            </Typography>
            {isLoading ? (
              <Skeleton variant="rounded" height={180} />
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={stats?.bySeverity || []}
                    dataKey="count"
                    nameKey="severity"
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {stats?.bySeverity.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={SEVERITY_COLORS[entry.severity] || '#9e9e9e'}
                      />
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
            )}
          </Paper>
        </Grid>
      </Grid>

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
            <Grid item xs={12} sm={4}>
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
                  <MenuItem value="open">Open</MenuItem>
                  <MenuItem value="acknowledged">Acknowledged</MenuItem>
                  <MenuItem value="resolved">Resolved</MenuItem>
                  <MenuItem value="open,acknowledged">Open & Acknowledged</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Severity</InputLabel>
                <Select
                  value={severityFilter}
                  label="Severity"
                  onChange={(e) => {
                    setSeverityFilter(e.target.value);
                    setPage(0);
                  }}
                >
                  <MenuItem value="">All</MenuItem>
                  <Divider />
                  <MenuItem value="critical">Critical</MenuItem>
                  <MenuItem value="error">Error</MenuItem>
                  <MenuItem value="warning">Warning</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Source</InputLabel>
                <Select
                  value={sourceFilter}
                  label="Source"
                  onChange={(e) => {
                    setSourceFilter(e.target.value);
                    setPage(0);
                  }}
                >
                  <MenuItem value="">All</MenuItem>
                  <Divider />
                  <MenuItem value="api">API</MenuItem>
                  <MenuItem value="workflow">Workflow</MenuItem>
                  <MenuItem value="ai">AI</MenuItem>
                  <MenuItem value="auth">Auth</MenuItem>
                  <MenuItem value="billing">Billing</MenuItem>
                  <MenuItem value="integration">Integration</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>
      </Collapse>

      {/* Errors Table */}
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
                <TableCell>Severity</TableCell>
                <TableCell>Error</TableCell>
                <TableCell>Count</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Last Seen</TableCell>
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
                : data?.errors.map((err) => (
                    <ErrorRow
                      key={err._id}
                      error={err}
                      expanded={expandedRow === err._id}
                      onToggle={() =>
                        setExpandedRow(expandedRow === err._id ? null : err._id)
                      }
                      onAction={(action) => {
                        if (action === 'resolve') {
                          handleResolveClick(err);
                        } else {
                          handleAction(err.errorId, action);
                        }
                      }}
                    />
                  ))}
              {!isLoading && data?.errors.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                    <CheckCircle sx={{ fontSize: 48, color: '#00ED64', mb: 1 }} />
                    <Typography color="text.secondary">No errors found</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {statusFilter ? 'Try adjusting your filters' : 'Your platform is running smoothly!'}
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

      {/* Resolve Dialog */}
      <Dialog open={resolveDialogOpen} onClose={() => setResolveDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Resolve Error</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Add a resolution note (optional) to document how this error was addressed.
          </Typography>
          {selectedError && (
            <Paper
              variant="outlined"
              sx={{ p: 2, mb: 2, bgcolor: alpha('#f44336', 0.05) }}
            >
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {selectedError.message}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {selectedError.errorId} • {selectedError.count} occurrences
              </Typography>
            </Paper>
          )}
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Resolution Notes"
            placeholder="Describe how this error was resolved..."
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResolveDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<Check />}
            onClick={handleResolveConfirm}
          >
            Resolve
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
