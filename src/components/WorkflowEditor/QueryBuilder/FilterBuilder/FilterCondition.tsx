/**
 * Single filter condition component
 * Renders field input, operator selector, and value input in a compact stacked layout
 */

'use client';

import React from 'react';
import {
  Box,
  Paper,
  TextField,
  Select,
  MenuItem,
  FormControl,
  IconButton,
  Chip,
  Typography,
  useTheme,
  alpha,
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { MongoFilterCondition, MongoComparisonOperator } from '../shared/types';
import { MONGO_OPERATORS, getOperatorDef } from './operators';
import { ValueInput } from '../shared/ValueInput';

interface FilterConditionProps {
  condition: MongoFilterCondition;
  index: number;
  onChange: (updates: Partial<MongoFilterCondition>) => void;
  onDelete: () => void;
  nodeId: string;
  disabled?: boolean;
}

export function FilterCondition({
  condition,
  index,
  onChange,
  onDelete,
  nodeId,
  disabled = false,
}: FilterConditionProps) {
  const theme = useTheme();
  const operatorDef = getOperatorDef(condition.operator);

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1,
        bgcolor: alpha(theme.palette.background.paper, 0.5),
        opacity: condition.enabled ? 1 : 0.5,
      }}
    >
      {/* Header row with number and delete */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Chip
          label={index + 1}
          size="small"
          sx={{
            minWidth: 24,
            height: 24,
            fontWeight: 600,
            fontSize: '0.75rem',
            bgcolor: alpha(theme.palette.primary.main, 0.1),
          }}
        />
        <IconButton
          size="small"
          onClick={onDelete}
          disabled={disabled}
          sx={{ color: 'error.main', p: 0.5 }}
        >
          <DeleteIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      {/* Field and operator row */}
      <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
        <TextField
          size="small"
          placeholder="field"
          value={condition.field}
          onChange={(e) => onChange({ field: e.target.value })}
          disabled={disabled}
          sx={{
            flex: 1,
            '& .MuiInputBase-input': {
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              py: 0.75,
            },
          }}
        />
        <FormControl size="small" sx={{ minWidth: 100 }}>
          <Select
            value={condition.operator}
            onChange={(e) =>
              onChange({ operator: e.target.value as MongoComparisonOperator })
            }
            disabled={disabled}
            sx={{ '& .MuiSelect-select': { py: 0.75 } }}
          >
            {Object.entries(MONGO_OPERATORS).map(([key, def]) => (
              <MenuItem key={key} value={key}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography sx={{ fontFamily: 'monospace', fontSize: 12, width: 16 }}>
                    {def.symbol}
                  </Typography>
                  <Typography variant="caption">{def.label}</Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Value row */}
      {operatorDef.requiresValue && (
        <ValueInput
          value={condition.value}
          onChange={(value) => onChange({ value })}
          nodeId={nodeId}
          valueType={operatorDef.valueType}
          placeholder={operatorDef.valueType === 'regex' ? 'pattern...' : 'value...'}
          disabled={disabled}
        />
      )}
    </Paper>
  );
}

export default FilterCondition;
