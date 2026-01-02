'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Skeleton,
  LinearProgress,
  Chip,
  Avatar,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  AccessTime as AccessTimeIcon,
  Devices as DevicesIcon,
  Computer as ComputerIcon,
  Home as HomeIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';
import { OnboardingAnalytics, formatCompletionTime, STATUS_CONFIG } from '@/types/onboarding';

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<OnboardingAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const response = await fetch('/api/onboarding/analytics');
      const data = await response.json();

      if (data.success) {
        setAnalytics(data.analytics);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({
    title,
    value,
    subtitle,
    icon,
    color,
  }: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ReactNode;
    color: string;
  }) => (
    <Card elevation={0} sx={{ height: '100%', border: '1px solid', borderColor: 'divider' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            {loading ? (
              <Skeleton variant="text" width={80} height={40} />
            ) : (
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {value}
              </Typography>
            )}
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Avatar sx={{ bgcolor: color, width: 48, height: 48 }}>{icon}</Avatar>
        </Box>
      </CardContent>
    </Card>
  );

  const ProgressBar = ({
    label,
    value,
    total,
    color,
  }: {
    label: string;
    value: number;
    total: number;
    color: string;
  }) => {
    const percentage = total > 0 ? (value / total) * 100 : 0;
    return (
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="body2">{label}</Typography>
          <Typography variant="body2" color="text.secondary">
            {value} ({percentage.toFixed(1)}%)
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={percentage}
          sx={{
            height: 8,
            borderRadius: 4,
            bgcolor: 'grey.200',
            '& .MuiLinearProgress-bar': {
              bgcolor: color,
              borderRadius: 4,
            },
          }}
        />
      </Box>
    );
  };

  if (error) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
          Analytics
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Insights and metrics for onboarding submissions
        </Typography>
      </Box>

      {/* Overview Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Submissions"
            value={analytics?.totalSubmissions ?? 0}
            icon={<TrendingUpIcon />}
            color="#1976d2"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Avg. Completion Time"
            value={analytics ? formatCompletionTime(analytics.averageCompletionTime) : '-'}
            icon={<AccessTimeIcon />}
            color="#f57c00"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Approved"
            value={analytics?.submissionsByStatus.approved ?? 0}
            subtitle={
              analytics?.totalSubmissions
                ? `${((analytics.submissionsByStatus.approved / analytics.totalSubmissions) * 100).toFixed(0)}% of total`
                : undefined
            }
            icon={<TrendingUpIcon />}
            color="#388e3c"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Pending Review"
            value={
              (analytics?.submissionsByStatus.submitted ?? 0) +
              (analytics?.submissionsByStatus.under_review ?? 0)
            }
            icon={<TrendingUpIcon />}
            color="#9c27b0"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Status Distribution */}
        <Grid item xs={12} md={6}>
          <Card elevation={0} sx={{ height: '100%', border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                Status Distribution
              </Typography>
              {loading ? (
                <Box>
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} variant="rectangular" height={32} sx={{ mb: 2, borderRadius: 1 }} />
                  ))}
                </Box>
              ) : analytics ? (
                <Box>
                  {Object.entries(analytics.submissionsByStatus).map(([status, count]) => {
                    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
                    return (
                      <ProgressBar
                        key={status}
                        label={config.label}
                        value={count}
                        total={analytics.totalSubmissions}
                        color={config.color}
                      />
                    );
                  })}
                </Box>
              ) : null}
            </CardContent>
          </Card>
        </Grid>

        {/* Device Distribution */}
        <Grid item xs={12} md={6}>
          <Card elevation={0} sx={{ height: '100%', border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                Device Distribution
              </Typography>
              {loading ? (
                <Box>
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} variant="rectangular" height={32} sx={{ mb: 2, borderRadius: 1 }} />
                  ))}
                </Box>
              ) : analytics ? (
                <Box>
                  <ProgressBar
                    label="Desktop"
                    value={analytics.deviceBreakdown.desktop}
                    total={analytics.totalSubmissions}
                    color="#1976d2"
                  />
                  <ProgressBar
                    label="Mobile"
                    value={analytics.deviceBreakdown.mobile}
                    total={analytics.totalSubmissions}
                    color="#f57c00"
                  />
                  <ProgressBar
                    label="Tablet"
                    value={analytics.deviceBreakdown.tablet}
                    total={analytics.totalSubmissions}
                    color="#9c27b0"
                  />
                </Box>
              ) : null}
            </CardContent>
          </Card>
        </Grid>

        {/* Computer Preferences */}
        <Grid item xs={12} md={6}>
          <Card elevation={0} sx={{ height: '100%', border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <ComputerIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Computer Preferences
                </Typography>
              </Box>
              {loading ? (
                <Box>
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} variant="rectangular" height={32} sx={{ mb: 2, borderRadius: 1 }} />
                  ))}
                </Box>
              ) : analytics && Object.keys(analytics.computerPreferences).length > 0 ? (
                <Box>
                  {Object.entries(analytics.computerPreferences)
                    .sort(([, a], [, b]) => b - a)
                    .map(([pref, count], index) => (
                      <ProgressBar
                        key={pref}
                        label={pref.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                        value={count}
                        total={analytics.totalSubmissions}
                        color={['#1976d2', '#f57c00', '#388e3c', '#9c27b0'][index % 4]}
                      />
                    ))}
                </Box>
              ) : (
                <Typography color="text.secondary">No data yet</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Remote Setup */}
        <Grid item xs={12} md={6}>
          <Card elevation={0} sx={{ height: '100%', border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <HomeIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Work Location Preference
                </Typography>
              </Box>
              {loading ? (
                <Box>
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} variant="rectangular" height={32} sx={{ mb: 2, borderRadius: 1 }} />
                  ))}
                </Box>
              ) : analytics && Object.keys(analytics.remoteSetupDistribution).length > 0 ? (
                <Box>
                  {Object.entries(analytics.remoteSetupDistribution)
                    .sort(([, a], [, b]) => b - a)
                    .map(([setup, count], index) => (
                      <ProgressBar
                        key={setup}
                        label={
                          setup === 'full_remote'
                            ? 'Fully Remote'
                            : setup === 'hybrid'
                              ? 'Hybrid'
                              : 'Office'
                        }
                        value={count}
                        total={analytics.totalSubmissions}
                        color={['#388e3c', '#f57c00', '#1976d2'][index % 3]}
                      />
                    ))}
                </Box>
              ) : (
                <Typography color="text.secondary">No data yet</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Top Software Requests */}
        <Grid item xs={12}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                Top Software Requests
              </Typography>
              {loading ? (
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} variant="rectangular" width={100} height={32} sx={{ borderRadius: 2 }} />
                  ))}
                </Box>
              ) : analytics && analytics.topSoftwareRequests.length > 0 ? (
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {analytics.topSoftwareRequests.map(({ software, count }) => (
                    <Chip
                      key={software}
                      label={`${software} (${count})`}
                      sx={{ fontWeight: 500 }}
                    />
                  ))}
                </Box>
              ) : (
                <Typography color="text.secondary">No software requests yet</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
