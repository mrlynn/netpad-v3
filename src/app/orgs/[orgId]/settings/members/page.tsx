'use client';

/**
 * Organization Members Management
 * 
 * List, invite, update, and remove organization members.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  FormControl,
  InputLabel,
  Alert,
  Chip,
  Avatar,
  Skeleton,
  InputAdornment,
  Tooltip,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreIcon,
  Search as SearchIcon,
  PersonAdd as InviteIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Mail as MailIcon,
  Security as SecurityIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';

interface OrgMember {
  userId: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joinedAt: string;
  lastLoginAt?: string;
}

interface Invitation {
  invitationId: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  expiresAt: string;
}

interface PermissionSource {
  type: 'builtin' | 'group' | 'custom';
  sourceId: string;
  sourceName: string;
  permissions: string[];
}

interface EffectivePermissions {
  userId: string;
  permissions: string[];
  sources: PermissionSource[];
}

const ROLE_COLORS: Record<string, 'error' | 'warning' | 'success' | 'info'> = {
  owner: 'error',
  admin: 'warning',
  member: 'success',
  viewer: 'info',
};

export default function MembersPage() {
  const params = useParams();
  const theme = useTheme();
  const orgId = params.orgId as string;

  // State
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog states
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<OrgMember | null>(null);
  const [memberPermissions, setMemberPermissions] = useState<EffectivePermissions | null>(null);
  const [loadingPermissions, setLoadingPermissions] = useState(false);

  // Menu state
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuMember, setMenuMember] = useState<OrgMember | null>(null);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<string>('member');
  const [inviting, setInviting] = useState(false);

  // Edit form
  const [editRole, setEditRole] = useState<string>('member');
  const [updating, setUpdating] = useState(false);

  // Fetch members
  const fetchMembers = useCallback(async () => {
    try {
      const response = await fetch(`/api/platform/orgs/${orgId}/members`);
      if (!response.ok) throw new Error('Failed to fetch members');
      const data = await response.json();
      setMembers(data.members || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [orgId]);

  // Fetch invitations
  const fetchInvitations = useCallback(async () => {
    try {
      const response = await fetch(`/api/platform/orgs/${orgId}/invitations`);
      if (!response.ok) return; // May not exist yet
      const data = await response.json();
      setInvitations(data.invitations || []);
    } catch {
      // Invitations endpoint may not exist
    }
  }, [orgId]);

  useEffect(() => {
    Promise.all([fetchMembers(), fetchInvitations()]).finally(() => setLoading(false));
  }, [fetchMembers, fetchInvitations]);

  // Filter members by search
  const filteredMembers = members.filter(
    (m) =>
      m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handlers
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, member: OrgMember) => {
    setMenuAnchor(event.currentTarget);
    setMenuMember(member);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setMenuMember(null);
  };

  const handleEditClick = () => {
    if (menuMember) {
      setSelectedMember(menuMember);
      setEditRole(menuMember.role);
      setEditDialogOpen(true);
    }
    handleMenuClose();
  };

  const handleDeleteClick = () => {
    if (menuMember) {
      setSelectedMember(menuMember);
      setDeleteDialogOpen(true);
    }
    handleMenuClose();
  };

  const handleViewPermissions = async () => {
    if (!menuMember) return;
    
    setSelectedMember(menuMember);
    setPermissionsDialogOpen(true);
    setLoadingPermissions(true);
    setMemberPermissions(null);
    handleMenuClose();

    try {
      const response = await fetch(`/api/platform/orgs/${orgId}/members/${menuMember.userId}/permissions`);
      if (!response.ok) throw new Error('Failed to fetch permissions');
      const data = await response.json();
      setMemberPermissions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load permissions');
    } finally {
      setLoadingPermissions(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    
    setInviting(true);
    setError(null);

    try {
      const response = await fetch(`/api/platform/orgs/${orgId}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send invitation');
      }

      setInviteDialogOpen(false);
      setInviteEmail('');
      setInviteRole('member');
      fetchInvitations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setInviting(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedMember) return;

    setUpdating(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/platform/orgs/${orgId}/members/${selectedMember.userId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: editRole }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update member');
      }

      setEditDialogOpen(false);
      setSelectedMember(null);
      fetchMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setUpdating(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!selectedMember) return;

    setUpdating(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/platform/orgs/${orgId}/members/${selectedMember.userId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove member');
      }

      setDeleteDialogOpen(false);
      setSelectedMember(null);
      fetchMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <Box>
        <Skeleton variant="text" width={200} height={40} />
        <Skeleton variant="rectangular" height={400} sx={{ mt: 2 }} />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={600}>
            Members
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {members.length} member{members.length !== 1 ? 's' : ''} in this organization
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<InviteIcon />}
          onClick={() => setInviteDialogOpen(true)}
        >
          Invite Member
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Search */}
      <TextField
        placeholder="Search members..."
        size="small"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        sx={{ mb: 2, width: 300 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
      />

      {/* Pending Invitations */}
      {invitations.filter((i) => i.status === 'pending').length > 0 && (
        <Paper sx={{ p: 2, mb: 2, bgcolor: alpha(theme.palette.warning.main, 0.1) }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            <MailIcon fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
            Pending Invitations
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {invitations
              .filter((i) => i.status === 'pending')
              .map((inv) => (
                <Chip
                  key={inv.invitationId}
                  label={`${inv.email} (${inv.role})`}
                  size="small"
                  onDelete={() => {
                    // TODO: Cancel invitation
                  }}
                />
              ))}
          </Box>
        </Paper>
      )}

      {/* Members Table */}
      <TableContainer component={Paper} sx={{ bgcolor: alpha(theme.palette.background.paper, 0.6) }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Member</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Joined</TableCell>
              <TableCell>Last Active</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredMembers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    {searchQuery ? 'No members match your search' : 'No members yet'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredMembers.map((member) => (
                <TableRow key={member.userId} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar
                        src={member.avatarUrl}
                        alt={member.displayName || member.email}
                        sx={{ width: 36, height: 36 }}
                      >
                        {(member.displayName || member.email)[0].toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={500}>
                          {member.displayName || member.email.split('@')[0]}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {member.email}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={member.role}
                      size="small"
                      color={ROLE_COLORS[member.role] || 'default'}
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {new Date(member.joinedAt).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {member.lastLoginAt
                        ? new Date(member.lastLoginAt).toLocaleDateString()
                        : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    {member.role !== 'owner' && (
                      <Tooltip title="More actions">
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuOpen(e, member)}
                        >
                          <MoreIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Actions Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleViewPermissions}>
          <SecurityIcon fontSize="small" sx={{ mr: 1 }} />
          View Permissions
        </MenuItem>
        <MenuItem onClick={handleEditClick}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Change Role
        </MenuItem>
        <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Remove Member
        </MenuItem>
      </Menu>

      {/* Invite Dialog */}
      <Dialog open={inviteDialogOpen} onClose={() => setInviteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Invite Member</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Email Address"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              fullWidth
              autoFocus
              placeholder="colleague@company.com"
            />
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={inviteRole}
                label="Role"
                onChange={(e) => setInviteRole(e.target.value)}
              >
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="member">Member</MenuItem>
                <MenuItem value="viewer">Viewer</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleInvite}
            disabled={inviting || !inviteEmail.trim()}
          >
            {inviting ? 'Sending...' : 'Send Invitation'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Change Member Role</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Changing role for: <strong>{selectedMember?.email}</strong>
            </Typography>
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={editRole}
                label="Role"
                onChange={(e) => setEditRole(e.target.value)}
              >
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="member">Member</MenuItem>
                <MenuItem value="viewer">Viewer</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdateRole} disabled={updating}>
            {updating ? 'Updating...' : 'Update Role'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Remove Member Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Remove Member</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove <strong>{selectedMember?.email}</strong> from this
            organization? They will lose access to all projects and resources.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleRemoveMember}
            disabled={updating}
          >
            {updating ? 'Removing...' : 'Remove Member'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Permissions Dialog */}
      <Dialog 
        open={permissionsDialogOpen} 
        onClose={() => { setPermissionsDialogOpen(false); setMemberPermissions(null); }} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SecurityIcon />
            Effective Permissions
          </Box>
        </DialogTitle>
        <DialogContent>
          {loadingPermissions ? (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">Loading permissions...</Typography>
            </Box>
          ) : memberPermissions ? (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Showing effective permissions for <strong>{selectedMember?.email}</strong>
              </Typography>

              {/* Permission Sources */}
              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                Permission Sources
              </Typography>
              <Box sx={{ mb: 3 }}>
                {memberPermissions.sources.map((source, idx) => (
                  <Paper 
                    key={idx} 
                    sx={{ 
                      p: 2, 
                      mb: 1, 
                      bgcolor: alpha(theme.palette.background.paper, 0.6),
                      border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Chip 
                        label={source.type} 
                        size="small" 
                        color={source.type === 'builtin' ? 'primary' : source.type === 'group' ? 'secondary' : 'default'}
                      />
                      <Typography variant="body2" fontWeight={500}>
                        {source.sourceName}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {source.permissions.slice(0, 10).map((perm) => (
                        <Chip 
                          key={perm} 
                          label={perm} 
                          size="small" 
                          variant="outlined" 
                          sx={{ fontSize: '0.7rem' }}
                        />
                      ))}
                      {source.permissions.length > 10 && (
                        <Chip 
                          label={`+${source.permissions.length - 10} more`} 
                          size="small" 
                          variant="outlined"
                          sx={{ fontSize: '0.7rem' }}
                        />
                      )}
                    </Box>
                  </Paper>
                ))}
              </Box>

              {/* All Permissions */}
              <Typography variant="subtitle2" gutterBottom>
                All Permissions ({memberPermissions.permissions.length})
              </Typography>
              <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.background.paper, 0.6), maxHeight: 200, overflow: 'auto' }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {memberPermissions.permissions.map((perm) => (
                    <Chip 
                      key={perm} 
                      label={perm} 
                      size="small" 
                      icon={<CheckIcon sx={{ fontSize: 14 }} />}
                      color="success"
                      variant="outlined"
                      sx={{ fontSize: '0.75rem' }}
                    />
                  ))}
                </Box>
              </Paper>
            </Box>
          ) : (
            <Typography color="error">Failed to load permissions</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setPermissionsDialogOpen(false); setMemberPermissions(null); }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
