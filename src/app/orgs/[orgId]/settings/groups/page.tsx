'use client';

/**
 * Organization Groups Management
 * 
 * Create, edit, and manage user groups/teams.
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
  AvatarGroup,
  Skeleton,
  InputAdornment,
  Tooltip,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Autocomplete,
  alpha,
  useTheme,
  Tabs,
  Tab,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreIcon,
  Search as SearchIcon,
  GroupAdd as GroupAddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PersonAdd as PersonAddIcon,
  PersonRemove as PersonRemoveIcon,
  Groups as GroupsIcon,
} from '@mui/icons-material';

interface OrgGroup {
  groupId: string;
  name: string;
  slug: string;
  description?: string;
  memberIds: string[];
  defaultRole?: string;
  createdAt: string;
  createdBy: string;
}

interface GroupMember {
  userId: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
}

interface OrgMember {
  userId: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
}

const ROLE_OPTIONS = [
  { value: '', label: 'None (inherit from assignments)' },
  { value: 'admin', label: 'Admin' },
  { value: 'member', label: 'Member' },
  { value: 'viewer', label: 'Viewer' },
];

export default function GroupsPage() {
  const params = useParams();
  const theme = useTheme();
  const orgId = params.orgId as string;

  // State
  const [groups, setGroups] = useState<OrgGroup[]>([]);
  const [allMembers, setAllMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<OrgGroup | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);

  // Menu state
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuGroup, setMenuGroup] = useState<OrgGroup | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDefaultRole, setFormDefaultRole] = useState('');
  const [saving, setSaving] = useState(false);

  // Detail dialog state
  const [detailTab, setDetailTab] = useState(0);
  const [memberToAdd, setMemberToAdd] = useState<OrgMember | null>(null);

  // Fetch groups
  const fetchGroups = useCallback(async () => {
    try {
      const response = await fetch(`/api/platform/orgs/${orgId}/groups`);
      if (!response.ok) throw new Error('Failed to fetch groups');
      const data = await response.json();
      setGroups(data.groups || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [orgId]);

  // Fetch all org members (for adding to groups)
  const fetchAllMembers = useCallback(async () => {
    try {
      const response = await fetch(`/api/platform/orgs/${orgId}/members`);
      if (!response.ok) return;
      const data = await response.json();
      setAllMembers(data.members || []);
    } catch {
      // Ignore
    }
  }, [orgId]);

  // Fetch group details
  const fetchGroupDetails = useCallback(async (groupId: string) => {
    try {
      const response = await fetch(`/api/platform/orgs/${orgId}/groups/${groupId}`);
      if (!response.ok) throw new Error('Failed to fetch group');
      const data = await response.json();
      setSelectedGroup(data.group);
      setGroupMembers(data.members || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [orgId]);

  useEffect(() => {
    Promise.all([fetchGroups(), fetchAllMembers()]).finally(() => setLoading(false));
  }, [fetchGroups, fetchAllMembers]);

  // Filter groups by search
  const filteredGroups = groups.filter(
    (g) =>
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handlers
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, group: OrgGroup) => {
    setMenuAnchor(event.currentTarget);
    setMenuGroup(group);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setMenuGroup(null);
  };

  const handleViewDetails = () => {
    if (menuGroup) {
      fetchGroupDetails(menuGroup.groupId);
      setDetailDialogOpen(true);
    }
    handleMenuClose();
  };

  const handleEditClick = () => {
    if (menuGroup) {
      setSelectedGroup(menuGroup);
      setFormName(menuGroup.name);
      setFormDescription(menuGroup.description || '');
      setFormDefaultRole(menuGroup.defaultRole || '');
      setEditDialogOpen(true);
    }
    handleMenuClose();
  };

  const handleDeleteClick = () => {
    if (menuGroup) {
      setSelectedGroup(menuGroup);
      setDeleteDialogOpen(true);
    }
    handleMenuClose();
  };

  const handleCreateGroup = async () => {
    if (!formName.trim()) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/platform/orgs/${orgId}/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          description: formDescription || undefined,
          defaultRole: formDefaultRole || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create group');
      }

      setCreateDialogOpen(false);
      resetForm();
      fetchGroups();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateGroup = async () => {
    if (!selectedGroup || !formName.trim()) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/platform/orgs/${orgId}/groups/${selectedGroup.groupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          description: formDescription || undefined,
          defaultRole: formDefaultRole || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update group');
      }

      setEditDialogOpen(false);
      resetForm();
      fetchGroups();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!selectedGroup) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/platform/orgs/${orgId}/groups/${selectedGroup.groupId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete group');
      }

      setDeleteDialogOpen(false);
      setSelectedGroup(null);
      fetchGroups();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedGroup || !memberToAdd) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/platform/orgs/${orgId}/groups/${selectedGroup.groupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addMembers: [memberToAdd.userId] }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add member');
      }

      setMemberToAdd(null);
      fetchGroupDetails(selectedGroup.groupId);
      fetchGroups();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedGroup) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/platform/orgs/${orgId}/groups/${selectedGroup.groupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ removeMembers: [userId] }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove member');
      }

      fetchGroupDetails(selectedGroup.groupId);
      fetchGroups();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormDefaultRole('');
    setSelectedGroup(null);
  };

  // Members not in the current group (for add member autocomplete)
  const availableMembers = selectedGroup
    ? allMembers.filter((m) => !selectedGroup.memberIds.includes(m.userId))
    : [];

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
            Groups
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Organize members into teams for easier permission management
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<GroupAddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Create Group
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Search */}
      <TextField
        placeholder="Search groups..."
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

      {/* Groups Table */}
      <TableContainer component={Paper} sx={{ bgcolor: alpha(theme.palette.background.paper, 0.6) }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Group</TableCell>
              <TableCell>Members</TableCell>
              <TableCell>Default Role</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredGroups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  <GroupsIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                  <Typography color="text.secondary">
                    {searchQuery ? 'No groups match your search' : 'No groups yet'}
                  </Typography>
                  {!searchQuery && (
                    <Button
                      startIcon={<AddIcon />}
                      onClick={() => setCreateDialogOpen(true)}
                      sx={{ mt: 1 }}
                    >
                      Create your first group
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              filteredGroups.map((group) => (
                <TableRow
                  key={group.groupId}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => {
                    fetchGroupDetails(group.groupId);
                    setDetailDialogOpen(true);
                  }}
                >
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight={500}>
                        {group.name}
                      </Typography>
                      {group.description && (
                        <Typography variant="caption" color="text.secondary">
                          {group.description}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AvatarGroup max={3} sx={{ '& .MuiAvatar-root': { width: 28, height: 28 } }}>
                        {group.memberIds.slice(0, 3).map((id) => {
                          const member = allMembers.find((m) => m.userId === id);
                          return (
                            <Avatar key={id} src={member?.avatarUrl} sx={{ width: 28, height: 28 }}>
                              {(member?.displayName || member?.email || '?')[0].toUpperCase()}
                            </Avatar>
                          );
                        })}
                      </AvatarGroup>
                      <Typography variant="body2" color="text.secondary">
                        {group.memberIds.length} member{group.memberIds.length !== 1 ? 's' : ''}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {group.defaultRole ? (
                      <Chip label={group.defaultRole} size="small" sx={{ textTransform: 'capitalize' }} />
                    ) : (
                      <Typography variant="body2" color="text.disabled">—</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {new Date(group.createdAt).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <Tooltip title="More actions">
                      <IconButton size="small" onClick={(e) => handleMenuOpen(e, group)}>
                        <MoreIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Actions Menu */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleMenuClose}>
        <MenuItem onClick={handleViewDetails}>
          <GroupsIcon fontSize="small" sx={{ mr: 1 }} />
          View Members
        </MenuItem>
        <MenuItem onClick={handleEditClick}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Edit Group
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete Group
        </MenuItem>
      </Menu>

      {/* Create Group Dialog */}
      <Dialog open={createDialogOpen} onClose={() => { setCreateDialogOpen(false); resetForm(); }} maxWidth="sm" fullWidth>
        <DialogTitle>Create Group</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Group Name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              fullWidth
              autoFocus
              placeholder="e.g., Engineering, Marketing, Admins"
            />
            <TextField
              label="Description"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              fullWidth
              multiline
              rows={2}
              placeholder="What is this group for?"
            />
            <FormControl fullWidth>
              <InputLabel>Default Role</InputLabel>
              <Select
                value={formDefaultRole}
                label="Default Role"
                onChange={(e) => setFormDefaultRole(e.target.value)}
              >
                {ROLE_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setCreateDialogOpen(false); resetForm(); }}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateGroup} disabled={saving || !formName.trim()}>
            {saving ? 'Creating...' : 'Create Group'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Group Dialog */}
      <Dialog open={editDialogOpen} onClose={() => { setEditDialogOpen(false); resetForm(); }} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Group</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Group Name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              fullWidth
            />
            <TextField
              label="Description"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              fullWidth
              multiline
              rows={2}
            />
            <FormControl fullWidth>
              <InputLabel>Default Role</InputLabel>
              <Select
                value={formDefaultRole}
                label="Default Role"
                onChange={(e) => setFormDefaultRole(e.target.value)}
              >
                {ROLE_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setEditDialogOpen(false); resetForm(); }}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdateGroup} disabled={saving || !formName.trim()}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Group Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => { setDeleteDialogOpen(false); resetForm(); }} maxWidth="sm" fullWidth>
        <DialogTitle>Delete Group</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the group <strong>{selectedGroup?.name}</strong>?
            This will remove all role assignments for this group.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDeleteDialogOpen(false); resetForm(); }}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteGroup} disabled={saving}>
            {saving ? 'Deleting...' : 'Delete Group'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Group Detail Dialog */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => { setDetailDialogOpen(false); setSelectedGroup(null); setDetailTab(0); }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <GroupsIcon />
            {selectedGroup?.name || 'Group Details'}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Tabs value={detailTab} onChange={(_, v) => setDetailTab(v)} sx={{ mb: 2 }}>
            <Tab label={`Members (${selectedGroup?.memberIds.length || 0})`} />
            <Tab label="Settings" />
          </Tabs>

          {detailTab === 0 && (
            <Box>
              {/* Add Member */}
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Autocomplete
                  options={availableMembers}
                  getOptionLabel={(m) => m.email}
                  value={memberToAdd}
                  onChange={(_, v) => setMemberToAdd(v)}
                  renderInput={(params) => (
                    <TextField {...params} placeholder="Add member by email..." size="small" />
                  )}
                  sx={{ flex: 1 }}
                />
                <Button
                  variant="contained"
                  startIcon={<PersonAddIcon />}
                  onClick={handleAddMember}
                  disabled={!memberToAdd || saving}
                >
                  Add
                </Button>
              </Box>

              {/* Members List */}
              <List>
                {groupMembers.length === 0 ? (
                  <ListItem>
                    <ListItemText
                      primary="No members yet"
                      secondary="Add members using the field above"
                    />
                  </ListItem>
                ) : (
                  groupMembers.map((member) => (
                    <ListItem key={member.userId}>
                      <ListItemAvatar>
                        <Avatar src={member.avatarUrl}>
                          {(member.displayName || member.email)[0].toUpperCase()}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={member.displayName || member.email.split('@')[0]}
                        secondary={member.email}
                      />
                      <ListItemSecondaryAction>
                        <Tooltip title="Remove from group">
                          <IconButton
                            edge="end"
                            onClick={() => handleRemoveMember(member.userId)}
                            disabled={saving}
                          >
                            <PersonRemoveIcon />
                          </IconButton>
                        </Tooltip>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))
                )}
              </List>
            </Box>
          )}

          {detailTab === 1 && selectedGroup && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField label="Group ID" value={selectedGroup.groupId} disabled fullWidth />
              <TextField label="Slug" value={selectedGroup.slug} disabled fullWidth />
              <TextField
                label="Description"
                value={selectedGroup.description || ''}
                disabled
                fullWidth
                multiline
                rows={2}
              />
              <TextField
                label="Default Role"
                value={selectedGroup.defaultRole || 'None'}
                disabled
                fullWidth
              />
              <TextField
                label="Created"
                value={new Date(selectedGroup.createdAt).toLocaleString()}
                disabled
                fullWidth
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDetailDialogOpen(false); setSelectedGroup(null); setDetailTab(0); }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
