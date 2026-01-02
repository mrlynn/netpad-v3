'use client';

import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Chip,
  alpha,
  TextField,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Tooltip,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import {
  AutoAwesome,
  People,
  TrendingUp,
  Support,
  CheckCircle as Checklist,
  AttachMoney,
  Close,
  ArrowForward,
  ArrowBack,
  Preview,
  Rocket,
  Description,
  Info,
  Summarize,
  CheckCircle,
} from '@mui/icons-material';
import {
  WizardTemplate,
  WizardTemplateCategory,
  WIZARD_CATEGORY_META,
  WIZARD_COMPLEXITY_META,
} from '@/types/wizardTemplates';
import { wizardTemplates, getTemplatesByCategory } from '@/data/wizardTemplates';
import { FormPage, FieldConfig, MultiPageConfig } from '@/types/form';

interface WizardTemplateSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelectTemplate: (
    template: WizardTemplate,
    customization: { name: string; description?: string }
  ) => void;
}

// Map category icons
const CATEGORY_ICONS: Record<WizardTemplateCategory, React.ReactNode> = {
  hr: <People />,
  sales: <TrendingUp />,
  support: <Support />,
  operations: <Checklist />,
  finance: <AttachMoney />,
  general: <AutoAwesome />,
};

// Page type info for preview
const PAGE_TYPE_INFO = {
  form: { icon: <Description fontSize="small" />, label: 'Form', color: '#e91e63' },
  info: { icon: <Info fontSize="small" />, label: 'Info', color: '#2196F3' },
  summary: { icon: <Summarize fontSize="small" />, label: 'Summary', color: '#FF9800' },
  complete: { icon: <CheckCircle fontSize="small" />, label: 'Complete', color: '#4CAF50' },
};

