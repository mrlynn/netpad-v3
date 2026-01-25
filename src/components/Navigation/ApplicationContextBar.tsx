/**
 * Application Context Bar
 *
 * Shows current application context with breadcrumb navigation and quick switch.
 * Used on application detail pages and when editing forms/workflows within an app.
 *
 * Features:
 * - Breadcrumb: Applications > [App Name] > [Current Section]
 * - Quick switch dropdown to change applications
 * - Compact mode for editors (forms, workflows)
 * - Persistent mode for app-centric navigation (sticky header)
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Chip,
  Link as MuiLink,
  Typography,
  alpha,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Breadcrumbs,
  Button,
} from '@mui/material';
import {
  Apps,
  ArrowBack,
  Close,
  KeyboardArrowDown,
  ChevronRight,
  Description,
  AccountTree,
  Storage,
  SwapHoriz,
  CheckCircle,
  ArrowDropDown,
  Home,
  Settings,
  Analytics,
} from '@mui/icons-material';
import Link from 'next/link';
import { useParams, useSearchParams, usePathname, useRouter } from 'next/navigation';
import { getOrgProjectUrl, getAppUrl } from '@/lib/routing';
import { Application } from '@/types/application';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import { useApplicationSafe } from '@/contexts/ApplicationContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { ApplicationSwitcher } from './ApplicationSwitcher';
import { TemplateIcon } from '@/components/Templates/TemplateIcon';

type ContextSection = 'forms' | 'workflows' | 'data' | 'releases' | 'contracts' | 'permissions' | 'overview';

interface ApplicationContextBarProps {
  /** Application ID (auto-detected from URL if not provided) */
  applicationId?: string;
  /** Application name (fetched if not provided) */
  applicationName?: string;
  /** Organization ID (auto-detected from URL if not provided) */
  orgId?: string;
  /** Project ID (auto-detected from URL if not provided) */
  projectId?: string;
  /** Current section being viewed */
  currentSection?: ContextSection;
  /** Callback when close button is clicked (only in compact mode) */
  onClose?: () => void;
  /** Use compact mode (for form/workflow editors) */
  compact?: boolean;
  /** Show quick switch dropdown */
  showQuickSwitch?: boolean;
  /** Pre-loaded application data (avoids extra fetch) */
  application?: Application;
}

const sectionConfig: Record<ContextSection, { label: string; icon: React.ReactElement }> = {
  overview: { label: 'Overview', icon: <Apps sx={{ fontSize: 16 }} /> },
  forms: { label: 'Forms', icon: <Description sx={{ fontSize: 16 }} /> },
  workflows: { label: 'Workflows', icon: <AccountTree sx={{ fontSize: 16 }} /> },
  data: { label: 'Data', icon: <Storage sx={{ fontSize: 16 }} /> },
  releases: { label: 'Releases', icon: <Apps sx={{ fontSize: 16 }} /> },
  contracts: { label: 'Contracts', icon: <Apps sx={{ fontSize: 16 }} /> },
  permissions: { label: 'Permissions', icon: <Apps sx={{ fontSize: 16 }} /> },
};

