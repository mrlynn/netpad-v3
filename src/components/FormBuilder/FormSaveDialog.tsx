'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
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
  Alert,
  Chip,
  alpha,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
} from '@mui/material';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import { Save, Public, Edit } from '@mui/icons-material';
import { FormConfiguration } from '@/types/form';
import { saveFormConfiguration } from '@/lib/formStorage';
import { usePipeline } from '@/contexts/PipelineContext';
import { useApplicationSafe } from '@/contexts/ApplicationContext';
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
  const searchParams = useSearchParams();
  const appContext = useApplicationSafe();

  // Check if we're in a project context from the URL (legacy route)
  const urlOrgId = params?.orgId as string | undefined;
  const urlProjectId = params?.projectId as string | undefined;
  const urlApplicationId = searchParams?.get('applicationId') || undefined;

  // Phase 2: Also check ApplicationContext for app-centric routes (/apps/[appSlug])
  const contextProjectId = appContext?.currentApplication?.projectId;
  const contextApplicationId = appContext?.currentApplication?.applicationId;

  // Use URL params first (legacy), then ApplicationContext (new app-centric routes)
  const effectiveProjectId = urlProjectId || contextProjectId;
  const effectiveApplicationId = urlApplicationId || contextApplicationId;
  const isInProjectContext = !!effectiveProjectId;
  
  const [name, setName] = useState(formConfig.name || '');
  const [description, setDescription] = useState(formConfig.description || '');
  const [publish, setPublish] = useState(formConfig.isPublished || false);
  // If we're in a project context, use the effective projectId (URL or ApplicationContext); otherwise use formConfig or empty
  const [projectId, setProjectId] = useState<string>(isInProjectContext ? (effectiveProjectId || '') : (formConfig.projectId || ''));
  const [applicationId, setApplicationId] = useState<string>(formConfig.applicationId || effectiveApplicationId || '');
  const [applications, setApplications] = useState<Array<{ applicationId: string; name: string; isDefault?: boolean }>>([]);
  const [loadingApplications, setLoadingApplications] = useState(false);
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
      // If we're in a project context (URL or ApplicationContext), always use the effective projectId
      if (isInProjectContext && effectiveProjectId) {
        setProjectId(effectiveProjectId);
        // Prefer applicationId from: 1) formConfig, 2) effective (URL or context), 3) empty
        setApplicationId(formConfig.applicationId || effectiveApplicationId || '');
      } else if (formConfig.projectId) {
        // Otherwise, use projectId from formConfig if available
        setProjectId(formConfig.projectId);
        setApplicationId(formConfig.applicationId || effectiveApplicationId || '');
      } else {
        // If no projectId in formConfig, reset to empty so user can select
        setProjectId('');
        setApplicationId(formConfig.applicationId || effectiveApplicationId || '');
      }
      setError(null);
    }
  }, [open, formConfig, isInProjectContext, effectiveProjectId, effectiveApplicationId]);

  // Load applications for the selected project (when in org/project context)
  useEffect(() => {
    const orgId = formConfig.organizationId || urlOrgId;
    if (!orgId || !projectId) {
      setApplications([]);
      return;
    }

    const loadApplications = async () => {
      try {
        setLoadingApplications(true);
        console.log('[FormSaveDialog] Fetching applications:', { orgId, projectId });
        const response = await fetch(`/api/applications?orgId=${orgId}&projectId=${projectId}`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error('[FormSaveDialog] Failed to load applications:', response.status, errorData);
          setApplications([]);
          return;
        }

        const data = await response.json();
        console.log('[FormSaveDialog] Applications API response:', data);

        // Handle both response formats: { success: true, applications: [...] } or { applications: [...] }
        const appsArray = data.success ? data.applications : (data.applications || []);

        if (Array.isArray(appsArray) && appsArray.length > 0) {
          const apps = appsArray as Array<{ applicationId: string; name: string; isDefault?: boolean }>;
          setApplications(apps);

          // Priority: 1) applicationId from formConfig (application context), 2) effective (URL or context), 3) current applicationId state, 4) default app
          // Always check formConfig.applicationId first (it's the source of truth from the application context)
          const preferredApplicationId = formConfig.applicationId || effectiveApplicationId;
          
          console.log('[FormSaveDialog] Loading applications:', {
            preferredApplicationId,
            currentApplicationId: applicationId,
            appsCount: apps.length,
            apps: apps.map(a => ({ id: a.applicationId, name: a.name, isDefault: a.isDefault }))
          });
          
          if (preferredApplicationId) {
            // Verify the preferred application exists in the list
            const preferredApp = apps.find((a) => a.applicationId === preferredApplicationId);
            if (preferredApp) {
              console.log('[FormSaveDialog] Setting preferred application:', preferredApp.name);
              setApplicationId(preferredApplicationId);
              return; // Don't fall through to default logic
            } else {
              console.warn('[FormSaveDialog] Preferred application not found in list:', preferredApplicationId);
            }
          }
          
          // If no preferred app or preferred app not found, check if we already have an applicationId set
          if (applicationId) {
            const existingApp = apps.find((a) => a.applicationId === applicationId);
            if (existingApp) {
              console.log('[FormSaveDialog] Keeping existing application:', existingApp.name);
              // Keep the existing selection
              return;
            }
          }
          
          // Fall back to default application
          const defaultApp = apps.find((a) => a.isDefault);
          if (defaultApp) {
            console.log('[FormSaveDialog] Falling back to default application:', defaultApp.name);
            setApplicationId(defaultApp.applicationId);
          } else {
            console.warn('[FormSaveDialog] No default application found');
          }
        } else {
          console.warn('[FormSaveDialog] No applications found in response or empty array:', data);
          setApplications([]);
        }
      } catch (err) {
        console.error('[FormSaveDialog] Failed to load applications:', err);
        setApplications([]);
      } finally {
        setLoadingApplications(false);
      }
    };

    loadApplications();
    // Note: We intentionally don't include `applicationId` in deps to avoid re-renders when we set it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, formConfig.organizationId, formConfig.applicationId, urlOrgId, effectiveApplicationId]);

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
        applicationId: applicationId || formConfig.applicationId,
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
              formType: config.formType,
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
          {formConfig.organizationId && isInProjectContext && effectiveProjectId && (
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
                <strong style={{ color: '#00ED64' }}>
                  {appContext?.currentApplication?.name
                    ? `Saving to: ${appContext.currentApplication.name}`
                    : 'Current Project'}
                </strong>
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                This form will be saved to the current application
              </Typography>
            </Box>
          )}

          {/* Application Selector (when we know org + project) */}
          {projectId && (formConfig.organizationId || urlOrgId) && (
            <FormControl fullWidth disabled={loadingApplications || applications.length === 0} sx={{ mt: 1 }}>
              <InputLabel>Application</InputLabel>
              <Select
                value={applicationId || ''}
                label="Application"
                onChange={(e) => setApplicationId(e.target.value as string)}
              >
                {applications.map((app) => (
                  <MenuItem key={app.applicationId} value={app.applicationId}>
                    {app.name}
                    {app.isDefault ? ' (Default)' : ''}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                {applications.length === 0
                  ? 'No applications yet - a default application will be created automatically'
                  : 'Select which application this form belongs to'}
              </FormHelperText>
            </FormControl>
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
          startIcon={saving ? <NetPadLoader size="small" variant="svg" showPhrases={false} /> : <Save />}
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
