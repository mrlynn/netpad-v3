/**
 * Search Demo Tab Component
 *
 * Demonstrates search functionality with sample data.
 * Shows a search form on the left and results on the right.
 */

'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Stack,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Button,
  alpha,
  useTheme,
  Checkbox,
  ListItemText,
  OutlinedInput,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { FormTemplate } from '@/types/formTemplate';
import { FieldConfig } from '@/types/form';
import {
  generateSampleData,
  getSearchableFields,
  filterRecords,
} from '@/lib/templates/sampleDataGenerator';

interface SearchDemoTabProps {
  template: FormTemplate;
}

// Maximum number of filter fields to show
const MAX_FILTER_FIELDS = 6;

// Get display-friendly value
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') {
    // Handle address objects
    if ('street' in value) {
      const addr = value as { street?: string; city?: string; state?: string };
      return `${addr.city || ''}, ${addr.state || ''}`.trim();
    }
    return JSON.stringify(value);
  }
  // Truncate long strings
  const str = String(value);
  return str.length > 40 ? str.substring(0, 40) + '...' : str;
}

// Get column-friendly label
function getColumnLabel(field: FieldConfig): string {
  // Shorten common labels
  const label = field.label;
  if (label.length > 20) {
    // Try to shorten
    return label.split(' ').slice(0, 2).join(' ');
  }
  return label;
}

