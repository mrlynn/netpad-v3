/**
 * Combined Organization + Project Selector
 *
 * Single dropdown that shows current org and project context,
 * allowing users to switch between projects within the org
 * or switch to a different organization.
 *
 * Design:
 * ┌─────────────────────────────────┐
 * │ Acme Corp                    ✓  │  <- Current org
 * ├─────────────────────────────────┤
 * │ Projects                        │
 * │   ○ Development                 │
 * │   ● Production              ✓   │  <- Current project
 * │   ○ Staging                     │
 * ├─────────────────────────────────┤
 * │ ⚙️ Organization Settings        │
 * │ 🔄 Switch Organization →        │
 * └─────────────────────────────────┘
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  alpha,
  Chip,
  Collapse,
  List,
  ListItem,
  ListItemButton,
  Radio,
} from '@mui/material';
import {
  Business,
  Check,
  Settings,
  SwapHoriz,
  Folder,
  ExpandMore,
  ChevronRight,
  KeyboardArrowDown,
} from '@mui/icons-material';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useApplication } from '@/contexts/ApplicationContext';
import { useRouter, usePathname } from 'next/navigation';
import { Project } from '@/types/platform';
import { parseOrgProjectFromPath, getAppUrl } from '@/lib/routing';

// ============================================
// Types
// ============================================

interface OrgProjectSelectorProps {
  variant?: 'default' | 'compact';
}

// ============================================
// Main Component
// ============================================

export function OrgProjectSelector({ variant = 'default' }: OrgProjectSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { organization, organizations, selectOrganization } = useOrganization();
  const { currentApplication } = useApplication();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [showOrgSwitcher, setShowOrgSwitcher] = useState(false);

  const menuOpen = Boolean(anchorEl);

  // Get current project from URL or application context
  const { projectId: urlProjectId } = parseOrgProjectFromPath(pathname);
  const currentProjectId = currentApplication?.projectId || urlProjectId;
  const currentProject = projects.find(p => p.projectId === currentProjectId);

  // Fetch projects when menu opens or org changes
  useEffect(() => {
    if (organization?.orgId && menuOpen) {
      fetchProjects();
    }
  }, [organization?.orgId, menuOpen]);

  const fetchProjects = async () => {
    if (!organization?.orgId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/projects?orgId=${organization.orgId}`);
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error('[OrgProjectSelector] Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setShowOrgSwitcher(false);
  };

  const handleSelectProject = async (projectId: string) => {
    localStorage.setItem('selected_project_id', projectId);
    handleClose();

    // Find first app in the selected project and navigate to it
    if (organization?.orgId) {
      try {
        const response = await fetch(`/api/applications?orgId=${organization.orgId}&projectId=${projectId}`);
        const data = await response.json();
        const apps = data.applications || [];

        if (apps.length > 0 && apps[0].slug) {
          localStorage.setItem('selected_app_slug', apps[0].slug);
          router.push(getAppUrl(apps[0].slug, 'forms'));
          return;
        }
      } catch (error) {
        console.error('[OrgProjectSelector] Failed to fetch applications:', error);
      }
    }

    // Fallback: Navigate to projects list
    if (organization?.orgId) {
      router.push(`/orgs/${organization.orgId}/projects/${projectId}/applications`);
    }
  };

  const handleSelectOrg = async (orgId: string) => {
    await selectOrganization(orgId);
    handleClose();
    router.refresh();
  };

  const handleOrgSettings = () => {
    handleClose();
    router.push('/settings?tab=organizations');
  };

  if (!organization) {
    return null;
  }

  // Build display text
  const displayText = currentProject
    ? `${organization.name} / ${currentProject.name}`
    : organization.name;

  return (
    <>
      <Button
        onClick={handleClick}
        endIcon={<KeyboardArrowDown sx={{ fontSize: 18 }} />}
        sx={{
          textTransform: 'none',
          color: 'text.primary',
          fontWeight: 500,
          fontSize: '0.875rem',
          px: 1.5,
          py: 0.75,
          borderRadius: 1,
          bgcolor: 'transparent',
          '&:hover': {
            bgcolor: 'action.hover',
          },
          '& .MuiButton-endIcon': {
            ml: 0.5,
            color: 'text.secondary',
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Business sx={{ fontSize: 18, color: 'text.secondary' }} />
          <Typography
            component="span"
            sx={{
              maxWidth: { xs: 150, sm: 200, md: 300 },
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {displayText}
          </Typography>
        </Box>
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={handleClose}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 300,
            maxWidth: 400,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: (theme) => theme.shadows[8],
          },
        }}
        transformOrigin={{ horizontal: 'left', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
      >
        {/* Current Organization */}
        <Box sx={{ px: 2, py: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Business sx={{ fontSize: 20, color: 'primary.main' }} />
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {organization.name}
                </Typography>
                {organization.subscription?.tier && (
                  <Typography variant="caption" color="text.secondary">
                    {organization.subscription.tier.charAt(0).toUpperCase() + organization.subscription.tier.slice(1)} Plan
                  </Typography>
                )}
              </Box>
            </Box>
            <Check sx={{ fontSize: 18, color: 'primary.main' }} />
          </Box>
        </Box>

        <Divider />

        {/* Projects Section */}
        <Box sx={{ px: 2, py: 1 }}>
          <Typography
            variant="overline"
            sx={{
              color: 'text.secondary',
              fontWeight: 600,
              fontSize: '0.65rem',
              letterSpacing: 1,
            }}
          >
            Projects
          </Typography>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <NetPadLoader size="small" />
          </Box>
        ) : projects.length === 0 ? (
          <Box sx={{ px: 2, py: 1.5, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No projects found
            </Typography>
          </Box>
        ) : (
          <List disablePadding sx={{ px: 1, pb: 1 }}>
            {projects.map((project) => {
              const isSelected = project.projectId === currentProjectId;
              return (
                <ListItem key={project.projectId} disablePadding sx={{ mb: 0.25 }}>
                  <ListItemButton
                    onClick={() => handleSelectProject(project.projectId)}
                    selected={isSelected}
                    sx={{
                      borderRadius: 1,
                      py: 0.75,
                      '&.Mui-selected': {
                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                        '&:hover': {
                          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
                        },
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <Radio
                        checked={isSelected}
                        size="small"
                        sx={{
                          p: 0,
                          '& .MuiSvgIcon-root': { fontSize: 18 },
                        }}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: isSelected ? 600 : 400 }}
                          >
                            {project.name}
                          </Typography>
                          {project.environment && (
                            <Chip
                              label={project.environment.toUpperCase()}
                              size="small"
                              color={
                                project.environment === 'prod' ? 'error' :
                                project.environment === 'staging' ? 'warning' :
                                project.environment === 'test' ? 'info' : 'default'
                              }
                              sx={{
                                height: 16,
                                fontSize: '0.6rem',
                                fontWeight: 600,
                              }}
                            />
                          )}
                        </Box>
                      }
                      secondary={project.description}
                      secondaryTypographyProps={{
                        noWrap: true,
                        fontSize: '0.75rem',
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        )}

        <Divider />

        {/* Footer Actions */}
        <Box sx={{ py: 0.5 }}>
          <MenuItem onClick={handleOrgSettings} sx={{ py: 1 }}>
            <ListItemIcon sx={{ minWidth: 32 }}>
              <Settings sx={{ fontSize: 18 }} />
            </ListItemIcon>
            <ListItemText
              primary="Organization Settings"
              primaryTypographyProps={{ fontSize: '0.875rem' }}
            />
          </MenuItem>

          {organizations.length > 1 && (
            <MenuItem
              onClick={() => setShowOrgSwitcher(!showOrgSwitcher)}
              sx={{ py: 1 }}
            >
              <ListItemIcon sx={{ minWidth: 32 }}>
                <SwapHoriz sx={{ fontSize: 18 }} />
              </ListItemIcon>
              <ListItemText
                primary="Switch Organization"
                primaryTypographyProps={{ fontSize: '0.875rem' }}
              />
              {showOrgSwitcher ? (
                <ExpandMore sx={{ fontSize: 18, color: 'text.secondary' }} />
              ) : (
                <ChevronRight sx={{ fontSize: 18, color: 'text.secondary' }} />
              )}
            </MenuItem>
          )}
        </Box>

        {/* Organization Switcher (Expandable) */}
        <Collapse in={showOrgSwitcher}>
          <Divider />
          <Box sx={{ px: 2, py: 1 }}>
            <Typography
              variant="overline"
              sx={{
                color: 'text.secondary',
                fontWeight: 600,
                fontSize: '0.65rem',
                letterSpacing: 1,
              }}
            >
              Switch to
            </Typography>
          </Box>
          <List disablePadding sx={{ px: 1, pb: 1 }}>
            {organizations
              .filter(org => org.orgId !== organization.orgId)
              .map((org) => (
                <ListItem key={org.orgId} disablePadding sx={{ mb: 0.25 }}>
                  <ListItemButton
                    onClick={() => handleSelectOrg(org.orgId)}
                    sx={{ borderRadius: 1, py: 0.75 }}
                  >
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <Business sx={{ fontSize: 18, color: 'text.secondary' }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={org.name}
                      primaryTypographyProps={{
                        fontSize: '0.875rem',
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
          </List>
        </Collapse>
      </Menu>
    </>
  );
}

export default OrgProjectSelector;
