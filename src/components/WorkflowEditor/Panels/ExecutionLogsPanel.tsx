'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Drawer,
  Typography,
  IconButton,
  Divider,
  Chip,
  useTheme,
  alpha,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Collapse,
  Paper,
  Tooltip,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Close as CloseIcon,
  History as HistoryIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Refresh as RefreshIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  BugReport as DebugIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { useWorkflowEditor } from '@/contexts/WorkflowContext';

interface ExecutionLogsPanelProps {
  open: boolean;
  onClose: () => void;
  workflowId: string;
}

interface ExecutionWithLogs {
  _id?: string;
  workflowId: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  startedAt: Date | string;
  completedAt?: Date | string;
  completedNodes: string[];
  failedNodes: string[];
  skippedNodes: string[];
  result?: {
    success: boolean;
    output?: Record<string, unknown>;
    error?: {
      nodeId: string;
      code: string;
      message: string;
    };
  };
  logs?: Array<{
    _id?: string;
    nodeId: string;
    timestamp: Date | string;
    level: 'debug' | 'info' | 'warn' | 'error';
    event: string;
    message: string;
    data?: Record<string, unknown>;
  }>;
}

const LOG_LEVEL_ICONS = {
  debug: DebugIcon,
  info: InfoIcon,
  warn: WarningIcon,
  error: ErrorIcon,
};

const LOG_LEVEL_COLORS = {
  debug: 'default',
  info: 'info',
  warn: 'warning',
  error: 'error',
} as const;

const STATUS_COLORS = {
  pending: 'default',
  running: 'info',
  paused: 'warning',
  completed: 'success',
  failed: 'error',
  cancelled: 'default',
} as const;

// Map status to actual palette colors
const STATUS_PALETTE_COLORS: Record<string, string> = {
  pending: 'grey',
  running: 'info',
  paused: 'warning',
  completed: 'success',
  failed: 'error',
  cancelled: 'grey',
};

const STATUS_ICONS = {
  pending: ScheduleIcon,
  running: PlayIcon,
  paused: StopIcon,
  completed: SuccessIcon,
  failed: ErrorIcon,
  cancelled: StopIcon,
};

// Helper to safely get palette color
const getStatusPaletteColor = (theme: any, status: string | undefined): string => {
  const paletteKey = status ? STATUS_PALETTE_COLORS[status] || 'grey' : 'grey';
  return theme.palette[paletteKey]?.main || theme.palette.grey[500];
};

// Helper to safely get status icon
const getStatusIcon = (status: string | undefined) => {
  if (status && STATUS_ICONS[status as keyof typeof STATUS_ICONS]) {
    return STATUS_ICONS[status as keyof typeof STATUS_ICONS];
  }
  return ScheduleIcon;
};

// Helper to safely get status chip color
const getStatusChipColor = (status: string | undefined): 'default' | 'info' | 'warning' | 'success' | 'error' => {
  if (status && STATUS_COLORS[status as keyof typeof STATUS_COLORS]) {
    const color = STATUS_COLORS[status as keyof typeof STATUS_COLORS];
    if (color === 'default') return 'default';
    return color as 'info' | 'warning' | 'success' | 'error';
  }
  return 'default';
};

