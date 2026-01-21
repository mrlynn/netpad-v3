'use client';

import { useState, useEffect, Suspense } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Button,
  Tabs,
  Tab,
  Chip,
  IconButton,
  CircularProgress,
  alpha,
  useTheme,
  Paper,
  Alert,
  Skeleton,
  Divider,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Edit,
  Delete,
  ArrowBack,
  Apps,
  Description,
  AccountTree,
  Settings,
  CheckCircle,
  Archive,
  Edit as EditIcon,
  Lock,
  MoreVert,
  Publish,
  Add,
  OpenInNew,
  ContentCopy,
  People,
  BarChart,
  Gavel,
  Lock as LockIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import { AppNavBar } from '@/components/Navigation/AppNavBar';
import { ApplicationContextBar } from '@/components/Navigation/ApplicationContextBar';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import { getOrgProjectUrl } from '@/lib/routing';
import { Application, ApplicationStatus, ApplicationRelease } from '@/types/application';
import { fetcher } from '@/lib/swr';
import { ApplicationPublishDialog } from '@/components/Projects/ApplicationPublishDialog';
import { ContractsTab } from '@/components/Applications/ContractsTab';
import { PermissionsTab } from '@/components/Applications/PermissionsTab';
import { PublishDialog } from '@/components/FormBuilder/PublishDialog';
import { useOrganization } from '@/contexts/OrganizationContext';
import { FormDataSource } from '@/types/form';
import { Rocket } from '@mui/icons-material';
import { buildFormUrl } from '@/lib/slugs';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      id={`application-tabpanel-${index}`}
      aria-labelledby={`application-tab-${index}`}
      sx={{ height: '100%', overflow: 'auto' }}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </Box>
  );
}

interface ApplicationFormsTabProps {
  applicationId: string;
  orgId: string;
  projectId: string;
}

interface FormsListResponse {
  success?: boolean;
  forms?: any[];
}

