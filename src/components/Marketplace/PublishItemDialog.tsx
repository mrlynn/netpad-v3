/**
 * Publish Item Dialog
 *
 * Generic dialog for publishing forms, workflows, or applications to the marketplace.
 * Used from Form Builder, Workflow Editor, and Application settings.
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
  TextField,
  Alert,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  alpha,
  Autocomplete,
  Stack,
  Paper,
} from '@mui/material';
import {
  Article as FormIcon,
  AccountTree as WorkflowIcon,
  Inventory as BundleIcon,
  CloudUpload as PublishIcon,
} from '@mui/icons-material';
import { MarketplaceItemType, ApplicationManifest, FormDefinition, WorkflowDefinition } from '@/types/template';
import { NetPadSpinner } from '@/components/common/NetPadLoader';

const CATEGORIES = [
  'helpdesk',
  'onboarding',
  'survey',
  'ecommerce',
  'healthcare',
  'finance',
  'education',
  'realestate',
  'business',
  'events',
  'support',
  'other',
];

const COMMON_TAGS = [
  'form',
  'workflow',
  'automation',
  'customer-service',
  'data-collection',
  'onboarding',
  'feedback',
  'survey',
  'healthcare',
  'finance',
  'education',
  'internal-tools',
  'lead-generation',
  'registration',
  'booking',
];

interface PublishItemDialogProps {
  open: boolean;
  onClose: () => void;
  itemType: MarketplaceItemType;
  /** Form definition when publishing a form */
  form?: FormDefinition;
  /** Workflow definition when publishing a workflow */
  workflow?: WorkflowDefinition;
  /** Pre-filled manifest data (e.g., from existing marketplace item) */
  existingManifest?: Partial<ApplicationManifest>;
  /** Callback when publish succeeds */
  onPublishSuccess?: (result: { id: string; itemType: MarketplaceItemType }) => void;
}

// Helper function to get item type display info
function getItemTypeInfo(itemType: MarketplaceItemType) {
  switch (itemType) {
    case 'form':
      return {
        label: 'Form',
        icon: <FormIcon />,
        color: '#2196F3', // Blue
        description: 'Publish this form to the marketplace as a standalone item.',
      };
    case 'workflow':
      return {
        label: 'Workflow',
        icon: <WorkflowIcon />,
        color: '#9C27B0', // Purple
        description: 'Publish this workflow to the marketplace as a standalone item.',
      };
    case 'application':
    default:
      return {
        label: 'Application',
        icon: <BundleIcon />,
        color: '#00ED64', // NetPad green
        description: 'Publish this application bundle to the marketplace.',
      };
  }
}

