/**
 * Template Detail Dialog
 *
 * Shows detailed preview of a form template with field list,
 * features, use cases, and option to use the template.
 * Includes JSON viewer tabs for template and sample data export.
 */

'use client';

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  Chip,
  Stack,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Tabs,
  Tab,
  Tooltip,
} from '@mui/material';
import {
  Close as CloseIcon,
  AccessTime as TimeIcon,
  CheckCircle as CheckIcon,
  LightbulbOutlined as UseCaseIcon,
  ViewList as FieldsIcon,
  AutoAwesome as FeaturedIcon,
  Lock as LockIcon,
  Security as SecurityIcon,
  Shield as ShieldIcon,
  VerifiedUser as VerifiedUserIcon,
  Code as CodeIcon,
  Download as DownloadIcon,
  ContentCopy as CopyIcon,
  DataObject as DataObjectIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import {
  FormTemplate,
  getCategoryMeta,
  formatComplexity,
  formatFormType,
} from '@/types/formTemplate';
import { TemplateIcon } from './TemplateIcon';
import { generateSampleData } from '@/lib/templates/sampleDataGenerator';

interface TemplateDetailDialogProps {
  open: boolean;
  template: FormTemplate;
  onClose: () => void;
  onUseTemplate: (template: FormTemplate) => void;
}

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

const COMPLIANCE_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  HIPAA: { bg: 'rgba(239, 68, 68, 0.12)', text: '#ef4444', icon: '🏥' },
  'PCI-DSS': { bg: 'rgba(245, 158, 11, 0.12)', text: '#f59e0b', icon: '💳' },
  GDPR: { bg: 'rgba(59, 130, 246, 0.12)', text: '#3b82f6', icon: '🇪🇺' },
  SOC2: { bg: 'rgba(139, 92, 246, 0.12)', text: '#8b5cf6', icon: '🔒' },
  CCPA: { bg: 'rgba(34, 197, 94, 0.12)', text: '#22c55e', icon: '🌴' },
  FERPA: { bg: 'rgba(236, 72, 153, 0.12)', text: '#ec4899', icon: '📚' },
};

/**
 * Extract encryption information from template fields
 */
function getEncryptionInfo(fields: any[]): {
  encryptedFields: any[];
  complianceFrameworks: string[];
  hasIndexedEncryption: boolean;
  hasUnindexedEncryption: boolean;
} {
  const encryptedFields = fields.filter((f) => f.encryption?.enabled);
  const complianceSet = new Set<string>();
  let hasIndexed = false;
  let hasUnindexed = false;

  encryptedFields.forEach((field) => {
    if (field.encryption?.compliance) {
      field.encryption.compliance.forEach((c: string) => complianceSet.add(c));
    }
    if (field.encryption?.algorithm === 'Indexed') hasIndexed = true;
    if (field.encryption?.algorithm === 'Unindexed') hasUnindexed = true;
  });

  return {
    encryptedFields,
    complianceFrameworks: Array.from(complianceSet),
    hasIndexedEncryption: hasIndexed,
    hasUnindexedEncryption: hasUnindexed,
  };
}

/**
 * Download JSON as a file
 */
