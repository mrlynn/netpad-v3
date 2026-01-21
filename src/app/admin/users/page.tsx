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
  Collapse,
  alpha,
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
  Storage as StorageIcon,
  Apps as AppsIcon,
  Description as FormIcon,
  CloudDone as CloudDoneIcon,
  CloudOff as CloudOffIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Visibility as ViewAsIcon,
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

interface OrgSummary {
  orgId: string;
  name: string;
  slug: string;
  role: string;
  hasCluster: boolean;
  clusterStatus?: string;
  applicationCount: number;
  formCount: number;
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
  organizations: OrgSummary[];
  totalApplications: number;
  totalForms: number;
  hasCluster: boolean;
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
  const [actionDialog, setActionDialog] = useState<'role' | 'waitlist' | 'delete' | 'impersonate' | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Expanded state for org details
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

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

  const handleOpenImpersonateDialog = (userEntry: UserEntry) => {
    setSelectedUser(userEntry);
    setActionDialog('impersonate');
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

  const handleImpersonate = async () => {
    if (!selectedUser) return;
    setActionLoading(true);

    try {
      const response = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUser.userId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start impersonation');
      }

      // Reload the page to refresh session and show the impersonation banner
      window.location.href = '/';
    } catch (error: any) {
      alert(error.message);
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
            <Stack spacing={1}>
              {users.map((userEntry) => {
                const isExpanded = expandedUsers.has(userEntry.userId);
                const toggleExpanded = () => {
                  const newSet = new Set(expandedUsers);
                  if (isExpanded) {
                    newSet.delete(userEntry.userId);
                  } else {
                    newSet.add(userEntry.userId);
                  }
                  setExpandedUsers(newSet);
                };

                return (
                  <Card key={userEntry.userId} variant="outlined" sx={{ overflow: 'visible' }}>
                    <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                      {/* Main user row */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {/* Avatar */}
                        <Avatar
                          src={userEntry.avatarUrl}
                          sx={{ width: 40, height: 40, flexShrink: 0 }}
                        >
                          {userEntry.displayName?.[0] || userEntry.email[0].toUpperCase()}
                        </Avatar>

                        {/* User info - primary column */}
                        <Box sx={{ minWidth: 200, flex: '0 0 auto' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography variant="body1" fontWeight={600} noWrap>
                              {userEntry.displayName || userEntry.email.split('@')[0]}
                            </Typography>
                            {userEntry.emailVerified && (
                              <Tooltip title="Email verified">
                                <VerifiedIcon sx={{ fontSize: 16 }} color="primary" />
                              </Tooltip>
                            )}
                            {getRoleChip(userEntry.platformRole)}
                            {getWaitlistChip(userEntry.waitlistStatus)}
                          </Box>
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {userEntry.email}
                          </Typography>
                        </Box>

                        {/* Stats - compact chips */}
                        <Box sx={{ display: 'flex', gap: 1, flex: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                          {/* Orgs with expand */}
                          {userEntry.organizationCount > 0 && (
                            <Chip
                              icon={<BusinessIcon sx={{ fontSize: '16px !important' }} />}
                              label={`${userEntry.organizationCount} org${userEntry.organizationCount > 1 ? 's' : ''}`}
                              size="small"
                              variant="outlined"
                              onClick={toggleExpanded}
                              onDelete={toggleExpanded}
                              deleteIcon={isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                              sx={{ cursor: 'pointer' }}
                            />
                          )}

                          {/* Cluster status */}
                          {userEntry.hasCluster ? (
                            <Tooltip title="Has database cluster">
                              <Chip
                                icon={<CloudDoneIcon sx={{ fontSize: '16px !important' }} />}
                                label="DB"
                                size="small"
                                color="success"
                                variant="outlined"
                              />
                            </Tooltip>
                          ) : userEntry.organizationCount > 0 ? (
                            <Tooltip title="No database cluster">
                              <Chip
                                icon={<CloudOffIcon sx={{ fontSize: '16px !important' }} />}
                                label="No DB"
                                size="small"
                                color="default"
                                variant="outlined"
                                sx={{ opacity: 0.6 }}
                              />
                            </Tooltip>
                          ) : null}

                          {/* Apps */}
                          {userEntry.totalApplications > 0 && (
                            <Chip
                              icon={<AppsIcon sx={{ fontSize: '16px !important' }} />}
                              label={`${userEntry.totalApplications} app${userEntry.totalApplications > 1 ? 's' : ''}`}
                              size="small"
                              variant="outlined"
                            />
                          )}

                          {/* Forms */}
                          {userEntry.totalForms > 0 && (
                            <Chip
                              icon={<FormIcon sx={{ fontSize: '16px !important' }} />}
                              label={`${userEntry.totalForms} form${userEntry.totalForms > 1 ? 's' : ''}`}
                              size="small"
                              variant="outlined"
                            />
                          )}

                          {/* Passkeys */}
                          {userEntry.passkeyCount > 0 && (
                            <Chip
                              icon={<KeyIcon sx={{ fontSize: '16px !important' }} />}
                              label={userEntry.passkeyCount}
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Box>

                        {/* Dates */}
                        <Box sx={{ minWidth: 140, textAlign: 'right', flexShrink: 0 }}>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Joined: {new Date(userEntry.createdAt).toLocaleDateString()}
                          </Typography>
                          {userEntry.lastLoginAt && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              Last login: {new Date(userEntry.lastLoginAt).toLocaleDateString()}
                            </Typography>
                          )}
                        </Box>

                        {/* Actions */}
                        <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                          <Tooltip title="View as this user">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleOpenImpersonateDialog(userEntry)}
                              disabled={userEntry.userId === user?.userId}
                            >
                              <ViewAsIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Change role">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenRoleDialog(userEntry)}
                            >
                              <AdminIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Manage waitlist">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenWaitlistDialog(userEntry)}
                            >
                              <PendingIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete user">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleOpenDeleteDialog(userEntry)}
                              disabled={userEntry.platformRole === 'admin'}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>

                      {/* Expanded org details */}
                      <Collapse in={isExpanded}>
                        <Box sx={{ mt: 2, ml: 7 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mb: 1, display: 'block' }}>
                            Organizations
                          </Typography>
                          <Stack spacing={0.5}>
                            {userEntry.organizations.map((org) => (
                              <Box
                                key={org.orgId}
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 2,
                                  py: 0.75,
                                  px: 1.5,
                                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
                                  borderRadius: 1,
                                }}
                              >
                                <Typography variant="body2" fontWeight={500} sx={{ minWidth: 150 }}>
                                  {org.name}
                                </Typography>
                                <Chip
                                  label={org.role}
                                  size="small"
                                  color={org.role === 'owner' ? 'primary' : org.role === 'admin' ? 'secondary' : 'default'}
                                  sx={{ fontSize: '0.7rem', height: 20 }}
                                />
                                {org.hasCluster ? (
                                  <Chip
                                    icon={<CloudDoneIcon sx={{ fontSize: '14px !important' }} />}
                                    label={org.clusterStatus || 'ready'}
                                    size="small"
                                    color={org.clusterStatus === 'ready' ? 'success' : 'warning'}
                                    variant="outlined"
                                    sx={{ fontSize: '0.7rem', height: 20 }}
                                  />
                                ) : (
                                  <Typography variant="caption" color="text.disabled">
                                    No cluster
                                  </Typography>
                                )}
                                <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
                                  <Typography variant="caption" color="text.secondary">
                                    {org.applicationCount} app{org.applicationCount !== 1 ? 's' : ''}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {org.formCount} form{org.formCount !== 1 ? 's' : ''}
                                  </Typography>
                                </Box>
                              </Box>
                            ))}
                          </Stack>
                        </Box>
                      </Collapse>
                    </CardContent>
                  </Card>
                );
              })}
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

        {/* Impersonate Dialog */}
        <Dialog open={actionDialog === 'impersonate'} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>View as User</DialogTitle>
          <DialogContent>
            {selectedUser && (
              <Box sx={{ mt: 1 }}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  You are about to view the platform as <strong>{selectedUser.displayName || selectedUser.email}</strong>.
                  <br /><br />
                  This will let you see exactly what this user sees, including their organizations, applications, and forms.
                </Alert>
                <Typography variant="body2" color="text.secondary">
                  <strong>User:</strong> {selectedUser.email}
                </Typography>
                {selectedUser.organizationCount > 0 && (
                  <Typography variant="body2" color="text.secondary">
                    <strong>Organizations:</strong> {selectedUser.organizationCount}
                  </Typography>
                )}
                {selectedUser.totalApplications > 0 && (
                  <Typography variant="body2" color="text.secondary">
                    <strong>Applications:</strong> {selectedUser.totalApplications}
                  </Typography>
                )}
                <Alert severity="warning" sx={{ mt: 2 }}>
                  A banner will appear at the top of the screen while viewing as this user.
                  Click "End Impersonation" to return to your admin account.
                </Alert>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog} disabled={actionLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleImpersonate}
              variant="contained"
              color="primary"
              startIcon={actionLoading ? <CircularProgress size={16} color="inherit" /> : <ViewAsIcon />}
              disabled={actionLoading}
            >
              {actionLoading ? 'Starting...' : 'View as User'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </>
  );
}