function ApplicationFormsTab({ applicationId, orgId, projectId }: ApplicationFormsTabProps) {
  const { organization } = useOrganization();
  const {
    data,
    error,
    isLoading,
    mutate,
  } = useSWR<FormsListResponse>(
    orgId && projectId && applicationId
      ? `/api/forms/list?orgId=${orgId}&projectId=${projectId}&applicationId=${applicationId}`
      : null,
    fetcher
  );

  const forms = data?.forms ?? [];

  const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement | null; formId: string | null }>({
    el: null,
    formId: null,
  });
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [publishDialogForm, setPublishDialogForm] = useState<any | null>(null);
  const [publishing, setPublishing] = useState(false);

  const handleDelete = async (formId: string) => {
    if (!confirm('Are you sure you want to delete this form? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/forms/${formId}?orgId=${orgId}`, { method: 'DELETE' });
      const data = await response.json();

      if (data.success) {
        setSnackbar({ open: true, message: 'Form deleted successfully', severity: 'success' });
        // Revalidate forms list from cache
        await mutate();
      } else {
        setSnackbar({ open: true, message: 'Failed to delete form', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Error deleting form', severity: 'error' });
    }

    handleMenuClose();
  };

  const handleCopyLink = (form: any) => {
    const baseUrl = window.location.origin;
    const formUrl = `${baseUrl}/forms/${form.slug || form.id}`;
    navigator.clipboard.writeText(formUrl);
    setSnackbar({ open: true, message: 'Link copied to clipboard!', severity: 'success' });
    handleMenuClose();
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, formId: string) => {
    event.stopPropagation();
    event.preventDefault();
    setMenuAnchor({ el: event.currentTarget, formId });
  };

  const handleMenuClose = () => {
    setMenuAnchor({ el: null, formId: null });
  };

  const handlePublishForm = async (config: { name: string; slug: string; dataSource?: FormDataSource }): Promise<{ success: boolean; error?: string }> => {
    if (!publishDialogForm) return { success: false, error: 'No form selected' };

    setPublishing(true);
    try {
      const response = await fetch('/api/forms-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formConfig: {
            ...publishDialogForm,
            id: publishDialogForm.id,
            name: config.name.trim(),
            slug: config.slug.trim(),
            dataSource: config.dataSource || publishDialogForm.dataSource,
            organizationId: orgId,
            projectId,
          },
          publish: true,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to publish form');
      }

      // Generate the URL for the snackbar message
      let url: string;
      if (organization?.slug) {
        url = buildFormUrl(organization.slug, data.form.slug, {
          protocol: window.location.protocol === 'http:' ? 'http' : 'https',
          rootDomain: window.location.hostname.includes('localhost') ? 'localhost:3000' : 'netpad.io',
        });
      } else {
        url = `${window.location.origin}/forms/${data.form.slug}`;
      }

      setSnackbar({ open: true, message: `Form published! URL: ${url}`, severity: 'success' });
      setPublishDialogForm(null);
      await mutate(); // Refresh forms list
      return { success: true };
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
      return { success: false, error: err.message };
    } finally {
      setPublishing(false);
    }
  };

  if (isLoading && !data && !error) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
        <NetPadLoader size="medium" message="Loading forms..." />
      </Box>
    );
  }

  if (!isLoading && !error && forms.length === 0) {
    return (
      <Paper
        sx={{
          p: 6,
          textAlign: 'center',
          bgcolor: alpha(useTheme().palette.background.paper, 0.5),
          border: '1px dashed',
          borderColor: 'divider',
          borderRadius: 2,
        }}
      >
        <Description sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" sx={{ color: 'text.primary', mb: 1 }}>
          No forms yet
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Create your first form for this application
        </Typography>
        <Button
          component={Link}
          href={`${getOrgProjectUrl(orgId, projectId, 'builder')}?applicationId=${applicationId}`}
          variant="contained"
          sx={{
            bgcolor: useTheme().palette.primary.main,
            color: useTheme().palette.primary.contrastText,
            textTransform: 'none',
            fontWeight: 600,
            '&:hover': { bgcolor: useTheme().palette.primary.dark },
          }}
        >
          Create Form
        </Button>
      </Paper>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Forms ({forms.length})
        </Typography>
        <Button
          component={Link}
          href={`${getOrgProjectUrl(orgId, projectId, 'builder')}?applicationId=${applicationId}`}
          variant="outlined"
          size="small"
          sx={{ textTransform: 'none' }}
        >
          Create Form
        </Button>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {forms.map((form: any) => (
          <Paper
            key={form.id}
            sx={{
              p: 2,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              '&:hover': {
                borderColor: useTheme().palette.primary.main,
                bgcolor: alpha(useTheme().palette.primary.main, 0.05),
              },
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                  {form.name}
                </Typography>
                {form.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {form.description}
                  </Typography>
                )}
                <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    {form.fieldCount || 0} fields
                  </Typography>
                  {form.updatedAt && (
                    <Typography variant="caption" color="text.secondary">
                      Updated {new Date(form.updatedAt).toLocaleDateString()}
                    </Typography>
                  )}
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  label={form.isPublished ? 'Published' : 'Draft'}
                  size="small"
                  sx={{
                    bgcolor: form.isPublished
                      ? alpha(useTheme().palette.primary.main, 0.15)
                      : alpha(useTheme().palette.text.primary, 0.05),
                    color: form.isPublished ? useTheme().palette.primary.main : 'text.secondary',
                  }}
                />
                <IconButton
                  size="small"
                  onClick={(e) => handleMenuOpen(e, form.id)}
                  sx={{ color: 'text.secondary' }}
                >
                  <MoreVert fontSize="small" />
                </IconButton>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<Edit sx={{ fontSize: 16 }} />}
                component={Link}
                href={`${getOrgProjectUrl(orgId, projectId, 'builder', form.id)}?applicationId=${applicationId}`}
                sx={{
                  textTransform: 'none',
                  borderColor: alpha(useTheme().palette.info.main, 0.5),
                  color: useTheme().palette.info.main,
                  '&:hover': {
                    borderColor: useTheme().palette.info.main,
                    bgcolor: alpha(useTheme().palette.info.main, 0.1),
                  },
                }}
              >
                Edit
              </Button>
              <Button
                size="small"
                variant={form.isPublished ? 'outlined' : 'contained'}
                startIcon={<Rocket sx={{ fontSize: 16 }} />}
                onClick={() => setPublishDialogForm(form)}
                sx={{
                  textTransform: 'none',
                  ...(form.isPublished
                    ? {
                        borderColor: alpha('#00ED64', 0.5),
                        color: '#00ED64',
                        '&:hover': {
                          borderColor: '#00ED64',
                          bgcolor: alpha('#00ED64', 0.1),
                        },
                      }
                    : {
                        background: 'linear-gradient(135deg, #9c27b0 0%, #ba68c8 100%)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #7b1fa2 0%, #ab47bc 100%)',
                        },
                      }),
                }}
              >
                {form.isPublished ? 'Update URL' : 'Publish'}
              </Button>
              {form.isPublished && (
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<OpenInNew sx={{ fontSize: 16 }} />}
                  component={Link}
                  href={`/forms/${form.slug || form.id}`}
                  target="_blank"
                  sx={{
                    textTransform: 'none',
                    bgcolor: useTheme().palette.primary.main,
                    '&:hover': { bgcolor: useTheme().palette.primary.dark },
                  }}
                >
                  Open
                </Button>
              )}
              <Tooltip title="Copy form link">
                <IconButton
                  size="small"
                  onClick={() => handleCopyLink(form)}
                  sx={{ color: 'text.secondary' }}
                >
                  <ContentCopy sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="View responses">
                <IconButton
                  size="small"
                  component={Link}
                  href={`/forms/${form.id}/responses`}
                  sx={{ color: 'text.secondary' }}
                >
                  <People sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="View analytics">
                <IconButton
                  size="small"
                  component={Link}
                  href={`/forms/${form.id}/analytics`}
                  sx={{ color: 'text.secondary' }}
                >
                  <BarChart sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            </Box>
          </Paper>
        ))}
      </Box>
      {menuAnchor.el && (
        <Menu
          anchorEl={menuAnchor.el}
          open={Boolean(menuAnchor.el)}
          onClose={handleMenuClose}
          anchorOrigin={{
            vertical: 'bottom' as const,
            horizontal: 'right' as const,
          }}
          transformOrigin={{
            vertical: 'top' as const,
            horizontal: 'right' as const,
          }}
        >
          <MenuItem onClick={() => menuAnchor.formId && handleDelete(menuAnchor.formId)}>
            <ListItemIcon>
              <Delete fontSize="small" sx={{ color: 'error.main' }} />
            </ListItemIcon>
            <ListItemText primary="Delete Form" primaryTypographyProps={{ color: 'error' }} />
          </MenuItem>
        </Menu>
      )}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Form Publish Dialog */}
      {publishDialogForm && (
        <PublishDialog
          open={!!publishDialogForm}
          onClose={() => setPublishDialogForm(null)}
          formName={publishDialogForm.name || ''}
          formSlug={publishDialogForm.slug}
          formConfigDataSource={publishDialogForm.dataSource}
          organizationId={orgId}
          organizationSlug={organization?.slug}
          projectId={projectId}
          isPublished={publishDialogForm.isPublished}
          onPublish={handlePublishForm}
        />
      )}
    </Box>
  );
}

