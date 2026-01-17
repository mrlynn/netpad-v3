/**
 * Admin User Management Console
 *
 * Platform admins can view, search, and manage all users.
 * Includes waitlist status management, role assignment, and user details.
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
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Avatar,
  Grid,
  TablePagination,
  Breadcrumbs,
  Link as MuiLink,
} from '@mui/material';
import Link from 'next/link';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Person as PersonIcon,
  AdminPanelSettings as AdminIcon,
  Support as SupportIcon,
  HourglassEmpty as PendingIcon,
  Verified as VerifiedIcon,
  Email as EmailIcon,
  Key as KeyIcon,
  Devices as DevicesIcon,
  Business as BusinessIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreIcon,
  NavigateNext as NavigateNextIcon,
} from '@mui/icons-material';
import { AppNavBar } from '@/components/Navigation/AppNavBar';
import { useAuth } from '@/contexts/AuthContext';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr';

interface UserStats {
  total: number;
  verified: number;
  unverified: number;
  roles: {
    admin: number;
    support: number;
    regular: number;
  };
  waitlist: {
    pending: number;
    approved: number;
    rejected: number;
    none: number;
  };
  auth: {
    withPasskeys: number;
    withOAuth: number;
  };
  activity: {
    todaySignups: number;
    thisWeekSignups: number;
    activeToday: number;
    activeThisWeek: number;
  };
}

interface UserEntry {
  userId: string;
  email: string;
  emailVerified: boolean;
  displayName?: string;
  avatarUrl?: string;
  platformRole: 'admin' | 'support' | null;
  waitlistStatus: 'pending' | 'approved' | 'rejected' | null;
  waitlistMetadata?: {
    company?: string;
    useCase?: string;
    appliedAt?: string;
    notes?: string;
  };
  organizationCount: number;
  oauthConnectionCount: number;
  passkeyCount: number;
  trustedDeviceCount: number;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

type FilterTab = 'all' | 'pending' | 'approved' | 'admins';

export default function AdminUsersPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Filters
  const [tab, setTab] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Dialogs
  const [selectedUser, setSelectedUser] = useState<UserEntry | null>(null);
  const [actionDialog, setActionDialog] = useState<'role' | 'waitlist' | 'delete' | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Action form state
  const [newRole, setNewRole] = useState<string>('none');
  const [waitlistAction, setWaitlistAction] = useState<string>('approve');
  const [rejectionReason, setRejectionReason] = useState('');

  // Check admin access
  const isAdmin = user?.platformRole === 'admin';

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [tab, debouncedSearch]);

  // Build API URL
  const buildApiUrl = () => {
    const params = new URLSearchParams();
    params.set('limit', rowsPerPage.toString());
    params.set('offset', (page * rowsPerPage).toString());

    if (debouncedSearch) {
      params.set('search', debouncedSearch);
    }

    if (tab === 'pending') {
      params.set('waitlistStatus', 'pending');
    } else if (tab === 'approved') {
      params.set('waitlistStatus', 'approved');
    } else if (tab === 'admins') {
      params.set('platformRole', 'admin');
    }

    return `/api/admin/users?${params.toString()}`;
  };

  // Fetch users
  const {
    data: usersData,
    error: usersError,
    isLoading: usersLoading,
    mutate: mutateUsers,
  } = useSWR<{ users: UserEntry[]; total: number }>(
    isAdmin ? buildApiUrl() : null,
    fetcher
  );

  // Fetch stats
  const { data: stats, mutate: mutateStats } = useSWR<UserStats>(
    isAdmin ? '/api/admin/users/stats' : null,
    fetcher
  );

  // Redirect if not admin
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/');
    }
  }, [authLoading, isAdmin, router]);

  const handleOpenRoleDialog = (userEntry: UserEntry) => {
    setSelectedUser(userEntry);
    setNewRole(userEntry.platformRole || 'none');
    setActionDialog('role');
  };

  const handleOpenWaitlistDialog = (userEntry: UserEntry) => {
    setSelectedUser(userEntry);
    setWaitlistAction('approve');
    setRejectionReason('');
    setActionDialog('waitlist');
  };

  const handleOpenDeleteDialog = (userEntry: UserEntry) => {
    setSelectedUser(userEntry);
    setActionDialog('delete');
  };

  const handleCloseDialog = () => {
    setActionDialog(null);
    setSelectedUser(null);
    setRejectionReason('');
  };

  const handleUpdateRole = async () => {
    if (!selectedUser) return;
    setActionLoading(true);

    try {
      const response = await fetch(`/api/admin/users/${selectedUser.userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'setPlatformRole',
          platformRole: newRole === 'none' ? null : newRole,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update role');
      }

      await mutateUsers();
      await mutateStats();
      handleCloseDialog();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateWaitlist = async () => {
    if (!selectedUser) return;
    setActionLoading(true);

    try {
      const response = await fetch(`/api/admin/users/${selectedUser.userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'setWaitlistStatus',
          waitlistAction,
          rejectionReason: waitlistAction === 'reject' ? rejectionReason : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update waitlist status');
      }

      await mutateUsers();
      await mutateStats();
      handleCloseDialog();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setActionLoading(true);

    try {
      const response = await fetch(`/api/admin/users/${selectedUser.userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete user');
      }

      await mutateUsers();
      await mutateStats();
      handleCloseDialog();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const getWaitlistChip = (status: string | null) => {
    if (!status) return null;
    switch (status) {
      case 'pending':
        return <Chip icon={<PendingIcon fontSize="small" />} label="pending" color="warning" size="small" />;
      case 'approved':
        return <Chip icon={<CheckCircleIcon fontSize="small" />} label="approved" color="success" size="small" />;
      case 'rejected':
        return <Chip icon={<CancelIcon fontSize="small" />} label="rejected" color="error" size="small" />;
      default:
        return null;
    }
  };

  const getRoleChip = (role: string | null) => {
    if (!role) return null;
    switch (role) {
      case 'admin':
        return <Chip icon={<AdminIcon fontSize="small" />} label="admin" color="primary" size="small" sx={{ fontWeight: 600 }} />;
      case 'support':
        return <Chip icon={<SupportIcon fontSize="small" />} label="support" color="secondary" size="small" sx={{ fontWeight: 600 }} />;
      default:
        return null;
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

  const users = usersData?.users || [];
  const total = usersData?.total || 0;

  return (
    <>
      <AppNavBar />
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        {/* Breadcrumb Navigation */}
        <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 2 }}>
          <MuiLink component={Link} href="/admin" color="inherit" underline="hover">
            Admin Dashboard
          </MuiLink>
          <Typography color="text.primary">User Management</Typography>
        </Breadcrumbs>

        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" fontWeight={600}>
            User Management
          </Typography>
          <Button
            startIcon={<RefreshIcon />}
            onClick={() => {
              mutateUsers();
              mutateStats();
            }}
            variant="outlined"
          >
            Refresh
          </Button>
        </Box>

        {/* Stats Cards */}
        {stats && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" fontWeight={700} color="primary">
                  {stats.total}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Users
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" fontWeight={700} color="warning.main">
                  {stats.waitlist.pending}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Pending Waitlist
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" fontWeight={700} color="success.main">
                  {stats.activity.activeThisWeek}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Active This Week
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" fontWeight={700} color="info.main">
                  {stats.activity.thisWeekSignups}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  New This Week
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        )}

        {/* Filters */}
        <Paper sx={{ mb: 3 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)}>
              <Tab
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    All Users
                    {stats && <Chip label={stats.total} size="small" />}
                  </Box>
                }
                value="all"
              />
              <Tab
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PendingIcon fontSize="small" />
                    Pending
                    {stats && stats.waitlist.pending > 0 && (
                      <Chip label={stats.waitlist.pending} size="small" color="warning" />
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
                    <AdminIcon fontSize="small" />
                    Admins
                  </Box>
                }
                value="admins"
              />
            </Tabs>
          </Box>
          <Box sx={{ p: 2 }}>
            <TextField
              fullWidth
              placeholder="Search by email, name, or company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              size="small"
            />
          </Box>
        </Paper>

        {/* User List */}
        {usersLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : usersError ? (
          <Alert severity="error">Failed to load users: {usersError.message}</Alert>
        ) : users.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">No users found.</Typography>
          </Paper>
        ) : (
          <>
            <Stack spacing={2}>
              {users.map((userEntry) => (
                <Card key={userEntry.userId} variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <Box sx={{ display: 'flex', gap: 2, alignItems: 'start', flex: 1 }}>
                        <Avatar
                          src={userEntry.avatarUrl}
                          sx={{ width: 48, height: 48 }}
                        >
                          {userEntry.displayName?.[0] || userEntry.email[0].toUpperCase()}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Typography variant="subtitle1" fontWeight={600}>
                              {userEntry.displayName || userEntry.email}
                            </Typography>
                            {userEntry.emailVerified && (
                              <Tooltip title="Email verified">
                                <VerifiedIcon fontSize="small" color="primary" />
                              </Tooltip>
                            )}
                            {getRoleChip(userEntry.platformRole)}
                            {getWaitlistChip(userEntry.waitlistStatus)}
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            {userEntry.email}
                          </Typography>
                          {userEntry.waitlistMetadata?.company && (
                            <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                              <BusinessIcon fontSize="small" />
                              {userEntry.waitlistMetadata.company}
                            </Typography>
                          )}
                          <Box sx={{ display: 'flex', gap: 2, mt: 1, flexWrap: 'wrap' }}>
                            <Typography variant="caption" color="text.secondary">
                              Joined: {new Date(userEntry.createdAt).toLocaleDateString()}
                            </Typography>
                            {userEntry.lastLoginAt && (
                              <Typography variant="caption" color="text.secondary">
                                Last login: {new Date(userEntry.lastLoginAt).toLocaleDateString()}
                              </Typography>
                            )}
                            {userEntry.organizationCount > 0 && (
                              <Chip
                                icon={<BusinessIcon />}
                                label={`${userEntry.organizationCount} org${userEntry.organizationCount > 1 ? 's' : ''}`}
                                size="small"
                                variant="outlined"
                              />
                            )}
                            {userEntry.passkeyCount > 0 && (
                              <Chip
                                icon={<KeyIcon />}
                                label={`${userEntry.passkeyCount} passkey${userEntry.passkeyCount > 1 ? 's' : ''}`}
                                size="small"
                                variant="outlined"
                              />
                            )}
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                  </CardContent>
                  <Divider />
                  <CardActions sx={{ justifyContent: 'flex-end', gap: 1 }}>
                    <Button
                      size="small"
                      startIcon={<AdminIcon />}
                      onClick={() => handleOpenRoleDialog(userEntry)}
                    >
                      Role
                    </Button>
                    <Button
                      size="small"
                      startIcon={<PendingIcon />}
                      onClick={() => handleOpenWaitlistDialog(userEntry)}
                    >
                      Waitlist
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={() => handleOpenDeleteDialog(userEntry)}
                      disabled={userEntry.platformRole === 'admin'}
                    >
                      Delete
                    </Button>
                  </CardActions>
                </Card>
              ))}
            </Stack>

            {/* Pagination */}
            <TablePagination
              component="div"
              count={total}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[10, 25, 50, 100]}
            />
          </>
        )}

        {/* Role Dialog */}
        <Dialog open={actionDialog === 'role'} onClose={handleCloseDialog} maxWidth="xs" fullWidth>
          <DialogTitle>Change Platform Role</DialogTitle>
          <DialogContent>
            {selectedUser && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  User: <strong>{selectedUser.email}</strong>
                </Typography>
                <FormControl fullWidth>
                  <InputLabel>Platform Role</InputLabel>
                  <Select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    label="Platform Role"
                  >
                    <MenuItem value="none">No special role</MenuItem>
                    <MenuItem value="support">Support</MenuItem>
                    <MenuItem value="admin">Admin</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog} disabled={actionLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateRole}
              variant="contained"
              disabled={actionLoading}
            >
              {actionLoading ? <CircularProgress size={20} /> : 'Update Role'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Waitlist Dialog */}
        <Dialog open={actionDialog === 'waitlist'} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>Change Waitlist Status</DialogTitle>
          <DialogContent>
            {selectedUser && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  User: <strong>{selectedUser.email}</strong>
                  <br />
                  Current status: {selectedUser.waitlistStatus || 'None'}
                </Typography>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Action</InputLabel>
                  <Select
                    value={waitlistAction}
                    onChange={(e) => setWaitlistAction(e.target.value)}
                    label="Action"
                  >
                    <MenuItem value="approve">Approve (send welcome email)</MenuItem>
                    <MenuItem value="reject">Reject</MenuItem>
                    <MenuItem value="pending">Set to Pending</MenuItem>
                    <MenuItem value="clear">Clear waitlist status</MenuItem>
                  </Select>
                </FormControl>
                {waitlistAction === 'reject' && (
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Rejection Reason"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    helperText="Optional - will be included in rejection email"
                  />
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog} disabled={actionLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateWaitlist}
              variant="contained"
              color={waitlistAction === 'reject' ? 'error' : 'primary'}
              disabled={actionLoading}
            >
              {actionLoading ? <CircularProgress size={20} /> : 'Update Status'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={actionDialog === 'delete'} onClose={handleCloseDialog} maxWidth="xs" fullWidth>
          <DialogTitle>Delete User</DialogTitle>
          <DialogContent>
            {selectedUser && (
              <Alert severity="error" sx={{ mt: 1 }}>
                Are you sure you want to permanently delete{' '}
                <strong>{selectedUser.email}</strong>?
                <br />
                <br />
                This action cannot be undone.
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog} disabled={actionLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleDeleteUser}
              variant="contained"
              color="error"
              disabled={actionLoading}
            >
              {actionLoading ? <CircularProgress size={20} /> : 'Delete User'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </>
  );
}
