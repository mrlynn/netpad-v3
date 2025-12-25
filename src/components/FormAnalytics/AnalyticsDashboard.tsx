'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  CircularProgress,
  Alert,
  alpha,
  Card,
  CardContent,
} from '@mui/material';
import { FormAnalytics, FormDropOffAnalytics } from '@/types/form';
import { ResponseTrendChart } from './charts/ResponseTrendChart';
import { FieldDropOffChart } from './charts/FieldDropOffChart';
import { FieldAnalytics } from './FieldAnalytics';
import { format } from 'date-fns';
import { HelpButton } from '@/components/Help/HelpButton';

interface AnalyticsDashboardProps {
  formId: string;
  connectionString?: string;
  timeRange?: { start: Date; end: Date };
}

export function AnalyticsDashboard({
  formId,
  connectionString,
  timeRange,
}: AnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<FormAnalytics | null>(null);
  const [dropOffAnalytics, setDropOffAnalytics] = useState<FormDropOffAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchAnalytics();
    }, 30000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId, connectionString, timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (connectionString) {
        params.set('connectionString', connectionString);
      }
      if (timeRange) {
        params.set('startDate', timeRange.start.toISOString());
        params.set('endDate', timeRange.end.toISOString());
      }

      // Fetch both analytics and drop-off data in parallel
      const [analyticsResponse, dropOffResponse] = await Promise.all([
        fetch(`/api/forms/${formId}/analytics?${params.toString()}`),
        fetch(`/api/forms/${formId}/analytics/interactions`),
      ]);

      const analyticsData = await analyticsResponse.json();
      const dropOffData = await dropOffResponse.json();

      if (analyticsData.success) {
        setAnalytics(analyticsData.analytics);
      } else {
        setError(analyticsData.error || 'Failed to load analytics');
      }

      if (dropOffData.success) {
        setDropOffAnalytics(dropOffData.analytics);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!analytics) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="info">No analytics data available</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <Typography variant="h4">
          Form Analytics
        </Typography>
        <HelpButton topicId="form-analytics" tooltip="Form Analytics Help" />
      </Box>

      {/* Overview Cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              bgcolor: alpha('#00ED64', 0.1),
              border: '1px solid',
              borderColor: alpha('#00ED64', 0.3),
            }}
          >
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                Total Responses
              </Typography>
              <Typography variant="h4">{analytics.totalResponses}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              bgcolor: alpha('#00ED64', 0.1),
              border: '1px solid',
              borderColor: alpha('#00ED64', 0.3),
            }}
          >
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                Completion Rate
              </Typography>
              <Typography variant="h4">
                {analytics.completionRate.toFixed(1)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              bgcolor: alpha('#00ED64', 0.1),
              border: '1px solid',
              borderColor: alpha('#00ED64', 0.3),
            }}
          >
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                Avg. Completion Time
              </Typography>
              <Typography variant="h4">
                {Math.round(analytics.averageCompletionTime)}s
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              bgcolor: alpha('#00ED64', 0.1),
              border: '1px solid',
              borderColor: alpha('#00ED64', 0.3),
            }}
          >
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                Device Types
              </Typography>
              <Typography variant="h6">
                {Object.keys(analytics.deviceBreakdown).length} types
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Response Trend Chart */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <ResponseTrendChart data={analytics.responseTrend} />
      </Paper>

      {/* Device Breakdown */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Device Breakdown
        </Typography>
        <Grid container spacing={2}>
          {Object.entries(analytics.deviceBreakdown).map(([device, count]) => (
            <Grid item xs={6} sm={4} md={3} key={device}>
              <Paper
                sx={{
                  p: 2,
                  bgcolor: alpha('#00ED64', 0.1),
                  border: '1px solid',
                  borderColor: alpha('#00ED64', 0.3),
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  {device.charAt(0).toUpperCase() + device.slice(1)}
                </Typography>
                <Typography variant="h6">{count}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Field Drop-off Analysis */}
      {dropOffAnalytics && dropOffAnalytics.totalSessions > 0 && (
        <Paper sx={{ p: 3, mb: 4 }}>
          <FieldDropOffChart
            data={Object.entries(dropOffAnalytics.fieldDropOff).map(([fieldPath, stats]) => ({
              fieldPath,
              fieldLabel: fieldPath.split('.').pop() || fieldPath,
              viewCount: stats.viewCount,
              interactionCount: stats.interactionCount,
              completionCount: stats.completionCount,
              abandonmentCount: stats.abandonmentCount,
              abandonmentRate: stats.abandonmentRate,
              averageTimeSpent: stats.averageTimeSpent,
            }))}
            title="Field Drop-off Analysis"
          />
        </Paper>
      )}

      {/* Field-level Analytics */}
      <Box>
        <Typography variant="h5" sx={{ mb: 2 }}>
          Field Analytics
        </Typography>
        {Object.entries(analytics.fieldStats).map(([fieldPath, stats]) => (
          <FieldAnalytics key={fieldPath} fieldStats={stats} />
        ))}
      </Box>
    </Box>
  );
}

