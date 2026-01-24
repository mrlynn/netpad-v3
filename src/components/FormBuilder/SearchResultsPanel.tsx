'use client';

import { useState } from 'react';
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
  Tooltip,
  Chip,
  Alert,
  alpha,
  Checkbox,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import {
  Edit,
  Visibility,
  Delete,
  ContentCopy,
  MoreVert,
  Download,
  Refresh,
  CheckCircle,
  ArrowUpward,
  ArrowDownward,
} from '@mui/icons-material';
import { FieldConfig } from '@/types/form';

interface SearchResult {
  _id: string;
  [key: string]: any;
}

interface SearchResultsPanelProps {
  results: SearchResult[];
  totalCount: number;
  loading: boolean;
  error: string | null;
  fieldConfigs: FieldConfig[];
  page: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
  onEditDocument: (doc: SearchResult) => void;
  onViewDocument: (doc: SearchResult) => void;
  onDeleteDocument?: (doc: SearchResult) => void;
  onRefresh: () => void;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  onSortChange?: (field: string) => void;
}

export function SearchResultsPanel({
  results,
  totalCount,
  loading,
  error,
  fieldConfigs,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  onEditDocument,
  onViewDocument,
  onDeleteDocument,
  onRefresh,
  sortField,
  sortDirection = 'desc',
  onSortChange,
}: SearchResultsPanelProps) {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuDocId, setMenuDocId] = useState<string | null>(null);

  // Get visible fields for table columns (limit to first 5 + _id)
  const visibleFields = fieldConfigs
    .filter(f => f.included)
    .slice(0, 5);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(new Set(results.map(r => r._id)));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedRows);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedRows(newSelected);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, docId: string) => {
    setMenuAnchor(event.currentTarget);
    setMenuDocId(docId);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setMenuDocId(null);
  };

  const formatCellValue = (value: any, type: string): React.ReactNode => {
    if (value === null || value === undefined) {
      return <Typography variant="body2" color="text.disabled">—</Typography>;
    }

    if (type === 'boolean') {
      return value ? (
        <CheckCircle sx={{ fontSize: 18, color: '#00ED64' }} />
      ) : (
        <Typography variant="body2" color="text.disabled">No</Typography>
      );
    }

    if (type === 'date') {
      try {
        return new Date(value).toLocaleDateString();
      } catch {
        return String(value);
      }
    }

    if (type === 'array' || Array.isArray(value)) {
      const arr = Array.isArray(value) ? value : [];
      return (
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {arr.slice(0, 3).map((item, i) => (
            <Chip key={i} label={String(item)} size="small" sx={{ fontSize: 11 }} />
          ))}
          {arr.length > 3 && (
            <Chip label={`+${arr.length - 3}`} size="small" variant="outlined" sx={{ fontSize: 11 }} />
          )}
        </Box>
      );
    }

    if (typeof value === 'object') {
      return (
        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 11 }}>
          {JSON.stringify(value).slice(0, 50)}...
        </Typography>
      );
    }

    const str = String(value);
    return str.length > 50 ? str.slice(0, 50) + '...' : str;
  };

  const getDocById = (id: string): SearchResult | undefined => {
    return results.find(r => r._id === id);
  };

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error" action={
          <Button color="inherit" size="small" onClick={onRefresh}>
            Retry
          </Button>
        }>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Paper elevation={0} sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{
        p: 1.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: alpha('#00ED64', 0.03),
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Search Results
          </Typography>
          <Chip
            label={loading ? '...' : `${totalCount} found`}
            size="small"
            sx={{
              bgcolor: alpha('#00ED64', 0.1),
              color: '#00ED64',
              fontSize: 11,
              height: 20,
            }}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {selectedRows.size > 0 && (
            <Chip
              label={`${selectedRows.size} selected`}
              size="small"
              onDelete={() => setSelectedRows(new Set())}
              sx={{ mr: 1 }}
            />
          )}
          <Tooltip title="Refresh results">
            <IconButton size="small" onClick={onRefresh} disabled={loading}>
              <Refresh sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Export results">
            <IconButton size="small" disabled={results.length === 0}>
              <Download sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Loading state */}
      {loading && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 4 }}>
          <NetPadLoader size="large" variant="ascii" message="Searching..." />
        </Box>
      )}

      {/* Empty state */}
      {!loading && results.length === 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 4, flex: 1 }}>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
            No documents found
          </Typography>
          <Typography variant="body2" color="text.disabled">
            Try adjusting your search criteria
          </Typography>
        </Box>
      )}

      {/* Results table */}
      {!loading && results.length > 0 && (
        <>
          <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" sx={{ bgcolor: 'background.paper' }}>
                    <Checkbox
                      size="small"
                      checked={selectedRows.size === results.length && results.length > 0}
                      indeterminate={selectedRows.size > 0 && selectedRows.size < results.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </TableCell>
                  <TableCell sx={{ bgcolor: 'background.paper', fontWeight: 600, fontSize: 12 }}>
                    ID
                  </TableCell>
                  {visibleFields.map((field) => (
                    <TableCell
                      key={field.path}
                      sx={{
                        bgcolor: 'background.paper',
                        fontWeight: 600,
                        fontSize: 12,
                        cursor: onSortChange ? 'pointer' : 'default',
                        userSelect: 'none',
                        '&:hover': onSortChange ? { bgcolor: alpha('#00ED64', 0.05) } : {},
                      }}
                      onClick={() => onSortChange?.(field.path)}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {field.label}
                        {sortField === field.path && (
                          sortDirection === 'asc' ? <ArrowUpward sx={{ fontSize: 14 }} /> : <ArrowDownward sx={{ fontSize: 14 }} />
                        )}
                      </Box>
                    </TableCell>
                  ))}
                  <TableCell sx={{ bgcolor: 'background.paper', width: 100 }} align="right">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {results.map((doc) => (
                  <TableRow
                    key={doc._id}
                    hover
                    selected={selectedRows.has(doc._id)}
                    sx={{ cursor: 'pointer' }}
                    onClick={() => onViewDocument(doc)}
                  >
                    <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        size="small"
                        checked={selectedRows.has(doc._id)}
                        onChange={(e) => handleSelectRow(doc._id, e.target.checked)}
                      />
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: 11 }}>
                      {String(doc._id).slice(-8)}
                    </TableCell>
                    {visibleFields.map((field) => (
                      <TableCell key={field.path} sx={{ maxWidth: 200 }}>
                        {formatCellValue(getNestedValue(doc, field.path), field.type)}
                      </TableCell>
                    ))}
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => onEditDocument(doc)}
                            sx={{ color: '#2196f3' }}
                          >
                            <Edit sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="More actions">
                          <IconButton
                            size="small"
                            onClick={(e) => handleMenuOpen(e, doc._id)}
                          >
                            <MoreVert sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          <TablePagination
            component="div"
            count={totalCount}
            page={page}
            onPageChange={(_, newPage) => onPageChange(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => onRowsPerPageChange(parseInt(e.target.value, 10))}
            rowsPerPageOptions={[10, 25, 50, 100]}
            sx={{ borderTop: '1px solid', borderColor: 'divider' }}
          />
        </>
      )}

      {/* Context menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          const doc = menuDocId ? getDocById(menuDocId) : null;
          if (doc) onViewDocument(doc);
          handleMenuClose();
        }}>
          <ListItemIcon><Visibility fontSize="small" /></ListItemIcon>
          <ListItemText>View</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          const doc = menuDocId ? getDocById(menuDocId) : null;
          if (doc) onEditDocument(doc);
          handleMenuClose();
        }}>
          <ListItemIcon><Edit fontSize="small" /></ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          const doc = menuDocId ? getDocById(menuDocId) : null;
          if (doc) {
            navigator.clipboard.writeText(JSON.stringify(doc, null, 2));
          }
          handleMenuClose();
        }}>
          <ListItemIcon><ContentCopy fontSize="small" /></ListItemIcon>
          <ListItemText>Copy JSON</ListItemText>
        </MenuItem>
        {onDeleteDocument && (
          <MenuItem
            onClick={() => {
              const doc = menuDocId ? getDocById(menuDocId) : null;
              if (doc) onDeleteDocument(doc);
              handleMenuClose();
            }}
            sx={{ color: 'error.main' }}
          >
            <ListItemIcon><Delete fontSize="small" sx={{ color: 'error.main' }} /></ListItemIcon>
            <ListItemText>Delete</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </Paper>
  );
}

/**
 * Get nested value from object using dot notation path
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    if (current === null || current === undefined) return undefined;
    return current[key];
  }, obj);
}
