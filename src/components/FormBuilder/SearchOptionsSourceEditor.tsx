'use client';

import { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  IconButton,
  Collapse,
  Paper,
  alpha,
  Chip,
  Tooltip
} from '@mui/material';
import { ExpandMore, ExpandLess, Search, TrendingUp } from '@mui/icons-material';
import { FieldConfig, SearchOptionsSource, SearchOptionsSourceType } from '@/types/form';

interface SearchOptionsSourceEditorProps {
  config: FieldConfig;
  searchFieldConfig?: {
    optionsSource?: SearchOptionsSource;
  };
  onUpdate: (optionsSource: SearchOptionsSource | undefined) => void;
}

/**
 * Editor for configuring search dropdown options source.
 *
 * This allows form builders to configure how dropdown options are populated
 * when the form is in search mode:
 * - Static: Use the field's validation options
 * - Distinct: Fetch unique values from the form's data
 * - Lookup: Fetch from another collection (future)
 */
export function SearchOptionsSourceEditor({
  config,
  searchFieldConfig,
  onUpdate
}: SearchOptionsSourceEditorProps) {
  const [expanded, setExpanded] = useState(!!searchFieldConfig?.optionsSource);

  const optionsSource = searchFieldConfig?.optionsSource || {
    type: 'distinct' as SearchOptionsSourceType,
    distinct: {
      showCounts: true,
      sortBy: 'count' as const,
      sortDirection: 'desc' as const,
      limit: 100
    },
    refreshOnMount: true
  };

  const hasOptionsSource = !!searchFieldConfig?.optionsSource;
  const sourceType = optionsSource.type;

  const handleToggle = () => {
    if (hasOptionsSource) {
      onUpdate(undefined);
      setExpanded(false);
    } else {
      onUpdate(optionsSource);
      setExpanded(true);
    }
  };

  const handleTypeChange = (type: SearchOptionsSourceType) => {
    const newSource: SearchOptionsSource = { type };

    if (type === 'distinct') {
      newSource.distinct = {
        showCounts: true,
        sortBy: 'count',
        sortDirection: 'desc',
        limit: 100
      };
      newSource.refreshOnMount = true;
    } else if (type === 'lookup') {
      newSource.lookup = {
        collection: '',
        displayField: '',
        valueField: '_id'
      };
    } else if (type === 'static') {
      // Static uses the field's existing validation.options
    }

    onUpdate(newSource);
  };

  const handleDistinctUpdate = (updates: Partial<NonNullable<SearchOptionsSource['distinct']>>) => {
    onUpdate({
      ...optionsSource,
      distinct: { ...optionsSource.distinct, ...updates }
    });
  };

  const handleRefreshOnMountChange = (checked: boolean) => {
    onUpdate({
      ...optionsSource,
      refreshOnMount: checked
    });
  };

  const handleRefreshIntervalChange = (value: string) => {
    const interval = parseInt(value, 10);
    onUpdate({
      ...optionsSource,
      refreshInterval: isNaN(interval) || interval <= 0 ? undefined : interval * 1000
    });
  };

  // Only show for dropdown-compatible field types
  const isDropdownCompatible = ['dropdown', 'select', 'string', 'enum'].includes(config.type?.toLowerCase() || '');

  if (!isDropdownCompatible) {
    return null;
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          py: 0.5
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Search fontSize="small" sx={{ color: hasOptionsSource ? '#00ED64' : 'text.secondary' }} />
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
            Search Options Source
          </Typography>
          {hasOptionsSource && (
            <Chip
              label={sourceType}
              size="small"
              sx={{
                height: 18,
                fontSize: '0.65rem',
                bgcolor: alpha('#00ED64', 0.1),
                color: '#00ED64'
              }}
            />
          )}
        </Box>
        <IconButton size="small">
          {expanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <Paper
          elevation={0}
          sx={{
            mt: 1,
            p: 2,
            bgcolor: alpha('#00ED64', 0.03),
            border: '1px solid',
            borderColor: alpha('#00ED64', 0.15),
            borderRadius: 1
          }}
        >
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={hasOptionsSource}
                onChange={handleToggle}
              />
            }
            label={
              <Typography variant="caption">
                Enable smart dropdown for search
              </Typography>
            }
            sx={{ mb: 2 }}
          />

          {hasOptionsSource && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Source Type Selector */}
              <FormControl size="small" fullWidth>
                <InputLabel>Options Source</InputLabel>
                <Select
                  value={sourceType}
                  label="Options Source"
                  onChange={(e) => handleTypeChange(e.target.value as SearchOptionsSourceType)}
                >
                  <MenuItem value="distinct">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TrendingUp fontSize="small" />
                      Distinct Values (from data)
                    </Box>
                  </MenuItem>
                  <MenuItem value="static">Static (use field options)</MenuItem>
                  <MenuItem value="lookup" disabled>
                    <Tooltip title="Coming soon">
                      <span>Lookup (from another collection)</span>
                    </Tooltip>
                  </MenuItem>
                </Select>
              </FormControl>

              {/* Distinct Values Configuration */}
              {sourceType === 'distinct' && (
                <>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                    Options will be dynamically loaded from actual field values in your data.
                  </Typography>

                  {/* Show Counts Toggle */}
                  <FormControlLabel
                    control={
                      <Switch
                        size="small"
                        checked={optionsSource.distinct?.showCounts !== false}
                        onChange={(e) => handleDistinctUpdate({ showCounts: e.target.checked })}
                      />
                    }
                    label={
                      <Typography variant="caption">
                        Show counts (e.g., &quot;Hardware (45)&quot;)
                      </Typography>
                    }
                  />

                  {/* Sort Configuration */}
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <FormControl size="small" sx={{ flex: 1 }}>
                      <InputLabel>Sort By</InputLabel>
                      <Select
                        value={optionsSource.distinct?.sortBy || 'count'}
                        label="Sort By"
                        onChange={(e) => handleDistinctUpdate({ sortBy: e.target.value as 'value' | 'count' | 'label' })}
                      >
                        <MenuItem value="count">Count (most common first)</MenuItem>
                        <MenuItem value="value">Value (alphabetical)</MenuItem>
                        <MenuItem value="label">Label (alphabetical)</MenuItem>
                      </Select>
                    </FormControl>

                    <FormControl size="small" sx={{ flex: 1 }}>
                      <InputLabel>Direction</InputLabel>
                      <Select
                        value={optionsSource.distinct?.sortDirection || 'desc'}
                        label="Direction"
                        onChange={(e) => handleDistinctUpdate({ sortDirection: e.target.value as 'asc' | 'desc' })}
                      >
                        <MenuItem value="desc">Descending</MenuItem>
                        <MenuItem value="asc">Ascending</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>

                  {/* Limit */}
                  <TextField
                    size="small"
                    label="Max Options"
                    type="number"
                    value={optionsSource.distinct?.limit || 100}
                    onChange={(e) => handleDistinctUpdate({ limit: parseInt(e.target.value, 10) || 100 })}
                    inputProps={{ min: 1, max: 500 }}
                    helperText="Maximum number of options to show"
                    fullWidth
                  />

                  {/* Refresh Settings */}
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, fontWeight: 500 }}>
                    Refresh Behavior
                  </Typography>

                  <FormControlLabel
                    control={
                      <Switch
                        size="small"
                        checked={optionsSource.refreshOnMount !== false}
                        onChange={(e) => handleRefreshOnMountChange(e.target.checked)}
                      />
                    }
                    label={
                      <Typography variant="caption">
                        Refresh on form load
                      </Typography>
                    }
                  />

                  <TextField
                    size="small"
                    label="Auto-refresh interval (seconds)"
                    type="number"
                    value={optionsSource.refreshInterval ? optionsSource.refreshInterval / 1000 : ''}
                    onChange={(e) => handleRefreshIntervalChange(e.target.value)}
                    inputProps={{ min: 10, max: 3600 }}
                    placeholder="Leave empty to disable"
                    helperText="Automatically refresh options every N seconds"
                    fullWidth
                  />
                </>
              )}

              {/* Static Options Info */}
              {sourceType === 'static' && (
                <Typography variant="caption" color="text.secondary">
                  Options will use the field&apos;s configured validation options.
                  Configure options in the field&apos;s validation settings.
                </Typography>
              )}
            </Box>
          )}
        </Paper>
      </Collapse>
    </Box>
  );
}
