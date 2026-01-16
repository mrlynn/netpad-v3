/**
 * Generic stage editor wrapper
 * Renders the appropriate editor based on stage type
 */

'use client';

import React from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Collapse,
  Switch,
  FormControlLabel,
  TextField,
  Select,
  MenuItem,
  FormControl,
  Button,
  useTheme,
  alpha,
} from '@mui/material';
import {
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import {
  PipelineStage,
  StageConfig,
  STAGE_DEFINITIONS,
  MatchStageConfig,
  ProjectStageConfig,
  GroupStageConfig,
  SortStageConfig,
  LookupStageConfig,
  UnwindStageConfig,
  CountStageConfig,
  AddFieldsStageConfig,
  CustomStageConfig,
  generateId,
} from './types';

interface StageEditorProps {
  stage: PipelineStage;
  index: number;
  onChange: (updates: Partial<PipelineStage>) => void;
  onDelete: () => void;
  nodeId: string;
  disabled?: boolean;
}

export function StageEditor({
  stage,
  index,
  onChange,
  onDelete,
  nodeId,
  disabled = false,
}: StageEditorProps) {
  const theme = useTheme();
  const definition = STAGE_DEFINITIONS[stage.type];

  const updateConfig = (configUpdates: Record<string, unknown>) => {
    onChange({ config: { ...stage.config, ...configUpdates } as StageConfig });
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        overflow: 'hidden',
        opacity: stage.enabled ? 1 : 0.6,
        borderLeft: `3px solid ${definition.color}`,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          px: 1,
          py: 0.5,
          bgcolor: alpha(definition.color, 0.1),
          cursor: 'pointer',
        }}
        onClick={() => onChange({ collapsed: !stage.collapsed })}
      >
        <DragIcon sx={{ fontSize: 16, color: 'text.secondary', cursor: 'grab' }} />
        <Typography sx={{ fontSize: '1rem', mr: 0.5 }}>{definition.icon}</Typography>
        <Typography variant="body2" sx={{ fontWeight: 600, flex: 1 }}>
          {definition.label}
        </Typography>
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={stage.enabled}
              onChange={(e) => {
                e.stopPropagation();
                onChange({ enabled: e.target.checked });
              }}
              disabled={disabled}
            />
          }
          label=""
          sx={{ m: 0 }}
          onClick={(e) => e.stopPropagation()}
        />
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          disabled={disabled}
          sx={{ p: 0.25 }}
        >
          <DeleteIcon sx={{ fontSize: 16 }} />
        </IconButton>
        {stage.collapsed ? (
          <ExpandIcon sx={{ fontSize: 18 }} />
        ) : (
          <CollapseIcon sx={{ fontSize: 18 }} />
        )}
      </Box>

      {/* Content */}
      <Collapse in={!stage.collapsed}>
        <Box sx={{ p: 1 }}>
          {renderStageContent(stage, updateConfig, nodeId, disabled)}
        </Box>
      </Collapse>
    </Paper>
  );
}

function renderStageContent(
  stage: PipelineStage,
  updateConfig: (updates: Partial<StageConfig>) => void,
  nodeId: string,
  disabled: boolean
) {
  switch (stage.type) {
    case '$match':
      return <MatchStageEditor config={stage.config as MatchStageConfig} onChange={updateConfig} disabled={disabled} />;
    case '$project':
      return <ProjectStageEditor config={stage.config as ProjectStageConfig} onChange={updateConfig} disabled={disabled} />;
    case '$group':
      return <GroupStageEditor config={stage.config as GroupStageConfig} onChange={updateConfig} disabled={disabled} />;
    case '$sort':
      return <SortStageEditor config={stage.config as SortStageConfig} onChange={updateConfig} disabled={disabled} />;
    case '$limit':
    case '$skip':
      return <LimitSkipStageEditor config={stage.config as CustomStageConfig} onChange={updateConfig} type={stage.type} disabled={disabled} />;
    case '$lookup':
      return <LookupStageEditor config={stage.config as LookupStageConfig} onChange={updateConfig} disabled={disabled} />;
    case '$unwind':
      return <UnwindStageEditor config={stage.config as UnwindStageConfig} onChange={updateConfig} disabled={disabled} />;
    case '$count':
      return <CountStageEditor config={stage.config as CountStageConfig} onChange={updateConfig} disabled={disabled} />;
    case '$addFields':
      return <AddFieldsStageEditor config={stage.config as AddFieldsStageConfig} onChange={updateConfig} disabled={disabled} />;
    case '$custom':
      return <CustomStageEditor config={stage.config as CustomStageConfig} onChange={updateConfig} disabled={disabled} />;
    default:
      return <CustomStageEditor config={stage.config as CustomStageConfig} onChange={updateConfig} disabled={disabled} />;
  }
}

