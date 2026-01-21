'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSWRConfig } from 'swr';
import {
  Box,
  Container,
  Typography,
  Paper,
  TextField,
  Button,
  alpha,
  useTheme as useMuiTheme,
  Divider,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import { Settings, Save, Delete, Download as DownloadIcon } from '@mui/icons-material';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import { useApplication } from '@/contexts/ApplicationContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { DownloadAppDialog } from '@/components/Download/DownloadAppDialog';

/**
 * /apps/[appSlug]/settings
 *
 * App-centric settings page. Configure application name, description, and other settings.
 */
export default function AppSettingsPage() {
  const theme = useMuiTheme();
  const router = useRouter();
  const { mutate: globalMutate } = useSWRConfig();

  const { currentOrgId } = useOrganization();
  const { currentApplication, isLoading: isAppLoading, refreshApplications } = useApplication();

  const [name, setName] = useState(currentApplication?.name || '');
  const [description, setDescription] = useState(currentApplication?.description || '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Update local state when application loads
  useEffect(() => {
    if (currentApplication) {
      setName(currentApplication.name);
      setDescription(currentApplication.description || '');
    }
  }, [currentApplication]);

  const handleSave = async () => {
    if (!currentApplication || !currentOrgId) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/applications/${currentApplication.applicationId}?orgId=${currentOrgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSnackbar({ open: true, message: 'Settings saved successfully', severity: 'success' });
        refreshApplications();
      } else {
        setSnackbar({ open: true, message: data.error || 'Failed to save settings', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Error saving settings', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!currentApplication || !currentOrgId) return;

    setDeleting(true);
    try {
      const response = await fetch(
        `/api/applications/${currentApplication.applicationId}?orgId=${currentOrgId}&force=true`,
        { method: 'DELETE' }
      );

      const data = await response.json();
      if (data.success) {
        // Invalidate SWR cache so ApplicationContext detects the deletion
        globalMutate(
          (key) => typeof key === 'string' && key.startsWith('/api/applications'),
          undefined,
          { revalidate: true }
        );
        // Navigate to home page
        router.push('/');
      } else {
        setSnackbar({ open: true, message: data.error || 'Failed to delete application', severity: 'error' });
        setDeleteDialogOpen(false);
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Error deleting application', severity: 'error' });
      setDeleteDialogOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  if (isAppLoading || !currentApplication) {
    return (
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <NetPadLoader size="large" message="Loading application..." />
      </Box>
    );
  }

  return (
    <Box sx={{ flex: 1, bgcolor: 'background.default', overflow: 'auto' }}>
      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha(theme.palette.background.paper, 0.5) }}>
        <Container maxWidth="lg">
          <Box sx={{ py: { xs: 2, sm: 3 } }}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', fontSize: { xs: '1.75rem', sm: '2.125rem' } }}>
              Settings
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Configure {currentApplication.name}
            </Typography>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper sx={{ p: 4, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <Settings sx={{ color: theme.palette.primary.main }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              General Settings
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              label="Application Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              helperText="The display name for this application"
            />

            <TextField
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              multiline
              rows={3}
              helperText="A brief description of what this application does"
            />

            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <Button
                variant="contained"
                startIcon={<Save />}
                onClick={handleSave}
                disabled={saving}
                sx={{
                  bgcolor: theme.palette.primary.main,
                  textTransform: 'none',
                  fontWeight: 600,
                  '&:hover': { bgcolor: theme.palette.primary.dark },
                }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </Box>
          </Box>

          <Divider sx={{ my: 4 }} />

          {/* Download Section */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <DownloadIcon sx={{ color: '#00ED64' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Download Standalone App
            </Typography>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Export this application as a standalone Next.js project that you can deploy anywhere.
            The downloaded app includes all forms, workflows, and configuration needed to run independently.
          </Typography>

          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => setDownloadDialogOpen(true)}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              borderColor: '#00ED64',
              color: '#00ED64',
              '&:hover': {
                borderColor: '#00CC55',
                bgcolor: 'rgba(0, 237, 100, 0.05)',
              },
            }}
          >
            Download as ZIP
          </Button>

          <Divider sx={{ my: 4 }} />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Delete sx={{ color: theme.palette.error.main }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.error.main }}>
              Danger Zone
            </Typography>
          </Box>

          <Alert severity="warning" sx={{ mb: 2 }}>
            Deleting an application will permanently remove all associated forms, workflows, and data. This action cannot be undone.
          </Alert>

          <Button
            variant="outlined"
            color="error"
            startIcon={<Delete />}
            onClick={() => setDeleteDialogOpen(true)}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Delete Application
          </Button>
        </Paper>
      </Container>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => !deleting && setDeleteDialogOpen(false)}
      >
        <DialogTitle sx={{ color: theme.palette.error.main }}>
          Delete Application
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>{currentApplication?.name}</strong>?
          </DialogContentText>
          <DialogContentText sx={{ mt: 2 }}>
            This will permanently delete:
          </DialogContentText>
          <Box component="ul" sx={{ mt: 1, pl: 2 }}>
            <li>All forms in this application</li>
            <li>All workflows in this application</li>
            <li>All form responses and data</li>
          </Box>
          <DialogContentText sx={{ mt: 2, fontWeight: 600, color: theme.palette.error.main }}>
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            disabled={deleting}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={deleting}
            startIcon={deleting ? null : <Delete />}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            {deleting ? 'Deleting...' : 'Delete Application'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Download Dialog */}
      {currentApplication && currentOrgId && (
        <DownloadAppDialog
          open={downloadDialogOpen}
          onClose={() => setDownloadDialogOpen(false)}
          applicationId={currentApplication.applicationId}
          applicationName={currentApplication.name}
          orgId={currentOrgId}
          formCount={currentApplication.stats?.formsCount || 0}
          workflowCount={currentApplication.stats?.workflowsCount || 0}
        />
      )}
    </Box>
  );
}