export function ApplicationContextBar({
  applicationId: propApplicationId,
  applicationName: propApplicationName,
  orgId: propOrgId,
  projectId: propProjectId,
  currentSection,
  onClose,
  compact = false,
  showQuickSwitch = true,
  application: propApplication,
}: ApplicationContextBarProps) {
  const params = useParams();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  // Extract from URL params/query if not provided as props
  const urlOrgId = params?.orgId as string | undefined;
  const urlProjectId = params?.projectId as string | undefined;
  const urlApplicationId = searchParams?.get('applicationId') || params?.applicationId as string | undefined;

  const applicationId = propApplicationId || urlApplicationId;
  const orgId = propOrgId || urlOrgId;
  const projectId = propProjectId || urlProjectId;

  const [applicationName, setApplicationName] = useState<string | undefined>(propApplicationName || propApplication?.name);
  const [applicationColor, setApplicationColor] = useState<string | undefined>(propApplication?.color);
  const [loading, setLoading] = useState(false);

  // Quick switch state
  const [applications, setApplications] = useState<Application[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [switchMenuAnchor, setSwitchMenuAnchor] = useState<null | HTMLElement>(null);

  // Auto-detect current section from pathname
  const detectedSection: ContextSection = currentSection || (() => {
    if (pathname?.includes('/builder') || pathname?.includes('/forms')) return 'forms';
    if (pathname?.includes('/workflows')) return 'workflows';
    if (pathname?.includes('/data')) return 'data';
    // Check URL tab param for application detail page
    const tab = searchParams?.get('tab');
    if (tab === 'forms') return 'forms';
    if (tab === 'workflows') return 'workflows';
    if (tab === 'releases') return 'releases';
    if (tab === 'contracts') return 'contracts';
    if (tab === 'permissions') return 'permissions';
    return 'overview';
  })();

  // Load application name if we have applicationId but not name
  useEffect(() => {
    if (applicationId && !applicationName && orgId) {
      const loadApplication = async () => {
        try {
          setLoading(true);
          const response = await fetch(`/api/applications/${applicationId}?orgId=${orgId}`);
          if (response.ok) {
            const data = await response.json();
            if (data.application) {
              setApplicationName(data.application.name);
              setApplicationColor(data.application.color);
            }
          }
        } catch (error) {
          console.error('[ApplicationContextBar] Failed to load application:', error);
        } finally {
          setLoading(false);
        }
      };
      loadApplication();
    }
  }, [applicationId, applicationName, orgId]);

  // Load applications for quick switch
  const loadApplicationsForSwitch = async () => {
    if (!orgId || !projectId || loadingApps || applications.length > 0) return;

    try {
      setLoadingApps(true);
      const response = await fetch(`/api/applications?orgId=${orgId}&projectId=${projectId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.applications) {
          setApplications(data.applications);
        }
      }
    } catch (error) {
      console.error('[ApplicationContextBar] Failed to load applications:', error);
    } finally {
      setLoadingApps(false);
    }
  };

  const handleSwitchMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setSwitchMenuAnchor(event.currentTarget);
    loadApplicationsForSwitch();
  };

  const handleSwitchMenuClose = () => {
    setSwitchMenuAnchor(null);
  };

  // Handle create new application from switcher
  const handleCreateApp = () => {
    if (orgId && projectId) {
      router.push(getOrgProjectUrl(orgId, projectId, 'applications') + '?action=create');
    } else if (orgId) {
      router.push(`/orgs/${orgId}/projects`);
    } else {
      router.push('/dashboard');
    }
  };

  // Don't render if we don't have application context
  if (!applicationId || !orgId || !projectId) {
    return null;
  }

  const applicationUrl = getOrgProjectUrl(orgId, projectId, 'applications', applicationId);
  const applicationsListUrl = getOrgProjectUrl(orgId, projectId, 'applications');

  // Compact mode - simple bar for editors
  if (compact) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1.5,
          py: 0.75,
          bgcolor: alpha('#00ED64', 0.08),
          borderBottom: '1px solid',
          borderColor: alpha('#00ED64', 0.2),
        }}
      >
        <Apps sx={{ fontSize: 16, color: '#00ED64' }} />
        <Typography variant="caption" sx={{ fontWeight: 500, color: 'text.secondary' }}>
          Application:
        </Typography>
        <MuiLink
          component={Link}
          href={applicationUrl}
          sx={{
            color: '#00ED64',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '0.75rem',
            '&:hover': {
              textDecoration: 'underline',
            },
          }}
        >
          {applicationName || 'Loading...'}
        </MuiLink>
        {onClose && (
          <IconButton
            size="small"
            onClick={onClose}
            sx={{
              ml: 'auto',
              color: 'text.secondary',
              p: 0.25,
              '&:hover': { bgcolor: alpha('#000', 0.05) },
            }}
          >
            <Close sx={{ fontSize: 16 }} />
          </IconButton>
        )}
      </Box>
    );
  }

  // Full mode - breadcrumb with quick switch
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        px: 2,
        py: 1,
        bgcolor: alpha('#00ED64', 0.06),
        borderBottom: '1px solid',
        borderColor: alpha('#00ED64', 0.15),
      }}
    >
      {/* Breadcrumb */}
      <Breadcrumbs
        separator={<ChevronRight sx={{ fontSize: 16, color: 'text.disabled' }} />}
        sx={{
          flex: 1,
          '& .MuiBreadcrumbs-separator': {
            mx: 0.5,
          },
        }}
      >
        {/* Applications link */}
        <MuiLink
          component={Link}
          href={applicationsListUrl}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            color: 'text.secondary',
            textDecoration: 'none',
            fontSize: '0.8125rem',
            '&:hover': {
              color: '#00ED64',
            },
          }}
        >
          <Apps sx={{ fontSize: 16 }} />
          Applications
        </MuiLink>

        {/* Current application with color indicator */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          {applicationColor && (
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: 0.5,
                bgcolor: applicationColor,
                flexShrink: 0,
              }}
            />
          )}
          <MuiLink
            component={Link}
            href={applicationUrl}
            sx={{
              color: '#00ED64',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.8125rem',
              '&:hover': {
                textDecoration: 'underline',
              },
            }}
          >
            {loading ? 'Loading...' : applicationName || 'Unknown'}
          </MuiLink>
        </Box>

        {/* Current section (if not overview) */}
        {detectedSection !== 'overview' && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {sectionConfig[detectedSection].icon}
            <Typography
              variant="body2"
              sx={{
                color: 'text.primary',
                fontWeight: 500,
                fontSize: '0.8125rem',
              }}
            >
              {sectionConfig[detectedSection].label}
            </Typography>
          </Box>
        )}
      </Breadcrumbs>

      {/* Quick Switch */}
      {showQuickSwitch && (
        <>
          <Tooltip title="Switch application">
            <IconButton
              size="small"
              onClick={handleSwitchMenuOpen}
              sx={{
                color: 'text.secondary',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                px: 1,
                py: 0.5,
                '&:hover': {
                  bgcolor: alpha('#00ED64', 0.1),
                  borderColor: alpha('#00ED64', 0.3),
                },
              }}
            >
              <SwapHoriz sx={{ fontSize: 16, mr: 0.5 }} />
              <Typography variant="caption" sx={{ fontWeight: 500 }}>
                Switch
              </Typography>
              <KeyboardArrowDown sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>

          <Menu
            anchorEl={switchMenuAnchor}
            open={Boolean(switchMenuAnchor)}
            onClose={handleSwitchMenuClose}
            PaperProps={{
              sx: {
                mt: 1,
                minWidth: 240,
                maxHeight: 400,
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
              },
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                Switch to Application
              </Typography>
            </Box>
            <Divider />

            {loadingApps ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <NetPadLoader size="small" />
              </Box>
            ) : applications.length === 0 ? (
              <MenuItem disabled>
                <ListItemText primary="No applications found" />
              </MenuItem>
            ) : (
              applications.map((app) => {
                const isCurrentApp = app.applicationId === applicationId;
                return (
                  <MenuItem
                    key={app.applicationId}
                    component={Link}
                    href={getOrgProjectUrl(orgId, projectId, 'applications', app.applicationId)}
                    onClick={handleSwitchMenuClose}
                    selected={isCurrentApp}
                    sx={{
                      py: 1,
                      '&.Mui-selected': {
                        bgcolor: alpha('#00ED64', 0.1),
                        '&:hover': {
                          bgcolor: alpha('#00ED64', 0.15),
                        },
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      {app.color ? (
                        <Box
                          sx={{
                            width: 20,
                            height: 20,
                            borderRadius: 0.5,
                            bgcolor: app.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Apps sx={{ fontSize: 12, color: 'white' }} />
                        </Box>
                      ) : (
                        <Apps sx={{ fontSize: 20, color: '#00ED64' }} />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={app.name}
                      secondary={`${app.stats?.formsCount || 0} forms, ${app.stats?.workflowsCount || 0} workflows`}
                      primaryTypographyProps={{
                        fontWeight: isCurrentApp ? 600 : 400,
                        fontSize: '0.875rem',
                      }}
                      secondaryTypographyProps={{
                        fontSize: '0.7rem',
                      }}
                    />
                    {isCurrentApp && (
                      <CheckCircle sx={{ fontSize: 16, color: '#00ED64', ml: 1 }} />
                    )}
                  </MenuItem>
                );
              })
            )}

            <Divider />
            <MenuItem
              component={Link}
              href={applicationsListUrl}
              onClick={handleSwitchMenuClose}
              sx={{ py: 1 }}
            >
              <ListItemIcon sx={{ minWidth: 32 }}>
                <Apps sx={{ fontSize: 18, color: 'text.secondary' }} />
              </ListItemIcon>
              <ListItemText
                primary="View all applications"
                primaryTypographyProps={{ fontSize: '0.875rem' }}
              />
            </MenuItem>
          </Menu>
        </>
      )}
    </Box>
  );
}

// ============================================
// Persistent Application Context Bar
// ============================================

/**
 * Persistent Application Context Bar (App-Centric)
 *
 * This is a sticky header that shows when the user is inside an application
 * using the app-centric routes (/apps/[slug]/...). It provides:
 *
 * 1. Application identity (icon, name) with click to switch
 * 2. Navigation tabs (Forms, Workflows, Data, Settings)
 * 3. Breadcrumb showing org context
 *
 * The bar NEVER disappears while inside an application,
 * ensuring users always know which application they're working in.
 *
 * This addresses the UX concern: "If I screenshot this, would a user
 * know which application they're in?"
 */

interface NavTab {
  key: string;
  label: string;
  icon: React.ReactNode;
  href: string;
}

export function PersistentApplicationBar() {
  const pathname = usePathname();
  const router = useRouter();
  const applicationContext = useApplicationSafe();
  const currentApplication = applicationContext?.currentApplication ?? null;
  const { organization, currentOrgId } = useOrganization();
  const { user } = useAuth();

  const [appSwitcherOpen, setAppSwitcherOpen] = useState(false);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [currentItemName, setCurrentItemName] = useState<string | null>(null);
  const [currentItemType, setCurrentItemType] = useState<'form' | 'workflow' | null>(null);

  // Check if user has admin access to this organization
  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!currentOrgId || !user) {
        setHasAdminAccess(false);
        return;
      }

      // Platform admins always have access
      if (user.platformRole === 'admin') {
        setHasAdminAccess(true);
        return;
      }

      // Check org membership for owner/admin role
      try {
        const response = await fetch(`/api/orgs/${currentOrgId}/analytics?days=1`);
        setHasAdminAccess(response.ok);
      } catch {
        setHasAdminAccess(false);
      }
    };

    checkAdminAccess();
  }, [currentOrgId, user]);

  // Fetch project name for breadcrumb
  useEffect(() => {
    const fetchProjectName = async () => {
      if (!currentApplication?.projectId || !currentOrgId) {
        setProjectName(null);
        return;
      }

      try {
        const response = await fetch(`/api/projects/${currentApplication.projectId}?orgId=${currentOrgId}`);
        if (response.ok) {
          const data = await response.json();
          setProjectName(data.project?.name || null);
        }
      } catch (error) {
        console.error('[PersistentApplicationBar] Failed to fetch project:', error);
      }
    };

    fetchProjectName();
  }, [currentApplication?.projectId, currentOrgId]);

  // Handle create new application from switcher
  const handleCreateApp = () => {
    const projectId = currentApplication?.projectId;
    if (currentOrgId && projectId) {
      router.push(getOrgProjectUrl(currentOrgId, projectId, 'applications') + '?action=create');
    } else if (currentOrgId) {
      router.push(`/orgs/${currentOrgId}/projects`);
    } else {
      router.push('/dashboard');
    }
  };

  // Fetch current form/workflow name for breadcrumb when in edit mode
  useEffect(() => {
    const fetchItemName = async () => {
      if (!pathname || !currentOrgId) {
        setCurrentItemName(null);
        setCurrentItemType(null);
        return;
      }

      // Check for form edit: /apps/[slug]/forms/[formId]/edit
      const formEditMatch = pathname.match(/\/apps\/[^/]+\/forms\/([^/]+)\/edit/);
      if (formEditMatch) {
        const formId = formEditMatch[1];
        try {
          const response = await fetch(`/api/forms/${formId}?orgId=${currentOrgId}`);
          if (response.ok) {
            const data = await response.json();
            setCurrentItemName(data.form?.name || `Form ${formId.slice(0, 8)}`);
            setCurrentItemType('form');
            return;
          }
        } catch (error) {
          console.error('[PersistentApplicationBar] Failed to fetch form:', error);
        }
        setCurrentItemName(`Form ${formId.slice(0, 8)}`);
        setCurrentItemType('form');
        return;
      }

      // Check for workflow edit: /apps/[slug]/workflows/[workflowId]/edit
      const workflowEditMatch = pathname.match(/\/apps\/[^/]+\/workflows\/([^/]+)\/edit/);
      if (workflowEditMatch) {
        const workflowId = workflowEditMatch[1];
        try {
          const response = await fetch(`/api/workflows/${workflowId}?orgId=${currentOrgId}`);
          if (response.ok) {
            const data = await response.json();
            setCurrentItemName(data.workflow?.name || `Workflow ${workflowId.slice(0, 8)}`);
            setCurrentItemType('workflow');
            return;
          }
        } catch (error) {
          console.error('[PersistentApplicationBar] Failed to fetch workflow:', error);
        }
        setCurrentItemName(`Workflow ${workflowId.slice(0, 8)}`);
        setCurrentItemType('workflow');
        return;
      }

      // Not in edit mode
      setCurrentItemName(null);
      setCurrentItemType(null);
    };

    fetchItemName();
  }, [pathname, currentOrgId]);

  // Don't render if no application is selected
  if (!currentApplication) {
    return null;
  }

  const appSlug = currentApplication.slug;

  // Navigation tabs for within the application
  const navTabs: NavTab[] = [
    {
      key: 'overview',
      label: 'Overview',
      icon: <Home sx={{ fontSize: 16 }} />,
      href: `/apps/${appSlug}`,
    },
    {
      key: 'forms',
      label: 'Forms',
      icon: <Description sx={{ fontSize: 16 }} />,
      href: getAppUrl(appSlug, 'forms'),
    },
    {
      key: 'workflows',
      label: 'Workflows',
      icon: <AccountTree sx={{ fontSize: 16 }} />,
      href: getAppUrl(appSlug, 'workflows'),
    },
    {
      key: 'data',
      label: 'Data',
      icon: <Storage sx={{ fontSize: 16 }} />,
      href: getAppUrl(appSlug, 'data'),
    },
    {
      key: 'settings',
      label: 'Settings',
      icon: <Settings sx={{ fontSize: 16 }} />,
      href: getAppUrl(appSlug, 'settings'),
    },
    // Admin tab - only shown for org admins
    ...(hasAdminAccess ? [{
      key: 'admin',
      label: 'Analytics',
      icon: <Analytics sx={{ fontSize: 16 }} />,
      href: getAppUrl(appSlug, 'admin'),
    }] : []),
  ];

  // Determine which tab is active based on pathname
  const getActiveTab = (): string => {
    if (!pathname) return 'overview';
    // Check specific sections first
    if (pathname.includes('/forms') || pathname.includes('/builder')) return 'forms';
    if (pathname.includes('/workflows')) return 'workflows';
    if (pathname.includes('/data')) return 'data';
    if (pathname.includes('/settings')) return 'settings';
    if (pathname.includes('/admin')) return 'admin';
    // If just /apps/[slug] with no sub-path, it's overview
    if (pathname.match(/^\/apps\/[^/]+\/?$/)) return 'overview';
    return 'overview'; // default to overview
  };

  const activeTab = getActiveTab();

  return (
    <>
      <Box
        sx={{
          // No longer sticky - handled by parent layout
          flexShrink: 0,
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          px: 2,
          py: 0.75,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          // Subtle app-branded gradient
          background: (theme) =>
            theme.palette.mode === 'dark'
              ? `linear-gradient(180deg, ${alpha(currentApplication.color || '#00ED64', 0.08)} 0%, ${theme.palette.background.paper} 100%)`
              : `linear-gradient(180deg, ${alpha(currentApplication.color || '#00ED64', 0.04)} 0%, ${theme.palette.background.paper} 100%)`,
        }}
      >
        {/* Application Identity */}
        <Tooltip title="Switch application (⌘K)">
          <Button
            onClick={() => setAppSwitcherOpen(true)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 1.5,
              py: 0.5,
              borderRadius: 1,
              textTransform: 'none',
              color: 'text.primary',
              '&:hover': {
                bgcolor: alpha(currentApplication.color || '#00ED64', 0.1),
              },
              transition: 'all 0.15s ease',
            }}
          >
            {/* App Icon */}
            <Box
              sx={{
                width: 24,
                height: 24,
                borderRadius: 0.75,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: currentApplication.color || alpha('#00ED64', 0.2),
                color: currentApplication.color ? '#fff' : '#00ED64',
                fontWeight: 700,
                fontSize: '0.75rem',
              }}
            >
              {currentApplication.icon ? (
                <TemplateIcon icon={currentApplication.icon} size={16} color={currentApplication.color ? '#fff' : '#00ED64'} />
              ) : (
                currentApplication.name.charAt(0).toUpperCase()
              )}
            </Box>
            {/* App Name */}
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 600,
                maxWidth: 200,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {currentApplication.name}
            </Typography>
            <ArrowDropDown sx={{ fontSize: 18, color: 'text.secondary', ml: -0.5 }} />
          </Button>
        </Tooltip>

        {/* Divider */}
        <Divider orientation="vertical" flexItem sx={{ height: 24, my: 'auto' }} />

        {/* Navigation Tabs */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {navTabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Box
                key={tab.key}
                component={Link}
                href={tab.href}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 1,
                  textDecoration: 'none',
                  color: isActive ? (currentApplication.color || '#00ED64') : 'text.secondary',
                  fontWeight: isActive ? 600 : 400,
                  fontSize: '0.8125rem',
                  bgcolor: isActive ? alpha(currentApplication.color || '#00ED64', 0.1) : 'transparent',
                  '&:hover': {
                    bgcolor: alpha(currentApplication.color || '#00ED64', 0.08),
                    color: isActive ? (currentApplication.color || '#00ED64') : 'text.primary',
                  },
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.icon}
                {tab.label}
              </Box>
            );
          })}
        </Box>

        {/* Spacer */}
        <Box sx={{ flex: 1 }} />

        {/* Breadcrumb - shows full hierarchy: Org > Project > App > [Form/Workflow] */}
        {organization && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              color: 'text.secondary',
              fontSize: '0.75rem',
            }}
          >
            <Home sx={{ fontSize: 14 }} />
            <Typography variant="caption" sx={{ opacity: 0.7 }}>
              {organization.name}
            </Typography>
            {projectName && (
              <>
                <ChevronRight sx={{ fontSize: 14, opacity: 0.5 }} />
                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                  {projectName}
                </Typography>
              </>
            )}
            <ChevronRight sx={{ fontSize: 14, opacity: 0.5 }} />
            <Typography
              variant="caption"
              sx={{
                fontWeight: currentItemName ? 400 : 500,
                color: currentItemName ? 'text.secondary' : (currentApplication.color || '#00ED64'),
                opacity: currentItemName ? 0.7 : 1,
              }}
            >
              {currentApplication.name}
            </Typography>
            {/* Show current form/workflow when editing */}
            {currentItemName && (
              <>
                <ChevronRight sx={{ fontSize: 14, opacity: 0.5 }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {currentItemType === 'form' && <Description sx={{ fontSize: 12, color: '#00ED64' }} />}
                  {currentItemType === 'workflow' && <AccountTree sx={{ fontSize: 12, color: '#9C27B0' }} />}
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 500,
                      color: currentItemType === 'form' ? '#00ED64' : '#9C27B0',
                      maxWidth: 150,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {currentItemName}
                  </Typography>
                </Box>
              </>
            )}
          </Box>
        )}
      </Box>

      {/* Application Switcher Modal */}
      <ApplicationSwitcher
        open={appSwitcherOpen}
        onClose={() => setAppSwitcherOpen(false)}
        onCreateApp={handleCreateApp}
      />
    </>
  );
}
