'use client';

/**
 * Platform Admin - Groups Management
 * 
 * Full CRUD for groups across all organizations.
 */

import { useState, useCallback } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  TextField,
  Select,
  FormControl,
  InputLabel,
  MenuItem,
  Alert,
  Chip,
  Avatar,
  AvatarGroup,
  Skeleton,
  InputAdornment,
  Tooltip,
  TablePagination,
  Breadcrumbs,
  Link as MuiLink,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Menu,
  Divider,
  alpha,
  useTheme,
} from '@mui/material';
import Link from 'next/link';
import {
  Search as SearchIcon,
  Groups as GroupsIcon,
  Business as BusinessIcon,
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  MoreVert as MoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  GroupAdd as GroupAddIcon,
} from '@mui/icons-material';
import useSWR, { mutate } from 'swr';

interface OrgGroup {
  groupId: string;
  name: string;
  slug: string;
  description?: string;
  memberIds: string[];
  defaultRole?: string;
  createdAt: string;
  organizationId: string;
  organizationName: string;
}

interface Organization {
  id: string;
  name: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const ROLE_OPTIONS = [
  { value: '', label: 'None (inherit from assignments)' },
  { value: 'admin', label: 'Admin' },
  { value: 'member', label: 'Member' },
  { value: 'viewer', label: 'Viewer' },
];

export default function AdminGroupsPage() {
  const theme = useTheme();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrg, setSelectedOrg] = useState<string>('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<OrgGroup | null>(null);

  // Menu state
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuGroup, setMenuGroup] = useState<OrgGroup | null>(null);

  // Form state
  const [formOrgId, setFormOrgId] = useState('');
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDefaultRole, setFormDefaultRole] = useState('');
  const [saving, setSaving] = useState(false);

  // Build API URL with filters
  const buildUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (selectedOrg) params.set('orgId', selectedOrg);
    params.set('limit', rowsPerPage.toString());
    params.set('offset', (page * rowsPerPage).toString());
    return `/api/admin/groups?${params.toString()}`;
  }, [searchQuery, selectedOrg, page, rowsPerPage]);

  // Fetch groups
  const { data, error: fetchError, isLoading } = useSWR(buildUrl(), fetcher, {
    refreshInterval: 30000,
  });

  // Fetch organizations for filter and create dialog
  const { data: orgsData } = useSWR('/api/admin/organizations', fetcher);

  const groups: OrgGroup[] = data?.groups || [];
  const total = data?.total || 0;
  const organizations: Organization[] = orgsData?.organizations || [];

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Menu handlers
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, group: OrgGroup) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setMenuGroup(group);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setMenuGroup(null);
  };

  const handleEditClick = () => {
    if (menuGroup) {
      setSelectedGroup(menuGroup);
      setFormOrgId(menuGroup.organizationId);
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

  const resetForm = () => {
    setFormOrgId('');
    setFormName('');
    setFormDescription('');
    setFormDefaultRole('');
    setSelectedGroup(null);
    setError(null);
  };

  // Create group
  const handleCreateGroup = async () => {
    if (!formName.trim() || !formOrgId) {
      setError('Organization and group name are required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/platform/orgs/${formOrgId}/groups`, {
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
      mutate(buildUrl());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  // Update group
  const handleUpdateGroup = async () => {
    if (!selectedGroup || !formName.trim()) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/platform/orgs/${selectedGroup.organizationId}/groups/${selectedGroup.groupId}`, {
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
      mutate(buildUrl());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  // Delete group
  const handleDeleteGroup = async () => {
    if (!selectedGroup) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/platform/orgs/${selectedGroup.organizationId}/groups/${selectedGroup.groupId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete group');
      }

      setDeleteDialogOpen(false);
      setSelectedGroup(null);
      mutate(buildUrl());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  if (fetchError) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="error">Failed to load groups: {fetchError.message}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <MuiLink component={Link} href="/admin" color="inherit" underline="hover">
          Admin
        </MuiLink>
        <Typography color="text.primary">Groups</Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton component={Link} href="/admin">
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h4" fontWeight={600}>
              Groups
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage groups across all organizations ({total} total)
            </Typography>
          </Box>
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

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3, bgcolor: alpha(theme.palette.background.paper, 0.6) }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            placeholder="Search groups..."
            size="small"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
            sx={{ minWidth: 250 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Organization</InputLabel>
            <Select
              value={selectedOrg}
              label="Organization"
              onChange={(e) => {
                setSelectedOrg(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value="">All Organizations</MenuItem>
              {organizations.map((org) => (
                <MenuItem key={org.id} value={org.id}>
                  {org.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {/* Groups Table */}
      <TableContainer component={Paper} sx={{ bgcolor: alpha(theme.palette.background.paper, 0.6) }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Group</TableCell>
              <TableCell>Organization</TableCell>
              <TableCell>Members</TableCell>
              <TableCell>Default Role</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton variant="text" width={150} /></TableCell>
                  <TableCell><Skeleton variant="text" width={120} /></TableCell>
                  <TableCell><Skeleton variant="text" width={80} /></TableCell>
                  <TableCell><Skeleton variant="text" width={60} /></TableCell>
                  <TableCell><Skeleton variant="text" width={100} /></TableCell>
                  <TableCell><Skeleton variant="text" width={40} /></TableCell>
                </TableRow>
              ))
            ) : groups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                  <GroupsIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                  <Typography color="text.secondary">
                    {searchQuery || selectedOrg ? 'No groups match your filters' : 'No groups yet'}
                  </Typography>
                  {!searchQuery && !selectedOrg && (
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
              groups.map((group) => (
                <TableRow key={group.groupId} hover>
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
                      <BusinessIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                      <Tooltip title={`Org ID: ${group.organizationId}`}>
                        <Typography variant="body2">{group.organizationName}</Typography>
                      </Tooltip>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AvatarGroup max={3} sx={{ '& .MuiAvatar-root': { width: 24, height: 24, fontSize: 12 } }}>
                        {group.memberIds.slice(0, 3).map((id, idx) => (
                          <Avatar key={id} sx={{ width: 24, height: 24 }}>
                            {idx + 1}
                          </Avatar>
                        ))}
                      </AvatarGroup>
                      <Typography variant="body2" color="text.secondary">
                        {group.memberIds.length}
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
                  <TableCell align="right">
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
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      </TableContainer>

      {/* Actions Menu */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleMenuClose}>
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
            <FormControl fullWidth required>
              <InputLabel>Organization</InputLabel>
              <Select
                value={formOrgId}
                label="Organization"
                onChange={(e) => setFormOrgId(e.target.value)}
              >
                {organizations.map((org) => (
                  <MenuItem key={org.id} value={org.id}>
                    {org.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Group Name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              fullWidth
              required
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
          <Button variant="contained" onClick={handleCreateGroup} disabled={saving || !formName.trim() || !formOrgId}>
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
              label="Organization"
              value={selectedGroup?.organizationName || ''}
              disabled
              fullWidth
            />
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
      <Dialog open={deleteDialogOpen} onClose={() => { setDeleteDialogOpen(false); setSelectedGroup(null); }} maxWidth="sm" fullWidth>
        <DialogTitle>Delete Group</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the group <strong>{selectedGroup?.name}</strong> from{' '}
            <strong>{selectedGroup?.organizationName}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This will remove all role assignments for this group.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDeleteDialogOpen(false); setSelectedGroup(null); }}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteGroup} disabled={saving}>
            {saving ? 'Deleting...' : 'Delete Group'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
