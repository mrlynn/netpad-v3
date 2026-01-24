'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Alert,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  alpha,
} from '@mui/material';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import RefreshIcon from '@mui/icons-material/Refresh';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ChatIcon from '@mui/icons-material/Chat';
import DescriptionIcon from '@mui/icons-material/Description';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import PendingIcon from '@mui/icons-material/Pending';
import { StatCard } from './StatCard';
import { ConversationMetricsChart } from './ConversationMetricsChart';
import { TopicDropOffChart } from './TopicDropOffChart';
import { format } from 'date-fns';

interface OrgAnalyticsDashboardProps {
  orgId: string;
  orgName?: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function OrgAnalyticsDashboard({ orgId, orgName }: OrgAnalyticsDashboardProps) {
  const [tabValue, setTabValue] = useState(0);
  const [days, setDays] = useState(30);

  const { data, error, isLoading, mutate } = useSWR(
    `/api/orgs/${orgId}/analytics?days=${days}`,
    fetcher,
    {
      refreshInterval: 60000, // Refresh every minute
    }
  );

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <NetPadLoader size="large" variant="ascii" message="Loading..." />
      </Box>
    );
  }

  if (error || !data?.success) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">{data?.error || error?.message || 'Failed to load analytics'}</Alert>
      </Box>
    );
  }

  const { analytics, organization } = data;
  const { conversations, submissions, combined } = analytics;

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            {orgName || organization?.name || 'Organization'} Analytics
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Performance metrics for the last {days} days
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={days}
              label="Time Range"
              onChange={(e) => setDays(e.target.value as number)}
            >
              <MenuItem value={7}>Last 7 days</MenuItem>
              <MenuItem value={30}>Last 30 days</MenuItem>
              <MenuItem value={90}>Last 90 days</MenuItem>
            </Select>
          </FormControl>
          <Tooltip title="Refresh data">
            <IconButton onClick={() => mutate()}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Overview Cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Interactions"
            value={combined.totalInteractions}
            subtitle="Conversations + Submissions"
            icon={<TrendingUpIcon />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Completed"
            value={combined.totalCompleted}
            subtitle={`${combined.overallCompletionRate}% completion rate`}
            icon={<CheckCircleIcon />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Conversations"
            value={conversations.totalConversations}
            subtitle={`${conversations.completionRate}% completed`}
            icon={<ChatIcon />}
            color="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Form Submissions"
            value={submissions.total}
            subtitle={`${submissions.syncRate}% synced`}
            icon={<DescriptionIcon />}
            color="primary"
          />
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab label="Overview" />
          <Tab label="Conversations" />
          <Tab label="Forms" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {tabValue === 0 && (
        <OverviewTab conversations={conversations} submissions={submissions} />
      )}
      {tabValue === 1 && (
        <ConversationsTab conversations={conversations} />
      )}
      {tabValue === 2 && (
        <FormsTab submissions={submissions} />
      )}
    </Box>
  );
}

function OverviewTab({ conversations, submissions }: { conversations: any; submissions: any }) {
  return (
    <Grid container spacing={3}>
      {/* Conversation Status */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 3 }}>
          <ConversationMetricsChart
            data={conversations.byStatus}
            title="Conversation Status Distribution"
          />
        </Paper>
      </Grid>

      {/* Key Metrics */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Conversation Metrics
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Avg. Completion
                </Typography>
                <Typography variant="h5">
                  {conversations.averageCompletionPercentage}%
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Avg. Turns
                </Typography>
                <Typography variant="h5">
                  {conversations.averageTurns}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Avg. Duration
                </Typography>
                <Typography variant="h5">
                  {formatDuration(conversations.averageDuration)}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Avg. Confidence
                </Typography>
                <Typography variant="h5">
                  {Math.round(conversations.averageConfidence * 100)}%
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Grid>

      {/* Topic Drop-off */}
      {conversations.topicDropOff && conversations.topicDropOff.length > 0 && (
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <TopicDropOffChart
              data={conversations.topicDropOff}
              title="Topic Drop-off Analysis"
            />
          </Paper>
        </Grid>
      )}
    </Grid>
  );
}

