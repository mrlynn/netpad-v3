/**
 * MongoDB Query Options Builder
 * Visual builder for sort, limit, skip, and projection options
 */

'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  IconButton,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  ToggleButton,
  ToggleButtonGroup,
  useTheme,
  alpha,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandIcon,
  Sort as SortIcon,
  Filter as FilterIcon,
  Speed as LimitIcon,
} from '@mui/icons-material';
import {
  MongoQueryOptions,
  SortField,
  ProjectionField,
  createDefaultOptions,
  createEmptySortField,
  createEmptyProjectionField,
  optionsToMongo,
  parseMongoOptions,
} from './types';

interface QueryOptionsBuilderProps {
  value: MongoQueryOptions | Record<string, unknown> | string | undefined;
  onChange: (value: Record<string, unknown>) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
}

export function QueryOptionsBuilder({
  value,
  onChange,
  disabled = false,
  label = 'Query Options',
  description,
}: QueryOptionsBuilderProps) {
  const theme = useTheme();

  // Normalize incoming value
  const normalizedOptions = useMemo((): MongoQueryOptions => {
    if (!value) return createDefaultOptions();

    if (typeof value === 'string') {
      try {
        return parseMongoOptions(JSON.parse(value));
      } catch {
        return createDefaultOptions();
      }
    }

    // Check if it's already our format
    if ('sort' in value && Array.isArray(value.sort)) {
      return value as MongoQueryOptions;
    }

    // Parse MongoDB format
    return parseMongoOptions(value as Record<string, unknown>);
  }, [value]);

  const [options, setOptions] = useState<MongoQueryOptions>(normalizedOptions);
  const isInternalChange = React.useRef(false);

  useEffect(() => {
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    setOptions(normalizedOptions);
  }, [normalizedOptions]);

  const updateOptions = useCallback((newOptions: MongoQueryOptions) => {
    setOptions(newOptions);
    isInternalChange.current = true;
    onChange(optionsToMongo(newOptions));
  }, [onChange]);

  // Sort handlers
  const addSortField = useCallback(() => {
    updateOptions({
      ...options,
      sort: [...(options.sort || []), createEmptySortField()],
    });
  }, [options, updateOptions]);

  const updateSortField = useCallback((id: string, updates: Partial<SortField>) => {
    updateOptions({
      ...options,
      sort: (options.sort || []).map(s => s.id === id ? { ...s, ...updates } : s),
    });
  }, [options, updateOptions]);

  const removeSortField = useCallback((id: string) => {
    updateOptions({
      ...options,
      sort: (options.sort || []).filter(s => s.id !== id),
    });
  }, [options, updateOptions]);

  // Projection handlers
  const addProjectionField = useCallback(() => {
    const currentProjection = options.projection || { mode: 'include' as const, fields: [] };
    updateOptions({
      ...options,
      projection: {
        ...currentProjection,
        fields: [...currentProjection.fields, createEmptyProjectionField()],
      },
    });
  }, [options, updateOptions]);

  const updateProjectionMode = useCallback((mode: 'include' | 'exclude') => {
    const currentProjection = options.projection || { mode: 'include' as const, fields: [] };
    updateOptions({
      ...options,
      projection: { ...currentProjection, mode },
    });
  }, [options, updateOptions]);

  const updateProjectionField = useCallback((id: string, field: string) => {
    const currentProjection = options.projection || { mode: 'include' as const, fields: [] };
    updateOptions({
      ...options,
      projection: {
        ...currentProjection,
        fields: currentProjection.fields.map(f => f.id === id ? { ...f, field } : f),
      },
    });
  }, [options, updateOptions]);

  const removeProjectionField = useCallback((id: string) => {
    const currentProjection = options.projection || { mode: 'include' as const, fields: [] };
    updateOptions({
      ...options,
      projection: {
        ...currentProjection,
        fields: currentProjection.fields.filter(f => f.id !== id),
      },
    });
  }, [options, updateOptions]);

  const sortFields = options.sort || [];
  const projectionFields = options.projection?.fields || [];
  const hasOptions = sortFields.length > 0 ||
                     projectionFields.length > 0 ||
                     (options.limit !== undefined && options.limit > 0) ||
                     (options.skip !== undefined && options.skip > 0);

  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ mb: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {label}
        </Typography>
        {description && (
          <Typography variant="caption" color="text.secondary">
            {description}
          </Typography>
        )}
      </Box>

      {/* Sort Section */}
      <Accordion
        defaultExpanded={sortFields.length > 0}
        disableGutters
        sx={{
          bgcolor: 'transparent',
          '&:before': { display: 'none' },
          boxShadow: 'none',
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandIcon />}
          sx={{
            minHeight: 36,
            px: 1,
            '& .MuiAccordionSummary-content': { my: 0.5, alignItems: 'center', gap: 1 }
          }}
        >
          <SortIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
          <Typography variant="body2">Sort</Typography>
          {sortFields.length > 0 && (
            <Chip label={sortFields.length} size="small" sx={{ height: 18, fontSize: '0.65rem' }} />
          )}
        </AccordionSummary>
        <AccordionDetails sx={{ p: 1, pt: 0 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {sortFields.map((sort) => (
              <Box key={sort.id} sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                <TextField
                  size="small"
                  placeholder="field"
                  value={sort.field}
                  onChange={(e) => updateSortField(sort.id, { field: e.target.value })}
                  disabled={disabled}
                  sx={{
                    flex: 1,
                    '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '0.8rem', py: 0.5 }
                  }}
                />
                <FormControl size="small" sx={{ minWidth: 80 }}>
                  <Select
                    value={sort.direction}
                    onChange={(e) => updateSortField(sort.id, { direction: e.target.value as 1 | -1 })}
                    disabled={disabled}
                    sx={{ '& .MuiSelect-select': { py: 0.5, fontSize: '0.8rem' } }}
                  >
                    <MenuItem value={1}>Asc</MenuItem>
                    <MenuItem value={-1}>Desc</MenuItem>
                  </Select>
                </FormControl>
                <IconButton size="small" onClick={() => removeSortField(sort.id)} disabled={disabled} sx={{ p: 0.25 }}>
                  <DeleteIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
            ))}
            <Button
              size="small"
              startIcon={<AddIcon sx={{ fontSize: 16 }} />}
              onClick={addSortField}
              disabled={disabled}
              sx={{ alignSelf: 'flex-start', textTransform: 'none', fontSize: '0.75rem' }}
            >
              Add sort field
            </Button>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Limit & Skip Section */}
      <Accordion
        defaultExpanded={(options.limit !== undefined && options.limit > 0) || (options.skip !== undefined && options.skip > 0)}
        disableGutters
        sx={{
          bgcolor: 'transparent',
          '&:before': { display: 'none' },
          boxShadow: 'none',
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandIcon />}
          sx={{
            minHeight: 36,
            px: 1,
            '& .MuiAccordionSummary-content': { my: 0.5, alignItems: 'center', gap: 1 }
          }}
        >
          <LimitIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
          <Typography variant="body2">Limit & Skip</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 1, pt: 0 }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              size="small"
              label="Limit"
              type="number"
              value={options.limit ?? ''}
              onChange={(e) => updateOptions({ ...options, limit: e.target.value ? Number(e.target.value) : undefined })}
              disabled={disabled}
              placeholder="∞"
              sx={{ flex: 1, '& .MuiInputBase-input': { fontSize: '0.8rem', py: 0.5 } }}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              size="small"
              label="Skip"
              type="number"
              value={options.skip ?? ''}
              onChange={(e) => updateOptions({ ...options, skip: e.target.value ? Number(e.target.value) : undefined })}
              disabled={disabled}
              placeholder="0"
              sx={{ flex: 1, '& .MuiInputBase-input': { fontSize: '0.8rem', py: 0.5 } }}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Projection Section */}
      <Accordion
        defaultExpanded={projectionFields.length > 0}
        disableGutters
        sx={{
          bgcolor: 'transparent',
          '&:before': { display: 'none' },
          boxShadow: 'none',
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandIcon />}
          sx={{
            minHeight: 36,
            px: 1,
            '& .MuiAccordionSummary-content': { my: 0.5, alignItems: 'center', gap: 1 }
          }}
        >
          <FilterIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
          <Typography variant="body2">Projection</Typography>
          {projectionFields.length > 0 && (
            <Chip label={projectionFields.length} size="small" sx={{ height: 18, fontSize: '0.65rem' }} />
          )}
        </AccordionSummary>
        <AccordionDetails sx={{ p: 1, pt: 0 }}>
          <Box sx={{ mb: 1 }}>
            <ToggleButtonGroup
              value={options.projection?.mode || 'include'}
              exclusive
              onChange={(_, mode) => mode && updateProjectionMode(mode)}
              size="small"
              disabled={disabled}
            >
              <ToggleButton value="include" sx={{ py: 0.25, px: 1, fontSize: '0.7rem' }}>
                Include only
              </ToggleButton>
              <ToggleButton value="exclude" sx={{ py: 0.25, px: 1, fontSize: '0.7rem' }}>
                Exclude
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {projectionFields.map((proj) => (
              <Box key={proj.id} sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                <TextField
                  size="small"
                  placeholder="field"
                  value={proj.field}
                  onChange={(e) => updateProjectionField(proj.id, e.target.value)}
                  disabled={disabled}
                  sx={{
                    flex: 1,
                    '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '0.8rem', py: 0.5 }
                  }}
                />
                <IconButton size="small" onClick={() => removeProjectionField(proj.id)} disabled={disabled} sx={{ p: 0.25 }}>
                  <DeleteIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
            ))}
            <Button
              size="small"
              startIcon={<AddIcon sx={{ fontSize: 16 }} />}
              onClick={addProjectionField}
              disabled={disabled}
              sx={{ alignSelf: 'flex-start', textTransform: 'none', fontSize: '0.75rem' }}
            >
              Add field
            </Button>
          </Box>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}

export default QueryOptionsBuilder;
