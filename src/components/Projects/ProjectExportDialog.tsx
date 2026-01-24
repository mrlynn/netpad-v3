/**
 * Project Export Dialog
 *
 * Dialog for exporting a project as an application bundle.
 * Allows users to configure export options before downloading.
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Alert,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  IconButton,
  alpha,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import {
  Download as DownloadIcon,
  Article as FormIcon,
  AccountTree as WorkflowIcon,
  Storage as DatabaseIcon,
  Settings as SettingsIcon,
  ExpandMore as ExpandMoreIcon,
  Check as CheckIcon,
  Warning as WarningIcon,
  Key as KeyIcon,
  Link as LinkIcon,
  PlayArrow as TriggerIcon,
  Publish as PublishIcon,
} from '@mui/icons-material';
import { Project } from '@/types/platform';
import { BundleExport, EnvVarSpec, FormWorkflowConnection } from '@/types/template';
import { ApplicationPublishDialog } from './ApplicationPublishDialog';

interface ProjectExportDialogProps {
  open: boolean;
  onClose: () => void;
  project: Project | null;
  organizationId: string;
}

interface ExportPreview {
  formsCount: number;
  workflowsCount: number;
  connectionsCount: number;
  bundle: BundleExport;
}

export function ProjectExportDialog({
  open,
  onClose,
  project,
  organizationId,
}: ProjectExportDialogProps) {
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ExportPreview | null>(null);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);

  // Export options
  const [includeDeploymentConfig, setIncludeDeploymentConfig] = useState(true);
  const [includeSampleData, setIncludeSampleData] = useState(false);

  // Load export preview when dialog opens
  useEffect(() => {
    if (open && project) {
      loadPreview();
    } else {
      setPreview(null);
      setError(null);
    }
  }, [open, project]);

  const loadPreview = async () => {
    if (!project) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/projects/${project.projectId}/bundle?orgId=${organizationId}&format=json`
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to load project data');
      }

      const data = await response.json();
      setPreview({
        formsCount: data.metadata.formsCount,
        workflowsCount: data.metadata.workflowsCount,
        connectionsCount: data.metadata.connectionsCount || 0,
        bundle: data.bundle,
      });
    } catch (err) {
      console.error('Error loading export preview:', err);
      setError(err instanceof Error ? err.message : 'Failed to load project data');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!project || !preview) return;

    setExporting(true);
    setError(null);

    try {
      // Create the bundle with options
      const bundle = { ...preview.bundle };

      // Add deployment config if requested
      if (includeDeploymentConfig && bundle.deployment) {
        bundle.deployment.seed.sampleData = includeSampleData;
      }

      // Create downloadable JSON
      const jsonString = JSON.stringify(bundle, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      // Trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name.toLowerCase().replace(/\s+/g, '-')}-bundle.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      onClose();
    } catch (err) {
      console.error('Error exporting project:', err);
      setError(err instanceof Error ? err.message : 'Failed to export project');
    } finally {
      setExporting(false);
    }
  };

  const requiredEnvVars = preview?.bundle?.deployment?.environment?.required || [];
  const optionalEnvVars = preview?.bundle?.deployment?.environment?.optional || [];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DownloadIcon sx={{ color: '#00ED64' }} />
          <Typography variant="h6">Export Project</Typography>
          {project && (
            <Chip
              label={project.name}
              size="small"
              sx={{
                ml: 1,
                bgcolor: alpha('#00ED64', 0.1),
                color: '#00ED64',
              }}
            />
          )}
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <NetPadLoader size="large" variant="ascii" message="Loading..." />
          </Box>
        ) : preview ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Export Summary */}
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                bgcolor: alpha('#00ED64', 0.02),
                borderColor: alpha('#00ED64', 0.2),
              }}
            >
              <Typography variant="subtitle2" sx={{ mb: 1.5, color: '#00ED64' }}>
                Export Contents
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
                {preview.bundle.theme && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SettingsIcon fontSize="small" color="action" />
                    <Typography variant="body2">Theme</Typography>
                  </Box>
                )}
              </Box>
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
                      These connections show how forms trigger workflows. They will be automatically
                      configured when the application is imported.
                    </Typography>
                  </Alert>
                  <List dense disablePadding>
                    {preview.bundle.connections.map((connection: FormWorkflowConnection, index: number) => {
                      // Find form and workflow names for display
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

            {/* Export Options */}
            <Typography variant="subtitle2" sx={{ mt: 1 }}>
              Export Options
            </Typography>
            <FormGroup>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={includeDeploymentConfig}
                    onChange={(e) => setIncludeDeploymentConfig(e.target.checked)}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2">Include deployment configuration</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Generates environment variable templates and database setup instructions
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={includeSampleData}
                    onChange={(e) => setIncludeSampleData(e.target.checked)}
                    disabled={!includeDeploymentConfig}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2">Include sample data seed</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Pre-populate the application with sample data on first boot
                    </Typography>
                  </Box>
                }
              />
            </FormGroup>

            {/* Environment Variables Preview */}
            {includeDeploymentConfig && requiredEnvVars.length > 0 && (
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <KeyIcon fontSize="small" />
                    <Typography variant="subtitle2">
                      Required Environment Variables ({requiredEnvVars.length})
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0 }}>
                  <Alert severity="info" sx={{ mb: 1.5 }}>
                    <Typography variant="caption">
                      These environment variables must be configured when deploying the application.
                    </Typography>
                  </Alert>
                  <List dense disablePadding>
                    {requiredEnvVars.map((envVar, index) => (
                      <ListItem key={index} disablePadding sx={{ py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          {envVar.generator === 'secret' ? (
                            <Chip label="Auto" size="small" color="success" sx={{ fontSize: '0.65rem', height: 20 }} />
                          ) : (
                            <WarningIcon fontSize="small" color="warning" />
                          )}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography
                              variant="body2"
                              sx={{ fontFamily: 'monospace', fontWeight: 500 }}
                            >
                              {envVar.name}
                            </Typography>
                          }
                          secondary={envVar.description}
                          secondaryTypographyProps={{ variant: 'caption' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>
            )}

            {/* Optional Environment Variables */}
            {includeDeploymentConfig && optionalEnvVars.length > 0 && (
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <KeyIcon fontSize="small" color="action" />
                    <Typography variant="subtitle2" color="text.secondary">
                      Optional Environment Variables ({optionalEnvVars.length})
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0 }}>
                  <List dense disablePadding>
                    {optionalEnvVars.map((envVar, index) => (
                      <ListItem key={index} disablePadding sx={{ py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <CheckIcon fontSize="small" color="disabled" />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography
                              variant="body2"
                              sx={{ fontFamily: 'monospace', color: 'text.secondary' }}
                            >
                              {envVar.name}
                            </Typography>
                          }
                          secondary={envVar.description}
                          secondaryTypographyProps={{ variant: 'caption' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>
            )}
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
            Select a project to see export preview
          </Typography>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={() => setPublishDialogOpen(true)}
          variant="outlined"
          disabled={!preview || exporting}
          startIcon={<PublishIcon />}
          sx={{
            borderColor: '#00ED64',
            color: '#00ED64',
            '&:hover': {
              borderColor: '#00CC55',
              bgcolor: alpha('#00ED64', 0.08),
            },
          }}
        >
          Publish to Marketplace
        </Button>
        <Button
          onClick={handleExport}
          variant="contained"
          disabled={!preview || exporting}
          startIcon={exporting ? <NetPadLoader size="small" variant="svg" showPhrases={false} /> : <DownloadIcon />}
          sx={{
            background: 'linear-gradient(135deg, #00ED64 0%, #4DFF9F 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #00CC55 0%, #3DFF8F 100%)',
            },
          }}
        >
          {exporting ? 'Exporting...' : 'Export Bundle'}
        </Button>
      </DialogActions>

      {/* Publish Dialog */}
      {preview && (
        <ApplicationPublishDialog
          open={publishDialogOpen}
          onClose={() => setPublishDialogOpen(false)}
          bundle={preview.bundle}
          onPublished={(applicationId: string) => {
            setPublishDialogOpen(false);
            // Could show success message or navigate to marketplace
          }}
        />
      )}
    </Dialog>
  );
}
