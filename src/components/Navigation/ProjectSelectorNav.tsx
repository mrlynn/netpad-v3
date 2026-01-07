/**
 * Project Selector for Navigation Bar
 * 
 * Shows current project context when applicable (e.g., when viewing project-scoped resources)
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  alpha,
  CircularProgress,
} from '@mui/material';
import {
  Folder,
  Check,
  Add,
  ArrowForward,
} from '@mui/icons-material';
import { useOrganization } from '@/contexts/OrganizationContext';
import { usePathname, useRouter } from 'next/navigation';
import { Project } from '@/types/platform';
import { parseOrgProjectFromPath, getOrgProjectUrl } from '@/lib/routing';

interface ProjectSelectorNavProps {
  compact?: boolean;
  currentProjectId?: string;
}

export function ProjectSelectorNav({ compact = false, currentProjectId }: ProjectSelectorNavProps) {
  const { organization } = useOrganization();
  const router = useRouter();
  const pathname = usePathname();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);

  // Determine if we should show project selector
  // Show on: new routes (/orgs/.../projects/...) or legacy routes
  const shouldShowProject = organization && (
    pathname.startsWith('/orgs/') ||
    pathname.startsWith('/my-forms') ||
    pathname.startsWith('/workflows') ||
    pathname.startsWith('/data') ||
    pathname.startsWith('/projects') ||
    pathname.startsWith('/builder')
  );

  // Get projectId from URL if in new route structure
  const { projectId: urlProjectId } = parseOrgProjectFromPath(pathname);
  const effectiveProjectId = currentProjectId || urlProjectId || undefined;

  useEffect(() => {
    if (organization?.orgId && shouldShowProject) {
      fetchProjects();
    }
  }, [organization?.orgId, shouldShowProject]);

  // Sync projectId from URL params
  useEffect(() => {
    if (shouldShowProject) {
      const { projectId: urlProjectId } = parseOrgProjectFromPath(pathname);
      if (urlProjectId && urlProjectId !== currentProjectId) {
        // Update localStorage to match URL
        localStorage.setItem('selected_project_id', urlProjectId);
      }
    }
  }, [pathname, shouldShowProject, currentProjectId]);

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
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSelectProject = (projectId: string) => {
    // Store selected project in localStorage
    localStorage.setItem('selected_project_id', projectId);
    handleClose();
    
    // If we're in the new URL structure, navigate to the project's forms page
    const { orgId: urlOrgId } = parseOrgProjectFromPath(pathname);
    if (urlOrgId && organization?.orgId === urlOrgId) {
      // We're in org context, navigate to project's forms page
      router.push(getOrgProjectUrl(organization.orgId, projectId, 'forms'));
    } else {
      // Legacy route or no org context, just refresh
      router.refresh();
    }
  };

  if (!shouldShowProject || !organization) {
    return null;
  }

  const currentProject = effectiveProjectId 
    ? projects.find(p => p.projectId === effectiveProjectId)
    : null;

  // If no current project but we have projects, show "Select Project"
  const displayText = currentProject 
    ? (compact ? currentProject.name : `${currentProject.name} (${currentProject.environment?.toUpperCase() || 'DEV'})`)
    : 'Select Project';

  return (
    <>
      <Chip
        icon={loading ? <CircularProgress size={12} /> : <Folder sx={{ fontSize: 14 }} />}
        label={displayText}
        onClick={handleClick}
        size="small"
        sx={{
          height: 26,
          bgcolor: 'transparent',
          color: 'text.secondary',
          border: '1px solid',
          borderColor: 'divider',
          fontWeight: 400,
          fontSize: '0.8125rem',
          cursor: 'pointer',
          '&:hover': {
            bgcolor: alpha('#000', 0.05),
            borderColor: 'divider',
            color: 'text.primary',
          },
          '& .MuiChip-icon': {
            color: 'text.secondary',
          },
        }}
        variant="outlined"
      />
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
          },
        }}
        transformOrigin={{ horizontal: 'left', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontSize: '0.65rem', fontWeight: 600 }}>
            Project
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: '0.7rem' }}>
            {organization.name}
          </Typography>
        </Box>
        <Divider />
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={20} />
          </Box>
        ) : projects.length === 0 ? (
          <Box sx={{ px: 2, py: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              No projects found
            </Typography>
            <MenuItem
              component="a"
              href={organization?.orgId ? `/orgs/${organization.orgId}/projects` : '/projects'}
              onClick={handleClose}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <Add sx={{ fontSize: 18 }} />
              </ListItemIcon>
              <ListItemText primary="Create Project" />
            </MenuItem>
          </Box>
        ) : (
          <>
            {projects.map((project) => (
              <MenuItem
                key={project.projectId}
                onClick={() => handleSelectProject(project.projectId)}
                selected={project.projectId === effectiveProjectId}
                sx={{
                  py: 1,
                }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  {project.projectId === effectiveProjectId && (
                    <Check sx={{ fontSize: 18, color: '#2196F3' }} />
                  )}
                </ListItemIcon>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: project.projectId === effectiveProjectId ? 600 : 400,
                        flex: 1,
                      }}
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
                          height: 18,
                          fontSize: '0.65rem',
                          minWidth: 40,
                        }}
                      />
                    )}
                  </Box>
                  {project.description && (
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {project.description}
                    </Typography>
                  )}
                </Box>
              </MenuItem>
            ))}
            <Divider />
            <MenuItem
              component="a"
              href={organization?.orgId ? `/orgs/${organization.orgId}/projects` : '/projects'}
              onClick={handleClose}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <Add sx={{ fontSize: 18 }} />
              </ListItemIcon>
              <ListItemText primary="Create Project" />
            </MenuItem>
            <MenuItem
              component="a"
              href={organization?.orgId ? `/orgs/${organization.orgId}/projects` : '/projects'}
              onClick={handleClose}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <ArrowForward sx={{ fontSize: 18 }} />
              </ListItemIcon>
              <ListItemText primary="Manage Projects" />
            </MenuItem>
          </>
        )}
      </Menu>
    </>
  );
}
