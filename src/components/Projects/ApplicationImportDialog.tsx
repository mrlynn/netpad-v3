/**
 * Application Import Dialog
 *
 * Dialog for importing a NetPad application bundle.
 * Shows preview of forms, workflows, and connections before importing.
 */

'use client';

import { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
  alpha,
  TextField,
  FormControlLabel,
  Checkbox,
  FormGroup,
} from '@mui/material';
import {
  Upload as UploadIcon,
  Article as FormIcon,
  AccountTree as WorkflowIcon,
  Link as LinkIcon,
  ExpandMore as ExpandMoreIcon,
  Check as CheckIcon,
  Warning as WarningIcon,
  PlayArrow as TriggerIcon,
  CloudUpload as CloudUploadIcon,
} from '@mui/icons-material';
import { BundleExport, FormWorkflowConnection } from '@/types/template';

interface ApplicationImportDialogProps {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  projectId?: string; // Optional: import into specific project
  onImportComplete?: (result: { forms: number; workflows: number; connections: number }) => void;
}

interface ImportPreview {
  bundle: BundleExport;
  formsCount: number;
  workflowsCount: number;
  connectionsCount: number;
}

export function ApplicationImportDialog({
  open,
  onClose,
  organizationId,
  projectId,
  onImportComplete,
}: ApplicationImportDialogProps) {
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Import options
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [generateNewIds, setGenerateNewIds] = useState(true);
  const [preserveSlugs, setPreserveSlugs] = useState(false);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setPreview(null);

    try {
      const text = await file.text();
      const bundle: BundleExport = JSON.parse(text);

      // Validate bundle structure
      if (!bundle.manifest || !bundle.forms || !bundle.workflows) {
        throw new Error('Invalid bundle format. Missing required fields.');
      }

      setPreview({
        bundle,
        formsCount: bundle.forms?.length || 0,
        workflowsCount: bundle.workflows?.length || 0,
        connectionsCount: bundle.connections?.length || 0,
      });
    } catch (err) {
      console.error('Error parsing bundle:', err);
      setError(err instanceof Error ? err.message : 'Failed to parse bundle file');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!preview) return;

    setImporting(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/templates/import?orgId=${organizationId}${projectId ? `&projectId=${projectId}` : ''}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            manifest: preview.bundle.manifest,
            forms: preview.bundle.forms,
            workflows: preview.bundle.workflows,
            theme: preview.bundle.theme,
            options: {
              overwriteExisting,
              generateNewIds,
              preserveSlugs,
            },
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to import application');
      }

      const result = await response.json();

      if (onImportComplete) {
        onImportComplete({
          forms: result.imported.forms.length,
          workflows: result.imported.workflows.length,
          connections: preview.connectionsCount,
        });
      }

      // Reset and close
      setPreview(null);
      onClose();
    } catch (err) {
      console.error('Error importing application:', err);
      setError(err instanceof Error ? err.message : 'Failed to import application');
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    if (!importing) {
      setPreview(null);
      setError(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <UploadIcon sx={{ color: '#00ED64' }} />
          <Typography variant="h6">Import Application</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {!preview ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 6,
              gap: 2,
            }}
          >
            {loading ? (
              <>
                <CircularProgress size={48} sx={{ color: '#00ED64' }} />
                <Typography variant="body2" color="text.secondary">
                  Loading bundle...
                </Typography>
              </>
            ) : (
              <>
                <CloudUploadIcon sx={{ fontSize: 64, color: '#00ED64', opacity: 0.7 }} />
                <Typography variant="h6" sx={{ color: '#00ED64' }}>
                  Select Application Bundle
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', maxWidth: 400 }}>
                  Choose a NetPad application bundle file (.json) to import. The bundle should contain forms,
                  workflows, and their connections.
                </Typography>
                <Button
                  variant="contained"
                  component="label"
                  startIcon={<UploadIcon />}
                  sx={{
                    mt: 2,
                    background: 'linear-gradient(135deg, #00ED64 0%, #4DFF9F 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #00CC55 0%, #3DFF8F 100%)',
                    },
                  }}
                >
                  Choose File
                  <input
                    ref={fileInputRef}
                    type="file"
                    hidden
                    accept=".json,application/json"
                    onChange={handleFileSelect}
                  />
                </Button>
              </>
            )}
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Import Summary */}
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                bgcolor: alpha('#00ED64', 0.02),
                borderColor: alpha('#00ED64', 0.2),
              }}
            >
              <Typography variant="subtitle2" sx={{ mb: 1.5, color: '#00ED64' }}>
                Import Preview
              </Typography>
              <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FormIcon fontSize="small" color="action" />
                  <Typography variant="body2">
                    {preview.formsCount} Form{preview.formsCount !== 1 ? 's' : ''}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <WorkflowIcon fontSize="small" color="action" />
                  <Typography variant="body2">
                    {preview.workflowsCount} Workflow{preview.workflowsCount !== 1 ? 's' : ''}
                  </Typography>
                </Box>
                {preview.connectionsCount > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LinkIcon fontSize="small" sx={{ color: '#00ED64' }} />
                    <Typography variant="body2" sx={{ color: '#00ED64', fontWeight: 500 }}>
                      {preview.connectionsCount} Connection{preview.connectionsCount !== 1 ? 's' : ''}
                    </Typography>
                  </Box>
                )}
              </Box>
              {preview.bundle.manifest && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Application: {preview.bundle.manifest.name} v{preview.bundle.manifest.version}
                  </Typography>
                  {preview.bundle.manifest.description && (
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                      {preview.bundle.manifest.description}
                    </Typography>
                  )}
                </Box>
              )}
            </Paper>

            {/* Forms List */}
            {preview.bundle.forms && preview.bundle.forms.length > 0 && (
              <Accordion defaultExpanded={preview.bundle.forms.length <= 5}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FormIcon fontSize="small" />
                    <Typography variant="subtitle2">
                      Forms ({preview.bundle.forms.length})
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0 }}>
                  <List dense disablePadding>
                    {preview.bundle.forms.map((form, index) => (
                      <ListItem key={index} disablePadding sx={{ py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <CheckIcon fontSize="small" color="success" />
                        </ListItemIcon>
                        <ListItemText
                          primary={form.name}
                          secondary={form.description || 'No description'}
                          primaryTypographyProps={{ variant: 'body2' }}
                          secondaryTypographyProps={{ variant: 'caption' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>
            )}

            {/* Workflows List */}
            {preview.bundle.workflows && preview.bundle.workflows.length > 0 && (
              <Accordion defaultExpanded={preview.bundle.workflows.length <= 5}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WorkflowIcon fontSize="small" />
                    <Typography variant="subtitle2">
                      Workflows ({preview.bundle.workflows.length})
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0 }}>
                  <List dense disablePadding>
                    {preview.bundle.workflows.map((workflow, index) => (
                      <ListItem key={index} disablePadding sx={{ py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <CheckIcon fontSize="small" color="success" />
                        </ListItemIcon>
                        <ListItemText
                          primary={workflow.name}
                          secondary={workflow.description || 'No description'}
                          primaryTypographyProps={{ variant: 'body2' }}
                          secondaryTypographyProps={{ variant: 'caption' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>
            )}

            {/* Form-Workflow Connections */}
            {preview.bundle.connections && preview.bundle.connections.length > 0 && (
              <Accordion defaultExpanded={preview.bundle.connections.length <= 5}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LinkIcon fontSize="small" sx={{ color: '#00ED64' }} />
                    <Typography variant="subtitle2" sx={{ color: '#00ED64' }}>
                      Form-Workflow Connections ({preview.bundle.connections.length})
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0 }}>
                  <Alert severity="info" sx={{ mb: 1.5 }}>
                    <Typography variant="caption">
                      These connections will be automatically configured. Form references in workflows will be
                      updated to match the imported forms.
                    </Typography>
                  </Alert>
                  <List dense disablePadding>
                    {preview.bundle.connections.map((connection: FormWorkflowConnection, index: number) => {
                      const form = preview.bundle.forms?.find(
                        f => f.id === connection.formRef || f.slug === connection.formRef
                      );
                      const workflow = preview.bundle.workflows?.find(
                        w => w.id === connection.workflowRef || w.slug === connection.workflowRef
                      );

                      return (
                        <ListItem key={index} disablePadding sx={{ py: 0.5 }}>
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            <TriggerIcon fontSize="small" sx={{ color: '#00ED64' }} />
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                <Typography
                                  variant="body2"
                                  sx={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 0.5 }}
                                >
                                  <FormIcon fontSize="inherit" sx={{ fontSize: 14 }} />
                                  {form?.name || connection.formRef}
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#00ED64' }}>
                                  →
                                </Typography>
                                <Typography
                                  variant="body2"
                                  sx={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 0.5 }}
                                >
                                  <WorkflowIcon fontSize="inherit" sx={{ fontSize: 14 }} />
                                  {workflow?.name || connection.workflowRef}
                                </Typography>
                                {connection.type === 'trigger' && (
                                  <Chip
                                    label="Trigger"
                                    size="small"
                                    sx={{
                                      height: 18,
                                      fontSize: '0.65rem',
                                      bgcolor: alpha('#00ED64', 0.1),
                                      color: '#00ED64',
                                      border: `1px solid ${alpha('#00ED64', 0.3)}`,
                                    }}
                                  />
                                )}
                              </Box>
                            }
                            secondary={
                              connection.description ||
                              (connection.config?.triggerOn
                                ? `Triggers on: ${connection.config.triggerOn}`
                                : 'Automatic connection')
                            }
                            secondaryTypographyProps={{ variant: 'caption' }}
                          />
                        </ListItem>
                      );
                    })}
                  </List>
                </AccordionDetails>
              </Accordion>
            )}

            <Divider />

            {/* Import Options */}
            <Typography variant="subtitle2" sx={{ mt: 1 }}>
              Import Options
            </Typography>
            <FormGroup>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={generateNewIds}
                    onChange={(e) => setGenerateNewIds(e.target.checked)}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2">Generate new IDs</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Create new IDs for all forms and workflows (recommended)
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={preserveSlugs}
                    onChange={(e) => setPreserveSlugs(e.target.checked)}
                    disabled={!generateNewIds}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2">Preserve slugs</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Keep original slugs if available (may cause conflicts)
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={overwriteExisting}
                    onChange={(e) => setOverwriteExisting(e.target.checked)}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2">Overwrite existing</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Replace forms/workflows with the same name or slug
                    </Typography>
                  </Box>
                }
              />
            </FormGroup>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={importing}>
          {preview ? 'Cancel' : 'Close'}
        </Button>
        {preview && (
          <Button
            onClick={handleImport}
            variant="contained"
            disabled={importing}
            startIcon={importing ? <CircularProgress size={16} /> : <UploadIcon />}
            sx={{
              background: 'linear-gradient(135deg, #00ED64 0%, #4DFF9F 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #00CC55 0%, #3DFF8F 100%)',
              },
            }}
          >
            {importing ? 'Importing...' : 'Import Application'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
