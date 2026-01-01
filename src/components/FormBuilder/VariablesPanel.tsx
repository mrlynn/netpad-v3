'use client';

import { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Collapse,
  Chip,
  alpha,
  Tooltip
} from '@mui/material';
import {
  Add,
  Delete,
  ExpandMore,
  ExpandLess,
  Code,
  Link as LinkIcon,
  Functions
} from '@mui/icons-material';
import { FormVariable, FieldConfig } from '@/types/form';
import { HelpButton } from '@/components/Help';
import { FormVariablePickerButton } from './FormVariablePicker';

interface VariablesPanelProps {
  variables: FormVariable[];
  fieldConfigs: FieldConfig[];
  variableValues?: Record<string, any>;
  onVariablesChange: (variables: FormVariable[]) => void;
  onVariableValueChange?: (name: string, value: any) => void;
}

const VARIABLE_TYPES = [
  { value: 'string', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'array', label: 'Array' },
  { value: 'object', label: 'Object' }
];

const VALUE_SOURCE_TYPES = [
  { value: 'static', label: 'Static Value', icon: Code },
  { value: 'field', label: 'From Field', icon: LinkIcon },
  { value: 'formula', label: 'Formula', icon: Functions }
];

export function VariablesPanel({
  variables,
  fieldConfigs,
  variableValues = {},
  onVariablesChange,
  onVariableValueChange
}: VariablesPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const addVariable = () => {
    const newVariable: FormVariable = {
      name: `var${variables.length + 1}`,
      type: 'string',
      defaultValue: '',
      description: ''
    };
    onVariablesChange([...variables, newVariable]);
    setEditingIndex(variables.length);
  };

  const updateVariable = (index: number, updates: Partial<FormVariable>) => {
    const newVariables = [...variables];
    newVariables[index] = { ...newVariables[index], ...updates };
    onVariablesChange(newVariables);
  };

  const removeVariable = (index: number) => {
    const newVariables = variables.filter((_, i) => i !== index);
    onVariablesChange(newVariables);
    if (editingIndex === index) {
      setEditingIndex(null);
    }
  };

  const getVariableIcon = (variable: FormVariable) => {
    const sourceType = variable.valueSource?.type || 'static';
    const sourceConfig = VALUE_SOURCE_TYPES.find((t) => t.value === sourceType);
    return sourceConfig?.icon || Code;
  };

  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: alpha('#9c27b0', 0.05),
          borderBottom: expanded ? '1px solid' : 'none',
          borderColor: 'divider',
          cursor: 'pointer'
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Code sx={{ color: '#9c27b0' }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Variables & State
          </Typography>
          <Chip
            label={variables.length}
            size="small"
            sx={{
              height: 20,
              fontSize: '0.7rem',
              bgcolor: alpha('#9c27b0', 0.1),
              color: '#9c27b0'
            }}
          />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <HelpButton topicId="form-variables" tooltip="Variables Help" />
          <Tooltip title="Add Variable">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                addVariable();
                setExpanded(true);
              }}
              sx={{
                bgcolor: alpha('#9c27b0', 0.1),
                '&:hover': { bgcolor: alpha('#9c27b0', 0.2) }
              }}
            >
              <Add fontSize="small" sx={{ color: '#9c27b0' }} />
            </IconButton>
          </Tooltip>
          <IconButton size="small">
            {expanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Box>
      </Box>

      {/* Content */}
      <Collapse in={expanded}>
        <Box sx={{ p: 2 }}>
          {variables.length === 0 ? (
            <Box
              sx={{
                p: 3,
                textAlign: 'center',
                bgcolor: alpha('#9c27b0', 0.03),
                borderRadius: 1,
                border: '1px dashed',
                borderColor: alpha('#9c27b0', 0.2)
              }}
            >
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                No variables defined
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Variables can store temporary values, track form state,
                and be used in calculations and conditional logic.
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Add />}
                  onClick={addVariable}
                  sx={{
                    borderColor: '#9c27b0',
                    color: '#9c27b0',
                    '&:hover': {
                      borderColor: '#9c27b0',
                      bgcolor: alpha('#9c27b0', 0.05)
                    }
                  }}
                >
                  Add Variable
                </Button>
              </Box>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {variables.map((variable, index) => {
                const Icon = getVariableIcon(variable);
                const isEditing = editingIndex === index;
                const currentValue = variableValues[variable.name] ?? variable.defaultValue;

                return (
                  <Paper
                    key={index}
                    elevation={0}
                    sx={{
                      p: 2,
                      border: '1px solid',
                      borderColor: isEditing ? '#9c27b0' : 'divider',
                      borderRadius: 1,
                      bgcolor: isEditing ? alpha('#9c27b0', 0.02) : 'background.paper'
                    }}
                  >
                    {/* Variable Header */}
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        mb: isEditing ? 2 : 0
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Icon fontSize="small" sx={{ color: '#9c27b0' }} />
                        <Typography
                          variant="body2"
                          sx={{ fontFamily: 'monospace', fontWeight: 600 }}
                        >
                          ${variable.name}
                        </Typography>
                        <Chip
                          label={variable.type}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: '0.6rem',
                            bgcolor: alpha('#9c27b0', 0.1),
                            color: '#9c27b0'
                          }}
                        />
                        {!isEditing && (
                          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                            = {JSON.stringify(currentValue)}
                          </Typography>
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <IconButton
                          size="small"
                          onClick={() => setEditingIndex(isEditing ? null : index)}
                        >
                          {isEditing ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => removeVariable(index)}
                          color="error"
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>

                    {/* Variable Editor */}
                    <Collapse in={isEditing}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {/* Name and Type */}
                        <Box sx={{ display: 'flex', gap: 2 }}>
                          <TextField
                            size="small"
                            label="Variable Name"
                            value={variable.name}
                            onChange={(e) => {
                              const sanitized = e.target.value.replace(/[^a-zA-Z0-9_]/g, '');
                              updateVariable(index, { name: sanitized });
                            }}
                            sx={{ flex: 1 }}
                            InputProps={{
                              startAdornment: (
                                <Typography sx={{ mr: 0.5, color: 'text.secondary' }}>$</Typography>
                              ),
                              sx: { fontFamily: 'monospace' }
                            }}
                          />
                          <FormControl size="small" sx={{ minWidth: 120 }}>
                            <InputLabel>Type</InputLabel>
                            <Select
                              value={variable.type}
                              label="Type"
                              onChange={(e) =>
                                updateVariable(index, {
                                  type: e.target.value as FormVariable['type']
                                })
                              }
                            >
                              {VARIABLE_TYPES.map((type) => (
                                <MenuItem key={type.value} value={type.value}>
                                  {type.label}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Box>

                        {/* Description */}
                        <TextField
                          size="small"
                          label="Description"
                          value={variable.description || ''}
                          onChange={(e) => updateVariable(index, { description: e.target.value })}
                          fullWidth
                          placeholder="What is this variable used for?"
                        />

                        {/* Value Source */}
                        <FormControl size="small" fullWidth>
                          <InputLabel>Value Source</InputLabel>
                          <Select
                            value={variable.valueSource?.type || 'static'}
                            label="Value Source"
                            onChange={(e) =>
                              updateVariable(index, {
                                valueSource: {
                                  ...variable.valueSource,
                                  type: e.target.value as any
                                }
                              })
                            }
                          >
                            {VALUE_SOURCE_TYPES.map((source) => (
                              <MenuItem key={source.value} value={source.value}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <source.icon fontSize="small" />
                                  {source.label}
                                </Box>
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>

                        {/* Source-specific config */}
                        {variable.valueSource?.type === 'field' && (
                          <FormControl size="small" fullWidth>
                            <InputLabel>Source Field</InputLabel>
                            <Select
                              value={variable.valueSource.fieldPath || ''}
                              label="Source Field"
                              onChange={(e) =>
                                updateVariable(index, {
                                  valueSource: {
                                    ...variable.valueSource,
                                    type: 'field',
                                    fieldPath: e.target.value
                                  }
                                })
                              }
                            >
                              {fieldConfigs
                                .filter((f) => f.included)
                                .map((field) => (
                                  <MenuItem key={field.path} value={field.path}>
                                    {field.label} ({field.path})
                                  </MenuItem>
                                ))}
                            </Select>
                          </FormControl>
                        )}

                        {variable.valueSource?.type === 'formula' && (
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                            <TextField
                              size="small"
                              label="Formula"
                              value={variable.valueSource.formula || ''}
                              onChange={(e) =>
                                updateVariable(index, {
                                  valueSource: {
                                    ...variable.valueSource,
                                    type: 'formula',
                                    formula: e.target.value
                                  }
                                })
                              }
                              fullWidth
                              multiline
                              rows={2}
                              placeholder="e.g., price * quantity"
                              InputProps={{
                                sx: { fontFamily: 'monospace', fontSize: '0.85rem' }
                              }}
                            />
                            <Box sx={{ pt: 1 }}>
                              <FormVariablePickerButton
                                fieldConfigs={fieldConfigs}
                                variables={variables.filter((_, i) => i !== index)}
                                context="formula"
                                onInsert={(value) => {
                                  const currentFormula = variable.valueSource?.formula || '';
                                  updateVariable(index, {
                                    valueSource: {
                                      ...variable.valueSource,
                                      type: 'formula',
                                      formula: currentFormula + value
                                    }
                                  });
                                }}
                              />
                            </Box>
                          </Box>
                        )}

                        {/* Default/Current Value */}
                        <TextField
                          size="small"
                          label={variable.valueSource?.type === 'static' ? 'Value' : 'Default Value'}
                          value={
                            variable.type === 'object' || variable.type === 'array'
                              ? JSON.stringify(currentValue || variable.defaultValue || (variable.type === 'array' ? [] : {}))
                              : String(currentValue ?? variable.defaultValue ?? '')
                          }
                          onChange={(e) => {
                            let newValue: any = e.target.value;
                            if (variable.type === 'number') {
                              newValue = Number(e.target.value) || 0;
                            } else if (variable.type === 'boolean') {
                              newValue = e.target.value === 'true';
                            } else if (variable.type === 'object' || variable.type === 'array') {
                              try {
                                newValue = JSON.parse(e.target.value);
                              } catch {
                                newValue = e.target.value;
                              }
                            }
                            onVariableValueChange?.(variable.name, newValue);
                            updateVariable(index, { defaultValue: newValue });
                          }}
                          fullWidth
                          type={variable.type === 'number' ? 'number' : 'text'}
                          InputProps={{
                            sx:
                              variable.type === 'object' || variable.type === 'array'
                                ? { fontFamily: 'monospace', fontSize: '0.85rem' }
                                : {}
                          }}
                        />
                      </Box>
                    </Collapse>
                  </Paper>
                );
              })}
            </Box>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
}
