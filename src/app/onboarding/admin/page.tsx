'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Skeleton,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
} from '@mui/material';
import {
  Inbox as InboxIcon,
  CheckCircle as CheckCircleIcon,
  HourglassEmpty as HourglassIcon,
  Cancel as CancelIcon,
  TrendingUp as TrendingUpIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import { OnboardingSubmission, OnboardingStatus, STATUS_CONFIG, getSubmissionDisplayName } from '@/types/onboarding';
import { useBranding } from '@/contexts/OnboardingBrandingContext';

interface DashboardStats {
  total: number;
  submitted: number;
  underReview: number;
  approved: number;
  rejected: number;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { branding } = useBranding();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentSubmissions, setRecentSubmissions] = useState<OnboardingSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Fetch recent submissions
      const response = await fetch('/api/onboarding/submissions?pageSize=5&sortBy=submittedAt&sortOrder=desc');
      const data = await response.json();

      if (data.success) {
        setRecentSubmissions(data.submissions);

        // Calculate stats from all submissions
        const allResponse = await fetch('/api/onboarding/submissions?pageSize=1000');
        const allData = await allResponse.json();

        if (allData.success) {
          const submissions = allData.submissions as OnboardingSubmission[];
          setStats({
            total: submissions.length,
            submitted: submissions.filter((s) => s.status === 'submitted').length,
            underReview: submissions.filter((s) => s.status === 'under_review').length,
            approved: submissions.filter((s) => s.status === 'approved').length,
            rejected: submissions.filter((s) => s.status === 'rejected').length,
          });
        }
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const StatCard = ({
    title,
    value,
    icon,
    color,
  }: {
    title: string;
    value: number | undefined;
    icon: React.ReactNode;
    color: string;
  }) => (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            {loading ? (
              <Skeleton variant="text" width={60} height={40} />
            ) : (
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {value ?? 0}
              </Typography>
            )}
          </Box>
          <Avatar
            sx={{
              width: 48,
              height: 48,
              bgcolor: color,
              color: '#fff',
            }}
          >
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Welcome to the {branding.companyName} Onboarding Admin
        </Typography>
      </Box>

      {/* Stats Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Submissions"
            value={stats?.total}
            icon={<InboxIcon />}
            color="#1976d2"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Pending Review"
            value={(stats?.submitted ?? 0) + (stats?.underReview ?? 0)}
            icon={<HourglassIcon />}
            color="#f57c00"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Approved"
            value={stats?.approved}
            icon={<CheckCircleIcon />}
            color="#388e3c"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Rejected"
            value={stats?.rejected}
            icon={<CancelIcon />}
            color="#d32f2f"
          />
        </Grid>
      </Grid>

      {/* Recent Submissions */}
      <Card
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <CardContent>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 2,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Recent Submissions
            </Typography>
            <Button
              endIcon={<OpenInNewIcon />}
              onClick={() => router.push('/onboarding/admin/submissions')}
            >
              View All
            </Button>
          </Box>

          {loading ? (
            <Box sx={{ p: 2 }}>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} variant="rectangular" height={60} sx={{ mb: 1, borderRadius: 1 }} />
              ))}
            </Box>
          ) : recentSubmissions.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <InboxIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography color="text.secondary">No submissions yet</Typography>
              <Typography variant="body2" color="text.secondary">
                Submissions will appear here once employees complete the onboarding form.
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Submitted</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentSubmissions.map((submission) => {
                    const statusConfig = STATUS_CONFIG[submission.status];
                    return (
                      <TableRow
                        key={submission.submissionId}
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() =>
                          router.push(`/onboarding/admin/submissions/${submission.submissionId}`)
                        }
                      >
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {getSubmissionDisplayName(submission.data)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {submission.data.email}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={statusConfig.label}
                            size="small"
                            sx={{
                              bgcolor: statusConfig.bgColor,
                              color: statusConfig.color,
                              fontWeight: 500,
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {formatDate(submission.submittedAt)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Button size="small">View</Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
