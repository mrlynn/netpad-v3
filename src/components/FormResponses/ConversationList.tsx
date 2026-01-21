'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Chip,
  alpha,
  CircularProgress,
  Alert,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  LinearProgress,
  Tooltip,
  Collapse,
} from '@mui/material';
import {
  Visibility,
  ExpandMore,
  ExpandLess,
  Chat,
  CheckCircle,
  Cancel,
  Schedule,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ConversationTranscriptViewer } from '@/components/ConversationalForm';
import { ConversationalSubmissionData } from '@/types/platform';

interface ConversationSummary {
  conversationId: string;
  formId: string;
  status: 'draft' | 'submitted' | 'abandoned';
  turnCount: number;
  duration: number;
  extractedFieldCount: number;
  completionPercentage: number;
  topicsCovered: number;
  totalTopics: number;
  averageConfidence: number;
  startedAt: string;
  updatedAt: string;
  submittedAt?: string;
}

interface ConversationListProps {
  formId: string;
  orgId: string;
}

export function ConversationList({ formId, orgId }: ConversationListProps) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedConversation, setExpandedConversation] = useState<string | null>(null);
  const [expandedData, setExpandedData] = useState<any>(null);
  const [loadingExpanded, setLoadingExpanded] = useState(false);

  useEffect(() => {
    fetchConversations();
  }, [formId, orgId, page, pageSize, statusFilter]);

  const fetchConversations = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        orgId,
        status: statusFilter,
        limit: String(pageSize),
        offset: String(page * pageSize),
        sortBy: 'updatedAt',
        sortOrder: 'desc',
      });

      const response = await fetch(`/api/forms/${formId}/conversations?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setConversations(data.conversations);
        setTotal(data.pagination.total);
      } else {
        setError(data.error || 'Failed to fetch conversations');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch conversations');
    } finally {
      setLoading(false);
    }
  };

  const handleExpandConversation = async (conversationId: string) => {
    if (expandedConversation === conversationId) {
      setExpandedConversation(null);
      setExpandedData(null);
      return;
    }

    setExpandedConversation(conversationId);
    setLoadingExpanded(true);

    try {
      const response = await fetch(
        `/api/forms/${formId}/conversations/${conversationId}?orgId=${orgId}`
      );
      const data = await response.json();

      if (data.success) {
        setExpandedData(data.conversation);
      } else {
        setError(data.error || 'Failed to fetch conversation details');
        setExpandedConversation(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch conversation details');
      setExpandedConversation(null);
    } finally {
      setLoadingExpanded(false);
    }
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'draft':
        return (
          <Chip
            icon={<Schedule sx={{ fontSize: 14 }} />}
            label="In Progress"
            color="info"
            size="small"
          />
        );
      case 'submitted':
        return (
          <Chip
            icon={<CheckCircle sx={{ fontSize: 14 }} />}
            label="Completed"
            color="success"
            size="small"
          />
        );
      case 'abandoned':
        return (
          <Chip
            icon={<Cancel sx={{ fontSize: 14 }} />}
            label="Abandoned"
            color="error"
            size="small"
          />
        );
      default:
        return <Chip label={status} size="small" />;
    }
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  // Transform API response to ConversationalSubmissionData format
  const transformToConversationalData = (data: any): ConversationalSubmissionData => {
    return {
      conversationId: data.conversationId,
      transcript: data.transcript?.map((msg: any) => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
        timestamp: msg.timestamp ? new Date(msg.timestamp) : undefined,
      })),
      topicsCovered: data.topicsCovered?.map((topic: any) => ({
        topicId: topic.topicId,
        name: topic.name,
        covered: topic.covered,
        depth: topic.depth,
      })),
      fieldConfidence: data.fieldConfidence,
      overallConfidence: data.overallConfidence || 0,
      turnCount: data.metadata?.turnCount || data.turnCount || 0,
      durationSeconds: data.metadata?.duration || data.duration,
      startedAt: data.metadata?.startedAt ? new Date(data.metadata.startedAt) : undefined,
      completedAt: data.metadata?.completedAt ? new Date(data.metadata.completedAt) : undefined,
    };
  };

  if (loading && conversations.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header with filters */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chat sx={{ color: '#00ED64' }} />
          <Typography variant="h6">Conversations</Typography>
          <Chip label={total} size="small" sx={{ ml: 1 }} />
        </Box>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="draft">In Progress</MenuItem>
            <MenuItem value="submitted">Completed</MenuItem>
            <MenuItem value="abandoned">Abandoned</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {conversations.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            No conversations found for this form.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            When users interact with your conversational form, their sessions will appear here.
          </Typography>
        </Paper>
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell width={40}></TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Progress</TableCell>
                  <TableCell>Turns</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell>Fields</TableCell>
                  <TableCell>Confidence</TableCell>
                  <TableCell>Last Updated</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {conversations.map((conv) => (
                  <>
                    <TableRow
                      key={conv.conversationId}
                      hover
                      sx={{
                        cursor: 'pointer',
                        bgcolor: expandedConversation === conv.conversationId
                          ? alpha('#00ED64', 0.05)
                          : 'inherit',
                      }}
                      onClick={() => handleExpandConversation(conv.conversationId)}
                    >
                      <TableCell>
                        <IconButton size="small">
                          {expandedConversation === conv.conversationId ? (
                            <ExpandLess fontSize="small" />
                          ) : (
                            <ExpandMore fontSize="small" />
                          )}
                        </IconButton>
                      </TableCell>
                      <TableCell>{getStatusChip(conv.status)}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={conv.completionPercentage}
                            sx={{
                              width: 60,
                              height: 6,
                              borderRadius: 3,
                              bgcolor: alpha('#00ED64', 0.1),
                              '& .MuiLinearProgress-bar': {
                                bgcolor: conv.completionPercentage === 100 ? '#00ED64' : '#2196f3',
                              },
                            }}
                          />
                          <Typography variant="body2" color="text.secondary">
                            {conv.completionPercentage}%
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{conv.turnCount}</TableCell>
                      <TableCell>{formatDuration(conv.duration)}</TableCell>
                      <TableCell>{conv.extractedFieldCount}</TableCell>
                      <TableCell>
                        <Tooltip title="Average confidence in extracted data">
                          <span>{Math.round(conv.averageConfidence * 100)}%</span>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        {format(new Date(conv.updatedAt), 'MMM d, h:mm a')}
                      </TableCell>
                    </TableRow>
                    {/* Expanded row with transcript */}
                    <TableRow>
                      <TableCell colSpan={8} sx={{ p: 0, border: 0 }}>
                        <Collapse
                          in={expandedConversation === conv.conversationId}
                          timeout="auto"
                          unmountOnExit
                        >
                          <Box
                            sx={{
                              p: 2,
                              bgcolor: alpha('#00ED64', 0.02),
                              borderBottom: '1px solid',
                              borderColor: 'divider',
                            }}
                          >
                            {loadingExpanded ? (
                              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                                <CircularProgress size={24} />
                              </Box>
                            ) : expandedData ? (
                              <Box sx={{ display: 'flex', gap: 3 }}>
                                {/* Transcript */}
                                <Box sx={{ flex: 1 }}>
                                  <ConversationTranscriptViewer
                                    conversationalData={transformToConversationalData(expandedData)}
                                    defaultExpanded
                                  />
                                </Box>
                                {/* Extracted Data */}
                                <Box sx={{ width: 300 }}>
                                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                    Extracted Data
                                  </Typography>
                                  <Paper
                                    sx={{
                                      maxHeight: 400,
                                      overflow: 'auto',
                                      p: 2,
                                      bgcolor: 'background.default',
                                    }}
                                  >
                                    {Object.entries(expandedData.extractedData || {}).map(
                                      ([key, value]) => (
                                        <Box key={key} sx={{ mb: 1 }}>
                                          <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            sx={{ display: 'block' }}
                                          >
                                            {key}
                                          </Typography>
                                          <Typography variant="body2">
                                            {value !== null && value !== undefined
                                              ? String(value)
                                              : '-'}
                                          </Typography>
                                        </Box>
                                      )
                                    )}
                                    {Object.keys(expandedData.extractedData || {}).length === 0 && (
                                      <Typography variant="body2" color="text.secondary">
                                        No data extracted yet
                                      </Typography>
                                    )}
                                  </Paper>
                                </Box>
                              </Box>
                            ) : null}
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={pageSize}
            onRowsPerPageChange={(e) => {
              setPageSize(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 25, 50, 100]}
          />
        </>
      )}
    </Box>
  );
}