export function SearchDemoTab({ template }: SearchDemoTabProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // Generate sample data once
  const sampleData = useMemo(() => generateSampleData(template, 25), [template]);

  // Get searchable fields
  const searchableFields = useMemo(() => {
    const fields = getSearchableFields(template);
    // Limit for UI
    return fields.slice(0, MAX_FILTER_FIELDS);
  }, [template]);

  // Get display columns (first 5 meaningful fields)
  const displayColumns = useMemo(() => {
    const fields = template.fieldConfigs.filter(
      (f) =>
        f.included &&
        f.type !== 'sectionHeader' &&
        !['signature', 'file', 'textarea', 'long_text'].includes(f.type)
    );
    return fields.slice(0, 5);
  }, [template]);

  // Filter state
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  // Filter records
  const filteredRecords = useMemo(() => {
    return filterRecords(sampleData, filters);
  }, [sampleData, filters]);

  // Handle filter change
  const handleFilterChange = useCallback((fieldPath: string, value: unknown) => {
    setFilters((prev) => ({
      ...prev,
      [fieldPath]: value,
    }));
    setPage(0); // Reset to first page on filter change
  }, []);

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setFilters({});
    setPage(0);
  }, []);

  // Check if any filters are active
  const hasActiveFilters = Object.values(filters).some(
    (v) => v !== undefined && v !== null && v !== '' && (!Array.isArray(v) || v.length > 0)
  );

  // Render a filter control based on field type
  const renderFilterControl = (field: FieldConfig) => {
    const value = filters[field.path];
    const options = field.validation?.options || [];

    // Select/dropdown fields
    if (['select', 'dropdown', 'radio', 'multiple_choice'].includes(field.type) && options.length > 0) {
      return (
        <FormControl size="small" fullWidth>
          <InputLabel>{field.label}</InputLabel>
          <Select
            value={value || ''}
            onChange={(e) => handleFilterChange(field.path, e.target.value)}
            label={field.label}
            sx={{
              bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'white',
            }}
          >
            <MenuItem value="">
              <em>All</em>
            </MenuItem>
            {options.map((opt) => {
              const optValue = typeof opt === 'string' ? opt : opt.value;
              const optLabel = typeof opt === 'string' ? opt : opt.label;
              return (
                <MenuItem key={String(optValue)} value={optValue}>
                  {optLabel}
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>
      );
    }

    // Multi-select fields
    if (field.type === 'multiSelect' && options.length > 0) {
      const selectedValues = Array.isArray(value) ? value : [];
      return (
        <FormControl size="small" fullWidth>
          <InputLabel>{field.label}</InputLabel>
          <Select
            multiple
            value={selectedValues}
            onChange={(e) => handleFilterChange(field.path, e.target.value)}
            input={<OutlinedInput label={field.label} />}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {(selected as string[]).slice(0, 2).map((val) => (
                  <Chip key={val} label={val} size="small" />
                ))}
                {(selected as string[]).length > 2 && (
                  <Chip label={`+${(selected as string[]).length - 2}`} size="small" />
                )}
              </Box>
            )}
            sx={{
              bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'white',
            }}
          >
            {options.map((opt) => {
              const optValue = typeof opt === 'string' ? opt : opt.value;
              const optLabel = typeof opt === 'string' ? opt : opt.label;
              return (
                <MenuItem key={String(optValue)} value={optValue}>
                  <Checkbox checked={selectedValues.includes(optValue)} size="small" />
                  <ListItemText primary={optLabel} />
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>
      );
    }

    // Boolean/yesNo fields
    if (field.type === 'boolean' || field.type === 'yesNo' || field.type === 'checkbox') {
      return (
        <FormControl size="small" fullWidth>
          <InputLabel>{field.label}</InputLabel>
          <Select
            value={value === undefined ? '' : String(value)}
            onChange={(e) => {
              const val = e.target.value;
              handleFilterChange(field.path, val === '' ? undefined : val === 'true');
            }}
            label={field.label}
            sx={{
              bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'white',
            }}
          >
            <MenuItem value="">
              <em>All</em>
            </MenuItem>
            <MenuItem value="true">Yes</MenuItem>
            <MenuItem value="false">No</MenuItem>
          </Select>
        </FormControl>
      );
    }

    // Default: text search
    return (
      <TextField
        size="small"
        fullWidth
        label={field.label}
        placeholder={`Search ${field.label.toLowerCase()}...`}
        value={value || ''}
        onChange={(e) => handleFilterChange(field.path, e.target.value)}
        InputProps={{
          startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 0.5, fontSize: 18 }} />,
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'white',
          },
        }}
      />
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 500 }}>
      {/* Header */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
          Search Demo
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Try searching through {sampleData.length} sample records using the filters below.
        </Typography>
      </Box>

      {/* Filters Section */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 2,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Filters
            </Typography>
            {hasActiveFilters && (
              <Chip
                label={`${filteredRecords.length} results`}
                size="small"
                color="primary"
                sx={{ height: 20, fontSize: '0.7rem' }}
              />
            )}
          </Box>
          {hasActiveFilters && (
            <Button
              size="small"
              startIcon={<ClearIcon />}
              onClick={handleClearFilters}
              sx={{ fontSize: '0.75rem' }}
            >
              Clear All
            </Button>
          )}
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 2,
          }}
        >
          {searchableFields.map((field) => (
            <Box key={field.path}>{renderFilterControl(field)}</Box>
          ))}
        </Box>
      </Paper>

      {/* Results Table */}
      <Paper
        elevation={0}
        sx={{
          flex: 1,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <TableContainer sx={{ flex: 1 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                {displayColumns.map((field) => (
                  <TableCell
                    key={field.path}
                    sx={{
                      fontWeight: 600,
                      bgcolor: isDark ? 'rgba(0,30,43,0.95)' : 'grey.100',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {getColumnLabel(field)}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={displayColumns.length} sx={{ textAlign: 'center', py: 4 }}>
                    <Typography color="text.secondary">
                      No records match your search criteria
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecords
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((record, index) => (
                    <TableRow
                      key={String(record._id) || index}
                      hover
                      sx={{
                        '&:last-child td': { borderBottom: 0 },
                      }}
                    >
                      {displayColumns.map((field) => (
                        <TableCell key={field.path} sx={{ maxWidth: 200 }}>
                          {formatValue(record[field.path])}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={filteredRecords.length}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25]}
          sx={{
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        />
      </Paper>

      {/* Footer note */}
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ mt: 2, textAlign: 'center', fontStyle: 'italic' }}
      >
        Sample data is generated for demonstration purposes. Real forms store data in MongoDB.
      </Typography>
    </Box>
  );
}

export default SearchDemoTab;
