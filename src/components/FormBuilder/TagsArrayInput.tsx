'use client';

import { useState, KeyboardEvent } from 'react';
import {
  Box,
  TextField,
  Chip,
  Typography,
  Paper,
  Autocomplete,
  alpha
} from '@mui/material';
import { ArrayPatternConfig } from '@/types/form';

interface TagsArrayInputProps {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  config?: ArrayPatternConfig;
  disabled?: boolean;
  placeholder?: string;
}

export function TagsArrayInput({
  label,
  value,
  onChange,
  config,
  disabled = false,
  placeholder = 'Type and press Enter to add'
}: TagsArrayInputProps) {
  const [inputValue, setInputValue] = useState('');

  const arrayValue = Array.isArray(value) ? value : [];
  const suggestions = config?.suggestions || [];
  const allowCustom = config?.allowCustom !== false; // Default true

  const handleAddTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !arrayValue.includes(trimmedTag)) {
      onChange([...arrayValue, trimmedTag]);
    }
    setInputValue('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onChange(arrayValue.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      handleAddTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && arrayValue.length > 0) {
      // Remove last tag when backspace on empty input
      handleRemoveTag(arrayValue[arrayValue.length - 1]);
    }
  };

  // Filter suggestions to exclude already selected tags
  const availableSuggestions = suggestions.filter((s) => !arrayValue.includes(s));

  if (suggestions.length > 0) {
    // Use Autocomplete for suggestions
    return (
      <Box>
        <Autocomplete
          multiple
          freeSolo={allowCustom}
          options={availableSuggestions}
          value={arrayValue}
          onChange={(_, newValue) => {
            onChange(newValue as string[]);
          }}
          inputValue={inputValue}
          onInputChange={(_, newInputValue) => {
            setInputValue(newInputValue);
          }}
          disabled={disabled}
          renderTags={(tagValues, getTagProps) =>
            tagValues.map((option, index) => {
              const { key, ...tagProps } = getTagProps({ index });
              return (
                <Chip
                  key={key}
                  label={option}
                  {...tagProps}
                  size="small"
                  sx={{
                    bgcolor: alpha('#00ED64', 0.1),
                    color: '#00844a',
                    '& .MuiChip-deleteIcon': {
                      color: '#00844a',
                      '&:hover': { color: '#006638' }
                    }
                  }}
                />
              );
            })
          }
          renderInput={(params) => (
            <TextField
              {...params}
              size="small"
              placeholder={arrayValue.length === 0 ? placeholder : 'Add more...'}
              helperText={
                allowCustom
                  ? 'Type to search or add custom tags'
                  : 'Select from suggestions'
              }
            />
          )}
        />
      </Box>
    );
  }

  // Simple input without autocomplete
  return (
    <Box>
      <Paper
        elevation={0}
        sx={{
          p: 1.5,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 0.5,
          alignItems: 'center',
          minHeight: 48,
          cursor: disabled ? 'not-allowed' : 'text',
          '&:focus-within': {
            borderColor: '#00ED64',
            boxShadow: `0 0 0 2px ${alpha('#00ED64', 0.2)}`
          }
        }}
        onClick={() => {
          // Focus the input when clicking the paper
          const input = document.getElementById(`tags-input-${label}`);
          input?.focus();
        }}
      >
        {arrayValue.map((tag, index) => (
          <Chip
            key={index}
            label={tag}
            onDelete={disabled ? undefined : () => handleRemoveTag(tag)}
            size="small"
            sx={{
              bgcolor: alpha('#00ED64', 0.1),
              color: '#00844a',
              '& .MuiChip-deleteIcon': {
                color: '#00844a',
                '&:hover': { color: '#006638' }
              }
            }}
          />
        ))}

        <TextField
          id={`tags-input-${label}`}
          size="small"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={arrayValue.length === 0 ? placeholder : ''}
          variant="standard"
          sx={{
            flex: 1,
            minWidth: 120,
            '& .MuiInput-underline:before': { borderBottom: 'none' },
            '& .MuiInput-underline:after': { borderBottom: 'none' },
            '& .MuiInput-underline:hover:before': { borderBottom: 'none !important' }
          }}
          InputProps={{
            disableUnderline: true
          }}
        />
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
        <Typography variant="caption" color="text.secondary">
          Press Enter to add, Backspace to remove
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {arrayValue.length} {arrayValue.length === 1 ? 'tag' : 'tags'}
        </Typography>
      </Box>
    </Box>
  );
}