export function ExecutionLogsPanel({ open, onClose, workflowId }: ExecutionLogsPanelProps) {
  const theme = useTheme();
  const { nodes } = useWorkflowEditor();

  const [executions, setExecutions] = useState<ExecutionWithLogs[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedExecution, setSelectedExecution] = useState<string | null>(null);
  const [logLevelFilter, setLogLevelFilter] = useState<string>('all');
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Get node label by ID
  const getNodeLabel = useCallback(
    (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      return node?.label || node?.type || nodeId;
    },
    [nodes]
  );

  // Fetch executions
  const fetchExecutions = useCallback(async () => {
    if (!workflowId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/workflows/${workflowId}/executions?logs=true&limit=10`
      );
      const data = await response.json();

      if (data.success) {
        setExecutions(data.executions);
        // Auto-select the first execution if none selected
        if (data.executions.length > 0 && !selectedExecution) {
          setSelectedExecution(data.executions[0]._id);
        }
      } else {
        setError(data.error || 'Failed to fetch executions');
      }
    } catch (err) {
      setError('Failed to fetch executions');
      console.error('Error fetching executions:', err);
    } finally {
      setLoading(false);
    }
  }, [workflowId, selectedExecution]);

  // Fetch on open
  useEffect(() => {
    if (open && workflowId) {
      fetchExecutions();
    }
  }, [open, workflowId, fetchExecutions]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !open) return;

    const interval = setInterval(fetchExecutions, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh, open, fetchExecutions]);

  // Get the selected execution
  const currentExecution = executions.find((e) => e._id === selectedExecution);

  // Filter logs by level
  const filteredLogs = currentExecution?.logs?.filter((log) => {
    if (logLevelFilter === 'all') return true;
    return log.level === logLevelFilter;
  }) || [];

  // Toggle log data expansion
  const toggleLogExpand = (logId: string) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedLogs(newExpanded);
  };

  // Format timestamp
  const formatTime = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  // Format date
  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format duration
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: 520,
          bgcolor: 'background.paper',
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          p: 2,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <HistoryIcon color="primary" />
        <Typography variant="h6" sx={{ flex: 1, fontWeight: 600 }}>
          Execution Logs
        </Typography>
        <Tooltip title={autoRefresh ? 'Stop auto-refresh' : 'Start auto-refresh'}>
          <IconButton
            onClick={() => setAutoRefresh(!autoRefresh)}
            color={autoRefresh ? 'primary' : 'default'}
            size="small"
          >
            <RefreshIcon />
          </IconButton>
        </Tooltip>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {loading && executions.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="error">{error}</Typography>
            <Button onClick={fetchExecutions} sx={{ mt: 2 }}>
              Retry
            </Button>
          </Box>
        ) : executions.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">
              No executions found for this workflow.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Run the workflow or submit a form to see execution logs.
            </Typography>
          </Box>
        ) : (
          <>
            {/* Execution Selector */}
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Execution</InputLabel>
              <Select
                value={selectedExecution || ''}
                label="Execution"
                onChange={(e) => setSelectedExecution(e.target.value)}
              >
                {executions.map((exec) => {
                  const StatusIcon = getStatusIcon(exec.status);
                  return (
                    <MenuItem key={exec._id?.toString()} value={exec._id?.toString()}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                        <StatusIcon
                          sx={{
                            fontSize: 16,
                            color: `${STATUS_PALETTE_COLORS[exec.status] || 'grey'}.main`,
                          }}
                        />
                        <Typography variant="body2" sx={{ flex: 1 }}>
                          {formatDate(exec.startedAt)}
                        </Typography>
                        <Chip
                          label={exec.status || 'unknown'}
                          size="small"
                          color={getStatusChipColor(exec.status)}
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                      </Box>
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>

            {/* Execution Summary */}
            {currentExecution && (
              <Paper
                sx={{
                  p: 2,
                  mb: 2,
                  bgcolor: alpha(
                    getStatusPaletteColor(theme, currentExecution.status),
                    0.05
                  ),
                  border: `1px solid ${alpha(
                    getStatusPaletteColor(theme, currentExecution.status),
                    0.2
                  )}`,
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="subtitle2">Status</Typography>
                  <Chip
                    label={currentExecution.status || 'unknown'}
                    size="small"
                    color={getStatusChipColor(currentExecution.status)}
                  />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Started
                  </Typography>
                  <Typography variant="body2">
                    {formatDate(currentExecution.startedAt)}
                  </Typography>
                </Box>
                {currentExecution.completedAt && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Duration
                    </Typography>
                    <Typography variant="body2">
                      {formatDuration(
                        new Date(currentExecution.completedAt).getTime() -
                          new Date(currentExecution.startedAt).getTime()
                      )}
                    </Typography>
                  </Box>
                )}
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <Chip
                    label={`${currentExecution.completedNodes?.length || 0} completed`}
                    size="small"
                    color="success"
                    variant="outlined"
                  />
                  {(currentExecution.failedNodes?.length || 0) > 0 && (
                    <Chip
                      label={`${currentExecution.failedNodes.length} failed`}
                      size="small"
                      color="error"
                      variant="outlined"
                    />
                  )}
                </Box>

                {/* Show error if failed */}
                {currentExecution.result?.error && (
                  <Box
                    sx={{
                      mt: 2,
                      p: 1.5,
                      bgcolor: alpha(theme.palette.error.main, 0.1),
                      borderRadius: 1,
                    }}
                  >
                    <Typography variant="caption" color="error" fontWeight={600}>
                      Error: {currentExecution.result.error.code}
                    </Typography>
                    <Typography variant="body2" color="error">
                      {currentExecution.result.error.message}
                    </Typography>
                  </Box>
                )}
              </Paper>
            )}

            {/* Log Level Filter */}
            <Box sx={{ mb: 2 }}>
              <ToggleButtonGroup
                value={logLevelFilter}
                exclusive
                onChange={(_, value) => value && setLogLevelFilter(value)}
                size="small"
                fullWidth
              >
                <ToggleButton value="all">All</ToggleButton>
                <ToggleButton value="error">Errors</ToggleButton>
                <ToggleButton value="warn">Warnings</ToggleButton>
                <ToggleButton value="info">Info</ToggleButton>
                <ToggleButton value="debug">Debug</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {/* Logs List */}
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Logs ({filteredLogs.length})
            </Typography>

            {filteredLogs.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                No logs match the current filter.
              </Typography>
            ) : (
              <List sx={{ p: 0 }}>
                {filteredLogs.map((log, index) => {
                  const LogIcon = LOG_LEVEL_ICONS[log.level];
                  const logId = log._id?.toString() || `log-${index}`;
                  const isExpanded = expandedLogs.has(logId);
                  const hasData = log.data && Object.keys(log.data).length > 0;

                  return (
                    <Paper
                      key={logId}
                      sx={{
                        mb: 1,
                        overflow: 'hidden',
                        border: `1px solid ${theme.palette.divider}`,
                      }}
                    >
                      <ListItem
                        sx={{
                          py: 1,
                          cursor: hasData ? 'pointer' : 'default',
                          '&:hover': hasData
                            ? { bgcolor: alpha(theme.palette.primary.main, 0.05) }
                            : {},
                        }}
                        onClick={() => hasData && toggleLogExpand(logId)}
                      >
                        <LogIcon
                          sx={{
                            mr: 1,
                            fontSize: 18,
                            color: `${LOG_LEVEL_COLORS[log.level]}.main`,
                          }}
                        />
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontFamily: 'monospace',
                                  fontSize: '0.75rem',
                                  color: 'text.secondary',
                                }}
                              >
                                {formatTime(log.timestamp)}
                              </Typography>
                              <Chip
                                label={getNodeLabel(log.nodeId)}
                                size="small"
                                sx={{
                                  height: 18,
                                  fontSize: '0.65rem',
                                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                                }}
                              />
                            </Box>
                          }
                          secondary={
                            <Typography
                              variant="body2"
                              sx={{
                                mt: 0.5,
                                wordBreak: 'break-word',
                              }}
                            >
                              {log.message}
                            </Typography>
                          }
                        />
                        {hasData && (
                          <IconButton size="small">
                            {isExpanded ? <CollapseIcon /> : <ExpandIcon />}
                          </IconButton>
                        )}
                      </ListItem>

                      {/* Expandable Data */}
                      <Collapse in={isExpanded}>
                        <Box
                          sx={{
                            px: 2,
                            py: 1.5,
                            bgcolor: alpha(theme.palette.grey[900], 0.03),
                            borderTop: `1px solid ${theme.palette.divider}`,
                          }}
                        >
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: 'block', mb: 1 }}
                          >
                            Data:
                          </Typography>
                          <Box
                            component="pre"
                            sx={{
                              m: 0,
                              p: 1.5,
                              bgcolor: alpha(theme.palette.grey[900], 0.05),
                              borderRadius: 1,
                              overflow: 'auto',
                              maxHeight: 300,
                              fontSize: '0.75rem',
                              fontFamily: 'monospace',
                            }}
                          >
                            {JSON.stringify(log.data, null, 2)}
                          </Box>
                        </Box>
                      </Collapse>
                    </Paper>
                  );
                })}
              </List>
            )}
          </>
        )}
      </Box>

      {/* Footer */}
      <Box
        sx={{
          p: 2,
          borderTop: `1px solid ${theme.palette.divider}`,
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <Button variant="outlined" onClick={fetchExecutions} disabled={loading}>
          {loading ? <CircularProgress size={20} /> : 'Refresh'}
        </Button>
        <Button variant="outlined" onClick={onClose}>
          Close
        </Button>
      </Box>
    </Drawer>
  );
}

export default ExecutionLogsPanel;
