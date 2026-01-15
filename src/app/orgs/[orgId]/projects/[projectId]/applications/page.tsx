'use client';

import { useState, useEffect, memo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  IconButton,
  alpha,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Tooltip,
  Snackbar,
  Alert,
  useTheme as useMuiTheme,
  Theme,
  Skeleton,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Add,
  Search,
  Edit,
  Delete,
  MoreVert,
  Apps,
  Description,
  AccountTree,
  Settings,
  CheckCircle,
  Archive,
  Edit as EditIcon,
  Lock,
  Storefront,
  AutoAwesome,
} from '@mui/icons-material';
import Link from 'next/link';
import { AppNavBar } from '@/components/Navigation/AppNavBar';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import { getOrgProjectUrl } from '@/lib/routing';
import { Application, ApplicationStatus } from '@/types/application';
import { ApplicationDialog } from '@/components/Applications/ApplicationDialog';
import { InstalledApplicationsView } from '@/components/Applications/InstalledApplicationsView';
import { useInstalledApplications } from '@/hooks/useInstalledApplications';
import { UpdateNotificationBanner } from '@/components/Applications/UpdateNotificationBanner';

interface ApplicationCardProps {
  application: Application;
  theme: Theme;
  orgId: string;
  projectId: string;
  onMenuOpen: (event: React.MouseEvent<HTMLElement>, applicationId: string) => void;
  formatDate: (dateString?: string) => string;
  source?: 'user' | 'installed' | 'system' | 'template';
}

