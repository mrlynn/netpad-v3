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
  CircularProgress,
  Breadcrumbs,
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
} from '@mui/icons-material';
import Link from 'next/link';
import { useParams, useSearchParams, usePathname } from 'next/navigation';
import { getOrgProjectUrl } from '@/lib/routing';
import { Application } from '@/types/application';

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
                <CircularProgress size={24} sx={{ color: '#00ED64' }} />
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