export function WizardTemplateSelector({
  open,
  onClose,
  onSelectTemplate,
}: WizardTemplateSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<WizardTemplateCategory | 'all'>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<WizardTemplate | null>(null);
  const [step, setStep] = useState<'browse' | 'preview' | 'customize'>('browse');
  const [wizardName, setWizardName] = useState('');
  const [wizardDescription, setWizardDescription] = useState('');

  // Filter templates by category
  const filteredTemplates =
    selectedCategory === 'all'
      ? wizardTemplates
      : getTemplatesByCategory(selectedCategory);

  const handleSelectTemplate = (template: WizardTemplate) => {
    setSelectedTemplate(template);
    setWizardName(template.name);
    setWizardDescription(template.description);
    setStep('preview');
  };

  const handleBack = () => {
    if (step === 'customize') {
      setStep('preview');
    } else if (step === 'preview') {
      setStep('browse');
      setSelectedTemplate(null);
    }
  };

  const handleCreate = () => {
    if (selectedTemplate) {
      onSelectTemplate(selectedTemplate, {
        name: wizardName || selectedTemplate.name,
        description: wizardDescription,
      });
      // Reset state
      setSelectedTemplate(null);
      setStep('browse');
      setWizardName('');
      setWizardDescription('');
    }
  };

  const handleClose = () => {
    setSelectedTemplate(null);
    setStep('browse');
    setWizardName('');
    setWizardDescription('');
    onClose();
  };

  const getPageTypeInfo = (pageType?: string) => {
    return PAGE_TYPE_INFO[pageType as keyof typeof PAGE_TYPE_INFO] || PAGE_TYPE_INFO.form;
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider',
          pb: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <AutoAwesome sx={{ color: '#9C27B0' }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {step === 'browse' && 'Wizard Templates'}
              {step === 'preview' && selectedTemplate?.name}
              {step === 'customize' && 'Customize Your Wizard'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {step === 'browse' && 'Choose a pre-built wizard template to get started quickly'}
              {step === 'preview' && 'Preview the wizard flow and pages'}
              {step === 'customize' && 'Add your branding and settings'}
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={handleClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {/* Browse Templates */}
        {step === 'browse' && (
          <Box sx={{ display: 'flex', minHeight: 500 }}>
            {/* Category Sidebar */}
            <Box
              sx={{
                width: 200,
                borderRight: '1px solid',
                borderColor: 'divider',
                p: 2,
                bgcolor: alpha('#000', 0.02),
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: 600, mb: 1, display: 'block' }}
              >
                CATEGORIES
              </Typography>
              <List dense sx={{ p: 0 }}>
                <ListItem
                  component="div"
                  onClick={() => setSelectedCategory('all')}
                  sx={{
                    borderRadius: 1,
                    mb: 0.5,
                    cursor: 'pointer',
                    bgcolor: selectedCategory === 'all' ? alpha('#9C27B0', 0.1) : 'transparent',
                    '&:hover': { bgcolor: alpha('#9C27B0', 0.05) },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <AutoAwesome
                      fontSize="small"
                      sx={{ color: selectedCategory === 'all' ? '#9C27B0' : 'text.secondary' }}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary="All Templates"
                    primaryTypographyProps={{
                      variant: 'body2',
                      fontWeight: selectedCategory === 'all' ? 600 : 400,
                      color: selectedCategory === 'all' ? '#9C27B0' : 'text.primary',
                    }}
                  />
                  <Chip
                    label={wizardTemplates.length}
                    size="small"
                    sx={{ height: 20, fontSize: '0.7rem' }}
                  />
                </ListItem>
                {(Object.keys(WIZARD_CATEGORY_META) as WizardTemplateCategory[]).map((cat) => {
                  const meta = WIZARD_CATEGORY_META[cat];
                  const count = getTemplatesByCategory(cat).length;
                  if (count === 0) return null;
                  return (
                    <ListItem
                      key={cat}
                      component="div"
                      onClick={() => setSelectedCategory(cat)}
                      sx={{
                        borderRadius: 1,
                        mb: 0.5,
                        cursor: 'pointer',
                        bgcolor: selectedCategory === cat ? alpha(meta.color, 0.1) : 'transparent',
                        '&:hover': { bgcolor: alpha(meta.color, 0.05) },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <Box sx={{ color: selectedCategory === cat ? meta.color : 'text.secondary' }}>
                          {CATEGORY_ICONS[cat]}
                        </Box>
                      </ListItemIcon>
                      <ListItemText
                        primary={meta.label}
                        primaryTypographyProps={{
                          variant: 'body2',
                          fontWeight: selectedCategory === cat ? 600 : 400,
                          color: selectedCategory === cat ? meta.color : 'text.primary',
                        }}
                      />
                      <Chip
                        label={count}
                        size="small"
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                    </ListItem>
                  );
                })}
              </List>
            </Box>

            {/* Template Grid */}
            <Box sx={{ flex: 1, p: 3, overflow: 'auto' }}>
              {filteredTemplates.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <Typography color="text.secondary">
                    No templates available in this category yet.
                  </Typography>
                </Box>
              ) : (
                <Grid container spacing={2}>
                  {filteredTemplates.map((template) => {
                    const catMeta = WIZARD_CATEGORY_META[template.category];
                    const compMeta = WIZARD_COMPLEXITY_META[template.complexity];
                    return (
                      <Grid item xs={12} sm={6} key={template.id}>
                        <Paper
                          elevation={0}
                          onClick={() => handleSelectTemplate(template)}
                          sx={{
                            p: 2.5,
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 2,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              borderColor: catMeta.color,
                              bgcolor: alpha(catMeta.color, 0.02),
                              transform: 'translateY(-2px)',
                              boxShadow: `0 4px 20px ${alpha(catMeta.color, 0.15)}`,
                            },
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                            <Box
                              sx={{
                                width: 48,
                                height: 48,
                                borderRadius: 2,
                                bgcolor: alpha(catMeta.color, 0.1),
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: catMeta.color,
                                flexShrink: 0,
                              }}
                            >
                              {CATEGORY_ICONS[template.category]}
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                                {template.name}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{
                                  mb: 1.5,
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                }}
                              >
                                {template.description}
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                <Chip
                                  label={`${template.pages.length} pages`}
                                  size="small"
                                  sx={{
                                    height: 22,
                                    fontSize: '0.7rem',
                                    bgcolor: alpha(catMeta.color, 0.1),
                                    color: catMeta.color,
                                  }}
                                />
                                <Chip
                                  label={compMeta.label}
                                  size="small"
                                  sx={{ height: 22, fontSize: '0.7rem' }}
                                />
                                <Chip
                                  label={template.estimatedTime}
                                  size="small"
                                  variant="outlined"
                                  sx={{ height: 22, fontSize: '0.7rem' }}
                                />
                              </Box>
                            </Box>
                          </Box>
                        </Paper>
                      </Grid>
                    );
                  })}
                </Grid>
              )}
            </Box>
          </Box>
        )}

        {/* Preview Template */}
        {step === 'preview' && selectedTemplate && (
          <Box sx={{ p: 3 }}>
            <Grid container spacing={3}>
              {/* Template Info */}
              <Grid item xs={12} md={4}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                    height: '100%',
                  }}
                >
                  <Box
                    sx={{
                      width: 64,
                      height: 64,
                      borderRadius: 2,
                      bgcolor: alpha(WIZARD_CATEGORY_META[selectedTemplate.category].color, 0.1),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: WIZARD_CATEGORY_META[selectedTemplate.category].color,
                      mb: 2,
                    }}
                  >
                    {CATEGORY_ICONS[selectedTemplate.category]}
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    {selectedTemplate.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {selectedTemplate.description}
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">
                        Category
                      </Typography>
                      <Chip
                        label={WIZARD_CATEGORY_META[selectedTemplate.category].label}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.65rem',
                          bgcolor: alpha(WIZARD_CATEGORY_META[selectedTemplate.category].color, 0.1),
                          color: WIZARD_CATEGORY_META[selectedTemplate.category].color,
                        }}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">
                        Complexity
                      </Typography>
                      <Typography variant="caption" sx={{ fontWeight: 500 }}>
                        {WIZARD_COMPLEXITY_META[selectedTemplate.complexity].label}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">
                        Pages
                      </Typography>
                      <Typography variant="caption" sx={{ fontWeight: 500 }}>
                        {selectedTemplate.pages.length}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">
                        Fields
                      </Typography>
                      <Typography variant="caption" sx={{ fontWeight: 500 }}>
                        {selectedTemplate.fieldConfigs.length}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">
                        Est. Time
                      </Typography>
                      <Typography variant="caption" sx={{ fontWeight: 500 }}>
                        {selectedTemplate.estimatedTime}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              </Grid>

              {/* Wizard Flow Preview */}
              <Grid item xs={12} md={8}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                    Wizard Flow
                  </Typography>
                  <Stepper
                    alternativeLabel
                    activeStep={-1}
                    sx={{
                      mb: 3,
                      '& .MuiStepLabel-label': { fontSize: '0.75rem' },
                    }}
                  >
                    {selectedTemplate.pages
                      .filter((p) => p.showInNavigation !== false)
                      .slice(0, 6)
                      .map((page, idx) => (
                        <Step key={page.id}>
                          <StepLabel
                            StepIconComponent={() => (
                              <Box
                                sx={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: '50%',
                                  bgcolor: alpha(getPageTypeInfo(page.pageType).color, 0.15),
                                  color: getPageTypeInfo(page.pageType).color,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                {getPageTypeInfo(page.pageType).icon}
                              </Box>
                            )}
                          >
                            {page.title}
                          </StepLabel>
                        </Step>
                      ))}
                  </Stepper>

                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
                    Pages ({selectedTemplate.pages.length})
                  </Typography>
                  <List sx={{ p: 0 }}>
                    {selectedTemplate.pages.map((page, idx) => {
                      const typeInfo = getPageTypeInfo(page.pageType);
                      const fieldCount = page.fields.length;
                      return (
                        <ListItem
                          key={page.id}
                          sx={{
                            px: 1.5,
                            py: 1,
                            bgcolor: alpha(typeInfo.color, 0.03),
                            borderRadius: 1,
                            mb: 0.5,
                            border: '1px solid',
                            borderColor: alpha(typeInfo.color, 0.1),
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            <Box sx={{ color: typeInfo.color }}>{typeInfo.icon}</Box>
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                  {idx + 1}. {page.title}
                                </Typography>
                                <Chip
                                  label={typeInfo.label}
                                  size="small"
                                  sx={{
                                    height: 18,
                                    fontSize: '0.6rem',
                                    bgcolor: alpha(typeInfo.color, 0.1),
                                    color: typeInfo.color,
                                  }}
                                />
                              </Box>
                            }
                            secondary={
                              page.description ||
                              (fieldCount > 0 ? `${fieldCount} fields` : page.pageType === 'info' ? 'Information page' : undefined)
                            }
                            secondaryTypographyProps={{ variant: 'caption' }}
                          />
                        </ListItem>
                      );
                    })}
                  </List>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Customize Wizard */}
        {step === 'customize' && selectedTemplate && (
          <Box sx={{ p: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                  Basic Information
                </Typography>
                <TextField
                  label="Wizard Name"
                  value={wizardName}
                  onChange={(e) => setWizardName(e.target.value)}
                  fullWidth
                  sx={{ mb: 2 }}
                  helperText="Give your wizard a custom name"
                />
                <TextField
                  label="Description"
                  value={wizardDescription}
                  onChange={(e) => setWizardDescription(e.target.value)}
                  fullWidth
                  multiline
                  rows={3}
                  helperText="Describe the purpose of this wizard"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                  What's Included
                </Typography>
                <Paper
                  elevation={0}
                  sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
                >
                  <List dense sx={{ p: 0 }}>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <CheckCircle fontSize="small" sx={{ color: '#4CAF50' }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={`${selectedTemplate.pages.length} pre-configured pages`}
                      />
                    </ListItem>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <CheckCircle fontSize="small" sx={{ color: '#4CAF50' }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={`${selectedTemplate.fieldConfigs.length} form fields with validation`}
                      />
                    </ListItem>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <CheckCircle fontSize="small" sx={{ color: '#4CAF50' }} />
                      </ListItemIcon>
                      <ListItemText primary="Conditional logic included" />
                    </ListItem>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <CheckCircle fontSize="small" sx={{ color: '#4CAF50' }} />
                      </ListItemIcon>
                      <ListItemText primary="Progress indicator" />
                    </ListItem>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <CheckCircle fontSize="small" sx={{ color: '#4CAF50' }} />
                      </ListItemIcon>
                      <ListItemText primary="Review page before submission" />
                    </ListItem>
                  </List>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          py: 2,
          borderTop: '1px solid',
          borderColor: 'divider',
          justifyContent: 'space-between',
        }}
      >
        <Box>
          {step !== 'browse' && (
            <Button startIcon={<ArrowBack />} onClick={handleBack}>
              Back
            </Button>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={handleClose}>Cancel</Button>
          {step === 'preview' && (
            <Button
              variant="contained"
              endIcon={<ArrowForward />}
              onClick={() => setStep('customize')}
              sx={{
                bgcolor: WIZARD_CATEGORY_META[selectedTemplate?.category || 'general'].color,
                '&:hover': {
                  bgcolor: alpha(
                    WIZARD_CATEGORY_META[selectedTemplate?.category || 'general'].color,
                    0.85
                  ),
                },
              }}
            >
              Customize
            </Button>
          )}
          {step === 'customize' && (
            <Button
              variant="contained"
              startIcon={<Rocket />}
              onClick={handleCreate}
              disabled={!wizardName.trim()}
              sx={{
                bgcolor: '#4CAF50',
                '&:hover': { bgcolor: '#43A047' },
              }}
            >
              Create Wizard
            </Button>
          )}
        </Box>
      </DialogActions>
    </Dialog>
  );
}

export default WizardTemplateSelector;
