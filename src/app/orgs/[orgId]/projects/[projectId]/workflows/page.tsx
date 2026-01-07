'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Skeleton,
  Alert,
  Divider,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Add,
  MoreVert,
  PlayArrow,
  Pause,
  Archive,
  Edit,
  Delete,
  AccountTree,
  CheckCircle,
  Error as ErrorIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import { AppNavBar } from '@/components/Navigation/AppNavBar';
import { WorkflowStatus } from '@/types/workflow';
import { ProjectSelector } from '@/components/Projects/ProjectSelector';
import { getOrgProjectUrl } from '@/lib/routing';

interface WorkflowListItem {
  _id: string;
  id: string;
  name: string;
  description?: string;
  status: WorkflowStatus;
  tags: string[];
  canvas: {
    nodes: unknown[];
    edges: unknown[];
  };
  stats?: {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    lastExecutedAt?: string;
  };
  createdAt: string;
  updatedAt: string;
  projectId?: string;
}

const STATUS_CONFIG: Record<WorkflowStatus, { color: string; icon: React.ReactElement; label: string }> = {
  draft: { color: '#9e9e9e', icon: <Edit fontSize="small" />, label: 'Draft' },
  active: { color: '#4caf50', icon: <PlayArrow fontSize="small" />, label: 'Active' },
  paused: { color: '#ff9800', icon: <Pause fontSize="small" />, label: 'Paused' },
  archived: { color: '#607d8b', icon: <Archive fontSize="small" />, label: 'Archived' },
};

