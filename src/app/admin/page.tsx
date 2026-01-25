'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  alpha,
  Chip,
  Divider,
} from '@mui/material';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import { AdminStatsDashboard } from '@/components/Admin/AdminStatsDashboard';
import { Card, CardContent, CardActionArea } from '@mui/material';
import {
  People,
  HourglassEmpty,
  StoreMallDirectory,
  Analytics,
  Settings,
  Security,
  ArrowForward,
  Psychology,
  Storage,
  Extension,
  SettingsApplications,
  CloudQueue,
  History,
  BugReport,
  NotificationsActive,
  Speed,
  Campaign,
  Rocket,
  Share,
} from '@mui/icons-material';
import { CommandPalette, useCommandPalette } from '@/components/Admin/CommandPalette';
import Link from 'next/link';
import useSWR from 'swr';
import { useAuth } from '@/contexts/AuthContext';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface AdminFeature {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  color: string;
  statsKey?: string;
}

const adminFeatures: AdminFeature[] = [
  {
    title: 'User Management',
    description: 'View and manage all platform users, roles, and permissions',
    href: '/admin/users',
    icon: <People sx={{ fontSize: 32 }} />,
    color: '#2196F3',
    statsKey: 'users',
  },
  {
    title: 'Waitlist',
    description: 'Review and approve pending waitlist applications',
    href: '/admin/waitlist',
    icon: <HourglassEmpty sx={{ fontSize: 32 }} />,
    color: '#FF9800',
    statsKey: 'waitlist',
  },
  {
    title: 'Cluster Management',
    description: 'Monitor M0 clusters, track activity, and deactivate inactive resources',
    href: '/admin/clusters',
    icon: <Storage sx={{ fontSize: 32 }} />,
    color: '#00BCD4',
    statsKey: 'clusters',
  },
  {
    title: 'AI Analytics',
    description: 'Monitor AI usage, token consumption, and costs across all organizations',
    href: '/admin/ai-analytics',
    icon: <Psychology sx={{ fontSize: 32 }} />,
    color: '#00ED64',
    statsKey: 'ai',
  },
  {
    title: 'Marketplace Review',
    description: 'Review and approve marketplace template submissions',
    href: '/admin/marketplace-review',
    icon: <StoreMallDirectory sx={{ fontSize: 32 }} />,
    color: '#9C27B0',
    statsKey: 'marketplace',
  },
  {
    title: 'Referrals',
    description: 'Manage referral codes, view all referrals, and approve payouts',
    href: '/admin/referrals',
    icon: <Share sx={{ fontSize: 32 }} />,
    color: '#4CAF50',
    statsKey: 'referrals',
  },
  {
    title: 'Extensions',
    description: 'Manage platform extensions and features',
    href: '/admin/extensions',
    icon: <Extension sx={{ fontSize: 32 }} />,
    color: '#E91E63',
    statsKey: 'extensions',
  },
  {
    title: 'Instance Control',
    description: 'Monitor instance health, memory usage, and trigger restarts',
    href: '/admin/instance',
    icon: <SettingsApplications sx={{ fontSize: 32 }} />,
    color: '#607D8B',
    statsKey: 'instance',
  },
];

