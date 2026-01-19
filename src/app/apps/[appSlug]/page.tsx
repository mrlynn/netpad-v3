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
} from '@mui/icons-material';
import Link from 'next/link';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import { useApplication } from '@/contexts/ApplicationContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { getAppUrl } from '@/lib/routing';

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

  const appSlug = currentApplication?.slug || '';
  const projectId = currentApplication?.projectId;
  const applicationId = currentApplication?.applicationId;

  useEffect(() => {
    if (currentOrgId && projectId && applicationId) {
      loadStats();
    }
  }, [currentOrgId, projectId, applicationId]);

  const loadStats = async () => {
    if (!currentOrgId || !projectId) return;

    setLoadingStats(true);
    try {
      const [formsRes, workflowsRes] = await Promise.all([
        fetch(`/api/forms/list?orgId=${currentOrgId}&projectId=${projectId}&applicationId=${applicationId}`),
        fetch(`/api/workflows?orgId=${currentOrgId}&projectId=${projectId}&applicationId=${applicationId}`),
      ]);

      const formsData = await formsRes.json();
      const workflowsData = await workflowsRes.json();

      const forms = formsData.forms || [];
      const workflows = workflowsData.workflows || [];

      // Calculate total responses across all forms
      let totalResponses = 0;
      for (const form of forms) {
        try {
          const statsRes = await fetch(`/api/forms/${form.id}/responses?statsOnly=true&pageSize=1`);
          const statsData = await statsRes.json();
          totalResponses += statsData.stats?.total || 0;
        } catch {
          // Ignore errors for individual form stats
        }
      }

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
        <NetPadLoader size="large" message="Loading application..." />
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
    </Box>
  );
}
