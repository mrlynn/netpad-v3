/**
 * Template Instantiation Modal
 *
 * Shown after user clicks "Get Started" on a template.
 * Allows user to select organization and project, then creates
 * an Application with the form from the template.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Chip,
  Stack,
  FormControlLabel,
  Checkbox,
  alpha,
  useTheme,
  IconButton,
} from '@mui/material';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import {
  Close as CloseIcon,
  RocketLaunch as RocketIcon,
  CheckCircle as CheckIcon,
  Pending as PendingIcon,
  AutoAwesome as AutoAwesomeIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { TemplateIcon } from './TemplateIcon';
import type { FormTemplate } from '@/types/formTemplate';

interface Organization {
  orgId: string;
  name: string;
  role: string;
}

interface Project {
  projectId: string;
  name: string;
}

interface TemplateInstantiationModalProps {
  open: boolean;
  onClose: () => void;
  template: FormTemplate | null;
}

interface InstantiationStatus {
  step: 'idle' | 'creating' | 'success' | 'error';
  message?: string;
  redirectUrl?: string;
}

export function TemplateInstantiationModal({
  open,
  onClose,
  template,
}: TemplateInstantiationModalProps) {
  const router = useRouter();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // Form state
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [appName, setAppName] = useState<string>('');
  const [includeWorkflows, setIncludeWorkflows] = useState(true);

  // UI state
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [status, setStatus] = useState<InstantiationStatus>({ step: 'idle' });

  // Load organizations on mount
  useEffect(() => {
    if (open) {
      loadOrganizations();
    }
  }, [open]);

  // Load projects when org changes
  useEffect(() => {
    if (selectedOrgId) {
      loadProjects(selectedOrgId);
    } else {
      setProjects([]);
      setSelectedProjectId('');
    }
  }, [selectedOrgId]);

  // Set default app name from template
  useEffect(() => {
    if (template && !appName) {
      setAppName(template.name);
    }
  }, [template]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setStatus({ step: 'idle' });
    }
  }, [open]);

  const loadOrganizations = async () => {
    setLoadingOrgs(true);
    try {
      const response = await fetch('/api/organizations');
      if (!response.ok) throw new Error('Failed to load organizations');
      const data = await response.json();
      setOrganizations(data.organizations || []);

      // Auto-select first org if only one
      if (data.organizations?.length === 1) {
        setSelectedOrgId(data.organizations[0].orgId);
      }
    } catch (error) {
      console.error('Error loading organizations:', error);
    } finally {
      setLoadingOrgs(false);
    }
  };

  const loadProjects = async (orgId: string) => {
    setLoadingProjects(true);
    try {
      const response = await fetch(`/api/organizations/${orgId}/projects`);
      if (!response.ok) throw new Error('Failed to load projects');
      const data = await response.json();
      const projectList = data.projects || [];
      setProjects(projectList);

      // Auto-select first project if available
      if (projectList.length > 0) {
        setSelectedProjectId(projectList[0].projectId);
      } else {
        // No projects - we'll create one automatically
        setSelectedProjectId('__auto_create__');
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      // On error, allow auto-create
      setSelectedProjectId('__auto_create__');
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleInstantiate = useCallback(async () => {
    if (!template || !selectedOrgId) return;

    setStatus({ step: 'creating', message: 'Creating your app...' });

    try {
      // If no project selected or auto-create, pass empty string to trigger auto-creation
      const projectId = selectedProjectId === '__auto_create__' ? '' : selectedProjectId;

      const response = await fetch(`/api/templates/${template.id}/instantiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: selectedOrgId,
          projectId,
          applicationName: appName || template.name,
          includeWorkflows,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create app');
      }

      const data = await response.json();

      setStatus({
        step: 'success',
        message: 'App created successfully!',
        redirectUrl: data.redirectUrl,
      });

      // Redirect after a brief delay
      setTimeout(() => {
        router.push(data.redirectUrl);
        onClose();
      }, 1500);
    } catch (error: any) {
      setStatus({
        step: 'error',
        message: error.message || 'Failed to create app',
      });
    }
  }, [template, selectedOrgId, selectedProjectId, appName, includeWorkflows, router, onClose]);

  if (!template) return null;

  const hasWorkflowSuggestions = template.enhanced?.workflowPairings && template.enhanced.workflowPairings.length > 0;
  // Can create if we have an org and either a project or auto-create flag
  const canCreate = selectedOrgId && selectedProjectId && appName && status.step !== 'creating';

  return (
    <Dialog
      open={open}
      onClose={status.step === 'creating' ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          bgcolor: isDark ? 'rgba(0, 30, 43, 0.95)' : 'background.paper',
          backdropFilter: isDark ? 'blur(20px)' : 'none',
          border: '1px solid',
          borderColor: isDark ? 'rgba(0, 237, 100, 0.3)' : 'divider',
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 2,
                bgcolor: 'rgba(0, 237, 100, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <TemplateIcon icon={template.icon} size={28} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Create {template.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Set up your new app from this template
              </Typography>
            </Box>
          </Box>
          {status.step !== 'creating' && (
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          )}
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {/* Creating status */}
        {status.step === 'creating' && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <NetPadLoader size="large" variant="ascii" message="Creating Your App" />
            <Typography color="text.secondary" sx={{ mt: 2 }}>
              {status.message}
            </Typography>
          </Box>
        )}

        {/* Success status */}
        {status.step === 'success' && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CheckIcon sx={{ fontSize: 64, color: '#00ED64', mb: 2 }} />
            <Typography variant="h6" sx={{ mb: 1 }}>
              App Created!
            </Typography>
            <Typography color="text.secondary">
              Redirecting to your new app...
            </Typography>
          </Box>
        )}

        {/* Error status */}
        {status.step === 'error' && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {status.message}
          </Alert>
        )}

        {/* Form (only show when idle or error) */}
        {(status.step === 'idle' || status.step === 'error') && (
          <>
            {/* What's being created */}
            <Box
              sx={{
                p: 2,
                mb: 3,
                borderRadius: 2,
                bgcolor: alpha('#00ED64', 0.05),
                border: '1px solid',
                borderColor: alpha('#00ED64', 0.2),
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
                We'll set up:
              </Typography>
              <Stack spacing={1}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckIcon sx={{ fontSize: 18, color: '#00ED64' }} />
                  <Typography variant="body2">
                    {template.name} form ({template.fieldConfigs.length} fields)
                  </Typography>
                </Box>
                {hasWorkflowSuggestions && includeWorkflows && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PendingIcon sx={{ fontSize: 18, color: '#00ED64' }} />
                    <Typography variant="body2">
                      Suggested workflows ({template.enhanced?.workflowPairings?.length})
                    </Typography>
                  </Box>
                )}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PendingIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    MongoDB connection (connect later)
                  </Typography>
                </Box>
              </Stack>
            </Box>

            {/* App Name */}
            <TextField
              fullWidth
              label="App Name"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              sx={{ mb: 3 }}
              helperText="You can change this later"
            />

            {/* Organization */}
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Organization</InputLabel>
              <Select
                value={selectedOrgId}
                onChange={(e) => setSelectedOrgId(e.target.value)}
                label="Organization"
                disabled={loadingOrgs}
              >
                {organizations.map((org) => (
                  <MenuItem key={org.orgId} value={org.orgId}>
                    {org.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Project */}
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Project</InputLabel>
              <Select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                label="Project"
                disabled={!selectedOrgId || loadingProjects}
              >
                {projects.length === 0 && selectedOrgId && !loadingProjects && (
                  <MenuItem value="__auto_create__">
                    <em>Create new project automatically</em>
                  </MenuItem>
                )}
                {projects.map((project) => (
                  <MenuItem key={project.projectId} value={project.projectId}>
                    {project.name}
                  </MenuItem>
                ))}
              </Select>
              {!selectedOrgId && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                  Select an organization first
                </Typography>
              )}
              {selectedOrgId && projects.length === 0 && !loadingProjects && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                  A default project will be created for you
                </Typography>
              )}
            </FormControl>

            {/* Include Workflows Checkbox */}
            {hasWorkflowSuggestions && (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={includeWorkflows}
                    onChange={(e) => setIncludeWorkflows(e.target.checked)}
                    sx={{
                      color: 'text.secondary',
                      '&.Mui-checked': { color: '#00ED64' },
                    }}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2">
                      Include suggested workflows
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {template.enhanced?.workflowPairings?.map((w) => w.title).join(', ')}
                    </Typography>
                  </Box>
                }
              />
            )}
          </>
        )}
      </DialogContent>

      {/* Actions (only show when idle or error) */}
      {(status.step === 'idle' || status.step === 'error') && (
        <DialogActions sx={{ p: 2.5, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button onClick={onClose} variant="outlined">
            Cancel
          </Button>
          <Button
            onClick={handleInstantiate}
            variant="contained"
            disabled={!canCreate}
            startIcon={<RocketIcon />}
            sx={{
              bgcolor: '#00ED64',
              color: 'white',
              fontWeight: 600,
              px: 3,
              '&:hover': { bgcolor: '#00CC55' },
              '&:disabled': { bgcolor: 'action.disabledBackground' },
            }}
          >
            Create My App
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
}
