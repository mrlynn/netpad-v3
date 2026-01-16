'use client';

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  Paper,
  Stack,
  alpha,
  IconButton,
} from '@mui/material';
import {
  Close,
  CloudUpload,
  Description,
  CheckCircle,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { NetPadSpinner } from '@/components/common/NetPadLoader';

interface ApplicationImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImport: (result: ImportResult) => void;
  organizationId: string;
  projectId: string;
}

interface ImportResult {
  success: boolean;
  imported?: {
    forms: Array<{ newId: string; name: string; slug: string }>;
    workflows: Array<{ newId: string; name: string; slug: string }>;
  };
  errors?: string[];
  applicationId?: string;
}

export function ApplicationImportDialog({
  open,
  onClose,
  onImport,
  organizationId,
  projectId,
}: ApplicationImportDialogProps) {
  const theme = useTheme();
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<{
    manifest?: File;
    form?: File;
    workflow?: File;
  }>({});

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

    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
  }, []);

  const processFiles = (files: File[]) => {
    const newFiles: typeof selectedFiles = {};
    
    for (const file of files) {
      const name = file.name.toLowerCase();
      if (name === 'manifest.json' || name.includes('manifest')) {
        newFiles.manifest = file;
      } else if (name === 'form.json' || name.includes('form') && name.endsWith('.json')) {
        newFiles.form = file;
      } else if (name === 'workflow.json' || name.includes('workflow') && name.endsWith('.json')) {
        newFiles.workflow = file;
      }
    }

    setSelectedFiles((prev) => ({ ...prev, ...newFiles }));
    setError(null);
  };

  const readFileAsJson = (file: File): Promise<any> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          resolve(JSON.parse(content));
        } catch (err) {
          reject(new Error(`Failed to parse ${file.name}: ${err instanceof Error ? err.message : 'Invalid JSON'}`));
        }
      };
      reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
      reader.readAsText(file);
    });
  };

  const handleImport = useCallback(async () => {
    if (!selectedFiles.manifest || !selectedFiles.form) {
      setError('Please select at least manifest.json and form.json files');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Read all files
      const [manifest, form, workflow] = await Promise.all([
        readFileAsJson(selectedFiles.manifest),
        readFileAsJson(selectedFiles.form),
        selectedFiles.workflow ? readFileAsJson(selectedFiles.workflow) : Promise.resolve(null),
      ]);

      // Prepare bundle
      const bundle = {
        manifest,
        forms: [form],
        workflows: workflow ? [workflow] : [],
        options: {
          generateNewIds: true,
          preserveSlugs: false,
          overwriteExisting: false,
        },
      };

      // Import via API
      const response = await fetch(
        `/api/templates/import?orgId=${organizationId}&projectId=${projectId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(bundle),
          credentials: 'include',
        }
      );

      // Parse response
      const data = await response.json();

      // Handle HTTP errors (4xx, 5xx) - but 207 (Multi-Status) is valid for partial success
      if (response.status >= 400 && response.status < 500) {
        throw new Error(data.error || data.message || `Import failed with status ${response.status}`);
      }

      // Check if anything was actually imported (success or partial success)
      // Note: API returns 207 (Multi-Status) for partial success, which is still 2xx
      const hasImportedItems = 
        (data.imported?.forms && data.imported.forms.length > 0) ||
        (data.imported?.workflows && data.imported.workflows.length > 0);

      // Format errors for display
      const errorMessages: string[] = [];
      if (data.errors && Array.isArray(data.errors)) {
        data.errors.forEach((err: any) => {
          if (typeof err === 'string') {
            errorMessages.push(err);
          } else if (err.error) {
            errorMessages.push(`${err.type || 'Item'} "${err.name || 'unknown'}": ${err.error}`);
          } else if (err.message) {
            errorMessages.push(err.message);
          }
        });
      }

      // If nothing was imported, treat as failure
      if (!hasImportedItems) {
        const errorMsg = data.error || errorMessages.join('; ') || 'Import failed - no items were imported';
        throw new Error(errorMsg);
      }

      // Success (even if partial - some items imported)
      // 207 status means partial success, which we treat as success if items were imported
      const importResult: ImportResult = {
        success: true,
        imported: data.imported,
        errors: errorMessages,
      };

      setResult(importResult);
      onImport(importResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setLoading(false);
    }
  }, [selectedFiles, organizationId, projectId, onImport]);

  const handleClose = useCallback(() => {
    if (!loading) {
      setSelectedFiles({});
      setError(null);
      setResult(null);
      onClose();
    }
  }, [loading, onClose]);

  const hasRequiredFiles = selectedFiles.manifest && selectedFiles.form;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">Import Application Bundle</Typography>
          <IconButton onClick={handleClose} size="small" disabled={loading}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {result?.success ? (
          <Box>
            <Alert severity="success" icon={<CheckCircle />} sx={{ mb: 2 }}>
              Application imported successfully!
            </Alert>

            {result.imported?.forms && result.imported.forms.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Forms Imported:
                </Typography>
                {result.imported.forms.map((f) => (
                  <Paper key={f.newId} sx={{ p: 1.5, mb: 1, bgcolor: alpha(theme.palette.success.main, 0.1) }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {f.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ID: {f.newId} • Slug: {f.slug}
                    </Typography>
                  </Paper>
                ))}
              </Box>
            )}

            {result.imported?.workflows && result.imported.workflows.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Workflows Imported:
                </Typography>
                {result.imported.workflows.map((w) => (
                  <Paper key={w.newId} sx={{ p: 1.5, mb: 1, bgcolor: alpha(theme.palette.info.main, 0.1) }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {w.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ID: {w.newId} • Slug: {w.slug}
                    </Typography>
                  </Paper>
                ))}
              </Box>
            )}

            {result.errors && result.errors.length > 0 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  Warnings:
                </Typography>
                {result.errors.map((err, idx) => (
                  <Typography key={idx} variant="body2">
                    • {err}
                  </Typography>
                ))}
              </Alert>
            )}
          </Box>
        ) : (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Upload your application bundle files. You need at least <strong>manifest.json</strong> and <strong>form.json</strong>.
              <strong>workflow.json</strong> is optional.
            </Typography>

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
                borderColor: dragActive ? theme.palette.primary.main : 'divider',
                borderWidth: 2,
                transition: 'all 0.2s',
                '&:hover': {
                  bgcolor: 'action.hover',
                  borderColor: theme.palette.primary.main,
                },
              }}
              onClick={() => document.getElementById('bundle-file-input')?.click()}
            >
              <input
                id="bundle-file-input"
                type="file"
                accept=".json"
                multiple
                onChange={handleFileInput}
                style={{ display: 'none' }}
              />
              <CloudUpload sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Drop files here or click to browse
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Select manifest.json, form.json, and workflow.json
              </Typography>
            </Paper>

            {Object.keys(selectedFiles).length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Selected Files:
                </Typography>
                <Stack spacing={1}>
                  {selectedFiles.manifest && (
                    <Paper sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Description color="primary" />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {selectedFiles.manifest.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Manifest
                        </Typography>
                      </Box>
                      <CheckCircle color="success" fontSize="small" />
                    </Paper>
                  )}
                  {selectedFiles.form && (
                    <Paper sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Description color="primary" />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {selectedFiles.form.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Form
                        </Typography>
                      </Box>
                      <CheckCircle color="success" fontSize="small" />
                    </Paper>
                  )}
                  {selectedFiles.workflow && (
                    <Paper sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Description color="primary" />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {selectedFiles.workflow.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Workflow
                        </Typography>
                      </Box>
                      <CheckCircle color="success" fontSize="small" />
                    </Paper>
                  )}
                </Stack>
              </Box>
            )}

            {error && (
              <Alert severity="error" icon={<ErrorIcon />} sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        {result?.success ? (
          <Button onClick={handleClose} variant="contained" color="primary">
            Close
          </Button>
        ) : (
          <>
            <Button onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              variant="contained"
              color="primary"
              disabled={!hasRequiredFiles || loading}
              startIcon={loading ? <NetPadSpinner size={16} /> : <CloudUpload />}
            >
              {loading ? 'Importing...' : 'Import'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
