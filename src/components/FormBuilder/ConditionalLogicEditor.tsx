'use client';

import { useState } from 'react';
import {
  Box,
  Typography,
  Select,
  MenuItem,
  TextField,
  IconButton,
  Button,
  FormControl,
  InputLabel,
  Chip,
  alpha,
  Collapse,
  Paper
} from '@mui/material';
import {
  Add,
  Delete,
  ExpandMore,
  ExpandLess
} from '@mui/icons-material';
import {
  FieldConfig,
  ConditionalLogic,
  FieldCondition,
  ConditionOperator
} from '@/types/form';
import {
  getOperatorLabel,
  operatorRequiresValue,
  getOperatorsForType
} from '@/utils/conditionalLogic';
import { HelpButton } from '@/components/Help';
import { ConditionalLogicGenerator } from './ConditionalLogicGenerator';
import { FormVariablePickerButton } from './FormVariablePicker';

interface ConditionalLogicEditorProps {
  config: FieldConfig;
  allFieldConfigs: FieldConfig[];
  onUpdate: (conditionalLogic: ConditionalLogic | undefined) => void;
}

export function ConditionalLogicEditor({
  config,
  allFieldConfigs,
  onUpdate
}: ConditionalLogicEditorProps) {
  const [expanded, setExpanded] = useState(!!config.conditionalLogic);

  // Filter out the current field from available fields
  const availableFields = allFieldConfigs.filter(
    (f) => f.path !== config.path && f.included
  );

  const conditionalLogic = config.conditionalLogic || {
    action: 'show' as const,
    logicType: 'all' as const,
    conditions: []
  };

  const hasConditions = conditionalLogic.conditions.length > 0;

  const handleAddCondition = () => {
    if (availableFields.length === 0) return;

    const firstField = availableFields[0];
    const operators = getOperatorsForType(firstField.type);

    const newCondition: FieldCondition = {
      field: firstField.path,
      operator: operators[0],
      value: ''
    };

    onUpdate({
      ...conditionalLogic,
      conditions: [...conditionalLogic.conditions, newCondition]
    });
  };

  const handleRemoveCondition = (index: number) => {
    const newConditions = conditionalLogic.conditions.filter((_, i) => i !== index);
    if (newConditions.length === 0) {
      onUpdate(undefined);
    } else {
      onUpdate({
        ...conditionalLogic,
        conditions: newConditions
      });
    }
  };

  const handleUpdateCondition = (index: number, updates: Partial<FieldCondition>) => {
    const newConditions = [...conditionalLogic.conditions];
    newConditions[index] = { ...newConditions[index], ...updates };
    onUpdate({
      ...conditionalLogic,
      conditions: newConditions
    });
  };

  const handleFieldChange = (index: number, fieldPath: string) => {
    const fieldConfig = allFieldConfigs.find((f) => f.path === fieldPath);
    const operators = fieldConfig ? getOperatorsForType(fieldConfig.type) : ['equals'];

    handleUpdateCondition(index, {
      field: fieldPath,
      operator: operators[0] as ConditionOperator,
      value: ''
    });
  };

  const getFieldType = (fieldPath: string): string => {
    const fieldConfig = allFieldConfigs.find((f) => f.path === fieldPath);
    return fieldConfig?.type || 'string';
  };

  const clearAllConditions = () => {
    onUpdate(undefined);
    setExpanded(false);
  };

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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
            Conditional Logic
          </Typography>
          <HelpButton topicId="conditional-logic" tooltip="Conditional Logic Help" size="small" />
          {hasConditions && (
            <Chip
              label={`${conditionalLogic.conditions.length} rule${conditionalLogic.conditions.length > 1 ? 's' : ''}`}
              size="small"
              sx={{
                height: 18,
                fontSize: '0.6rem',
                bgcolor: alpha('#00ED64', 0.15),
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
          {availableFields.length === 0 ? (
            <Typography variant="caption" color="text.secondary">
              Include other fields to create conditions
            </Typography>
          ) : (
            <>
              {/* Action and Logic Type */}
              <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center' }}>
                <FormControl size="small" sx={{ minWidth: 80 }}>
                  <Select
                    value={conditionalLogic.action}
                    onChange={(e) =>
                      onUpdate({
                        ...conditionalLogic,
                        action: e.target.value as 'show' | 'hide'
                      })
                    }
                    sx={{ fontSize: '0.75rem' }}
                  >
                    <MenuItem value="show">Show</MenuItem>
                    <MenuItem value="hide">Hide</MenuItem>
                  </Select>
                </FormControl>
                <Typography variant="caption" color="text.secondary">
                  this field when
                </Typography>
                <FormControl size="small" sx={{ minWidth: 70 }}>
                  <Select
                    value={conditionalLogic.logicType}
                    onChange={(e) =>
                      onUpdate({
                        ...conditionalLogic,
                        logicType: e.target.value as 'all' | 'any'
                      })
                    }
                    sx={{ fontSize: '0.75rem' }}
                  >
                    <MenuItem value="all">ALL</MenuItem>
                    <MenuItem value="any">ANY</MenuItem>
                  </Select>
                </FormControl>
                <Typography variant="caption" color="text.secondary">
                  conditions are met:
                </Typography>
              </Box>

              {/* Conditions */}
              {conditionalLogic.conditions.map((condition, index) => {
                const fieldType = getFieldType(condition.field);
                const operators = getOperatorsForType(fieldType);
                const needsValue = operatorRequiresValue(condition.operator);

                return (
                  <Box
                    key={index}
                    sx={{
                      display: 'flex',
                      gap: 1,
                      mb: 1,
                      alignItems: 'center',
                      flexWrap: 'wrap'
                    }}
                  >
                    {/* Field Select */}
                    <FormControl size="small" sx={{ minWidth: 120, flex: 1 }}>
                      <InputLabel sx={{ fontSize: '0.75rem' }}>Field</InputLabel>
                      <Select
                        value={condition.field}
                        label="Field"
                        onChange={(e) => handleFieldChange(index, e.target.value)}
                        sx={{ fontSize: '0.75rem' }}
                      >
                        {availableFields.map((f) => (
                          <MenuItem key={f.path} value={f.path}>
                            {f.path}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    {/* Operator Select */}
                    <FormControl size="small" sx={{ minWidth: 130 }}>
                      <InputLabel sx={{ fontSize: '0.75rem' }}>Operator</InputLabel>
                      <Select
                        value={condition.operator}
                        label="Operator"
                        onChange={(e) =>
                          handleUpdateCondition(index, {
                            operator: e.target.value as ConditionOperator
                          })
                        }
                        sx={{ fontSize: '0.75rem' }}
                      >
                        {operators.map((op) => (
                          <MenuItem key={op} value={op}>
                            {getOperatorLabel(op)}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    {/* Value Input */}
                    {needsValue && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1, minWidth: 100 }}>
                        <TextField
                          size="small"
                          label="Value"
                          value={condition.value || ''}
                          onChange={(e) =>
                            handleUpdateCondition(index, { value: e.target.value })
                          }
                          sx={{ flex: 1 }}
                          InputProps={{ sx: { fontSize: '0.75rem' } }}
                          InputLabelProps={{ sx: { fontSize: '0.75rem' } }}
                        />
                        <FormVariablePickerButton
                          fieldConfigs={availableFields}
                          context="condition"
                          onInsert={(value) => {
                            handleUpdateCondition(index, { value: (condition.value || '') + value });
                          }}
                        />
                      </Box>
                    )}

                    {/* Delete Button */}
                    <IconButton
                      size="small"
                      onClick={() => handleRemoveCondition(index)}
                      sx={{ color: 'error.main' }}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                );
              })}

              {/* Add/Clear Buttons */}
              <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                <Button
                  size="small"
                  startIcon={<Add />}
                  onClick={handleAddCondition}
                  sx={{ fontSize: '0.7rem' }}
                >
                  Add Condition
                </Button>
                {hasConditions && (
                  <Button
                    size="small"
                    color="error"
                    onClick={clearAllConditions}
                    sx={{ fontSize: '0.7rem' }}
                  >
                    Clear All
                  </Button>
                )}
              </Box>

              {/* AI Generator */}
              <ConditionalLogicGenerator
                availableFields={availableFields}
                onLogicGenerated={(logic) => {
                  onUpdate(logic);
                }}
                defaultAction={conditionalLogic.action}
              />
            </>
          )}
        </Paper>
      </Collapse>
    </Box>
  );
}
