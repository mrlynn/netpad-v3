'use client';

import { useState, useEffect, memo } from 'react';
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
  Tooltip,
  Theme,
} from '@mui/material';
import {
  Add,
  Search,
  Edit,
  AccountTree,
  PlayArrow,
  Pause,
  OpenInNew,
  CalendarToday,
  CheckCircle,
  Error as ErrorIcon,
  Schedule,
  Webhook,
  Description,
  TouchApp,
  BubbleChart,
} from '@mui/icons-material';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import { useApplication } from '@/contexts/ApplicationContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { getAppUrl } from '@/lib/routing';

interface WorkflowStats {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  avgExecutionTimeMs: number;
  lastExecutedAt?: string;
}

interface WorkflowCanvas {
  nodes: Array<{ id: string; type: string; data?: { triggerType?: string } }>;
  edges: Array<{ id: string }>;
}

interface Workflow {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive' | 'draft' | 'paused';
  trigger?: { type: string };
  canvas?: WorkflowCanvas;
  stats?: WorkflowStats;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
  applicationId?: string;
  thumbnailUrl?: string;
}

interface WorkflowCardProps {
  workflow: Workflow;
  theme: Theme;
  appSlug: string;
  formatDate: (dateString?: string) => string;
}

const WorkflowCard = memo(function WorkflowCard({
  workflow,
  theme,
  appSlug,
  formatDate,
}: WorkflowCardProps) {
  // Count nodes (excluding edges)
  const nodeCount = workflow.canvas?.nodes?.length || 0;

  // Find trigger type from nodes
  const triggerNode = workflow.canvas?.nodes?.find(n =>
    n.type === 'trigger' || n.type?.includes('trigger') || n.data?.triggerType
  );
  const triggerType = triggerNode?.data?.triggerType || triggerNode?.type || workflow.trigger?.type;

  // Calculate success rate
  const stats = workflow.stats;
  const hasExecutions = stats && stats.totalExecutions > 0;
  const successRate = hasExecutions
    ? Math.round((stats.successfulExecutions / stats.totalExecutions) * 100)
    : null;

  // Get trigger icon based on type
  const getTriggerIcon = (type?: string) => {
    switch (type?.toLowerCase()) {
      case 'form':
      case 'form-submission':
        return <Description sx={{ fontSize: 14 }} />;
      case 'webhook':
        return <Webhook sx={{ fontSize: 14 }} />;
      case 'schedule':
      case 'scheduled':
        return <Schedule sx={{ fontSize: 14 }} />;
      case 'manual':
        return <TouchApp sx={{ fontSize: 14 }} />;
      default:
        return <PlayArrow sx={{ fontSize: 14 }} />;
    }
  };

  // Format trigger type for display
  const formatTriggerType = (type?: string) => {
    if (!type) return null;
    return type
      .replace(/-/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  return (
    <Card
      data-testid="workflow-row"
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: workflow.status === 'active' ? alpha(theme.palette.success.main, 0.3) : 'divider',
        borderRadius: 2,
        transition: 'all 0.2s ease',
        '&:hover': {
          borderColor: workflow.status === 'active' ? theme.palette.success.main : theme.palette.primary.main,
          boxShadow: `0 4px 20px ${alpha(workflow.status === 'active' ? theme.palette.success.main : theme.palette.primary.main, 0.15)}`,
          transform: 'translateY(-2px)',
        },
      }}
    >
      {/* Thumbnail/Preview Area */}
      <Box
        sx={{
          height: 120,
          bgcolor: alpha(theme.palette.primary.main, 0.02),
          borderBottom: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {workflow.thumbnailUrl ? (
          <Box
            component="img"
            src={workflow.thumbnailUrl}
            alt={`${workflow.name || 'Workflow'} preview`}
            sx={{
              width: '100%',
              height: 'auto',
              minHeight: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
            }}
          />
        ) : (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: 0.5,
              color: 'text.disabled',
            }}
          >
            <BubbleChart sx={{ fontSize: 36, opacity: 0.3, color: theme.palette.primary.main }} />
            {nodeCount > 0 && (
              <Typography variant="caption" sx={{ opacity: 0.7, color: 'text.secondary' }}>
                {nodeCount} node{nodeCount !== 1 ? 's' : ''}
              </Typography>
            )}
          </Box>
        )}
        {/* Status badge overlay */}
        <Chip
          icon={workflow.status === 'active' ? <PlayArrow sx={{ fontSize: 12 }} /> : <Pause sx={{ fontSize: 12 }} />}
          label={workflow.status}
          size="small"
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            height: 22,
            fontSize: '0.65rem',
            bgcolor: workflow.status === 'active'
              ? alpha(theme.palette.success.main, 0.9)
              : alpha(theme.palette.grey[700], 0.9),
            color: '#fff',
            '& .MuiChip-icon': { color: '#fff' },
          }}
        />
      </Box>

      <CardContent sx={{ flex: 1, pb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Box sx={{ flex: 1, mr: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem', mb: 0.5 }}>
              {workflow.name || 'Untitled Workflow'}
            </Typography>
            {workflow.description && (
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
                {workflow.description}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Info chips */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2 }}>
          {triggerType && (
            <Chip
              icon={getTriggerIcon(triggerType)}
              label={formatTriggerType(triggerType)}
              size="small"
              sx={{
                height: 24,
                fontSize: '0.7rem',
                bgcolor: alpha(theme.palette.info.main, 0.1),
                color: theme.palette.info.main,
                '& .MuiChip-icon': { color: theme.palette.info.main },
              }}
            />
          )}
          {nodeCount > 0 && (
            <Chip
              icon={<AccountTree sx={{ fontSize: 14 }} />}
              label={`${nodeCount} nodes`}
              size="small"
              sx={{
                height: 24,
                fontSize: '0.7rem',
                bgcolor: alpha(theme.palette.text.primary, 0.05),
              }}
            />
          )}
          {hasExecutions && (
            <Tooltip title={`${stats.successfulExecutions} succeeded, ${stats.failedExecutions} failed`}>
              <Chip
                icon={successRate && successRate >= 80 ? <CheckCircle sx={{ fontSize: 14 }} /> : <ErrorIcon sx={{ fontSize: 14 }} />}
                label={`${successRate}% success`}
                size="small"
                sx={{
                  height: 24,
                  fontSize: '0.7rem',
                  bgcolor: successRate && successRate >= 80
                    ? alpha(theme.palette.success.main, 0.15)
                    : alpha(theme.palette.warning.main, 0.15),
                  color: successRate && successRate >= 80
                    ? theme.palette.success.main
                    : theme.palette.warning.main,
                  '& .MuiChip-icon': {
                    color: successRate && successRate >= 80
                      ? theme.palette.success.main
                      : theme.palette.warning.main,
                  },
                }}
              />
            </Tooltip>
          )}
        </Box>

        {/* Stats row */}
        <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CalendarToday sx={{ fontSize: 12 }} />
            {formatDate(workflow.updatedAt || workflow.createdAt)}
          </Typography>
          {hasExecutions && (
            <Typography variant="caption" color="text.secondary">
              {stats.totalExecutions} run{stats.totalExecutions !== 1 ? 's' : ''}
            </Typography>
          )}
          {workflow.version && workflow.version > 1 && (
            <Typography variant="caption" color="text.secondary">
              v{workflow.version}
            </Typography>
          )}
        </Box>
      </CardContent>

      <CardActions sx={{ px: 2, pb: 2, pt: 0, gap: 1 }}>
        <Tooltip title="Edit workflow">
          <Button
            size="small"
            variant="outlined"
            startIcon={<Edit sx={{ fontSize: 16 }} />}
            component={Link}
            href={`${getAppUrl(appSlug, 'workflows')}/${workflow.id}`}
            sx={{
              borderColor: alpha(theme.palette.info.main, 0.5),
              color: theme.palette.info.main,
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': {
                borderColor: theme.palette.info.main,
                bgcolor: alpha(theme.palette.info.main, 0.1),
              },
            }}
          >
            Edit
          </Button>
        </Tooltip>
        {workflow.status === 'active' && (
          <Tooltip title="Run workflow">
            <Button
              size="small"
              variant="contained"
              startIcon={<OpenInNew sx={{ fontSize: 16 }} />}
              component={Link}
              href={`${getAppUrl(appSlug, 'workflows')}/${workflow.id}?run=true`}
              sx={{
                bgcolor: theme.palette.success.main,
                color: '#fff',
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': { bgcolor: theme.palette.success.dark },
              }}
            >
              Run
            </Button>
          </Tooltip>
        )}
      </CardActions>
    </Card>
  );
});

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

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

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

      // Navigate to the newly created workflow using app-centric URL
      const workflowUrl = `${getAppUrl(appSlug, 'workflows')}/${data.workflow.id}`;
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
    <Box sx={{ flex: 1, bgcolor: 'background.default', overflow: 'auto' }} data-testid="workflows-list">
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
              data-testid="new-workflow-button"
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
                <WorkflowCard
                  workflow={workflow}
                  theme={theme}
                  appSlug={appSlug}
                  formatDate={formatDate}
                />
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
