'use client';

import { useState, useEffect } from 'react';
import { HelpButton } from '@/components/Help/HelpButton';
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
  TextField,
  Button,
  IconButton,
  Chip,
  alpha,
  Alert,
  Checkbox,
} from '@mui/material';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import {
  Delete,
  Visibility,
  Search,
  FilterList,
} from '@mui/icons-material';
import { FormResponse } from '@/types/form';
import { format } from 'date-fns';
import { ResponseFilters } from './ResponseFilters';
import { ResponseDetail } from './ResponseDetail';

interface ResponseListProps {
  formId: string;
  connectionString?: string;
}

export function ResponseList({ formId, connectionString }: ResponseListProps) {
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResponses, setSelectedResponses] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<any>({});
  const [detailResponse, setDetailResponse] = useState<FormResponse | null>(null);
  const [sortBy, setSortBy] = useState<string>('submittedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchResponses();
  }, [formId, page, pageSize, filters, sortBy, sortOrder]);

  const fetchResponses = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('page', String(page + 1));
      params.set('pageSize', String(pageSize));
      if (sortBy) params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);
      if (filters.status) params.set('status', filters.status);
      if (filters.deviceType) params.set('deviceType', filters.deviceType);
      if (filters.dateRange?.start) params.set('startDate', filters.dateRange.start.toISOString());
      if (filters.dateRange?.end) params.set('endDate', filters.dateRange.end.toISOString());
      if (connectionString) params.set('connectionString', connectionString);

      const response = await fetch(`/api/forms/${formId}/responses?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setResponses(data.responses);
        setTotal(data.total);
      } else {
        setError(data.error || 'Failed to fetch responses');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch responses');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (responseId: string) => {
    if (!confirm('Are you sure you want to delete this response?')) {
      return;
    }

    try {
      const params = new URLSearchParams();
      if (connectionString) params.set('connectionString', connectionString);

      const response = await fetch(`/api/forms/${formId}/responses/${responseId}?${params.toString()}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (data.success) {
        fetchResponses();
        setSelectedResponses(selectedResponses.filter(id => id !== responseId));
      } else {
        alert(`Failed to delete response: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Failed to delete response: ${err.message}`);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedResponses.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedResponses.length} responses?`)) {
      return;
    }

    try {
      const params = new URLSearchParams();
      if (connectionString) params.set('connectionString', connectionString);

      await Promise.all(
        selectedResponses.map(id =>
          fetch(`/api/forms/${formId}/responses/${id}?${params.toString()}`, {
            method: 'DELETE',
          })
        )
      );
      fetchResponses();
      setSelectedResponses([]);
    } catch (err: any) {
      alert(`Failed to delete responses: ${err.message}`);
    }
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedResponses(responses.map(r => r._id!));
    } else {
      setSelectedResponses([]);
    }
  };

  const handleSelectOne = (responseId: string) => {
    setSelectedResponses(prev =>
      prev.includes(responseId)
        ? prev.filter(id => id !== responseId)
        : [...prev, responseId]
    );
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // Filter responses by search query
  const filteredResponses = responses.filter(response => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const dataStr = JSON.stringify(response.data).toLowerCase();
    return dataStr.includes(query);
  });

  if (loading && responses.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <NetPadLoader size="large" variant="ascii" message="Loading responses..." />
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
      {detailResponse ? (
        <ResponseDetail
          response={detailResponse}
          onClose={() => setDetailResponse(null)}
          onDelete={handleDelete}
          connectionString={connectionString}
        />
      ) : (
        <>
          {/* Toolbar */}
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <HelpButton topicId="response-management" tooltip="Response Management Help" />
            <TextField
              placeholder="Search responses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size="small"
              sx={{ flex: 1, minWidth: 200 }}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />
            <Button
              variant="outlined"
              startIcon={<FilterList />}
              onClick={() => setFiltersOpen(!filtersOpen)}
            >
              Filters
            </Button>
            {selectedResponses.length > 0 && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<Delete />}
                onClick={handleBulkDelete}
              >
                Delete ({selectedResponses.length})
              </Button>
            )}
          </Box>

          {/* Filters Panel */}
          {filtersOpen && (
            <Paper sx={{ p: 2, mb: 2 }}>
              <ResponseFilters
                filters={filters}
                onFiltersChange={setFilters}
                onClose={() => setFiltersOpen(false)}
              />
            </Paper>
          )}

          {/* Response Table */}
          <TableContainer component={Paper} data-testid="submissions-table">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={
                        selectedResponses.length > 0 &&
                        selectedResponses.length < responses.length
                      }
                      checked={
                        responses.length > 0 &&
                        selectedResponses.length === responses.length
                      }
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      onClick={() => handleSort('submittedAt')}
                      sx={{ textTransform: 'none', fontWeight: 'bold' }}
                    >
                      Submitted
                      {sortBy === 'submittedAt' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                    </Button>
                  </TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Data Preview</TableCell>
                  <TableCell>Device</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredResponses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        No responses found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredResponses.map((response) => (
                    <TableRow
                      key={response._id}
                      hover
                      sx={{
                        cursor: 'pointer',
                        '&:hover': {
                          bgcolor: alpha('#00ED64', 0.05),
                        },
                      }}
                      onClick={() => setDetailResponse(response)}
                    >
                      <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedResponses.includes(response._id!)}
                          onChange={() => handleSelectOne(response._id!)}
                        />
                      </TableCell>
                      <TableCell>
                        {format(new Date(response.submittedAt), 'MMM dd, yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={response.status}
                          size="small"
                          color={
                            response.status === 'submitted'
                              ? 'success'
                              : response.status === 'draft'
                              ? 'warning'
                              : 'default'
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{
                            maxWidth: 300,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {JSON.stringify(response.data).substring(0, 100)}...
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {response.metadata?.deviceType || 'Unknown'}
                      </TableCell>
                      <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                        <IconButton
                          size="small"
                          onClick={() => setDetailResponse(response)}
                        >
                          <Visibility fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDelete(response._id!)}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
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
          </TableContainer>
        </>
      )}
    </Box>
  );
}

