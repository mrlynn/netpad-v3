'use client';

import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  TextField,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Collapse,
  Chip,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  alpha,
  Menu,
  Divider,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Add,
  Delete,
  DragIndicator,
  ExpandMore,
  ExpandLess,
  Pages,
  Settings,
  ArrowUpward,
  ArrowDownward,
  Edit,
  Info,
  Description,
  CheckCircle,
  Summarize,
} from '@mui/icons-material';
import { FormPage, MultiPageConfig, FieldConfig, PageType, PageContent, PageCallout, SummaryPageConfig, CompletionPageConfig } from '@/types/form';
import { HelpButton } from '@/components/Help';
import { randomBytes } from 'crypto';

interface PageConfigEditorProps {
  config?: MultiPageConfig;
  fieldConfigs: FieldConfig[];
  onChange: (config: MultiPageConfig | undefined) => void;
}

export function PageConfigEditor({
  config,
  fieldConfigs,
  onChange,
}: PageConfigEditorProps) {
  const [expanded, setExpanded] = useState(!!config?.enabled);
  const [editingPage, setEditingPage] = useState<FormPage | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addMenuAnchor, setAddMenuAnchor] = useState<null | HTMLElement>(null);
  const [editTab, setEditTab] = useState(0); // 0 = basic, 1 = content/config

  const isEnabled = config?.enabled ?? false;
  const pages = config?.pages ?? [];

  const includedFields = fieldConfigs.filter((f) => f.included);

  // Get fields that are not assigned to any page
  const unassignedFields = includedFields.filter(
    (f) => !pages.some((p) => p.fields.includes(f.path))
  );

  const handleToggle = () => {
    if (isEnabled) {
      onChange(undefined);
      setExpanded(false);
    } else {
      // Create initial page with all fields
      const initialPage: FormPage = {
        id: generateId(),
        title: 'Page 1',
        fields: includedFields.map((f) => f.path),
        order: 0,
        showInNavigation: true,
      };
      onChange({
        enabled: true,
        pages: [initialPage],
        showStepIndicator: true,
        stepIndicatorStyle: 'numbers',
        validateOnPageChange: true,
        showPageTitles: true,
      });
      setExpanded(true);
    }
  };

  const generateId = () => {
    return Math.random().toString(36).substr(2, 9);
  };

  const addPage = () => {
    const newPage: FormPage = {
      id: generateId(),
      title: `Page ${pages.length + 1}`,
      fields: [],
      order: pages.length,
      showInNavigation: true,
    };
    onChange({
      ...config!,
      pages: [...pages, newPage],
    });
  };

  const removePage = (pageId: string) => {
    const pageToRemove = pages.find((p) => p.id === pageId);
    if (!pageToRemove) return;

    // Move fields from removed page to first remaining page
    const remainingPages = pages.filter((p) => p.id !== pageId);
    if (remainingPages.length > 0 && pageToRemove.fields.length > 0) {
      remainingPages[0].fields = [...remainingPages[0].fields, ...pageToRemove.fields];
    }

    // Reorder remaining pages
    const reorderedPages = remainingPages.map((p, i) => ({ ...p, order: i }));

    if (reorderedPages.length === 0) {
      onChange(undefined);
    } else {
      onChange({
        ...config!,
        pages: reorderedPages,
      });
    }
  };

  const updatePage = (pageId: string, updates: Partial<FormPage>) => {
    onChange({
      ...config!,
      pages: pages.map((p) => (p.id === pageId ? { ...p, ...updates } : p)),
    });
  };

  const movePage = (pageId: string, direction: 'up' | 'down') => {
    const pageIndex = pages.findIndex((p) => p.id === pageId);
    if (pageIndex === -1) return;

    const newIndex = direction === 'up' ? pageIndex - 1 : pageIndex + 1;
    if (newIndex < 0 || newIndex >= pages.length) return;

    const newPages = [...pages];
    [newPages[pageIndex], newPages[newIndex]] = [newPages[newIndex], newPages[pageIndex]];

    // Update order values
    const reorderedPages = newPages.map((p, i) => ({ ...p, order: i }));

    onChange({
      ...config!,
      pages: reorderedPages,
    });
  };

  const moveFieldToPage = (fieldPath: string, fromPageId: string, toPageId: string) => {
    const newPages = pages.map((p) => {
      if (p.id === fromPageId) {
        return { ...p, fields: p.fields.filter((f) => f !== fieldPath) };
      }
      if (p.id === toPageId) {
        return { ...p, fields: [...p.fields, fieldPath] };
      }
      return p;
    });

    onChange({
      ...config!,
      pages: newPages,
    });
  };

  const addFieldToPage = (fieldPath: string, pageId: string) => {
    const newPages = pages.map((p) => {
      if (p.id === pageId) {
        return { ...p, fields: [...p.fields, fieldPath] };
      }
      return p;
    });

    onChange({
      ...config!,
      pages: newPages,
    });
  };

  const updateSettings = (updates: Partial<MultiPageConfig>) => {
    onChange({
      ...config!,
      ...updates,
    });
  };

  const getFieldLabel = (path: string) => {
    const field = fieldConfigs.find((f) => f.path === path);
    return field?.label || path;
  };

  // Page type configuration
  const pageTypeConfig = {
    form: { label: 'Form', icon: <Description fontSize="small" />, color: '#e91e63', description: 'Collect data with form fields' },
    info: { label: 'Info', icon: <Info fontSize="small" />, color: '#2196F3', description: 'Display information, instructions, or guidance' },
    summary: { label: 'Summary', icon: <Summarize fontSize="small" />, color: '#FF9800', description: 'Review collected data before submission' },
    complete: { label: 'Complete', icon: <CheckCircle fontSize="small" />, color: '#4CAF50', description: 'Success/completion screen after submission' },
  };

  const getPageTypeInfo = (pageType?: PageType) => {
    return pageTypeConfig[pageType || 'form'];
  };

  // Add wizard page (info, summary, or complete)
  const addWizardPage = (pageType: PageType) => {
    const typeInfo = pageTypeConfig[pageType];
    const newPage: FormPage = {
      id: generateId(),
      title: pageType === 'info' ? 'Welcome' : pageType === 'summary' ? 'Review' : pageType === 'complete' ? 'Complete' : `Page ${pages.length + 1}`,
      pageType,
      fields: [],
      order: pages.length,
      showInNavigation: true,
      ...(pageType === 'info' && {
        content: {
          body: 'Add your content here...',
          contentType: 'text' as const,
          alignment: 'left' as const,
        },
      }),
      ...(pageType === 'summary' && {
        summaryConfig: {
          showAllFields: true,
          groupByPage: true,
          allowEdit: true,
          editMode: 'jump-to-page' as const,
          confirmLabel: 'Confirm & Submit',
          excludeEmptyFields: false,
        },
      }),
      ...(pageType === 'complete' && {
        completionConfig: {
          heading: "You're all set!",
          message: 'Thank you for completing the form.',
          icon: 'checkmark' as const,
          showConfetti: false,
          actions: [
            { id: 'close', label: 'Close', action: 'close' as const, variant: 'primary' as const },
          ],
        },
      }),
    };
    onChange({
      ...config!,
      pages: [...pages, newPage],
    });
  };

  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: isEnabled ? '#e91e63' : 'divider',
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
          bgcolor: alpha('#e91e63', 0.05),
          borderBottom: expanded ? '1px solid' : 'none',
          borderColor: 'divider',
          cursor: 'pointer',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Pages sx={{ color: '#e91e63' }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Multi-Page Form
          </Typography>
          {isEnabled && (
            <Chip
              label={`${pages.length} pages`}
              size="small"
              sx={{
                height: 20,
                fontSize: '0.7rem',
                bgcolor: alpha('#e91e63', 0.1),
                color: '#e91e63',
              }}
            />
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <HelpButton topicId="multi-page-forms" tooltip="Multi-Page Forms Help" />
          <Switch
            size="small"
            checked={isEnabled}
            onChange={(e) => {
              e.stopPropagation();
              handleToggle();
            }}
            onClick={(e) => e.stopPropagation()}
          />
          <IconButton size="small">
            {expanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Box>
      </Box>

      {/* Content */}
      <Collapse in={expanded && isEnabled}>
        <Box sx={{ p: 2 }}>
          {/* Settings */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              Navigation Settings
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Step Indicator</InputLabel>
                <Select
                  value={config?.stepIndicatorStyle || 'numbers'}
                  label="Step Indicator"
                  onChange={(e) =>
                    updateSettings({ stepIndicatorStyle: e.target.value as any })
                  }
                >
                  <MenuItem value="dots">Dots</MenuItem>
                  <MenuItem value="numbers">Numbers</MenuItem>
                  <MenuItem value="progress">Progress Bar</MenuItem>
                  <MenuItem value="tabs">Tabs</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={config?.showStepIndicator ?? true}
                    onChange={(e) => updateSettings({ showStepIndicator: e.target.checked })}
                  />
                }
                label={<Typography variant="caption">Show Step Indicator</Typography>}
              />
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={config?.validateOnPageChange ?? true}
                    onChange={(e) => updateSettings({ validateOnPageChange: e.target.checked })}
                  />
                }
                label={<Typography variant="caption">Validate Before Next</Typography>}
              />
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={config?.allowJumpToPage ?? false}
                    onChange={(e) => updateSettings({ allowJumpToPage: e.target.checked })}
                  />
                }
                label={<Typography variant="caption">Allow Page Jumping</Typography>}
              />
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={config?.showReviewPage ?? false}
                    onChange={(e) => updateSettings({ showReviewPage: e.target.checked })}
                  />
                }
                label={<Typography variant="caption">Show Review Page</Typography>}
              />
            </Box>
          </Box>

          {/* Pages List */}
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="caption" color="text.secondary">
              Pages
            </Typography>
            <Button
              size="small"
              startIcon={<Add />}
              onClick={(e) => setAddMenuAnchor(e.currentTarget)}
              sx={{ color: '#e91e63' }}
            >
              Add Page
            </Button>
            <Menu
              anchorEl={addMenuAnchor}
              open={Boolean(addMenuAnchor)}
              onClose={() => setAddMenuAnchor(null)}
            >
              <MenuItem onClick={() => { addPage(); setAddMenuAnchor(null); }}>
                <ListItemIcon>{pageTypeConfig.form.icon}</ListItemIcon>
                <ListItemText
                  primary="Form Page"
                  secondary="Collect data with form fields"
                  secondaryTypographyProps={{ variant: 'caption' }}
                />
              </MenuItem>
              <Divider />
              <MenuItem onClick={() => { addWizardPage('info'); setAddMenuAnchor(null); }}>
                <ListItemIcon sx={{ color: pageTypeConfig.info.color }}>{pageTypeConfig.info.icon}</ListItemIcon>
                <ListItemText
                  primary="Info Page"
                  secondary="Display information or instructions"
                  secondaryTypographyProps={{ variant: 'caption' }}
                />
              </MenuItem>
              <MenuItem onClick={() => { addWizardPage('summary'); setAddMenuAnchor(null); }}>
                <ListItemIcon sx={{ color: pageTypeConfig.summary.color }}>{pageTypeConfig.summary.icon}</ListItemIcon>
                <ListItemText
                  primary="Summary Page"
                  secondary="Review data before submission"
                  secondaryTypographyProps={{ variant: 'caption' }}
                />
              </MenuItem>
              <MenuItem onClick={() => { addWizardPage('complete'); setAddMenuAnchor(null); }}>
                <ListItemIcon sx={{ color: pageTypeConfig.complete.color }}>{pageTypeConfig.complete.icon}</ListItemIcon>
                <ListItemText
                  primary="Completion Page"
                  secondary="Success screen after submission"
                  secondaryTypographyProps={{ variant: 'caption' }}
                />
              </MenuItem>
            </Menu>
          </Box>

          <List sx={{ p: 0 }}>
            {pages.map((page, index) => (
              <Paper
                key={page.id}
                elevation={0}
                sx={{
                  mb: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                }}
              >
                <ListItem sx={{ py: 1 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <DragIndicator fontSize="small" color="disabled" />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ color: getPageTypeInfo(page.pageType).color, display: 'flex' }}>
                          {getPageTypeInfo(page.pageType).icon}
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {page.title}
                        </Typography>
                        <Chip
                          label={getPageTypeInfo(page.pageType).label}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: '0.6rem',
                            bgcolor: alpha(getPageTypeInfo(page.pageType).color, 0.1),
                            color: getPageTypeInfo(page.pageType).color,
                          }}
                        />
                        {(page.pageType === 'form' || !page.pageType) && page.fields.length > 0 && (
                          <Chip
                            label={`${page.fields.length} fields`}
                            size="small"
                            sx={{ height: 18, fontSize: '0.6rem' }}
                          />
                        )}
                      </Box>
                    }
                    secondary={page.description}
                  />
                  <ListItemSecondaryAction>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="Move Up">
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => movePage(page.id, 'up')}
                            disabled={index === 0}
                          >
                            <ArrowUpward fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Move Down">
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => movePage(page.id, 'down')}
                            disabled={index === pages.length - 1}
                          >
                            <ArrowDownward fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setEditingPage(page);
                            setEditDialogOpen(true);
                          }}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <span>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => removePage(page.id)}
                            disabled={pages.length === 1}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                  </ListItemSecondaryAction>
                </ListItem>

                {/* Fields in this page (only for form pages) */}
                {(page.pageType === 'form' || !page.pageType) && (
                  <Box sx={{ px: 2, pb: 1 }}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {page.fields.map((fieldPath) => (
                        <Chip
                          key={fieldPath}
                          label={getFieldLabel(fieldPath)}
                          size="small"
                          onDelete={() => {
                            updatePage(page.id, {
                              fields: page.fields.filter((f) => f !== fieldPath),
                            });
                          }}
                          sx={{
                            height: 24,
                            fontSize: '0.7rem',
                            bgcolor: alpha('#e91e63', 0.1),
                          }}
                        />
                      ))}
                      {page.fields.length === 0 && (
                        <Typography variant="caption" color="text.secondary">
                          No fields - drag fields here or use the edit button
                        </Typography>
                      )}
                    </Box>
                  </Box>
                )}

                {/* Info page preview */}
                {page.pageType === 'info' && page.content?.body && (
                  <Box sx={{ px: 2, pb: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                      {page.content.body.substring(0, 100)}{page.content.body.length > 100 ? '...' : ''}
                    </Typography>
                  </Box>
                )}

                {/* Summary page preview */}
                {page.pageType === 'summary' && (
                  <Box sx={{ px: 2, pb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      {page.summaryConfig?.showAllFields ? 'Shows all fields' : `Shows ${page.summaryConfig?.showFields?.length || 0} selected fields`}
                      {page.summaryConfig?.allowEdit && ' • Editable'}
                    </Typography>
                  </Box>
                )}

                {/* Complete page preview */}
                {page.pageType === 'complete' && (
                  <Box sx={{ px: 2, pb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      {page.completionConfig?.heading || "You're all set!"}
                      {page.completionConfig?.actions?.length ? ` • ${page.completionConfig.actions.length} action(s)` : ''}
                    </Typography>
                  </Box>
                )}
              </Paper>
            ))}
          </List>

          {/* Unassigned Fields */}
          {unassignedFields.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="warning.main" sx={{ display: 'block', mb: 1 }}>
                Unassigned Fields ({unassignedFields.length})
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {unassignedFields.map((field) => (
                  <Chip
                    key={field.path}
                    label={field.label}
                    size="small"
                    onClick={() => {
                      if (pages.length > 0) {
                        addFieldToPage(field.path, pages[0].id);
                      }
                    }}
                    sx={{
                      height: 24,
                      fontSize: '0.7rem',
                      bgcolor: alpha('#ff9800', 0.1),
                      cursor: 'pointer',
                      '&:hover': { bgcolor: alpha('#ff9800', 0.2) },
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}
        </Box>
      </Collapse>

      {/* Edit Page Dialog */}
      <Dialog open={editDialogOpen} onClose={() => { setEditDialogOpen(false); setEditTab(0); }} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ color: editingPage ? getPageTypeInfo(editingPage.pageType).color : '#e91e63' }}>
              {editingPage && getPageTypeInfo(editingPage.pageType).icon}
            </Box>
            Edit {editingPage ? getPageTypeInfo(editingPage.pageType).label : ''} Page
          </Box>
        </DialogTitle>
        <DialogContent>
          {editingPage && (
            <Box sx={{ mt: 1 }}>
              {/* Tabs for different sections */}
              <Tabs
                value={editTab}
                onChange={(_, v) => setEditTab(v)}
                sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
              >
                <Tab label="Basic" />
                {(editingPage.pageType === 'form' || !editingPage.pageType) && <Tab label="Fields" />}
                {editingPage.pageType === 'info' && <Tab label="Content" />}
                {editingPage.pageType === 'summary' && <Tab label="Summary Settings" />}
                {editingPage.pageType === 'complete' && <Tab label="Completion Settings" />}
              </Tabs>

              {/* Basic Tab */}
              {editTab === 0 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Page Type</InputLabel>
                    <Select
                      value={editingPage.pageType || 'form'}
                      label="Page Type"
                      onChange={(e) => {
                        const newType = e.target.value as PageType;
                        const updates: Partial<FormPage> = { pageType: newType };
                        // Initialize type-specific config if not present
                        if (newType === 'info' && !editingPage.content) {
                          updates.content = { body: '', contentType: 'text', alignment: 'left' };
                        }
                        if (newType === 'summary' && !editingPage.summaryConfig) {
                          updates.summaryConfig = { showAllFields: true, groupByPage: true, allowEdit: true, editMode: 'jump-to-page', confirmLabel: 'Confirm & Submit' };
                        }
                        if (newType === 'complete' && !editingPage.completionConfig) {
                          updates.completionConfig = { heading: "You're all set!", message: '', icon: 'checkmark', actions: [] };
                        }
                        setEditingPage({ ...editingPage, ...updates });
                      }}
                    >
                      <MenuItem value="form">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {pageTypeConfig.form.icon}
                          <span>Form Page</span>
                        </Box>
                      </MenuItem>
                      <MenuItem value="info">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ color: pageTypeConfig.info.color }}>{pageTypeConfig.info.icon}</Box>
                          <span>Info Page</span>
                        </Box>
                      </MenuItem>
                      <MenuItem value="summary">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ color: pageTypeConfig.summary.color }}>{pageTypeConfig.summary.icon}</Box>
                          <span>Summary Page</span>
                        </Box>
                      </MenuItem>
                      <MenuItem value="complete">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ color: pageTypeConfig.complete.color }}>{pageTypeConfig.complete.icon}</Box>
                          <span>Completion Page</span>
                        </Box>
                      </MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    label="Page Title"
                    value={editingPage.title}
                    onChange={(e) => setEditingPage({ ...editingPage, title: e.target.value })}
                    fullWidth
                  />
                  <TextField
                    label="Description (optional)"
                    value={editingPage.description || ''}
                    onChange={(e) => setEditingPage({ ...editingPage, description: e.target.value })}
                    fullWidth
                    multiline
                    rows={2}
                  />
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                      label="Next Button Label"
                      value={editingPage.nextLabel || ''}
                      onChange={(e) => setEditingPage({ ...editingPage, nextLabel: e.target.value })}
                      placeholder={editingPage.pageType === 'info' ? 'Continue' : 'Next'}
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      label="Previous Button Label"
                      value={editingPage.prevLabel || ''}
                      onChange={(e) => setEditingPage({ ...editingPage, prevLabel: e.target.value })}
                      placeholder="Previous"
                      sx={{ flex: 1 }}
                    />
                  </Box>
                  <FormControlLabel
                    control={
                      <Switch
                        size="small"
                        checked={editingPage.skipValidation || false}
                        onChange={(e) => setEditingPage({ ...editingPage, skipValidation: e.target.checked })}
                      />
                    }
                    label={<Typography variant="body2">Skip validation on this page</Typography>}
                  />
                </Box>
              )}

              {/* Fields Tab (for form pages) */}
              {editTab === 1 && (editingPage.pageType === 'form' || !editingPage.pageType) && (
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                    Select fields for this page:
                  </Typography>
                  <Box
                    sx={{
                      maxHeight: 300,
                      overflow: 'auto',
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      p: 1,
                    }}
                  >
                    {includedFields.map((field) => {
                      const isInPage = editingPage.fields.includes(field.path);
                      const isInOtherPage = pages.some(
                        (p) => p.id !== editingPage.id && p.fields.includes(field.path)
                      );

                      return (
                        <FormControlLabel
                          key={field.path}
                          control={
                            <Switch
                              size="small"
                              checked={isInPage}
                              disabled={isInOtherPage}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setEditingPage({
                                    ...editingPage,
                                    fields: [...editingPage.fields, field.path],
                                  });
                                } else {
                                  setEditingPage({
                                    ...editingPage,
                                    fields: editingPage.fields.filter((f) => f !== field.path),
                                  });
                                }
                              }}
                            />
                          }
                          label={
                            <Box>
                              <Typography variant="body2">{field.label}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {field.path}
                                {isInOtherPage && ' (assigned to another page)'}
                              </Typography>
                            </Box>
                          }
                          sx={{ display: 'flex', width: '100%', m: 0, py: 0.5 }}
                        />
                      );
                    })}
                  </Box>
                </Box>
              )}

              {/* Content Tab (for info pages) */}
              {editTab === 1 && editingPage.pageType === 'info' && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    label="Content"
                    value={editingPage.content?.body || ''}
                    onChange={(e) => setEditingPage({
                      ...editingPage,
                      content: { ...editingPage.content, body: e.target.value },
                    })}
                    fullWidth
                    multiline
                    rows={8}
                    placeholder="Enter your content here. Use line breaks for paragraphs."
                    helperText="Tip: Use clear, concise language to guide users through the wizard"
                  />
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                      <InputLabel>Content Type</InputLabel>
                      <Select
                        value={editingPage.content?.contentType || 'text'}
                        label="Content Type"
                        onChange={(e) => setEditingPage({
                          ...editingPage,
                          content: { ...editingPage.content, contentType: e.target.value as 'text' | 'markdown' | 'html' },
                        })}
                      >
                        <MenuItem value="text">Plain Text</MenuItem>
                        <MenuItem value="markdown">Markdown</MenuItem>
                        <MenuItem value="html">HTML</MenuItem>
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                      <InputLabel>Alignment</InputLabel>
                      <Select
                        value={editingPage.content?.alignment || 'left'}
                        label="Alignment"
                        onChange={(e) => setEditingPage({
                          ...editingPage,
                          content: { ...editingPage.content, alignment: e.target.value as 'left' | 'center' | 'right' },
                        })}
                      >
                        <MenuItem value="left">Left</MenuItem>
                        <MenuItem value="center">Center</MenuItem>
                        <MenuItem value="right">Right</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                  <TextField
                    label="Image URL (optional)"
                    value={editingPage.content?.imageUrl || ''}
                    onChange={(e) => setEditingPage({
                      ...editingPage,
                      content: { ...editingPage.content, imageUrl: e.target.value },
                    })}
                    fullWidth
                    placeholder="https://example.com/image.jpg"
                  />
                  {editingPage.content?.imageUrl && (
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                      <InputLabel>Image Position</InputLabel>
                      <Select
                        value={editingPage.content?.imagePosition || 'top'}
                        label="Image Position"
                        onChange={(e) => setEditingPage({
                          ...editingPage,
                          content: { ...editingPage.content, imagePosition: e.target.value as 'top' | 'left' | 'right' | 'background' },
                        })}
                      >
                        <MenuItem value="top">Top</MenuItem>
                        <MenuItem value="left">Left</MenuItem>
                        <MenuItem value="right">Right</MenuItem>
                        <MenuItem value="background">Background</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                  <TextField
                    label="Video URL (optional)"
                    value={editingPage.content?.videoUrl || ''}
                    onChange={(e) => setEditingPage({
                      ...editingPage,
                      content: { ...editingPage.content, videoUrl: e.target.value },
                    })}
                    fullWidth
                    placeholder="https://www.youtube.com/embed/..."
                  />
                </Box>
              )}

              {/* Summary Settings Tab */}
              {editTab === 1 && editingPage.pageType === 'summary' && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={editingPage.summaryConfig?.showAllFields ?? true}
                        onChange={(e) => setEditingPage({
                          ...editingPage,
                          summaryConfig: { ...editingPage.summaryConfig, showAllFields: e.target.checked },
                        })}
                      />
                    }
                    label="Show all collected fields"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={editingPage.summaryConfig?.groupByPage ?? true}
                        onChange={(e) => setEditingPage({
                          ...editingPage,
                          summaryConfig: { ...editingPage.summaryConfig, groupByPage: e.target.checked },
                        })}
                      />
                    }
                    label="Group fields by page"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={editingPage.summaryConfig?.excludeEmptyFields ?? false}
                        onChange={(e) => setEditingPage({
                          ...editingPage,
                          summaryConfig: { ...editingPage.summaryConfig, excludeEmptyFields: e.target.checked },
                        })}
                      />
                    }
                    label="Hide empty fields"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={editingPage.summaryConfig?.allowEdit ?? true}
                        onChange={(e) => setEditingPage({
                          ...editingPage,
                          summaryConfig: { ...editingPage.summaryConfig, allowEdit: e.target.checked },
                        })}
                      />
                    }
                    label="Allow editing from summary"
                  />
                  <TextField
                    label="Confirm Button Label"
                    value={editingPage.summaryConfig?.confirmLabel || ''}
                    onChange={(e) => setEditingPage({
                      ...editingPage,
                      summaryConfig: { ...editingPage.summaryConfig, confirmLabel: e.target.value },
                    })}
                    placeholder="Confirm & Submit"
                    fullWidth
                  />
                </Box>
              )}

              {/* Completion Settings Tab */}
              {editTab === 1 && editingPage.pageType === 'complete' && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    label="Heading"
                    value={editingPage.completionConfig?.heading || ''}
                    onChange={(e) => setEditingPage({
                      ...editingPage,
                      completionConfig: { ...editingPage.completionConfig, heading: e.target.value },
                    })}
                    placeholder="You're all set!"
                    fullWidth
                  />
                  <TextField
                    label="Message"
                    value={editingPage.completionConfig?.message || ''}
                    onChange={(e) => setEditingPage({
                      ...editingPage,
                      completionConfig: { ...editingPage.completionConfig, message: e.target.value },
                    })}
                    placeholder="Thank you for completing the form."
                    fullWidth
                    multiline
                    rows={3}
                  />
                  <FormControl size="small" fullWidth>
                    <InputLabel>Icon</InputLabel>
                    <Select
                      value={editingPage.completionConfig?.icon || 'checkmark'}
                      label="Icon"
                      onChange={(e) => setEditingPage({
                        ...editingPage,
                        completionConfig: { ...editingPage.completionConfig, icon: e.target.value as 'checkmark' | 'celebration' | 'thumbsUp' | 'none' },
                      })}
                    >
                      <MenuItem value="checkmark">Checkmark</MenuItem>
                      <MenuItem value="celebration">Celebration</MenuItem>
                      <MenuItem value="thumbsUp">Thumbs Up</MenuItem>
                      <MenuItem value="none">None</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={editingPage.completionConfig?.showConfetti ?? false}
                        onChange={(e) => setEditingPage({
                          ...editingPage,
                          completionConfig: { ...editingPage.completionConfig, showConfetti: e.target.checked },
                        })}
                      />
                    }
                    label="Show confetti animation"
                  />
                  <Divider />
                  <Typography variant="subtitle2">Actions</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Add buttons for users to take action after completing the form
                  </Typography>
                  {(editingPage.completionConfig?.actions || []).map((action, idx) => (
                    <Box key={action.id} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <TextField
                        size="small"
                        label="Label"
                        value={action.label}
                        onChange={(e) => {
                          const actions = [...(editingPage.completionConfig?.actions || [])];
                          actions[idx] = { ...actions[idx], label: e.target.value };
                          setEditingPage({
                            ...editingPage,
                            completionConfig: { ...editingPage.completionConfig, actions },
                          });
                        }}
                        sx={{ flex: 1 }}
                      />
                      <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Action</InputLabel>
                        <Select
                          value={action.action}
                          label="Action"
                          onChange={(e) => {
                            const actions = [...(editingPage.completionConfig?.actions || [])];
                            actions[idx] = { ...actions[idx], action: e.target.value as 'navigate' | 'close' | 'restart' };
                            setEditingPage({
                              ...editingPage,
                              completionConfig: { ...editingPage.completionConfig, actions },
                            });
                          }}
                        >
                          <MenuItem value="navigate">Navigate</MenuItem>
                          <MenuItem value="close">Close</MenuItem>
                          <MenuItem value="restart">Restart</MenuItem>
                        </Select>
                      </FormControl>
                      {action.action === 'navigate' && (
                        <TextField
                          size="small"
                          label="URL"
                          value={action.url || ''}
                          onChange={(e) => {
                            const actions = [...(editingPage.completionConfig?.actions || [])];
                            actions[idx] = { ...actions[idx], url: e.target.value };
                            setEditingPage({
                              ...editingPage,
                              completionConfig: { ...editingPage.completionConfig, actions },
                            });
                          }}
                          sx={{ flex: 1 }}
                        />
                      )}
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => {
                          const actions = (editingPage.completionConfig?.actions || []).filter((_, i) => i !== idx);
                          setEditingPage({
                            ...editingPage,
                            completionConfig: { ...editingPage.completionConfig, actions },
                          });
                        }}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                  <Button
                    size="small"
                    startIcon={<Add />}
                    onClick={() => {
                      const actions = [...(editingPage.completionConfig?.actions || [])];
                      actions.push({ id: generateId(), label: 'Close', action: 'close', variant: 'primary' });
                      setEditingPage({
                        ...editingPage,
                        completionConfig: { ...editingPage.completionConfig, actions },
                      });
                    }}
                  >
                    Add Action
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setEditDialogOpen(false); setEditTab(0); }}>Cancel</Button>
          <Button
            onClick={() => {
              if (editingPage) {
                updatePage(editingPage.id, editingPage);
              }
              setEditDialogOpen(false);
              setEditTab(0);
            }}
            variant="contained"
            sx={{ bgcolor: editingPage ? getPageTypeInfo(editingPage.pageType).color : '#e91e63', '&:hover': { opacity: 0.9 } }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