const ApplicationCard = memo(function ApplicationCard({
  application,
  theme,
  orgId,
  projectId,
  onMenuOpen,
  formatDate,
  source = 'user',
}: ApplicationCardProps) {
  const statusConfig: Record<ApplicationStatus, { color: string; label: string; icon: React.ReactElement }> = {
    draft: { color: '#9e9e9e', label: 'Draft', icon: <EditIcon fontSize="small" /> },
    active: { color: '#4caf50', label: 'Active', icon: <CheckCircle fontSize="small" /> },
    archived: { color: '#607d8b', label: 'Archived', icon: <Archive fontSize="small" /> },
  };

  const status = statusConfig[application.status];
  
  // Visual treatment based on source
  const isSystem = source === 'system';
  const isInstalled = source === 'installed';
  const isTemplate = source === 'template';
  const isUser = source === 'user';

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: isSystem 
          ? 'divider' 
          : isInstalled 
            ? alpha('#00ED64', 0.3) 
            : application.isDefault 
              ? alpha(theme.palette.primary.main, 0.3) 
              : 'divider',
        borderRadius: 2,
        opacity: isSystem ? 0.85 : 1,
        transition: 'all 0.2s ease',
        position: 'relative',
        '&:hover': {
          borderColor: isSystem ? 'divider' : theme.palette.primary.main,
          boxShadow: isSystem 
            ? 'none' 
            : `0 4px 20px ${alpha(theme.palette.primary.main, 0.15)}`,
          transform: isSystem ? 'none' : 'translateY(-2px)',
          opacity: isSystem ? 0.9 : 1,
        },
        cursor: 'pointer',
      }}
      onClick={() => {
        window.location.href = getOrgProjectUrl(orgId, projectId, 'applications', application.applicationId);
      }}
    >
      {/* Source Indicator - Top Right */}
      {isSystem && (
        <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
          <Tooltip title="System Application">
            <Lock sx={{ fontSize: 16, color: 'text.secondary', opacity: 0.7 }} />
          </Tooltip>
        </Box>
      )}
      {isInstalled && (
        <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
          <Tooltip title="Installed from Marketplace">
            <Storefront sx={{ fontSize: 16, color: '#00ED64', opacity: 0.8 }} />
          </Tooltip>
        </Box>
      )}
      {isTemplate && (
        <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
          <Tooltip title="Template Application">
            <AutoAwesome sx={{ fontSize: 16, color: theme.palette.warning.main, opacity: 0.8 }} />
          </Tooltip>
        </Box>
      )}
      {/* Header */}
      <CardContent sx={{ flex: 1, pb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1, gap: 1 }}>
          <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
            {/* Icon */}
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

            {/* Title */}
            <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 600, 
                  fontSize: '1rem', 
                  mb: 0.5,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {application.name}
              </Typography>
              {application.description && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {application.description}
                </Typography>
              )}
            </Box>
          </Box>

          {/* Menu - moved outside to prevent overlap */}
          {!isSystem && (
            <IconButton
              size="small"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onMenuOpen(e, application.applicationId);
              }}
              sx={{ flexShrink: 0 }}
            >
              <MoreVert fontSize="small" />
            </IconButton>
          )}
        </Box>

        {/* Tags */}
        {application.tags && application.tags.length > 0 && (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
            {application.tags.slice(0, 3).map((tag) => (
              <Chip
                key={tag}
                label={tag}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.7rem',
                  bgcolor: alpha(theme.palette.text.primary, 0.05),
                }}
              />
            ))}
            {application.tags.length > 3 && (
              <Chip
                label={`+${application.tags.length - 3}`}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.7rem',
                  bgcolor: alpha(theme.palette.text.primary, 0.05),
                }}
              />
            )}
          </Box>
        )}

        {/* Stats */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          <Chip
            icon={<Description sx={{ fontSize: 14 }} />}
            label={`${application.stats.formsCount} form${application.stats.formsCount !== 1 ? 's' : ''}`}
            size="small"
            sx={{
              height: 24,
              fontSize: '0.7rem',
              bgcolor: alpha('#00ED64', 0.15),
              color: '#00ED64',
              '& .MuiChip-icon': { color: '#00ED64' },
            }}
          />
          <Chip
            icon={<AccountTree sx={{ fontSize: 14 }} />}
            label={`${application.stats.workflowsCount} workflow${application.stats.workflowsCount !== 1 ? 's' : ''}`}
            size="small"
            sx={{
              height: 24,
              fontSize: '0.7rem',
              bgcolor: alpha('#9C27B0', 0.15),
              color: '#9C27B0',
              '& .MuiChip-icon': { color: '#9C27B0' },
            }}
          />
          {application.stats.connectionsCount > 0 && (
            <Chip
              icon={<Settings sx={{ fontSize: 14 }} />}
              label={`${application.stats.connectionsCount} connection${application.stats.connectionsCount !== 1 ? 's' : ''}`}
              size="small"
              sx={{
                height: 24,
                fontSize: '0.7rem',
                bgcolor: alpha(theme.palette.info.main, 0.15),
                color: theme.palette.info.main,
                '& .MuiChip-icon': { color: theme.palette.info.main },
              }}
            />
          )}
        </Box>

        {/* Status & Metadata */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <Chip
            icon={status.icon}
            label={status.label}
            size="small"
            sx={{
              height: 24,
              fontSize: '0.7rem',
              bgcolor: alpha(status.color, 0.15),
              color: status.color,
              '& .MuiChip-icon': { color: status.color },
            }}
          />
          {/* Source Badges */}
          {isSystem && (
            <Chip
              icon={<Lock sx={{ fontSize: 14 }} />}
              label="System"
              size="small"
              sx={{
                height: 24,
                fontSize: '0.7rem',
                bgcolor: alpha(theme.palette.text.secondary, 0.1),
                color: 'text.secondary',
                '& .MuiChip-icon': { color: 'text.secondary' },
              }}
            />
          )}
          {isInstalled && (
            <Chip
              icon={<Storefront sx={{ fontSize: 14 }} />}
              label="Installed"
              size="small"
              sx={{
                height: 24,
                fontSize: '0.7rem',
                bgcolor: alpha('#00ED64', 0.15),
                color: '#00ED64',
                '& .MuiChip-icon': { color: '#00ED64' },
              }}
            />
          )}
          {isTemplate && (
            <Chip
              icon={<AutoAwesome sx={{ fontSize: 14 }} />}
              label="Template"
              size="small"
              sx={{
                height: 24,
                fontSize: '0.7rem',
                bgcolor: alpha(theme.palette.warning.main, 0.15),
                color: theme.palette.warning.main,
                '& .MuiChip-icon': { color: theme.palette.warning.main },
              }}
            />
          )}
          {application.isDefault && !isSystem && (
            <Chip
              icon={<Lock sx={{ fontSize: 14 }} />}
              label="Default"
              size="small"
              sx={{
                height: 24,
                fontSize: '0.7rem',
                bgcolor: alpha(theme.palette.primary.main, 0.15),
                color: theme.palette.primary.main,
                '& .MuiChip-icon': { color: theme.palette.primary.main },
              }}
            />
          )}
          <Typography variant="caption" color="text.secondary">
            Updated {formatDate(application.updatedAt?.toString())}
          </Typography>
        </Box>
      </CardContent>

      {/* Actions */}
      <CardActions sx={{ px: 2, pb: 2, pt: 0, gap: 1 }} onClick={(e) => e.stopPropagation()}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<Edit sx={{ fontSize: 16 }} />}
          onClick={(e) => {
            e.stopPropagation();
            window.location.href = getOrgProjectUrl(orgId, projectId, 'applications', application.applicationId);
          }}
          disabled={isSystem}
          sx={{
            borderColor: isSystem 
              ? 'divider' 
              : alpha(theme.palette.info.main, 0.5),
            color: isSystem 
              ? 'text.disabled' 
              : theme.palette.info.main,
            textTransform: 'none',
            fontWeight: 600,
            '&:hover': {
              borderColor: isSystem ? 'divider' : theme.palette.info.main,
              bgcolor: isSystem ? 'transparent' : alpha(theme.palette.info.main, 0.1),
            },
          }}
        >
          {isSystem ? 'View (Read-only)' : 'View'}
        </Button>
      </CardActions>
    </Card>
  );
});

