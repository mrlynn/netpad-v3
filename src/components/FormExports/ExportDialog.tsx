'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Box,
  Typography,
  TextField,
  Chip,
  alpha,
} from '@mui/material';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import { Download } from '@mui/icons-material';
import { FormConfiguration } from '@/types/form';
import { loadFormConfiguration } from '@/lib/formStorage';
import { HelpButton } from '@/components/Help/HelpButton';

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  formId: string;
  connectionString?: string;
}

export function ExportDialog({
  open,
  onClose,
  formId,
  connectionString,
}: ExportDialogProps) {
  const [format, setFormat] = useState<'csv' | 'excel' | 'json' | 'pdf'>('csv');
  const [includeMetadata, setIncludeMetadata] = useState(false);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [availableFields, setAvailableFields] = useState<string[]>([]);

  // Load form config to get available fields
  useEffect(() => {
    if (open && formId) {
      const config = loadFormConfiguration(formId);
      if (config) {
        const fields = config.fieldConfigs
          .filter(f => f.included)
          .map(f => f.path);
        setAvailableFields(fields);
        if (selectedFields.length === 0) {
          setSelectedFields(fields); // Select all by default
        }
      }
    }
  }, [open, formId]);

  const handleExport = async () => {
    setExporting(true);

    try {
      const params = new URLSearchParams();
      params.set('format', format);
      params.set('includeMetadata', includeMetadata.toString());
      if (selectedFields.length > 0 && selectedFields.length < availableFields.length) {
        params.set('fields', selectedFields.join(','));
      }
      if (connectionString) {
        params.set('connectionString', connectionString);
      }

      const response = await fetch(`/api/forms/${formId}/export?${params.toString()}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Export failed');
      }

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `${formId}-responses.${format === 'excel' ? 'xlsx' : format}`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) {
          filename = match[1];
        }
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      onClose();
    } catch (error: any) {
      alert(`Export failed: ${error.message}`);
    } finally {
      setExporting(false);
    }
  };

  const handleToggleField = (field: string) => {
    setSelectedFields(prev =>
      prev.includes(field)
        ? prev.filter(f => f !== field)
        : [...prev, field]
    );
  };

  const handleSelectAll = () => {
    setSelectedFields(availableFields);
  };

  const handleDeselectAll = () => {
    setSelectedFields([]);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Download sx={{ color: '#00ED64' }} />
          <Typography variant="h6">Export Responses</Typography>
          <HelpButton topicId="response-export" tooltip="Export Help" />
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
          {/* Format Selection */}
          <FormControl fullWidth>
            <InputLabel>Export Format</InputLabel>
            <Select
              value={format}
              label="Export Format"
              onChange={(e) => setFormat(e.target.value as any)}
            >
              <MenuItem value="csv">CSV</MenuItem>
              <MenuItem value="excel">Excel (XLSX)</MenuItem>
              <MenuItem value="json">JSON</MenuItem>
              <MenuItem value="pdf">PDF</MenuItem>
            </Select>
          </FormControl>

          {/* Include Metadata */}
          <FormControlLabel
            control={
              <Checkbox
                checked={includeMetadata}
                onChange={(e) => setIncludeMetadata(e.target.checked)}
              />
            }
            label="Include metadata (ID, timestamps, device info)"
          />

          {/* Field Selection */}
          {availableFields.length > 0 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2">
                  Select Fields ({selectedFields.length} of {availableFields.length})
                </Typography>
                <Box>
                  <Button size="small" onClick={handleSelectAll}>
                    Select All
                  </Button>
                  <Button size="small" onClick={handleDeselectAll}>
                    Deselect All
                  </Button>
                </Box>
              </Box>
              <Box
                sx={{
                  p: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  maxHeight: 200,
                  overflow: 'auto',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 1,
                }}
              >
                {availableFields.map((field) => (
                  <Chip
                    key={field}
                    label={field}
                    clickable
                    color={selectedFields.includes(field) ? 'primary' : 'default'}
                    onClick={() => handleToggleField(field)}
                    sx={{
                      bgcolor: selectedFields.includes(field)
                        ? alpha('#00ED64', 0.2)
                        : 'transparent',
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={exporting}>
          Cancel
        </Button>
        <Button
          onClick={handleExport}
          variant="contained"
          disabled={exporting || selectedFields.length === 0}
          startIcon={exporting ? <NetPadLoader size="small" variant="svg" showPhrases={false} /> : <Download />}
          sx={{
            background: 'linear-gradient(135deg, #00ED64 0%, #4DFF9F 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #00CC55 0%, #3DFF8F 100%)',
            },
          }}
        >
          {exporting ? 'Exporting...' : 'Export'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

