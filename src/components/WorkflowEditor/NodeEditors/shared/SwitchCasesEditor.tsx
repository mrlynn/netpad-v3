/**
 * Component for managing switch node cases
 * Extracted from NodeConfigPanel
 */

'use client';

import React from 'react';
import { Box, TextField, IconButton, Button, Typography } from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { SwitchCase } from './utils';

interface SwitchCasesEditorProps {
  cases: SwitchCase[];
  onChange: (cases: SwitchCase[]) => void;
}

export function SwitchCasesEditor({ cases, onChange }: SwitchCasesEditorProps) {
  const addCase = () => {
    onChange([...cases, { value: '', label: '' }]);
  };

  const updateCase = (index: number, field: 'value' | 'label', newValue: string) => {
    const newCases = [...cases];
    newCases[index] = { ...newCases[index], [field]: newValue };
    onChange(newCases);
  };

  const removeCase = (index: number) => {
    onChange(cases.filter((_, i) => i !== index));
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
        Switch Cases
      </Typography>
      {cases.map((caseItem, index) => (
        <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Value to match"
            value={caseItem.value}
            onChange={(e) => updateCase(index, 'value', e.target.value)}
            sx={{ flex: 1 }}
          />
          <TextField
            size="small"
            placeholder="Label (optional)"
            value={caseItem.label || ''}
            onChange={(e) => updateCase(index, 'label', e.target.value)}
            sx={{ flex: 1 }}
          />
          <IconButton size="small" onClick={() => removeCase(index)} color="error">
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ))}
      <Button
        size="small"
        onClick={addCase}
        variant="outlined"
        sx={{ mt: 1 }}
      >
        + Add Case
      </Button>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
        A "Default" output is always added automatically for unmatched values.
      </Typography>
    </Box>
  );
}
