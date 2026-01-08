'use client';

/**
 * Public Workflow Execution View Page
 * 
 * This page displays workflow execution status and logs in an embeddable format.
 * Used for embedding workflow execution status in external applications.
 * 
 * Query Parameters:
 * - embedded: true - Marks as embedded for special handling
 * - theme: light | dark | auto - Theme selection
 * - hideHeader: true - Hide header
 * - hideBranding: true - Hide NetPad branding
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import {
  Box,
  Typography,
  Chip,
  CircularProgress,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemText,
  Collapse,
  IconButton,
  useTheme,
  alpha,
  Alert,
} from '@mui/material';
import {
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  HourglassEmpty as WaitingIcon,
  PlayArrow as PlayIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  BugReport as DebugIcon,
} from '@mui/icons-material';
import { ExecutionStatus } from '@/types/workflow';

interface ExecutionData {
  executionId: string;
  workflowId: string;
  status: ExecutionStatus;
  startedAt: string;
  completedAt?: string;
  currentNodeId?: string;
  completedNodes: string[];
  failedNodes: string[];
  result?: {
    success: boolean;
    output?: Record<string, any>;
    error?: {
      code: string;
      message: string;
    };
  };
  metrics: {
    totalDurationMs: number;
  };
}

interface ExecutionLog {
  nodeId: string;
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  event: string;
  message: string;
  data?: Record<string, any>;
}

const STATUS_COLORS: Record<ExecutionStatus, string> = {
  pending: '#ff9800',
  running: '#2196f3',
  paused: '#9e9e9e',
  completed: '#4caf50',
  failed: '#f44336',
  cancelled: '#9e9e9e',
};

const STATUS_ICONS: Record<ExecutionStatus, React.ReactElement> = {
  pending: <WaitingIcon />,
  running: <PlayIcon />,
  paused: <WaitingIcon />,
  completed: <SuccessIcon />,
  failed: <ErrorIcon />,
  cancelled: <ErrorIcon />,
};

const LOG_ICONS = {
  debug: <DebugIcon fontSize="small" />,
  info: <InfoIcon fontSize="small" />,
  warn: <WarningIcon fontSize="small" />,
  error: <ErrorIcon fontSize="small" />,
};

const LOG_COLORS = {
  debug: '#9e9e9e',
  info: '#2196f3',
  warn: '#ff9800',
  error: '#f44336',
};

export default function PublicExecutionPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const theme = useTheme();
  const executionId = params.executionId as string;

  const hideHeader = searchParams.get('hideHeader') === 'true';
  const hideBranding = searchParams.get('hideBranding') === 'true';
  const embedTheme = searchParams.get('theme') as 'light' | 'dark' | 'auto' | null;
  const isEmbedded = searchParams.get('embedded') === 'true';

  const [execution, setExecution] = useState<ExecutionData | null>(null);
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [autoRefresh, setAutoRefresh] = useState(false);

  /**
   * Send message to parent window if embedded
   */
  const postMessageToParent = useCallback((type: string, payload?: any) => {
    if (!isEmbedded || typeof window === 'undefined') return;

    try {
      window.parent.postMessage({
        source: 'netpad-workflow',
        executionId,
        type,
        payload,
      }, '*');
    } catch (e) {
      // Ignore if postMessage fails
    }
  }, [isEmbedded, executionId]);

  /**
   * Fetch execution status
   */
  const fetchExecution = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/workflows/public/executions/${executionId}?logs=true`
      );
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load execution');
      }

      setExecution(data.execution);
      setLogs(data.logs || []);
      setError(null);

      // Notify parent if embedded
      postMessageToParent('statusChange', {
        status: data.execution.status,
        execution: data.execution,
      });

      // Auto-refresh if execution is still running
      if (['pending', 'running'].includes(data.execution.status)) {
        setAutoRefresh(true);
      } else {
        setAutoRefresh(false);
        postMessageToParent('complete', data.execution);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load execution');
      postMessageToParent('error', { error: err.message });
    } finally {
      setLoading(false);
    }
  }, [executionId, postMessageToParent]);

  // Initial fetch
  useEffect(() => {
    fetchExecution();
  }, [fetchExecution]);

  // Auto-refresh for pending/running executions
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchExecution, 2000); // Poll every 2 seconds
    return () => clearInterval(interval);
  }, [autoRefresh, fetchExecution]);

  // Notify parent when loaded
  useEffect(() => {
    if (execution && !loading) {
      postMessageToParent('loaded', { execution });
    }
  }, [execution, loading, postMessageToParent]);

  const toggleLogExpand = (logIndex: number) => {
    const newExpanded = new Set(expandedLogs);
    const key = logIndex.toString();
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedLogs(newExpanded);
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!execution) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">Execution not found</Alert>
      </Box>
    );
  }

  const statusColor = STATUS_COLORS[execution.status] || '#9e9e9e';
  const StatusIcon = STATUS_ICONS[execution.status];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        ...(isEmbedded && {
          minHeight: 'auto',
          bgcolor: 'transparent',
        }),
      }}
    >
      {/* Header */}
      {!hideHeader && (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                color: statusColor,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {StatusIcon}
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6">Workflow Execution</Typography>
              <Typography variant="caption" color="text.secondary">
                {execution.executionId}
              </Typography>
            </Box>
            <Chip
              label={execution.status}
              sx={{
                bgcolor: alpha(statusColor, 0.1),
                color: statusColor,
                fontWeight: 600,
              }}
            />
          </Box>
        </Paper>
      )}

      {/* Content */}
      <Box sx={{ p: 3 }}>
        {/* Execution Summary */}
        <Paper elevation={0} sx={{ p: 2, mb: 2, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
            Execution Summary
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">
                Status:
              </Typography>
              <Chip
                label={execution.status}
                size="small"
                sx={{
                  bgcolor: alpha(statusColor, 0.1),
                  color: statusColor,
                }}
              />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">
                Started:
              </Typography>
              <Typography variant="body2">{formatTime(execution.startedAt)}</Typography>
            </Box>
            {execution.completedAt && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  Completed:
                </Typography>
                <Typography variant="body2">{formatTime(execution.completedAt)}</Typography>
              </Box>
            )}
            {execution.metrics.totalDurationMs > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  Duration:
                </Typography>
                <Typography variant="body2">
                  {formatDuration(execution.metrics.totalDurationMs)}
                </Typography>
              </Box>
            )}
            {execution.completedNodes.length > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  Completed Nodes:
                </Typography>
                <Typography variant="body2">{execution.completedNodes.length}</Typography>
              </Box>
            )}
            {execution.failedNodes.length > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  Failed Nodes:
                </Typography>
                <Typography variant="body2" color="error">
                  {execution.failedNodes.length}
                </Typography>
              </Box>
            )}
          </Box>
        </Paper>

        {/* Result */}
        {execution.result && (
          <Paper elevation={0} sx={{ p: 2, mb: 2, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
              Result
            </Typography>
            {execution.result.success ? (
              <Alert severity="success">Execution completed successfully</Alert>
            ) : (
              <Alert severity="error">
                {execution.result.error?.message || 'Execution failed'}
              </Alert>
            )}
            {execution.result.output && (
              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  bgcolor: 'background.default',
                  borderRadius: 1,
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  overflow: 'auto',
                }}
              >
                <pre>{JSON.stringify(execution.result.output, null, 2)}</pre>
              </Box>
            )}
          </Paper>
        )}

        {/* Logs */}
        {logs.length > 0 && (
          <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Execution Logs ({logs.length})
              </Typography>
            </Box>
            <List sx={{ maxHeight: '400px', overflow: 'auto' }}>
              {logs.map((log, index) => {
                const isExpanded = expandedLogs.has(index.toString());
                const logColor = LOG_COLORS[log.level] || '#9e9e9e';
                const LogIcon = LOG_ICONS[log.level] || <InfoIcon fontSize="small" />;

                return (
                  <React.Fragment key={index}>
                    <ListItem
                      sx={{
                        bgcolor: alpha(logColor, 0.05),
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 1 }}>
                        <Box sx={{ color: logColor }}>{LogIcon}</Box>
                        <Typography variant="caption" sx={{ color: logColor, minWidth: '60px' }}>
                          {log.level.toUpperCase()}
                        </Typography>
                      </Box>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2">{log.message}</Typography>
                            {log.nodeId && (
                              <Chip
                                label={log.nodeId}
                                size="small"
                                sx={{ height: '20px', fontSize: '0.7rem' }}
                              />
                            )}
                          </Box>
                        }
                        secondary={formatTime(log.timestamp)}
                      />
                      {log.data && (
                        <IconButton
                          size="small"
                          onClick={() => toggleLogExpand(index)}
                          sx={{ ml: 1 }}
                        >
                          {isExpanded ? <CollapseIcon /> : <ExpandIcon />}
                        </IconButton>
                      )}
                    </ListItem>
                    {log.data && (
                      <Collapse in={isExpanded}>
                        <Box
                          sx={{
                            p: 2,
                            bgcolor: 'background.default',
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                            fontFamily: 'monospace',
                            fontSize: '0.75rem',
                          }}
                        >
                          <pre>{JSON.stringify(log.data, null, 2)}</pre>
                        </Box>
                      </Collapse>
                    )}
                  </React.Fragment>
                );
              })}
            </List>
          </Paper>
        )}

        {/* Branding */}
        {!hideBranding && (
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              Powered by{' '}
              <a
                href="https://www.netpad.io"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'inherit', textDecoration: 'none' }}
              >
                NetPad
              </a>
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
