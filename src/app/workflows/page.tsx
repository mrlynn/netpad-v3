'use client';

import React, { useEffect, useState } from 'react';
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
  alpha,
  CircularProgress,
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
import { useRouter } from 'next/navigation';
import { useOrganization, useRequireOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { AppNavBar } from '@/components/Navigation/AppNavBar';
import { WelcomeScreen, OnboardingWizard } from '@/components/Onboarding';
import { WorkflowStatus } from '@/types/workflow';

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
}

const STATUS_CONFIG: Record<WorkflowStatus, { color: string; icon: React.ReactElement; label: string }> = {
  draft: { color: '#9e9e9e', icon: <Edit fontSize="small" />, label: 'Draft' },
  active: { color: '#4caf50', icon: <PlayArrow fontSize="small" />, label: 'Active' },
  paused: { color: '#ff9800', icon: <Pause fontSize="small" />, label: 'Paused' },
  archived: { color: '#607d8b', icon: <Archive fontSize="small" />, label: 'Archived' },
};

export default function WorkflowsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { isLoading, needsOrg } = useRequireOrganization();
  const { organization, refreshOrganizations } = useOrganization();
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
    if (!organization?.orgId) {
      setLoading(false);
      return;
    }

    const fetchWorkflows = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/workflows?orgId=${organization.orgId}`);
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
  }, [organization?.orgId]);

  // Create workflow
  const handleCreateWorkflow = async () => {
    if (!organization?.orgId || !newWorkflowName.trim()) {
      return;
    }

    try {
      setCreating(true);
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: organization.orgId,
          name: newWorkflowName.trim(),
          description: newWorkflowDescription.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create workflow');
      }

      router.push(`/workflows/${data.workflow.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workflow');
    } finally {
      setCreating(false);
    }
  };

  // Update workflow status
  const handleStatusChange = async (workflowId: string, newStatus: WorkflowStatus) => {
    if (!organization?.orgId) return;

    try {
      const response = await fetch(`/api/workflows/${workflowId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: organization.orgId,
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
    if (!organization?.orgId) return;
    if (!confirm('Are you sure you want to delete this workflow?')) return;

    try {
      const response = await fetch(`/api/workflows/${workflowId}?orgId=${organization.orgId}`, {
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

  // Show loading state
  if (isLoading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <AppNavBar />
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 64px)' }}>
          <CircularProgress sx={{ color: '#00ED64' }} />
        </Box>
      </Box>
    );
  }

  // Show welcome screen if user is not authenticated
  if (!isAuthenticated && needsOrg) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <AppNavBar />
        <WelcomeScreen />
      </Box>
    );
  }

  // Show onboarding wizard if authenticated user needs to create an org
  if (needsOrg) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <AppNavBar />
        <Box sx={{ height: 'calc(100vh - 64px)' }}>
          <OnboardingWizard onComplete={refreshOrganizations} />
        </Box>
      </Box>
    );
  }

  if (!organization) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <AppNavBar />
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Alert severity="warning">
            Please select an organization to view workflows.
          </Alert>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Global Navigation */}
      <AppNavBar />

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Workflows
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Automate tasks with visual workflows
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setCreateDialogOpen(true)}
            sx={{
              bgcolor: '#00ED64',
              color: '#001E2B',
              fontWeight: 600,
              '&:hover': { bgcolor: '#00c853' },
            }}
          >
            New Workflow
          </Button>
        </Box>

      {/* Error alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Workflow Grid */}
      {loading ? (
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map(i => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Card>
                <CardContent>
                  <Skeleton variant="text" width="60%" height={32} />
                  <Skeleton variant="text" width="80%" />
                  <Skeleton variant="rectangular" height={60} sx={{ mt: 2, borderRadius: 1 }} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : workflows.length === 0 ? (
        <Paper
          sx={{
            p: 6,
            textAlign: 'center',
            bgcolor: 'background.default',
            border: '2px dashed',
            borderColor: 'divider',
          }}
        >
          <AccountTree sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No workflows yet
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Create your first workflow to automate tasks
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setCreateDialogOpen(true)}
            sx={{
              bgcolor: '#00ED64',
              color: '#001E2B',
              fontWeight: 600,
              '&:hover': { bgcolor: '#00c853' },
            }}
          >
            Create Workflow
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {workflows.map(workflow => {
            const statusConfig = STATUS_CONFIG[workflow.status];
            return (
              <Grid item xs={12} sm={6} md={4} key={workflow.id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      boxShadow: 4,
                      transform: 'translateY(-2px)',
                    },
                  }}
                >
                  <CardContent sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 600,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {workflow.name}
                        </Typography>
                        <Chip
                          icon={statusConfig.icon}
                          label={statusConfig.label}
                          size="small"
                          sx={{
                            mt: 0.5,
                            bgcolor: alpha(statusConfig.color, 0.1),
                            color: statusConfig.color,
                            fontWeight: 500,
                            '& .MuiChip-icon': { color: statusConfig.color },
                          }}
                        />
                      </Box>
                      <IconButton
                        size="small"
                        onClick={e => setMenuAnchor({ element: e.currentTarget, workflow })}
                      >
                        <MoreVert fontSize="small" />
                      </IconButton>
                    </Box>

                    {workflow.description && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          mt: 1.5,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {workflow.description}
                      </Typography>
                    )}

                    {/* Stats */}
                    <Box
                      sx={{
                        mt: 2,
                        p: 1.5,
                        bgcolor: 'background.default',
                        borderRadius: 1,
                        display: 'flex',
                        gap: 2,
                      }}
                    >
                      <Box sx={{ textAlign: 'center', flex: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1 }}>
                          {workflow.canvas.nodes.length}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Nodes
                        </Typography>
                      </Box>
                      {workflow.stats && (
                        <>
                          <Box sx={{ textAlign: 'center', flex: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                              <CheckCircle sx={{ fontSize: 14, color: 'success.main' }} />
                              <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1 }}>
                                {workflow.stats.successfulExecutions}
                              </Typography>
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                              Success
                            </Typography>
                          </Box>
                          <Box sx={{ textAlign: 'center', flex: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                              <ErrorIcon sx={{ fontSize: 14, color: 'error.main' }} />
                              <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1 }}>
                                {workflow.stats.failedExecutions}
                              </Typography>
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                              Failed
                            </Typography>
                          </Box>
                        </>
                      )}
                    </Box>

                    {/* Tags */}
                    {workflow.tags.length > 0 && (
                      <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {workflow.tags.slice(0, 3).map(tag => (
                          <Chip
                            key={tag}
                            label={tag}
                            size="small"
                            sx={{ fontSize: '0.7rem', height: 20 }}
                          />
                        ))}
                        {workflow.tags.length > 3 && (
                          <Chip
                            label={`+${workflow.tags.length - 3}`}
                            size="small"
                            sx={{ fontSize: '0.7rem', height: 20 }}
                          />
                        )}
                      </Box>
                    )}
                  </CardContent>

                  <CardActions sx={{ px: 2, pb: 2 }}>
                    <Button
                      component={Link}
                      href={`/workflows/${workflow.id}`}
                      size="small"
                      startIcon={<Edit />}
                      sx={{ fontWeight: 500 }}
                    >
                      Edit
                    </Button>
                    {workflow.status === 'active' && (
                      <Button
                        size="small"
                        startIcon={<PlayArrow />}
                        color="success"
                        sx={{ fontWeight: 500 }}
                        onClick={async () => {
                          try {
                            await fetch(`/api/workflows/${workflow.id}/execute`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                orgId: organization.orgId,
                                trigger: { type: 'manual' },
                              }),
                            });
                          } catch {
                            // Handle error
                          }
                        }}
                      >
                        Run
                      </Button>
                    )}
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchor?.element}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        {menuAnchor?.workflow.status === 'draft' && (
          <MenuItem onClick={() => handleStatusChange(menuAnchor.workflow.id, 'active')}>
            <ListItemIcon>
              <PlayArrow fontSize="small" color="success" />
            </ListItemIcon>
            <ListItemText>Activate</ListItemText>
          </MenuItem>
        )}
        {menuAnchor?.workflow.status === 'active' && (
          <MenuItem onClick={() => handleStatusChange(menuAnchor.workflow.id, 'paused')}>
            <ListItemIcon>
              <Pause fontSize="small" color="warning" />
            </ListItemIcon>
            <ListItemText>Pause</ListItemText>
          </MenuItem>
        )}
        {menuAnchor?.workflow.status === 'paused' && (
          <MenuItem onClick={() => handleStatusChange(menuAnchor.workflow.id, 'active')}>
            <ListItemIcon>
              <PlayArrow fontSize="small" color="success" />
            </ListItemIcon>
            <ListItemText>Resume</ListItemText>
          </MenuItem>
        )}
        {menuAnchor?.workflow.status !== 'archived' && (
          <MenuItem onClick={() => handleStatusChange(menuAnchor!.workflow.id, 'archived')}>
            <ListItemIcon>
              <Archive fontSize="small" />
            </ListItemIcon>
            <ListItemText>Archive</ListItemText>
          </MenuItem>
        )}
        {menuAnchor?.workflow.status === 'archived' && (
          <MenuItem onClick={() => handleStatusChange(menuAnchor.workflow.id, 'draft')}>
            <ListItemIcon>
              <Edit fontSize="small" />
            </ListItemIcon>
            <ListItemText>Unarchive</ListItemText>
          </MenuItem>
        )}
        <MenuItem
          onClick={() => handleDeleteWorkflow(menuAnchor!.workflow.id)}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <Delete fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Create Workflow Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Workflow</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Workflow Name"
            fullWidth
            value={newWorkflowName}
            onChange={e => setNewWorkflowName(e.target.value)}
            placeholder="e.g., Form Submission Handler"
            sx={{ mt: 1 }}
          />
          <TextField
            margin="dense"
            label="Description (optional)"
            fullWidth
            multiline
            rows={3}
            value={newWorkflowDescription}
            onChange={e => setNewWorkflowDescription(e.target.value)}
            placeholder="What does this workflow do?"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreateWorkflow}
            variant="contained"
            disabled={!newWorkflowName.trim() || creating}
            sx={{
              bgcolor: '#00ED64',
              color: '#001E2B',
              '&:hover': { bgcolor: '#00c853' },
            }}
          >
            {creating ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
      </Container>
    </Box>
  );
}
