'use client';

import { useState, useEffect } from 'react';
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
  alpha,
  TextField,
  InputAdornment,
  useTheme as useMuiTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material';
import {
  Add,
  Search,
  Edit,
  AccountTree,
  PlayArrow,
  Pause,
} from '@mui/icons-material';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import { useApplication } from '@/contexts/ApplicationContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { getOrgProjectUrl } from '@/lib/routing';

interface Workflow {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive' | 'draft';
  trigger?: { type: string };
  createdAt?: string;
  updatedAt?: string;
  applicationId?: string;
}

/**
 * /apps/[appSlug]/workflows
 *
 * App-centric workflows list page. Shows workflows belonging to the current application.
 */
export default function AppWorkflowsPage() {
  const theme = useMuiTheme();
  const router = useRouter();
  const searchParams = useSearchParams();

  const { currentOrgId } = useOrganization();
  const { currentApplication, isLoading: isAppLoading } = useApplication();

  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Create dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [newWorkflowDescription, setNewWorkflowDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const appSlug = currentApplication?.slug || '';
  const applicationId = currentApplication?.applicationId;
  const projectId = currentApplication?.projectId;

  // Check for createNew query param (redirected from /workflows/new)
  const createNew = searchParams?.get('createNew') === 'true';

  // Auto-open create dialog when redirected from /workflows/new
  useEffect(() => {
    if (createNew && !loading) {
      setCreateDialogOpen(true);
    }
  }, [createNew, loading]);

  useEffect(() => {
    if (currentOrgId && projectId && applicationId) {
      loadWorkflows();
    }
  }, [currentOrgId, projectId, applicationId]);

  const loadWorkflows = async () => {
    if (!currentOrgId || !projectId) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/workflows?orgId=${currentOrgId}&projectId=${projectId}&applicationId=${applicationId}`);
      const data = await response.json();

      if (data.workflows) {
        setWorkflows(data.workflows);
      }
    } catch (error) {
      console.error('Error loading workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredWorkflows = workflows.filter((wf) =>
    (wf.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (wf.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Create workflow via API, then navigate to the editor
  const handleCreateWorkflow = async () => {
    if (!currentOrgId || !projectId || !newWorkflowName.trim()) {
      return;
    }

    try {
      setCreating(true);
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: currentOrgId,
          projectId,
          name: newWorkflowName.trim(),
          description: newWorkflowDescription.trim() || undefined,
          applicationId: applicationId || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create workflow');
      }

      // Navigate to the newly created workflow
      const workflowUrl = `${getOrgProjectUrl(currentOrgId, projectId, 'workflows', data.workflow.id)}?applicationId=${applicationId}`;
      router.push(workflowUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workflow');
    } finally {
      setCreating(false);
      setCreateDialogOpen(false);
      setNewWorkflowName('');
      setNewWorkflowDescription('');
    }
  };

  if (isAppLoading || !currentApplication) {
    return (
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <NetPadLoader size="large" variant="ascii" />
      </Box>
    );
  }

  return (
    <Box sx={{ flex: 1, bgcolor: 'background.default', overflow: 'auto' }}>
      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha(theme.palette.background.paper, 0.5) }}>
        <Container maxWidth="lg">
          <Box sx={{ py: { xs: 2, sm: 3 }, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: { xs: 2, sm: 0 } }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', fontSize: { xs: '1.75rem', sm: '2.125rem' } }}>
                Workflows
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Automation workflows in {currentApplication.name}
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setCreateDialogOpen(true)}
              sx={{ bgcolor: theme.palette.primary.main, color: theme.palette.primary.contrastText, textTransform: 'none', fontWeight: 600, px: 3, '&:hover': { bgcolor: theme.palette.primary.dark } }}
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

        <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
          <TextField
            fullWidth
            placeholder="Search workflows..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ color: 'text.secondary' }} /></InputAdornment> }}
            sx={{ '& .MuiOutlinedInput-root': { bgcolor: alpha(theme.palette.background.paper, 0.5) } }}
          />
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
            <NetPadLoader size="large" variant="ascii" message="Loading workflows..." />
          </Box>
        ) : filteredWorkflows.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: 'center', bgcolor: alpha(theme.palette.background.paper, 0.5), border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
            <AccountTree sx={{ fontSize: 48, color: theme.palette.primary.main, mb: 2 }} />
            <Typography variant="h5" sx={{ color: 'text.primary', mb: 1, fontWeight: 600 }}>
              Create Your First Workflow
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 500, mx: 'auto' }}>
              Automate your processes with visual workflows. Connect forms, triggers, and actions.
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<Add />}
              onClick={() => setCreateDialogOpen(true)}
              sx={{ bgcolor: theme.palette.primary.main, color: theme.palette.primary.contrastText, textTransform: 'none', fontWeight: 600, px: 4, py: 1.5, '&:hover': { bgcolor: theme.palette.primary.dark } }}
            >
              Create Your First Workflow
            </Button>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {filteredWorkflows.map((workflow) => (
              <Grid item xs={12} sm={6} md={4} key={workflow.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.paper', border: '1px solid', borderColor: workflow.status === 'active' ? alpha(theme.palette.success.main, 0.3) : 'divider', borderRadius: 2 }}>
                  <CardContent sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
                        {workflow.name || 'Untitled Workflow'}
                      </Typography>
                      <Chip
                        icon={workflow.status === 'active' ? <PlayArrow sx={{ fontSize: 14 }} /> : <Pause sx={{ fontSize: 14 }} />}
                        label={workflow.status}
                        size="small"
                        sx={{
                          height: 24,
                          fontSize: '0.7rem',
                          bgcolor: workflow.status === 'active' ? alpha(theme.palette.success.main, 0.15) : alpha(theme.palette.text.primary, 0.05),
                          color: workflow.status === 'active' ? theme.palette.success.main : 'text.secondary',
                        }}
                      />
                    </Box>
                    {workflow.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {workflow.description}
                      </Typography>
                    )}
                    {workflow.trigger && (
                      <Chip label={`Trigger: ${workflow.trigger.type}`} size="small" sx={{ height: 20, fontSize: '0.65rem' }} />
                    )}
                  </CardContent>
                  <CardActions sx={{ px: 2, pb: 2, pt: 0 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<Edit sx={{ fontSize: 16 }} />}
                      component={Link}
                      href={currentOrgId && projectId ? getOrgProjectUrl(currentOrgId, projectId, 'workflows') + `/${workflow.id}` : '#'}
                      sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                      Edit
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
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
            sx={{ bgcolor: theme.palette.primary.main, '&:hover': { bgcolor: theme.palette.primary.dark } }}
          >
            {creating ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
