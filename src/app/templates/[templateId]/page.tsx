/**
 * Template Detail Page
 *
 * Comprehensive view of a single form template with:
 * - Full description
 * - Key features
 * - Use cases
 * - Complete field listing
 * - Related templates
 * - Use Template action
 */

'use client';

import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Chip,
  Paper,
  Grid,
  Divider,
  Breadcrumbs,
  Link as MuiLink,
  Stack,
  alpha,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useTheme,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  ContentCopy as CopyIcon,
  AccessTime as TimeIcon,
  Check as CheckIcon,
  Category as CategoryIcon,
  Lightbulb as LightbulbIcon,
  Person as PersonIcon,
  ArrowForward as ArrowForwardIcon,
  Build as BuildIcon,
  Code as CodeIcon,
  AccountTree as WorkflowIcon,
  Storage as StorageIcon,
  TipsAndUpdates as TipsIcon,
  Download as DownloadIcon,
  DataObject as JsonIcon,
  TableChart as CsvIcon,
  Visibility as ViewIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import { AppNavBar } from '@/components/Navigation/AppNavBar';
import { TemplateIcon } from '@/components/Templates/TemplateIcon';
import { InteractivePreviewDialog } from '@/components/Templates/InteractivePreviewDialog';
import { TemplateInstantiationModal } from '@/components/Templates/TemplateInstantiationModal';
import {
  loadGalleryTemplate,
  loadGalleryTemplatesByCategory,
  loadGalleryTemplates,
} from '@/lib/templates/loader';
import {
  exportTemplateAsJson,
  exportSampleDataAsJson,
  exportSampleDataAsCsv,
  exportNetPadPackage,
} from '@/lib/templates/templateExporter';
import { generateSampleData } from '@/lib/templates/sampleDataGenerator';
import {
  FormTemplate,
  getCategoryMeta,
  formatComplexity,
  formatFormType,
} from '@/types/formTemplate';

