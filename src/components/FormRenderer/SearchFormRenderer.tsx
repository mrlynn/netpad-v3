'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Box,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Typography,
  Paper,
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Card,
  CardContent,
  Grid,
  Collapse,
  ToggleButtonGroup,
  ToggleButton,
  Autocomplete,
  ListItemText,
  Badge,
} from '@mui/material';
import {
  Search,
  Clear,
  Visibility,
  Edit,
  Delete,
  KeyboardArrowDown,
  KeyboardArrowUp,
  ArrowUpward,
  ArrowDownward,
  ContentCopy,
  Lock,
  Refresh,
} from '@mui/icons-material';
import { FormConfiguration, FieldConfig, SearchConfig, SearchOperator, SearchOptionsSource } from '@/types/form';
import { getResolvedTheme } from '@/lib/formThemes';

// Type for distinct value options
interface DistinctOption {
  value: any;
  label: string;
  count: number;
}

interface SearchResult {
  _id: string;
  [key: string]: any;
}

interface SearchFormRendererProps {
  form: FormConfiguration;
  searchConfig: SearchConfig;
  onViewDocument?: (doc: SearchResult) => void;
  onEditDocument?: (doc: SearchResult) => void;
  onDeleteDocument?: (doc: SearchResult) => void;
}

// Operator labels for UI
const operatorLabels: Record<SearchOperator, string> = {
  equals: 'equals',
  notEquals: 'not equals',
  contains: 'contains',
  startsWith: 'starts with',
  endsWith: 'ends with',
  greaterThan: '>',
  lessThan: '<',
  greaterOrEqual: '>=',
  lessOrEqual: '<=',
  between: 'between',
  in: 'in',
  notIn: 'not in',
  exists: 'exists',
  regex: 'regex',
};

