'use client';

import React, { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
  Chip,
  Autocomplete,
  useTheme,
  alpha,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon,
} from '@mui/icons-material';

// Condition operators
export type ConditionOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'greaterThan'
  | 'lessThan'
  | 'greaterOrEqual'
  | 'lessOrEqual'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'isTrue'
  | 'isFalse'
  | 'matches';  // Regex

// Single condition
export interface Condition {
  id: string;
  field: string;
  operator: ConditionOperator;
  value?: string | number | boolean;
}

// Condition group with AND/OR logic
export interface ConditionGroup {
  id: string;
  logic: 'and' | 'or';
  conditions: Condition[];
}

interface ConditionBuilderProps {
  conditions: ConditionGroup;
  onChange: (conditions: ConditionGroup) => void;
  availableFields?: { path: string; label: string; type: string }[];
}

// Operator display info
const OPERATORS: Record<ConditionOperator, { label: string; description: string; requiresValue: boolean }> = {
  equals: { label: '=', description: 'Equals', requiresValue: true },
  notEquals: { label: '≠', description: 'Not equals', requiresValue: true },
  contains: { label: '∋', description: 'Contains', requiresValue: true },
  notContains: { label: '∌', description: 'Does not contain', requiresValue: true },
  startsWith: { label: 'a...', description: 'Starts with', requiresValue: true },
  endsWith: { label: '...z', description: 'Ends with', requiresValue: true },
  greaterThan: { label: '>', description: 'Greater than', requiresValue: true },
  lessThan: { label: '<', description: 'Less than', requiresValue: true },
  greaterOrEqual: { label: '≥', description: 'Greater or equal', requiresValue: true },
  lessOrEqual: { label: '≤', description: 'Less or equal', requiresValue: true },
  isEmpty: { label: '∅', description: 'Is empty', requiresValue: false },
  isNotEmpty: { label: '!∅', description: 'Is not empty', requiresValue: false },
  isTrue: { label: '✓', description: 'Is true', requiresValue: false },
  isFalse: { label: '✗', description: 'Is false', requiresValue: false },
  matches: { label: '/./', description: 'Matches regex', requiresValue: true },
};

// Generate unique ID
function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

// Convert condition group to JavaScript expression
export function conditionGroupToExpression(group: ConditionGroup): string {
  if (group.conditions.length === 0) return 'true';

  const expressions = group.conditions.map(conditionToExpression);
  const joiner = group.logic === 'and' ? ' && ' : ' || ';
  return expressions.join(joiner);
}

function conditionToExpression(condition: Condition): string {
  const field = condition.field || 'data.field';
  const value = typeof condition.value === 'string' ? `"${condition.value}"` : condition.value;

  switch (condition.operator) {
    case 'equals':
      return `${field} === ${value}`;
    case 'notEquals':
      return `${field} !== ${value}`;
    case 'contains':
      return `${field}?.includes(${value})`;
    case 'notContains':
      return `!${field}?.includes(${value})`;
    case 'startsWith':
      return `${field}?.startsWith(${value})`;
    case 'endsWith':
      return `${field}?.endsWith(${value})`;
    case 'greaterThan':
      return `${field} > ${value}`;
    case 'lessThan':
      return `${field} < ${value}`;
    case 'greaterOrEqual':
      return `${field} >= ${value}`;
    case 'lessOrEqual':
      return `${field} <= ${value}`;
    case 'isEmpty':
      return `!${field} || ${field}.length === 0`;
    case 'isNotEmpty':
      return `${field} && ${field}.length > 0`;
    case 'isTrue':
      return `${field} === true`;
    case 'isFalse':
      return `${field} === false`;
    case 'matches':
      return `new RegExp(${value}).test(${field})`;
    default:
      return 'true';
  }
}

// Parse expression back to condition group (simplified)
export function expressionToConditionGroup(expression: string): ConditionGroup | null {
  // This is a simplified parser - real implementation would be more complex
  // For now, just create a default group
  return {
    id: generateId(),
    logic: 'and',
    conditions: [],
  };
}

