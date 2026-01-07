'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Switch,
  FormControlLabel,
  CircularProgress,
  Alert,
  Chip,
  alpha
} from '@mui/material';
import { Save, Public, Edit } from '@mui/icons-material';
import { FormConfiguration } from '@/types/form';
import { saveFormConfiguration } from '@/lib/formStorage';
import { usePipeline } from '@/contexts/PipelineContext';
import { ProjectSelector } from '@/components/Projects/ProjectSelector';
import { generateFormThumbnail, FormThumbnailData } from '@/lib/thumbnail/formThumbnail';

export interface SavedFormInfo {
  id: string;
  name: string;
  slug: string;
  isPublished: boolean;
  version: number;
}

interface FormSaveDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (info: SavedFormInfo) => void;
  formConfig: Omit<FormConfiguration, 'createdAt' | 'updatedAt'> & {
    id?: string;
    slug?: string;
    isPublished?: boolean;
  };
}

export function FormSaveDialog({
  open,
  onClose,
  onSave,
  formConfig,
}: FormSaveDialogProps) {
  const { connectionString } = usePipeline();
  const params = useParams();
  // Check if we're in a project context from the URL
  const urlProjectId = params?.projectId as string | undefined;
  const isInProjectContext = !!urlProjectId;
  
  const [name, setName] = useState(formConfig.name || '');
  const [description, setDescription] = useState(formConfig.description || '');
  const [publish, setPublish] = useState(formConfig.isPublished || false);
  // If we're in a project context, use the URL projectId; otherwise use formConfig or empty
  const [projectId, setProjectId] = useState<string>(isInProjectContext ? (urlProjectId || '') : (formConfig.projectId || ''));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine if this is an update to an existing form
  const isExistingForm = !!formConfig.id;

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setName(formConfig.name || '');
      setDescription(formConfig.description || '');
      setPublish(formConfig.isPublished || false);
      // If we're in a project context, always use the URL projectId
      if (isInProjectContext && urlProjectId) {
        setProjectId(urlProjectId);
      } else if (formConfig.projectId) {
        // Otherwise, use projectId from formConfig if available
        setProjectId(formConfig.projectId);
      } else {
        // If no projectId in formConfig, reset to empty so user can select
        setProjectId('');
      }
      setError(null);
    }
  }, [open, formConfig, isInProjectContext, urlProjectId]);

  const handleSave = async () => {
    if (!name.trim()) {
      return;
    }
    
    if (!projectId) {
      setError('Please select a project');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const config: FormConfiguration = {
        ...formConfig,
        name: name.trim(),
        description: description.trim() || undefined,
        projectId: projectId,
        connectionString: connectionString || undefined
      };

      // Debug: Log what we're sending
      console.log('FormSaveDialog: Sending formConfig with dataSource:', {
        hasDataSource: !!config.dataSource,
        dataSource: config.dataSource,
        vaultId: config.dataSource?.vaultId,
        collection: config.dataSource?.collection,
        organizationId: config.organizationId,
      });

      // Save via API for server-side storage with publishing
      console.log('FormSaveDialog: About to fetch /api/forms-save');
      const response = await fetch('/api/forms-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formConfig: config, publish })
      });
      console.log('FormSaveDialog: Response status:', response.status);

      const data = await response.json();
      console.log('FormSaveDialog: Response data:', data);

      if (!data.success) {
        throw new Error(data.error || 'Failed to save form');
      }

      // Also save to localStorage for local library access
      const localConfig = { ...config, id: data.form.id, slug: data.form.slug };
      saveFormConfiguration(localConfig);

      // Close the dialog immediately and notify parent
      onClose();

      // Pass saved form info to parent for notification
      onSave({
        id: data.form.id,
        name: name.trim(),
        slug: data.form.slug,
        isPublished: data.form.isPublished,
        version: data.form.version || 1,
      });

      // Generate thumbnail in background (don't block UI)
      console.log('[FormSaveDialog] Checking thumbnail generation:', {
        organizationId: config.organizationId,
        formId: data.form.id,
        fieldCount: config.fieldConfigs?.length,
      });

      if (config.organizationId) {
        // Use setTimeout to not block the UI
        setTimeout(async () => {
          console.log('[FormSaveDialog] Starting thumbnail generation...');
          try {
            const thumbnailData: FormThumbnailData = {
              formName: name.trim(),
              formDescription: description.trim() || undefined,
              fields: config.fieldConfigs,
              primaryColor: config.theme?.primaryColor || '#00ED64',
            };
            console.log('[FormSaveDialog] Thumbnail data:', thumbnailData);

            const thumbnailUrl = await generateFormThumbnail(
              thumbnailData,
              data.form.id,
              config.organizationId!
            );
            if (thumbnailUrl) {
              console.log('[FormSaveDialog] Thumbnail generated successfully:', thumbnailUrl);
            } else {
              console.warn('[FormSaveDialog] Thumbnail generation returned null');
            }
          } catch (err) {
            // Thumbnail generation failure is not critical, just log it
            console.error('[FormSaveDialog] Thumbnail generation failed:', err);
          }
        }, 100);
      } else {
        console.warn('[FormSaveDialog] No organizationId - skipping thumbnail generation');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {isExistingForm ? (
            <Edit sx={{ color: '#2196f3' }} />
          ) : (
            <Save sx={{ color: '#00ED64' }} />
          )}
          <Typography variant="h6">
            {isExistingForm ? 'Update Form' : 'Save New Form'}
          </Typography>
          {isExistingForm && (
            <Chip
              label="Editing"
              size="small"
              sx={{
                ml: 1,
                bgcolor: alpha('#2196f3', 0.1),
                color: '#2196f3',
                fontSize: '0.7rem',
              }}
            />
          )}
          {formConfig.isPublished && (
            <Chip
              label="Published"
              size="small"
              icon={<Public fontSize="small" />}
              sx={{
                ml: 0.5,
                bgcolor: alpha('#00ED64', 0.1),
                color: '#00ED64',
                fontSize: '0.7rem',
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

        {/* Show existing form info when updating */}
        {isExistingForm && (
          <Alert
            severity="info"
            sx={{
              mb: 2,
              bgcolor: alpha('#2196f3', 0.05),
              border: '1px solid',
              borderColor: alpha('#2196f3', 0.2),
            }}
          >
            <Typography variant="body2">
              You are updating an existing form. A new version will be created automatically.
            </Typography>
            {formConfig.slug && (
              <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontFamily: 'monospace' }}>
                Form URL: /forms/{formConfig.slug}
              </Typography>
            )}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="Form Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            required
            placeholder="e.g., User Registration Form"
            helperText={isExistingForm ? "Update the form name if needed" : "A descriptive name for this form"}
          />
          <TextField
            label="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={3}
            placeholder="Describe what this form is used for..."
          />
          
          {formConfig.organizationId && !isInProjectContext && (
            <ProjectSelector
              organizationId={formConfig.organizationId}
              value={projectId}
              onChange={setProjectId}
              required
              label="Project"
              helperText="Select a project to organize this form"
            />
          )}
          {formConfig.organizationId && isInProjectContext && urlProjectId && (
            <Box
              sx={{
                p: 1.5,
                bgcolor: alpha('#00ED64', 0.05),
                borderRadius: 1,
                border: '1px solid',
                borderColor: alpha('#00ED64', 0.2)
              }}
            >
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                <strong style={{ color: '#00ED64' }}>Current Project</strong>
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                This form will be saved to the current project
              </Typography>
            </Box>
          )}

          {/* Publish Option */}
          <FormControlLabel
            control={
              <Switch
                checked={publish}
                onChange={(e) => setPublish(e.target.checked)}
              />
            }
            label={
              <Box>
                <Typography variant="body2">
                  {formConfig.isPublished
                    ? 'Keep form published'
                    : 'Publish form immediately'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formConfig.isPublished
                    ? 'Form is currently live and accessible'
                    : 'Make this form publicly accessible via a shareable URL'}
                </Typography>
              </Box>
            }
          />

          <Box
            sx={{
              p: 2,
              bgcolor: alpha('#00ED64', 0.05),
              borderRadius: 1,
              border: '1px solid',
              borderColor: alpha('#00ED64', 0.2)
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              Collection: {formConfig.collection}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              Fields: {formConfig.fieldConfigs.filter((f) => f.included).length} included
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!name.trim() || saving}
          startIcon={saving ? <CircularProgress size={16} /> : <Save />}
          sx={{
            background: isExistingForm
              ? 'linear-gradient(135deg, #2196f3 0%, #64b5f6 100%)'
              : 'linear-gradient(135deg, #00ED64 0%, #4DFF9F 100%)',
            '&:hover': {
              background: isExistingForm
                ? 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)'
                : 'linear-gradient(135deg, #00CC55 0%, #3DFF8F 100%)'
            }
          }}
        >
          {saving
            ? 'Saving...'
            : isExistingForm
              ? publish
                ? 'Update & Publish'
                : 'Update Form'
              : publish
                ? 'Save & Publish'
                : 'Save Form'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