// Complexity colors
const COMPLEXITY_COLORS: Record<string, { bg: string; text: string }> = {
  simple: { bg: 'rgba(34, 197, 94, 0.1)', text: '#22c55e' },
  moderate: { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b' },
  advanced: { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444' },
};

const FORM_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  traditional: { bg: 'rgba(59, 130, 246, 0.1)', text: '#3b82f6' },
  conversational: { bg: 'rgba(168, 85, 247, 0.1)', text: '#a855f7' },
  hybrid: { bg: 'rgba(236, 72, 153, 0.1)', text: '#ec4899' },
};

// Difficulty colors for customization tips
const DIFFICULTY_COLORS: Record<string, { bg: string; text: string }> = {
  easy: { bg: 'rgba(34, 197, 94, 0.1)', text: '#22c55e' },
  medium: { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b' },
  advanced: { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444' },
};

// Field type display names and colors
const FIELD_TYPE_INFO: Record<string, { label: string; color: string }> = {
  text: { label: 'Text', color: '#6366f1' },
  email: { label: 'Email', color: '#3b82f6' },
  phone: { label: 'Phone', color: '#06b6d4' },
  number: { label: 'Number', color: '#8b5cf6' },
  currency: { label: 'Currency', color: '#10b981' },
  textarea: { label: 'Long Text', color: '#f59e0b' },
  select: { label: 'Dropdown', color: '#ec4899' },
  multiSelect: { label: 'Multi-Select', color: '#f43f5e' },
  checkbox: { label: 'Checkbox', color: '#84cc16' },
  yesNo: { label: 'Yes/No', color: '#22c55e' },
  date: { label: 'Date', color: '#0ea5e9' },
  time: { label: 'Time', color: '#14b8a6' },
  datetime: { label: 'Date & Time', color: '#0891b2' },
  file: { label: 'File Upload', color: '#a855f7' },
  url: { label: 'URL', color: '#6366f1' },
  address: { label: 'Address', color: '#f97316' },
  rating: { label: 'Rating', color: '#fbbf24' },
  signature: { label: 'Signature', color: '#8b5cf6' },
  sectionHeader: { label: 'Section', color: '#64748b' },
};

export default function TemplateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const templateId = params.templateId as string;
  const [previewOpen, setPreviewOpen] = useState(false);
  const [jsonViewerOpen, setJsonViewerOpen] = useState<'template' | 'sample' | null>(null);
  const [copied, setCopied] = useState(false);
  const [instantiateOpen, setInstantiateOpen] = useState(false);

  // Load template
  const template = useMemo(() => loadGalleryTemplate(templateId), [templateId]);

  // Get related templates (same category, excluding current)
  const relatedTemplates = useMemo(() => {
    if (!template) return [];
    const categoryTemplates = loadGalleryTemplatesByCategory(template.category);
    return categoryTemplates
      .filter((t) => t.id !== template.id)
      .slice(0, 4);
  }, [template]);

  // Get category metadata
  const categoryMeta = template ? getCategoryMeta(template.category) : null;

  // Generate JSON strings for viewers
  const templateJson = useMemo(() => {
    if (!template) return '';
    return JSON.stringify(template, null, 2);
  }, [template]);

  const sampleDataJson = useMemo(() => {
    if (!template) return '';
    const samples = generateSampleData(template, 5);
    return JSON.stringify(samples, null, 2);
  }, [template]);

  // Copy to clipboard handler
  const handleCopy = useCallback(async () => {
    const content = jsonViewerOpen === 'template' ? templateJson : sampleDataJson;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [jsonViewerOpen, templateJson, sampleDataJson]);

  // Download handler for viewer modal
  const handleDownloadFromViewer = useCallback(() => {
    if (!template) return;
    if (jsonViewerOpen === 'template') {
      exportTemplateAsJson(template);
    } else if (jsonViewerOpen === 'sample') {
      exportSampleDataAsJson(template);
    }
  }, [jsonViewerOpen, template]);

  // Handle get started - opens instantiation modal
  const handleGetStarted = () => {
    if (template) {
      setInstantiateOpen(true);
    }
  };

  if (!template) {
    return (
      <>
        <AppNavBar />
        <Container maxWidth="lg" sx={{ py: 8 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h4" sx={{ mb: 2 }}>
              Template Not Found
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 4 }}>
              The template you're looking for doesn't exist or has been removed.
            </Typography>
            <Button
              component={Link}
              href="/templates"
              startIcon={<ArrowBackIcon />}
              variant="contained"
              sx={{
                bgcolor: '#00ED64',
                color: 'white',
                '&:hover': { bgcolor: '#00CC55' },
              }}
            >
              Back to Templates
            </Button>
          </Box>
        </Container>
      </>
    );
  }

  const complexityColor = COMPLEXITY_COLORS[template.complexity] || COMPLEXITY_COLORS.simple;
  const formTypeColor = FORM_TYPE_COLORS[template.formType] || FORM_TYPE_COLORS.traditional;

  // Count fields by type (excluding section headers)
  const fieldCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    template.fieldConfigs.forEach((field) => {
      const type = field.type || 'text';
      counts[type] = (counts[type] || 0) + 1;
    });
    return counts;
  }, [template.fieldConfigs]);

  const totalFields = template.fieldConfigs.filter(
    (f) => f.type !== 'sectionHeader'
  ).length;

  return (
    <>
      <AppNavBar />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Breadcrumbs */}
        <Breadcrumbs sx={{ mb: 3 }}>
          <MuiLink
            component={Link}
            href="/templates"
            color="inherit"
            underline="hover"
            sx={{ display: 'flex', alignItems: 'center' }}
          >
            Templates
          </MuiLink>
          <MuiLink
            component={Link}
            href={`/templates?category=${template.category}`}
            color="inherit"
            underline="hover"
          >
            {categoryMeta?.name || template.category}
          </MuiLink>
          <Typography color="text.primary">{template.name}</Typography>
        </Breadcrumbs>

        <Grid container spacing={4}>
          {/* Left Column - Main Content */}
          <Grid item xs={12} md={8}>
            {/* Header */}
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3, mb: 3 }}>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: 3,
                    bgcolor: isDark ? 'rgba(0, 237, 100, 0.08)' : 'rgba(0, 237, 100, 0.1)',
                    border: isDark ? 'none' : '1px solid rgba(0, 237, 100, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <TemplateIcon icon={template.icon} size={40} />
                </Box>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {template.enhanced?.headline || template.name}
                    </Typography>
                    {template.isFeatured && (
                      <Chip
                        label="Featured"
                        size="small"
                        sx={{
                          bgcolor: 'rgba(251, 191, 36, 0.15)',
                          color: '#fbbf24',
                          fontWeight: 600,
                        }}
                      />
                    )}
                  </Box>
                  {template.enhanced?.headline && (
                    <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
                      {template.name}
                    </Typography>
                  )}
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                    {template.enhanced?.subheadline || template.shortDescription}
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip
                      label={formatComplexity(template.complexity)}
                      size="small"
                      sx={{
                        bgcolor: complexityColor.bg,
                        color: complexityColor.text,
                        fontWeight: 500,
                      }}
                    />
                    <Chip
                      label={formatFormType(template.formType)}
                      size="small"
                      sx={{
                        bgcolor: formTypeColor.bg,
                        color: formTypeColor.text,
                        fontWeight: 500,
                      }}
                    />
                    <Chip
                      icon={<TimeIcon sx={{ fontSize: 14 }} />}
                      label={`~${template.estimatedTime} min to complete`}
                      size="small"
                      variant="outlined"
                      sx={{ '& .MuiChip-icon': { color: 'inherit' } }}
                    />
                    <Chip
                      label={`${totalFields} fields`}
                      size="small"
                      variant="outlined"
                    />
                  </Stack>
                </Box>
              </Box>
            </Box>

            {/* Full Description - Enhanced or Standard */}
            <Paper
              elevation={0}
              sx={{
                p: 3,
                mb: 3,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                About This Template
              </Typography>
              {template.enhanced?.longDescription ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                    {template.enhanced.longDescription.opening}
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                    {template.enhanced.longDescription.solution}
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                    {template.enhanced.longDescription.outcome}
                  </Typography>
                </Box>
              ) : (
                <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                  {template.fullDescription}
                </Typography>
              )}
            </Paper>

            {/* Key Features */}
            <Paper
              elevation={0}
              sx={{
                p: 3,
                mb: 3,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <CheckIcon sx={{ color: '#00ED64' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Key Features
                </Typography>
              </Box>
              <List disablePadding>
                {template.features.map((feature, index) => (
                  <ListItem key={index} disablePadding sx={{ py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <CheckIcon sx={{ fontSize: 18, color: '#00ED64' }} />
                    </ListItemIcon>
                    <ListItemText primary={feature} />
                  </ListItem>
                ))}
              </List>
            </Paper>

            {/* Use Cases - Enhanced or Standard */}
            <Paper
              elevation={0}
              sx={{
                p: 3,
                mb: 3,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <LightbulbIcon sx={{ color: '#f59e0b' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {template.enhanced?.useCases ? 'Use Cases' : 'Perfect For'}
                </Typography>
              </Box>
              {template.enhanced?.useCases ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {template.enhanced.useCases.map((useCase, index) => (
                    <Box
                      key={index}
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        bgcolor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                        <Typography variant="h6" component="span">
                          {useCase.icon}
                        </Typography>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          {useCase.title}
                        </Typography>
                        <Chip
                          label={useCase.industry}
                          size="small"
                          variant="outlined"
                          sx={{ ml: 'auto', fontSize: '0.7rem' }}
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                        {useCase.scenario}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1.5, fontStyle: 'italic' }}>
                        <strong>Pain point:</strong> {useCase.painPoint}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography variant="caption" color="text.secondary">
                          Key fields:
                        </Typography>
                        {useCase.keyFields.map((field) => (
                          <Chip
                            key={field}
                            label={field}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.65rem',
                              bgcolor: 'rgba(0, 237, 100, 0.1)',
                              color: '#00ED64',
                            }}
                          />
                        ))}
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                        {useCase.exampleOrganization}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              ) : (
                <List disablePadding>
                  {template.useCases.map((useCase, index) => (
                    <ListItem key={index} disablePadding sx={{ py: 0.5 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <ArrowForwardIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      </ListItemIcon>
                      <ListItemText primary={useCase} />
                    </ListItem>
                  ))}
                </List>
              )}
            </Paper>

            {/* Form Schema / Field Listing */}
            <Paper
              elevation={0}
              sx={{
                p: 3,
                mb: 3,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Form Fields ({totalFields})
              </Typography>

              {/* Field type summary */}
              <Box sx={{ mb: 3 }}>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {Object.entries(fieldCounts)
                    .filter(([type]) => type !== 'sectionHeader')
                    .map(([type, count]) => (
                      <Chip
                        key={type}
                        label={`${FIELD_TYPE_INFO[type]?.label || type} (${count})`}
                        size="small"
                        sx={{
                          bgcolor: alpha(FIELD_TYPE_INFO[type]?.color || '#64748b', 0.1),
                          color: FIELD_TYPE_INFO[type]?.color || '#64748b',
                          fontWeight: 500,
                          fontSize: '0.75rem',
                        }}
                      />
                    ))}
                </Stack>
              </Box>

              <Divider sx={{ mb: 2 }} />

              {/* Field list */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {template.fieldConfigs.map((field, index) => {
                  const typeInfo = FIELD_TYPE_INFO[field.type || 'text'];
                  const isSectionHeader = field.type === 'sectionHeader';

                  if (isSectionHeader) {
                    return (
                      <Box
                        key={index}
                        sx={{
                          mt: index > 0 ? 2 : 0,
                          mb: 1,
                          pb: 1,
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        <Typography
                          variant="subtitle2"
                          sx={{
                            fontWeight: 600,
                            color: 'text.primary',
                            textTransform: 'uppercase',
                            letterSpacing: 0.5,
                          }}
                        >
                          {field.label}
                        </Typography>
                      </Box>
                    );
                  }

                  return (
                    <Box
                      key={index}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        p: 1.5,
                        borderRadius: 1,
                        bgcolor: 'rgba(0, 0, 0, 0.02)',
                        '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.04)' },
                      }}
                    >
                      <Chip
                        label={typeInfo?.label || field.type}
                        size="small"
                        sx={{
                          minWidth: 80,
                          bgcolor: alpha(typeInfo?.color || '#64748b', 0.1),
                          color: typeInfo?.color || '#64748b',
                          fontWeight: 500,
                          fontSize: '0.7rem',
                        }}
                      />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {field.label}
                        </Typography>
                        {field.placeholder && (
                          <Typography variant="caption" color="text.secondary">
                            {field.placeholder}
                          </Typography>
                        )}
                      </Box>
                      {field.required && (
                        <Chip
                          label="Required"
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '0.65rem',
                            bgcolor: 'rgba(239, 68, 68, 0.1)',
                            color: '#ef4444',
                          }}
                        />
                      )}
                    </Box>
                  );
                })}
              </Box>
            </Paper>

            {/* Customization Tips - Enhanced Only */}
            {template.enhanced?.customizationTips && template.enhanced.customizationTips.length > 0 && (
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  mb: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <TipsIcon sx={{ color: '#8b5cf6' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Customization Tips
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {template.enhanced.customizationTips.map((tip, index) => {
                    const difficultyColor = DIFFICULTY_COLORS[tip.difficulty] || DIFFICULTY_COLORS.easy;
                    return (
                      <Box
                        key={index}
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          bgcolor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {tip.title}
                          </Typography>
                          <Chip
                            label={tip.difficulty}
                            size="small"
                            sx={{
                              ml: 'auto',
                              height: 20,
                              fontSize: '0.65rem',
                              bgcolor: difficultyColor.bg,
                              color: difficultyColor.text,
                              textTransform: 'capitalize',
                            }}
                          />
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          {tip.description}
                        </Typography>
                        {tip.fieldSuggestion && (
                          <Chip
                            label={`Add: ${tip.fieldSuggestion}`}
                            size="small"
                            variant="outlined"
                            sx={{ mt: 1, fontSize: '0.7rem' }}
                          />
                        )}
                      </Box>
                    );
                  })}
                </Box>
              </Paper>
            )}

            {/* Workflow Pairings - Enhanced Only */}
            {template.enhanced?.workflowPairings && template.enhanced.workflowPairings.length > 0 && (
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  mb: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <WorkflowIcon sx={{ color: '#06b6d4' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Suggested Workflows
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {template.enhanced.workflowPairings.map((workflow, index) => (
                    <Box
                      key={index}
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        bgcolor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
                      }}
                    >
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {workflow.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                        Trigger: {workflow.trigger}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                        {workflow.description}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {workflow.benefits.map((benefit, i) => (
                          <Chip
                            key={i}
                            icon={<CheckIcon sx={{ fontSize: 14 }} />}
                            label={benefit}
                            size="small"
                            sx={{
                              height: 24,
                              fontSize: '0.7rem',
                              bgcolor: 'rgba(0, 237, 100, 0.1)',
                              color: '#00ED64',
                              '& .MuiChip-icon': { color: '#00ED64' },
                            }}
                          />
                        ))}
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Paper>
            )}

            {/* Developer Notes - Enhanced Only */}
            {template.enhanced?.developerNotes && (
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  mb: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <CodeIcon sx={{ color: '#3b82f6' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Developer Notes
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {template.enhanced.developerNotes.schemaHighlights.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <StorageIcon sx={{ fontSize: 18 }} /> Schema Highlights
                      </Typography>
                      <List disablePadding dense>
                        {template.enhanced.developerNotes.schemaHighlights.map((item, i) => (
                          <ListItem key={i} disablePadding sx={{ py: 0.25 }}>
                            <ListItemIcon sx={{ minWidth: 24 }}>
                              <ArrowForwardIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                            </ListItemIcon>
                            <ListItemText
                              primary={item}
                              primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}
                  {template.enhanced.developerNotes.integrationHints.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                        Integration Hints
                      </Typography>
                      <List disablePadding dense>
                        {template.enhanced.developerNotes.integrationHints.map((item, i) => (
                          <ListItem key={i} disablePadding sx={{ py: 0.25 }}>
                            <ListItemIcon sx={{ minWidth: 24 }}>
                              <ArrowForwardIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                            </ListItemIcon>
                            <ListItemText
                              primary={item}
                              primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}
                  {template.enhanced.developerNotes.mongoDBConsiderations.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#00ED64' }}>
                        MongoDB Considerations
                      </Typography>
                      <List disablePadding dense>
                        {template.enhanced.developerNotes.mongoDBConsiderations.map((item, i) => (
                          <ListItem key={i} disablePadding sx={{ py: 0.25 }}>
                            <ListItemIcon sx={{ minWidth: 24 }}>
                              <ArrowForwardIcon sx={{ fontSize: 14, color: '#00ED64' }} />
                            </ListItemIcon>
                            <ListItemText
                              primary={item}
                              primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}
                </Box>
              </Paper>
            )}

            {/* Tags */}
            {template.tags.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Tags
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {template.tags.map((tag) => (
                    <Chip
                      key={tag}
                      label={tag}
                      size="small"
                      variant="outlined"
                      sx={{ textTransform: 'lowercase' }}
                    />
                  ))}
                </Stack>
              </Box>
            )}
          </Grid>

          {/* Right Column - Sidebar */}
          <Grid item xs={12} md={4}>
            {/* Use Template Card - Theme-aware */}
            <Paper
              elevation={isDark ? 0 : 2}
              sx={{
                p: 3,
                mb: 3,
                border: '1px solid',
                borderColor: isDark ? 'rgba(0, 237, 100, 0.5)' : 'rgba(0, 237, 100, 0.3)',
                borderRadius: 2,
                bgcolor: isDark ? 'rgba(0, 30, 43, 0.8)' : 'background.paper',
                backdropFilter: isDark ? 'blur(12px)' : 'none',
                WebkitBackdropFilter: isDark ? 'blur(12px)' : 'none',
                boxShadow: isDark
                  ? '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
                  : '0 4px 20px rgba(0, 237, 100, 0.15)',
                position: 'sticky',
                top: 100,
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Get Started
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Create a new app from this template. You can customize all fields, add your branding, and publish in minutes.
              </Typography>
              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={handleGetStarted}
                endIcon={<ArrowForwardIcon />}
                sx={{
                  bgcolor: '#00ED64',
                  color: 'white',
                  fontWeight: 600,
                  py: 1.5,
                  '&:hover': { bgcolor: '#00CC55' },
                }}
              >
                Get Started
              </Button>
              <Button
                fullWidth
                variant="outlined"
                size="large"
                onClick={() => setPreviewOpen(true)}
                sx={{
                  mt: 1.5,
                  fontWeight: 600,
                  py: 1.5,
                  borderColor: isDark ? 'rgba(0, 237, 100, 0.5)' : 'rgba(0, 237, 100, 0.3)',
                  color: '#00ED64',
                  '&:hover': {
                    borderColor: '#00ED64',
                    bgcolor: 'rgba(0, 237, 100, 0.08)',
                  },
                }}
              >
                Try Template
              </Button>

              <Divider sx={{ my: 3 }} />

              {/* Quick Stats */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Complexity
                  </Typography>
                  <Chip
                    label={formatComplexity(template.complexity)}
                    size="small"
                    sx={{
                      height: 20,
                      bgcolor: complexityColor.bg,
                      color: complexityColor.text,
                      fontWeight: 500,
                      fontSize: '0.7rem',
                    }}
                  />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Form Type
                  </Typography>
                  <Chip
                    label={template.formType === 'hybrid' ? 'Both' : template.formType === 'conversational' ? 'AI Chat' : 'Form'}
                    size="small"
                    sx={{
                      height: 20,
                      bgcolor: formTypeColor.bg,
                      color: formTypeColor.text,
                      fontWeight: 500,
                      fontSize: '0.7rem',
                    }}
                  />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Est. Completion
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    ~{template.estimatedTime} min
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Total Fields
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {totalFields}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Category
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {categoryMeta?.name}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Export & View Section */}
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <CodeIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Export & View
                  </Typography>
                </Box>
                <Stack spacing={1.5}>
                  {/* NetPad Package */}
                  <Button
                    size="small"
                    variant="outlined"
                    fullWidth
                    startIcon={<DownloadIcon sx={{ fontSize: 16 }} />}
                    onClick={() => exportNetPadPackage(template)}
                    sx={{
                      justifyContent: 'flex-start',
                      textTransform: 'none',
                      borderColor: 'divider',
                      color: 'text.primary',
                      '&:hover': {
                        borderColor: '#00ED64',
                        bgcolor: 'rgba(0, 237, 100, 0.05)',
                      },
                    }}
                  >
                    NetPad Package (.netpad)
                  </Button>

                  {/* Template JSON - View & Download */}
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                      Template JSON
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<ViewIcon sx={{ fontSize: 14 }} />}
                        onClick={() => setJsonViewerOpen('template')}
                        sx={{
                          flex: 1,
                          textTransform: 'none',
                          fontSize: '0.75rem',
                          borderColor: 'divider',
                          color: 'text.primary',
                          '&:hover': {
                            borderColor: '#3b82f6',
                            bgcolor: 'rgba(59, 130, 246, 0.05)',
                          },
                        }}
                      >
                        View
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<DownloadIcon sx={{ fontSize: 14 }} />}
                        onClick={() => exportTemplateAsJson(template)}
                        sx={{
                          flex: 1,
                          textTransform: 'none',
                          fontSize: '0.75rem',
                          borderColor: 'divider',
                          color: 'text.primary',
                          '&:hover': {
                            borderColor: '#00ED64',
                            bgcolor: 'rgba(0, 237, 100, 0.05)',
                          },
                        }}
                      >
                        Download
                      </Button>
                    </Box>
                  </Box>

                  {/* Sample Data JSON - View & Download */}
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                      Sample Data (5 records)
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<ViewIcon sx={{ fontSize: 14 }} />}
                        onClick={() => setJsonViewerOpen('sample')}
                        sx={{
                          flex: 1,
                          textTransform: 'none',
                          fontSize: '0.75rem',
                          borderColor: 'divider',
                          color: 'text.primary',
                          '&:hover': {
                            borderColor: '#8b5cf6',
                            bgcolor: 'rgba(139, 92, 246, 0.05)',
                          },
                        }}
                      >
                        View
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<DownloadIcon sx={{ fontSize: 14 }} />}
                        onClick={() => exportSampleDataAsJson(template)}
                        sx={{
                          flex: 1,
                          textTransform: 'none',
                          fontSize: '0.75rem',
                          borderColor: 'divider',
                          color: 'text.primary',
                          '&:hover': {
                            borderColor: '#00ED64',
                            bgcolor: 'rgba(0, 237, 100, 0.05)',
                          },
                        }}
                      >
                        JSON
                      </Button>
                      <Tooltip title="Download as CSV">
                        <IconButton
                          size="small"
                          onClick={() => exportSampleDataAsCsv(template)}
                          sx={{
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                            '&:hover': {
                              borderColor: '#00ED64',
                              bgcolor: 'rgba(0, 237, 100, 0.05)',
                            },
                          }}
                        >
                          <CsvIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </Stack>
              </Box>
            </Paper>

            {/* Related Templates */}
            {relatedTemplates.length > 0 && (
              <Paper
                elevation={isDark ? 0 : 1}
                sx={{
                  p: 3,
                  border: '1px solid',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'divider',
                  borderRadius: 2,
                  bgcolor: isDark ? 'rgba(0, 30, 43, 0.6)' : 'background.paper',
                  backdropFilter: isDark ? 'blur(12px)' : 'none',
                  WebkitBackdropFilter: isDark ? 'blur(12px)' : 'none',
                  boxShadow: isDark
                    ? '0 8px 32px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.03)'
                    : undefined,
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  Related Templates
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {relatedTemplates.map((related) => (
                    <Box
                      key={related.id}
                      component={Link}
                      href={`/templates/${related.id}`}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        p: 1.5,
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        textDecoration: 'none',
                        color: 'inherit',
                        transition: 'all 0.15s ease',
                        '&:hover': {
                          borderColor: '#00ED64',
                          bgcolor: 'rgba(0, 237, 100, 0.02)',
                        },
                      }}
                    >
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: 1.5,
                          bgcolor: 'rgba(0, 237, 100, 0.08)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <TemplateIcon icon={related.icon} size={20} />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 600, lineHeight: 1.3 }}
                          noWrap
                        >
                          {related.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {related.shortDescription}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
                <Button
                  component={Link}
                  href={`/templates?category=${template.category}`}
                  fullWidth
                  variant="text"
                  sx={{
                    mt: 2,
                    color: '#00ED64',
                    '&:hover': { bgcolor: 'rgba(0, 237, 100, 0.08)' },
                  }}
                >
                  View All {categoryMeta?.name} Templates
                </Button>
              </Paper>
            )}
          </Grid>
        </Grid>

        {/* Back to Templates */}
        <Box sx={{ mt: 4, pt: 4, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button
            component={Link}
            href="/templates"
            startIcon={<ArrowBackIcon />}
            sx={{ color: 'text.secondary' }}
          >
            Back to All Templates
          </Button>
        </Box>
      </Container>

      {/* Interactive Preview Dialog */}
      <InteractivePreviewDialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        template={template}
      />

      {/* JSON Viewer Modal */}
      <Dialog
        open={!!jsonViewerOpen}
        onClose={() => {
          setJsonViewerOpen(null);
          setCopied(false);
        }}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: isDark ? '#0a1929' : 'background.paper',
            maxHeight: '80vh',
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pb: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {jsonViewerOpen === 'template' ? (
              <JsonIcon sx={{ color: '#3b82f6' }} />
            ) : (
              <StorageIcon sx={{ color: '#8b5cf6' }} />
            )}
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {jsonViewerOpen === 'template' ? 'Template JSON' : 'Sample Data'}
            </Typography>
            {jsonViewerOpen === 'sample' && (
              <Chip
                label="5 records"
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.7rem',
                  bgcolor: 'rgba(139, 92, 246, 0.1)',
                  color: '#8b5cf6',
                }}
              />
            )}
          </Box>
          <IconButton
            onClick={() => {
              setJsonViewerOpen(null);
              setCopied(false);
            }}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Box
            component="pre"
            sx={{
              m: 0,
              p: 2,
              bgcolor: '#1e1e1e',
              color: '#d4d4d4',
              fontSize: '0.8rem',
              fontFamily: '"Fira Code", "Monaco", "Menlo", monospace',
              overflow: 'auto',
              maxHeight: 'calc(80vh - 180px)',
              lineHeight: 1.5,
              '&::-webkit-scrollbar': {
                width: 8,
                height: 8,
              },
              '&::-webkit-scrollbar-thumb': {
                bgcolor: 'rgba(255, 255, 255, 0.2)',
                borderRadius: 4,
              },
              '&::-webkit-scrollbar-track': {
                bgcolor: 'rgba(0, 0, 0, 0.2)',
              },
            }}
          >
            {jsonViewerOpen === 'template' ? templateJson : sampleDataJson}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Tooltip title={copied ? 'Copied!' : 'Copy to clipboard'}>
            <Button
              startIcon={copied ? <CheckIcon /> : <CopyIcon />}
              onClick={handleCopy}
              sx={{
                color: copied ? '#00ED64' : 'text.secondary',
              }}
            >
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </Tooltip>
          <Button
            startIcon={<DownloadIcon />}
            onClick={handleDownloadFromViewer}
            sx={{ color: 'text.secondary' }}
          >
            Download
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button
            variant="contained"
            onClick={() => {
              setJsonViewerOpen(null);
              setCopied(false);
            }}
            sx={{
              bgcolor: '#00ED64',
              color: 'white',
              '&:hover': { bgcolor: '#00CC55' },
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Template Instantiation Modal */}
      <TemplateInstantiationModal
        open={instantiateOpen}
        onClose={() => setInstantiateOpen(false)}
        template={template}
      />
    </>
  );
}
