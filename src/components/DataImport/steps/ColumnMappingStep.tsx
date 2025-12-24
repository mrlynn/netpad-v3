'use client';

/**
 * Column Mapping Step
 * Configure how source columns map to target fields
 */

import React, { useState, useMemo } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Switch,
  FormControlLabel,
  Chip,
  Stack,
  Collapse,
  Alert,
} from '@mui/material';
import {
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  ArrowForward as ArrowIcon,
} from '@mui/icons-material';
import {
  InferredSchema,
  ColumnMapping,
  ColumnAction,
  ColumnTransform,
  ImportMappingConfig,
} from '@/types/dataImport';

interface ColumnMappingStepProps {
  schema: InferredSchema | null;
  suggestedMappings: ColumnMapping[];
  onConfigure: (config: ImportMappingConfig) => void;
  onBack: () => void;
  loading: boolean;
}

const FIELD_TYPES = [
  { value: 'short-answer', label: 'Text' },
  { value: 'long-answer', label: 'Long Text' },
  { value: 'number', label: 'Number' },
  { value: 'email', label: 'Email' },
  { value: 'url', label: 'URL' },
  { value: 'phone', label: 'Phone' },
  { value: 'date', label: 'Date' },
  { value: 'datetime', label: 'Date & Time' },
  { value: 'time', label: 'Time' },
  { value: 'yes-no', label: 'Yes/No' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'checkboxes', label: 'Checkboxes' },
];

const TRANSFORM_TYPES = [
  { value: 'trim', label: 'Trim whitespace' },
  { value: 'uppercase', label: 'Convert to uppercase' },
  { value: 'lowercase', label: 'Convert to lowercase' },
  { value: 'titlecase', label: 'Convert to title case' },
  { value: 'parseNumber', label: 'Parse as number' },
  { value: 'parseDate', label: 'Parse as date' },
  { value: 'parseBoolean', label: 'Parse as boolean' },
  { value: 'nullIfEmpty', label: 'Convert empty to null' },
  { value: 'splitToArray', label: 'Split to array' },
];

interface MappingRowProps {
  mapping: ColumnMapping;
  index: number;
  onUpdate: (index: number, mapping: ColumnMapping) => void;
  onRemove: (index: number) => void;
}

