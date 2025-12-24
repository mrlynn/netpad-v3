'use client';

/**
 * File Upload Step
 * First step in the import wizard - select and upload file
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Button,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Paper,
  Chip,
  Stack,
  Alert,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Description as FileIcon,
  TableChart as CsvIcon,
  DataObject as JsonIcon,
} from '@mui/icons-material';
import { ImportSourceConfig, ImportFileFormat, DelimiterType } from '@/types/dataImport';

interface FileUploadStepProps {
  defaultCollection?: string;
  sourceConfig: ImportSourceConfig;
  onUpload: (file: File, config: ImportSourceConfig, collection: string) => void;
  loading?: boolean;
}

const SUPPORTED_FORMATS: { format: ImportFileFormat; label: string; extensions: string[]; icon: React.ReactNode }[] = [
  { format: 'csv', label: 'CSV', extensions: ['.csv'], icon: <CsvIcon /> },
  { format: 'tsv', label: 'TSV', extensions: ['.tsv', '.tab'], icon: <CsvIcon /> },
  { format: 'json', label: 'JSON', extensions: ['.json'], icon: <JsonIcon /> },
  { format: 'jsonl', label: 'JSON Lines', extensions: ['.jsonl', '.ndjson'], icon: <JsonIcon /> },
  { format: 'xlsx', label: 'Excel', extensions: ['.xlsx', '.xls'], icon: <FileIcon /> },
];

const DELIMITERS: { value: DelimiterType; label: string }[] = [
  { value: ',', label: 'Comma (,)' },
  { value: '\t', label: 'Tab' },
  { value: ';', label: 'Semicolon (;)' },
  { value: '|', label: 'Pipe (|)' },
  { value: 'custom', label: 'Custom' },
];

export function FileUploadStep({
  defaultCollection,
  sourceConfig: initialConfig,
  onUpload,
  loading,
}: FileUploadStepProps) {
  const [file, setFile] = useState<File | null>(null);
  const [collectionName, setCollectionName] = useState(defaultCollection || '');
  const [config, setConfig] = useState<ImportSourceConfig>(initialConfig);
  const [customDelimiter, setCustomDelimiter] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);

    // Auto-detect format from extension
    const extension = selectedFile.name.split('.').pop()?.toLowerCase();
    const format = SUPPORTED_FORMATS.find(f =>
      f.extensions.some(ext => ext.slice(1) === extension)
    );

    if (format) {
      setConfig(prev => ({
        ...prev,
        format: format.format,
        delimiter: format.format === 'tsv' ? '\t' : prev.delimiter,
      }));
    }

    // Suggest collection name from file name
    if (!collectionName) {
      const baseName = selectedFile.name.replace(/\.[^.]+$/, '');
      const cleanName = baseName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
      setCollectionName(cleanName);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleSubmit = () => {
    if (!file || !collectionName) return;

    const finalConfig = {
      ...config,
      customDelimiter: config.delimiter === 'custom' ? customDelimiter : undefined,
    };

    onUpload(file, finalConfig, collectionName);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Box>
      {/* Drop zone */}
      <Paper
        variant="outlined"
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        sx={{
          p: 4,
          textAlign: 'center',
          cursor: 'pointer',
          bgcolor: dragActive ? 'action.hover' : 'background.paper',
          borderStyle: 'dashed',
          borderColor: dragActive ? 'primary.main' : 'divider',
          transition: 'all 0.2s',
          '&:hover': {
            bgcolor: 'action.hover',
            borderColor: 'primary.main',
          },
        }}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <input
          id="file-input"
          type="file"
          accept=".csv,.tsv,.json,.jsonl,.ndjson,.xlsx,.xls"
          onChange={handleInputChange}
          style={{ display: 'none' }}
        />
        <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          {file ? file.name : 'Drop your file here or click to browse'}
        </Typography>
        {file ? (
          <Stack direction="row" spacing={1} justifyContent="center">
            <Chip label={formatFileSize(file.size)} size="small" />
            <Chip
              label={config.format.toUpperCase()}
              size="small"
              color="primary"
            />
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Supported formats: CSV, TSV, JSON, JSONL, Excel (.xlsx, .xls)
          </Typography>
        )}
      </Paper>

      {/* Configuration */}
      {file && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" gutterBottom fontWeight={500}>
            Import Settings
          </Typography>

          <Stack spacing={2}>
            {/* Collection name */}
            <TextField
              label="Collection Name"
              value={collectionName}
              onChange={(e) => setCollectionName(e.target.value)}
              fullWidth
              required
              helperText="The MongoDB collection where data will be imported"
              error={!collectionName}
            />

            {/* Format selection */}
            <FormControl fullWidth>
              <InputLabel>File Format</InputLabel>
              <Select
                value={config.format}
                label="File Format"
                onChange={(e) =>
                  setConfig(prev => ({
                    ...prev,
                    format: e.target.value as ImportFileFormat,
                  }))
                }
              >
                {SUPPORTED_FORMATS.map(f => (
                  <MenuItem key={f.format} value={f.format}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {f.icon}
                      <span>{f.label}</span>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* CSV/TSV specific options */}
            {['csv', 'tsv'].includes(config.format) && (
              <>
                <FormControl fullWidth>
                  <InputLabel>Delimiter</InputLabel>
                  <Select
                    value={config.delimiter}
                    label="Delimiter"
                    onChange={(e) =>
                      setConfig(prev => ({
                        ...prev,
                        delimiter: e.target.value as DelimiterType,
                      }))
                    }
                  >
                    {DELIMITERS.map(d => (
                      <MenuItem key={d.value} value={d.value}>
                        {d.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {config.delimiter === 'custom' && (
                  <TextField
                    label="Custom Delimiter"
                    value={customDelimiter}
                    onChange={(e) => setCustomDelimiter(e.target.value)}
                    helperText="Enter a single character"
                    inputProps={{ maxLength: 1 }}
                  />
                )}

                <FormControlLabel
                  control={
                    <Switch
                      checked={config.hasHeader !== false}
                      onChange={(e) =>
                        setConfig(prev => ({
                          ...prev,
                          hasHeader: e.target.checked,
                        }))
                      }
                    />
                  }
                  label="First row contains headers"
                />

                <TextField
                  label="Skip Rows"
                  type="number"
                  value={config.skipRows || 0}
                  onChange={(e) =>
                    setConfig(prev => ({
                      ...prev,
                      skipRows: parseInt(e.target.value, 10) || 0,
                    }))
                  }
                  helperText="Number of rows to skip at the beginning"
                  inputProps={{ min: 0 }}
                />
              </>
            )}

            {/* Excel specific options */}
            {['xlsx', 'xls'].includes(config.format) && (
              <>
                <TextField
                  label="Sheet Name"
                  value={config.sheetName || ''}
                  onChange={(e) =>
                    setConfig(prev => ({
                      ...prev,
                      sheetName: e.target.value || undefined,
                    }))
                  }
                  helperText="Leave empty to use the first sheet"
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={config.hasHeader !== false}
                      onChange={(e) =>
                        setConfig(prev => ({
                          ...prev,
                          hasHeader: e.target.checked,
                        }))
                      }
                    />
                  }
                  label="First row contains headers"
                />
              </>
            )}

            {/* JSON specific options */}
            {['json'].includes(config.format) && (
              <TextField
                label="Root Path"
                value={config.rootPath || ''}
                onChange={(e) =>
                  setConfig(prev => ({
                    ...prev,
                    rootPath: e.target.value || undefined,
                  }))
                }
                helperText="Path to array of records (e.g., 'data.records'). Leave empty if root is an array."
              />
            )}
          </Stack>

          <Alert severity="info" sx={{ mt: 2 }}>
            Your data will be imported into the <strong>{collectionName}</strong>{' '}
            collection. If the collection doesn&apos;t exist, it will be created.
          </Alert>
        </Box>
      )}

      {/* Submit button */}
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!file || !collectionName || loading}
          startIcon={loading ? null : <UploadIcon />}
        >
          {loading ? 'Uploading...' : 'Continue'}
        </Button>
      </Box>
    </Box>
  );
}
