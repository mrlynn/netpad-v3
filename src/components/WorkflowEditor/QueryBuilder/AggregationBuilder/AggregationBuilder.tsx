/**
 * MongoDB Aggregation Pipeline Builder
 * Visual builder for creating aggregation pipelines
 */

'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  ToggleButton,
  ToggleButtonGroup,
  TextField,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as VisualIcon,
  Code as CodeIcon,
} from '@mui/icons-material';
import {
  AggregationPipelineConfig,
  PipelineStage,
  AggregationStageType,
  STAGE_DEFINITIONS,
  createDefaultPipelineConfig,
  createEmptyStage,
  pipelineToMongo,
} from './types';
import { StageEditor } from './StageEditor';
import { JsonPreview } from '../shared/JsonPreview';
import { AIQueryInput } from '../shared/AIQueryInput';

interface AggregationBuilderProps {
  value: AggregationPipelineConfig | Record<string, unknown>[] | string | undefined;
  onChange: (value: Record<string, unknown>[]) => void;
  nodeId: string;
  showPreview?: boolean;
  disabled?: boolean;
  label?: string;
  description?: string;
}

export function AggregationBuilder({
  value,
  onChange,
  nodeId,
  showPreview = true,
  disabled = false,
  label = 'Aggregation Pipeline',
  description,
}: AggregationBuilderProps) {
  const theme = useTheme();
  const [addMenuAnchor, setAddMenuAnchor] = useState<null | HTMLElement>(null);

  // Normalize incoming value
  const normalizedConfig = useMemo((): AggregationPipelineConfig => {
    if (!value) return createDefaultPipelineConfig();

    // Already our format
    if (typeof value === 'object' && 'stages' in value) {
      return value as AggregationPipelineConfig;
    }

    // Raw JSON string
    if (typeof value === 'string') {
      return {
        ...createDefaultPipelineConfig(),
        rawJson: value,
        mode: value.trim() ? 'raw' : 'visual',
      };
    }

    // Array (MongoDB pipeline format)
    if (Array.isArray(value)) {
      return {
        ...createDefaultPipelineConfig(),
        rawJson: JSON.stringify(value, null, 2),
        mode: 'raw',
      };
    }

    return createDefaultPipelineConfig();
  }, [value]);

  const [config, setConfig] = useState<AggregationPipelineConfig>(normalizedConfig);
  const [rawJsonInput, setRawJsonInput] = useState<string>(normalizedConfig.rawJson || '[]');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const isInternalChange = React.useRef(false);

  useEffect(() => {
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    setConfig(normalizedConfig);
    if (normalizedConfig.mode === 'raw') {
      setRawJsonInput(normalizedConfig.rawJson || '[]');
    }
  }, [normalizedConfig]);

  const handleModeChange = useCallback(
    (_: React.MouseEvent<HTMLElement>, newMode: 'visual' | 'raw' | null) => {
      if (!newMode) return;

      if (newMode === 'raw') {
        const generatedJson = JSON.stringify(pipelineToMongo(config), null, 2);
        setRawJsonInput(generatedJson);
        setJsonError(null);
        const newConfig: AggregationPipelineConfig = { ...config, mode: 'raw', rawJson: generatedJson };
        setConfig(newConfig);
        isInternalChange.current = true;
        onChange(pipelineToMongo(newConfig));
      } else {
        // Just switch mode, keep raw JSON for reference
        const newConfig: AggregationPipelineConfig = { ...config, mode: 'visual' };
        setConfig(newConfig);
      }
    },
    [config, onChange]
  );

  const handleAddStage = useCallback((type: AggregationStageType) => {
    const newStage = createEmptyStage(type);
    const newConfig: AggregationPipelineConfig = {
      ...config,
      stages: [...config.stages, newStage],
    };
    setConfig(newConfig);
    isInternalChange.current = true;
    onChange(pipelineToMongo(newConfig));
    setAddMenuAnchor(null);
  }, [config, onChange]);

  const handleStageChange = useCallback((id: string, updates: Partial<PipelineStage>) => {
    const newConfig: AggregationPipelineConfig = {
      ...config,
      stages: config.stages.map(s => s.id === id ? { ...s, ...updates } : s),
    };
    setConfig(newConfig);
    isInternalChange.current = true;
    onChange(pipelineToMongo(newConfig));
  }, [config, onChange]);

  const handleStageDelete = useCallback((id: string) => {
    const newConfig: AggregationPipelineConfig = {
      ...config,
      stages: config.stages.filter(s => s.id !== id),
    };
    setConfig(newConfig);
    isInternalChange.current = true;
    onChange(pipelineToMongo(newConfig));
  }, [config, onChange]);

  const handleRawJsonChange = useCallback((newJson: string) => {
    setRawJsonInput(newJson);
    try {
      const parsed = JSON.parse(newJson);
      if (!Array.isArray(parsed)) {
        setJsonError('Pipeline must be an array');
        return;
      }
      setJsonError(null);
      const newConfig: AggregationPipelineConfig = { ...config, rawJson: newJson };
      setConfig(newConfig);
      isInternalChange.current = true;
      onChange(parsed);
    } catch {
      setJsonError('Invalid JSON');
    }
  }, [config, onChange]);

  const previewJson = useMemo(() => {
    if (config.mode === 'raw') {
      return rawJsonInput;
    }
    return JSON.stringify(pipelineToMongo(config), null, 2);
  }, [config, rawJsonInput]);

  // Handle AI-generated pipeline
  const handleAIGenerate = useCallback(
    (result: Record<string, unknown>) => {
      // Result should be an array of stages
      const stages = Array.isArray(result) ? result : [];
      const jsonStr = JSON.stringify(stages, null, 2);
      setRawJsonInput(jsonStr);
      const newConfig: AggregationPipelineConfig = {
        ...config,
        mode: 'raw',
        rawJson: jsonStr,
      };
      setConfig(newConfig);
      isInternalChange.current = true;
      onChange(stages as Record<string, unknown>[]);
    },
    [config, onChange]
  );

  const stageTypes: AggregationStageType[] = [
    '$match', '$project', '$group', '$sort', '$limit', '$skip',
    '$lookup', '$unwind', '$count', '$addFields', '$custom'
  ];

  return (
    <Box sx={{ mb: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>{label}</Typography>
          {description && (
            <Typography variant="caption" color="text.secondary">{description}</Typography>
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

      {/* AI Pipeline Input */}
      <AIQueryInput
        onGenerate={handleAIGenerate}
        apiEndpoint="/api/generate-pipeline"
        placeholder='e.g., "Group orders by status, count each group, and sort by count descending"'
        buttonLabel="Generate with AI"
        disabled={disabled}
        existingQuery={pipelineToMongo(config) as unknown as Record<string, unknown>}
        nodeId={nodeId}
      />

      {config.mode === 'visual' ? (
        <>
          {/* Stages list */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 1 }}>
            {config.stages.map((stage, index) => (
              <StageEditor
                key={stage.id}
                stage={stage}
                index={index}
                onChange={(updates) => handleStageChange(stage.id, updates)}
                onDelete={() => handleStageDelete(stage.id)}
                nodeId={nodeId}
                disabled={disabled}
              />
            ))}
          </Box>

          {/* Empty state */}
          {config.stages.length === 0 && (
            <Box
              sx={{
                py: 2,
                textAlign: 'center',
                border: '1px dashed',
                borderColor: 'divider',
                borderRadius: 1,
                mb: 1,
              }}
            >
              <Typography variant="body2" color="text.secondary">No pipeline stages</Typography>
              <Typography variant="caption" color="text.secondary">
                Add stages to build your aggregation pipeline
              </Typography>
            </Box>
          )}

          {/* Add stage button */}
          <Button
            startIcon={<AddIcon />}
            onClick={(e) => setAddMenuAnchor(e.currentTarget)}
            variant="outlined"
            size="small"
            disabled={disabled}
          >
            Add Stage
          </Button>

          <Menu
            anchorEl={addMenuAnchor}
            open={Boolean(addMenuAnchor)}
            onClose={() => setAddMenuAnchor(null)}
            PaperProps={{ sx: { maxHeight: 300 } }}
          >
            {stageTypes.map((type) => {
              const def = STAGE_DEFINITIONS[type];
              return (
                <MenuItem key={type} onClick={() => handleAddStage(type)} dense>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <Typography sx={{ fontSize: '1rem' }}>{def.icon}</Typography>
                  </ListItemIcon>
                  <ListItemText
                    primary={def.label}
                    secondary={def.description}
                    primaryTypographyProps={{ variant: 'body2' }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                </MenuItem>
              );
            })}
          </Menu>
        </>
      ) : (
        <TextField
          fullWidth
          multiline
          rows={8}
          size="small"
          value={rawJsonInput}
          onChange={(e) => handleRawJsonChange(e.target.value)}
          error={!!jsonError}
          helperText={jsonError || 'Enter aggregation pipeline as JSON array'}
          disabled={disabled}
          placeholder='[{ "$match": { "status": "active" } }]'
          sx={{ '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '0.8rem' } }}
        />
      )}

      {/* Preview */}
      {showPreview && config.mode === 'visual' && (
        <JsonPreview json={previewJson} title="Generated Pipeline" />
      )}
    </Box>
  );
}

export default AggregationBuilder;
