/**
 * Workflow Templates Gallery View
 *
 * Public gallery showing workflow templates organized by category.
 * Features search, filtering, and template preview.
 */

'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  TextField,
  InputAdornment,
  Grid,
  Chip,
  Stack,
  alpha,
  Paper,
  Card,
  CardContent,
  CardActions,
  Button,
  Tabs,
  Tab,
  Badge,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from '@mui/material';
import {
  Search as SearchIcon,
  Close as CloseIcon,
  PlayArrow as PlayIcon,
  ContentCopy as CopyIcon,
  Schedule as ScheduleIcon,
  AccountTree as WorkflowIcon,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import {
  workflowTemplates,
  workflowTemplateCategories,
  searchWorkflowTemplates,
  getWorkflowTemplatesByCategory,
} from '@/lib/templates/workflowTemplates';
import type { WorkflowTemplate } from '@/lib/templates/loader';

interface WorkflowTemplatesViewProps {
  onUseTemplate?: (template: WorkflowTemplate) => void;
}

const COMPLEXITY_COLORS = {
  simple: 'success',
  moderate: 'warning',
  advanced: 'error',
} as const;

export function WorkflowTemplatesView({ onUseTemplate }: WorkflowTemplatesViewProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  // State
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [previewTemplate, setPreviewTemplate] = useState<WorkflowTemplate | null>(null);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    let result: WorkflowTemplate[];

    // Apply category filter
    if (selectedCategory === 'all') {
      result = [...workflowTemplates];
    } else {
      result = getWorkflowTemplatesByCategory(selectedCategory);
    }

    // Apply search
    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          (t.tags && t.tags.some((tag) => tag.toLowerCase().includes(query)))
      );
    }

    return result;
  }, [selectedCategory, search]);

  // Get counts per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: workflowTemplates.length };
    workflowTemplates.forEach((t) => {
      counts[t.category] = (counts[t.category] || 0) + 1;
    });
    return counts;
  }, []);

  const handleUseTemplate = (template: WorkflowTemplate) => {
    if (onUseTemplate) {
      onUseTemplate(template);
    } else if (isAuthenticated) {
      // Navigate to create workflow with template
      router.push(`/workflows/new?template=${template.id}`);
    } else {
      // Prompt to sign in
      router.push(`/login?redirect=/templates/workflows&template=${template.id}`);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pt: 4, pb: 8 }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="h3" fontWeight="bold" gutterBottom>
            Workflow Templates
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 700, mx: 'auto' }}>
            {workflowTemplates.length} pre-built automation workflows. Start with a template,
            customize for your needs, and deploy in minutes.
          </Typography>
        </Box>

        {/* Search */}
        <Box sx={{ maxWidth: 600, mx: 'auto', mb: 4 }}>
          <TextField
            fullWidth
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: 'background.paper',
                borderRadius: 3,
              },
            }}
          />
        </Box>

        {/* Category Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
          <Tabs
            value={selectedCategory}
            onChange={(_, value) => setSelectedCategory(value)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '0.95rem',
                minHeight: 56,
              },
            }}
          >
            {workflowTemplateCategories.map((category) => (
              <Tab
                key={category.id}
                value={category.id}
                label={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <span>{category.icon}</span>
                    <span>{category.label}</span>
                    <Badge
                      badgeContent={categoryCounts[category.id] || 0}
                      color="primary"
                      sx={{ ml: 1 }}
                    />
                  </Stack>
                }
              />
            ))}
          </Tabs>
        </Box>

        {/* Results count */}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Showing {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''}
          {selectedCategory !== 'all' &&
            ` in ${workflowTemplateCategories.find((c) => c.id === selectedCategory)?.label}`}
          {search && ` matching "${search}"`}
        </Typography>

        {/* Templates Grid */}
        <Grid container spacing={3}>
          {filteredTemplates.map((template) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={template.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.2s',
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 6,
                  },
                }}
                onClick={() => setPreviewTemplate(template)}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  {/* Icon & Category */}
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Typography variant="h3" component="span">
                      {template.icon}
                    </Typography>
                    <Chip
                      label={template.category}
                      size="small"
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </Stack>

                  {/* Name */}
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    {template.name}
                  </Typography>

                  {/* Description */}
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      mb: 2,
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {template.description}
                  </Typography>

                  {/* Meta */}
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip
                      icon={<WorkflowIcon sx={{ fontSize: 16 }} />}
                      label={`${template.nodeCount} nodes`}
                      size="small"
                      variant="outlined"
                    />
                    {template.complexity && (
                      <Chip
                        label={template.complexity}
                        size="small"
                        color={COMPLEXITY_COLORS[template.complexity as keyof typeof COMPLEXITY_COLORS] || 'default'}
                        sx={{ textTransform: 'capitalize' }}
                      />
                    )}
                    {template.estimatedTime && (
                      <Chip
                        icon={<ScheduleIcon sx={{ fontSize: 16 }} />}
                        label={template.estimatedTime}
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </Stack>
                </CardContent>

                <CardActions sx={{ px: 2, pb: 2 }}>
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<PlayIcon />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUseTemplate(template);
                    }}
                  >
                    Use Template
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Empty state */}
        {filteredTemplates.length === 0 && (
          <Paper sx={{ p: 6, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No templates found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Try adjusting your search or category filter
            </Typography>
          </Paper>
        )}

        {/* Preview Dialog */}
        <Dialog
          open={!!previewTemplate}
          onClose={() => setPreviewTemplate(null)}
          maxWidth="md"
          fullWidth
        >
          {previewTemplate && (
            <>
              <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="h4" component="span">
                  {previewTemplate.icon}
                </Typography>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="h5" fontWeight="bold">
                    {previewTemplate.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {previewTemplate.category} • {previewTemplate.nodeCount} nodes
                  </Typography>
                </Box>
                <IconButton onClick={() => setPreviewTemplate(null)}>
                  <CloseIcon />
                </IconButton>
              </DialogTitle>
              <DialogContent dividers>
                <Typography variant="body1" paragraph>
                  {previewTemplate.description}
                </Typography>

                {/* Tags */}
                {previewTemplate.tags && previewTemplate.tags.length > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Tags
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {previewTemplate.tags.map((tag) => (
                        <Chip key={tag} label={tag} size="small" />
                      ))}
                    </Stack>
                  </Box>
                )}

                {/* Workflow Preview */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Workflow Steps
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Stack spacing={2}>
                      {previewTemplate.nodes.map((node, index) => (
                        <Stack
                          key={index}
                          direction="row"
                          spacing={2}
                          alignItems="center"
                          sx={{
                            p: 1.5,
                            bgcolor: alpha('#1976d2', 0.05),
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'divider',
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              bgcolor: 'primary.main',
                              color: 'primary.contrastText',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 'bold',
                            }}
                          >
                            {index + 1}
                          </Typography>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {node.label}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {node.type}
                            </Typography>
                          </Box>
                        </Stack>
                      ))}
                    </Stack>
                  </Paper>
                </Box>

                {/* Meta info */}
                <Stack direction="row" spacing={2}>
                  {previewTemplate.complexity && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Complexity
                      </Typography>
                      <Typography variant="body2" fontWeight="medium" sx={{ textTransform: 'capitalize' }}>
                        {previewTemplate.complexity}
                      </Typography>
                    </Box>
                  )}
                  {previewTemplate.estimatedTime && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Setup Time
                      </Typography>
                      <Typography variant="body2" fontWeight="medium">
                        {previewTemplate.estimatedTime}
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </DialogContent>
              <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={() => setPreviewTemplate(null)}>Cancel</Button>
                <Button
                  variant="contained"
                  startIcon={<PlayIcon />}
                  onClick={() => {
                    handleUseTemplate(previewTemplate);
                    setPreviewTemplate(null);
                  }}
                >
                  Use This Template
                </Button>
              </DialogActions>
            </>
          )}
        </Dialog>
      </Container>
    </Box>
  );
}