function downloadJSON(data: object, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Copy text to clipboard
 */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function TemplateDetailDialog({
  open,
  template,
  onClose,
  onUseTemplate,
}: TemplateDetailDialogProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [copiedTemplate, setCopiedTemplate] = useState(false);
  const [copiedSampleData, setCopiedSampleData] = useState(false);

  const categoryMeta = getCategoryMeta(template.category);
  const complexityColor = COMPLEXITY_COLORS[template.complexity] || COMPLEXITY_COLORS.simple;
  const formTypeColor = FORM_TYPE_COLORS[template.formType] || FORM_TYPE_COLORS.traditional;

  // Filter out layout fields for display
  const actualFields = template.fieldConfigs.filter((f) => f.type !== 'layout');

  // Get encryption info
  const encryptionInfo = getEncryptionInfo(template.fieldConfigs);
  const layoutFields = template.fieldConfigs.filter(
    (f) => f.type === 'layout' && f.layout?.type === 'section-header'
  );

  // Generate sample data (memoized)
  const sampleData = useMemo(() => generateSampleData(template, 5), [template]);

  // Prepare template JSON for export (clean version without internal fields)
  const templateJSON = useMemo(() => {
    return {
      id: template.id,
      name: template.name,
      description: template.shortDescription,
      fullDescription: template.fullDescription,
      category: template.category,
      icon: template.icon,
      complexity: template.complexity,
      formType: template.formType,
      estimatedTime: template.estimatedTime,
      tags: template.tags,
      features: template.features,
      useCases: template.useCases,
      isFeatured: template.isFeatured,
      fieldConfigs: template.fieldConfigs,
      theme: template.theme,
      conversationalConfig: template.conversationalConfig,
    };
  }, [template]);

  const templateJSONString = JSON.stringify(templateJSON, null, 2);
  const sampleDataJSONString = JSON.stringify(sampleData, null, 2);

  const handleCopyTemplate = async () => {
    const success = await copyToClipboard(templateJSONString);
    if (success) {
      setCopiedTemplate(true);
      setTimeout(() => setCopiedTemplate(false), 2000);
    }
  };

  const handleCopySampleData = async () => {
    const success = await copyToClipboard(sampleDataJSONString);
    if (success) {
      setCopiedSampleData(true);
      setTimeout(() => setCopiedSampleData(false), 2000);
    }
  };

  const handleDownloadTemplate = () => {
    downloadJSON(templateJSON, `${template.id}-template.json`);
  };

  const handleDownloadSampleData = () => {
    downloadJSON(sampleData, `${template.id}-sample-data.json`);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle sx={{ pb: 1, pr: 6 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 2,
              bgcolor: 'rgba(0, 237, 100, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <TemplateIcon icon={template.icon} size={28} />
          </Box>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {template.name}
              </Typography>
              {template.isFeatured && (
                <Chip
                  icon={<FeaturedIcon sx={{ fontSize: 14 }} />}
                  label="Featured"
                  size="small"
                  sx={{
                    bgcolor: 'rgba(251, 191, 36, 0.15)',
                    color: '#fbbf24',
                    fontWeight: 600,
                    '& .MuiChip-icon': { color: '#fbbf24' },
                  }}
                />
              )}
            </Box>
            <Typography variant="body2" color="text.secondary">
              {categoryMeta?.name || template.category}
            </Typography>
          </Box>
        </Box>
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 12,
            top: 12,
            color: 'text.secondary',
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{
            minHeight: 40,
            '& .MuiTab-root': {
              minHeight: 40,
              textTransform: 'none',
              fontWeight: 500,
            },
          }}
        >
          <Tab icon={<DescriptionIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Overview" />
          <Tab icon={<CodeIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Template JSON" />
          <Tab icon={<DataObjectIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Sample Data" />
        </Tabs>
      </Box>

      <DialogContent dividers sx={{ p: 0 }}>
        {/* Tab 0: Overview */}
        {activeTab === 0 && (
          <Box sx={{ p: 3 }}>
            {/* Description */}
            <Typography variant="body1" sx={{ mb: 3 }}>
              {template.fullDescription}
            </Typography>

            {/* Quick Stats */}
            <Stack direction="row" spacing={1} sx={{ mb: 3, flexWrap: 'wrap', gap: 1 }}>
              <Chip
                label={formatComplexity(template.complexity)}
                sx={{
                  bgcolor: complexityColor.bg,
                  color: complexityColor.text,
                  fontWeight: 600,
                }}
              />
              <Chip
                label={formatFormType(template.formType)}
                sx={{
                  bgcolor: formTypeColor.bg,
                  color: formTypeColor.text,
                  fontWeight: 600,
                }}
              />
              <Chip
                icon={<TimeIcon sx={{ fontSize: 16 }} />}
                label={`${template.estimatedTime} min to complete`}
                sx={{
                  bgcolor: 'rgba(100, 116, 139, 0.1)',
                  '& .MuiChip-icon': { color: 'inherit' },
                }}
              />
              <Chip
                icon={<FieldsIcon sx={{ fontSize: 16 }} />}
                label={`${actualFields.length} fields`}
                sx={{
                  bgcolor: 'rgba(100, 116, 139, 0.1)',
                  '& .MuiChip-icon': { color: 'inherit' },
                }}
              />
              {encryptionInfo.encryptedFields.length > 0 && (
                <Chip
                  icon={<LockIcon sx={{ fontSize: 16 }} />}
                  label={`${encryptionInfo.encryptedFields.length} encrypted`}
                  sx={{
                    bgcolor: 'rgba(34, 197, 94, 0.15)',
                    color: '#22c55e',
                    fontWeight: 600,
                    '& .MuiChip-icon': { color: '#22c55e' },
                  }}
                />
              )}
            </Stack>

            {/* Tags */}
            {template.tags.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                  Tags
                </Typography>
                <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                  {template.tags.map((tag) => (
                    <Chip
                      key={tag}
                      label={tag}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: '0.75rem' }}
                    />
                  ))}
                </Stack>
              </Box>
            )}

            {/* Security & Encryption Section */}
            {encryptionInfo.encryptedFields.length > 0 && (
              <>
                <Divider sx={{ my: 3 }} />
                <Box sx={{ mb: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <ShieldIcon sx={{ color: '#22c55e', fontSize: 20 }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      Security & Encryption
                    </Typography>
                  </Box>

                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      bgcolor: 'rgba(34, 197, 94, 0.05)',
                      border: '1px solid',
                      borderColor: 'rgba(34, 197, 94, 0.2)',
                      borderRadius: 2,
                    }}
                  >
                    {/* Compliance Frameworks */}
                    {encryptionInfo.complianceFrameworks.length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 600,
                            color: 'text.secondary',
                            textTransform: 'uppercase',
                            letterSpacing: 0.5,
                          }}
                        >
                          Compliance Ready
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
                          {encryptionInfo.complianceFrameworks.map((framework) => {
                            const colors = COMPLIANCE_COLORS[framework] || {
                              bg: 'rgba(100, 116, 139, 0.1)',
                              text: '#64748b',
                              icon: '🔒',
                            };
                            return (
                              <Chip
                                key={framework}
                                label={`${colors.icon} ${framework}`}
                                size="small"
                                sx={{
                                  bgcolor: colors.bg,
                                  color: colors.text,
                                  fontWeight: 600,
                                  fontSize: '0.75rem',
                                }}
                              />
                            );
                          })}
                        </Stack>
                      </Box>
                    )}

                    {/* Encryption Types */}
                    <Box sx={{ mb: 2 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 600,
                          color: 'text.secondary',
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                        }}
                      >
                        Encryption Types
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                        {encryptionInfo.hasIndexedEncryption && (
                          <Chip
                            icon={<SecurityIcon sx={{ fontSize: 14 }} />}
                            label="Queryable Encryption"
                            size="small"
                            variant="outlined"
                            sx={{
                              borderColor: 'rgba(59, 130, 246, 0.5)',
                              color: '#3b82f6',
                              '& .MuiChip-icon': { color: '#3b82f6' },
                            }}
                          />
                        )}
                        {encryptionInfo.hasUnindexedEncryption && (
                          <Chip
                            icon={<VerifiedUserIcon sx={{ fontSize: 14 }} />}
                            label="Max Security (Unindexed)"
                            size="small"
                            variant="outlined"
                            sx={{
                              borderColor: 'rgba(139, 92, 246, 0.5)',
                              color: '#8b5cf6',
                              '& .MuiChip-icon': { color: '#8b5cf6' },
                            }}
                          />
                        )}
                      </Stack>
                    </Box>

                    {/* Encrypted Fields List */}
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 600,
                          color: 'text.secondary',
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                        }}
                      >
                        Protected Fields ({encryptionInfo.encryptedFields.length})
                      </Typography>
                      <List dense disablePadding sx={{ mt: 0.5 }}>
                        {encryptionInfo.encryptedFields.map((field, idx) => (
                          <ListItem key={field.path || idx} disableGutters sx={{ py: 0.25 }}>
                            <ListItemIcon sx={{ minWidth: 24 }}>
                              <LockIcon sx={{ fontSize: 14, color: '#22c55e' }} />
                            </ListItemIcon>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {field.label}
                                  </Typography>
                                  <Typography
                                    component="span"
                                    variant="caption"
                                    sx={{
                                      color:
                                        field.encryption?.algorithm === 'Indexed'
                                          ? '#3b82f6'
                                          : '#8b5cf6',
                                      fontSize: '0.65rem',
                                      textTransform: 'uppercase',
                                    }}
                                  >
                                    ({field.encryption?.algorithm})
                                  </Typography>
                                </Box>
                              }
                              secondary={field.encryption?.encryptionReason}
                              secondaryTypographyProps={{
                                variant: 'caption',
                                sx: { fontSize: '0.7rem' },
                              }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  </Paper>
                </Box>
              </>
            )}

            <Divider sx={{ my: 3 }} />

            {/* Two-column layout for Features and Use Cases */}
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              {/* Features */}
              {template.features.length > 0 && (
                <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
                  <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600 }}>
                    Features
                  </Typography>
                  <List dense disablePadding>
                    {template.features.map((feature, idx) => (
                      <ListItem key={idx} disableGutters sx={{ py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 28 }}>
                          <CheckIcon sx={{ fontSize: 18, color: '#00ED64' }} />
                        </ListItemIcon>
                        <ListItemText primary={feature} primaryTypographyProps={{ variant: 'body2' }} />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {/* Use Cases */}
              {template.useCases.length > 0 && (
                <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
                  <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600 }}>
                    Best For
                  </Typography>
                  <List dense disablePadding>
                    {template.useCases.map((useCase, idx) => (
                      <ListItem key={idx} disableGutters sx={{ py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 28 }}>
                          <UseCaseIcon sx={{ fontSize: 18, color: '#fbbf24' }} />
                        </ListItemIcon>
                        <ListItemText primary={useCase} primaryTypographyProps={{ variant: 'body2' }} />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Form Structure Preview */}
            <Box>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                Form Structure
              </Typography>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  bgcolor: 'background.default',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  maxHeight: 300,
                  overflowY: 'auto',
                }}
              >
                {layoutFields.length > 0 ? (
                  <Box>
                    {layoutFields.map((section, idx) => {
                      const sectionFields = getSectionFields(template.fieldConfigs, idx);
                      return (
                        <Box key={idx} sx={{ mb: idx < layoutFields.length - 1 ? 2 : 0 }}>
                          <Typography
                            variant="subtitle2"
                            sx={{
                              fontWeight: 600,
                              mb: 1,
                              color: 'text.primary',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                            }}
                          >
                            <Box
                              sx={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                bgcolor: '#00ED64',
                              }}
                            />
                            {section.layout?.title || section.label}
                          </Typography>
                          <Box sx={{ pl: 2 }}>
                            {sectionFields.map((field) => (
                              <Typography
                                key={field.path}
                                variant="body2"
                                color="text.secondary"
                                sx={{ mb: 0.5 }}
                              >
                                {field.label}
                                {field.required && (
                                  <Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>
                                    *
                                  </Typography>
                                )}
                                <Typography
                                  component="span"
                                  sx={{
                                    ml: 1,
                                    fontSize: '0.7rem',
                                    color: 'text.disabled',
                                    textTransform: 'uppercase',
                                  }}
                                >
                                  ({field.type})
                                </Typography>
                              </Typography>
                            ))}
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                ) : (
                  <Box>
                    {actualFields.map((field) => (
                      <Typography key={field.path} variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        {field.label}
                        {field.required && (
                          <Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>
                            *
                          </Typography>
                        )}
                        <Typography
                          component="span"
                          sx={{
                            ml: 1,
                            fontSize: '0.7rem',
                            color: 'text.disabled',
                            textTransform: 'uppercase',
                          }}
                        >
                          ({field.type})
                        </Typography>
                      </Typography>
                    ))}
                  </Box>
                )}
              </Paper>
            </Box>
          </Box>
        )}

        {/* Tab 1: Template JSON */}
        {activeTab === 1 && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Template Configuration
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Full template definition including field configurations, theme, and metadata
                </Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                <Tooltip title={copiedTemplate ? 'Copied!' : 'Copy to clipboard'}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<CopyIcon sx={{ fontSize: 16 }} />}
                    onClick={handleCopyTemplate}
                    sx={{
                      borderColor: copiedTemplate ? '#22c55e' : 'divider',
                      color: copiedTemplate ? '#22c55e' : 'text.secondary',
                    }}
                  >
                    {copiedTemplate ? 'Copied!' : 'Copy'}
                  </Button>
                </Tooltip>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<DownloadIcon sx={{ fontSize: 16 }} />}
                  onClick={handleDownloadTemplate}
                  sx={{
                    bgcolor: '#00ED64',
                    color: 'white',
                    '&:hover': { bgcolor: '#00CC55' },
                  }}
                >
                  Download
                </Button>
              </Stack>
            </Box>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                bgcolor: '#1e1e1e',
                borderRadius: 2,
                maxHeight: 400,
                overflow: 'auto',
              }}
            >
              <pre
                style={{
                  margin: 0,
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  lineHeight: 1.5,
                  color: '#d4d4d4',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {templateJSONString}
              </pre>
            </Paper>
          </Box>
        )}

        {/* Tab 2: Sample Data */}
        {activeTab === 2 && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Sample Data ({sampleData.length} records)
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Auto-generated realistic sample data based on field types and labels
                </Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                <Tooltip title={copiedSampleData ? 'Copied!' : 'Copy to clipboard'}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<CopyIcon sx={{ fontSize: 16 }} />}
                    onClick={handleCopySampleData}
                    sx={{
                      borderColor: copiedSampleData ? '#22c55e' : 'divider',
                      color: copiedSampleData ? '#22c55e' : 'text.secondary',
                    }}
                  >
                    {copiedSampleData ? 'Copied!' : 'Copy'}
                  </Button>
                </Tooltip>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<DownloadIcon sx={{ fontSize: 16 }} />}
                  onClick={handleDownloadSampleData}
                  sx={{
                    bgcolor: '#00ED64',
                    color: 'white',
                    '&:hover': { bgcolor: '#00CC55' },
                  }}
                >
                  Download
                </Button>
              </Stack>
            </Box>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                bgcolor: '#1e1e1e',
                borderRadius: 2,
                maxHeight: 400,
                overflow: 'auto',
              }}
            >
              <pre
                style={{
                  margin: 0,
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  lineHeight: 1.5,
                  color: '#d4d4d4',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {sampleDataJSONString}
              </pre>
            </Paper>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2.5, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" sx={{ borderRadius: 2 }}>
          Cancel
        </Button>
        <Button
          onClick={() => onUseTemplate(template)}
          variant="contained"
          sx={{
            bgcolor: '#00ED64',
            color: 'white',
            borderRadius: 2,
            px: 4,
            fontWeight: 600,
            '&:hover': { bgcolor: '#00CC55' },
          }}
        >
          Use This Template
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/**
 * Get fields that belong to a section (between section headers)
 */
function getSectionFields(fields: any[], sectionIndex: number): any[] {
  const layoutFields = fields
    .map((f, i) => ({ field: f, index: i }))
    .filter((item) => item.field.type === 'layout' && item.field.layout?.type === 'section-header');

  if (sectionIndex >= layoutFields.length) return [];

  const startIdx = layoutFields[sectionIndex].index + 1;
  const endIdx = layoutFields[sectionIndex + 1]?.index ?? fields.length;

  return fields.slice(startIdx, endIdx).filter((f) => f.type !== 'layout');
}
