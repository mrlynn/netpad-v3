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
  CardActionArea,
  Button,
  alpha,
  useTheme as useMuiTheme,
  Skeleton,
} from '@mui/material';
import {
  Description,
  AccountTree,
  Storage,
  Settings,
  Add,
  ArrowForward,
  TrendingUp,
  Rocket,
  Cloud,
  Download,
} from '@mui/icons-material';
import Link from 'next/link';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import { useApplication } from '@/contexts/ApplicationContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { getAppUrl } from '@/lib/routing';
import { DeploymentWizard } from '@/components/Deploy/DeploymentWizard';
import { DownloadAppDialog } from '@/components/Download/DownloadAppDialog';
import { ClusterSetupBanner } from '@/components/Cluster/ClusterSetupBanner';
import { useClusterStatus } from '@/hooks/useClusterStatus';
import { Project } from '@/types/platform';

interface DashboardStats {
  forms: number;
  workflows: number;
  responses: number;
}

/**
 * /apps/[appSlug]
 *
 * Application Overview page - the main dashboard for an application.
 * Shows quick stats, recent activity, and navigation to key sections.
 */
export default function AppOverviewPage() {
  const theme = useMuiTheme();
  const { currentOrgId } = useOrganization();
  const { currentApplication, isLoading: isAppLoading } = useApplication();

  const [stats, setStats] = useState<DashboardStats>({ forms: 0, workflows: 0, responses: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  // Deploy dialog states
  const [deployWizardOpen, setDeployWizardOpen] = useState(false);
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [project, setProject] = useState<Project | null>(null);

  const appSlug = currentApplication?.slug || '';
  const projectId = currentApplication?.projectId;
  const applicationId = currentApplication?.applicationId;

  // Check cluster status for this organization/project
  const { clusterStatus } = useClusterStatus(currentOrgId, projectId);
  const hasDatabase = clusterStatus?.hasCluster || clusterStatus?.isReady;

  useEffect(() => {
    if (currentOrgId && projectId && applicationId) {
      loadStats();
      loadProject();
    }
  }, [currentOrgId, projectId, applicationId]);

  const loadProject = async () => {
    if (!currentOrgId || !projectId) return;

    try {
      const response = await fetch(`/api/projects/${projectId}?orgId=${currentOrgId}`);
      if (response.ok) {
        const data = await response.json();
        setProject(data.project);
      }
    } catch (error) {
      console.error('Error loading project:', error);
    }
  };

  const loadStats = async () => {
    if (!currentOrgId || !projectId) return;

    setLoadingStats(true);
    try {
      // Fetch forms and workflows in parallel - forms API now includes response counts
      const [formsRes, workflowsRes] = await Promise.all([
        fetch(`/api/forms/list?orgId=${currentOrgId}&projectId=${projectId}&applicationId=${applicationId}`),
        fetch(`/api/workflows?orgId=${currentOrgId}&projectId=${projectId}&applicationId=${applicationId}`),
      ]);

      const formsData = await formsRes.json();
      const workflowsData = await workflowsRes.json();

      const forms = formsData.forms || [];
      const workflows = workflowsData.workflows || [];

      // Sum response counts from forms (now included in the API response)
      const totalResponses = forms.reduce(
        (sum: number, form: { responseCount?: number }) => sum + (form.responseCount || 0),
        0
      );

      setStats({
        forms: forms.length,
        workflows: workflows.length,
        responses: totalResponses,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  if (isAppLoading || !currentApplication) {
    return (
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <NetPadLoader fullPage variant="ascii" />
      </Box>
    );
  }

  const quickActions = [
    {
      icon: <Description sx={{ fontSize: 32 }} />,
      title: 'Forms',
      description: `${stats.forms} form${stats.forms !== 1 ? 's' : ''}`,
      href: getAppUrl(appSlug, 'forms'),
      color: theme.palette.primary.main,
    },
    {
      icon: <AccountTree sx={{ fontSize: 32 }} />,
      title: 'Workflows',
      description: `${stats.workflows} workflow${stats.workflows !== 1 ? 's' : ''}`,
      href: getAppUrl(appSlug, 'workflows'),
      color: theme.palette.secondary.main,
    },
    {
      icon: <Storage sx={{ fontSize: 32 }} />,
      title: 'Data',
      description: `${stats.responses} response${stats.responses !== 1 ? 's' : ''}`,
      href: getAppUrl(appSlug, 'data'),
      color: theme.palette.info.main,
    },
    {
      icon: <Settings sx={{ fontSize: 32 }} />,
      title: 'Settings',
      description: 'Configure app',
      href: getAppUrl(appSlug, 'settings'),
      color: theme.palette.text.secondary,
    },
  ];

  return (
    <Box sx={{ flex: 1, bgcolor: 'background.default', overflow: 'auto' }}>
      {/* Header */}
      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha(theme.palette.background.paper, 0.5) }}>
        <Container maxWidth="lg">
          <Box sx={{ py: { xs: 3, sm: 4 } }}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', fontSize: { xs: '1.75rem', sm: '2.125rem' }, mb: 1 }}>
              {currentApplication.name}
            </Typography>
            {currentApplication.description && (
              <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600 }}>
                {currentApplication.description}
              </Typography>
            )}
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Database Setup Banner - show if no cluster/connection exists */}
        {currentOrgId && projectId && !hasDatabase && (
          <ClusterSetupBanner
            orgId={currentOrgId}
            projectId={projectId}
            onClusterReady={() => {
              // Refresh stats when cluster becomes ready
              loadStats();
            }}
          />
        )}

        {/* Quick Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {quickActions.map((action) => (
            <Grid item xs={6} sm={3} key={action.title}>
              <Card
                sx={{
                  height: '100%',
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: action.color,
                    boxShadow: `0 4px 20px ${alpha(action.color, 0.15)}`,
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                <CardActionArea component={Link} href={action.href} sx={{ height: '100%' }}>
                  <CardContent sx={{ textAlign: 'center', py: 3 }}>
                    <Box sx={{ color: action.color, mb: 1 }}>
                      {action.icon}
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
                      {action.title}
                    </Typography>
                    {loadingStats && action.title !== 'Settings' ? (
                      <Skeleton width={60} sx={{ mx: 'auto', mt: 0.5 }} />
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        {action.description}
                      </Typography>
                    )}
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Quick Actions */}
        <Paper sx={{ p: 4, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider', mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <Add sx={{ color: theme.palette.primary.main }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Quick Actions
            </Typography>
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <Button
                component={Link}
                href={getAppUrl(appSlug, 'forms') + '?create=true'}
                variant="outlined"
                fullWidth
                startIcon={<Description />}
                sx={{
                  py: 2,
                  justifyContent: 'flex-start',
                  textTransform: 'none',
                  fontWeight: 600,
                  borderColor: alpha(theme.palette.primary.main, 0.3),
                  '&:hover': {
                    borderColor: theme.palette.primary.main,
                    bgcolor: alpha(theme.palette.primary.main, 0.05),
                  },
                }}
              >
                Create New Form
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Button
                component={Link}
                href={getAppUrl(appSlug, 'workflows') + '?create=true'}
                variant="outlined"
                fullWidth
                startIcon={<AccountTree />}
                sx={{
                  py: 2,
                  justifyContent: 'flex-start',
                  textTransform: 'none',
                  fontWeight: 600,
                  borderColor: alpha(theme.palette.secondary.main, 0.3),
                  '&:hover': {
                    borderColor: theme.palette.secondary.main,
                    bgcolor: alpha(theme.palette.secondary.main, 0.05),
                  },
                }}
              >
                Create New Workflow
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Button
                component={Link}
                href={getAppUrl(appSlug, 'data')}
                variant="outlined"
                fullWidth
                startIcon={<Storage />}
                sx={{
                  py: 2,
                  justifyContent: 'flex-start',
                  textTransform: 'none',
                  fontWeight: 600,
                  borderColor: alpha(theme.palette.info.main, 0.3),
                  '&:hover': {
                    borderColor: theme.palette.info.main,
                    bgcolor: alpha(theme.palette.info.main, 0.05),
                  },
                }}
              >
                Explore Data
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Deploy Section */}
        <Paper sx={{ p: 4, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider', mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <Rocket sx={{ color: '#00ED64' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Deploy
            </Typography>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Deploy your application as a standalone Next.js app. Choose Vercel for instant cloud hosting, or download for Docker/self-hosted deployments.
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<Cloud />}
                onClick={() => setDeployWizardOpen(true)}
                disabled={stats.forms === 0}
                sx={{
                  py: 2,
                  justifyContent: 'flex-start',
                  textTransform: 'none',
                  fontWeight: 600,
                  borderColor: alpha('#00ED64', 0.5),
                  color: '#00ED64',
                  '&:hover': {
                    borderColor: '#00ED64',
                    bgcolor: alpha('#00ED64', 0.05),
                  },
                  '&.Mui-disabled': {
                    borderColor: alpha(theme.palette.text.disabled, 0.3),
                  },
                }}
              >
                Deploy to Vercel
              </Button>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<Download />}
                onClick={() => setDownloadDialogOpen(true)}
                disabled={stats.forms === 0}
                sx={{
                  py: 2,
                  justifyContent: 'flex-start',
                  textTransform: 'none',
                  fontWeight: 600,
                  borderColor: alpha(theme.palette.text.secondary, 0.3),
                  '&:hover': {
                    borderColor: theme.palette.text.secondary,
                    bgcolor: alpha(theme.palette.text.secondary, 0.05),
                  },
                  '&.Mui-disabled': {
                    borderColor: alpha(theme.palette.text.disabled, 0.3),
                  },
                }}
              >
                Download (Docker/Self-hosted)
              </Button>
            </Grid>
          </Grid>

          {stats.forms === 0 && !loadingStats && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
              Create at least one form before deploying your application.
            </Typography>
          )}
        </Paper>

        {/* Getting Started (show if no forms yet) */}
        {!loadingStats && stats.forms === 0 && (
          <Paper sx={{ p: 6, textAlign: 'center', bgcolor: alpha(theme.palette.primary.main, 0.02), border: '1px dashed', borderColor: alpha(theme.palette.primary.main, 0.3), borderRadius: 2 }}>
            <TrendingUp sx={{ fontSize: 48, color: theme.palette.primary.main, mb: 2 }} />
            <Typography variant="h5" sx={{ color: 'text.primary', mb: 1, fontWeight: 600 }}>
              Get Started with {currentApplication.name}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 500, mx: 'auto' }}>
              Create your first form to start collecting data. Use our drag-and-drop builder or let AI generate a form for you.
            </Typography>
            <Button
              component={Link}
              href={getAppUrl(appSlug, 'forms') + '?create=true'}
              variant="contained"
              size="large"
              startIcon={<Add />}
              endIcon={<ArrowForward />}
              sx={{
                bgcolor: theme.palette.primary.main,
                color: theme.palette.primary.contrastText,
                textTransform: 'none',
                fontWeight: 600,
                px: 4,
                py: 1.5,
                '&:hover': { bgcolor: theme.palette.primary.dark },
              }}
            >
              Create Your First Form
            </Button>
          </Paper>
        )}
      </Container>

      {/* Deploy to Vercel Wizard */}
      <DeploymentWizard
        open={deployWizardOpen}
        onClose={() => setDeployWizardOpen(false)}
        project={project}
        organizationId={currentOrgId || ''}
      />

      {/* Download App Dialog */}
      <DownloadAppDialog
        open={downloadDialogOpen}
        onClose={() => setDownloadDialogOpen(false)}
        applicationId={applicationId || ''}
        applicationName={currentApplication.name}
        orgId={currentOrgId || ''}
        formCount={stats.forms}
        workflowCount={stats.workflows}
      />
    </Box>
  );
}
