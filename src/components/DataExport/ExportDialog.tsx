'use client';

/**
 * ExportDialog Component
 * Modal dialog for configuring and executing data exports
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  FormControl,
  FormControlLabel,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Checkbox,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  IconButton,
  alpha,
  Autocomplete,
} from '@mui/material';
import {
  Close,
  Download,
  TableChart,
  Code,
  Description,
  CheckCircle,
} from '@mui/icons-material';
import type { ExportFormat } from '@/lib/dataExport';

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  // Vault connection (optional)
  organizationId?: string;
  vaultId?: string;
  // Direct connection (optional)
  connectionString?: string;
  // Required fields
  database: string;
  collection: string;
  currentQuery?: Record<string, unknown>;
}

interface ExportPreview {
  totalCount: number;
  sampleDocuments: Record<string, unknown>[];
  fields: string[];
}

const formatOptions: { value: ExportFormat; label: string; icon: React.ReactNode; description: string }[] = [
  {
    value: 'csv',
    label: 'CSV',
    icon: <TableChart />,
    description: 'Comma-separated values, great for spreadsheets',
  },
  {
    value: 'json',
    label: 'JSON',
    icon: <Code />,
    description: 'Standard JSON array format',
  },
  {
    value: 'jsonl',
    label: 'JSON Lines',
    icon: <Description />,
    description: 'One JSON object per line, good for streaming',
  },
];

export function ExportDialog({
  open,
  onClose,
  organizationId,
  vaultId,
  connectionString,
  database,
  collection,
  currentQuery,
}: ExportDialogProps) {
  const useVault = Boolean(organizationId && vaultId);
  const useDirect = Boolean(connectionString);
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [includeId, setIncludeId] = useState(true);
  const [flattenObjects, setFlattenObjects] = useState(true);
  const [useCurrentQuery, setUseCurrentQuery] = useState(false);
  const [limit, setLimit] = useState<number>(10000);

  const [preview, setPreview] = useState<ExportPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState(false);

  // Fetch preview when dialog opens
  useEffect(() => {
    if (open && database && collection && (useVault || useDirect)) {
      fetchPreview();
    }
  }, [open, database, collection, useVault, useDirect]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setExportSuccess(false);
      setExportError(null);
    }
  }, [open]);

  const fetchPreview = async () => {
    try {
      setPreviewLoading(true);
      setPreviewError(null);

      const params = new URLSearchParams({
        database,
        collection,
      });

      if (useVault && organizationId && vaultId) {
        params.set('organizationId', organizationId);
        params.set('vaultId', vaultId);
      } else if (useDirect && connectionString) {
        params.set('connectionString', connectionString);
      }

      const response = await fetch(`/api/data-export?${params}`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to load preview');
      }

      const data = await response.json();
      setPreview(data);

      // Select all fields by default
      if (data.fields) {
        setSelectedFields(data.fields.filter((f: string) => f !== '_id'));
      }
    } catch (err) {
      console.error('Preview error:', err);
      setPreviewError(err instanceof Error ? err.message : 'Failed to load preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      setExportError(null);
      setExportSuccess(false);

      const body: Record<string, unknown> = {
        database,
        collection,
        format,
        fields: selectedFields.length > 0 ? selectedFields : undefined,
        includeId,
        flattenObjects,
        limit,
        query: useCurrentQuery && currentQuery ? currentQuery : undefined,
      };

      if (useVault && organizationId && vaultId) {
        body.organizationId = organizationId;
        body.vaultId = vaultId;
      } else if (useDirect && connectionString) {
        body.connectionString = connectionString;
      }

      const response = await fetch('/api/data-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Export failed');
      }

      // Get the blob and download it
      const blob = await response.blob();
      const documentCount = response.headers.get('X-Document-Count');

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // Get filename from Content-Disposition header or generate one
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `${collection}_export.${format}`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) {
          filename = match[1];
        }
      }

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setExportSuccess(true);

      // Auto-close after success
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Export error:', err);
      setExportError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleClose = () => {
    if (!exporting) {
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'background.paper',
          backgroundImage: 'none',
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Download sx={{ color: '#00ED64' }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Export Data
          </Typography>
        </Box>
        <IconButton onClick={handleClose} disabled={exporting} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {exportSuccess ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CheckCircle sx={{ fontSize: 64, color: '#00ED64', mb: 2 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              Export Complete!
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Your file has been downloaded.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Collection Info */}
            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                Exporting from
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip label={database} size="small" variant="outlined" />
                <Chip
                  label={collection}
                  size="small"
                  sx={{ bgcolor: alpha('#00ED64', 0.1), borderColor: '#00ED64' }}
                  variant="outlined"
                />
              </Box>
              {preview && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  {preview.totalCount.toLocaleString()} documents available
                </Typography>
              )}
            </Box>

            {previewError && (
              <Alert severity="error">{previewError}</Alert>
            )}

            {previewLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={32} />
              </Box>
            ) : preview && (
              <>
                {/* Format Selection */}
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
                    Export Format
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {formatOptions.map((opt) => (
                      <Box
                        key={opt.value}
                        onClick={() => setFormat(opt.value)}
                        sx={{
                          flex: 1,
                          p: 1.5,
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: format === opt.value ? '#00ED64' : 'divider',
                          bgcolor: format === opt.value ? alpha('#00ED64', 0.08) : 'transparent',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          '&:hover': {
                            borderColor: format === opt.value ? '#00ED64' : 'text.secondary',
                          },
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          {opt.icon}
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {opt.label}
                          </Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {opt.description}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>

                <Divider />

                {/* Field Selection */}
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
                    Fields to Export
                  </Typography>
                  <Autocomplete
                    multiple
                    options={preview.fields.filter(f => f !== '_id')}
                    value={selectedFields}
                    onChange={(_, value) => setSelectedFields(value)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder="Select fields (leave empty for all)"
                        size="small"
                      />
                    )}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip
                          {...getTagProps({ index })}
                          key={option}
                          label={option}
                          size="small"
                        />
                      ))
                    }
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    Leave empty to export all fields
                  </Typography>
                </Box>

                {/* Options */}
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
                    Options
                  </Typography>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={includeId}
                          onChange={(e) => setIncludeId(e.target.checked)}
                          size="small"
                        />
                      }
                      label={
                        <Typography variant="body2">
                          Include _id field
                        </Typography>
                      }
                    />

                    {format === 'csv' && (
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={flattenObjects}
                            onChange={(e) => setFlattenObjects(e.target.checked)}
                            size="small"
                          />
                        }
                        label={
                          <Typography variant="body2">
                            Flatten nested objects (e.g., address.city becomes separate column)
                          </Typography>
                        }
                      />
                    )}

                    {currentQuery && Object.keys(currentQuery).length > 0 && (
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={useCurrentQuery}
                            onChange={(e) => setUseCurrentQuery(e.target.checked)}
                            size="small"
                          />
                        }
                        label={
                          <Typography variant="body2">
                            Apply current filter/query
                          </Typography>
                        }
                      />
                    )}
                  </Box>
                </Box>

                {/* Limit */}
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
                    Document Limit
                  </Typography>
                  <TextField
                    type="number"
                    size="small"
                    value={limit}
                    onChange={(e) => setLimit(Math.max(1, Math.min(50000, parseInt(e.target.value) || 1000)))}
                    inputProps={{ min: 1, max: 50000 }}
                    sx={{ width: 200 }}
                    helperText="Maximum 50,000 documents per export"
                  />
                </Box>
              </>
            )}

            {exportError && (
              <Alert severity="error">{exportError}</Alert>
            )}
          </Box>
        )}
      </DialogContent>

      {!exportSuccess && (
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleClose} disabled={exporting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleExport}
            disabled={exporting || previewLoading || !!previewError}
            startIcon={exporting ? <CircularProgress size={16} color="inherit" /> : <Download />}
            sx={{
              background: 'linear-gradient(135deg, #00ED64 0%, #4DFF9F 100%)',
              color: '#001E2B',
              fontWeight: 600,
              '&:hover': {
                background: 'linear-gradient(135deg, #00CC55 0%, #3DFF8F 100%)',
              },
              '&:disabled': {
                background: 'action.disabledBackground',
                color: 'action.disabled',
              },
            }}
          >
            {exporting ? 'Exporting...' : 'Export'}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
}
