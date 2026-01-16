/**
 * Smart value input component for MongoDB query builder
 * Supports literal values, variable references, and array values
 */

'use client';

import React, { useState, useCallback } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  FormControlLabel,
  Switch,
  Typography,
  useTheme,
  alpha,
} from '@mui/material';
import { Close as CloseIcon, Add as AddIcon } from '@mui/icons-material';
import { VariablePickerButton } from '../../VariablePicker';
import { MongoFilterValue } from './types';

interface ValueInputProps {
  value: MongoFilterValue;
  onChange: (value: MongoFilterValue) => void;
  nodeId: string;
  valueType: 'single' | 'array' | 'boolean' | 'regex';
  placeholder?: string;
  disabled?: boolean;
}

export function ValueInput({
  value,
  onChange,
  nodeId,
  valueType,
  placeholder = 'Enter value...',
  disabled = false,
}: ValueInputProps) {
  const theme = useTheme();
  const [arrayInputValue, setArrayInputValue] = useState('');

  // Handle single value change
  const handleSingleValueChange = useCallback(
    (newValue: string) => {
      // Check if it's a variable reference
      if (newValue.includes('{{') && newValue.includes('}}')) {
        const variablePath = newValue.replace(/^\{\{/, '').replace(/\}\}$/, '');
        onChange({
          type: 'variable',
          value: newValue,
          variablePath,
        });
      } else {
        onChange({
          type: 'literal',
          value: newValue,
        });
      }
    },
    [onChange]
  );

  // Handle variable insertion from picker
  const handleVariableInsert = useCallback(
    (variable: string) => {
      const variablePath = variable.replace(/^\{\{/, '').replace(/\}\}$/, '');
      onChange({
        type: 'variable',
        value: variable,
        variablePath,
      });
    },
    [onChange]
  );

  // Handle boolean toggle
  const handleBooleanChange = useCallback(
    (checked: boolean) => {
      onChange({
        type: 'literal',
        value: checked,
      });
    },
    [onChange]
  );

  // Handle array value add
  const handleAddArrayValue = useCallback(() => {
    if (!arrayInputValue.trim()) return;

    const currentArray = value.arrayValues || [];
    onChange({
      type: 'array',
      value: '',
      arrayValues: [...currentArray, arrayInputValue.trim()],
    });
    setArrayInputValue('');
  }, [arrayInputValue, value.arrayValues, onChange]);

  // Handle array value remove
  const handleRemoveArrayValue = useCallback(
    (index: number) => {
      const currentArray = value.arrayValues || [];
      onChange({
        type: 'array',
        value: '',
        arrayValues: currentArray.filter((_, i) => i !== index),
      });
    },
    [value.arrayValues, onChange]
  );

  // Handle keydown for array input
  const handleArrayKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddArrayValue();
      }
    },
    [handleAddArrayValue]
  );

  // Get display value for single input
  const getDisplayValue = (): string => {
    if (value.type === 'variable') {
      return value.variablePath ? `{{${value.variablePath}}}` : '';
    }
    return String(value.value ?? '');
  };

  // Render based on value type
  if (valueType === 'boolean') {
    const boolValue = value.value === true || value.value === 'true';
    return (
      <FormControlLabel
        control={
          <Switch
            checked={boolValue}
            onChange={(e) => handleBooleanChange(e.target.checked)}
            disabled={disabled}
            size="small"
          />
        }
        label={
          <Typography variant="body2" color="text.secondary">
            {boolValue ? 'Field exists' : 'Field does not exist'}
          </Typography>
        }
        sx={{ ml: 0 }}
      />
    );
  }

  if (valueType === 'array') {
    const arrayValues = value.arrayValues || [];
    return (
      <Box sx={{ flex: 1 }}>
        {/* Array values as chips */}
        {arrayValues.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
            {arrayValues.map((v, index) => (
              <Chip
                key={index}
                label={v}
                size="small"
                onDelete={disabled ? undefined : () => handleRemoveArrayValue(index)}
                deleteIcon={<CloseIcon sx={{ fontSize: 14 }} />}
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '0.8rem',
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                }}
              />
            ))}
          </Box>
        )}

        {/* Add new value input */}
        <TextField
          size="small"
          fullWidth
          value={arrayInputValue}
          onChange={(e) => setArrayInputValue(e.target.value)}
          onKeyDown={handleArrayKeyDown}
          placeholder="Add value and press Enter..."
          disabled={disabled}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={handleAddArrayValue}
                  disabled={disabled || !arrayInputValue.trim()}
                >
                  <AddIcon fontSize="small" />
                </IconButton>
                <VariablePickerButton
                  nodeId={nodeId}
                  onInsert={(variable) => {
                    const currentArray = value.arrayValues || [];
                    onChange({
                      type: 'array',
                      value: '',
                      arrayValues: [...currentArray, variable],
                    });
                  }}
                  disabled={disabled}
                />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiInputBase-input': {
              fontFamily: 'monospace',
              fontSize: '0.85rem',
            },
          }}
        />
      </Box>
    );
  }

  // Single value input (default)
  return (
    <TextField
      size="small"
      fullWidth
      value={getDisplayValue()}
      onChange={(e) => handleSingleValueChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            <VariablePickerButton
              nodeId={nodeId}
              onInsert={handleVariableInsert}
              disabled={disabled}
            />
          </InputAdornment>
        ),
      }}
      sx={{
        flex: 1,
        minWidth: 120,
        '& .MuiInputBase-input': {
          fontFamily: 'monospace',
          fontSize: '0.85rem',
        },
        // Highlight variable references
        ...(value.type === 'variable' && {
          '& .MuiOutlinedInput-root': {
            bgcolor: alpha('#00ED64', 0.05),
            '& fieldset': {
              borderColor: alpha('#00ED64', 0.3),
            },
          },
        }),
      }}
    />
  );
}

export default ValueInput;