export default function WorkflowsPage() {
  const params = useParams();
  const router = useRouter();
  const theme = useTheme();
  const orgId = params.orgId as string;
  const projectId = params.projectId as string;

  const [workflows, setWorkflows] = useState<WorkflowListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [newWorkflowDescription, setNewWorkflowDescription] = useState('');
  const [creating, setCreating] = useState(false);

  // Menu state
  const [menuAnchor, setMenuAnchor] = useState<{ element: HTMLElement; workflow: WorkflowListItem } | null>(null);

  // Fetch workflows
  useEffect(() => {
    if (!orgId || !projectId) {
      setLoading(false);
      return;
    }

    const fetchWorkflows = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/workflows?orgId=${orgId}&projectId=${projectId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch workflows');
        }
        const data = await response.json();
        setWorkflows(data.workflows || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load workflows');
      } finally {
        setLoading(false);
      }
    };

    fetchWorkflows();
  }, [orgId, projectId]);

  // Create workflow
  const handleCreateWorkflow = async () => {
    if (!orgId || !projectId || !newWorkflowName.trim()) {
      return;
    }

    try {
      setCreating(true);
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          projectId,
          name: newWorkflowName.trim(),
          description: newWorkflowDescription.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create workflow');
      }

      router.push(getOrgProjectUrl(orgId, projectId, 'workflows', data.workflow.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workflow');
    } finally {
      setCreating(false);
      setCreateDialogOpen(false);
      setNewWorkflowName('');
      setNewWorkflowDescription('');
    }
  };

  // Update workflow status
  const handleStatusChange = async (workflowId: string, newStatus: WorkflowStatus) => {
    if (!orgId) return;

    try {
      const response = await fetch(`/api/workflows/${workflowId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          status: newStatus,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update status');
      }

      // Update local state
      setWorkflows(prev =>
        prev.map(w => (w.id === workflowId ? { ...w, status: newStatus } : w))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update workflow status');
    }

    setMenuAnchor(null);
  };

  // Delete workflow
  const handleDeleteWorkflow = async (workflowId: string) => {
    if (!orgId) return;
    if (!confirm('Are you sure you want to delete this workflow?')) return;

    try {
      const response = await fetch(`/api/workflows/${workflowId}?orgId=${orgId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete workflow');
      }

      setWorkflows(prev => prev.filter(w => w.id !== workflowId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete workflow');
    }

    setMenuAnchor(null);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, workflow: WorkflowListItem) => {
    setMenuAnchor({ element: event.currentTarget, workflow });
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
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
                Workflows
              </Typography>
              <Typography 
                variant="body2" 
                color="text.secondary"
              >
                Automate actions with visual workflow automation
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setCreateDialogOpen(true)}
              sx={{
                bgcolor: '#9C27B0',
                color: 'white',
                textTransform: 'none',
                fontWeight: 600,
                px: 3,
                '&:hover': { bgcolor: '#7B1FA2' },
              }}
            >
              Create Workflow
            </Button>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Grid container spacing={3}>
            {[1, 2, 3].map((i) => (
              <Grid item xs={12} sm={6} md={4} key={i}>
                <Skeleton variant="rectangular" height={200} />
              </Grid>
            ))}
          </Grid>
        ) : workflows.length === 0 ? (
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
            <AccountTree sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" sx={{ color: 'text.primary', mb: 1 }}>
              No workflows yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Create your first workflow to automate actions
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setCreateDialogOpen(true)}
              sx={{
                bgcolor: '#9C27B0',
                color: 'white',
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': { bgcolor: '#7B1FA2' },
              }}
            >
              Create Your First Workflow
            </Button>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {workflows.map((workflow) => {
              const statusConfig = STATUS_CONFIG[workflow.status];
              return (
                <Grid item xs={12} sm={6} md={4} key={workflow.id}>
                  <Card
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      border: '1px solid',
                      borderColor: 'divider',
                      '&:hover': {
                        borderColor: '#9C27B0',
                        boxShadow: `0 4px 20px ${alpha('#9C27B0', 0.15)}`,
                      },
                    }}
                  >
                    <CardContent sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                            {workflow.name}
                          </Typography>
                          {workflow.description && (
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                              {workflow.description}
                            </Typography>
                          )}
                        </Box>
                        <IconButton size="small" onClick={(e) => handleMenuOpen(e, workflow)}>
                          <MoreVert fontSize="small" />
                        </IconButton>
                      </Box>

                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                        <Chip
                          icon={statusConfig.icon}
                          label={statusConfig.label}
                          size="small"
                          sx={{
                            bgcolor: alpha(statusConfig.color, 0.1),
                            color: statusConfig.color,
                            '& .MuiChip-icon': { color: statusConfig.color },
                          }}
                        />
                        {workflow.stats && workflow.stats.totalExecutions > 0 && (
                          <Chip
                            label={`${workflow.stats.totalExecutions} executions`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Box>

                      <Typography variant="caption" color="text.secondary">
                        Updated {formatDate(workflow.updatedAt)}
                      </Typography>
                    </CardContent>

                    <CardActions sx={{ px: 2, pb: 2 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Edit />}
                        component={Link}
                        href={getOrgProjectUrl(orgId, projectId, 'workflows', workflow.id)}
                        sx={{
                          borderColor: alpha('#9C27B0', 0.5),
                          color: '#9C27B0',
                          textTransform: 'none',
                          '&:hover': {
                            borderColor: '#9C27B0',
                            bgcolor: alpha('#9C27B0', 0.1),
                          },
                        }}
                      >
                        Edit
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Container>

      {/* Create Workflow Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Workflow</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Workflow Name"
            fullWidth
            required
            value={newWorkflowName}
            onChange={(e) => setNewWorkflowName(e.target.value)}
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={3}
            value={newWorkflowDescription}
            onChange={(e) => setNewWorkflowDescription(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreateWorkflow}
            variant="contained"
            disabled={!newWorkflowName.trim() || creating}
            sx={{ bgcolor: '#9C27B0', '&:hover': { bgcolor: '#7B1FA2' } }}
          >
            {creating ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchor?.element}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            minWidth: 200,
          },
        }}
      >
        <MenuItem
          component={Link}
          href={menuAnchor ? getOrgProjectUrl(orgId, projectId, 'workflows', menuAnchor.workflow.id) : '#'}
          onClick={handleMenuClose}
        >
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit Workflow</ListItemText>
        </MenuItem>
        {menuAnchor && menuAnchor.workflow.status !== 'active' && (
          <MenuItem onClick={() => handleStatusChange(menuAnchor.workflow.id, 'active')}>
            <ListItemIcon>
              <PlayArrow fontSize="small" />
            </ListItemIcon>
            <ListItemText>Activate</ListItemText>
          </MenuItem>
        )}
        {menuAnchor && menuAnchor.workflow.status === 'active' && (
          <MenuItem onClick={() => handleStatusChange(menuAnchor.workflow.id, 'paused')}>
            <ListItemIcon>
              <Pause fontSize="small" />
            </ListItemIcon>
            <ListItemText>Pause</ListItemText>
          </MenuItem>
        )}
        <Divider />
        <MenuItem
          onClick={() => menuAnchor && handleDeleteWorkflow(menuAnchor.workflow.id)}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <Delete fontSize="small" sx={{ color: 'error.main' }} />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
}
