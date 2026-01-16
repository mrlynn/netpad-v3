'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Chip,
  IconButton,
  alpha,
  useTheme,
} from '@mui/material';
import { Close, Apps, AutoAwesome } from '@mui/icons-material';
import { Application, ApplicationStatus } from '@/types/application';
import AIApplicationGeneratorDialog from './AIApplicationGeneratorDialog';
import { NetPadSpinner } from '@/components/common/NetPadLoader';
import { GeneratedApplication } from '@/lib/ai/types';

interface ApplicationDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (application: Application) => void;
  application?: Application | null;
  organizationId: string;
  projectId: string;
}

export function ApplicationDialog({
  open,
  onClose,
  onSave,
  application,
  organizationId,
  projectId,
}: ApplicationDialogProps) {
  const theme = useTheme();
  const isEditMode = !!application;

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [slug, setSlug] = useState('');
  const [status, setStatus] = useState<ApplicationStatus>('draft');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [version, setVersion] = useState('');
  const [color, setColor] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiDialogOpen, setAIDialogOpen] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (application) {
        // Edit mode
        setName(application.name || '');
        setDescription(application.description || '');
        setSlug(application.slug || '');
        setStatus(application.status || 'draft');
        setTags(application.tags || []);
        setVersion(application.version || '');
        setColor(application.color || '');
      } else {
        // Create mode
        setName('');
        setDescription('');
        setSlug('');
        setStatus('draft');
        setTags([]);
        setTagInput('');
        setVersion('');
        setColor('');
      }
      setError(null);
    }
  }, [open, application]);

  // Auto-generate slug from name
  useEffect(() => {
    if (!isEditMode && name && !slug) {
      const generatedSlug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setSlug(generatedSlug);
    }
  }, [name, isEditMode, slug]);

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleTagInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Application name is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload: any = {
        organizationId,
        projectId,
        name: name.trim(),
        description: description.trim() || undefined,
        slug: slug.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
        version: version.trim() || undefined,
        color: color.trim() || undefined,
      };

      console.log('[ApplicationDialog] Saving application:', { isEditMode, payload });

      const url = isEditMode
        ? `/api/applications/${application!.applicationId}`
        : '/api/applications';
      const method = isEditMode ? 'PATCH' : 'POST';

      console.log('[ApplicationDialog] Request:', { method, url });

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      console.log('[ApplicationDialog] Response status:', response.status);

      const data = await response.json();
      console.log('[ApplicationDialog] Response data:', data);

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to save application');
      }

      onSave(data.application);
      onClose();
    } catch (err: any) {
      console.error('[ApplicationDialog] Error:', err);
      setError(err.message || 'Failed to save application');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
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
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid',
          borderColor: 'divider',
          pb: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1.5,
              bgcolor: color || alpha(theme.palette.primary.main, 0.1),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Apps sx={{ color: color ? 'white' : theme.palette.primary.main, fontSize: 20 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {isEditMode ? 'Edit Application' : 'Create Application'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isEditMode ? `Editing: ${application?.name}` : 'Create a new application'}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {!isEditMode && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<AutoAwesome />}
              onClick={() => setAIDialogOpen(true)}
              sx={{
                textTransform: 'none',
                borderColor: '#9C27B0',
                color: '#9C27B0',
                '&:hover': {
                  borderColor: '#7B1FA2',
                  bgcolor: alpha('#9C27B0', 0.05),
                },
              }}
            >
              AI Generate
            </Button>
          )}
          <IconButton onClick={handleClose} size="small" disabled={saving}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Name */}
          <TextField
            label="Application Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            fullWidth
            autoFocus
            disabled={saving}
            helperText="A descriptive name for your application"
          />

          {/* Description */}
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={3}
            disabled={saving}
            helperText="Optional description of what this application does"
          />

          {/* Slug */}
          <TextField
            label="Slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            fullWidth
            disabled={saving || isEditMode}
            helperText={isEditMode ? 'Slug cannot be changed after creation' : 'URL-friendly identifier (auto-generated from name)'}
          />

          {/* Status */}
          <FormControl fullWidth disabled={saving}>
            <InputLabel>Status</InputLabel>
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
              label="Status"
            >
              <MenuItem value="draft">Draft</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="archived">Archived</MenuItem>
            </Select>
            <FormHelperText>The current status of the application</FormHelperText>
          </FormControl>

          {/* Version */}
          <TextField
            label="Version"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            fullWidth
            disabled={saving}
            placeholder="1.0.0"
            helperText="Optional semantic version (e.g., 1.0.0)"
          />

          {/* Color */}
          <TextField
            label="Color"
            type="color"
            value={color || '#00ED64'}
            onChange={(e) => setColor(e.target.value)}
            fullWidth
            disabled={saving}
            InputLabelProps={{ shrink: true }}
            helperText="Application color theme"
            sx={{
              '& input[type="color"]': {
                height: 56,
                cursor: 'pointer',
              },
            }}
          />

          {/* Tags */}
          <Box>
            <TextField
              label="Tags"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={handleTagInputKeyPress}
              fullWidth
              disabled={saving}
              placeholder="Press Enter to add tag"
              helperText="Add tags to categorize your application"
              InputProps={{
                endAdornment: (
                  <Button size="small" onClick={handleAddTag} disabled={!tagInput.trim()}>
                    Add
                  </Button>
                ),
              }}
            />
            {tags.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.5 }}>
                {tags.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    onDelete={() => handleRemoveTag(tag)}
                    size="small"
                    sx={{
                      bgcolor: alpha(theme.palette.primary.main, 0.15),
                      color: theme.palette.primary.main,
                    }}
                  />
                ))}
              </Box>
            )}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button onClick={handleClose} disabled={saving} sx={{ textTransform: 'none' }}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving || !name.trim()}
          startIcon={saving ? <NetPadSpinner size={16} /> : <Apps />}
          sx={{
            bgcolor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
            textTransform: 'none',
            fontWeight: 600,
            '&:hover': { bgcolor: theme.palette.primary.dark },
            '&:disabled': {
              bgcolor: alpha(theme.palette.primary.main, 0.3),
            },
          }}
        >
          {saving ? 'Saving...' : isEditMode ? 'Update Application' : 'Create Application'}
        </Button>
      </DialogActions>

      {/* AI Application Generator Dialog */}
      <AIApplicationGeneratorDialog
        open={aiDialogOpen}
        onClose={() => setAIDialogOpen(false)}
        onGenerate={async (generated: GeneratedApplication) => {
          // Close AI dialog
          setAIDialogOpen(false);
          
          // Create the application with generated metadata
          try {
            setSaving(true);
            setError(null);

            // First, create the application
            const appPayload: any = {
              organizationId,
              projectId,
              name: generated.application.name,
              description: generated.application.description,
              tags: generated.application.tags,
              version: generated.application.version || '1.0.0',
              color: generated.application.color || '#00ED64',
              status: 'draft',
            };

            const appResponse = await fetch('/api/applications', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(appPayload),
            });

            const appData = await appResponse.json();

            if (!appResponse.ok || !appData.success) {
              throw new Error(appData.error || 'Failed to create application');
            }

            const createdApplication = appData.application;

            let createdFormId: string | null = null;

            // Create form if generated
            if (generated.form) {
              const formConfig = {
                id: undefined, // Let server generate
                name: generated.form.name || 'Generated Form',
                description: generated.form.description,
                fieldConfigs: generated.form.fieldConfigs || [],
                organizationId,
                projectId,
                applicationId: createdApplication.applicationId,
                isPublished: false,
              };

              const formResponse = await fetch('/api/forms-save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  formConfig,
                  publish: false,
                }),
              });

              const formData = await formResponse.json();
              
              if (!formResponse.ok || !formData.success) {
                console.warn('Failed to create form:', formData.error);
                // Continue even if form creation fails
              } else {
                createdFormId = formData.form?.id || formData.form?.formId || null;
              }
            }

            // Create workflow if generated
            if (generated.workflow) {
              // First create the workflow with basic info
              const workflowPayload = {
                orgId: organizationId,
                projectId,
                applicationId: createdApplication.applicationId,
                name: generated.workflow.name || 'Generated Workflow',
                description: generated.workflow.description,
                tags: [],
              };

              const workflowResponse = await fetch('/api/workflows', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(workflowPayload),
              });

              const workflowData = await workflowResponse.json();
              
              if (workflowResponse.ok && workflowData.workflow) {
                const workflowId = workflowData.workflow.id;
                
                // Update form trigger node with actual formId if form was created
                const nodes = generated.workflow.nodes.map((node) => {
                  if (node.type === 'form-trigger' && createdFormId) {
                    return {
                      ...node,
                      config: {
                        ...node.config,
                        formId: createdFormId,
                      },
                    };
                  }
                  return node;
                });

                // Convert tempIds to proper IDs for nodes
                const nodeIdMap: Record<string, string> = {};
                const finalNodes = nodes.map((node, index) => {
                  const id = `node_${index}_${Date.now()}`;
                  nodeIdMap[node.tempId] = id;
                  return {
                    id,
                    type: node.type,
                    label: node.label,
                    position: node.position,
                    data: node.config,
                    enabled: node.enabled,
                  };
                });

                // Convert edges with proper node IDs
                const finalEdges = generated.workflow.edges.map((edge) => ({
                  id: `edge_${Date.now()}_${Math.random()}`,
                  source: nodeIdMap[edge.sourceTempId] || edge.sourceTempId,
                  sourceHandle: edge.sourceHandle || 'output',
                  target: nodeIdMap[edge.targetTempId] || edge.targetTempId,
                  targetHandle: edge.targetHandle || 'input',
                  type: 'default',
                }));

                // Update workflow with canvas
                const updateResponse = await fetch(`/api/workflows/${workflowId}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    orgId: organizationId,
                    canvas: {
                      nodes: finalNodes,
                      edges: finalEdges,
                    },
                    settings: generated.workflow.settings || {
                      executionMode: 'sequential',
                      errorHandling: 'stop',
                    },
                  }),
                });

                if (!updateResponse.ok) {
                  console.warn('Failed to update workflow canvas:', await updateResponse.json());
                }
              } else {
                console.warn('Failed to create workflow:', workflowData.error);
              }
            }

            // Close this dialog and notify parent
            onSave(createdApplication);
            onClose();
          } catch (err: any) {
            console.error('[ApplicationDialog] Error creating AI-generated application:', err);
            setError(err.message || 'Failed to create application');
          } finally {
            setSaving(false);
          }
        }}
      />
    </Dialog>
  );
}
