/**
 * My Applications View Component
 *
 * Shows user's published applications with edit/unpublish/delete actions.
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  alpha,
  Stack,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { ApplicationCard } from './ApplicationCard';
import { ApplicationPublishDialog } from '@/components/Projects/ApplicationPublishDialog';
import { ApplicationDetailDialog } from './ApplicationDetailDialog';

interface MyApplication {
  id: string;
  name: string;
  summary?: string;
  description?: string;
  version: string;
  category: string;
  tags?: string[];
  icon?: string;
  author?: { name: string; email?: string; url?: string };
  license?: string;
  stats: {
    downloads: number;
    rating?: number;
    reviews: number;
  };
  formsCount: number;
  workflowsCount: number;
  connectionsCount: number;
  publishedAt?: string;
  published: boolean;
  status: 'pending' | 'approved' | 'rejected';
  isOfficial?: boolean;
}

interface MyApplicationsViewProps {
  organizationId?: string;
}

export function MyApplicationsView({ organizationId }: MyApplicationsViewProps) {
  const { user } = useAuth();
  const [applications, setApplications] = useState<MyApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<MyApplication | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [appToDelete, setAppToDelete] = useState<MyApplication | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement; app: MyApplication } | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailApp, setDetailApp] = useState<MyApplication | null>(null);

  useEffect(() => {
    // Use userId (platform format) or _id (fallback for legacy)
    const userId = user?.userId || user?._id;
    if (userId) {
      loadApplications();
    }
  }, [user?.userId, user?._id]);

  const loadApplications = async () => {
    // Use userId (platform format) or _id (fallback for legacy)
    const userId = user?.userId || user?._id;
    if (!userId) {
      setError('User ID not available');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = `/api/marketplace/applications?publishedBy=${encodeURIComponent(userId)}`;
      console.log('[MyApplicationsView] Fetching:', url);

      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[MyApplicationsView] API error:', response.status, errorText);
        throw new Error(`Failed to load applications: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('[MyApplicationsView] Received data:', {
        applicationsCount: data.applications?.length || 0,
        total: data.total,
      });
      setApplications(data.applications || []);
    } catch (err) {
      console.error('[MyApplicationsView] Error loading applications:', err);
      setError(err instanceof Error ? err.message : 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (app: MyApplication) => {
    setSelectedApp(app);
    setEditDialogOpen(true);
    setMenuAnchor(null);
  };

  const handleDelete = (app: MyApplication) => {
    setAppToDelete(app);
    setDeleteDialogOpen(true);
    setMenuAnchor(null);
  };

  const handleTogglePublish = async (app: MyApplication) => {
    try {
      const response = await fetch(`/api/marketplace/applications/${app.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          published: !app.published,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update application');
      }

      await loadApplications();
      setMenuAnchor(null);
    } catch (err) {
      console.error('Error toggling publish:', err);
      setError(err instanceof Error ? err.message : 'Failed to update application');
    }
  };

  const confirmDelete = async () => {
    if (!appToDelete) return;

    try {
      const response = await fetch(`/api/marketplace/applications/${appToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete application');
      }

      await loadApplications();
      setDeleteDialogOpen(false);
      setAppToDelete(null);
    } catch (err) {
      console.error('Error deleting application:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete application');
    }
  };

  const handleViewDetails = (app: MyApplication) => {
    setDetailApp(app);
    setDetailDialogOpen(true);
    setMenuAnchor(null);
  };

  const getStatusChip = (app: MyApplication) => {
    if (app.status === 'approved') {
      return (
        <Chip
          icon={<CheckCircleIcon />}
          label="Approved"
          size="small"
          sx={{
            bgcolor: alpha('#00ED64', 0.1),
            color: '#00ED64',
          }}
        />
      );
    } else if (app.status === 'pending') {
      return (
        <Chip
          icon={<PendingIcon />}
          label="Pending Review"
          size="small"
          sx={{
            bgcolor: alpha('#ff9800', 0.1),
            color: '#ff9800',
          }}
        />
      );
    } else if (app.status === 'rejected') {
      return (
        <Chip
          icon={<CancelIcon />}
          label="Rejected"
          size="small"
          sx={{
            bgcolor: alpha('#f44336', 0.1),
            color: '#f44336',
          }}
        />
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          My Applications
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage your published applications
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {applications.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            bgcolor: alpha('#00ED64', 0.05),
            borderRadius: 2,
            border: '2px dashed',
            borderColor: alpha('#00ED64', 0.3),
          }}
        >
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No applications published yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Publish your first application from the Applications page
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {applications.map((app) => (
            <Grid item xs={12} sm={6} md={4} key={app.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                }}
              >
                <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
                  <IconButton
                    size="small"
                    onClick={(e) => setMenuAnchor({ el: e.currentTarget, app })}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </Box>

                <CardContent sx={{ flexGrow: 1 }}>
                  <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                    {getStatusChip(app)}
                    {app.published && (
                      <Chip
                        label="Published"
                        size="small"
                        sx={{
                          bgcolor: alpha('#2196f3', 0.1),
                          color: '#2196f3',
                        }}
                      />
                    )}
                  </Stack>

                  <Typography variant="h6" gutterBottom>
                    {app.icon} {app.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {app.summary || app.description}
                  </Typography>

                  <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                    <Chip label={`${app.formsCount} forms`} size="small" variant="outlined" />
                    <Chip label={`${app.workflowsCount} workflows`} size="small" variant="outlined" />
                  </Stack>

                  <Typography variant="caption" color="text.secondary">
                    {app.stats.downloads} downloads
                  </Typography>
                </CardContent>

                <CardActions>
                  <Button
                    size="small"
                    startIcon={<EditIcon />}
                    onClick={() => handleEdit(app)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="small"
                    onClick={() => handleViewDetails(app)}
                  >
                    View
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchor?.el}
        open={!!menuAnchor}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem onClick={() => menuAnchor && handleViewDetails(menuAnchor.app)}>
          <ListItemIcon>
            <VisibilityIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View Details</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => menuAnchor && handleEdit(menuAnchor.app)}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => menuAnchor && handleTogglePublish(menuAnchor.app)}>
          <ListItemIcon>
            {menuAnchor?.app.published ? (
              <VisibilityOffIcon fontSize="small" />
            ) : (
              <VisibilityIcon fontSize="small" />
            )}
          </ListItemIcon>
          <ListItemText>
            {menuAnchor?.app.published ? 'Unpublish' : 'Publish'}
          </ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => menuAnchor && handleDelete(menuAnchor.app)}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Edit Dialog */}
      {selectedApp && (
        <ApplicationPublishDialog
          open={editDialogOpen}
          onClose={() => {
            setEditDialogOpen(false);
            setSelectedApp(null);
          }}
          bundle={{
            manifest: {
              name: selectedApp.name,
              description: selectedApp.description,
              version: selectedApp.version,
              category: selectedApp.category,
              tags: selectedApp.tags,
              icon: selectedApp.icon,
              author: selectedApp.author,
              license: selectedApp.license,
            } as any,
            forms: [],
            workflows: [],
            connections: [],
          }}
          onPublished={async () => {
            await loadApplications();
            setEditDialogOpen(false);
            setSelectedApp(null);
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Application</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete &quot;{appToDelete?.name}&quot;? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detail Dialog */}
      {detailApp && (
        <ApplicationDetailDialog
          open={detailDialogOpen}
          onClose={() => {
            setDetailDialogOpen(false);
            setDetailApp(null);
          }}
          applicationId={detailApp.id}
          organizationId={organizationId}
        />
      )}
    </Container>
  );
}
