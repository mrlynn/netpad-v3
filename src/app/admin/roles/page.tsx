'use client';

/**
 * Platform Admin - Roles Management
 * 
 * Full CRUD for custom roles across all organizations.
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
  TextField,
  Select,
  FormControl,
  InputLabel,
  MenuItem,
  Alert,
  Chip,
  Skeleton,
  InputAdornment,
  Tooltip,
  TablePagination,
  Breadcrumbs,
  Link as MuiLink,
  IconButton,
  Badge,
  Tabs,
  Tab,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Menu,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormGroup,
  FormControlLabel,
  Checkbox,
  alpha,
  useTheme,
} from '@mui/material';
import Link from 'next/link';
import {
  Search as SearchIcon,
  Security as SecurityIcon,
  Business as BusinessIcon,
  ArrowBack as ArrowBackIcon,
  Lock as LockIcon,
  Shield as ShieldIcon,
  Add as AddIcon,
  MoreVert as MoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import useSWR, { mutate } from 'swr';

interface Role {
  roleId: string;
  name: string;
  slug?: string;
  description?: string;
  type: 'builtin' | 'custom';
  baseRole?: string;
  permissions?: string[];
  organizationId?: string;
  organizationName?: string;
  createdAt?: string;
}

interface Organization {
  id: string;
  name: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const BUILTIN_ROLE_INFO: Record<string, { description: string; color: 'error' | 'warning' | 'success' | 'info' }> = {
  owner: { description: 'Full control over the organization', color: 'error' },
  admin: { description: 'Manage members, forms, and settings', color: 'warning' },
  member: { description: 'Create and manage own forms', color: 'success' },
  viewer: { description: 'View-only access', color: 'info' },
};

const BASE_ROLE_OPTIONS = [
  { value: '', label: 'None (start fresh)' },
  { value: 'admin', label: 'Admin' },
  { value: 'member', label: 'Member' },
  { value: 'viewer', label: 'Viewer' },
];

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

export default function AdminRolesPage() {
  const theme = useTheme();

  // State
  const [tabValue, setTabValue] = useState(0); // 0 = all, 1 = builtin, 2 = custom
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrg, setSelectedOrg] = useState<string>('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
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
  const [formOrgId, setFormOrgId] = useState('');
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formBaseRole, setFormBaseRole] = useState('');
  const [formPermissions, setFormPermissions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Build API URL with filters
  const buildUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (selectedOrg) params.set('orgId', selectedOrg);
    if (tabValue === 1) params.set('type', 'builtin');
    if (tabValue === 2) params.set('type', 'custom');
    params.set('limit', rowsPerPage.toString());
    params.set('offset', (page * rowsPerPage).toString());
    return `/api/admin/roles?${params.toString()}`;
  }, [searchQuery, selectedOrg, tabValue, page, rowsPerPage]);

  // Fetch roles
  const { data, error: fetchError, isLoading } = useSWR(buildUrl(), fetcher, {
    refreshInterval: 30000,
  });

  // Fetch organizations for filter
  const { data: orgsData } = useSWR('/api/admin/organizations', fetcher);

  // Handle different response shapes based on type filter
  const builtinRoles: Role[] = data?.builtinRoles || data?.roles || [];
  const customRoles: Role[] = data?.customRoles || (tabValue === 2 ? data?.roles : []) || [];
  const allRoles: Role[] = tabValue === 0 
    ? [...builtinRoles, ...customRoles]
    : tabValue === 1 
      ? builtinRoles 
      : customRoles;
  const total = data?.total || allRoles.length;
  const organizations: Organization[] = orgsData?.organizations || [];

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setPage(0);
  };

  // Menu handlers
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
      setFormOrgId(menuRole.organizationId || '');
      setFormName(menuRole.name);
      setFormDescription(menuRole.description || '');
      setFormBaseRole(menuRole.baseRole || '');
      setFormPermissions(menuRole.permissions || []);
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

  const handlePermissionToggle = (permission: string) => {
    setFormPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((p) => p !== permission)
        : [...prev, permission]
    );
  };

  const resetForm = () => {
    setFormOrgId('');
    setFormName('');
    setFormDescription('');
    setFormBaseRole('');
    setFormPermissions([]);
    setSelectedRole(null);
    setError(null);
  };

  // Create role
  const handleCreateRole = async () => {
    if (!formName.trim() || !formOrgId) {
      setError('Organization and role name are required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/platform/orgs/${formOrgId}/roles`, {
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
      mutate(buildUrl());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  // Update role
  const handleUpdateRole = async () => {
    if (!selectedRole || !formName.trim()) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/platform/orgs/${selectedRole.organizationId}/roles/${selectedRole.roleId}`, {
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
      mutate(buildUrl());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  // Delete role
  const handleDeleteRole = async () => {
    if (!selectedRole) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/platform/orgs/${selectedRole.organizationId}/roles/${selectedRole.roleId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete role');
      }

      setDeleteDialogOpen(false);
      setSelectedRole(null);
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
        <Alert severity="error">Failed to load roles: {fetchError.message}</Alert>
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
        <Typography color="text.primary">Roles</Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton component={Link} href="/admin">
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h4" fontWeight={600}>
              Roles & Permissions
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage built-in and custom roles across organizations
            </Typography>
          </Box>
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

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab 
            label="All Roles" 
            icon={<SecurityIcon fontSize="small" />} 
            iconPosition="start"
          />
          <Tab 
            label="Built-in" 
            icon={<LockIcon fontSize="small" />} 
            iconPosition="start"
          />
          <Tab 
            label="Custom" 
            icon={<ShieldIcon fontSize="small" />} 
            iconPosition="start"
          />
        </Tabs>
      </Box>

      {/* Filters (only for custom roles) */}
      {tabValue !== 1 && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: alpha(theme.palette.background.paper, 0.6) }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              placeholder="Search roles..."
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
      )}

      {/* Built-in Roles Info (when on builtin tab) */}
      {tabValue === 1 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Built-in roles are available to all organizations and cannot be modified.
        </Alert>
      )}

      {/* Roles Table */}
      <TableContainer component={Paper} sx={{ bgcolor: alpha(theme.palette.background.paper, 0.6) }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Role</TableCell>
              <TableCell>Type</TableCell>
              {tabValue !== 1 && <TableCell>Organization</TableCell>}
              <TableCell>Description</TableCell>
              <TableCell>Permissions</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton variant="text" width={120} /></TableCell>
                  <TableCell><Skeleton variant="text" width={80} /></TableCell>
                  {tabValue !== 1 && <TableCell><Skeleton variant="text" width={100} /></TableCell>}
                  <TableCell><Skeleton variant="text" width={200} /></TableCell>
                  <TableCell><Skeleton variant="text" width={60} /></TableCell>
                  <TableCell><Skeleton variant="text" width={40} /></TableCell>
                </TableRow>
              ))
            ) : allRoles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={tabValue === 1 ? 5 : 6} align="center" sx={{ py: 6 }}>
                  <SecurityIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                  <Typography color="text.secondary">
                    {searchQuery || selectedOrg ? 'No roles match your filters' : 'No custom roles yet'}
                  </Typography>
                  {tabValue === 2 && !searchQuery && !selectedOrg && (
                    <Button
                      startIcon={<AddIcon />}
                      onClick={() => setCreateDialogOpen(true)}
                      sx={{ mt: 1 }}
                    >
                      Create your first custom role
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              allRoles.map((role) => {
                const builtinInfo = BUILTIN_ROLE_INFO[role.roleId];
                const isBuiltin = role.type === 'builtin';

                return (
                  <TableRow key={`${role.roleId}-${role.organizationId || 'global'}`} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {isBuiltin ? (
                          <Chip
                            label={role.name || role.roleId}
                            size="small"
                            color={builtinInfo?.color || 'default'}
                            sx={{ textTransform: 'capitalize', fontWeight: 500 }}
                          />
                        ) : (
                          <Typography variant="body2" fontWeight={500}>
                            {role.name}
                          </Typography>
                        )}
                        {isBuiltin && (
                          <Tooltip title="Built-in role">
                            <LockIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={isBuiltin ? 'Built-in' : 'Custom'}
                        size="small"
                        variant="outlined"
                        color={isBuiltin ? 'default' : 'primary'}
                      />
                    </TableCell>
                    {tabValue !== 1 && (
                      <TableCell>
                        {role.organizationName ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <BusinessIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                            <Tooltip title={`Org ID: ${role.organizationId}`}>
                              <Typography variant="body2">{role.organizationName}</Typography>
                            </Tooltip>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.disabled">
                            All Orgs
                          </Typography>
                        )}
                      </TableCell>
                    )}
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {builtinInfo?.description || role.description || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {role.permissions ? (
                        <Badge badgeContent={role.permissions.length} color="primary">
                          <Typography variant="body2">permissions</Typography>
                        </Badge>
                      ) : (
                        <Typography variant="body2" color="text.disabled">
                          {isBuiltin ? 'Varies' : '—'}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {isBuiltin ? (
                        <Button size="small" onClick={() => handleViewClick(role)}>
                          View
                        </Button>
                      ) : (
                        <Tooltip title="More actions">
                          <IconButton size="small" onClick={(e) => handleMenuOpen(e, role)}>
                            <MoreIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        {tabValue !== 1 && (
          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[10, 25, 50, 100]}
          />
        )}
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
            {!editDialogOpen && (
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
            )}
            {editDialogOpen && (
              <TextField
                label="Organization"
                value={selectedRole?.organizationName || ''}
                disabled
                fullWidth
              />
            )}
            <TextField
              label="Role Name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              fullWidth
              required
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
                {BASE_ROLE_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
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
            disabled={saving || !formName.trim() || (!editDialogOpen && !formOrgId)}
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
              {selectedRole.permissions && selectedRole.permissions.length > 0 ? (
                Object.entries(PERMISSION_CATEGORIES).map(([key, category]) => {
                  const categoryPerms = category.permissions.filter((p) =>
                    selectedRole.permissions!.includes(p)
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
                })
              ) : (
                <Typography color="text.secondary">
                  {selectedRole.type === 'builtin' 
                    ? 'Built-in role permissions vary by context.'
                    : 'No explicit permissions assigned.'}
                </Typography>
              )}
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
            Are you sure you want to delete the role <strong>{selectedRole?.name}</strong> from{' '}
            <strong>{selectedRole?.organizationName}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
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
    </Container>
  );
}
