'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  alpha,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
} from '@mui/material';
import { Add } from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { AppNavBar } from '@/components/Navigation/AppNavBar';
import { ProjectList } from '@/components/Projects/ProjectList';
import { Project, ProjectEnvironment } from '@/types/platform';
import { useTheme } from '@mui/material/styles';
import { getOrgProjectUrl } from '@/lib/routing';

export default function ProjectsPage() {
  const params = useParams();
  const router = useRouter();
  const theme = useTheme();
  const { user } = useAuth();
  const orgId = params.orgId as string;

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [environment, setEnvironment] = useState<ProjectEnvironment>('dev');
  const [slug, setSlug] = useState('');

  useEffect(() => {
    if (orgId) {
      loadProjects();
    }
  }, [orgId]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects?orgId=${orgId}`);
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!name.trim()) {
      setError('Project name is required');
      return;
    }

    try {
      setError(null);
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: orgId,
          name: name.trim(),
          description: description.trim() || undefined,
          environment,
          slug: slug.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setCreateDialogOpen(false);
        resetForm();
        loadProjects();
        // Navigate to the new project's forms page
        router.push(getOrgProjectUrl(orgId, data.project.projectId, 'forms'));
      } else {
        setError(data.error || 'Failed to create project');
      }
    } catch (error) {
      setError('Failed to create project');
    }
  };

  const handleUpdateProject = async () => {
    if (!editingProject || !name.trim()) {
      setError('Project name is required');
      return;
    }

    try {
      setError(null);
      const response = await fetch(`/api/projects/${editingProject.projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          environment,
          slug: slug.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setEditDialogOpen(false);
        setEditingProject(null);
        resetForm();
        loadProjects();
      } else {
        setError(data.error || 'Failed to update project');
      }
    } catch (error) {
      setError('Failed to update project');
    }
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setName(project.name);
    setDescription(project.description || '');
    setEnvironment(project.environment || 'dev');
    setSlug(project.slug || '');
    setError(null);
    setEditDialogOpen(true);
  };

  const handleDelete = async (project: Project) => {
    // ProjectList component handles deletion
    loadProjects();
  };

  const handleSelect = (project: Project) => {
    // Navigate to project's forms page
    router.push(getOrgProjectUrl(orgId, project.projectId, 'forms'));
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setEnvironment('dev');
    setSlug('');
    setError(null);
  };

  const handleCreateDialogClose = () => {
    setCreateDialogOpen(false);
    resetForm();
  };

  const handleEditDialogClose = () => {
    setEditDialogOpen(false);
    setEditingProject(null);
    resetForm();
  };

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
          <Box sx={{ 
            py: { xs: 2, sm: 3 }, 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'flex-start', sm: 'center' }, 
            justifyContent: 'space-between',
            gap: { xs: 2, sm: 0 },
          }}>
            <Box sx={{ flex: 1 }}>
              <Typography 
                variant="h4" 
                sx={{ 
                  fontWeight: 700, 
                  color: 'text.primary',
                  fontSize: { xs: '1.75rem', sm: '2.125rem' },
                }}
              >
                Projects
              </Typography>
              <Typography 
                variant="body2" 
                color="text.secondary"
              >
                Organize your forms, workflows, clusters, and connections by project
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => {
                resetForm();
                setCreateDialogOpen(true);
              }}
              sx={{
                bgcolor: theme.palette.primary.main,
                color: theme.palette.primary.contrastText,
                textTransform: 'none',
                fontWeight: 600,
                px: 3,
                '&:hover': { bgcolor: theme.palette.primary.dark },
              }}
            >
              Create Project
            </Button>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <ProjectList
          organizationId={orgId}
          onSelect={handleSelect}
          onEdit={handleEdit}
          onDelete={handleDelete}
          showActions={true}
        />
      </Container>

      {/* Create Project Dialog */}
      <Dialog open={createDialogOpen} onClose={handleCreateDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Project</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <TextField
            autoFocus
            margin="dense"
            label="Project Name"
            fullWidth
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            sx={{ mb: 2 }}
          />

          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            sx={{ mb: 2 }}
          />

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Environment</InputLabel>
            <Select
              value={environment}
              onChange={(e) => setEnvironment(e.target.value as ProjectEnvironment)}
              label="Environment"
            >
              <MenuItem value="dev">Development</MenuItem>
              <MenuItem value="test">Test</MenuItem>
              <MenuItem value="staging">Staging</MenuItem>
              <MenuItem value="prod">Production</MenuItem>
            </Select>
            <FormHelperText>
              Select the environment classification for this project
            </FormHelperText>
          </FormControl>

          <TextField
            margin="dense"
            label="Slug (optional)"
            fullWidth
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
            helperText="URL-friendly identifier (auto-generated if not provided)"
            sx={{ mb: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCreateDialogClose}>Cancel</Button>
          <Button onClick={handleCreateProject} variant="contained" disabled={!name.trim()}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Project Dialog */}
      <Dialog open={editDialogOpen} onClose={handleEditDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Project</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <TextField
            autoFocus
            margin="dense"
            label="Project Name"
            fullWidth
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            sx={{ mb: 2 }}
          />

          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            sx={{ mb: 2 }}
          />

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Environment</InputLabel>
            <Select
              value={environment}
              onChange={(e) => setEnvironment(e.target.value as ProjectEnvironment)}
              label="Environment"
            >
              <MenuItem value="dev">Development</MenuItem>
              <MenuItem value="test">Test</MenuItem>
              <MenuItem value="staging">Staging</MenuItem>
              <MenuItem value="prod">Production</MenuItem>
            </Select>
            <FormHelperText>
              Select the environment classification for this project
            </FormHelperText>
          </FormControl>

          <TextField
            margin="dense"
            label="Slug"
            fullWidth
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
            helperText="URL-friendly identifier"
            sx={{ mb: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditDialogClose}>Cancel</Button>
          <Button onClick={handleUpdateProject} variant="contained" disabled={!name.trim()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
