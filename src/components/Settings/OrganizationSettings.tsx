'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  alpha,
  Tooltip,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Avatar,
  Menu,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Collapse,
  ListItemButton,
  ListItemIcon,
} from '@mui/material';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import {
  Add,
  Business,
  People,
  Settings,
  MoreVert,
  PersonAdd,
  Delete,
  Edit,
  Check,
  ContentCopy,
  ExpandMore,
  ExpandLess,
  Folder,
  Apps,
  Description,
  AccountTree,
  RestartAlt,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';

interface Organization {
  orgId: string;
  name: string;
  slug: string;
  plan: 'free' | 'pro' | 'enterprise';
  role: string;
  createdAt: string;
}

interface OrgMember {
  userId: string;
  email: string;
  displayName?: string;
  role: string;
}

interface Project {
  projectId: string;
  name: string;
  slug?: string;
}

interface Application {
  applicationId: string;
  name: string;
  slug?: string;
  projectId: string;
  stats?: {
    formsCount?: number;
    workflowsCount?: number;
  };
}

interface OrgHierarchy {
  projects: Project[];
  applications: Application[];
}

export function OrganizationSettings() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create org dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgSlug, setNewOrgSlug] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Manage org dialog
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Invite dialog
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'member' | 'admin' | 'viewer'>('member');
  const [inviting, setInviting] = useState(false);

  // Menu
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuOrg, setMenuOrg] = useState<Organization | null>(null);

  // Delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orgToDelete, setOrgToDelete] = useState<Organization | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Reset confirmation dialog
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [orgToReset, setOrgToReset] = useState<Organization | null>(null);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetResult, setResetResult] = useState<{
    deleted: { forms: number; workflows: number; applications: number; projects: number; clusters: number; connections: number };
    recreated: { project: boolean; application: boolean };
  } | null>(null);

  // Hierarchy view state
  const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set());
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [orgHierarchies, setOrgHierarchies] = useState<Record<string, OrgHierarchy>>({});
  const [loadingHierarchy, setLoadingHierarchy] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/organizations');
      const data = await response.json();

      if (response.ok) {
        setOrganizations(data.organizations || []);
      } else {
        setError(data.error || 'Failed to load organizations');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrgHierarchy = async (orgId: string) => {
    if (orgHierarchies[orgId] || loadingHierarchy[orgId]) return;

    setLoadingHierarchy(prev => ({ ...prev, [orgId]: true }));
    try {
      // Fetch projects and applications for this org
      const [projectsRes, appsRes] = await Promise.all([
        fetch(`/api/projects?orgId=${orgId}`),
        fetch(`/api/applications?orgId=${orgId}&includeStats=true`),
      ]);

      const projectsData = await projectsRes.json();
      const appsData = await appsRes.json();

      setOrgHierarchies(prev => ({
        ...prev,
        [orgId]: {
          projects: projectsData.projects || [],
          applications: appsData.applications || [],
        },
      }));
    } catch (err) {
      console.error('Failed to load org hierarchy:', err);
    } finally {
      setLoadingHierarchy(prev => ({ ...prev, [orgId]: false }));
    }
  };

  const toggleOrgExpanded = (orgId: string) => {
    setExpandedOrgs(prev => {
      const next = new Set(prev);
      if (next.has(orgId)) {
        next.delete(orgId);
      } else {
        next.add(orgId);
        // Fetch hierarchy data when expanding
        fetchOrgHierarchy(orgId);
      }
      return next;
    });
  };

  const toggleProjectExpanded = (projectId: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  const handleCreateOrg = async () => {
    if (!newOrgName || !newOrgSlug) {
      setCreateError('Name and slug are required');
      return;
    }

    try {
      setCreating(true);
      setCreateError(null);

      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newOrgName, slug: newOrgSlug }),
      });

      const data = await response.json();

      if (response.ok) {
        setCreateDialogOpen(false);
        setNewOrgName('');
        setNewOrgSlug('');
        fetchOrganizations();
      } else {
        setCreateError(data.error || 'Failed to create organization');
      }
    } catch (err) {
      setCreateError('Failed to connect to server');
    } finally {
      setCreating(false);
    }
  };

  const handleManageOrg = async (org: Organization) => {
    setSelectedOrg(org);
    setManageDialogOpen(true);
    setLoadingMembers(true);

    try {
      const response = await fetch(`/api/organizations/${org.orgId}`);
      const data = await response.json();

      if (response.ok && data.members) {
        setMembers(data.members);
      }
    } catch (err) {
      console.error('Failed to load members:', err);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleInvite = async () => {
    if (!selectedOrg || !inviteEmail) return;

    try {
      setInviting(true);

      const response = await fetch(`/api/organizations/${selectedOrg.orgId}/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      if (response.ok) {
        setInviteDialogOpen(false);
        setInviteEmail('');
        setInviteRole('member');
        // Refresh members
        handleManageOrg(selectedOrg);
      }
    } catch (err) {
      console.error('Failed to invite:', err);
    } finally {
      setInviting(false);
    }
  };

  const handleDeleteOrg = async () => {
    if (!orgToDelete) return;

    try {
      setDeleting(true);
      setDeleteError(null);

      const response = await fetch(`/api/organizations/${orgToDelete.orgId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        setDeleteDialogOpen(false);
        setOrgToDelete(null);
        // Refresh organizations list
        await fetchOrganizations();
      } else {
        setDeleteError(data.error || 'Failed to delete organization');
      }
    } catch (err) {
      setDeleteError('Failed to connect to server');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteClick = () => {
    if (menuOrg) {
      setOrgToDelete(menuOrg);
      setDeleteDialogOpen(true);
    }
    setMenuAnchor(null);
  };

  const handleResetClick = () => {
    if (menuOrg) {
      setOrgToReset(menuOrg);
      setResetDialogOpen(true);
      setResetResult(null);
      setResetError(null);
    }
    setMenuAnchor(null);
  };

  const handleResetOrg = async () => {
    if (!orgToReset) return;

    try {
      setResetting(true);
      setResetError(null);
      setResetResult(null);

      const response = await fetch(`/api/organizations/${orgToReset.orgId}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deleteClusters: true,
          deleteConnections: true,
          deleteForms: true,
          deleteWorkflows: true,
          deleteApplications: true,
          deleteProjects: true,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResetResult({
          deleted: data.deleted,
          recreated: data.recreated,
        });
        // Refresh hierarchy data for this org
        setOrgHierarchies(prev => {
          const next = { ...prev };
          delete next[orgToReset.orgId];
          return next;
        });
        // Re-fetch if expanded
        if (expandedOrgs.has(orgToReset.orgId)) {
          fetchOrgHierarchy(orgToReset.orgId);
        }
      } else {
        setResetError(data.error || data.errors?.join(', ') || 'Failed to reset organization');
      }
    } catch (err) {
      setResetError('Failed to connect to server');
    } finally {
      setResetting(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'enterprise':
        return '#9c27b0';
      case 'pro':
        return '#00ED64';
      default:
        return '#666';
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner':
        return { label: 'Owner', color: '#00ED64' };
      case 'admin':
        return { label: 'Admin', color: '#2196f3' };
      case 'member':
        return { label: 'Member', color: '#666' };
      default:
        return { label: role, color: '#666' };
    }
  };

  if (loading) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <NetPadLoader size="large" variant="ascii" message="Loading..." />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Organizations
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your organizations and team members
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setCreateDialogOpen(true)}
          sx={{
            bgcolor: '#00ED64',
            color: '#001E2B',
            fontWeight: 600,
            '&:hover': { bgcolor: '#00c853' },
          }}
        >
          Create Organization
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {organizations.length === 0 ? (
        <Card
          sx={{
            border: '2px dashed',
            borderColor: 'divider',
            bgcolor: 'transparent',
            textAlign: 'center',
            py: 6,
          }}
        >
          <Business sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No organizations yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Create an organization to manage forms and connections for your team.
          </Typography>
          <Button
            variant="outlined"
            startIcon={<Add />}
            onClick={() => setCreateDialogOpen(true)}
            sx={{ borderColor: '#00ED64', color: '#00ED64' }}
          >
            Create Your First Organization
          </Button>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {organizations.map((org) => {
            const roleBadge = getRoleBadge(org.role);
            return (
              <Grid item xs={12} sm={6} md={4} key={org.orgId}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    border: '1px solid',
                    borderColor: 'divider',
                    transition: 'border-color 0.2s',
                    '&:hover': {
                      borderColor: '#00ED64',
                    },
                  }}
                >
                  <CardContent sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                          {org.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          /{org.slug}
                        </Typography>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          setMenuAnchor(e.currentTarget);
                          setMenuOrg(org);
                        }}
                      >
                        <MoreVert fontSize="small" />
                      </IconButton>
                    </Box>

                    <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                      <Chip
                        label={org.plan.charAt(0).toUpperCase() + org.plan.slice(1)}
                        size="small"
                        sx={{
                          bgcolor: alpha(getPlanColor(org.plan), 0.1),
                          color: getPlanColor(org.plan),
                          fontWeight: 500,
                        }}
                      />
                      <Chip
                        label={roleBadge.label}
                        size="small"
                        sx={{
                          bgcolor: alpha(roleBadge.color, 0.1),
                          color: roleBadge.color,
                          fontWeight: 500,
                        }}
                      />
                    </Box>
                  </CardContent>

                  <CardActions sx={{ px: 2, pb: 2, flexWrap: 'wrap', gap: 1 }}>
                    <Button
                      size="small"
                      startIcon={<People />}
                      onClick={() => handleManageOrg(org)}
                      sx={{ color: 'text.secondary' }}
                    >
                      Manage Team
                    </Button>
                    <Button
                      size="small"
                      startIcon={<Settings />}
                      onClick={() => handleManageOrg(org)}
                      sx={{ color: 'text.secondary' }}
                    >
                      Settings
                    </Button>
                    <Button
                      size="small"
                      startIcon={expandedOrgs.has(org.orgId) ? <ExpandLess /> : <AccountTree />}
                      onClick={() => toggleOrgExpanded(org.orgId)}
                      sx={{ color: expandedOrgs.has(org.orgId) ? '#00ED64' : 'text.secondary' }}
                    >
                      {expandedOrgs.has(org.orgId) ? 'Hide' : 'View'} Hierarchy
                    </Button>
                  </CardActions>

                  {/* Hierarchy View */}
                  <Collapse in={expandedOrgs.has(org.orgId)}>
                    <Box sx={{ px: 2, pb: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                      {loadingHierarchy[org.orgId] ? (
                        <Box sx={{ py: 2, textAlign: 'center' }}>
                          <NetPadLoader size="small" variant="svg" showPhrases={false} />
                        </Box>
                      ) : orgHierarchies[org.orgId] ? (
                        <List dense sx={{ py: 1 }}>
                          {orgHierarchies[org.orgId].projects.length === 0 ? (
                            <ListItem>
                              <ListItemText
                                primary="No projects yet"
                                primaryTypographyProps={{ color: 'text.secondary', fontSize: '0.875rem' }}
                              />
                            </ListItem>
                          ) : (
                            orgHierarchies[org.orgId].projects.map((project) => {
                              const projectApps = orgHierarchies[org.orgId].applications.filter(
                                app => app.projectId === project.projectId
                              );
                              const isProjectExpanded = expandedProjects.has(project.projectId);

                              return (
                                <Box key={project.projectId}>
                                  <ListItemButton
                                    onClick={() => toggleProjectExpanded(project.projectId)}
                                    sx={{ py: 0.5, borderRadius: 1 }}
                                  >
                                    <ListItemIcon sx={{ minWidth: 32 }}>
                                      <Folder sx={{ fontSize: 18, color: '#00ED64' }} />
                                    </ListItemIcon>
                                    <ListItemText
                                      primary={project.name}
                                      secondary={`${projectApps.length} app${projectApps.length !== 1 ? 's' : ''}`}
                                      primaryTypographyProps={{ fontWeight: 500, fontSize: '0.875rem' }}
                                      secondaryTypographyProps={{ fontSize: '0.75rem' }}
                                    />
                                    {projectApps.length > 0 && (
                                      isProjectExpanded ? <ExpandLess sx={{ fontSize: 18 }} /> : <ExpandMore sx={{ fontSize: 18 }} />
                                    )}
                                  </ListItemButton>

                                  <Collapse in={isProjectExpanded}>
                                    <List dense sx={{ pl: 3 }}>
                                      {projectApps.map((app) => (
                                        <ListItemButton
                                          key={app.applicationId}
                                          onClick={() => router.push(`/apps/${app.slug || app.applicationId}`)}
                                          sx={{ py: 0.5, borderRadius: 1 }}
                                        >
                                          <ListItemIcon sx={{ minWidth: 32 }}>
                                            <Apps sx={{ fontSize: 16, color: 'text.secondary' }} />
                                          </ListItemIcon>
                                          <ListItemText
                                            primary={app.name}
                                            secondary={
                                              app.stats
                                                ? `${app.stats.formsCount || 0} forms, ${app.stats.workflowsCount || 0} workflows`
                                                : undefined
                                            }
                                            primaryTypographyProps={{ fontSize: '0.8125rem' }}
                                            secondaryTypographyProps={{ fontSize: '0.7rem' }}
                                          />
                                        </ListItemButton>
                                      ))}
                                      {projectApps.length === 0 && (
                                        <ListItem sx={{ py: 0.5 }}>
                                          <ListItemText
                                            primary="No applications"
                                            primaryTypographyProps={{ color: 'text.secondary', fontSize: '0.8125rem' }}
                                          />
                                        </ListItem>
                                      )}
                                    </List>
                                  </Collapse>
                                </Box>
                              );
                            })
                          )}
                        </List>
                      ) : null}
                    </Box>
                  </Collapse>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem onClick={() => {
          if (menuOrg) handleManageOrg(menuOrg);
          setMenuAnchor(null);
        }}>
          <Settings sx={{ mr: 1, fontSize: 18 }} />
          Settings
        </MenuItem>
        <MenuItem
          onClick={handleResetClick}
          sx={{ color: 'warning.main' }}
          disabled={menuOrg?.role !== 'owner'}
        >
          <RestartAlt sx={{ mr: 1, fontSize: 18 }} />
          Reset (Dev)
        </MenuItem>
        <MenuItem
          onClick={handleDeleteClick}
          sx={{ color: 'error.main' }}
          disabled={menuOrg?.role !== 'owner'}
        >
          <Delete sx={{ mr: 1, fontSize: 18 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Create Organization Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create Organization</DialogTitle>
        <DialogContent>
          {createError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {createError}
            </Alert>
          )}
          <TextField
            autoFocus
            label="Organization Name"
            fullWidth
            value={newOrgName}
            onChange={(e) => {
              setNewOrgName(e.target.value);
              setNewOrgSlug(generateSlug(e.target.value));
            }}
            sx={{ mt: 1, mb: 2 }}
          />
          <TextField
            label="URL Slug"
            fullWidth
            value={newOrgSlug}
            onChange={(e) => setNewOrgSlug(e.target.value)}
            helperText="Only lowercase letters, numbers, and hyphens"
            InputProps={{
              startAdornment: (
                <Typography color="text.secondary" sx={{ mr: 0.5 }}>
                  /
                </Typography>
              ),
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreateOrg}
            variant="contained"
            disabled={creating || !newOrgName || !newOrgSlug}
            sx={{ bgcolor: '#00ED64', color: '#001E2B', '&:hover': { bgcolor: '#00c853' } }}
          >
            {creating ? <NetPadLoader size="small" variant="svg" showPhrases={false} /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Manage Organization Dialog */}
      <Dialog
        open={manageDialogOpen}
        onClose={() => setManageDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Business sx={{ color: '#00ED64' }} />
            {selectedOrg?.name}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
            Team Members
          </Typography>

          {loadingMembers ? (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <NetPadLoader size="small" variant="svg" showPhrases={false} />
            </Box>
          ) : (
            <List>
              {members.map((member) => {
                const badge = getRoleBadge(member.role);
                return (
                  <ListItem key={member.userId}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: '#00ED64', color: '#001E2B' }}>
                        {(member.displayName || member.email)[0].toUpperCase()}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={member.displayName || member.email.split('@')[0]}
                      secondary={member.email}
                    />
                    <ListItemSecondaryAction>
                      <Chip
                        label={badge.label}
                        size="small"
                        sx={{
                          bgcolor: alpha(badge.color, 0.1),
                          color: badge.color,
                        }}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                );
              })}
            </List>
          )}

          <Button
            startIcon={<PersonAdd />}
            onClick={() => setInviteDialogOpen(true)}
            sx={{ mt: 2, color: '#00ED64' }}
          >
            Invite Member
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManageDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Invite Member Dialog */}
      <Dialog
        open={inviteDialogOpen}
        onClose={() => setInviteDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Invite Team Member</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="Email Address"
            type="email"
            fullWidth
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            sx={{ mt: 1, mb: 2 }}
          />
          <FormControl fullWidth>
            <InputLabel>Role</InputLabel>
            <Select
              value={inviteRole}
              label="Role"
              onChange={(e) => setInviteRole(e.target.value as any)}
            >
              <MenuItem value="viewer">Viewer - Can view forms and responses</MenuItem>
              <MenuItem value="member">Member - Can create and edit forms</MenuItem>
              <MenuItem value="admin">Admin - Full access to organization</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleInvite}
            variant="contained"
            disabled={inviting || !inviteEmail}
            sx={{ bgcolor: '#00ED64', color: '#001E2B', '&:hover': { bgcolor: '#00c853' } }}
          >
            {inviting ? <NetPadLoader size="small" variant="svg" showPhrases={false} /> : 'Send Invite'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          if (!deleting) {
            setDeleteDialogOpen(false);
            setOrgToDelete(null);
            setDeleteError(null);
          }
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ color: 'error.main' }}>
          Delete Organization
        </DialogTitle>
        <DialogContent>
          {deleteError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {deleteError}
            </Alert>
          )}
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to delete <strong>{orgToDelete?.name}</strong>?
          </Typography>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This action cannot be undone. All forms, connections, and data associated with this organization will be permanently deleted.
          </Alert>
          <Typography variant="body2" color="text.secondary">
            Type the organization name to confirm: <strong>{orgToDelete?.name}</strong>
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDeleteDialogOpen(false);
              setOrgToDelete(null);
              setDeleteError(null);
            }}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteOrg}
            variant="contained"
            color="error"
            disabled={deleting}
            startIcon={deleting ? <NetPadLoader size="small" variant="svg" showPhrases={false} /> : <Delete />}
          >
            {deleting ? 'Deleting...' : 'Delete Organization'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reset Confirmation Dialog */}
      <Dialog
        open={resetDialogOpen}
        onClose={() => {
          if (!resetting) {
            setResetDialogOpen(false);
            setOrgToReset(null);
            setResetError(null);
            setResetResult(null);
          }
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ color: 'warning.main', display: 'flex', alignItems: 'center', gap: 1 }}>
          <RestartAlt />
          Reset Organization
        </DialogTitle>
        <DialogContent>
          {resetError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {resetError}
            </Alert>
          )}
          {resetResult ? (
            <Box>
              <Alert severity="success" sx={{ mb: 2 }}>
                Organization reset successfully!
              </Alert>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Deleted:
              </Typography>
              <Box sx={{ pl: 2, mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Forms: {resetResult.deleted.forms}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Workflows: {resetResult.deleted.workflows}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Applications: {resetResult.deleted.applications}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Projects: {resetResult.deleted.projects}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Clusters: {resetResult.deleted.clusters}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Connections: {resetResult.deleted.connections}
                </Typography>
              </Box>
              {resetResult.recreated.project && (
                <Alert severity="info" sx={{ mb: 1 }}>
                  A default project and application have been recreated.
                </Alert>
              )}
            </Box>
          ) : (
            <Box>
              <Typography variant="body1" sx={{ mb: 2 }}>
                Are you sure you want to reset <strong>{orgToReset?.name}</strong>?
              </Typography>
              <Alert severity="warning" sx={{ mb: 2 }}>
                This will delete ALL data associated with this organization:
                <Box component="ul" sx={{ m: 0, pl: 2 }}>
                  <li>All forms and submissions</li>
                  <li>All workflows</li>
                  <li>All applications</li>
                  <li>All projects</li>
                  <li>All provisioned clusters</li>
                  <li>All database connections</li>
                </Box>
              </Alert>
              <Alert severity="info" sx={{ mb: 2 }}>
                The organization itself will be kept, and a default project and application will be recreated.
              </Alert>
              <Typography variant="body2" color="text.secondary">
                This action is intended for development and testing purposes.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setResetDialogOpen(false);
              setOrgToReset(null);
              setResetError(null);
              setResetResult(null);
            }}
            disabled={resetting}
          >
            {resetResult ? 'Close' : 'Cancel'}
          </Button>
          {!resetResult && (
            <Button
              onClick={handleResetOrg}
              variant="contained"
              color="warning"
              disabled={resetting}
              startIcon={resetting ? <NetPadLoader size="small" variant="svg" showPhrases={false} /> : <RestartAlt />}
            >
              {resetting ? 'Resetting...' : 'Reset Organization'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
