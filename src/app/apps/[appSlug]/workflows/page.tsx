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
import { NetPadLoader } from '@/components/common/NetPadLoader';
import { useApplication } from '@/contexts/ApplicationContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { getAppUrl, getOrgProjectUrl } from '@/lib/routing';

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

  const { currentOrgId } = useOrganization();
  const { currentApplication, isLoading: isAppLoading } = useApplication();

  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const appSlug = currentApplication?.slug || '';
  const applicationId = currentApplication?.applicationId;
  const projectId = currentApplication?.projectId;

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

  if (isAppLoading || !currentApplication) {
    return (
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <NetPadLoader size="large" message="Loading application..." />
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
              component={Link}
              href={currentOrgId && projectId ? getOrgProjectUrl(currentOrgId, projectId, 'workflows') + '/new' : '#'}
              variant="contained"
              startIcon={<Add />}
              sx={{ bgcolor: theme.palette.primary.main, color: theme.palette.primary.contrastText, textTransform: 'none', fontWeight: 600, px: 3, '&:hover': { bgcolor: theme.palette.primary.dark } }}
            >
              Create Workflow
            </Button>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 4 }}>
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
            <NetPadLoader size="large" message="Loading workflows..." />
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
              component={Link}
              href={currentOrgId && projectId ? getOrgProjectUrl(currentOrgId, projectId, 'workflows') + '/new' : '#'}
              variant="contained"
              size="large"
              startIcon={<Add />}
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
    </Box>
  );
}
