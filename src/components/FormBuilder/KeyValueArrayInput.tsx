'use client';

import { useState } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  alpha,
  Tooltip,
  Chip
} from '@mui/material';
import { Add, Delete, DragIndicator } from '@mui/icons-material';
import { ArrayPatternConfig } from '@/types/form';

interface KeyValuePair {
  [key: string]: any;
}

interface KeyValueArrayInputProps {
  label: string;
  value: KeyValuePair[];
  onChange: (value: KeyValuePair[]) => void;
  config?: ArrayPatternConfig;
  disabled?: boolean;
}

export function KeyValueArrayInput({
  label,
  value,
  onChange,
  config,
  disabled = false
}: KeyValueArrayInputProps) {
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  const keyField = config?.keyField || 'key';
  const valueField = config?.valueField || 'value';
  const keyLabel = config?.keyLabel || 'Key';
  const valueLabel = config?.valueLabel || 'Value';
  const valueType = config?.valueType || 'mixed';

  const arrayValue = Array.isArray(value) ? value : [];

  const handleAddPair = () => {
    if (!newKey.trim()) return;

    let parsedValue: any = newValue;
    if (valueType === 'number') {
      parsedValue = parseFloat(newValue) || 0;
    } else if (valueType === 'boolean') {
      parsedValue = newValue.toLowerCase() === 'true';
    }

    const newPair = {
      [keyField]: newKey.trim(),
      [valueField]: parsedValue
    };

    onChange([...arrayValue, newPair]);
    setNewKey('');
    setNewValue('');
  };

  const handleRemovePair = (index: number) => {
    const newArray = arrayValue.filter((_, i) => i !== index);
    onChange(newArray);
  };

  const handleUpdatePair = (index: number, field: 'key' | 'value', newFieldValue: string) => {
    const newArray = [...arrayValue];
    const targetField = field === 'key' ? keyField : valueField;

    let parsedValue: any = newFieldValue;
    if (field === 'value') {
      if (valueType === 'number') {
        parsedValue = parseFloat(newFieldValue) || 0;
      } else if (valueType === 'boolean') {
        parsedValue = newFieldValue.toLowerCase() === 'true';
      }
    }

    newArray[index] = {
      ...newArray[index],
      [targetField]: parsedValue
    };
    onChange(newArray);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddPair();
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Chip
          label="Key-Value"
          size="small"
          sx={{
            height: 20,
            fontSize: '0.65rem',
            bgcolor: alpha('#9c27b0', 0.1),
            color: '#9c27b0',
          }}
        />
        <Typography variant="caption" color="text.secondary">
          {arrayValue.length} {arrayValue.length === 1 ? 'item' : 'items'}
        </Typography>
      </Box>

      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          mb: 2
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: alpha('#9c27b0', 0.05) }}>
              <TableCell sx={{ width: 40, p: 1 }}></TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#9c27b0' }}>{keyLabel}</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#9c27b0' }}>{valueLabel}</TableCell>
              <TableCell sx={{ width: 50 }}></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {arrayValue.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                  <Typography variant="body2">No attributes defined</Typography>
                  <Typography variant="caption">Add key-value pairs below</Typography>
                </TableCell>
              </TableRow>
            ) : (
              arrayValue.map((pair, index) => (
                <TableRow
                  key={index}
                  sx={{
                    '&:hover': { bgcolor: alpha('#9c27b0', 0.02) },
                    '&:last-child td': { borderBottom: 0 }
                  }}
                >
                  <TableCell sx={{ p: 1 }}>
                    <DragIndicator
                      fontSize="small"
                      sx={{ color: 'text.disabled', cursor: 'grab' }}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      value={pair[keyField] || ''}
                      onChange={(e) => handleUpdatePair(index, 'key', e.target.value)}
                      disabled={disabled}
                      variant="standard"
                      fullWidth
                      sx={{
                        '& .MuiInput-underline:before': { borderBottom: 'none' },
                        '& .MuiInput-underline:hover:before': {
                          borderBottom: '1px solid',
                          borderColor: 'divider'
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      value={pair[valueField] ?? ''}
                      onChange={(e) => handleUpdatePair(index, 'value', e.target.value)}
                      disabled={disabled}
                      variant="standard"
                      fullWidth
                      type={valueType === 'number' ? 'number' : 'text'}
                      sx={{
                        '& .MuiInput-underline:before': { borderBottom: 'none' },
                        '& .MuiInput-underline:hover:before': {
                          borderBottom: '1px solid',
                          borderColor: 'divider'
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Remove">
                      <IconButton
                        size="small"
                        onClick={() => handleRemovePair(index)}
                        disabled={disabled}
                        sx={{
                          color: 'text.secondary',
                          '&:hover': { color: 'error.main' }
                        }}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}

            {/* Add new row */}
            <TableRow sx={{ bgcolor: alpha('#00ED64', 0.03) }}>
              <TableCell sx={{ p: 1 }}>
                <Add fontSize="small" sx={{ color: '#00ED64' }} />
              </TableCell>
              <TableCell>
                <TextField
                  size="small"
                  placeholder={`New ${keyLabel.toLowerCase()}`}
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={disabled}
                  variant="standard"
                  fullWidth
                  sx={{
                    '& .MuiInput-underline:before': {
                      borderBottom: '1px dashed',
                      borderColor: alpha('#00ED64', 0.3)
                    }
                  }}
                />
              </TableCell>
              <TableCell>
                <TextField
                  size="small"
                  placeholder={`New ${valueLabel.toLowerCase()}`}
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={disabled}
                  variant="standard"
                  fullWidth
                  type={valueType === 'number' ? 'number' : 'text'}
                  sx={{
                    '& .MuiInput-underline:before': {
                      borderBottom: '1px dashed',
                      borderColor: alpha('#00ED64', 0.3)
                    }
                  }}
                />
              </TableCell>
              <TableCell>
                <Tooltip title="Add">
                  <span>
                    <IconButton
                      size="small"
                      onClick={handleAddPair}
                      disabled={disabled || !newKey.trim()}
                      sx={{
                        color: newKey.trim() ? '#00ED64' : 'text.disabled'
                      }}
                    >
                      <Add fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="caption" color="text.secondary">
        Press Enter to add a new attribute, or click the + button
      </Typography>
    </Box>
  );
}