interface ApplicationWorkflowsTabProps {
  applicationId: string;
  orgId: string;
  projectId: string;
}

function ApplicationWorkflowsTab({ applicationId, orgId, projectId }: ApplicationWorkflowsTabProps) {
  interface WorkflowsListResponse {
    success?: boolean;
    workflows?: any[];
    total?: number;
  }

  const {
    data,
    error,
    isLoading,
    mutate,
  } = useSWR<WorkflowsListResponse>(
    orgId && projectId && applicationId
      ? `/api/workflows?orgId=${orgId}&projectId=${projectId}&applicationId=${applicationId}`
      : null,
    fetcher
  );

  const workflows = (() => {
    if (!data) return [];
    const arr = data.success ? data.workflows : data.workflows || [];
    return Array.isArray(arr) ? arr : [];
  })();

  const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement | null; workflowId: string | null }>({
    el: null,
    workflowId: null,
  });
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const handleDelete = async (workflowId: string) => {
    if (!confirm('Are you sure you want to delete this workflow? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/workflows/${workflowId}?orgId=${orgId}`, { method: 'DELETE' });
      const data = await response.json();

      if (response.ok) {
        setSnackbar({ open: true, message: 'Workflow deleted successfully', severity: 'success' });
        // Revalidate workflows list from cache
        await mutate();
      } else {
        setSnackbar({ open: true, message: data.error || 'Failed to delete workflow', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Error deleting workflow', severity: 'error' });
    }

    handleMenuClose();
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, workflowId: string) => {
    event.stopPropagation();
    event.preventDefault();
    setMenuAnchor({ el: event.currentTarget, workflowId });
  };

  const handleMenuClose = () => {
    setMenuAnchor({ el: null, workflowId: null });
  };

  if (isLoading && !data && !error) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
        <NetPadLoader size="medium" message="Loading workflows..." />
      </Box>
    );
  }

  if (!isLoading && !error && workflows.length === 0) {
    return (
      <Paper
        sx={{
          p: 6,
          textAlign: 'center',
          bgcolor: alpha(useTheme().palette.background.paper, 0.5),
          border: '1px dashed',
          borderColor: 'divider',
          borderRadius: 2,
        }}
      >
        <AccountTree sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" sx={{ color: 'text.primary', mb: 1 }}>
          No workflows yet
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Create your first workflow for this application
        </Typography>
        <Button
          component={Link}
          href={`${getOrgProjectUrl(orgId, projectId, 'workflows')}?applicationId=${applicationId}`}
          variant="contained"
          sx={{
            bgcolor: useTheme().palette.primary.main,
            color: useTheme().palette.primary.contrastText,
            textTransform: 'none',
            fontWeight: 600,
            '&:hover': { bgcolor: useTheme().palette.primary.dark },
          }}
        >
          Create Workflow
        </Button>
      </Paper>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Workflows ({workflows.length})
        </Typography>
        <Button
          component={Link}
          href={`${getOrgProjectUrl(orgId, projectId, 'workflows')}?applicationId=${applicationId}`}
          variant="outlined"
          size="small"
          sx={{ textTransform: 'none' }}
        >
          Create Workflow
        </Button>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {workflows.map((workflow) => (
          <Paper
            key={workflow.id}
            sx={{
              p: 2,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              '&:hover': {
                borderColor: useTheme().palette.primary.main,
                bgcolor: alpha(useTheme().palette.primary.main, 0.05),
              },
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                  {workflow.name}
                </Typography>
                {workflow.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {workflow.description}
                  </Typography>
                )}
                <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                  {workflow.stats && (
                    <Typography variant="caption" color="text.secondary">
                      {workflow.stats.totalExecutions || 0} executions
                    </Typography>
                  )}
                  {workflow.updatedAt && (
                    <Typography variant="caption" color="text.secondary">
                      Updated {new Date(workflow.updatedAt).toLocaleDateString()}
                    </Typography>
                  )}
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  label={workflow.status || 'Draft'}
                  size="small"
                  sx={{
                    bgcolor: workflow.status === 'active'
                      ? alpha(useTheme().palette.primary.main, 0.15)
                      : alpha(useTheme().palette.text.primary, 0.05),
                    color: workflow.status === 'active' ? useTheme().palette.primary.main : 'text.secondary',
                  }}
                />
                <IconButton
                  size="small"
                  onClick={(e) => handleMenuOpen(e, workflow.id)}
                  sx={{ color: 'text.secondary' }}
                >
                  <MoreVert fontSize="small" />
                </IconButton>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<Edit sx={{ fontSize: 16 }} />}
                component={Link}
                href={`${getOrgProjectUrl(orgId, projectId, 'workflows', workflow.id)}?applicationId=${applicationId}`}
                sx={{
                  textTransform: 'none',
                  borderColor: alpha('#9C27B0', 0.5),
                  color: '#9C27B0',
                  '&:hover': {
                    borderColor: '#9C27B0',
                    bgcolor: alpha('#9C27B0', 0.1),
                  },
                }}
              >
                Edit
              </Button>
            </Box>
          </Paper>
        ))}
      </Box>
      {menuAnchor.el && (
        <Menu
          anchorEl={menuAnchor.el}
          open={Boolean(menuAnchor.el)}
          onClose={handleMenuClose}
          anchorOrigin={{
            vertical: 'bottom' as const,
            horizontal: 'right' as const,
          }}
          transformOrigin={{
            vertical: 'top' as const,
            horizontal: 'right' as const,
          }}
        >
          <MenuItem onClick={() => menuAnchor.workflowId && handleDelete(menuAnchor.workflowId)}>
            <ListItemIcon>
              <Delete fontSize="small" sx={{ color: 'error.main' }} />
            </ListItemIcon>
            <ListItemText primary="Delete Workflow" primaryTypographyProps={{ color: 'error' }} />
          </MenuItem>
        </Menu>
      )}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

interface ApplicationReleasesTabProps {
  applicationId: string;
  orgId: string;
  projectId: string;
  application?: Application | null;
}

interface ReleasesListResponse {
  success?: boolean;
  releases?: ApplicationRelease[];
  total?: number;
}

function ApplicationReleasesTab({ applicationId, orgId, projectId, application }: ApplicationReleasesTabProps) {
  const theme = useTheme();
  const {
    data,
    error,
    isLoading,
    mutate,
  } = useSWR<ReleasesListResponse>(
    orgId && projectId && applicationId
      ? `/api/applications/${applicationId}/releases?orgId=${orgId}&projectId=${projectId}`
      : null,
    fetcher
  );

  const releases: ApplicationRelease[] = data?.releases || [];

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [suggestedVersion, setSuggestedVersion] = useState('1.0.0');
  const [loadingVersion, setLoadingVersion] = useState(false);
  const [version, setVersion] = useState('');
  const [changelog, setChangelog] = useState('');
  const [creating, setCreating] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [selectedRelease, setSelectedRelease] = useState<ApplicationRelease | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const loadSuggestedVersion = async () => {
    try {
      setLoadingVersion(true);
      const response = await fetch(
        `/api/applications/${applicationId}/releases/next-version?orgId=${orgId}`
      );
      const data = await response.json();

      if (data.success && data.suggestedVersion) {
        setSuggestedVersion(data.suggestedVersion);
        setVersion(data.suggestedVersion);
      }
    } catch (error) {
      console.error('Error loading suggested version:', error);
    } finally {
      setLoadingVersion(false);
    }
  };

  const handleCreateRelease = async () => {
    if (!version.trim()) {
      setSnackbar({ open: true, message: 'Version is required', severity: 'error' });
      return;
    }

    try {
      setCreating(true);
      const response = await fetch(`/api/applications/${applicationId}/releases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          projectId,
          version: version.trim(),
          changelog: changelog.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSnackbar({ open: true, message: 'Release created successfully', severity: 'success' });
        setCreateDialogOpen(false);
        setChangelog('');
        // Revalidate releases list and suggested version
        await mutate();
        await loadSuggestedVersion();
      } else {
        setSnackbar({
          open: true,
          message: data.error || 'Failed to create release',
          severity: 'error',
        });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Error creating release', severity: 'error' });
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading && !data && !error) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
        <NetPadLoader size="medium" message="Loading releases..." />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Releases ({releases.length})
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setCreateDialogOpen(true)}
          sx={{ textTransform: 'none' }}
        >
          Create Release
        </Button>
      </Box>

      {(!isLoading && !error && releases.length === 0) ? (
        <Paper
          sx={{
            p: 6,
            textAlign: 'center',
            bgcolor: alpha(theme.palette.background.paper, 0.5),
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: 2,
          }}
        >
          <Publish sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" sx={{ color: 'text.primary', mb: 1 }}>
            No releases yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Create your first release to snapshot this application
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setCreateDialogOpen(true)}
            sx={{
              bgcolor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': { bgcolor: theme.palette.primary.dark },
            }}
          >
            Create Your First Release
          </Button>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {releases.map((release, index) => (
            <Paper
              key={release.releaseId}
              sx={{
                p: 2,
                border: '1px solid',
                borderColor: index === 0 ? theme.palette.primary.main : 'divider',
                borderRadius: 1,
                bgcolor: index === 0 ? alpha(theme.palette.primary.main, 0.05) : 'background.paper',
                '&:hover': {
                  borderColor: theme.palette.primary.main,
                  bgcolor: alpha(theme.palette.primary.main, 0.05),
                },
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      v{release.version}
                    </Typography>
                    {index === 0 && (
                      <Chip
                        label="Latest"
                        size="small"
                        sx={{
                          bgcolor: theme.palette.primary.main,
                          color: 'white',
                          fontSize: '0.7rem',
                          height: 20,
                        }}
                      />
                    )}
                  </Box>
                  {release.changelog && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {release.changelog.split('\n')[0]}
                      {release.changelog.split('\n').length > 1 && '...'}
                    </Typography>
                  )}
                  <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      {release.manifest.forms.length} form
                      {release.manifest.forms.length !== 1 ? 's' : ''}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {release.manifest.workflows.length} workflow
                      {release.manifest.workflows.length !== 1 ? 's' : ''}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(release.createdAt)}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<Publish sx={{ fontSize: 16 }} />}
                    onClick={() => {
                      setSelectedRelease(release);
                      setPublishDialogOpen(true);
                    }}
                    sx={{ textTransform: 'none' }}
                  >
                    Publish
                  </Button>
                </Box>
              </Box>
            </Paper>
          ))}
        </Box>
      )}

      <ApplicationPublishDialog
        open={publishDialogOpen}
        onClose={() => {
          setPublishDialogOpen(false);
          setSelectedRelease(null);
        }}
        releaseContext={
          selectedRelease
            ? {
                orgId,
                projectId,
                applicationId,
                releaseId: selectedRelease.releaseId,
                baseManifest: {
                  name: application?.name,
                  description: application?.description,
                  version: selectedRelease.version,
                  tags: application?.tags,
                  icon: application?.icon,
                  color: application?.color,
                  category: 'other',
                },
                changelog: selectedRelease.changelog,
                counts: {
                  forms: selectedRelease.manifest?.forms?.length || 0,
                  workflows: selectedRelease.manifest?.workflows?.length || 0,
                  connections: 0,
                },
              }
            : undefined
        }
        onPublished={() => {
          setSnackbar({ open: true, message: 'Published to marketplace', severity: 'success' });
        }}
      />

      {/* Create Release Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => !creating && setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Release</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Version"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              fullWidth
              required
              disabled={loadingVersion || creating}
              helperText={
                loadingVersion ? 'Loading suggested version...' : 'Semantic version (e.g., 1.0.0)'
              }
              placeholder={suggestedVersion}
            />
            <TextField
              label="Changelog (optional)"
              value={changelog}
              onChange={(e) => setChangelog(e.target.value)}
              fullWidth
              multiline
              rows={4}
              disabled={creating}
              placeholder="Describe what changed in this release..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)} disabled={creating}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateRelease}
            variant="contained"
            disabled={!version.trim() || creating}
            sx={{ textTransform: 'none' }}
          >
            {creating ? 'Creating...' : 'Create Release'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

function ApplicationDetailContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const theme = useTheme();
  const { mutate: globalMutate } = useSWRConfig();
  const orgId = params.orgId as string;
  const projectId = params.projectId as string;
  const applicationId = params.applicationId as string;

  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const { data: latestReleaseData, error: latestReleaseError } = useSWR<ReleasesListResponse>(
    applicationId && orgId && projectId
      ? `/api/applications/${applicationId}/releases?orgId=${orgId}&projectId=${projectId}&pageSize=1`
      : null,
    fetcher
  );

  const latestRelease: ApplicationRelease | null =
    latestReleaseData?.releases && latestReleaseData.releases.length > 0
      ? latestReleaseData.releases[0]
      : null;

  useEffect(() => {
    if (latestReleaseError) {
      console.error('Error loading latest release:', latestReleaseError);
    }
  }, [latestReleaseError]);

  useEffect(() => {
    if (applicationId) {
      loadApplication();
    }
  }, [applicationId]);

  // Get initial tab from URL
  useEffect(() => {
    const tab = searchParams?.get('tab');
    if (tab === 'forms') setTabValue(0);
    else if (tab === 'workflows') setTabValue(1);
    else if (tab === 'releases') setTabValue(2);
    else if (tab === 'contracts') setTabValue(3);
    else if (tab === 'permissions') setTabValue(4);
    else setTabValue(0); // Default to forms
  }, [searchParams]);

  const loadApplication = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/applications/${applicationId}?orgId=${orgId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('[Application Detail] Failed to load application:', errorData);
        router.push(getOrgProjectUrl(orgId, projectId, 'applications'));
        return;
      }

      const data = await response.json();

      if (data.application) {
        setApplication(data.application);
      } else {
        console.error('[Application Detail] Application not found in response:', data);
        router.push(getOrgProjectUrl(orgId, projectId, 'applications'));
      }
    } catch (error) {
      console.error('[Application Detail] Error loading application:', error);
      router.push(getOrgProjectUrl(orgId, projectId, 'applications'));
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    const tabs = ['forms', 'workflows', 'releases', 'contracts', 'permissions'];
    router.push(
      `${getOrgProjectUrl(orgId, projectId, 'applications', applicationId)}?tab=${tabs[newValue]}`,
      { scroll: false }
    );
  };

  const handleDelete = async () => {
    if (!application) return;

    const formsCount = application.stats?.formsCount || 0;
    const workflowsCount = application.stats?.workflowsCount || 0;
    const hasContent = formsCount > 0 || workflowsCount > 0;

    let confirmMessage = `Are you sure you want to delete "${application.name}"?`;
    if (hasContent) {
      confirmMessage += `\n\nThis will also delete:\n• ${formsCount} form(s)\n• ${workflowsCount} workflow(s)`;
    }
    confirmMessage += '\n\nThis action cannot be undone.';

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const response = await fetch(
        `/api/applications/${applicationId}?orgId=${orgId}&force=true`,
        { method: 'DELETE' }
      );
      const data = await response.json();

      if (data.success) {
        // Invalidate SWR cache so ApplicationContext detects the deletion
        globalMutate((key) => typeof key === 'string' && key.startsWith('/api/applications'), undefined, { revalidate: true });
        router.push(getOrgProjectUrl(orgId, projectId, 'applications'));
      } else {
        alert(data.error || 'Failed to delete application');
      }
    } catch (error) {
      alert('Error deleting application');
    }
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <AppNavBar />
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
            <NetPadLoader size="large" message="Loading application..." />
          </Box>
        </Container>
      </Box>
    );
  }

  if (!application) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <AppNavBar />
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Alert severity="error">Application not found</Alert>
        </Container>
      </Box>
    );
  }

  const statusConfig: Record<ApplicationStatus, { color: string; label: string; icon: React.ReactElement }> = {
    draft: { color: '#9e9e9e', label: 'Draft', icon: <EditIcon fontSize="small" /> },
    active: { color: '#4caf50', label: 'Active', icon: <CheckCircle fontSize="small" /> },
    archived: { color: '#607d8b', label: 'Archived', icon: <Archive fontSize="small" /> },
  };

  const status = statusConfig[application.status];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppNavBar />

      {/* Application Context Bar */}
      <ApplicationContextBar
        applicationId={applicationId}
        applicationName={application.name}
        orgId={orgId}
        projectId={projectId}
        application={application}
      />

      {/* Header */}
      <Box
        sx={{
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: alpha(theme.palette.background.paper, 0.5),
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              py: { xs: 2, sm: 3 },
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'flex-start', sm: 'center' },
              justifyContent: 'space-between',
              gap: { xs: 2, sm: 0 },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
              <Button
                component={Link}
                href={getOrgProjectUrl(orgId, projectId, 'applications')}
                startIcon={<ArrowBack />}
                sx={{ textTransform: 'none' }}
              >
                Back
              </Button>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                {application.color ? (
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 1.5,
                      bgcolor: application.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {application.icon ? (
                      <Box component="img" src={application.icon} alt="" sx={{ width: 24, height: 24 }} />
                    ) : (
                      <Apps sx={{ color: 'white', fontSize: 24 }} />
                    )}
                  </Box>
                ) : (
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 1.5,
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Apps sx={{ color: theme.palette.primary.main, fontSize: 24 }} />
                  </Box>
                )}
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, fontSize: { xs: '1.75rem', sm: '2.125rem' } }}>
                    {application.name}
                  </Typography>
                  {application.description && (
                    <Typography variant="body2" color="text.secondary">
                      {application.description}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Chip
                icon={status.icon}
                label={status.label}
                size="small"
                sx={{
                  bgcolor: alpha(status.color, 0.15),
                  color: status.color,
                  '& .MuiChip-icon': { color: status.color },
                }}
              />
              {application.isDefault && (
                <Chip
                  icon={<Lock sx={{ fontSize: 14 }} />}
                  label="Default"
                  size="small"
                  sx={{
                    bgcolor: alpha(theme.palette.primary.main, 0.15),
                    color: theme.palette.primary.main,
                    '& .MuiChip-icon': { color: theme.palette.primary.main },
                  }}
                />
              )}
              <Button
                variant="outlined"
                startIcon={<Edit />}
                onClick={() => router.push(`${getOrgProjectUrl(orgId, projectId, 'applications', applicationId)}?edit=true`)}
                sx={{ textTransform: 'none' }}
              >
                Edit
              </Button>
            </Box>
          </Box>
          {latestRelease && (
            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body2" color="text.secondary">
                Last Release: <strong>v{latestRelease.version}</strong> on{' '}
                {new Date(latestRelease.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Typography>
            </Box>
          )}
        </Container>
      </Box>

      {/* Stats Bar */}
      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', gap: 4, py: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#00ED64' }}>
                {application.stats.formsCount}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Forms
              </Typography>
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#9C27B0' }}>
                {application.stats.workflowsCount}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Workflows
              </Typography>
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.info.main }}>
                {application.stats.connectionsCount}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Connections
              </Typography>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Tabs */}
      <Container maxWidth="lg" sx={{ py: 0 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="application tabs"
            sx={{
              minHeight: 48,
              '& .MuiTab-root': {
                minHeight: 48,
                textTransform: 'none',
                fontWeight: 500,
              },
              '& .Mui-selected': {
                color: '#00ED64',
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#00ED64',
              },
            }}
          >
            <Tab
              icon={<Description sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label={`Forms (${application.stats.formsCount})`}
              id="application-tab-0"
              aria-controls="application-tabpanel-0"
            />
            <Tab
              icon={<AccountTree sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label={`Workflows (${application.stats.workflowsCount})`}
              id="application-tab-1"
              aria-controls="application-tabpanel-1"
            />
            <Tab
              icon={<Publish sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label="Releases"
              id="application-tab-2"
              aria-controls="application-tabpanel-2"
            />
            <Tab
              icon={<Gavel sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label="Contracts"
              id="application-tab-3"
              aria-controls="application-tabpanel-3"
            />
            <Tab
              icon={<LockIcon sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label="Permissions"
              id="application-tab-4"
              aria-controls="application-tabpanel-4"
            />
          </Tabs>
        </Box>

        {/* Tab Panels */}
        <TabPanel value={tabValue} index={0}>
          <ApplicationFormsTab applicationId={applicationId} orgId={orgId} projectId={projectId} />
        </TabPanel>
        <TabPanel value={tabValue} index={1}>
          <ApplicationWorkflowsTab applicationId={applicationId} orgId={orgId} projectId={projectId} />
        </TabPanel>
        <TabPanel value={tabValue} index={2}>
          <ApplicationReleasesTab applicationId={applicationId} orgId={orgId} projectId={projectId} application={application} />
        </TabPanel>
        <TabPanel value={tabValue} index={3}>
          <ContractsTab applicationId={applicationId} orgId={orgId} projectId={projectId} />
        </TabPanel>
        <TabPanel value={tabValue} index={4}>
          <PermissionsTab applicationId={applicationId} orgId={orgId} projectId={projectId} />
        </TabPanel>
      </Container>
    </Box>
  );
}

export default function ApplicationDetailPage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
          <AppNavBar />
          <Container maxWidth="lg" sx={{ py: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
              <CircularProgress sx={{ color: '#00ED64' }} />
            </Box>
          </Container>
        </Box>
      }
    >
      <ApplicationDetailContent />
    </Suspense>
  );
}
