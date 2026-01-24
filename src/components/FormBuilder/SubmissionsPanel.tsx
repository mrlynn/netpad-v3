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
  Collapse,
  Alert,
  Tooltip,
  alpha,
  Button,
} from '@mui/material';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import {
  Delete,
  ExpandMore,
  ExpandLess,
  Refresh,
  Download,
  Visibility,
} from '@mui/icons-material';
import { FormSubmission } from '@/types/form';

interface SubmissionsPanelProps {
  formId: string;
  formName: string;
}

interface ExpandedRow {
  [key: string]: boolean;
}

export function SubmissionsPanel({ formId, formName }: SubmissionsPanelProps) {
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [expandedRows, setExpandedRows] = useState<ExpandedRow>({});

  const fetchSubmissions = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/forms/${formId}/submissions?page=${page + 1}&limit=${rowsPerPage}`
      );
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch submissions');
      }

      setSubmissions(data.submissions);
      setTotal(data.total);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId, page, rowsPerPage]);

  const handleDelete = async (submissionId: string) => {
    if (!confirm('Are you sure you want to delete this submission?')) {
      return;
    }

    try {
      const response = await fetch(`/api/forms/${formId}/submissions`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error);
      }

      // Refresh list
      fetchSubmissions();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleExportCSV = () => {
    if (submissions.length === 0) return;

    // Get all unique keys from submissions
    const allKeys = new Set<string>();
    submissions.forEach((sub) => {
      Object.keys(sub.data).forEach((key) => allKeys.add(key));
    });

    const headers = ['Submission ID', 'Submitted At', ...Array.from(allKeys)];

    const csvRows = [
      headers.join(','),
      ...submissions.map((sub) => {
        const row = [
          sub.id,
          sub.submittedAt,
          ...Array.from(allKeys).map((key) => {
            const value = sub.data[key];
            if (value === null || value === undefined) return '';
            if (typeof value === 'object') return JSON.stringify(value);
            return String(value).replace(/,/g, ';');
          }),
        ];
        return row.join(',');
      }),
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${formName.replace(/\s+/g, '_')}_submissions.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleRowExpanded = (id: string) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  const getPreviewValue = (data: Record<string, any>): string => {
    const keys = Object.keys(data).slice(0, 3);
    const preview = keys
      .map((key) => {
        const val = data[key];
        if (typeof val === 'object') return `${key}: {...}`;
        return `${key}: ${String(val).substring(0, 20)}`;
      })
      .join(', ');
    return preview + (Object.keys(data).length > 3 ? '...' : '');
  };

  if (loading && submissions.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 4,
        }}
      >
        <NetPadLoader size="large" variant="ascii" message="Loading submissions..." />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Form Submissions
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {total} total submissions
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh">
            <span>
              <IconButton size="small" onClick={fetchSubmissions} disabled={loading}>
                <Refresh fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Export CSV">
            <span>
              <IconButton
                size="small"
                onClick={handleExportCSV}
                disabled={submissions.length === 0}
              >
                <Download fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ m: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Table */}
      <TableContainer sx={{ flex: 1 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell width={40}></TableCell>
              <TableCell>Submitted</TableCell>
              <TableCell>Data Preview</TableCell>
              <TableCell width={80}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {submissions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    No submissions yet
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              submissions.map((submission) => (
                <>
                  <TableRow
                    key={submission.id}
                    sx={{
                      '&:hover': { bgcolor: alpha('#00ED64', 0.05) },
                      cursor: 'pointer',
                    }}
                    onClick={() => toggleRowExpanded(submission.id)}
                  >
                    <TableCell>
                      <IconButton size="small">
                        {expandedRows[submission.id] ? (
                          <ExpandLess fontSize="small" />
                        ) : (
                          <ExpandMore fontSize="small" />
                        )}
                      </IconButton>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(submission.submittedAt)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: 'monospace',
                          fontSize: '0.75rem',
                          color: 'text.secondary',
                        }}
                      >
                        {getPreviewValue(submission.data)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(submission.id);
                          }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={4} sx={{ py: 0, border: 0 }}>
                      <Collapse in={expandedRows[submission.id]} unmountOnExit>
                        <Paper
                          elevation={0}
                          sx={{
                            m: 1,
                            p: 2,
                            bgcolor: alpha('#001E2B', 0.03),
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{ fontWeight: 600, mb: 1, display: 'block' }}
                          >
                            Submission Data
                          </Typography>
                          <Box
                            component="pre"
                            sx={{
                              m: 0,
                              p: 1,
                              bgcolor: '#001E2B',
                              color: '#00ED64',
                              borderRadius: 1,
                              fontSize: '0.75rem',
                              overflow: 'auto',
                              maxHeight: 200,
                            }}
                          >
                            {JSON.stringify(submission.data, null, 2)}
                          </Box>
                          {submission.metadata && (
                            <Box sx={{ mt: 2 }}>
                              <Typography
                                variant="caption"
                                sx={{ fontWeight: 600, mb: 1, display: 'block' }}
                              >
                                Metadata
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                {submission.metadata.ipAddress && (
                                  <Chip
                                    label={`IP: ${submission.metadata.ipAddress}`}
                                    size="small"
                                    variant="outlined"
                                  />
                                )}
                                {submission.metadata.referrer && (
                                  <Chip
                                    label={`From: ${submission.metadata.referrer}`}
                                    size="small"
                                    variant="outlined"
                                  />
                                )}
                              </Box>
                            </Box>
                          )}
                        </Paper>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <TablePagination
        component="div"
        count={total}
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[10, 25, 50]}
      />
    </Box>
  );
}