function MappingRow({ mapping, index, onUpdate, onRemove }: MappingRowProps) {
  const [expanded, setExpanded] = useState(false);

  const handleActionChange = (action: ColumnAction) => {
    onUpdate(index, { ...mapping, action });
  };

  const handleTargetPathChange = (path: string) => {
    onUpdate(index, { ...mapping, targetPath: path });
  };

  const handleTargetTypeChange = (type: string) => {
    onUpdate(index, { ...mapping, targetType: type });
  };

  const handleRequiredChange = (required: boolean) => {
    onUpdate(index, { ...mapping, required });
  };

  const addTransform = (type: string) => {
    const newTransform: ColumnTransform = { type: type as any };
    onUpdate(index, {
      ...mapping,
      transforms: [...(mapping.transforms || []), newTransform],
    });
  };

  const removeTransform = (transformIndex: number) => {
    const transforms = [...(mapping.transforms || [])];
    transforms.splice(transformIndex, 1);
    onUpdate(index, { ...mapping, transforms });
  };

  return (
    <>
      <TableRow
        sx={{
          bgcolor: mapping.action === 'skip' ? 'action.disabledBackground' : undefined,
        }}
      >
        <TableCell>
          <Typography
            variant="body2"
            fontWeight={500}
            sx={{
              textDecoration: mapping.action === 'skip' ? 'line-through' : undefined,
            }}
          >
            {mapping.sourceColumn}
          </Typography>
        </TableCell>
        <TableCell>
          <ArrowIcon color={mapping.action === 'skip' ? 'disabled' : 'primary'} />
        </TableCell>
        <TableCell>
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <Select
              value={mapping.action}
              onChange={(e) => handleActionChange(e.target.value as ColumnAction)}
              variant="standard"
            >
              <MenuItem value="import">Import</MenuItem>
              <MenuItem value="skip">Skip</MenuItem>
            </Select>
          </FormControl>
        </TableCell>
        <TableCell>
          {mapping.action === 'import' && (
            <TextField
              size="small"
              value={mapping.targetPath || ''}
              onChange={(e) => handleTargetPathChange(e.target.value)}
              placeholder="field_name"
              variant="standard"
              sx={{ width: 150 }}
            />
          )}
        </TableCell>
        <TableCell>
          {mapping.action === 'import' && (
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <Select
                value={mapping.targetType || 'short-answer'}
                onChange={(e) => handleTargetTypeChange(e.target.value)}
                variant="standard"
              >
                {FIELD_TYPES.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </TableCell>
        <TableCell>
          {mapping.action === 'import' && (
            <Stack direction="row" spacing={0.5}>
              {(mapping.transforms || []).map((t, i) => (
                <Chip
                  key={i}
                  label={t.type}
                  size="small"
                  onDelete={() => removeTransform(i)}
                />
              ))}
            </Stack>
          )}
        </TableCell>
        <TableCell>
          {mapping.action === 'import' && (
            <IconButton size="small" onClick={() => setExpanded(!expanded)}>
              {expanded ? <CollapseIcon /> : <ExpandIcon />}
            </IconButton>
          )}
        </TableCell>
      </TableRow>
      {mapping.action === 'import' && (
        <TableRow>
          <TableCell colSpan={7} sx={{ p: 0 }}>
            <Collapse in={expanded}>
              <Box sx={{ p: 2, bgcolor: 'action.hover' }}>
                <Stack direction="row" spacing={3} alignItems="center">
                  <FormControlLabel
                    control={
                      <Switch
                        checked={mapping.required || false}
                        onChange={(e) => handleRequiredChange(e.target.checked)}
                        size="small"
                      />
                    }
                    label="Required"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={mapping.skipIfEmpty || false}
                        onChange={(e) =>
                          onUpdate(index, { ...mapping, skipIfEmpty: e.target.checked })
                        }
                        size="small"
                      />
                    }
                    label="Skip if empty"
                  />
                  <FormControl size="small" sx={{ minWidth: 200 }}>
                    <InputLabel>Add Transform</InputLabel>
                    <Select
                      value=""
                      label="Add Transform"
                      onChange={(e) => {
                        if (e.target.value) {
                          addTransform(e.target.value);
                        }
                      }}
                    >
                      {TRANSFORM_TYPES.map((t) => (
                        <MenuItem key={t.value} value={t.value}>
                          {t.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Stack>
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export function ColumnMappingStep({
  schema,
  suggestedMappings,
  onConfigure,
  onBack,
  loading,
}: ColumnMappingStepProps) {
  const [mappings, setMappings] = useState<ColumnMapping[]>(suggestedMappings);
  const [skipDuplicates, setSkipDuplicates] = useState(false);
  const [duplicateKey, setDuplicateKey] = useState<string[]>([]);

  const handleUpdateMapping = (index: number, mapping: ColumnMapping) => {
    const newMappings = [...mappings];
    newMappings[index] = mapping;
    setMappings(newMappings);
  };

  const handleRemoveMapping = (index: number) => {
    const newMappings = [...mappings];
    newMappings[index] = { ...newMappings[index], action: 'skip' };
    setMappings(newMappings);
  };

  const handleSubmit = () => {
    const config: ImportMappingConfig = {
      mappings,
      skipDuplicates,
      duplicateKey: skipDuplicates ? duplicateKey : undefined,
    };
    onConfigure(config);
  };

  const importCount = useMemo(
    () => mappings.filter((m) => m.action === 'import').length,
    [mappings]
  );

  const importablePaths = useMemo(
    () =>
      mappings
        .filter((m) => m.action === 'import' && m.targetPath)
        .map((m) => m.targetPath!),
    [mappings]
  );

  if (!schema) {
    return (
      <Alert severity="error">Schema not available. Please go back and analyze the data.</Alert>
    );
  }

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        Configure how each source column maps to your MongoDB fields.
        {importCount} of {mappings.length} columns will be imported.
      </Alert>

      {/* Mapping table */}
      <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Source Column</TableCell>
              <TableCell></TableCell>
              <TableCell>Action</TableCell>
              <TableCell>Target Field</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Transforms</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {mappings.map((mapping, index) => (
              <MappingRow
                key={mapping.sourceColumn}
                mapping={mapping}
                index={index}
                onUpdate={handleUpdateMapping}
                onRemove={handleRemoveMapping}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Duplicate handling */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Duplicate Handling
        </Typography>
        <Stack spacing={2}>
          <FormControlLabel
            control={
              <Switch
                checked={skipDuplicates}
                onChange={(e) => setSkipDuplicates(e.target.checked)}
              />
            }
            label="Skip duplicate records"
          />
          {skipDuplicates && (
            <FormControl fullWidth size="small">
              <InputLabel>Duplicate Key Fields</InputLabel>
              <Select
                multiple
                value={duplicateKey}
                onChange={(e) => setDuplicateKey(e.target.value as string[])}
                label="Duplicate Key Fields"
                renderValue={(selected) => (
                  <Stack direction="row" spacing={0.5}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Stack>
                )}
              >
                {importablePaths.map((path) => (
                  <MenuItem key={path} value={path}>
                    {path}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Stack>
      </Paper>

      {/* Actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={onBack}>Back</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={importCount === 0 || loading}
        >
          {loading ? 'Validating...' : 'Validate & Continue'}
        </Button>
      </Box>
    </Box>
  );
}