// Individual stage editors
function MatchStageEditor({ config, onChange, disabled }: { config: MatchStageConfig; onChange: (u: Partial<MatchStageConfig>) => void; disabled: boolean }) {
  return (
    <TextField
      size="small"
      fullWidth
      multiline
      rows={2}
      value={JSON.stringify(config.filter, null, 2)}
      onChange={(e) => {
        try {
          onChange({ filter: JSON.parse(e.target.value) });
        } catch {
          // Invalid JSON, keep as-is
        }
      }}
      placeholder='{ "status": "active" }'
      disabled={disabled}
      sx={{ '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '0.75rem' } }}
      helperText="Filter query (JSON)"
    />
  );
}

function ProjectStageEditor({ config, onChange, disabled }: { config: ProjectStageConfig; onChange: (u: Partial<ProjectStageConfig>) => void; disabled: boolean }) {
  const addField = () => {
    onChange({ fields: [...config.fields, { id: generateId(), field: '', value: '1' }] });
  };
  const updateField = (id: string, updates: Partial<{ field: string; value: string }>) => {
    onChange({ fields: config.fields.map(f => f.id === id ? { ...f, ...updates } : f) });
  };
  const removeField = (id: string) => {
    onChange({ fields: config.fields.filter(f => f.id !== id) });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      {config.fields.map((f) => (
        <Box key={f.id} sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="field"
            value={f.field}
            onChange={(e) => updateField(f.id, { field: e.target.value })}
            disabled={disabled}
            sx={{ flex: 1, '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '0.75rem', py: 0.5 } }}
          />
          <FormControl size="small" sx={{ minWidth: 70 }}>
            <Select
              value={f.value}
              onChange={(e) => updateField(f.id, { value: e.target.value })}
              disabled={disabled}
              sx={{ '& .MuiSelect-select': { py: 0.5, fontSize: '0.75rem' } }}
            >
              <MenuItem value="1">Include</MenuItem>
              <MenuItem value="0">Exclude</MenuItem>
            </Select>
          </FormControl>
          <IconButton size="small" onClick={() => removeField(f.id)} disabled={disabled} sx={{ p: 0.25 }}>
            <DeleteIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Box>
      ))}
      <Button size="small" startIcon={<AddIcon sx={{ fontSize: 14 }} />} onClick={addField} disabled={disabled} sx={{ alignSelf: 'flex-start', textTransform: 'none', fontSize: '0.7rem' }}>
        Add field
      </Button>
    </Box>
  );
}

function GroupStageEditor({ config, onChange, disabled }: { config: GroupStageConfig; onChange: (u: Partial<GroupStageConfig>) => void; disabled: boolean }) {
  const addAccumulator = () => {
    onChange({ accumulators: [...config.accumulators, { id: generateId(), outputField: '', operator: '$sum', expression: '' }] });
  };
  const updateAccumulator = (id: string, updates: Partial<GroupStageConfig['accumulators'][0]>) => {
    onChange({ accumulators: config.accumulators.map(a => a.id === id ? { ...a, ...updates } : a) });
  };
  const removeAccumulator = (id: string) => {
    onChange({ accumulators: config.accumulators.filter(a => a.id !== id) });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <TextField
        size="small"
        label="Group by (_id)"
        value={config._id}
        onChange={(e) => onChange({ _id: e.target.value })}
        placeholder="field or null"
        disabled={disabled}
        sx={{ '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '0.75rem' } }}
        InputLabelProps={{ shrink: true }}
      />
      <Typography variant="caption" color="text.secondary">Accumulators:</Typography>
      {config.accumulators.map((acc) => (
        <Box key={acc.id} sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="output"
            value={acc.outputField}
            onChange={(e) => updateAccumulator(acc.id, { outputField: e.target.value })}
            disabled={disabled}
            sx={{ flex: 1, minWidth: 60, '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '0.7rem', py: 0.5 } }}
          />
          <FormControl size="small" sx={{ minWidth: 70 }}>
            <Select
              value={acc.operator}
              onChange={(e) => updateAccumulator(acc.id, { operator: e.target.value as GroupStageConfig['accumulators'][0]['operator'] })}
              disabled={disabled}
              sx={{ '& .MuiSelect-select': { py: 0.5, fontSize: '0.7rem' } }}
            >
              <MenuItem value="$sum">sum</MenuItem>
              <MenuItem value="$avg">avg</MenuItem>
              <MenuItem value="$min">min</MenuItem>
              <MenuItem value="$max">max</MenuItem>
              <MenuItem value="$first">first</MenuItem>
              <MenuItem value="$last">last</MenuItem>
              <MenuItem value="$count">count</MenuItem>
              <MenuItem value="$push">push</MenuItem>
            </Select>
          </FormControl>
          {acc.operator !== '$count' && (
            <TextField
              size="small"
              placeholder="field"
              value={acc.expression}
              onChange={(e) => updateAccumulator(acc.id, { expression: e.target.value })}
              disabled={disabled}
              sx={{ flex: 1, minWidth: 60, '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '0.7rem', py: 0.5 } }}
            />
          )}
          <IconButton size="small" onClick={() => removeAccumulator(acc.id)} disabled={disabled} sx={{ p: 0.25 }}>
            <DeleteIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Box>
      ))}
      <Button size="small" startIcon={<AddIcon sx={{ fontSize: 14 }} />} onClick={addAccumulator} disabled={disabled} sx={{ alignSelf: 'flex-start', textTransform: 'none', fontSize: '0.7rem' }}>
        Add accumulator
      </Button>
    </Box>
  );
}

function SortStageEditor({ config, onChange, disabled }: { config: SortStageConfig; onChange: (u: Partial<SortStageConfig>) => void; disabled: boolean }) {
  const addField = () => {
    onChange({ fields: [...config.fields, { id: generateId(), field: '', direction: -1 }] });
  };
  const updateField = (id: string, updates: Partial<SortStageConfig['fields'][0]>) => {
    onChange({ fields: config.fields.map(f => f.id === id ? { ...f, ...updates } : f) });
  };
  const removeField = (id: string) => {
    onChange({ fields: config.fields.filter(f => f.id !== id) });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      {config.fields.map((f) => (
        <Box key={f.id} sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="field"
            value={f.field}
            onChange={(e) => updateField(f.id, { field: e.target.value })}
            disabled={disabled}
            sx={{ flex: 1, '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '0.75rem', py: 0.5 } }}
          />
          <FormControl size="small" sx={{ minWidth: 70 }}>
            <Select
              value={f.direction}
              onChange={(e) => updateField(f.id, { direction: e.target.value as 1 | -1 })}
              disabled={disabled}
              sx={{ '& .MuiSelect-select': { py: 0.5, fontSize: '0.75rem' } }}
            >
              <MenuItem value={1}>Asc</MenuItem>
              <MenuItem value={-1}>Desc</MenuItem>
            </Select>
          </FormControl>
          <IconButton size="small" onClick={() => removeField(f.id)} disabled={disabled} sx={{ p: 0.25 }}>
            <DeleteIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Box>
      ))}
      <Button size="small" startIcon={<AddIcon sx={{ fontSize: 14 }} />} onClick={addField} disabled={disabled} sx={{ alignSelf: 'flex-start', textTransform: 'none', fontSize: '0.7rem' }}>
        Add sort field
      </Button>
    </Box>
  );
}

function LimitSkipStageEditor({ config, onChange, type, disabled }: { config: CustomStageConfig; onChange: (u: Partial<CustomStageConfig>) => void; type: string; disabled: boolean }) {
  return (
    <TextField
      size="small"
      fullWidth
      type="number"
      value={config.json}
      onChange={(e) => onChange({ json: e.target.value })}
      placeholder={type === '$limit' ? '10' : '0'}
      disabled={disabled}
      label={type === '$limit' ? 'Limit' : 'Skip'}
      InputLabelProps={{ shrink: true }}
      sx={{ '& .MuiInputBase-input': { fontSize: '0.8rem' } }}
    />
  );
}

function LookupStageEditor({ config, onChange, disabled }: { config: LookupStageConfig; onChange: (u: Partial<LookupStageConfig>) => void; disabled: boolean }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <TextField
        size="small"
        label="From collection"
        value={config.from}
        onChange={(e) => onChange({ from: e.target.value })}
        disabled={disabled}
        sx={{ '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '0.75rem' } }}
        InputLabelProps={{ shrink: true }}
      />
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          size="small"
          label="Local field"
          value={config.localField}
          onChange={(e) => onChange({ localField: e.target.value })}
          disabled={disabled}
          sx={{ flex: 1, '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '0.75rem' } }}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          size="small"
          label="Foreign field"
          value={config.foreignField}
          onChange={(e) => onChange({ foreignField: e.target.value })}
          disabled={disabled}
          sx={{ flex: 1, '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '0.75rem' } }}
          InputLabelProps={{ shrink: true }}
        />
      </Box>
      <TextField
        size="small"
        label="As (output field)"
        value={config.as}
        onChange={(e) => onChange({ as: e.target.value })}
        disabled={disabled}
        sx={{ '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '0.75rem' } }}
        InputLabelProps={{ shrink: true }}
      />
    </Box>
  );
}

function UnwindStageEditor({ config, onChange, disabled }: { config: UnwindStageConfig; onChange: (u: Partial<UnwindStageConfig>) => void; disabled: boolean }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <TextField
        size="small"
        label="Array path"
        value={config.path}
        onChange={(e) => onChange({ path: e.target.value })}
        placeholder="arrayField"
        disabled={disabled}
        sx={{ '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '0.75rem' } }}
        InputLabelProps={{ shrink: true }}
      />
      <FormControlLabel
        control={
          <Switch
            size="small"
            checked={config.preserveNullAndEmptyArrays}
            onChange={(e) => onChange({ preserveNullAndEmptyArrays: e.target.checked })}
            disabled={disabled}
          />
        }
        label={<Typography variant="caption">Preserve null/empty</Typography>}
      />
    </Box>
  );
}

function CountStageEditor({ config, onChange, disabled }: { config: CountStageConfig; onChange: (u: Partial<CountStageConfig>) => void; disabled: boolean }) {
  return (
    <TextField
      size="small"
      fullWidth
      label="Output field name"
      value={config.outputField}
      onChange={(e) => onChange({ outputField: e.target.value })}
      placeholder="count"
      disabled={disabled}
      sx={{ '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '0.75rem' } }}
      InputLabelProps={{ shrink: true }}
    />
  );
}

function AddFieldsStageEditor({ config, onChange, disabled }: { config: AddFieldsStageConfig; onChange: (u: Partial<AddFieldsStageConfig>) => void; disabled: boolean }) {
  const addField = () => {
    onChange({ fields: [...config.fields, { id: generateId(), field: '', expression: '' }] });
  };
  const updateField = (id: string, updates: Partial<AddFieldsStageConfig['fields'][0]>) => {
    onChange({ fields: config.fields.map(f => f.id === id ? { ...f, ...updates } : f) });
  };
  const removeField = (id: string) => {
    onChange({ fields: config.fields.filter(f => f.id !== id) });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      {config.fields.map((f) => (
        <Box key={f.id} sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="field"
            value={f.field}
            onChange={(e) => updateField(f.id, { field: e.target.value })}
            disabled={disabled}
            sx={{ flex: 1, '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '0.75rem', py: 0.5 } }}
          />
          <TextField
            size="small"
            placeholder="expression"
            value={f.expression}
            onChange={(e) => updateField(f.id, { expression: e.target.value })}
            disabled={disabled}
            sx={{ flex: 1, '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '0.75rem', py: 0.5 } }}
          />
          <IconButton size="small" onClick={() => removeField(f.id)} disabled={disabled} sx={{ p: 0.25 }}>
            <DeleteIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Box>
      ))}
      <Button size="small" startIcon={<AddIcon sx={{ fontSize: 14 }} />} onClick={addField} disabled={disabled} sx={{ alignSelf: 'flex-start', textTransform: 'none', fontSize: '0.7rem' }}>
        Add field
      </Button>
    </Box>
  );
}

function CustomStageEditor({ config, onChange, disabled }: { config: CustomStageConfig; onChange: (u: Partial<CustomStageConfig>) => void; disabled: boolean }) {
  return (
    <TextField
      size="small"
      fullWidth
      multiline
      rows={3}
      value={config.json}
      onChange={(e) => onChange({ json: e.target.value })}
      placeholder='{ "$stage": { ... } }'
      disabled={disabled}
      sx={{ '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '0.75rem' } }}
      helperText="Raw JSON stage"
    />
  );
}

export default StageEditor;
