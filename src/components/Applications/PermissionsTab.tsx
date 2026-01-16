/**
 * Permissions Tab Component (Phase 10)
 * 
 * Displays and manages permissions for an application
 */

'use client';

import React, { useState } from 'react';
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
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Alert,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  Tooltip,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Add,
  MoreVert,
  Delete,
  Edit,
  Person,
  PersonAdd,
  CheckCircle,
  Cancel,
} from '@mui/icons-material';
import { NetPadLoader, NetPadSpinner } from '@/components/common/NetPadLoader';
import Link from 'next/link';
import { ApplicationPermission, ApplicationRole } from '@/types/application';
import { fetcher } from '@/lib/swr';
import useSWR from 'swr';

interface PermissionsTabProps {
  applicationId: string;
  orgId: string;
  projectId: string;
}

interface PermissionsResponse {
  success: boolean;
  permissions?: Array<ApplicationPermission & {
    userEmail?: string;
    userName?: string;
    grantedByName?: string;
  }>;
}

interface OrgMember {
  userId: string;
  email: string;
  displayName?: string;
}

export function PermissionsTab({ applicationId, orgId, projectId }: PermissionsTabProps) {
  const theme = useTheme();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement; permission: ApplicationPermission } | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<ApplicationRole>('viewer');
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [adding, setAdding] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { data, error: fetchError, isLoading, mutate } = useSWR<PermissionsResponse>(
    `/api/applications/${applicationId}/permissions?orgId=${orgId}`,
    fetcher
  );

  const permissions = data?.permissions || [];

  // Load org members when dialog opens
  const loadOrgMembers = async () => {
    setLoadingMembers(true);
    try {
      const response = await fetch(`/api/organizations/${orgId}/members`);
      if (response.ok) {
        const data = await response.json();
        setOrgMembers(data.members || []);
      }
    } catch (error) {
      console.error('Failed to load org members:', error);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleAddDialogOpen = () => {
    setAddDialogOpen(true);
    setSelectedUserId('');
    setSelectedRole('viewer');
    setError(null);
    loadOrgMembers();
  };

  const handleAddDialogClose = () => {
    setAddDialogOpen(false);
    setSelectedUserId('');
    setSelectedRole('viewer');
    setError(null);
  };

  const handleAddPermission = async () => {
    if (!selectedUserId) {
      setError('Please select a user');
      return;
    }

    setAdding(true);
    setError(null);

    try {
      const response = await fetch(`/api/applications/${applicationId}/permissions?orgId=${orgId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserId,
          role: selectedRole,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess('Permission granted successfully');
        handleAddDialogClose();
        await mutate();
      } else {
        setError(data.error || 'Failed to grant permission');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to grant permission');
    } finally {
      setAdding(false);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, permission: ApplicationPermission) => {
    setMenuAnchor({ el: event.currentTarget, permission });
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleUpdateRole = async (permission: ApplicationPermission, newRole: ApplicationRole) => {
    setUpdating(permission.permissionId);
    handleMenuClose();

    try {
      const response = await fetch(
        `/api/applications/${applicationId}/permissions/${permission.permissionId}?orgId=${orgId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: newRole }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess('Permission updated successfully');
        await mutate();
      } else {
        setError(data.error || 'Failed to update permission');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to update permission');
    } finally {
      setUpdating(null);
    }
  };

  const handleDeletePermission = async (permission: ApplicationPermission) => {
    if (!confirm(`Revoke ${permission.role} permission from this user?`)) {
      return;
    }

    setDeleting(permission.permissionId);
    handleMenuClose();

    try {
      const response = await fetch(
        `/api/applications/${applicationId}/permissions/${permission.permissionId}?orgId=${orgId}`,
        {
          method: 'DELETE',
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess('Permission revoked successfully');
        await mutate();
      } else {
        setError(data.error || 'Failed to revoke permission');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to revoke permission');
    } finally {
      setDeleting(null);
    }
  };

  const getRoleColor = (role: ApplicationRole) => {
    switch (role) {
      case 'owner':
        return theme.palette.error.main;
      case 'editor':
        return theme.palette.primary.main;
      case 'analyst':
        return theme.palette.info.main;
      case 'viewer':
        return theme.palette.text.secondary;
      default:
        return theme.palette.text.secondary;
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

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
        <NetPadLoader size="small" message="Loading permissions..." />
      </Box>
    );
  }

  if (fetchError) {
    return (
      <Alert severity="error">
        Failed to load permissions. You may not have permission to view this application's permissions.
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Permissions ({permissions.length})
        </Typography>
        <Button
          variant="contained"
          startIcon={<PersonAdd />}
          onClick={handleAddDialogOpen}
          sx={{ textTransform: 'none' }}
        >
          Add User
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {permissions.length === 0 ? (
        <Paper
          sx={{
            p: 6,
            textAlign: 'center',
            bgcolor: alpha(theme.palette.background.paper, 0.5),
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: 2,
          }}
        >
          <Person sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" sx={{ color: 'text.primary', mb: 1 }}>
            No permissions set
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Add users to grant specific permissions on this application
          </Typography>
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            onClick={handleAddDialogOpen}
            sx={{ textTransform: 'none' }}
          >
            Add First User
          </Button>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Granted By</TableCell>
                <TableCell>Granted At</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {permissions.map((permission) => (
                <TableRow key={permission.permissionId}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Person sx={{ fontSize: 20, color: 'text.secondary' }} />
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {permission.userName || permission.userEmail || permission.userId}
                        </Typography>
                        {permission.userEmail && permission.userName && (
                          <Typography variant="caption" color="text.secondary">
                            {permission.userEmail}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={permission.role}
                      size="small"
                      sx={{
                        bgcolor: alpha(getRoleColor(permission.role), 0.15),
                        color: getRoleColor(permission.role),
                        fontWeight: 600,
                        textTransform: 'capitalize',
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {permission.grantedByName || 'System'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {formatDate(permission.grantedAt)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, permission)}
                      disabled={updating === permission.permissionId || deleting === permission.permissionId}
                    >
                      {updating === permission.permissionId || deleting === permission.permissionId ? (
                        <NetPadSpinner size={20} />
                      ) : (
                        <MoreVert fontSize="small" />
                      )}
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add Permission Dialog */}
      <Dialog open={addDialogOpen} onClose={handleAddDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>Add User Permission</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {orgMembers.length === 0 && !loadingMembers ? (
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  No other members in this organization yet.
                </Typography>
                <Typography variant="body2">
                  To add users to this application, first invite them to your organization in{' '}
                  <Link href="/settings?tab=organizations" style={{ color: theme.palette.primary.main }}>
                    Settings → Organizations
                  </Link>
                  .
                </Typography>
              </Alert>
            ) : (
              <Autocomplete
                options={orgMembers}
                getOptionLabel={(option) => option.displayName || option.email || option.userId}
                loading={loadingMembers}
                value={orgMembers.find((m) => m.userId === selectedUserId) || null}
                onChange={(_, newValue) => {
                  setSelectedUserId(newValue?.userId || '');
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Select User"
                    placeholder={orgMembers.length === 0 ? "No members available" : "Search for a user..."}
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: <Person sx={{ mr: 1, color: 'text.secondary' }} />,
                    }}
                    helperText={
                      orgMembers.length === 0
                        ? "Invite members in Settings → Organizations"
                        : `${orgMembers.length} member${orgMembers.length !== 1 ? 's' : ''} available`
                    }
                  />
                )}
                renderOption={(props, option) => (
                  <Box component="li" {...props}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {option.displayName || option.email}
                      </Typography>
                      {option.displayName && option.email && (
                        <Typography variant="caption" color="text.secondary">
                          {option.email}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                )}
              />
            )}

            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={selectedRole}
                label="Role"
                onChange={(e) => setSelectedRole(e.target.value as ApplicationRole)}
              >
                <MenuItem value="owner">Owner - Full control</MenuItem>
                <MenuItem value="editor">Editor - Can edit and create releases</MenuItem>
                <MenuItem value="analyst">Analyst - Can view and analyze</MenuItem>
                <MenuItem value="viewer">Viewer - Read-only access</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleAddDialogClose}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddPermission}
            disabled={adding || !selectedUserId}
            startIcon={adding ? <NetPadSpinner size={16} /> : <CheckCircle />}
          >
            {adding ? 'Adding...' : 'Add Permission'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Permission Menu */}
      <Menu
        anchorEl={menuAnchor?.el}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={() => menuAnchor && handleUpdateRole(menuAnchor.permission, 'owner')}>
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Change to Owner" />
        </MenuItem>
        <MenuItem onClick={() => menuAnchor && handleUpdateRole(menuAnchor.permission, 'editor')}>
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Change to Editor" />
        </MenuItem>
        <MenuItem onClick={() => menuAnchor && handleUpdateRole(menuAnchor.permission, 'analyst')}>
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Change to Analyst" />
        </MenuItem>
        <MenuItem onClick={() => menuAnchor && handleUpdateRole(menuAnchor.permission, 'viewer')}>
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Change to Viewer" />
        </MenuItem>
        <MenuItem
          onClick={() => menuAnchor && handleDeletePermission(menuAnchor.permission)}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <Delete fontSize="small" sx={{ color: 'error.main' }} />
          </ListItemIcon>
          <ListItemText primary="Revoke Permission" primaryTypographyProps={{ color: 'error' }} />
        </MenuItem>
      </Menu>
    </Box>
  );
}