export function PublishItemDialog({
  open,
  onClose,
  itemType,
  form,
  workflow,
  existingManifest,
  onPublishSuccess,
}: PublishItemDialogProps) {
  const typeInfo = getItemTypeInfo(itemType);

  // Form state
  const [name, setName] = useState('');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [version, setVersion] = useState('1.0.0');
  const [category, setCategory] = useState('other');
  const [tags, setTags] = useState<string[]>([]);
  const [icon, setIcon] = useState('');
  const [authorName, setAuthorName] = useState('');

  // Status
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Initialize form with item data
  useEffect(() => {
    if (open) {
      // Reset state
      setError(null);
      setSuccess(false);

      // Pre-fill from existing manifest or item
      if (existingManifest) {
        setName(existingManifest.name || '');
        setSummary(existingManifest.summary || '');
        setDescription(existingManifest.description || '');
        setVersion(existingManifest.version || '1.0.0');
        setCategory(existingManifest.category || 'other');
        setTags(existingManifest.tags || []);
        setIcon(existingManifest.icon || '');
        setAuthorName(
          typeof existingManifest.author === 'string'
            ? existingManifest.author
            : existingManifest.author?.name || ''
        );
      } else if (itemType === 'form' && form) {
        setName(form.name || '');
        setDescription(form.description || '');
        setSummary('');
        setVersion('1.0.0');
        setCategory('other');
        setTags([]);
        setIcon('');
      } else if (itemType === 'workflow' && workflow) {
        setName(workflow.name || '');
        setDescription(workflow.description || '');
        setSummary('');
        setVersion('1.0.0');
        setCategory('other');
        setTags(workflow.tags || []);
        setIcon('');
      }
    }
  }, [open, itemType, form, workflow, existingManifest]);

  const handlePublish = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    if (!summary.trim() && !description.trim()) {
      setError('Summary or description is required');
      return;
    }

    setPublishing(true);
    setError(null);

    try {
      // Build the manifest
      const manifest: Partial<ApplicationManifest> = {
        name: name.trim(),
        version,
        summary: summary.trim() || undefined,
        description: description.trim() || undefined,
        category,
        tags: tags.length > 0 ? tags : undefined,
        icon: icon.trim() || undefined,
        author: authorName.trim() ? { name: authorName.trim() } : undefined,
      };

      // Build the request body based on item type
      let body: Record<string, any> = {
        itemType,
        manifest,
      };

      if (itemType === 'form' && form) {
        body.form = form;
        body.formMetadata = {
          fieldCount: form.fieldConfigs?.length || 0,
          formType: 'traditional', // TODO: detect from form config
          isMultiPage: !!form.multiPage?.enabled,
          hasConditionalLogic: form.fieldConfigs?.some((f: any) => f.conditionalLogic?.enabled) || false,
        };
      } else if (itemType === 'workflow' && workflow) {
        body.workflow = workflow;
        body.workflowMetadata = {
          nodeCount: workflow.canvas?.nodes?.length || 0,
          triggerType: 'manual', // TODO: detect from workflow config
          nodeTypes: [...new Set(workflow.canvas?.nodes?.map((n: any) => n.type) || [])],
        };
      }

      const response = await fetch('/api/marketplace/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to publish');
      }

      const result = await response.json();

      setSuccess(true);

      if (onPublishSuccess) {
        onPublishSuccess({
          id: result.item?.id || result.application?.id,
          itemType,
        });
      }

      // Close after a brief delay to show success message
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Error publishing:', err);
      setError(err instanceof Error ? err.message : 'Failed to publish');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <Dialog open={open} onClose={publishing ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              p: 1,
              borderRadius: 1,
              bgcolor: alpha(typeInfo.color, 0.1),
              color: typeInfo.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {typeInfo.icon}
          </Box>
          <Box>
            <Typography variant="h6">Publish {typeInfo.label} to Marketplace</Typography>
            <Typography variant="caption" color="text.secondary">
              {typeInfo.description}
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Your {typeInfo.label.toLowerCase()} has been submitted for review. You will be notified once it has been approved.
          </Alert>
        )}

        {!success && (
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            {/* Name */}
            <TextField
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              required
              disabled={publishing}
              placeholder={`My Awesome ${typeInfo.label}`}
            />

            {/* Summary */}
            <TextField
              label="Summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              fullWidth
              disabled={publishing}
              placeholder="A brief one-line summary..."
              helperText="Short description shown in marketplace listings (1-2 sentences)"
            />

            {/* Description */}
            <TextField
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              multiline
              rows={3}
              disabled={publishing}
              placeholder="Detailed description of what this does, how to use it, etc."
              helperText="Full description shown on the detail page (markdown supported)"
            />

            {/* Version & Category */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Version"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                disabled={publishing}
                sx={{ width: 120 }}
                placeholder="1.0.0"
              />

              <FormControl fullWidth disabled={publishing}>
                <InputLabel>Category</InputLabel>
                <Select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  label="Category"
                >
                  {CATEGORIES.map((cat) => (
                    <MenuItem key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Tags */}
            <Autocomplete
              multiple
              freeSolo
              options={COMMON_TAGS}
              value={tags}
              onChange={(_, newValue) => setTags(newValue as string[])}
              disabled={publishing}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    {...getTagProps({ index })}
                    key={option}
                    label={option}
                    size="small"
                    sx={{
                      bgcolor: alpha(typeInfo.color, 0.1),
                      color: typeInfo.color,
                    }}
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Tags"
                  placeholder="Add tags..."
                  helperText="Type and press Enter to add custom tags"
                />
              )}
            />

            {/* Icon & Author */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Icon (emoji)"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                disabled={publishing}
                sx={{ width: 120 }}
                placeholder="📋"
                inputProps={{ maxLength: 4 }}
              />

              <TextField
                label="Author Name"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                fullWidth
                disabled={publishing}
                placeholder="Your name or organization"
              />
            </Box>

            {/* Preview */}
            <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(typeInfo.color, 0.02) }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                Preview
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                {icon && (
                  <Typography variant="h4">{icon}</Typography>
                )}
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {name || 'Untitled'}
                    </Typography>
                    <Chip
                      label={typeInfo.label}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: '0.65rem',
                        bgcolor: alpha(typeInfo.color, 0.1),
                        color: typeInfo.color,
                      }}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    v{version} • {category}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {summary || description || 'No description'}
                  </Typography>
                </Box>
              </Box>
            </Paper>

            <Alert severity="info" sx={{ mt: 1 }}>
              <Typography variant="caption">
                Your submission will be reviewed by an administrator before being published to the marketplace.
                You will be notified once it has been approved or if changes are requested.
              </Typography>
            </Alert>
          </Stack>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={publishing}>
          {success ? 'Close' : 'Cancel'}
        </Button>
        {!success && (
          <Button
            onClick={handlePublish}
            variant="contained"
            disabled={publishing || !name.trim()}
            startIcon={publishing ? <NetPadSpinner size={16} /> : <PublishIcon />}
            sx={{
              bgcolor: typeInfo.color,
              color: 'white',
              '&:hover': {
                bgcolor: alpha(typeInfo.color, 0.85),
              },
            }}
          >
            {publishing ? 'Publishing...' : `Publish ${typeInfo.label}`}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
