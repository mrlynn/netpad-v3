/**
 * Admin Waitlist Console
 *
 * Platform admins can review, approve, or reject waitlist applications.
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardActions,
  Divider,
  Stack,
  FormControlLabel,
  Checkbox,
  InputAdornment,
  Breadcrumbs,
  Link as MuiLink,
} from '@mui/material';
import Link from 'next/link';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
  HourglassTop as PendingIcon,
  Search as SearchIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Email as EmailIcon,
  NavigateNext as NavigateNextIcon,
} from '@mui/icons-material';
import { AppNavBar } from '@/components/Navigation/AppNavBar';
import { useAuth } from '@/contexts/AuthContext';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr';

type WaitlistStatus = 'pending' | 'approved' | 'rejected';

interface WaitlistEntry {
  userId: string;
  email: string;
  displayName?: string;
  waitlistStatus?: WaitlistStatus;
  waitlistMetadata?: {
    company?: string;
    useCase?: string;
    source?: string;
    referralCode?: string;
    notes?: string;
    appliedAt: string;
    reviewedAt?: string;
    reviewedBy?: string;
    rejectionReason?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface WaitlistStats {
  pending: number;
  approved: number;
  rejected: number;
  todaySignups: number;
  thisWeekSignups: number;
}

export default function AdminWaitlistPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [selectedStatus, setSelectedStatus] = useState<WaitlistStatus | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<WaitlistEntry | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [rejectionReason, setRejectionReason] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [reviewing, setReviewing] = useState(false);

  // Check admin access
  const isAdmin = user?.platformRole === 'admin';

  // Fetch waitlist entries
  const { data, error, isLoading, mutate } = useSWR<{
    entries: WaitlistEntry[];
    total: number;
  }>(
    isAdmin
      ? `/api/admin/waitlist?status=${selectedStatus}&search=${encodeURIComponent(searchQuery)}`
      : null,
    fetcher
  );

  // Fetch stats
  const { data: stats } = useSWR<WaitlistStats>(
    isAdmin ? '/api/admin/waitlist/stats' : null,
    fetcher
  );

  // Redirect if not admin
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/');
    }
  }, [authLoading, isAdmin, router]);

  const handleReview = (entry: WaitlistEntry, action: 'approve' | 'reject') => {
    setSelectedUser(entry);
    setReviewAction(action);
    setRejectionReason('');
    setSendEmail(true);
    setReviewDialogOpen(true);
  };

  const handleConfirmReview = async () => {
    if (!selectedUser) return;

    if (reviewAction === 'reject' && !rejectionReason.trim()) {
      return;
    }

    setReviewing(true);
    try {
      const response = await fetch(`/api/admin/waitlist/${selectedUser.userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: reviewAction,
          reason: reviewAction === 'reject' ? rejectionReason : undefined,
          sendEmail,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update user');
      }

      // Refresh the list
      await mutate();
      setReviewDialogOpen(false);
      setSelectedUser(null);
      setRejectionReason('');
    } catch (error: any) {
      console.error('Review error:', error);
      alert(error.message || 'Failed to update user');
    } finally {
      setReviewing(false);
    }
  };

  const getStatusColor = (status?: WaitlistStatus) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status?: WaitlistStatus) => {
    switch (status) {
      case 'pending':
        return <PendingIcon />;
      case 'approved':
        return <CheckCircleIcon />;
      case 'rejected':
        return <CancelIcon />;
      default:
        return undefined;
    }
  };

  if (authLoading) {
    return (
      <>
        <AppNavBar />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
          <CircularProgress />
        </Box>
      </>
    );
  }

  if (!isAdmin) {
    return (
      <>
        <AppNavBar />
        <Container maxWidth="md" sx={{ mt: 4 }}>
          <Alert severity="error">Access denied. Admin privileges required.</Alert>
        </Container>
      </>
    );
  }

  const entries = data?.entries || [];

  return (
    <>
      <AppNavBar />
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        {/* Breadcrumb Navigation */}
        <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 2 }}>
          <MuiLink component={Link} href="/admin" color="inherit" underline="hover">
            Admin Dashboard
          </MuiLink>
          <Typography color="text.primary">Waitlist Management</Typography>
        </Breadcrumbs>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" fontWeight={600}>
            Waitlist Management
          </Typography>
          <Button
            startIcon={<RefreshIcon />}
            onClick={() => mutate()}
            disabled={isLoading}
            variant="outlined"
          >
            Refresh
          </Button>
        </Box>

        {/* Stats Summary */}
        {stats && (
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <Paper sx={{ p: 2, minWidth: 120 }}>
              <Typography variant="caption" color="text.secondary">Pending</Typography>
              <Typography variant="h5" fontWeight={600} color="warning.main">
                {stats.pending}
              </Typography>
            </Paper>
            <Paper sx={{ p: 2, minWidth: 120 }}>
              <Typography variant="caption" color="text.secondary">Approved</Typography>
              <Typography variant="h5" fontWeight={600} color="success.main">
                {stats.approved}
              </Typography>
            </Paper>
            <Paper sx={{ p: 2, minWidth: 120 }}>
              <Typography variant="caption" color="text.secondary">Rejected</Typography>
              <Typography variant="h5" fontWeight={600} color="error.main">
                {stats.rejected}
              </Typography>
            </Paper>
            <Paper sx={{ p: 2, minWidth: 120 }}>
              <Typography variant="caption" color="text.secondary">Today</Typography>
              <Typography variant="h5" fontWeight={600}>
                {stats.todaySignups}
              </Typography>
            </Paper>
            <Paper sx={{ p: 2, minWidth: 120 }}>
              <Typography variant="caption" color="text.secondary">This Week</Typography>
              <Typography variant="h5" fontWeight={600}>
                {stats.thisWeekSignups}
              </Typography>
            </Paper>
          </Box>
        )}

        {/* Search */}
        <Paper sx={{ mb: 3, p: 2 }}>
          <TextField
            fullWidth
            placeholder="Search by email, name, or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            size="small"
          />
        </Paper>

        {/* Status Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={selectedStatus}
            onChange={(_, newValue) => setSelectedStatus(newValue)}
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PendingIcon fontSize="small" />
                  Pending
                  {stats && stats.pending > 0 && (
                    <Chip label={stats.pending} size="small" color="warning" sx={{ ml: 0.5 }} />
                  )}
                </Box>
              }
              value="pending"
            />
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircleIcon fontSize="small" />
                  Approved
                </Box>
              }
              value="approved"
            />
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CancelIcon fontSize="small" />
                  Rejected
                </Box>
              }
              value="rejected"
            />
            <Tab label="All" value="all" />
          </Tabs>
        </Paper>

        {/* Entries List */}
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">Failed to load waitlist: {error.message}</Alert>
        ) : entries.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              No {selectedStatus === 'all' ? '' : selectedStatus} entries found.
            </Typography>
          </Paper>
        ) : (
          <Stack spacing={2}>
            {entries.map((entry) => (
              <Card key={entry.userId} variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="h6">
                          {entry.displayName || entry.email}
                        </Typography>
                        {entry.waitlistStatus && (
                          <Chip
                            icon={getStatusIcon(entry.waitlistStatus)}
                            label={entry.waitlistStatus}
                            color={getStatusColor(entry.waitlistStatus) as any}
                            size="small"
                          />
                        )}
                      </Box>

                      <Box sx={{ display: 'flex', gap: 3, mt: 1, flexWrap: 'wrap' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <EmailIcon fontSize="small" color="disabled" />
                          <Typography variant="body2" color="text.secondary">
                            {entry.email}
                          </Typography>
                        </Box>

                        {entry.waitlistMetadata?.company && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <BusinessIcon fontSize="small" color="disabled" />
                            <Typography variant="body2" color="text.secondary">
                              {entry.waitlistMetadata.company}
                            </Typography>
                          </Box>
                        )}

                        {entry.waitlistMetadata?.source && (
                          <Typography variant="caption" color="text.secondary">
                            Source: {entry.waitlistMetadata.source}
                          </Typography>
                        )}
                      </Box>

                      {entry.waitlistMetadata?.useCase && (
                        <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                          <Typography variant="caption" color="text.secondary" fontWeight={600}>
                            Use Case:
                          </Typography>
                          <Typography variant="body2" sx={{ mt: 0.5 }}>
                            {entry.waitlistMetadata.useCase}
                          </Typography>
                        </Box>
                      )}

                      {entry.waitlistMetadata?.rejectionReason && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                          <Typography variant="subtitle2" fontWeight={600}>
                            Rejection Reason:
                          </Typography>
                          {entry.waitlistMetadata.rejectionReason}
                        </Alert>
                      )}

                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                        Applied: {entry.waitlistMetadata?.appliedAt
                          ? new Date(entry.waitlistMetadata.appliedAt).toLocaleString()
                          : new Date(entry.createdAt).toLocaleString()}
                        {entry.waitlistMetadata?.reviewedAt &&
                          ` | Reviewed: ${new Date(entry.waitlistMetadata.reviewedAt).toLocaleString()}`}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
                {entry.waitlistStatus === 'pending' && (
                  <>
                    <Divider />
                    <CardActions sx={{ justifyContent: 'flex-end', gap: 1 }}>
                      <Button
                        startIcon={<CheckCircleIcon />}
                        variant="contained"
                        color="success"
                        onClick={() => handleReview(entry, 'approve')}
                      >
                        Approve
                      </Button>
                      <Button
                        startIcon={<CancelIcon />}
                        variant="contained"
                        color="error"
                        onClick={() => handleReview(entry, 'reject')}
                      >
                        Reject
                      </Button>
                    </CardActions>
                  </>
                )}
              </Card>
            ))}
          </Stack>
        )}

        {/* Review Dialog */}
        <Dialog open={reviewDialogOpen} onClose={() => !reviewing && setReviewDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            {reviewAction === 'approve' ? 'Approve User' : 'Reject User'}
          </DialogTitle>
          <DialogContent>
            {selectedUser && (
              <Box>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  <strong>{selectedUser.displayName || selectedUser.email}</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {selectedUser.email}
                </Typography>

                {reviewAction === 'reject' && (
                  <TextField
                    label="Rejection Reason"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    fullWidth
                    multiline
                    rows={4}
                    required
                    helperText="Please provide a reason for rejection."
                    sx={{ mt: 2 }}
                  />
                )}

                {reviewAction === 'approve' && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    This user will be granted full access to the platform.
                  </Alert>
                )}

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={sendEmail}
                      onChange={(e) => setSendEmail(e.target.checked)}
                    />
                  }
                  label="Send email notification"
                  sx={{ mt: 2, display: 'block' }}
                />
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setReviewDialogOpen(false)} disabled={reviewing}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmReview}
              variant="contained"
              color={reviewAction === 'approve' ? 'success' : 'error'}
              disabled={reviewing || (reviewAction === 'reject' && !rejectionReason.trim())}
            >
              {reviewing ? <CircularProgress size={20} /> : reviewAction === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </>
  );
}