const observabilityFeatures: AdminFeature[] = [
  {
    title: 'System Status',
    description: 'Monitor service health, uptime, and latency across all platform services',
    href: '/admin/system-status',
    icon: <CloudQueue sx={{ fontSize: 32 }} />,
    color: '#00ED64',
  },
  {
    title: 'Error Tracking',
    description: 'View, acknowledge, and resolve platform errors with stack traces',
    href: '/admin/errors',
    icon: <BugReport sx={{ fontSize: 32 }} />,
    color: '#f44336',
  },
  {
    title: 'Audit Logs',
    description: 'Search and export platform activity logs for compliance',
    href: '/admin/audit-logs',
    icon: <History sx={{ fontSize: 32 }} />,
    color: '#2196F3',
  },
  {
    title: 'Alerts',
    description: 'Configure alert rules and view triggered alert history',
    href: '/admin/alerts',
    icon: <NotificationsActive sx={{ fontSize: 32 }} />,
    color: '#FF9800',
  },
  {
    title: 'API Metrics',
    description: 'Monitor API performance, latency percentiles, and error rates',
    href: '/admin/api-metrics',
    icon: <Speed sx={{ fontSize: 32 }} />,
    color: '#9C27B0',
  },
  {
    title: 'Broadcasts',
    description: 'Create and manage system-wide announcements and notifications',
    href: '/admin/broadcasts',
    icon: <Campaign sx={{ fontSize: 32 }} />,
    color: '#00BCD4',
  },
  {
    title: 'Deployments',
    description: 'View current deployment, build info, and git commit details',
    href: '/admin/deployments',
    icon: <Rocket sx={{ fontSize: 32 }} />,
    color: '#607D8B',
  },
];

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const commandPalette = useCommandPalette();

  // Fetch stats for each section
  const { data: userStats } = useSWR(
    user?.platformRole === 'admin' ? '/api/admin/users/stats' : null,
    fetcher
  );
  const { data: waitlistStats } = useSWR(
    user?.platformRole === 'admin' ? '/api/admin/waitlist/stats' : null,
    fetcher
  );
  const { data: clusterStats } = useSWR(
    user?.platformRole === 'admin' ? '/api/admin/clusters?limit=1' : null,
    fetcher
  );
  const { data: aiStats } = useSWR(
    user?.platformRole === 'admin' ? '/api/admin/ai-analytics?days=30' : null,
    fetcher
  );
  const { data: extensionStats } = useSWR(
    user?.platformRole === 'admin' ? '/api/admin/extensions' : null,
    fetcher
  );
  const { data: instanceStats } = useSWR(
    user?.platformRole === 'admin' ? '/api/admin/instance' : null,
    fetcher
  );
  const { data: referralStats } = useSWR(
    user?.platformRole === 'admin' ? '/api/admin/referrals/payouts?status=pending&limit=1' : null,
    fetcher
  );

  // Redirect non-admins
  useEffect(() => {
    if (!authLoading && (!user || user.platformRole !== 'admin')) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
        }}
      >
        <NetPadLoader size="large" variant="ascii" message="Loading admin dashboard..." />
      </Box>
    );
  }

  if (!user || user.platformRole !== 'admin') {
    return null;
  }

  const formatTokens = (n: number): string => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toString();
  };

  const getStatLabel = (feature: AdminFeature): string | null => {
    if (feature.statsKey === 'users' && userStats?.stats) {
      return `${userStats.stats.total} users`;
    }
    if (feature.statsKey === 'waitlist' && waitlistStats?.stats) {
      const pending = waitlistStats.stats.pending || 0;
      return pending > 0 ? `${pending} pending` : 'No pending';
    }
    if (feature.statsKey === 'clusters' && clusterStats?.stats) {
      const inactive = clusterStats.stats.inactive30Days || 0;
      if (inactive > 0) {
        return `${inactive} inactive`;
      }
      return `${clusterStats.stats.ready || 0} active`;
    }
    if (feature.statsKey === 'ai' && aiStats?.summary) {
      return `${formatTokens(aiStats.summary.totalTokens)} tokens`;
    }
    if (feature.statsKey === 'extensions' && extensionStats?.stats) {
      return `${extensionStats.stats.loaded} loaded`;
    }
    if (feature.statsKey === 'instance' && instanceStats?.instance) {
      return instanceStats.instance.uptime;
    }
    if (feature.statsKey === 'referrals' && referralStats) {
      const pending = referralStats.total || 0;
      return pending > 0 ? `${pending} pending` : 'No pending';
    }
    return null;
  };

  const getStatColor = (feature: AdminFeature): 'warning' | 'info' | 'default' => {
    if (feature.statsKey === 'waitlist' && waitlistStats?.stats) {
      return waitlistStats.stats.pending > 0 ? 'warning' : 'default';
    }
    if (feature.statsKey === 'clusters' && clusterStats?.stats) {
      return clusterStats.stats.inactive30Days > 0 ? 'warning' : 'info';
    }
    if (feature.statsKey === 'referrals' && referralStats) {
      return referralStats.total > 0 ? 'warning' : 'default';
    }
    return 'info';
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Command Palette */}
      <CommandPalette open={commandPalette.open} onClose={commandPalette.onClose} />

      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
              Admin Dashboard
            </Typography>
            <Typography color="text.secondary">
              Manage users, waitlist applications, and platform settings
            </Typography>
          </Box>
          <Chip
            label="⌘K"
            onClick={commandPalette.onOpen}
            sx={{
              cursor: 'pointer',
              fontFamily: 'monospace',
              '&:hover': { bgcolor: 'action.selected' },
            }}
          />
        </Box>
      </Box>

      {/* Platform Statistics Dashboard */}
      <AdminStatsDashboard />

      <Divider sx={{ my: 4 }} />

      {/* Section Header for Admin Tools */}
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
        Admin Tools
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Manage platform resources and settings
      </Typography>

      {/* Feature Cards */}
      <Grid container spacing={3}>
        {adminFeatures.map((feature) => {
          const statLabel = getStatLabel(feature);
          const statColor = getStatColor(feature);

          return (
            <Grid item xs={12} sm={6} md={4} key={feature.href}>
              <Card
                elevation={0}
                sx={{
                  height: '100%',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: feature.color,
                    transform: 'translateY(-2px)',
                    boxShadow: `0 4px 20px ${alpha(feature.color, 0.15)}`,
                  },
                }}
              >
                <CardActionArea
                  component={Link}
                  href={feature.href}
                  sx={{ height: '100%' }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        mb: 2,
                      }}
                    >
                      <Box
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          bgcolor: alpha(feature.color, 0.1),
                          color: feature.color,
                        }}
                      >
                        {feature.icon}
                      </Box>
                      {statLabel && (
                        <Chip
                          label={statLabel}
                          size="small"
                          color={statColor}
                          sx={{ fontWeight: 500 }}
                        />
                      )}
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                      {feature.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {feature.description}
                    </Typography>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        mt: 2,
                        color: feature.color,
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 500, mr: 0.5 }}>
                        Manage
                      </Typography>
                      <ArrowForward sx={{ fontSize: 16 }} />
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Divider sx={{ my: 4 }} />

      {/* Observability Section Header */}
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
        Observability & Alerts
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Monitor platform health, track errors, and configure alerting
      </Typography>

      {/* Observability Feature Cards */}
      <Grid container spacing={3}>
        {observabilityFeatures.map((feature) => (
          <Grid item xs={12} sm={6} md={4} key={feature.href}>
            <Card
              elevation={0}
              sx={{
                height: '100%',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: feature.color,
                  transform: 'translateY(-2px)',
                  boxShadow: `0 4px 20px ${alpha(feature.color, 0.15)}`,
                },
              }}
            >
              <CardActionArea
                component={Link}
                href={feature.href}
                sx={{ height: '100%' }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      mb: 2,
                    }}
                  >
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: alpha(feature.color, 0.1),
                        color: feature.color,
                      }}
                    >
                      {feature.icon}
                    </Box>
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {feature.description}
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      mt: 2,
                      color: feature.color,
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 500, mr: 0.5 }}>
                      View
                    </Typography>
                    <ArrowForward sx={{ fontSize: 16 }} />
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Additional Info */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mt: 4,
          bgcolor: (theme) =>
            theme.palette.mode === 'dark' ? alpha('#2196F3', 0.1) : alpha('#2196F3', 0.05),
          border: '1px solid',
          borderColor: alpha('#2196F3', 0.2),
          borderRadius: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Security sx={{ color: '#2196F3' }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Admin Access
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          You have admin access to the platform. All actions are logged for security and
          compliance. If you need to grant admin access to another user, you can do so from
          the User Management section.
        </Typography>
      </Paper>
    </Container>
  );
}