export default function ApplicationsPage() {
  const params = useParams();
  const router = useRouter();
  const theme = useMuiTheme();
  const orgId = params.orgId as string;
  const projectId = params.projectId as string;

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement | null; applicationId: string | null }>({
    el: null,
    applicationId: null,
  });
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingApplication, setEditingApplication] = useState<Application | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  // Check for updates in installed applications
  const { updatesAvailable, installations } = useInstalledApplications({
    orgId,
    projectId,
    refreshInterval: 0, // Manual refresh only
  });

  useEffect(() => {
    if (orgId && projectId) {
      loadApplications();
    }
  }, [orgId, projectId]);

  // Check if create/edit query params are present
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const create = searchParams.get('create');
    const edit = searchParams.get('edit');
    const appId = searchParams.get('applicationId');

    if (create === 'true') {
      setEditingApplication(null);
      setDialogOpen(true);
      // Clean up URL
      router.replace(getOrgProjectUrl(orgId, projectId, 'applications'), { scroll: false });
    } else if (edit === 'true' && appId) {
      const app = applications.find((a) => a.applicationId === appId);
      if (app) {
        setEditingApplication(app);
        setDialogOpen(true);
        // Clean up URL
        router.replace(getOrgProjectUrl(orgId, projectId, 'applications', appId), { scroll: false });
      }
    }
  }, [orgId, projectId, applications, router]);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/applications?orgId=${orgId}&projectId=${projectId}`);
      const data = await response.json();

      console.log('[ApplicationsPage] API Response:', {
        success: data.success,
        applicationsCount: data.applications?.length || 0,
        applications: data.applications,
        total: data.total,
      });

      if (data.success && data.applications) {
        console.log('[ApplicationsPage] Setting applications:', data.applications.length);
        console.log('[ApplicationsPage] First application sample:', JSON.stringify(data.applications[0], null, 2));
        console.log('[ApplicationsPage] All application IDs:', data.applications.map((a: any) => a.applicationId));
        console.log('[ApplicationsPage] All application statuses:', data.applications.map((a: any) => ({ id: a.applicationId, name: a.name, status: a.status })));
        
        // Validate application structure
        const invalidApps = data.applications.filter((a: any) => !a.applicationId || !a.name || !a.status);
        if (invalidApps.length > 0) {
          console.error('[ApplicationsPage] Invalid applications found:', invalidApps);
        }
        
        setApplications(data.applications);
      } else {
        console.warn('[ApplicationsPage] No applications in response:', data);
      }
    } catch (error) {
      console.error('Error loading applications:', error);
      setSnackbar({ open: true, message: 'Failed to load applications', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (applicationId: string) => {
    const application = applications.find((app) => app.applicationId === applicationId);
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
        setSnackbar({ open: true, message: 'Application deleted successfully', severity: 'success' });
        loadApplications();
      } else {
        setSnackbar({ open: true, message: data.error || 'Failed to delete application', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Error deleting application', severity: 'error' });
    }

    handleMenuClose();
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, applicationId: string) => {
    event.stopPropagation();
    event.preventDefault();
    setMenuAnchor({ el: event.currentTarget, applicationId });
  };

  const handleMenuClose = () => {
    setMenuAnchor({ el: null, applicationId: null });
  };

  const filteredApplications = applications.filter((app) => {
    const matchesSearch =
      (app.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (app.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (app.tags || []).some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  // Debug logging
  useEffect(() => {
    console.log('[ApplicationsPage] State:', {
      applicationsCount: applications.length,
      filteredCount: filteredApplications.length,
      searchQuery,
      activeCount: filteredApplications.filter((a) => a.status === 'active').length,
      draftCount: filteredApplications.filter((a) => a.status === 'draft').length,
      archivedCount: filteredApplications.filter((a) => a.status === 'archived').length,
      applicationIds: applications.map((a) => a.applicationId),
      filteredIds: filteredApplications.map((a) => a.applicationId),
      activeIds: filteredApplications.filter((a) => a.status === 'active').map((a) => a.applicationId),
    });
    console.log('[ApplicationsPage] Active applications:', filteredApplications.filter((a) => a.status === 'active'));
  }, [applications, filteredApplications, searchQuery]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Detect application source for filtering
  const detectApplicationSource = (app: Application | undefined): 'user' | 'installed' | 'system' | 'template' => {
    // Safety check
    if (!app) {
      return 'user';
    }
    
    // System apps
    if (app.isDefault || app.name === 'General – Default Application' || app.name?.includes('Default')) {
      return 'system';
    }
    // Installed apps - check if this app matches an installed application
    const installedApp = installations?.find(
      inst => inst.marketplaceApplicationId === app.marketplaceApplicationId ||
               inst.marketplaceApplicationName === app.name
    );
    if (installedApp || app.marketplaceApplicationId) {
      return 'installed';
    }
    // Template apps (check tags)
    if (app.tags?.includes('template') || app.tags?.includes('starter')) {
      return 'template';
    }
    // Default: user-created
    return 'user';
  };

  // Filter applications by active tab
  const getFilteredApplicationsByTab = () => {
    // Safety: filter out any undefined applications first
    const validApplications = filteredApplications.filter((a): a is Application => a != null);
    
    if (activeTab === 1) {
      // Installed tab
      return validApplications.filter((a) => detectApplicationSource(a) === 'installed');
    } else if (activeTab === 2) {
      // System tab
      return validApplications.filter((a) => detectApplicationSource(a) === 'system');
    } else {
      // My Applications tab (default)
      return validApplications.filter((a) => {
        const source = detectApplicationSource(a);
        return source === 'user' || source === 'template';
      });
    }
  };

  const tabFilteredApplications = getFilteredApplicationsByTab();
  
  const activeApplications = tabFilteredApplications.filter((a) => {
    const isActive = a.status === 'active';
    if (!isActive && a.status) {
      console.log('[ApplicationsPage] Application not active:', { id: a.applicationId, name: a.name, status: a.status, statusType: typeof a.status });
    }
    return isActive;
  });
  const draftApplications = tabFilteredApplications.filter((a) => a.status === 'draft');
  const archivedApplications = tabFilteredApplications.filter((a) => a.status === 'archived');
  
  console.log('[ApplicationsPage] Filtered by status:', {
    total: filteredApplications.length,
    active: activeApplications.length,
    draft: draftApplications.length,
    archived: archivedApplications.length,
    activeIds: activeApplications.map((a) => a.applicationId),
  });

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppNavBar />

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
            <Box sx={{ flex: 1 }}>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  color: 'text.primary',
                  fontSize: { xs: '1.75rem', sm: '2.125rem' },
                }}
              >
                Applications
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
                Organize forms and workflows into applications
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<Add />}
              fullWidth={false}
              sx={{
                bgcolor: theme.palette.primary.main,
                color: theme.palette.primary.contrastText,
                textTransform: 'none',
                fontWeight: 600,
                px: 3,
                '&:hover': { bgcolor: theme.palette.primary.dark },
              }}
              onClick={() => {
                setEditingApplication(null);
                setDialogOpen(true);
              }}
            >
              Create Application
            </Button>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Update Notification Banner */}
        {updatesAvailable > 0 && activeTab === 0 && (
          <UpdateNotificationBanner
            updatesCount={updatesAvailable}
            onViewUpdates={() => setActiveTab(1)}
          />
        )}

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
            <Tab 
              label="My Applications" 
              icon={<Apps />} 
              iconPosition="start" 
            />
            <Tab
              label={updatesAvailable > 0 ? `Installed (${updatesAvailable})` : "Installed"}
              icon={<CheckCircle />}
              iconPosition="start"
            />
            <Tab
              label="System"
              icon={<Lock />}
              iconPosition="start"
            />
          </Tabs>
        </Box>

        {/* Installed Applications View */}
        {activeTab === 1 ? (
          <InstalledApplicationsView organizationId={orgId} projectId={projectId} />
        ) : activeTab === 2 ? (
          // System Applications - filtered view
          <>
            <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
              <TextField
                fullWidth
                placeholder="Search system applications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: alpha(theme.palette.background.paper, 0.5),
                    '& fieldset': { borderColor: 'divider' },
                    '&:hover fieldset': { borderColor: alpha(theme.palette.text.primary, 0.2) },
                    '&.Mui-focused fieldset': { borderColor: theme.palette.primary.main },
                  },
                }}
              />
            </Box>
            {tabFilteredApplications.length === 0 ? (
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
                <Lock sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" sx={{ color: 'text.primary', mb: 1 }}>
                  No system applications
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  System applications are created automatically by NetPad
                </Typography>
              </Paper>
            ) : (
              <Grid container spacing={3}>
                {tabFilteredApplications.map((app) => (
                  <Grid item xs={12} sm={6} md={4} key={app.applicationId}>
                    <ApplicationCard
                      application={app}
                      theme={theme}
                      orgId={orgId}
                      projectId={projectId}
                      onMenuOpen={handleMenuOpen}
                      formatDate={formatDate}
                      source={detectApplicationSource(app)}
                    />
                  </Grid>
                ))}
              </Grid>
            )}
          </>
        ) : (
          <>
            <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
              <TextField
            fullWidth
            placeholder="Search applications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: alpha(theme.palette.background.paper, 0.5),
                '& fieldset': { borderColor: 'divider' },
                '&:hover fieldset': { borderColor: alpha(theme.palette.text.primary, 0.2) },
                '&.Mui-focused fieldset': { borderColor: theme.palette.primary.main },
              },
            }}
          />
        </Box>

        {loading ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 300,
            }}
          >
            <NetPadLoader size="large" message="Loading applications..." />
          </Box>
        ) : tabFilteredApplications.length === 0 ? (
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
            <Apps sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" sx={{ color: 'text.primary', mb: 1 }}>
              {searchQuery 
                ? 'No applications found' 
                : activeTab === 1 
                  ? 'No installed applications'
                  : activeTab === 2
                    ? 'No system applications'
                    : 'No applications yet'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {searchQuery
                ? 'Try adjusting your search query'
                : activeTab === 1
                  ? 'Install applications from the Marketplace to see them here'
                  : activeTab === 2
                    ? 'System applications are created automatically'
                    : 'Create your first application to organize forms and workflows'}
            </Typography>
            {!searchQuery && (
              <Button
                variant="contained"
                startIcon={<Add />}
                sx={{
                  bgcolor: theme.palette.primary.main,
                  color: theme.palette.primary.contrastText,
                  textTransform: 'none',
                  fontWeight: 600,
                  '&:hover': { bgcolor: theme.palette.primary.dark },
                }}
                onClick={() => {
                  setEditingApplication(null);
                  setDialogOpen(true);
                }}
              >
                Create Your First Application
              </Button>
            )}
          </Paper>
        ) : (
          <>
            {activeApplications.length > 0 && (
              <Box sx={{ mb: 5 }}>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    color: theme.palette.primary.main,
                    mb: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <CheckCircle sx={{ fontSize: 20 }} />
                  Active Applications
                  <Chip
                    label={activeApplications.length}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '0.7rem',
                      bgcolor: alpha(theme.palette.primary.main, 0.15),
                      color: theme.palette.primary.main,
                    }}
                  />
                </Typography>
                <Grid container spacing={3}>
                  {activeApplications.map((app) => {
                    console.log('[ApplicationsPage] Rendering application card:', app.name, app.applicationId);
                    return (
                      <Grid item xs={12} sm={6} md={4} key={app.applicationId}>
                        <ApplicationCard
                          application={app}
                          theme={theme}
                          orgId={orgId}
                          projectId={projectId}
                          onMenuOpen={handleMenuOpen}
                          formatDate={formatDate}
                          source={detectApplicationSource(app)}
                        />
                      </Grid>
                    );
                  })}
                </Grid>
              </Box>
            )}

            {draftApplications.length > 0 && (
              <Box sx={{ mb: 5 }}>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    color: 'text.secondary',
                    mb: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <EditIcon sx={{ fontSize: 20 }} />
                  Draft Applications
                  <Chip
                    label={draftApplications.length}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '0.7rem',
                      bgcolor: alpha(theme.palette.text.primary, 0.1),
                      color: 'text.secondary',
                    }}
                  />
                </Typography>
                <Grid container spacing={3}>
                  {draftApplications.map((app) => (
                    <Grid item xs={12} sm={6} md={4} key={app.applicationId}>
                      <ApplicationCard
                        application={app}
                        theme={theme}
                        orgId={orgId}
                        projectId={projectId}
                        onMenuOpen={handleMenuOpen}
                        formatDate={formatDate}
                        source={detectApplicationSource(app)}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

            {archivedApplications.length > 0 && (
              <Box>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    color: 'text.secondary',
                    mb: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <Archive sx={{ fontSize: 20 }} />
                  Archived Applications
                  <Chip
                    label={archivedApplications.length}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '0.7rem',
                      bgcolor: alpha(theme.palette.text.primary, 0.1),
                      color: 'text.secondary',
                    }}
                  />
                </Typography>
                <Grid container spacing={3}>
                  {archivedApplications.map((app) => (
                    <Grid item xs={12} sm={6} md={4} key={app.applicationId}>
                      <ApplicationCard
                        application={app}
                        theme={theme}
                        orgId={orgId}
                        projectId={projectId}
                        onMenuOpen={handleMenuOpen}
                        formatDate={formatDate}
                        source={detectApplicationSource(app)}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}
          </>
        )}
          </>
        )}
      </Container>

      <Menu
        anchorEl={menuAnchor.el}
        open={Boolean(menuAnchor.el)}
        onClose={handleMenuClose}
        slotProps={{
          paper: {
            sx: {
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              minWidth: 180,
            },
          },
        }}
      >
        <MenuItem
          component={Link}
          href={getOrgProjectUrl(orgId, projectId, 'applications', menuAnchor.applicationId || undefined)}
          onClick={handleMenuClose}
        >
          <ListItemIcon>
            <Edit fontSize="small" sx={{ color: theme.palette.info.main }} />
          </ListItemIcon>
          <ListItemText>View Application</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => menuAnchor.applicationId && handleDelete(menuAnchor.applicationId)}
          sx={{ color: 'error.main' }}
          disabled={
            (() => {
              const app = applications.find((a) => a.applicationId === menuAnchor.applicationId);
              return app?.isDefault || detectApplicationSource(app) === 'system';
            })()
          }
        >
          <ListItemIcon>
            <Delete fontSize="small" sx={{ color: 'error.main' }} />
          </ListItemIcon>
          <ListItemText>Delete Application</ListItemText>
        </MenuItem>
      </Menu>

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

      <ApplicationDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingApplication(null);
        }}
        onSave={(savedApplication) => {
          setSnackbar({
            open: true,
            message: editingApplication ? 'Application updated successfully' : 'Application created successfully',
            severity: 'success',
          });
          loadApplications();
          if (!editingApplication) {
            // Navigate to the new application detail page
            router.push(getOrgProjectUrl(orgId, projectId, 'applications', savedApplication.applicationId));
          }
        }}
        application={editingApplication}
        organizationId={orgId}
        projectId={projectId}
      />
    </Box>
  );
}
