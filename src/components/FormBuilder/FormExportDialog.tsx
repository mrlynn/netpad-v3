'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Close as CloseIcon,
  ContentCopy as CopyIcon,
  Download as DownloadIcon,
  Code as CodeIcon,
  DataObject as JsonIcon,
} from '@mui/icons-material';

import { FormDefinition } from '@/types/template';

interface FormExportDialogProps {
  open: boolean;
  onClose: () => void;
  formConfig: FormDefinition | Record<string, unknown>;
  formName: string;
}

export default function FormExportDialog({
  open,
  onClose,
  formConfig,
  formName,
}: FormExportDialogProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const jsonString = JSON.stringify(formConfig, null, 2);
  const fileName = `${(formName || 'form').toLowerCase().replace(/\s+/g, '-')}-definition.json`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onClose();
  };

  // Generate TypeScript type definition
  const generateTypeScript = () => {
    const fields = (formConfig.fieldConfigs as Array<{ path: string; type: string; required?: boolean }>) || [];
    const typeLines = fields
      .filter(f => f.path && !f.path.startsWith('_'))
      .map(f => {
        const optional = f.required ? '' : '?';
        let tsType = 'string';
        switch (f.type) {
          case 'number':
          case 'rating':
          case 'slider':
            tsType = 'number';
            break;
          case 'checkbox':
          case 'switch':
            tsType = 'boolean';
            break;
          case 'checkboxes':
          case 'multi_select':
            tsType = 'string[]';
            break;
          case 'date':
          case 'datetime':
            tsType = 'Date | string';
            break;
          case 'file':
            tsType = 'File | string';
            break;
          default:
            tsType = 'string';
        }
        return `  ${f.path}${optional}: ${tsType};`;
      });

    return `// Generated from: ${formName}
// Form ID: ${formConfig.id || 'unknown'}

export interface ${(formName || 'Form').replace(/[^a-zA-Z0-9]/g, '')}Data {
${typeLines.join('\n')}
}
`;
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            maxHeight: '90vh',
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <JsonIcon color="primary" />
            <Typography variant="h6">Export Form Definition</Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
            <Tab icon={<JsonIcon />} iconPosition="start" label="JSON" />
            <Tab icon={<CodeIcon />} iconPosition="start" label="TypeScript" />
          </Tabs>
        </Box>

        <DialogContent sx={{ p: 0 }}>
          <Box
            sx={{
              bgcolor: 'grey.900',
              color: 'grey.100',
              p: 2,
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              overflow: 'auto',
              maxHeight: '50vh',
              minHeight: '300px',
              whiteSpace: 'pre',
              '& .key': { color: '#9cdcfe' },
              '& .string': { color: '#ce9178' },
              '& .number': { color: '#b5cea8' },
              '& .boolean': { color: '#569cd6' },
              '& .null': { color: '#569cd6' },
            }}
          >
            {activeTab === 0 ? jsonString : generateTypeScript()}
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', gap: 1, width: '100%', justifyContent: 'space-between' }}>
            <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
              {fileName} • {(jsonString.length / 1024).toFixed(1)} KB
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Copy to clipboard">
                <Button
                  startIcon={<CopyIcon />}
                  onClick={handleCopy}
                  variant="outlined"
                >
                  Copy
                </Button>
              </Tooltip>
              <Button
                startIcon={<DownloadIcon />}
                onClick={handleDownload}
                variant="contained"
              >
                Download
              </Button>
            </Box>
          </Box>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={copied}
        autoHideDuration={2000}
        onClose={() => setCopied(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled">
          Copied to clipboard!
        </Alert>
      </Snackbar>
    </>
  );
}