function ConversationsTab({ conversations }: { conversations: any }) {
  const recentConversations = conversations.recentConversations || [];

  return (
    <Grid container spacing={3}>
      {/* Status Cards */}
      <Grid item xs={12} sm={4}>
        <StatCard
          title="In Progress"
          value={conversations.byStatus.draft}
          icon={<PendingIcon />}
          color="info"
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <StatCard
          title="Completed"
          value={conversations.byStatus.submitted}
          icon={<CheckCircleIcon />}
          color="success"
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <StatCard
          title="Abandoned"
          value={conversations.byStatus.abandoned}
          icon={<CancelIcon />}
          color="error"
        />
      </Grid>

      {/* Recent Conversations Table */}
      <Grid item xs={12}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Recent Conversations
          </Typography>
          {recentConversations.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No recent conversations
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Completion</TableCell>
                    <TableCell>Turns</TableCell>
                    <TableCell>Duration</TableCell>
                    <TableCell>Topics</TableCell>
                    <TableCell>Updated</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentConversations.map((conv: any) => (
                    <TableRow key={conv.conversationId}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 11 }}>
                          {conv.conversationId.substring(0, 12)}...
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <StatusChip status={conv.status} />
                      </TableCell>
                      <TableCell>{conv.completionPercentage}%</TableCell>
                      <TableCell>{conv.turnCount}</TableCell>
                      <TableCell>{formatDuration(conv.duration)}</TableCell>
                      <TableCell>
                        {conv.topicsCovered}/{conv.totalTopics}
                      </TableCell>
                      <TableCell>
                        {format(new Date(conv.updatedAt), 'MMM d, h:mm a')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Grid>
    </Grid>
  );
}

function FormsTab({ submissions }: { submissions: any }) {
  return (
    <Grid container spacing={3}>
      {/* Status Cards */}
      <Grid item xs={12} sm={4}>
        <StatCard
          title="Total Submissions"
          value={submissions.total}
          icon={<DescriptionIcon />}
          color="primary"
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <StatCard
          title="Synced"
          value={submissions.synced}
          subtitle={`${submissions.syncRate}% sync rate`}
          icon={<CheckCircleIcon />}
          color="success"
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <StatCard
          title="Failed"
          value={submissions.failed}
          icon={<CancelIcon />}
          color="error"
        />
      </Grid>

      {/* Sync Status Overview */}
      <Grid item xs={12}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Submission Sync Status
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <Box
                sx={{
                  p: 2,
                  bgcolor: alpha('#2196f3', 0.1),
                  borderRadius: 1,
                  textAlign: 'center',
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  Pending
                </Typography>
                <Typography variant="h5">{submissions.pending}</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box
                sx={{
                  p: 2,
                  bgcolor: alpha('#00ED64', 0.1),
                  borderRadius: 1,
                  textAlign: 'center',
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  Synced
                </Typography>
                <Typography variant="h5">{submissions.synced}</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box
                sx={{
                  p: 2,
                  bgcolor: alpha('#f44336', 0.1),
                  borderRadius: 1,
                  textAlign: 'center',
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  Failed
                </Typography>
                <Typography variant="h5">{submissions.failed}</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box
                sx={{
                  p: 2,
                  bgcolor: alpha('#9e9e9e', 0.1),
                  borderRadius: 1,
                  textAlign: 'center',
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  Total
                </Typography>
                <Typography variant="h5">{submissions.total}</Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Grid>
    </Grid>
  );
}

function StatusChip({ status }: { status: string }) {
  const config = {
    draft: { label: 'In Progress', color: 'info' as const },
    submitted: { label: 'Completed', color: 'success' as const },
    abandoned: { label: 'Abandoned', color: 'error' as const },
  };

  const { label, color } = config[status as keyof typeof config] || { label: status, color: 'default' as const };

  return <Chip label={label} color={color} size="small" />;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}
