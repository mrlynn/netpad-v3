/**
 * Main MongoDB Query Builder component
 * Orchestrates the visual filter builder and raw JSON editor
 */

'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  TextField,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Visibility as VisualIcon,
  Code as CodeIcon,
} from '@mui/icons-material';
import {
  MongoFilterConfig,
  createDefaultFilterConfig,
} from './shared/types';
import { FilterBuilder } from './FilterBuilder/FilterBuilder';
import { JsonPreview } from './shared/JsonPreview';
import { AIQueryInput } from './shared/AIQueryInput';
import {
  filterConfigToMongo,
  filterConfigToJsonString,
  parseMongoQueryToConfig,
} from './utils/queryGenerator';

interface MongoQueryBuilderProps {
  value: MongoFilterConfig | string | Record<string, unknown> | undefined;
  onChange: (value: MongoFilterConfig | Record<string, unknown>) => void;
  nodeId: string;
  showPreview?: boolean;
  disabled?: boolean;
  label?: string;
  description?: string;
}

export function MongoQueryBuilder({
  value,
  onChange,
  nodeId,
  showPreview = true,
  disabled = false,
  label = 'Query Filter',
  description,
}: MongoQueryBuilderProps) {
  const theme = useTheme();

  // Normalize incoming value to MongoFilterConfig
  const normalizedConfig = useMemo((): MongoFilterConfig => {
    // Already a MongoFilterConfig
    if (value && typeof value === 'object' && 'rootGroup' in value) {
      return value as MongoFilterConfig;
    }

    // Raw JSON string
    if (typeof value === 'string') {
      const parsed = parseMongoQueryToConfig(value);
      if (parsed) return parsed;
      // If parsing fails, create default with raw JSON
      return {
        ...createDefaultFilterConfig(),
        rawJson: value,
        mode: value.trim() ? 'raw' : 'visual',
      };
    }

    // Plain object (MongoDB query)
    if (value && typeof value === 'object') {
      const jsonStr = JSON.stringify(value);
      const parsed = parseMongoQueryToConfig(jsonStr);
      if (parsed) return parsed;
      return {
        ...createDefaultFilterConfig(),
        rawJson: jsonStr,
        mode: 'raw',
      };
    }

    // No value - create default
    return createDefaultFilterConfig();
  }, [value]);

  // Local state for editing - use ref to track if we initiated the change
  const [config, setConfig] = useState<MongoFilterConfig>(normalizedConfig);
  const [rawJsonInput, setRawJsonInput] = useState<string>(
    normalizedConfig.rawJson || '{}'
  );
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Track whether we're the source of the change to avoid resetting our own updates
  const isInternalChange = React.useRef(false);

  // Sync local state when external value changes (but not from our own updates)
  useEffect(() => {
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    setConfig(normalizedConfig);
    if (normalizedConfig.mode === 'raw') {
      setRawJsonInput(normalizedConfig.rawJson || '{}');
    }
  }, [normalizedConfig]);

  // Handle mode toggle
  const handleModeChange = useCallback(
    (_: React.MouseEvent<HTMLElement>, newMode: 'visual' | 'raw' | null) => {
      if (!newMode) return;

      if (newMode === 'raw') {
        // Switching to raw - generate JSON from visual config
        const generatedJson = filterConfigToJsonString(config);
        setRawJsonInput(generatedJson);
        setJsonError(null);
        const newConfig: MongoFilterConfig = {
          ...config,
          mode: 'raw',
          rawJson: generatedJson,
        };
        setConfig(newConfig);
        isInternalChange.current = true;
        // Output the MongoDB query object
        onChange(filterConfigToMongo(newConfig));
      } else {
        // Switching to visual - try to parse raw JSON
        const parsed = parseMongoQueryToConfig(rawJsonInput);
        if (parsed) {
          const newConfig: MongoFilterConfig = {
            ...parsed,
            mode: 'visual',
          };
          setConfig(newConfig);
          setJsonError(null);
          isInternalChange.current = true;
          onChange(filterConfigToMongo(newConfig));
        } else {
          // Can't parse - show error but allow switch
          setJsonError('Could not parse query for visual editing');
          const newConfig: MongoFilterConfig = {
            ...config,
            mode: 'visual',
          };
          setConfig(newConfig);
        }
      }
    },
    [config, rawJsonInput, onChange]
  );

  // Handle visual filter changes
  const handleFilterChange = useCallback(
    (newGroup: MongoFilterConfig['rootGroup']) => {
      const newConfig: MongoFilterConfig = {
        ...config,
        rootGroup: newGroup,
      };
      setConfig(newConfig);
      // Mark that we're making the change so useEffect doesn't reset it
      isInternalChange.current = true;
      // Output the MongoDB query object
      onChange(filterConfigToMongo(newConfig));
    },
    [config, onChange]
  );

  // Handle raw JSON changes
  const handleRawJsonChange = useCallback(
    (newJson: string) => {
      setRawJsonInput(newJson);

      // Try to parse to validate
      try {
        const parsed = JSON.parse(newJson);
        setJsonError(null);
        const newConfig: MongoFilterConfig = {
          ...config,
          rawJson: newJson,
        };
        setConfig(newConfig);
        isInternalChange.current = true;
        // Output the parsed MongoDB query object
        onChange(parsed);
      } catch {
        setJsonError('Invalid JSON');
        // Still update local state, but don't call onChange with invalid JSON
      }
    },
    [config, onChange]
  );

  // Generate preview JSON
  const previewJson = useMemo(() => {
    if (config.mode === 'raw') {
      return rawJsonInput;
    }
    return filterConfigToJsonString(config);
  }, [config, rawJsonInput]);

  // Handle AI-generated filter
  const handleAIGenerate = useCallback(
    (result: Record<string, unknown>) => {
      // Try to parse as visual config, otherwise use raw mode
      const jsonStr = JSON.stringify(result);
      const parsed = parseMongoQueryToConfig(jsonStr);

      if (parsed) {
        const newConfig: MongoFilterConfig = {
          ...parsed,
          mode: 'visual',
        };
        setConfig(newConfig);
        isInternalChange.current = true;
        onChange(result);
      } else {
        // Can't convert to visual, use raw mode
        setRawJsonInput(JSON.stringify(result, null, 2));
        const newConfig: MongoFilterConfig = {
          ...config,
          mode: 'raw',
          rawJson: JSON.stringify(result, null, 2),
        };
        setConfig(newConfig);
        isInternalChange.current = true;
        onChange(result);
      }
    },
    [config, onChange]
  );

  return (
    <Box sx={{ mb: 2 }}>
      {/* Header with mode toggle */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 1.5,
        }}
      >
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {label}
          </Typography>
          {description && (
            <Typography variant="caption" color="text.secondary">
              {description}
            </Typography>
          )}
        </Box>
        <ToggleButtonGroup
          value={config.mode}
          exclusive
          onChange={handleModeChange}
          size="small"
          disabled={disabled}
        >
          <ToggleButton value="visual" sx={{ px: 1.5, py: 0.5 }}>
            <VisualIcon sx={{ fontSize: 16, mr: 0.5 }} />
            <Typography variant="caption">Visual</Typography>
          </ToggleButton>
          <ToggleButton value="raw" sx={{ px: 1.5, py: 0.5 }}>
            <CodeIcon sx={{ fontSize: 16, mr: 0.5 }} />
            <Typography variant="caption">JSON</Typography>
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* AI Query Input */}
      <AIQueryInput
        onGenerate={handleAIGenerate}
        apiEndpoint="/api/generate-filter"
        placeholder='e.g., "Find users where email matches form submission"'
        buttonLabel="Generate with AI"
        disabled={disabled}
        existingQuery={filterConfigToMongo(config)}
        nodeId={nodeId}
      />

      {/* Content based on mode */}
      {config.mode === 'visual' ? (
        <FilterBuilder
          group={config.rootGroup}
          onChange={handleFilterChange}
          nodeId={nodeId}
          disabled={disabled}
        />
      ) : (
        <TextField
          fullWidth
          multiline
          rows={6}
          size="small"
          value={rawJsonInput}
          onChange={(e) => handleRawJsonChange(e.target.value)}
          error={!!jsonError}
          helperText={jsonError || 'Enter MongoDB query as JSON'}
          disabled={disabled}
          placeholder='{ "field": "value" }'
          sx={{
            '& .MuiInputBase-input': {
              fontFamily: 'monospace',
              fontSize: '0.85rem',
            },
          }}
        />
      )}

      {/* JSON Preview */}
      {showPreview && config.mode === 'visual' && (
        <JsonPreview json={previewJson} title="Generated Query" />
      )}
    </Box>
  );
}

export default MongoQueryBuilder;
