'use client';

/**
 * Organization Roles Management
 * 
 * View built-in roles and manage custom roles with permissions.
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
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Divider,
  alpha,
  useTheme,
  Badge,
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Security as SecurityIcon,
  Lock as LockIcon,
  Shield as ShieldIcon,
} from '@mui/icons-material';

interface Role {
  roleId: string;
  name: string;
  slug?: string;
  description?: string;
  type: 'builtin' | 'custom';
  baseRole?: string;
  permissions: string[];
  isSystem?: boolean;
}

// Permission categories for organized display
const PERMISSION_CATEGORIES: Record<string, { label: string; permissions: string[] }> = {
  org: {
    label: 'Organization',
    permissions: ['org:read', 'org:update', 'org:delete', 'org:manage_billing', 'org:manage_settings'],
  },
  members: {
    label: 'Members',
    permissions: ['members:read', 'members:invite', 'members:remove', 'members:update_role'],
  },
  groups: {
    label: 'Groups',
    permissions: ['groups:read', 'groups:create', 'groups:update', 'groups:delete', 'groups:manage_members'],
  },
  roles: {
    label: 'Roles',
    permissions: ['roles:read', 'roles:create', 'roles:update', 'roles:delete', 'roles:assign'],
  },
  projects: {
    label: 'Projects',
    permissions: ['projects:read', 'projects:create', 'projects:update', 'projects:delete'],
  },
  forms: {
    label: 'Forms',
    permissions: ['forms:read', 'forms:create', 'forms:update', 'forms:delete', 'forms:publish', 'forms:manage_permissions'],
  },
  responses: {
    label: 'Responses',
    permissions: ['responses:read', 'responses:export', 'responses:delete'],
  },
  connections: {
    label: 'Connections',
    permissions: ['connections:read', 'connections:create', 'connections:update', 'connections:delete', 'connections:use', 'connections:view_credentials'],
  },
  workflows: {
    label: 'Workflows',
    permissions: ['workflows:read', 'workflows:create', 'workflows:update', 'workflows:delete', 'workflows:execute'],
  },
  integrations: {
    label: 'Integrations',
    permissions: ['integrations:read', 'integrations:create', 'integrations:update', 'integrations:delete'],
  },
  audit: {
    label: 'Audit',
    permissions: ['audit:read'],
  },
};

const BUILTIN_ROLE_INFO: Record<string, { description: string; color: 'error' | 'warning' | 'success' | 'info' }> = {
  owner: { description: 'Full control over the organization', color: 'error' },
  admin: { description: 'Manage members, forms, and settings', color: 'warning' },
  member: { description: 'Create and manage own forms', color: 'success' },
  viewer: { description: 'View-only access', color: 'info' },
};

export default function RolesPage() {
  const params = useParams();
  const theme = useTheme();
  const orgId = params.orgId as string;

  // State
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  // Menu state
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuRole, setMenuRole] = useState<Role | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formBaseRole, setFormBaseRole] = useState<string>('');
  const [formPermissions, setFormPermissions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Fetch roles
  const fetchRoles = useCallback(async () => {
    try {
      const response = await fetch(`/api/platform/orgs/${orgId}/roles`);
      if (!response.ok) throw new Error('Failed to fetch roles');
      const data = await response.json();
      setRoles(data.roles || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  // Handlers
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, role: Role) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setMenuRole(role);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setMenuRole(null);
  };

  const handleViewClick = (role: Role) => {
    setSelectedRole(role);
    setViewDialogOpen(true);
    handleMenuClose();
  };

  const handleEditClick = () => {
    if (menuRole && menuRole.type === 'custom') {
      setSelectedRole(menuRole);
      setFormName(menuRole.name);
      setFormDescription(menuRole.description || '');
      setFormBaseRole(menuRole.baseRole || '');
      setFormPermissions(menuRole.permissions);
      setEditDialogOpen(true);
    }
    handleMenuClose();
  };

  const handleDeleteClick = () => {
    if (menuRole && menuRole.type === 'custom') {
      setSelectedRole(menuRole);
      setDeleteDialogOpen(true);
    }
    handleMenuClose();
  };

  const handleCreateRole = async () => {
    if (!formName.trim()) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/platform/orgs/${orgId}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          description: formDescription || undefined,
          baseRole: formBaseRole || undefined,
          permissions: formPermissions,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create role');
      }

      setCreateDialogOpen(false);
      resetForm();
      fetchRoles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedRole || !formName.trim()) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/platform/orgs/${orgId}/roles/${selectedRole.roleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          description: formDescription || undefined,
          baseRole: formBaseRole || undefined,
          permissions: formPermissions,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update role');
      }

      setEditDialogOpen(false);
      resetForm();
      fetchRoles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!selectedRole) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/platform/orgs/${orgId}/roles/${selectedRole.roleId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete role');
      }

      setDeleteDialogOpen(false);
      setSelectedRole(null);
      fetchRoles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  const handlePermissionToggle = (permission: string) => {
    setFormPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((p) => p !== permission)
        : [...prev, permission]
    );
  };

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormBaseRole('');
    setFormPermissions([]);
    setSelectedRole(null);
  };

  // Separate builtin and custom roles
  const builtinRoles = roles.filter((r) => r.type === 'builtin');
  const customRoles = roles.filter((r) => r.type === 'custom');

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
            Roles & Permissions
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage access control with built-in and custom roles
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Create Role
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Built-in Roles */}
      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <LockIcon fontSize="small" />
        Built-in Roles
      </Typography>
      <TableContainer component={Paper} sx={{ mb: 4, bgcolor: alpha(theme.palette.background.paper, 0.6) }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Role</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Permissions</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {builtinRoles.map((role) => {
              const info = BUILTIN_ROLE_INFO[role.roleId];
              return (
                <TableRow key={role.roleId} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label={role.name || role.roleId}
                        size="small"
                        color={info?.color || 'default'}
                        sx={{ textTransform: 'capitalize', fontWeight: 500 }}
                      />
                      <LockIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {info?.description || role.description}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {role.permissions?.length || 0} permissions
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Button size="small" onClick={() => handleViewClick(role)}>
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Custom Roles */}
      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <ShieldIcon fontSize="small" />
        Custom Roles
      </Typography>
      <TableContainer component={Paper} sx={{ bgcolor: alpha(theme.palette.background.paper, 0.6) }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Role</TableCell>
              <TableCell>Base Role</TableCell>
              <TableCell>Permissions</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {customRoles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                  <SecurityIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                  <Typography color="text.secondary">
                    No custom roles yet
                  </Typography>
                  <Button
                    startIcon={<AddIcon />}
                    onClick={() => setCreateDialogOpen(true)}
                    sx={{ mt: 1 }}
                  >
                    Create your first custom role
                  </Button>
                </TableCell>
              </TableRow>
            ) : (
              customRoles.map((role) => (
                <TableRow key={role.roleId} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight={500}>
                        {role.name}
                      </Typography>
                      {role.description && (
                        <Typography variant="caption" color="text.secondary">
                          {role.description}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {role.baseRole ? (
                      <Chip
                        label={role.baseRole}
                        size="small"
                        variant="outlined"
                        sx={{ textTransform: 'capitalize' }}
                      />
                    ) : (
                      <Typography variant="body2" color="text.disabled">None</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge badgeContent={role.permissions?.length || 0} color="primary">
                      <Typography variant="body2">permissions</Typography>
                    </Badge>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="More actions">
                      <IconButton size="small" onClick={(e) => handleMenuOpen(e, role)}>
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
        <MenuItem onClick={() => { if (menuRole) handleViewClick(menuRole); }}>
          <SecurityIcon fontSize="small" sx={{ mr: 1 }} />
          View Permissions
        </MenuItem>
        <MenuItem onClick={handleEditClick} disabled={menuRole?.type === 'builtin'}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Edit Role
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }} disabled={menuRole?.type === 'builtin'}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete Role
        </MenuItem>
      </Menu>

      {/* Create/Edit Role Dialog */}
      <Dialog
        open={createDialogOpen || editDialogOpen}
        onClose={() => { setCreateDialogOpen(false); setEditDialogOpen(false); resetForm(); }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{editDialogOpen ? 'Edit Role' : 'Create Custom Role'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Role Name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              fullWidth
              autoFocus
              placeholder="e.g., Billing Admin, Form Reviewer"
            />
            <TextField
              label="Description"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              fullWidth
              placeholder="What can this role do?"
            />
            <FormControl fullWidth>
              <InputLabel>Inherit from Base Role</InputLabel>
              <Select
                value={formBaseRole}
                label="Inherit from Base Role"
                onChange={(e) => setFormBaseRole(e.target.value)}
              >
                <MenuItem value="">None (start fresh)</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="member">Member</MenuItem>
                <MenuItem value="viewer">Viewer</MenuItem>
              </Select>
            </FormControl>

            <Divider sx={{ my: 1 }} />

            <Typography variant="subtitle2" gutterBottom>
              Permissions
            </Typography>
            {Object.entries(PERMISSION_CATEGORIES).map(([key, category]) => (
              <Accordion key={key} disableGutters sx={{ bgcolor: 'transparent' }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" fontWeight={500}>
                      {category.label}
                    </Typography>
                    <Chip
                      size="small"
                      label={`${category.permissions.filter((p) => formPermissions.includes(p)).length}/${category.permissions.length}`}
                    />
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <FormGroup>
                    {category.permissions.map((perm) => (
                      <FormControlLabel
                        key={perm}
                        control={
                          <Checkbox
                            checked={formPermissions.includes(perm)}
                            onChange={() => handlePermissionToggle(perm)}
                            size="small"
                          />
                        }
                        label={<Typography variant="body2">{perm}</Typography>}
                      />
                    ))}
                  </FormGroup>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setCreateDialogOpen(false); setEditDialogOpen(false); resetForm(); }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={editDialogOpen ? handleUpdateRole : handleCreateRole}
            disabled={saving || !formName.trim()}
          >
            {saving ? 'Saving...' : editDialogOpen ? 'Save Changes' : 'Create Role'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Permissions Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => { setViewDialogOpen(false); setSelectedRole(null); }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SecurityIcon />
            {selectedRole?.name || selectedRole?.roleId} Permissions
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedRole && (
            <Box>
              {selectedRole.baseRole && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  This role inherits permissions from: <strong>{selectedRole.baseRole}</strong>
                </Alert>
              )}
              {Object.entries(PERMISSION_CATEGORIES).map(([key, category]) => {
                const categoryPerms = category.permissions.filter((p) =>
                  selectedRole.permissions.includes(p)
                );
                if (categoryPerms.length === 0) return null;

                return (
                  <Box key={key} sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      {category.label}
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {categoryPerms.map((perm) => (
                        <Chip key={perm} label={perm} size="small" variant="outlined" />
                      ))}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setViewDialogOpen(false); setSelectedRole(null); }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Role Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => { setDeleteDialogOpen(false); setSelectedRole(null); }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Role</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the role <strong>{selectedRole?.name}</strong>?
            This will remove all assignments using this role.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDeleteDialogOpen(false); setSelectedRole(null); }}>
            Cancel
          </Button>
          <Button variant="contained" color="error" onClick={handleDeleteRole} disabled={saving}>
            {saving ? 'Deleting...' : 'Delete Role'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
