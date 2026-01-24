'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Button,
  Chip,
  Collapse,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tooltip,
  alpha,
  Divider,
} from '@mui/material';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import {
  History,
  Restore,
  Delete,
  Add,
  ExpandMore,
  ExpandLess,
  Compare,
  Visibility,
} from '@mui/icons-material';
import { FormVersion } from '@/types/form';
import { HelpButton } from '@/components/Help';

interface VersionHistoryPanelProps {
  formId: string;
  currentVersion?: number;
  onVersionRestore?: (version: FormVersion) => void;
}

interface VersionSummary {
  id: string;
  version: number;
  name: string;
  description?: string;
  createdAt: string;
  createdBy?: string;
  changeNotes?: string;
  fieldCount: number;
  pageCount: number;
  isPublished?: boolean;
}

export function VersionHistoryPanel({
  formId,
  currentVersion = 1,
  onVersionRestore,
}: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<VersionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [changeNotes, setChangeNotes] = useState('');
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [previewVersion, setPreviewVersion] = useState<FormVersion | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const fetchVersions = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/forms/${formId}/versions`);

      // Handle non-OK responses gracefully
      if (!response.ok && response.status !== 404) {
        // Don't try to parse non-JSON error responses
        console.warn(`Version API returned ${response.status}`);
        setVersions([]);
        setLoading(false);
        return;
      }

      // Handle 404 - form not saved yet
      if (response.status === 404) {
        setVersions([]);
        setLoading(false);
        return;
      }

      // Check content type before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.warn('Version API returned non-JSON response');
        setVersions([]);
        setLoading(false);
        return;
      }

      const data = await response.json();

      if (!data.success) {
        // API returned error but as JSON - just show empty versions
        console.warn(data.error || 'Failed to fetch versions');
        setVersions([]);
        setLoading(false);
        return;
      }

      setVersions(data.versions || []);
    } catch (err: any) {
      console.error('Error fetching versions:', err);
      // Don't show error to user for version history - just show empty
      setVersions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (formId) {
      fetchVersions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId]);

  const handleCreateVersion = async () => {
    setCreating(true);
    setError(null);

    try {
      const response = await fetch(`/api/forms/${formId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changeNotes }),
      });

      // Handle 404 - form not saved yet
      if (response.status === 404) {
        setError('Please save the form first before creating a version.');
        setCreating(false);
        return;
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create version');
      }

      setCreateDialogOpen(false);
      setChangeNotes('');
      fetchVersions();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async (versionId: string) => {
    if (!confirm('Are you sure you want to restore this version? Current changes will be saved as a new version first.')) {
      return;
    }

    setRestoring(versionId);
    setError(null);

    try {
      const response = await fetch(`/api/forms/${formId}/versions/${versionId}`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to restore version');
      }

      // Refresh versions and notify parent
      fetchVersions();
      if (onVersionRestore && previewVersion) {
        onVersionRestore(previewVersion);
      }

      // Reload the page to reflect restored form
      window.location.reload();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRestoring(null);
    }
  };

  const handleDelete = async (versionId: string) => {
    if (!confirm('Are you sure you want to delete this version? This cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/forms/${formId}/versions/${versionId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete version');
      }

      fetchVersions();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handlePreview = async (versionId: string) => {
    setPreviewLoading(true);

    try {
      const response = await fetch(`/api/forms/${formId}/versions/${versionId}`);
      const data = await response.json();

      if (data.success) {
        setPreviewVersion(data.version);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPreviewLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: alpha('#2196f3', 0.05),
          borderBottom: expanded ? '1px solid' : 'none',
          borderColor: 'divider',
          cursor: 'pointer',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <History sx={{ color: '#2196f3' }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Version History
          </Typography>
          <Chip
            label={`v${currentVersion}`}
            size="small"
            sx={{
              height: 20,
              fontSize: '0.7rem',
              bgcolor: alpha('#2196f3', 0.1),
              color: '#2196f3',
            }}
          />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <HelpButton topicId="form-versioning" tooltip="Version History Help" />
          <Tooltip title="Create Version">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setCreateDialogOpen(true);
              }}
              sx={{
                bgcolor: alpha('#2196f3', 0.1),
                '&:hover': { bgcolor: alpha('#2196f3', 0.2) },
              }}
            >
              <Add fontSize="small" sx={{ color: '#2196f3' }} />
            </IconButton>
          </Tooltip>
          <IconButton size="small">
            {expanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Box>
      </Box>

      {/* Content */}
      <Collapse in={expanded}>
        <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
          {error && (
            <Alert severity="error" sx={{ m: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {loading ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <NetPadLoader size="large" variant="ascii" message="Loading versions..." />
            </Box>
          ) : versions.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                No versions saved yet
              </Typography>
              <Button
                size="small"
                variant="outlined"
                startIcon={<Add />}
                onClick={() => setCreateDialogOpen(true)}
                sx={{
                  borderColor: '#2196f3',
                  color: '#2196f3',
                  '&:hover': {
                    borderColor: '#2196f3',
                    bgcolor: alpha('#2196f3', 0.05),
                  },
                }}
              >
                Create First Version
              </Button>
            </Box>
          ) : (
            <List sx={{ p: 0 }}>
              {versions.map((version, index) => (
                <ListItem
                  key={version.id}
                  sx={{
                    borderBottom: index < versions.length - 1 ? '1px solid' : 'none',
                    borderColor: 'divider',
                    py: 1.5,
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          v{version.version}
                        </Typography>
                        {version.version === currentVersion && (
                          <Chip
                            label="Current"
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: '0.6rem',
                              bgcolor: alpha('#00ED64', 0.1),
                              color: '#00ED64',
                            }}
                          />
                        )}
                        {version.isPublished && (
                          <Chip
                            label="Published"
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: '0.6rem',
                              bgcolor: alpha('#ff9800', 0.1),
                              color: '#ff9800',
                            }}
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {formatDate(version.createdAt)}
                        </Typography>
                        {version.changeNotes && (
                          <Typography
                            variant="caption"
                            sx={{ fontStyle: 'italic', color: 'text.secondary' }}
                          >
                            "{version.changeNotes}"
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary" display="block">
                          {version.fieldCount} fields
                          {version.pageCount > 0 && `, ${version.pageCount} pages`}
                        </Typography>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="Preview">
                        <IconButton
                          size="small"
                          onClick={() => handlePreview(version.id)}
                        >
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {version.version !== currentVersion && (
                        <Tooltip title="Restore">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => handleRestore(version.id)}
                              disabled={restoring === version.id}
                            >
                              {restoring === version.id ? (
                                <NetPadLoader size="small" variant="svg" showPhrases={false} />
                              ) : (
                                <Restore fontSize="small" />
                              )}
                            </IconButton>
                          </span>
                        </Tooltip>
                      )}
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDelete(version.id)}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </Collapse>

      {/* Create Version Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <History sx={{ color: '#2196f3' }} />
            Create Version Snapshot
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Save the current form configuration as a new version. You can restore to this version at any time.
          </Typography>
          <TextField
            label="Change Notes (optional)"
            value={changeNotes}
            onChange={(e) => setChangeNotes(e.target.value)}
            fullWidth
            multiline
            rows={3}
            placeholder="Describe what changed in this version..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreateVersion}
            variant="contained"
            disabled={creating}
            startIcon={creating ? <NetPadLoader size="small" variant="svg" showPhrases={false} /> : <Add />}
            sx={{
              bgcolor: '#2196f3',
              '&:hover': { bgcolor: '#1976d2' },
            }}
          >
            Create Version
          </Button>
        </DialogActions>
      </Dialog>

      {/* Version Preview Dialog */}
      <Dialog
        open={!!previewVersion}
        onClose={() => setPreviewVersion(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Visibility sx={{ color: '#2196f3' }} />
            Version {previewVersion?.version} Preview
          </Box>
        </DialogTitle>
        <DialogContent>
          {previewLoading ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <NetPadLoader size="large" variant="ascii" message="Loading preview..." />
            </Box>
          ) : previewVersion ? (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {previewVersion.name}
              </Typography>
              {previewVersion.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {previewVersion.description}
                </Typography>
              )}
              {previewVersion.changeNotes && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  {previewVersion.changeNotes}
                </Alert>
              )}
              <Divider sx={{ my: 2 }} />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Fields ({previewVersion.fieldConfigs?.length || 0})
              </Typography>
              <Box
                component="pre"
                sx={{
                  p: 2,
                  bgcolor: '#001E2B',
                  color: '#00ED64',
                  borderRadius: 1,
                  fontSize: '0.75rem',
                  overflow: 'auto',
                  maxHeight: 300,
                }}
              >
                {JSON.stringify(
                  previewVersion.fieldConfigs?.map((f) => ({
                    path: f.path,
                    type: f.type,
                    label: f.label,
                    included: f.included,
                  })),
                  null,
                  2
                )}
              </Box>
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewVersion(null)}>Close</Button>
          {previewVersion && previewVersion.version !== currentVersion && (
            <Button
              onClick={() => handleRestore(previewVersion.id)}
              variant="contained"
              startIcon={<Restore />}
              sx={{
                bgcolor: '#2196f3',
                '&:hover': { bgcolor: '#1976d2' },
              }}
            >
              Restore This Version
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
