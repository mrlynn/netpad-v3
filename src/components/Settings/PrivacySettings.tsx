'use client';

import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Switch,
  Divider,
  Alert,
  Link,
  alpha,
  useTheme,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
} from '@mui/material';
import CookieIcon from '@mui/icons-material/Cookie';
import PrivacyTipIcon from '@mui/icons-material/PrivacyTip';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import DownloadIcon from '@mui/icons-material/Download';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useConsent } from '@/contexts/ConsentContext';
import { CATEGORY_INFO } from '@/types/consent';
import { useAuth } from '@/contexts/AuthContext';
import { SettingsSection, SettingsToggle } from './index';

export function PrivacySettings() {
  const theme = useTheme();
  const { user } = useAuth();
  const {
    preferences,
    savePreferences,
    showPreferences,
  } = useConsent();

  const [localPrefs, setLocalPrefs] = React.useState({
    functional: preferences.functional,
    analytics: preferences.analytics,
    marketing: preferences.marketing,
  });

  const [hasChanges, setHasChanges] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deleteCheck, setDeleteCheck] = React.useState<any>(null);
  const [deleteEmail, setDeleteEmail] = React.useState('');
  const [deleteReason, setDeleteReason] = React.useState('');
  const [deleting, setDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState('');

  React.useEffect(() => {
    setLocalPrefs({
      functional: preferences.functional,
      analytics: preferences.analytics,
      marketing: preferences.marketing,
    });
  }, [preferences]);

  React.useEffect(() => {
    const changed =
      localPrefs.functional !== preferences.functional ||
      localPrefs.analytics !== preferences.analytics ||
      localPrefs.marketing !== preferences.marketing;
    setHasChanges(changed);
  }, [localPrefs, preferences]);

  const handleToggle = (category: 'functional' | 'analytics' | 'marketing') => {
    setLocalPrefs((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await savePreferences(localPrefs);
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      const response = await fetch('/api/user/data-export');
      if (!response.ok) {
        throw new Error('Export failed');
      }
      // Trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      alert('Failed to export data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleOpenDeleteDialog = async () => {
    setDeleteDialogOpen(true);
    setDeleteEmail('');
    setDeleteReason('');
    setDeleteError('');

    // Check deletion eligibility
    try {
      const response = await fetch('/api/user/data-deletion');
      const data = await response.json();
      setDeleteCheck(data);
    } catch (error) {
      setDeleteCheck({ success: false, message: 'Failed to check deletion eligibility' });
    }
  };

  const handleDeleteData = async () => {
    if (!deleteCheck?.canDelete) return;

    setDeleting(true);
    setDeleteError('');

    try {
      const response = await fetch('/api/user/data-deletion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmEmail: deleteEmail,
          reason: deleteReason,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Redirect to home after successful deletion
        window.location.href = '/?deleted=true';
      } else {
        setDeleteError(data.message || 'Deletion failed');
      }
    } catch (error) {
      setDeleteError('Failed to delete account. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box>
      {/* Cookie Preferences Section */}
      <SettingsSection
        title="Cookie Preferences"
        description="Control which cookies are used to enhance your experience"
        icon={<CookieIcon fontSize="small" />}
        color="#00ED64"
        defaultExpanded={true}
      >

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Manage how we use cookies and similar technologies. Essential cookies are
          always enabled as they are required for the website to function.
        </Typography>

        {/* Essential - Always On */}
        <Box
          sx={{
            p: 2,
            mb: 2,
            borderRadius: 1,
            bgcolor: alpha(theme.palette.primary.main, 0.05),
            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography fontWeight={600}>{CATEGORY_INFO.essential.title}</Typography>
                <Chip
                  label="Required"
                  size="small"
                  sx={{
                    bgcolor: alpha(theme.palette.primary.main, 0.2),
                    color: theme.palette.primary.main,
                    height: 20,
                    fontSize: '0.7rem',
                  }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                {CATEGORY_INFO.essential.description}
              </Typography>
            </Box>
            <Switch checked disabled color="primary" />
          </Box>
        </Box>

        {/* Functional */}
        <SettingsToggle
          label={CATEGORY_INFO.functional.title}
          description={CATEGORY_INFO.functional.description}
          checked={localPrefs.functional}
          onChange={() => handleToggle('functional')}
          spacing={2}
        />

        {/* Analytics */}
        <SettingsToggle
          label={CATEGORY_INFO.analytics.title}
          description={CATEGORY_INFO.analytics.description}
          checked={localPrefs.analytics}
          onChange={() => handleToggle('analytics')}
          spacing={2}
        />

        {/* Marketing */}
        <SettingsToggle
          label={CATEGORY_INFO.marketing.title}
          description={CATEGORY_INFO.marketing.description}
          checked={localPrefs.marketing}
          onChange={() => handleToggle('marketing')}
          spacing={2}
        />

        {hasChanges && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
            <Button
              variant="outlined"
              onClick={() =>
                setLocalPrefs({
                  functional: preferences.functional,
                  analytics: preferences.analytics,
                  marketing: preferences.marketing,
                })
              }
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saving}
              sx={{
                bgcolor: theme.palette.primary.main,
                color: '#000',
                '&:hover': { bgcolor: theme.palette.primary.light },
              }}
            >
              {saving ? 'Saving...' : 'Save Preferences'}
            </Button>
          </Box>
        )}

        <Divider sx={{ my: 3 }} />

        <Button
          variant="text"
          onClick={showPreferences}
          startIcon={<CookieIcon />}
          sx={{ color: theme.palette.primary.main }}
        >
          View detailed cookie information
        </Button>
      </SettingsSection>

      {/* Data Rights Section */}
      <SettingsSection
        title="Your Data Rights"
        description="Under GDPR and CCPA, you have the right to access, export, and delete your personal data"
        icon={<PrivacyTipIcon fontSize="small" />}
        color="#00ED64"
        defaultExpanded={true}
      >

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              p: 2,
              borderRadius: 1,
              border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
            }}
          >
            <Box>
              <Typography fontWeight={500}>Export Your Data</Typography>
              <Typography variant="body2" color="text.secondary">
                Download a copy of all data we have about you
              </Typography>
            </Box>
            <Button
              variant="outlined"
              startIcon={exporting ? <CircularProgress size={16} /> : <DownloadIcon />}
              onClick={handleExportData}
              disabled={exporting}
            >
              {exporting ? 'Exporting...' : 'Export'}
            </Button>
          </Box>

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              p: 2,
              borderRadius: 1,
              border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
              bgcolor: alpha(theme.palette.error.main, 0.02),
            }}
          >
            <Box>
              <Typography fontWeight={500} color="error.main">
                Delete Your Data
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Request permanent deletion of your account and data
              </Typography>
            </Box>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteForeverIcon />}
              onClick={handleOpenDeleteDialog}
            >
              Request Deletion
            </Button>
          </Box>
        </Box>
      </SettingsSection>

      {/* Delete Account Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: theme.palette.background.paper,
            border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="error" />
          <Typography variant="h6" fontWeight={600}>
            Delete Your Account
          </Typography>
        </DialogTitle>

        <DialogContent>
          {!deleteCheck ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : deleteCheck.blockers?.length > 0 ? (
            <Box>
              <Alert severity="warning" sx={{ mb: 2 }}>
                You cannot delete your account yet. Please resolve the following issues:
              </Alert>
              <List>
                {deleteCheck.blockers.map((blocker: any, index: number) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <WarningIcon color="warning" />
                    </ListItemIcon>
                    <ListItemText primary={blocker.message} />
                  </ListItem>
                ))}
              </List>
            </Box>
          ) : (
            <Box>
              <Alert severity="error" sx={{ mb: 3 }}>
                This action is permanent and cannot be undone. All your data will be deleted.
              </Alert>

              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                The following data will be deleted:
              </Typography>
              <List dense>
                {deleteCheck.dataToBeDeleted?.map((item: string, index: number) => (
                  <ListItem key={index} sx={{ py: 0.25 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <DeleteForeverIcon sx={{ fontSize: 18, color: theme.palette.error.main }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={item}
                      primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                    />
                  </ListItem>
                ))}
              </List>

              {deleteCheck.dataRetained?.length > 0 && (
                <>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ mt: 2 }}>
                    The following may be retained:
                  </Typography>
                  <List dense>
                    {deleteCheck.dataRetained.map((item: string, index: number) => (
                      <ListItem key={index} sx={{ py: 0.25 }}>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <CheckCircleIcon sx={{ fontSize: 18, color: theme.palette.text.secondary }} />
                        </ListItemIcon>
                        <ListItemText
                          primary={item}
                          primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </>
              )}

              <Divider sx={{ my: 3 }} />

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                To confirm, please type your email address: <strong>{user?.email}</strong>
              </Typography>

              <TextField
                fullWidth
                label="Confirm Email"
                value={deleteEmail}
                onChange={(e) => setDeleteEmail(e.target.value)}
                placeholder={user?.email}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="Reason for leaving (optional)"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                multiline
                rows={2}
                placeholder="Help us improve by sharing why you're leaving..."
              />

              {deleteError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {deleteError}
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
            Cancel
          </Button>
          {deleteCheck?.canDelete && (
            <Button
              variant="contained"
              color="error"
              onClick={handleDeleteData}
              disabled={deleting || deleteEmail.toLowerCase() !== user?.email?.toLowerCase()}
              startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : <DeleteForeverIcon />}
            >
              {deleting ? 'Deleting...' : 'Permanently Delete My Account'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Legal Documents */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          border: '1px solid',
          borderColor: alpha(theme.palette.divider, 0.2),
          borderRadius: 2,
        }}
      >
        <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
          Legal Documents
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Link
            href="/privacy/cookies"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              color: theme.palette.primary.main,
              textDecoration: 'none',
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            Cookie Policy <OpenInNewIcon sx={{ fontSize: 16 }} />
          </Link>
          <Link
            href="/privacy"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              color: theme.palette.primary.main,
              textDecoration: 'none',
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            Privacy Policy <OpenInNewIcon sx={{ fontSize: 16 }} />
          </Link>
          <Link
            href="/terms"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              color: theme.palette.primary.main,
              textDecoration: 'none',
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            Terms of Service <OpenInNewIcon sx={{ fontSize: 16 }} />
          </Link>
        </Box>
      </Paper>
    </Box>
  );
}
