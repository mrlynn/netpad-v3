'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  alpha,
  Tooltip,
  Menu,
  MenuItem,
  Tabs,
  Tab,
  Paper,
  Divider,
  Stack,
} from '@mui/material';
import {
  Add,
  Chat,
  MoreVert,
  Delete,
  Edit,
  ContentCopy,
  Publish,
  Archive,
  Refresh,
  SupportAgent,
  Feedback,
  Assignment,
  Work,
  Category,
  Lock,
  Public,
} from '@mui/icons-material';
import { useOrganization } from '@/contexts/OrganizationContext';
import {
  TemplateListItem,
  TemplateCategory,
  TemplateStatus,
  TemplateScope,
  StoredTemplate,
} from '@/types/conversational';
import { TemplateEditorDialog } from './TemplateEditorDialog';

// Extend TemplateListItem with isBuiltIn flag for UI
interface DisplayTemplate extends TemplateListItem {
  isBuiltIn: boolean;
}

// Category icons mapping
const CATEGORY_ICONS: Record<TemplateCategory, React.ReactNode> = {
  support: <SupportAgent />,
  feedback: <Feedback />,
  intake: <Assignment />,
  application: <Work />,
  general: <Category />,
};

// Category colors
const CATEGORY_COLORS: Record<TemplateCategory, string> = {
  support: '#2196f3',
  feedback: '#9c27b0',
  intake: '#00bcd4',
  application: '#ff9800',
  general: '#607d8b',
};

// Status colors
const STATUS_COLORS: Record<TemplateStatus, string> = {
  draft: '#ff9800',
  published: '#00ED64',
  archived: '#9e9e9e',
};

