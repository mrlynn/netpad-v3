/**
 * Project List Component
 *
 * Displays a list of projects with cards/tiles.
 * Shows stats (form count, workflow count).
 * Actions: edit, delete, view.
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Grid,
  CircularProgress,
  Alert,
  Stack,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Folder as FolderIcon,
  IosShare as ExportIcon,
} from '@mui/icons-material';
import { Project } from '@/types/platform';
import { QuickExportButton } from './ProjectExportButton';

interface ProjectListProps {
  organizationId: string;
  onSelect?: (project: Project) => void;
  onEdit?: (project: Project) => void;
  onDelete?: (project: Project) => void;
  showActions?: boolean;
}

export function ProjectList({
  organizationId,
  onSelect,
  onEdit,
  onDelete,
  showActions = true,
}: ProjectListProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!organizationId) {
      setLoading(false);
      return;
    }

    async function fetchProjects() {
      try {
        setLoading(true);
        const response = await fetch(`/api/projects?orgId=${organizationId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch projects');
        }
        const data = await response.json();
        setProjects(data.projects || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching projects:', err);
        setError(err instanceof Error ? err.message : 'Failed to load projects');
      } finally {
        setLoading(false);
      }
    }

    fetchProjects();
  }, [organizationId]);

  const handleDelete = async (project: Project) => {
    if (!confirm(`Are you sure you want to delete "${project.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${project.projectId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete project');
      }

      // Remove from list
      setProjects(projects.filter((p) => p.projectId !== project.projectId));
      if (onDelete) {
        onDelete(project);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete project');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  if (projects.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          No projects found. Create your first project to get started.
        </Typography>
      </Box>
    );
  }

  return (
    <Grid container spacing={2}>
      {projects.map((project) => (
        <Grid item xs={12} sm={6} md={4} key={project.projectId}>
          <Card
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              cursor: onSelect ? 'pointer' : 'default',
              '&:hover': onSelect
                ? {
                    boxShadow: 4,
                    transform: 'translateY(-2px)',
                    transition: 'all 0.2s',
                  }
                : {},
            }}
            onClick={() => onSelect && onSelect(project)}
          >
            <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
                {project.color ? (
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 1,
                      backgroundColor: project.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 1.5,
                      flexShrink: 0,
                    }}
                  >
                    {project.icon ? (
                      <FolderIcon sx={{ color: 'white', fontSize: 24 }} />
                    ) : (
                      <FolderIcon sx={{ color: 'white', fontSize: 24 }} />
                    )}
                  </Box>
                ) : (
                  <FolderIcon sx={{ fontSize: 40, mr: 1.5, color: 'text.secondary' }} />
                )}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="h6" component="h3" noWrap>
                    {project.name}
                  </Typography>
                  {project.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }} noWrap>
                      {project.description}
                    </Typography>
                  )}
                </Box>
                {showActions && (
                  <Box sx={{ display: 'flex', gap: 0.5 }} onClick={(e) => e.stopPropagation()}>
                    <QuickExportButton
                      projectId={project.projectId}
                      projectName={project.name}
                      organizationId={organizationId}
                      size="small"
                    />
                    {onEdit && (
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(project);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    )}
                    {onDelete && (
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(project);
                        }}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                )}
              </Box>

              {project.tags && project.tags.length > 0 && (
                <Box sx={{ mb: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {project.tags.slice(0, 3).map((tag) => (
                    <Chip key={tag} label={tag} size="small" variant="outlined" />
                  ))}
                  {project.tags.length > 3 && (
                    <Chip
                      label={`+${project.tags.length - 3}`}
                      size="small"
                      variant="outlined"
                    />
                  )}
                </Box>
              )}

              <Box sx={{ mt: 'auto', pt: 1 }}>
                {/* Environment Badge */}
                {project.environment && (
                  <Chip
                    label={project.environment.toUpperCase()}
                    size="small"
                    color={
                      project.environment === 'prod' ? 'error' :
                      project.environment === 'staging' ? 'warning' :
                      project.environment === 'test' ? 'info' : 'default'
                    }
                    sx={{ mb: 1 }}
                  />
                )}
                <Stack direction="row" spacing={2} flexWrap="wrap">
                  <Chip
                    label={`${project.stats.formCount} form${project.stats.formCount !== 1 ? 's' : ''}`}
                    size="small"
                    variant="outlined"
                  />
                  <Chip
                    label={`${project.stats.workflowCount} workflow${project.stats.workflowCount !== 1 ? 's' : ''}`}
                    size="small"
                    variant="outlined"
                  />
                  {project.stats.clusterCount !== undefined && (
                    <Chip
                      label={`${project.stats.clusterCount || 0} cluster${(project.stats.clusterCount || 0) !== 1 ? 's' : ''}`}
                      size="small"
                      variant="outlined"
                    />
                  )}
                  {project.stats.connectionCount !== undefined && (
                    <Chip
                      label={`${project.stats.connectionCount || 0} connection${(project.stats.connectionCount || 0) !== 1 ? 's' : ''}`}
                      size="small"
                      variant="outlined"
                    />
                  )}
                </Stack>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
