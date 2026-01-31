'use client';

/**
 * Role Assignments Management
 * 
 * Assign roles to users and groups. View and manage all role assignments.
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
  Skeleton,
  InputAdornment,
  Tooltip,
  Divider,
  Tabs,
  Tab,
  Autocomplete,
  FormHelperText,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreIcon,
  Search as SearchIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Groups as GroupsIcon,
  Security as SecurityIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';

interface RoleAssignment {
  assignmentId: string;
  organizationId: string;
  targetType: 'user' | 'group';
  targetId: string;
  targetName?: string;
  targetEmail?: string;
  roleType: 'builtin' | 'custom';
  roleId: string;
  roleName?: string;
  scope?: {
    type: 'org' | 'project' | 'form';
    resourceId?: string;
    resourceName?: string;
  };
  grantedBy: string;
  grantedByName?: string;
  grantedAt: string;
  expiresAt?: string;
  reason?: string;
}

interface OrgMember {
  userId: string;
  email: string;
  displayName?: string;
  role: string;
}

interface OrgGroup {
  groupId: string;
  name: string;
  memberIds: string[];
}

interface Role {
  roleId: string;
  name: string;
  type: 'builtin' | 'custom';
  description?: string;
}

const BUILTIN_ROLES: Role[] = [
  { roleId: 'owner', name: 'Owner', type: 'builtin', description: 'Full control' },
  { roleId: 'admin', name: 'Admin', type: 'builtin', description: 'Manage members and content' },
  { roleId: 'member', name: 'Member', type: 'builtin', description: 'Create and edit own content' },
  { roleId: 'viewer', name: 'Viewer', type: 'builtin', description: 'View only' },
];

export default function AssignmentsPage() {
  const params = useParams();
  const theme = useTheme();
  const orgId = params.orgId as string;

  // State
  const [assignments, setAssignments] = useState<RoleAssignment[]>([]);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [groups, setGroups] = useState<OrgGroup[]>([]);
  const [customRoles, setCustomRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState(0); // 0=all, 1=users, 2=groups

  // Dialog states
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<RoleAssignment | null>(null);

  // Menu state
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuAssignment, setMenuAssignment] = useState<RoleAssignment | null>(null);

  // Form state
  const [formTargetType, setFormTargetType] = useState<'user' | 'group'>('user');
  const [formTargetId, setFormTargetId] = useState('');
  const [formRoleType, setFormRoleType] = useState<'builtin' | 'custom'>('builtin');
  const [formRoleId, setFormRoleId] = useState('');
  const [formReason, setFormReason] = useState('');
  const [saving, setSaving] = useState(false);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      const [assignmentsRes, membersRes, groupsRes, rolesRes] = await Promise.all([
        fetch(`/api/platform/orgs/${orgId}/assignments`),
        fetch(`/api/platform/orgs/${orgId}/members`),
        fetch(`/api/platform/orgs/${orgId}/groups`),
        fetch(`/api/platform/orgs/${orgId}/roles`),
      ]);

      const [assignmentsData, membersData, groupsData, rolesData] = await Promise.all([
        assignmentsRes.json(),
        membersRes.json(),
        groupsRes.json(),
        rolesRes.json(),
      ]);

      // Enrich assignments with names
      const enrichedAssignments = (assignmentsData.assignments || []).map((a: RoleAssignment) => {
        if (a.targetType === 'user') {
          const member = membersData.members?.find((m: OrgMember) => m.userId === a.targetId);
          a.targetName = member?.displayName || member?.email?.split('@')[0];
          a.targetEmail = member?.email;
        } else {
          const group = groupsData.groups?.find((g: OrgGroup) => g.groupId === a.targetId);
          a.targetName = group?.name;
        }
        
        // Find role name
        if (a.roleType === 'builtin') {
          const role = BUILTIN_ROLES.find(r => r.roleId === a.roleId);
          a.roleName = role?.name || a.roleId;
        } else {
          const role = rolesData.roles?.find((r: Role) => r.roleId === a.roleId);
          a.roleName = role?.name || a.roleId;
        }
        
        return a;
      });

      setAssignments(enrichedAssignments);
      setMembers(membersData.members || []);
      setGroups(groupsData.groups || []);
      setCustomRoles(
        (rolesData.roles || [])
          .filter((r: any) => r.type === 'custom' || !r.isSystem)
          .map((r: any) => ({ ...r, type: 'custom' as const }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter assignments
  const filteredAssignments = assignments.filter(a => {
    // Tab filter
    if (filterTab === 1 && a.targetType !== 'user') return false;
    if (filterTab === 2 && a.targetType !== 'group') return false;

    // Search filter
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      return (
        a.targetName?.toLowerCase().includes(search) ||
        a.targetEmail?.toLowerCase().includes(search) ||
        a.roleName?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  // Handlers
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, assignment: RoleAssignment) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setMenuAssignment(assignment);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setMenuAssignment(null);
  };

  const handleDeleteClick = () => {
    if (menuAssignment) {
      setSelectedAssignment(menuAssignment);
      setDeleteDialogOpen(true);
    }
    handleMenuClose();
  };

  const resetForm = () => {
    setFormTargetType('user');
    setFormTargetId('');
    setFormRoleType('builtin');
    setFormRoleId('');
    setFormReason('');
    setError(null);
  };

  const handleCreateAssignment = async () => {
    if (!formTargetId || !formRoleId) {
      setError('Please select a target and role');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/platform/orgs/${orgId}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType: formTargetType,
          targetId: formTargetId,
          roleType: formRoleType,
          roleId: formRoleId,
          reason: formReason || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create assignment');
      }

      setAssignDialogOpen(false);
      resetForm();
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAssignment = async () => {
    if (!selectedAssignment) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/platform/orgs/${orgId}/assignments?assignmentId=${selectedAssignment.assignmentId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete assignment');
      }

      setDeleteDialogOpen(false);
      setSelectedAssignment(null);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  // All available roles
  const allRoles: Role[] = [...BUILTIN_ROLES, ...customRoles];
  const availableRoles = formRoleType === 'builtin' 
    ? BUILTIN_ROLES 
    : customRoles;

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
            Role Assignments
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Assign additional roles to users and groups
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setAssignDialogOpen(true)}
        >
          Assign Role
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Tabs and Search */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Tabs value={filterTab} onChange={(_, v) => setFilterTab(v)}>
          <Tab label={`All (${assignments.length})`} />
          <Tab 
            icon={<PersonIcon fontSize="small" />} 
            iconPosition="start" 
            label={`Users (${assignments.filter(a => a.targetType === 'user').length})`} 
          />
          <Tab 
            icon={<GroupsIcon fontSize="small" />} 
            iconPosition="start" 
            label={`Groups (${assignments.filter(a => a.targetType === 'group').length})`} 
          />
        </Tabs>
        <TextField
          placeholder="Search..."
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ width: 250 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Assignments Table */}
      <TableContainer component={Paper} sx={{ bgcolor: alpha(theme.palette.background.paper, 0.6) }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Target</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Scope</TableCell>
              <TableCell>Granted</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAssignments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                  <AssignmentIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                  <Typography color="text.secondary">
                    {searchQuery ? 'No assignments match your search' : 'No role assignments yet'}
                  </Typography>
                  {!searchQuery && (
                    <Button
                      startIcon={<AddIcon />}
                      onClick={() => setAssignDialogOpen(true)}
                      sx={{ mt: 1 }}
                    >
                      Create your first assignment
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              filteredAssignments.map((assignment) => (
                <TableRow key={assignment.assignmentId} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {assignment.targetType === 'user' ? (
                        <PersonIcon fontSize="small" sx={{ color: 'primary.main' }} />
                      ) : (
                        <GroupsIcon fontSize="small" sx={{ color: 'secondary.main' }} />
                      )}
                      <Box>
                        <Typography variant="body2" fontWeight={500}>
                          {assignment.targetName || assignment.targetId}
                        </Typography>
                        {assignment.targetEmail && (
                          <Typography variant="caption" color="text.secondary">
                            {assignment.targetEmail}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={assignment.roleName}
                      size="small"
                      color={assignment.roleType === 'builtin' ? 'default' : 'primary'}
                      variant={assignment.roleType === 'builtin' ? 'outlined' : 'filled'}
                    />
                  </TableCell>
                  <TableCell>
                    {assignment.scope ? (
                      <Chip
                        label={`${assignment.scope.type}: ${assignment.scope.resourceName || assignment.scope.resourceId}`}
                        size="small"
                        variant="outlined"
                      />
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Organization-wide
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {new Date(assignment.grantedAt).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Actions">
                      <IconButton size="small" onClick={(e) => handleMenuOpen(e, assignment)}>
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
        <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Remove Assignment
        </MenuItem>
      </Menu>

      {/* Assign Role Dialog */}
      <Dialog 
        open={assignDialogOpen} 
        onClose={() => { setAssignDialogOpen(false); resetForm(); }} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>Assign Role</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {/* Target Type */}
            <FormControl fullWidth>
              <InputLabel>Assign to</InputLabel>
              <Select
                value={formTargetType}
                label="Assign to"
                onChange={(e) => {
                  setFormTargetType(e.target.value as 'user' | 'group');
                  setFormTargetId('');
                }}
              >
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="group">Group</MenuItem>
              </Select>
            </FormControl>

            {/* Target Selection */}
            {formTargetType === 'user' ? (
              <Autocomplete
                options={members}
                getOptionLabel={(m) => m.displayName ? `${m.displayName} (${m.email})` : m.email}
                value={members.find(m => m.userId === formTargetId) || null}
                onChange={(_, m) => setFormTargetId(m?.userId || '')}
                renderInput={(params) => (
                  <TextField {...params} label="Select User" placeholder="Search users..." />
                )}
              />
            ) : (
              <Autocomplete
                options={groups}
                getOptionLabel={(g) => g.name}
                value={groups.find(g => g.groupId === formTargetId) || null}
                onChange={(_, g) => setFormTargetId(g?.groupId || '')}
                renderInput={(params) => (
                  <TextField {...params} label="Select Group" placeholder="Search groups..." />
                )}
              />
            )}

            <Divider />

            {/* Role Type */}
            <FormControl fullWidth>
              <InputLabel>Role Type</InputLabel>
              <Select
                value={formRoleType}
                label="Role Type"
                onChange={(e) => {
                  setFormRoleType(e.target.value as 'builtin' | 'custom');
                  setFormRoleId('');
                }}
              >
                <MenuItem value="builtin">Built-in Role</MenuItem>
                <MenuItem value="custom" disabled={customRoles.length === 0}>
                  Custom Role {customRoles.length === 0 && '(none available)'}
                </MenuItem>
              </Select>
            </FormControl>

            {/* Role Selection */}
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={formRoleId}
                label="Role"
                onChange={(e) => setFormRoleId(e.target.value)}
              >
                {availableRoles.map((role) => (
                  <MenuItem key={role.roleId} value={role.roleId}>
                    {role.name}
                    {role.description && (
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                        — {role.description}
                      </Typography>
                    )}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                {formRoleType === 'builtin' 
                  ? 'Built-in roles have predefined permissions'
                  : 'Custom roles have configurable permissions'}
              </FormHelperText>
            </FormControl>

            {/* Reason (optional) */}
            <TextField
              label="Reason (optional)"
              value={formReason}
              onChange={(e) => setFormReason(e.target.value)}
              placeholder="Why is this role being assigned?"
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setAssignDialogOpen(false); resetForm(); }}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleCreateAssignment} 
            disabled={saving || !formTargetId || !formRoleId}
          >
            {saving ? 'Assigning...' : 'Assign Role'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={deleteDialogOpen} 
        onClose={() => { setDeleteDialogOpen(false); setSelectedAssignment(null); }} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>Remove Role Assignment</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove the <strong>{selectedAssignment?.roleName}</strong> role 
            from <strong>{selectedAssignment?.targetName}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDeleteDialogOpen(false); setSelectedAssignment(null); }}>
            Cancel
          </Button>
          <Button variant="contained" color="error" onClick={handleDeleteAssignment} disabled={saving}>
            {saving ? 'Removing...' : 'Remove Assignment'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