export function SearchFormRenderer({
  form,
  searchConfig,
  onViewDocument,
  onEditDocument,
  onDeleteDocument,
}: SearchFormRendererProps) {
  const [searchValues, setSearchValues] = useState<Record<string, any>>({});
  const [operators, setOperators] = useState<Record<string, SearchOperator>>({});
  const [results, setResults] = useState<SearchResult[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(searchConfig.results?.pageSize || 10);
  const [sortField, setSortField] = useState<string | undefined>(searchConfig.results?.defaultSortField);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(searchConfig.results?.defaultSortDirection || 'desc');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Dynamic options state for smart dropdowns
  const [dynamicOptions, setDynamicOptions] = useState<Record<string, DistinctOption[]>>({});
  const [optionsLoading, setOptionsLoading] = useState<Record<string, boolean>>({});

  // Get resolved theme
  const theme = useMemo(() => getResolvedTheme(form.theme), [form.theme]);

  // Get searchable fields from field configs
  // Excludes encrypted fields with queryType 'none' since they cannot be searched
  const searchableFields = useMemo(() => {
    // Debug: log searchConfig to see what's being passed
    console.log('[SearchFormRenderer] searchConfig.fields:', searchConfig.fields);

    return form.fieldConfigs.filter((field) => {
      const fieldSearchConfig = searchConfig.fields?.[field.path];

      // Debug: log each field's search config
      console.log(`[SearchFormRenderer] Field "${field.path}":`, {
        included: field.included,
        searchConfigExists: !!fieldSearchConfig,
        enabled: fieldSearchConfig?.enabled,
      });

      // Check if field is included and search is enabled
      if (!field.included || !fieldSearchConfig?.enabled) {
        return false;
      }
      // Exclude encrypted fields that don't support queries
      if (field.encryption?.enabled && field.encryption?.queryType === 'none') {
        return false;
      }
      return true;
    });
  }, [form.fieldConfigs, searchConfig.fields]);

  // Get result display fields
  const resultFields = useMemo(() => {
    return form.fieldConfigs
      .filter((field) => {
        const fieldSearchConfig = searchConfig.fields?.[field.path];
        return field.included && fieldSearchConfig?.showInResults;
      })
      .sort((a, b) => {
        const orderA = searchConfig.fields?.[a.path]?.resultOrder ?? 999;
        const orderB = searchConfig.fields?.[b.path]?.resultOrder ?? 999;
        return orderA - orderB;
      })
      .slice(0, 6); // Limit to 6 columns
  }, [form.fieldConfigs, searchConfig.fields]);

  // Initialize operators with defaults
  useMemo(() => {
    const defaultOperators: Record<string, SearchOperator> = {};
    searchableFields.forEach((field) => {
      const fieldConfig = searchConfig.fields?.[field.path];
      if (fieldConfig?.defaultOperator) {
        defaultOperators[field.path] = fieldConfig.defaultOperator;
      } else if (field.encryption?.enabled) {
        // Encrypted fields only support equality queries
        defaultOperators[field.path] = 'equals';
      } else {
        // Default based on field type
        defaultOperators[field.path] = field.type === 'string' ? 'contains' : 'equals';
      }
    });
    setOperators(defaultOperators);
  }, [searchableFields, searchConfig.fields]);

  // Fetch distinct values for a single field
  const fetchDistinctValues = useCallback(async (fieldPath: string, optionsSource: SearchOptionsSource) => {
    if (!form.id || optionsSource.type !== 'distinct') return;

    setOptionsLoading(prev => ({ ...prev, [fieldPath]: true }));

    try {
      const distinctConfig = optionsSource.distinct || {};

      const response = await fetch('/api/mongodb/distinct-values', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId: form.id,
          field: distinctConfig.field || fieldPath,
          includeCounts: distinctConfig.showCounts !== false,
          sortBy: distinctConfig.sortBy || 'count',
          sortDirection: distinctConfig.sortDirection || 'desc',
          limit: distinctConfig.limit || 100,
          labelMap: distinctConfig.labelMap,
          filter: distinctConfig.filter,
        }),
      });

      const data = await response.json();

      if (data.success && data.values) {
        // Apply label mapping
        const labelMap = distinctConfig.labelMap || {};
        const options: DistinctOption[] = data.values.map((v: DistinctOption) => ({
          ...v,
          label: labelMap[v.value] || v.label || String(v.value),
        }));

        setDynamicOptions(prev => ({ ...prev, [fieldPath]: options }));
      }
    } catch (err) {
      console.error(`Failed to fetch distinct values for ${fieldPath}:`, err);
    } finally {
      setOptionsLoading(prev => ({ ...prev, [fieldPath]: false }));
    }
  }, [form.id]);

  // Fetch all dynamic options on mount
  useEffect(() => {
    const fieldsWithOptions = Object.entries(searchConfig.fields || {}).filter(
      ([_, config]) => config.optionsSource?.type === 'distinct' && config.optionsSource?.refreshOnMount !== false
    );

    fieldsWithOptions.forEach(([fieldPath, config]) => {
      if (config.optionsSource) {
        fetchDistinctValues(fieldPath, config.optionsSource);
      }
    });
  }, [searchConfig.fields, fetchDistinctValues]);

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      // Build query from search values
      const query: Record<string, any> = {};

      for (const [path, value] of Object.entries(searchValues)) {
        // Skip _max suffix values (they're handled with their parent field)
        if (path.endsWith('_max')) continue;
        if (value === '' || value === null || value === undefined) continue;

        const field = searchableFields.find(f => f.path === path);
        // Use 'equals' as fallback for encrypted fields, 'contains' for others
        const defaultOperator = field?.encryption?.enabled ? 'equals' : 'contains';
        const operator = operators[path] || defaultOperator;

        // Handle range/between operator - include value2
        if (operator === 'between') {
          const maxValue = searchValues[`${path}_max`];
          query[path] = {
            value,
            value2: maxValue,
            operator,
            type: field?.type || 'string',
          };
        } else {
          query[path] = {
            value,
            operator,
            type: field?.type || 'string',
          };
        }
      }

      // Add default query if configured
      if (searchConfig.defaultQuery) {
        Object.assign(query, searchConfig.defaultQuery);
      }

      const sort = sortField ? { [sortField]: sortDirection === 'asc' ? 1 : -1 } : undefined;

      const response = await fetch('/api/forms/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId: form.id,
          query,
          sort,
          limit: rowsPerPage,
          skip: page * rowsPerPage,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResults(data.documents || []);
        setTotalCount(data.totalCount || 0);
      } else {
        setError(data.error || 'Search failed');
        setResults([]);
        setTotalCount(0);
      }
    } catch (err: any) {
      setError(err.message || 'Search failed');
      setResults([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  const handleClearSearch = () => {
    setSearchValues({});
    setResults([]);
    setTotalCount(0);
    setHasSearched(false);
    setPage(0);
  };

  const handleSortChange = (field: string) => {
    if (!searchConfig.results?.allowSorting) return;

    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handlePageChange = (_: unknown, newPage: number) => {
    setPage(newPage);
    // Re-run search with new page
    setTimeout(() => handleSearch(), 0);
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
    setTimeout(() => handleSearch(), 0);
  };

  const toggleRowExpand = (id: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const formatCellValue = (value: any, type: string): React.ReactNode => {
    if (value === null || value === undefined) {
      return <Typography variant="body2" color="text.disabled">—</Typography>;
    }

    if (type === 'boolean') {
      return (
        <Chip
          label={value ? 'Yes' : 'No'}
          size="small"
          sx={{
            bgcolor: value ? alpha('#00ED64', 0.1) : alpha('#666', 0.1),
            color: value ? '#00ED64' : 'text.secondary',
            fontSize: 11,
          }}
        />
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
          {arr.slice(0, 2).map((item, i) => (
            <Chip key={i} label={String(item)} size="small" sx={{ fontSize: 10 }} />
          ))}
          {arr.length > 2 && (
            <Chip label={`+${arr.length - 2}`} size="small" variant="outlined" sx={{ fontSize: 10 }} />
          )}
        </Box>
      );
    }

    if (typeof value === 'object') {
      return (
        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 11 }}>
          {JSON.stringify(value).slice(0, 30)}...
        </Typography>
      );
    }

    const str = String(value);
    return str.length > 40 ? str.slice(0, 40) + '...' : str;
  };

  const getNestedValue = (obj: any, path: string): any => {
    return path.split('.').reduce((current, key) => {
      if (current === null || current === undefined) return undefined;
      return current[key];
    }, obj);
  };

  // Render a single search field based on its type
  const renderSearchField = (field: FieldConfig) => {
    const fieldSearchConfig = searchConfig.fields?.[field.path];
    const isEncrypted = field.encryption?.enabled;
    const encryptionQueryType = field.encryption?.queryType;

    // For encrypted fields, limit operators based on encryption query type
    // - 'equality' only allows: equals, notEquals, in, notIn
    // - 'range' allows: equals, notEquals, greaterThan, lessThan, etc.
    let allowedOperators = fieldSearchConfig?.operators || ['contains', 'equals'];
    if (isEncrypted) {
      if (encryptionQueryType === 'equality') {
        allowedOperators = allowedOperators.filter(op =>
          ['equals', 'notEquals', 'in', 'notIn'].includes(op)
        );
      } else if (encryptionQueryType === 'range') {
        allowedOperators = allowedOperators.filter(op =>
          ['equals', 'notEquals', 'greaterThan', 'lessThan', 'greaterOrEqual', 'lessOrEqual', 'between', 'in', 'notIn'].includes(op)
        );
      }
      // Remove text-search operators for encrypted fields
      allowedOperators = allowedOperators.filter(op =>
        !['contains', 'startsWith', 'endsWith', 'regex'].includes(op)
      );
      // Ensure at least 'equals' is available
      if (allowedOperators.length === 0) {
        allowedOperators = ['equals'];
      }
    }

    const showOperatorSelect = allowedOperators.length > 1 && field.type !== 'boolean';
    const value = searchValues[field.path];

    // Operator selector (for non-boolean fields with multiple operators)
    const operatorSelector = showOperatorSelect && (
      <FormControl size="small" sx={{ minWidth: 110 }}>
        <InputLabel sx={{ fontSize: 13 }}>Operator</InputLabel>
        <Select
          value={operators[field.path] || 'contains'}
          label="Operator"
          onChange={(e) => setOperators(prev => ({ ...prev, [field.path]: e.target.value as SearchOperator }))}
          sx={{ fontSize: 13 }}
        >
          {allowedOperators.map((op) => (
            <MenuItem key={op} value={op} sx={{ fontSize: 13 }}>{operatorLabels[op]}</MenuItem>
          ))}
        </Select>
      </FormControl>
    );

    // Helper to render field label with encryption indicator
    const renderFieldLabel = (label: string) => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.secondary', fontSize: 13 }}>
          {label}
        </Typography>
        {isEncrypted && (
          <Tooltip title="This field is encrypted - only exact matches are supported">
            <Lock sx={{ fontSize: 12, color: 'success.main' }} />
          </Tooltip>
        )}
      </Box>
    );

    // Check if this field has dynamic options (smart dropdown)
    const options = dynamicOptions[field.path];
    const isLoadingOptions = optionsLoading[field.path];
    const hasOptionsSource = fieldSearchConfig?.optionsSource?.type === 'distinct';
    const showCounts = fieldSearchConfig?.optionsSource?.distinct?.showCounts !== false;

    // Render smart dropdown if we have dynamic options
    if (hasOptionsSource && (options || isLoadingOptions)) {
      return (
        <Box key={field.path} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
          {operatorSelector}
          <FormControl fullWidth size="small">
            <Autocomplete
              size="small"
              options={options || []}
              loading={isLoadingOptions}
              value={options?.find(opt => opt.value === value) || null}
              onChange={(_, newValue) => {
                if (newValue) {
                  setSearchValues(prev => ({ ...prev, [field.path]: newValue.value }));
                } else {
                  setSearchValues(prev => {
                    const newValues = { ...prev };
                    delete newValues[field.path];
                    return newValues;
                  });
                }
              }}
              getOptionLabel={(option) => {
                if (showCounts && option.count > 0) {
                  return `${option.label} (${option.count})`;
                }
                return option.label;
              }}
              renderOption={(props, option) => (
                <li {...props} key={option.value}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <Typography variant="body2">{option.label}</Typography>
                    {showCounts && option.count > 0 && (
                      <Chip
                        label={option.count}
                        size="small"
                        sx={{
                          ml: 1,
                          height: 20,
                          fontSize: 11,
                          bgcolor: alpha(theme.primaryColor || '#00ED64', 0.1),
                          color: theme.primaryColor || '#00ED64',
                        }}
                      />
                    )}
                  </Box>
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={field.label}
                  placeholder={fieldSearchConfig?.placeholder || `Select ${field.label.toLowerCase()}...`}
                  helperText={fieldSearchConfig?.helpText}
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {isLoadingOptions ? <CircularProgress color="inherit" size={16} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              isOptionEqualToValue={(option, val) => option.value === val.value}
              clearOnEscape
              blurOnSelect
            />
          </FormControl>
          {/* Refresh button */}
          {fieldSearchConfig?.optionsSource && (
            <Tooltip title="Refresh options">
              <IconButton
                size="small"
                onClick={() => fetchDistinctValues(field.path, fieldSearchConfig.optionsSource!)}
                disabled={isLoadingOptions}
                sx={{ mt: 0.5 }}
              >
                <Refresh sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      );
    }

    // Boolean field - use toggle buttons or select
    if (field.type === 'boolean') {
      return (
        <Box key={field.path} sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {renderFieldLabel(field.label)}
          <ToggleButtonGroup
            value={value === undefined ? null : value}
            exclusive
            onChange={(_, newValue) => {
              if (newValue === null) {
                // Clear the filter
                setSearchValues(prev => {
                  const newValues = { ...prev };
                  delete newValues[field.path];
                  return newValues;
                });
              } else {
                setSearchValues(prev => ({ ...prev, [field.path]: newValue }));
              }
            }}
            size="small"
            sx={{
              '& .MuiToggleButton-root': {
                px: 2,
                py: 0.5,
                textTransform: 'none',
                fontSize: 13,
                '&.Mui-selected': {
                  bgcolor: alpha(theme.primaryColor || '#00ED64', 0.1),
                  color: theme.primaryColor || '#00ED64',
                  '&:hover': {
                    bgcolor: alpha(theme.primaryColor || '#00ED64', 0.15),
                  },
                },
              },
            }}
          >
            <ToggleButton value={true}>Yes</ToggleButton>
            <ToggleButton value={false}>No</ToggleButton>
          </ToggleButtonGroup>
          {fieldSearchConfig?.helpText && (
            <Typography variant="caption" color="text.disabled">
              {fieldSearchConfig.helpText}
            </Typography>
          )}
        </Box>
      );
    }

    // Number field with range support
    if (field.type === 'number') {
      const currentOperator = operators[field.path] || 'equals';
      const isBetween = currentOperator === 'between';

      return (
        <Box key={field.path} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
          {operatorSelector}
          <Box sx={{ flex: 1, display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              size="small"
              type="number"
              label={isBetween ? `${field.label} (min)` : field.label}
              placeholder={fieldSearchConfig?.placeholder || `Enter ${field.label.toLowerCase()}...`}
              value={value ?? ''}
              onChange={(e) => setSearchValues(prev => ({ ...prev, [field.path]: e.target.value === '' ? undefined : Number(e.target.value) }))}
              helperText={!isBetween ? fieldSearchConfig?.helpText : undefined}
            />
            {isBetween && (
              <TextField
                fullWidth
                size="small"
                type="number"
                label={`${field.label} (max)`}
                placeholder="Max value..."
                value={searchValues[`${field.path}_max`] ?? ''}
                onChange={(e) => setSearchValues(prev => ({ ...prev, [`${field.path}_max`]: e.target.value === '' ? undefined : Number(e.target.value) }))}
                helperText={fieldSearchConfig?.helpText}
              />
            )}
          </Box>
        </Box>
      );
    }

    // Date field
    if (field.type === 'date') {
      const currentOperator = operators[field.path] || 'equals';
      const isBetween = currentOperator === 'between';

      return (
        <Box key={field.path} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
          {operatorSelector}
          <Box sx={{ flex: 1, display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label={isBetween ? `${field.label} (from)` : field.label}
              value={value || ''}
              onChange={(e) => setSearchValues(prev => ({ ...prev, [field.path]: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              helperText={!isBetween ? fieldSearchConfig?.helpText : undefined}
            />
            {isBetween && (
              <TextField
                fullWidth
                size="small"
                type="date"
                label={`${field.label} (to)`}
                value={searchValues[`${field.path}_max`] || ''}
                onChange={(e) => setSearchValues(prev => ({ ...prev, [`${field.path}_max`]: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                helperText={fieldSearchConfig?.helpText}
              />
            )}
          </Box>
        </Box>
      );
    }

    // Email field
    if (field.type === 'email') {
      return (
        <Box key={field.path} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
          {operatorSelector}
          <TextField
            fullWidth
            size="small"
            type="email"
            label={field.label}
            placeholder={fieldSearchConfig?.placeholder || `Search by email...`}
            value={value || ''}
            onChange={(e) => setSearchValues(prev => ({ ...prev, [field.path]: e.target.value }))}
            helperText={fieldSearchConfig?.helpText}
          />
        </Box>
      );
    }

    // Array field - use chips/tags input or comma-separated
    if (field.type === 'array' || field.type === 'array-object') {
      return (
        <Box key={field.path} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
          {operatorSelector}
          <TextField
            fullWidth
            size="small"
            label={field.label}
            placeholder={fieldSearchConfig?.placeholder || `Enter values separated by commas...`}
            value={value || ''}
            onChange={(e) => setSearchValues(prev => ({ ...prev, [field.path]: e.target.value }))}
            helperText={fieldSearchConfig?.helpText || 'Separate multiple values with commas'}
          />
        </Box>
      );
    }

    // Default: String/text field
    return (
      <Box key={field.path} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
        {operatorSelector}
        <TextField
          fullWidth
          size="small"
          label={field.label}
          placeholder={fieldSearchConfig?.placeholder || `Search ${field.label.toLowerCase()}...`}
          value={value || ''}
          onChange={(e) => setSearchValues(prev => ({ ...prev, [field.path]: e.target.value }))}
          helperText={fieldSearchConfig?.helpText}
        />
      </Box>
    );
  };

  const renderSearchFields = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {searchableFields.map((field) => renderSearchField(field))}
    </Box>
  );

  const renderTableResults = () => (
    <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: 40 }} />
            {resultFields.map((field) => (
              <TableCell
                key={field.path}
                sx={{
                  fontWeight: 600,
                  cursor: searchConfig.results?.allowSorting ? 'pointer' : 'default',
                  '&:hover': searchConfig.results?.allowSorting ? { bgcolor: alpha(theme.primaryColor || '#00ED64', 0.05) } : {},
                }}
                onClick={() => handleSortChange(field.path)}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {field.label}
                  {sortField === field.path && (
                    sortDirection === 'asc' ? <ArrowUpward sx={{ fontSize: 14 }} /> : <ArrowDownward sx={{ fontSize: 14 }} />
                  )}
                </Box>
              </TableCell>
            ))}
            <TableCell align="right" sx={{ width: 120 }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {results.map((doc) => (
            <>
              <TableRow key={doc._id} hover sx={{ cursor: 'pointer' }}>
                <TableCell>
                  <IconButton size="small" onClick={() => toggleRowExpand(doc._id)}>
                    {expandedRows.has(doc._id) ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                  </IconButton>
                </TableCell>
                {resultFields.map((field) => (
                  <TableCell key={field.path}>
                    {formatCellValue(getNestedValue(doc, field.path), field.type)}
                  </TableCell>
                ))}
                <TableCell align="right">
                  <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                    {searchConfig.results?.allowView && onViewDocument && (
                      <Tooltip title="View">
                        <IconButton size="small" onClick={() => onViewDocument(doc)}>
                          <Visibility sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    )}
                    {searchConfig.results?.allowEdit && onEditDocument && (
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => onEditDocument(doc)} sx={{ color: '#2196f3' }}>
                          <Edit sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    )}
                    {searchConfig.results?.allowDelete && onDeleteDocument && (
                      <Tooltip title="Delete">
                        <IconButton size="small" onClick={() => onDeleteDocument(doc)} sx={{ color: 'error.main' }}>
                          <Delete sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell colSpan={resultFields.length + 2} sx={{ py: 0 }}>
                  <Collapse in={expandedRows.has(doc._id)} timeout="auto" unmountOnExit>
                    <Box sx={{ p: 2, bgcolor: alpha(theme.primaryColor || '#00ED64', 0.02) }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, mb: 1, display: 'block' }}>
                        Full Document
                      </Typography>
                      <Box
                        component="pre"
                        sx={{
                          p: 1,
                          bgcolor: 'background.paper',
                          borderRadius: 1,
                          fontSize: 11,
                          fontFamily: 'monospace',
                          overflow: 'auto',
                          maxHeight: 200,
                          m: 0,
                        }}
                      >
                        {JSON.stringify(doc, null, 2)}
                      </Box>
                      <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                          size="small"
                          startIcon={<ContentCopy sx={{ fontSize: 14 }} />}
                          onClick={() => navigator.clipboard.writeText(JSON.stringify(doc, null, 2))}
                        >
                          Copy JSON
                        </Button>
                      </Box>
                    </Box>
                  </Collapse>
                </TableCell>
              </TableRow>
            </>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderCardResults = () => (
    <Grid container spacing={2}>
      {results.map((doc) => (
        <Grid item xs={12} sm={6} md={4} key={doc._id}>
          <Card variant="outlined">
            <CardContent>
              {resultFields.slice(0, 4).map((field, index) => (
                <Box key={field.path} sx={{ mb: index < 3 ? 1 : 0 }}>
                  <Typography variant="caption" color="text.secondary">
                    {field.label}
                  </Typography>
                  <Box>{formatCellValue(getNestedValue(doc, field.path), field.type)}</Box>
                </Box>
              ))}
              <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                {searchConfig.results?.allowView && onViewDocument && (
                  <Button size="small" onClick={() => onViewDocument(doc)}>View</Button>
                )}
                {searchConfig.results?.allowEdit && onEditDocument && (
                  <Button size="small" color="primary" onClick={() => onEditDocument(doc)}>Edit</Button>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  return (
    <Box>
      {/* Search Form */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: alpha(theme.primaryColor || '#00ED64', 0.02) }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Search {form.name}
        </Typography>

        {renderSearchFields()}

        <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <Search />}
            onClick={handleSearch}
            disabled={loading}
            sx={{
              bgcolor: theme.primaryColor || '#00ED64',
              color: '#001E2B',
              '&:hover': { bgcolor: alpha(theme.primaryColor || '#00ED64', 0.8) },
            }}
          >
            Search
          </Button>
          <Button
            variant="outlined"
            startIcon={<Clear />}
            onClick={handleClearSearch}
            disabled={loading}
          >
            Clear
          </Button>
        </Box>
      </Paper>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Results */}
      {hasSearched && !loading && (
        <Box>
          {/* Results Header */}
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Results
              <Chip
                label={`${totalCount} found`}
                size="small"
                sx={{
                  ml: 1,
                  bgcolor: alpha(theme.primaryColor || '#00ED64', 0.1),
                  color: theme.primaryColor || '#00ED64',
                }}
              />
            </Typography>
          </Box>

          {/* No Results */}
          {results.length === 0 && (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                No documents found matching your search criteria.
              </Typography>
              <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
                Try adjusting your search terms or operators.
              </Typography>
            </Paper>
          )}

          {/* Results Display */}
          {results.length > 0 && (
            <>
              {searchConfig.results?.layout === 'cards' ? renderCardResults() : renderTableResults()}

              {/* Pagination */}
              {searchConfig.results?.showPagination && (
                <TablePagination
                  component="div"
                  count={totalCount}
                  page={page}
                  onPageChange={handlePageChange}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={handleRowsPerPageChange}
                  rowsPerPageOptions={searchConfig.results?.pageSizeOptions || [10, 25, 50]}
                />
              )}
            </>
          )}
        </Box>
      )}
    </Box>
  );
}