export function ConditionBuilder({ conditions, onChange, availableFields = [] }: ConditionBuilderProps) {
  const theme = useTheme();

  // Add new condition
  const addCondition = useCallback(() => {
    const newCondition: Condition = {
      id: generateId(),
      field: '',
      operator: 'equals',
      value: '',
    };
    onChange({
      ...conditions,
      conditions: [...conditions.conditions, newCondition],
    });
  }, [conditions, onChange]);

  // Update condition
  const updateCondition = useCallback((id: string, updates: Partial<Condition>) => {
    onChange({
      ...conditions,
      conditions: conditions.conditions.map(c =>
        c.id === id ? { ...c, ...updates } : c
      ),
    });
  }, [conditions, onChange]);

  // Remove condition
  const removeCondition = useCallback((id: string) => {
    onChange({
      ...conditions,
      conditions: conditions.conditions.filter(c => c.id !== id),
    });
  }, [conditions, onChange]);

  // Toggle logic (AND/OR)
  const toggleLogic = useCallback((newLogic: 'and' | 'or') => {
    if (newLogic) {
      onChange({ ...conditions, logic: newLogic });
    }
  }, [conditions, onChange]);

  return (
    <Box>
      {/* Logic toggle */}
      {conditions.conditions.length > 1 && (
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Match
          </Typography>
          <ToggleButtonGroup
            value={conditions.logic}
            exclusive
            onChange={(_, value) => toggleLogic(value)}
            size="small"
          >
            <ToggleButton value="and" sx={{ px: 2 }}>
              ALL
            </ToggleButton>
            <ToggleButton value="or" sx={{ px: 2 }}>
              ANY
            </ToggleButton>
          </ToggleButtonGroup>
          <Typography variant="body2" color="text.secondary">
            of the following:
          </Typography>
        </Box>
      )}

      {/* Condition list */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {conditions.conditions.map((condition, index) => (
          <Paper
            key={condition.id}
            variant="outlined"
            sx={{
              p: 1.5,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 1,
              bgcolor: alpha(theme.palette.background.paper, 0.5),
            }}
          >
            {/* Condition number */}
            <Chip
              label={index + 1}
              size="small"
              sx={{
                minWidth: 28,
                height: 28,
                fontWeight: 600,
                bgcolor: alpha(theme.palette.primary.main, 0.1),
              }}
            />

            {/* Field selector */}
            <Autocomplete
              freeSolo
              size="small"
              sx={{ flex: 1, minWidth: 150 }}
              options={availableFields.map(f => f.path)}
              value={condition.field}
              onChange={(_, value) => updateCondition(condition.id, { field: value || '' })}
              onInputChange={(_, value) => updateCondition(condition.id, { field: value })}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Select field..."
                  size="small"
                  sx={{
                    '& .MuiInputBase-input': {
                      fontFamily: 'monospace',
                      fontSize: '0.85rem',
                    },
                  }}
                />
              )}
              renderOption={(props, option) => {
                const field = availableFields.find(f => f.path === option);
                return (
                  <li {...props}>
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {field?.label || option}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                        {option}
                      </Typography>
                    </Box>
                  </li>
                );
              }}
            />

            {/* Operator selector */}
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <Select
                value={condition.operator}
                onChange={(e) => updateCondition(condition.id, { operator: e.target.value as ConditionOperator })}
              >
                {Object.entries(OPERATORS).map(([key, op]) => (
                  <MenuItem key={key} value={key}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography sx={{ fontFamily: 'monospace', fontSize: 14, width: 24 }}>
                        {op.label}
                      </Typography>
                      <Typography variant="body2">
                        {op.description}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Value input */}
            {OPERATORS[condition.operator]?.requiresValue && (
              <TextField
                size="small"
                placeholder="Value..."
                value={condition.value ?? ''}
                onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
                sx={{
                  flex: 1,
                  minWidth: 120,
                  '& .MuiInputBase-input': {
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                  },
                }}
              />
            )}

            {/* Delete button */}
            <IconButton
              size="small"
              onClick={() => removeCondition(condition.id)}
              sx={{ color: 'error.main' }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Paper>
        ))}
      </Box>

      {/* Add condition button */}
      <Button
        startIcon={<AddIcon />}
        onClick={addCondition}
        sx={{ mt: 2 }}
        variant="outlined"
        size="small"
      >
        Add Condition
      </Button>

      {/* Preview expression */}
      {conditions.conditions.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            Generated Expression:
          </Typography>
          <Paper
            variant="outlined"
            sx={{
              p: 1,
              bgcolor: alpha(theme.palette.grey[900], theme.palette.mode === 'dark' ? 0.3 : 0.05),
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              overflowX: 'auto',
            }}
          >
            {conditionGroupToExpression(conditions)}
          </Paper>
        </Box>
      )}
    </Box>
  );
}

export default ConditionBuilder;
