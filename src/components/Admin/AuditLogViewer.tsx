'use client';

import { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Collapse,
  alpha,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Divider,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import {
  History,
  FilterList,
  Download,
  ExpandMore,
  ExpandLess,
  Person,
  Business,
  Security,
  Settings,
  AdminPanelSettings,
  Api,
  Clear,
  Search,
  Refresh,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import useSWR from 'swr';
import { PlatformAuditAction } from '@/lib/platform/platformAuditLogger';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface AuditLog {
  _id: string;
  eventType: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  resourceType: string;
  resourceId: string;
  organizationId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

interface AuditLogStats {
  totalLogs: number;
  todayCount: number;
  topActions: Array<{ _id: string; count: number }>;
  topUsers: Array<{ _id: string; count: number }>;
}

interface AuditLogResponse {
  success: boolean;
  logs: AuditLog[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  stats?: AuditLogStats;
}

const EVENT_CATEGORIES: Record<string, { label: string; icon: React.ReactElement; color: string }> = {
  'user.': { label: 'User', icon: <Person fontSize="small" />, color: '#2196F3' },
  'org.': { label: 'Organization', icon: <Business fontSize="small" />, color: '#9C27B0' },
  'security.': { label: 'Security', icon: <Security fontSize="small" />, color: '#f44336' },
  'admin.': { label: 'Admin', icon: <AdminPanelSettings fontSize="small" />, color: '#FF9800' },
  'system.': { label: 'System', icon: <Settings fontSize="small" />, color: '#607D8B' },
  'api.': { label: 'API', icon: <Api fontSize="small" />, color: '#00BCD4' },
};

const COMMON_EVENT_TYPES: PlatformAuditAction[] = [
  'user.login',
  'user.logout',
  'user.created',
  'admin.user.impersonate',
  'admin.waitlist.approve',
  'admin.waitlist.reject',
  'admin.cluster.deactivate',
  'security.api_key.create',
  'security.api_key.revoke',
  'org.member_added',
  'org.member_removed',
];

function getEventCategory(eventType: string): { label: string; icon: React.ReactElement; color: string } {
  for (const [prefix, category] of Object.entries(EVENT_CATEGORIES)) {
    if (eventType.startsWith(prefix)) {
      return category;
    }
  }
  return { label: 'Other', icon: <History fontSize="small" />, color: '#9e9e9e' };
}

function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString();
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

interface LogRowProps {
  log: AuditLog;
  expanded: boolean;
  onToggle: () => void;
}

function LogRow({ log, expanded, onToggle }: LogRowProps) {
  const category = getEventCategory(log.eventType);

  return (
    <>
      <TableRow
        hover
        sx={{
          cursor: 'pointer',
          '&:hover': { bgcolor: alpha(category.color, 0.05) },
        }}
        onClick={onToggle}
      >
        <TableCell sx={{ width: 40 }}>
          <IconButton size="small">
            {expanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </TableCell>
        <TableCell>
          <Chip
            icon={category.icon}
            label={log.eventType}
            size="small"
            sx={{
              bgcolor: alpha(category.color, 0.1),
              color: category.color,
              fontWeight: 500,
              '& .MuiChip-icon': { color: category.color },
            }}
          />
        </TableCell>
        <TableCell>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {log.userName || log.userEmail || 'Unknown'}
            </Typography>
            {log.userEmail && log.userName && (
              <Typography variant="caption" color="text.secondary">
                {log.userEmail}
              </Typography>
            )}
          </Box>
        </TableCell>
        <TableCell>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
            {log.resourceType}: {log.resourceId.substring(0, 12)}...
          </Typography>
        </TableCell>
        <TableCell>
          <Tooltip title={formatTimestamp(log.timestamp)}>
            <Typography variant="body2" color="text.secondary">
              {formatRelativeTime(log.timestamp)}
            </Typography>
          </Tooltip>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={5} sx={{ py: 0, borderBottom: expanded ? undefined : 'none' }}>
          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <Box sx={{ py: 2, px: 2, bgcolor: 'background.default', borderRadius: 1, my: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="text.secondary">
                    Event ID
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {log._id}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="text.secondary">
                    User ID
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {log.userId}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="text.secondary">
                    Organization
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {log.organizationId || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="text.secondary">
                    IP Address
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {log.ipAddress || 'N/A'}
                  </Typography>
                </Grid>
                {log.details && Object.keys(log.details).length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Details
                    </Typography>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 1.5,
                        mt: 0.5,
                        bgcolor: 'grey.900',
                        borderRadius: 1,
                        overflow: 'auto',
                      }}
                    >
                      <pre style={{ margin: 0, fontSize: '0.75rem', color: '#00ED64' }}>
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </Paper>
                  </Grid>
                )}
                {log.userAgent && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      User Agent
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>
                      {log.userAgent}
                    </Typography>
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

export function AuditLogViewer() {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [eventType, setEventType] = useState<string>('');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  // Build query string
  const buildQueryString = useCallback(() => {
    const params = new URLSearchParams();
    params.set('limit', rowsPerPage.toString());
    params.set('offset', (page * rowsPerPage).toString());
    params.set('includeStats', 'true');
    params.set('statsDays', '30');

    if (eventType) params.set('eventType', eventType);
    if (search) params.set('search', search);
    if (startDate) params.set('startDate', startDate.toISOString());
    if (endDate) params.set('endDate', endDate.toISOString());

    return params.toString();
  }, [page, rowsPerPage, eventType, search, startDate, endDate]);

  const { data, error, isLoading, mutate } = useSWR<AuditLogResponse>(
    `/api/admin/audit-logs?${buildQueryString()}`,
    fetcher
  );

  const handleExportCSV = async () => {
    const params = new URLSearchParams();
    params.set('format', 'csv');
    if (eventType) params.set('eventType', eventType);
    if (search) params.set('search', search);
    if (startDate) params.set('startDate', startDate.toISOString());
    if (endDate) params.set('endDate', endDate.toISOString());

    const response = await fetch(`/api/admin/audit-logs?${params.toString()}`);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleClearFilters = () => {
    setEventType('');
    setSearch('');
    setStartDate(null);
    setEndDate(null);
    setPage(0);
  };

  const hasActiveFilters = eventType || search || startDate || endDate;

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
        <Typography color="error">Failed to load audit logs</Typography>
      </Paper>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor: alpha('#2196F3', 0.15),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <History sx={{ fontSize: 32, color: '#2196F3' }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                Audit Logs
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Track all platform activities and admin actions
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
              {hasActiveFilters && (
                <Chip
                  label={
                    [eventType, search, startDate, endDate].filter(Boolean).length
                  }
                  size="small"
                  sx={{ ml: 1, height: 20, minWidth: 20 }}
                />
              )}
            </Button>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={handleExportCSV}
            >
              Export CSV
            </Button>
          </Box>
        </Box>

        {/* Stats Cards */}
        {data?.stats && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ py: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Total Logs (30d)
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {data.stats.totalLogs.toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ py: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Today
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#00ED64' }}>
                    {data.stats.todayCount.toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ py: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Top Action
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {data.stats.topActions[0]?._id || 'N/A'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {data.stats.topActions[0]?.count.toLocaleString() || 0} times
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ py: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Most Active User
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.75rem' }}
                  >
                    {data.stats.topUsers[0]?._id?.substring(0, 12) || 'N/A'}...
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {data.stats.topUsers[0]?.count.toLocaleString() || 0} actions
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
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
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Event Type</InputLabel>
                  <Select
                    value={eventType}
                    label="Event Type"
                    onChange={(e) => {
                      setEventType(e.target.value);
                      setPage(0);
                    }}
                  >
                    <MenuItem value="">All Events</MenuItem>
                    <Divider />
                    {COMMON_EVENT_TYPES.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Search"
                  placeholder="User, resource, or details..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(0);
                  }}
                  InputProps={{
                    startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <DatePicker
                  label="Start Date"
                  value={startDate}
                  onChange={(date) => {
                    setStartDate(date);
                    setPage(0);
                  }}
                  slotProps={{ textField: { size: 'small', fullWidth: true } }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <DatePicker
                  label="End Date"
                  value={endDate}
                  onChange={(date) => {
                    setEndDate(date);
                    setPage(0);
                  }}
                  slotProps={{ textField: { size: 'small', fullWidth: true } }}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Clear />}
                  onClick={handleClearFilters}
                  disabled={!hasActiveFilters}
                >
                  Clear
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Collapse>

        {/* Logs Table */}
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
                  <TableCell>Event</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>Resource</TableCell>
                  <TableCell>Time</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading
                  ? Array.from({ length: 10 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={5}>
                          <Skeleton variant="rounded" height={40} />
                        </TableCell>
                      </TableRow>
                    ))
                  : data?.logs.map((log) => (
                      <LogRow
                        key={log._id}
                        log={log}
                        expanded={expandedRow === log._id}
                        onToggle={() =>
                          setExpandedRow(expandedRow === log._id ? null : log._id)
                        }
                      />
                    ))}
                {!isLoading && data?.logs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                      <History sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                      <Typography color="text.secondary">
                        No audit logs found
                      </Typography>
                      {hasActiveFilters && (
                        <Button
                          size="small"
                          onClick={handleClearFilters}
                          sx={{ mt: 1 }}
                        >
                          Clear filters
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={data?.pagination.total || 0}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 25, 50, 100]}
          />
        </Paper>
      </Box>
    </LocalizationProvider>
  );
}
