'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Autocomplete,
  TextField,
  Chip,
  Box,
  Typography,
  alpha
} from '@mui/material';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import { FieldConfig, LookupConfig } from '@/types/form';
import { usePipeline } from '@/contexts/PipelineContext';

interface LookupOption {
  value: any;
  label: string;
  raw: Record<string, any>;
}

interface LookupFieldInputProps {
  config: FieldConfig;
  value: any;
  onChange: (value: any) => void;
  formData: Record<string, any>;
}

export function LookupFieldInput({
  config,
  value,
  onChange,
  formData
}: LookupFieldInputProps) {
  const { connectionString, databaseName } = usePipeline();
  const [options, setOptions] = useState<LookupOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');

  const lookup = config.lookup as LookupConfig;

  // Get filter value from form data if cascading is configured
  const filterValue = useMemo(() => {
    if (lookup.filterSourceField) {
      return getNestedValue(formData, lookup.filterSourceField);
    }
    return undefined;
  }, [formData, lookup.filterSourceField]);

  // Fetch options when component mounts or filter changes
  useEffect(() => {
    if (!connectionString || !databaseName || !lookup.collection) {
      return;
    }

    // If preload is disabled and searchable, wait for user input
    if (!lookup.preloadOptions && lookup.searchable && inputValue.length < 2) {
      return;
    }

    fetchOptions();
  }, [connectionString, databaseName, lookup.collection, filterValue, inputValue]);

  const fetchOptions = async () => {
    setLoading(true);
    setError(null);

    try {
      // Build a simple aggregation to fetch options
      const pipeline: any[] = [];

      // Apply filter if cascading
      if (lookup.filterField && filterValue !== undefined) {
        pipeline.push({
          $match: { [lookup.filterField]: filterValue }
        });
      }

      // Apply search filter if searchable
      if (lookup.searchable && inputValue.length >= 2) {
        pipeline.push({
          $match: {
            [lookup.displayField]: {
              $regex: inputValue,
              $options: 'i'
            }
          }
        });
      }

      // Project only the fields we need
      pipeline.push({
        $project: {
          _id: 1,
          [lookup.displayField]: 1,
          [lookup.valueField]: 1
        }
      });

      // Limit results
      pipeline.push({ $limit: 100 });

      const response = await fetch('/api/mongodb/execute-pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionString,
          databaseName,
          collection: lookup.collection,
          pipeline
        })
      });

      const data = await response.json();

      if (data.success && data.results) {
        const fetchedOptions: LookupOption[] = data.results.map((doc: any) => ({
          value: getNestedValue(doc, lookup.valueField) ?? doc._id,
          label: String(getNestedValue(doc, lookup.displayField) ?? doc._id),
          raw: doc
        }));
        setOptions(fetchedOptions);
      } else {
        setError(data.error || 'Failed to fetch options');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch options');
    } finally {
      setLoading(false);
    }
  };

  // Find current selection(s) in options
  const selectedValue = useMemo(() => {
    if (lookup.multiple) {
      const values = Array.isArray(value) ? value : [];
      return options.filter((opt) => values.includes(opt.value));
    }
    return options.find((opt) => opt.value === value) || null;
  }, [value, options, lookup.multiple]);

  const handleChange = (_event: any, newValue: LookupOption | LookupOption[] | null) => {
    if (lookup.multiple) {
      onChange((newValue as LookupOption[])?.map((v) => v.value) || []);
    } else {
      onChange((newValue as LookupOption)?.value || null);
    }
  };

  return (
    <Box>
      <Autocomplete
        multiple={lookup.multiple}
        options={options}
        loading={loading}
        value={selectedValue}
        onChange={handleChange}
        inputValue={inputValue}
        onInputChange={(_event, newInputValue) => {
          setInputValue(newInputValue);
        }}
        getOptionLabel={(option) => option.label}
        isOptionEqualToValue={(option, val) => option.value === val.value}
        renderInput={(params) => (
          <TextField
            {...params}
            label={config.label}
            placeholder={config.placeholder || `Select ${config.label}...`}
            required={config.required}
            error={!!error}
            helperText={error || `From: ${lookup.collection}`}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading ? <NetPadLoader size="small" variant="svg" showPhrases={false} /> : null}
                  {params.InputProps.endAdornment}
                </>
              )
            }}
          />
        )}
        renderOption={(props, option) => (
          <li {...props} key={option.value}>
            <Box>
              <Typography variant="body2">{option.label}</Typography>
              <Typography variant="caption" color="text.secondary">
                {lookup.valueField}: {String(option.value)}
              </Typography>
            </Box>
          </li>
        )}
        renderTags={(tagValue, getTagProps) =>
          tagValue.map((option, index) => (
            <Chip
              {...getTagProps({ index })}
              key={option.value}
              label={option.label}
              size="small"
              sx={{
                bgcolor: alpha('#00ED64', 0.1),
                '& .MuiChip-deleteIcon': {
                  color: alpha('#00ED64', 0.7)
                }
              }}
            />
          ))
        }
        noOptionsText={
          lookup.searchable && inputValue.length < 2
            ? 'Type to search...'
            : 'No options found'
        }
      />
    </Box>
  );
}

// Helper to get nested value
function getNestedValue(obj: Record<string, any>, path: string): any {
  const keys = path.split('.');
  let value: any = obj;
  for (const key of keys) {
    if (value && typeof value === 'object') {
      value = value[key];
    } else {
      return undefined;
    }
  }
  return value;
}