export function TemplateSettings() {
  const { organization, currentOrgId } = useOrganization();
  const [builtInTemplates, setBuiltInTemplates] = useState<DisplayTemplate[]>([]);
  const [customTemplates, setCustomTemplates] = useState<DisplayTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<TemplateCategory | 'all'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'built-in' | 'custom'>('all');

  // Menu state
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuTemplate, setMenuTemplate] = useState<DisplayTemplate | null>(null);

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<DisplayTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Create/Edit dialog
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<StoredTemplate | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(false);

  // Clone dialog for built-in templates
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [templateToClone, setTemplateToClone] = useState<DisplayTemplate | null>(null);
  const [cloning, setCloning] = useState(false);

  const orgId = currentOrgId;

  const fetchBuiltInTemplates = useCallback(async () => {
    try {
      const response = await fetch('/api/templates/built-in');
      const data = await response.json();

      if (response.ok) {
        const templates: DisplayTemplate[] = (data.templates || []).map(
          (t: TemplateListItem) => ({
            ...t,
            isBuiltIn: true,
          })
        );
        setBuiltInTemplates(templates);
      }
    } catch (err) {
      console.error('Failed to fetch built-in templates:', err);
    }
  }, []);

  const fetchCustomTemplates = useCallback(async () => {
    if (!orgId) return;

    try {
      const params = new URLSearchParams({
        includeDisabled: 'true',
      });

      const response = await fetch(
        `/api/organizations/${orgId}/templates?${params}`
      );
      const data = await response.json();

      if (response.ok) {
        const templates: DisplayTemplate[] = (data.templates || []).map(
          (t: TemplateListItem) => ({
            ...t,
            isBuiltIn: false,
          })
        );
        setCustomTemplates(templates);
      } else {
        setError(data.error || 'Failed to load custom templates');
      }
    } catch (err) {
      setError('Failed to connect to server');
    }
  }, [orgId]);

  const fetchAllTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);

    await Promise.all([fetchBuiltInTemplates(), fetchCustomTemplates()]);

    setLoading(false);
  }, [fetchBuiltInTemplates, fetchCustomTemplates]);

  useEffect(() => {
    fetchAllTemplates();
  }, [fetchAllTemplates]);

  // Combined and filtered templates
  const allTemplates = [...builtInTemplates, ...customTemplates];

  const filteredTemplates = allTemplates.filter((t) => {
    // Category filter
    if (categoryFilter !== 'all' && t.category !== categoryFilter) {
      return false;
    }
    // Source filter
    if (sourceFilter === 'built-in' && !t.isBuiltIn) {
      return false;
    }
    if (sourceFilter === 'custom' && t.isBuiltIn) {
      return false;
    }
    return true;
  });

  // Category counts
  const getCategoryCounts = () => {
    const counts: Record<TemplateCategory, number> = {
      support: 0,
      feedback: 0,
      intake: 0,
      application: 0,
      general: 0,
    };

    const templatesToCount =
      sourceFilter === 'built-in'
        ? builtInTemplates
        : sourceFilter === 'custom'
          ? customTemplates
          : allTemplates;

    templatesToCount.forEach((t) => {
      if (t.category in counts) {
        counts[t.category]++;
      }
    });

    return counts;
  };

  const counts = getCategoryCounts();

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, template: DisplayTemplate) => {
    setMenuAnchor(event.currentTarget);
    setMenuTemplate(template);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setMenuTemplate(null);
  };

  const handleEdit = async () => {
    if (menuTemplate && !menuTemplate.isBuiltIn && orgId) {
      handleMenuClose();
      try {
        setLoadingTemplate(true);
        const response = await fetch(
          `/api/organizations/${orgId}/templates/${menuTemplate.templateId}`
        );
        if (response.ok) {
          const data = await response.json();
          setEditingTemplate(data.template);
          setEditorOpen(true);
        } else {
          const data = await response.json();
          setError(data.error || 'Failed to load template');
        }
      } catch (err) {
        setError('Failed to load template');
      } finally {
        setLoadingTemplate(false);
      }
    } else {
      handleMenuClose();
    }
  };

  const handleCloneClick = () => {
    if (menuTemplate) {
      setTemplateToClone(menuTemplate);
      setCloneDialogOpen(true);
    }
    handleMenuClose();
  };

  const handleCloneConfirm = async () => {
    if (!templateToClone || !orgId) return;

    try {
      setCloning(true);

      if (templateToClone.isBuiltIn) {
        // Clone built-in template to organization
        const response = await fetch(
          `/api/templates/built-in/${templateToClone.templateId}/clone`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orgId }),
          }
        );

        if (response.ok) {
          setCloneDialogOpen(false);
          setTemplateToClone(null);
          fetchCustomTemplates();
        } else {
          const data = await response.json();
          setError(data.error || 'Failed to clone template');
        }
      } else {
        // Clone custom template
        const response = await fetch(
          `/api/organizations/${orgId}/templates/${templateToClone.templateId}/clone`,
          { method: 'POST' }
        );

        if (response.ok) {
          setCloneDialogOpen(false);
          setTemplateToClone(null);
          fetchCustomTemplates();
        } else {
          const data = await response.json();
          setError(data.error || 'Failed to clone template');
        }
      }
    } catch (err) {
      setError('Failed to clone template');
    } finally {
      setCloning(false);
    }
  };

  const handlePublish = async () => {
    if (!menuTemplate || !orgId || menuTemplate.isBuiltIn) return;

    try {
      const response = await fetch(
        `/api/organizations/${orgId}/templates/${menuTemplate.templateId}/publish`,
        { method: 'POST' }
      );

      if (response.ok) {
        fetchCustomTemplates();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to publish template');
      }
    } catch (err) {
      setError('Failed to publish template');
    }

    handleMenuClose();
  };

  const handleArchive = async () => {
    if (!menuTemplate || !orgId || menuTemplate.isBuiltIn) return;

    try {
      const response = await fetch(
        `/api/organizations/${orgId}/templates/${menuTemplate.templateId}/archive`,
        { method: 'POST' }
      );

      if (response.ok) {
        fetchCustomTemplates();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to archive template');
      }
    } catch (err) {
      setError('Failed to archive template');
    }

    handleMenuClose();
  };

  const handleDeleteClick = () => {
    if (menuTemplate && !menuTemplate.isBuiltIn) {
      setTemplateToDelete(menuTemplate);
      setDeleteDialogOpen(true);
    }
    handleMenuClose();
  };

  const handleDeleteConfirm = async () => {
    if (!templateToDelete || !orgId) return;

    try {
      setDeleting(true);
      const response = await fetch(
        `/api/organizations/${orgId}/templates/${templateToDelete.templateId}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        setDeleteDialogOpen(false);
        setTemplateToDelete(null);
        fetchCustomTemplates();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete template');
      }
    } catch (err) {
      setError('Failed to delete template');
    } finally {
      setDeleting(false);
    }
  };

  const handleCreateNew = () => {
    setEditingTemplate(null);
    setEditorOpen(true);
  };

  if (!organization) {
    return (
      <Alert severity="info">
        Select an organization to manage templates
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Conversational Form Templates
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create and manage templates for AI-powered conversational forms
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchAllTemplates} disabled={loading}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleCreateNew}
            sx={{
              bgcolor: '#00ED64',
              color: '#000',
              '&:hover': { bgcolor: '#00D659' },
            }}
          >
            New Template
          </Button>
        </Box>
      </Box>

      {/* Source Filter */}
      <Box sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1}>
          <Chip
            label={`All (${allTemplates.length})`}
            variant={sourceFilter === 'all' ? 'filled' : 'outlined'}
            onClick={() => setSourceFilter('all')}
            sx={{
              bgcolor: sourceFilter === 'all' ? '#00ED64' : 'transparent',
              color: sourceFilter === 'all' ? '#000' : 'inherit',
              '&:hover': {
                bgcolor: sourceFilter === 'all' ? '#00D659' : alpha('#00ED64', 0.1),
              },
            }}
          />
          <Chip
            icon={<Public sx={{ fontSize: 16 }} />}
            label={`Built-in (${builtInTemplates.length})`}
            variant={sourceFilter === 'built-in' ? 'filled' : 'outlined'}
            onClick={() => setSourceFilter('built-in')}
            sx={{
              bgcolor: sourceFilter === 'built-in' ? '#00ED64' : 'transparent',
              color: sourceFilter === 'built-in' ? '#000' : 'inherit',
              '&:hover': {
                bgcolor: sourceFilter === 'built-in' ? '#00D659' : alpha('#00ED64', 0.1),
              },
            }}
          />
          <Chip
            icon={<Lock sx={{ fontSize: 16 }} />}
            label={`Custom (${customTemplates.length})`}
            variant={sourceFilter === 'custom' ? 'filled' : 'outlined'}
            onClick={() => setSourceFilter('custom')}
            sx={{
              bgcolor: sourceFilter === 'custom' ? '#00ED64' : 'transparent',
              color: sourceFilter === 'custom' ? '#000' : 'inherit',
              '&:hover': {
                bgcolor: sourceFilter === 'custom' ? '#00D659' : alpha('#00ED64', 0.1),
              },
            }}
          />
        </Stack>
      </Box>

      {/* Category Filter Tabs */}
      <Paper
        elevation={0}
        sx={{
          mb: 3,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
        }}
      >
        <Tabs
          value={categoryFilter}
          onChange={(_, v) => setCategoryFilter(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 500,
              minHeight: 48,
            },
            '& .Mui-selected': {
              color: '#00ED64 !important',
            },
            '& .MuiTabs-indicator': {
              bgcolor: '#00ED64',
            },
          }}
        >
          <Tab value="all" label={`All (${filteredTemplates.length})`} />
          <Tab
            value="support"
            icon={<SupportAgent sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label={`Support (${counts.support})`}
          />
          <Tab
            value="feedback"
            icon={<Feedback sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label={`Feedback (${counts.feedback})`}
          />
          <Tab
            value="intake"
            icon={<Assignment sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label={`Intake (${counts.intake})`}
          />
          <Tab
            value="application"
            icon={<Work sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label={`Application (${counts.application})`}
          />
          <Tab
            value="general"
            icon={<Category sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label={`General (${counts.general})`}
          />
        </Tabs>
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress sx={{ color: '#00ED64' }} />
        </Box>
      )}

      {/* Empty State */}
      {!loading && filteredTemplates.length === 0 && (
        <Paper
          elevation={0}
          sx={{
            p: 6,
            textAlign: 'center',
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: 2,
          }}
        >
          <Chat sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" sx={{ mb: 1 }}>
            No Templates Found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {sourceFilter === 'custom'
              ? 'Create your first custom template or clone a built-in one'
              : 'No templates match the current filters'}
          </Typography>
          {sourceFilter === 'custom' && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleCreateNew}
              sx={{
                bgcolor: '#00ED64',
                color: '#000',
                '&:hover': { bgcolor: '#00D659' },
              }}
            >
              Create Template
            </Button>
          )}
        </Paper>
      )}

      {/* Template Grid */}
      {!loading && filteredTemplates.length > 0 && (
        <Grid container spacing={2}>
          {filteredTemplates.map((template) => (
            <Grid item xs={12} sm={6} md={4} key={`${template.isBuiltIn ? 'builtin' : 'custom'}-${template.templateId}`}>
              <Card
                elevation={0}
                sx={{
                  border: '1px solid',
                  borderColor: template.isBuiltIn ? alpha('#00ED64', 0.3) : 'divider',
                  borderRadius: 2,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'border-color 0.2s',
                  position: 'relative',
                  '&:hover': {
                    borderColor: '#00ED64',
                  },
                }}
              >
                {/* Built-in badge */}
                {template.isBuiltIn && (
                  <Chip
                    size="small"
                    icon={<Public sx={{ fontSize: 14 }} />}
                    label="Built-in"
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      bgcolor: alpha('#00ED64', 0.1),
                      color: '#00ED64',
                      fontSize: '0.65rem',
                      height: 20,
                    }}
                  />
                )}

                <CardContent sx={{ flex: 1, pt: template.isBuiltIn ? 4 : 2 }}>
                  {/* Header with icon and menu */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: alpha(CATEGORY_COLORS[template.category], 0.1),
                        color: CATEGORY_COLORS[template.category],
                      }}
                    >
                      {CATEGORY_ICONS[template.category]}
                    </Box>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, template)}
                    >
                      <MoreVert fontSize="small" />
                    </IconButton>
                  </Box>

                  {/* Title */}
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                    {template.name}
                  </Typography>

                  {/* Description */}
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      mb: 2,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {template.description}
                  </Typography>

                  {/* Stats */}
                  <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                    <Chip
                      size="small"
                      label={`${template.topicCount} topics`}
                      sx={{ fontSize: '0.7rem' }}
                    />
                    <Chip
                      size="small"
                      label={`${template.fieldCount} fields`}
                      sx={{ fontSize: '0.7rem' }}
                    />
                  </Stack>

                  {/* Status and Category Chips */}
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {!template.isBuiltIn && (
                      <Chip
                        size="small"
                        label={template.status}
                        sx={{
                          bgcolor: alpha(STATUS_COLORS[template.status], 0.1),
                          color: STATUS_COLORS[template.status],
                          fontWeight: 500,
                          fontSize: '0.7rem',
                          textTransform: 'capitalize',
                        }}
                      />
                    )}
                    <Chip
                      size="small"
                      label={template.category}
                      sx={{
                        bgcolor: alpha(CATEGORY_COLORS[template.category], 0.1),
                        color: CATEGORY_COLORS[template.category],
                        fontWeight: 500,
                        fontSize: '0.7rem',
                        textTransform: 'capitalize',
                      }}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        {/* Edit - only for custom templates */}
        {menuTemplate && !menuTemplate.isBuiltIn && (
          <MenuItem onClick={handleEdit}>
            <Edit sx={{ mr: 1, fontSize: 18 }} />
            Edit
          </MenuItem>
        )}

        {/* Clone - for both */}
        <MenuItem onClick={handleCloneClick}>
          <ContentCopy sx={{ mr: 1, fontSize: 18 }} />
          {menuTemplate?.isBuiltIn ? 'Clone to Customize' : 'Clone'}
        </MenuItem>

        {/* Status actions - only for custom templates */}
        {menuTemplate && !menuTemplate.isBuiltIn && (
          <>
            <Divider />
            {menuTemplate.status === 'draft' && (
              <MenuItem onClick={handlePublish}>
                <Publish sx={{ mr: 1, fontSize: 18 }} />
                Publish
              </MenuItem>
            )}
            {menuTemplate.status === 'published' && (
              <MenuItem onClick={handleArchive}>
                <Archive sx={{ mr: 1, fontSize: 18 }} />
                Archive
              </MenuItem>
            )}
          </>
        )}

        {/* Delete - only for custom templates */}
        {menuTemplate && !menuTemplate.isBuiltIn && (
          <>
            <Divider />
            <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
              <Delete sx={{ mr: 1, fontSize: 18 }} />
              Delete
            </MenuItem>
          </>
        )}
      </Menu>

      {/* Clone Confirmation Dialog */}
      <Dialog open={cloneDialogOpen} onClose={() => setCloneDialogOpen(false)}>
        <DialogTitle>
          {templateToClone?.isBuiltIn ? 'Clone Built-in Template' : 'Clone Template'}
        </DialogTitle>
        <DialogContent>
          <Typography>
            {templateToClone?.isBuiltIn
              ? `This will create a customizable copy of "${templateToClone?.name}" in your organization. You can then modify it to fit your needs.`
              : `Create a copy of "${templateToClone?.name}"?`}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCloneDialogOpen(false)} disabled={cloning}>
            Cancel
          </Button>
          <Button
            onClick={handleCloneConfirm}
            variant="contained"
            disabled={cloning}
            startIcon={cloning ? <CircularProgress size={16} /> : <ContentCopy />}
            sx={{
              bgcolor: '#00ED64',
              color: '#000',
              '&:hover': { bgcolor: '#00D659' },
            }}
          >
            Clone
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Template</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{templateToDelete?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} /> : null}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Template Editor Dialog */}
      {orgId && (
        <TemplateEditorDialog
          open={editorOpen}
          onClose={() => {
            setEditorOpen(false);
            setEditingTemplate(null);
          }}
          template={editingTemplate}
          orgId={orgId}
          onSave={() => {
            fetchCustomTemplates();
          }}
        />
      )}

      {/* Loading overlay for edit */}
      {loadingTemplate && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(0,0,0,0.5)',
            zIndex: 9999,
          }}
        >
          <CircularProgress sx={{ color: '#00ED64' }} />
        </Box>
      )}
    </Box>
  );
}
