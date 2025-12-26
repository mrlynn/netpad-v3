'use client';

import { useState } from 'react';
import {
  Box,
  Typography,
  Switch,
  FormControlLabel,
  TextField,
  alpha,
  IconButton,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Close,
  Title,
  Notes,
  HorizontalRule,
  Image,
  SpaceBar,
  ExpandMore,
  Tune,
  Rule,
  Link as LinkIcon,
  Functions,
  Security,
  Repeat,
  DataArray,
} from '@mui/icons-material';
import { FieldConfig, LayoutFieldType, FieldWidth } from '@/types/form';
import { ConditionalLogicEditor } from './ConditionalLogicEditor';
import { LookupConfigEditor } from './LookupConfigEditor';
import { ComputedConfigEditor } from './ComputedConfigEditor';
import { RepeaterConfigEditor } from './RepeaterConfigEditor';
import { ArrayPatternConfigEditor } from './ArrayPatternConfigEditor';
import { URLParamConfigEditor } from './URLParamConfigEditor';
import { QuestionTypeAttributeEditor } from './QuestionTypeAttributeEditor';
import { FieldEncryptionSettings } from './FieldEncryptionSettings';
import { HelpButton } from '@/components/Help';

// Layout field types
const LAYOUT_FIELD_TYPES: LayoutFieldType[] = ['section-header', 'description', 'divider', 'image', 'spacer'];

// Get icon for layout field type
const getLayoutIcon = (type: LayoutFieldType) => {
  switch (type) {
    case 'section-header': return <Title fontSize="small" />;
    case 'description': return <Notes fontSize="small" />;
    case 'divider': return <HorizontalRule fontSize="small" />;
    case 'image': return <Image fontSize="small" />;
    case 'spacer': return <SpaceBar fontSize="small" />;
    default: return null;
  }
};

interface FieldDetailPanelProps {
  config: FieldConfig;
  allFieldConfigs: FieldConfig[];
  formSlug?: string;
  onUpdateField: (path: string, updates: Partial<FieldConfig>) => void;
  onClose: () => void;
  advancedMode?: boolean;
}

export function FieldDetailPanel({
  config,
  allFieldConfigs,
  formSlug,
  onUpdateField,
  onClose,
  advancedMode = false,
}: FieldDetailPanelProps) {
  // Check if this is a layout field
  const isLayoutField = (cfg: FieldConfig) => {
    if (cfg.layout) return true;
    const normalizedType = cfg.type?.toLowerCase().trim();
    return LAYOUT_FIELD_TYPES.some(lt => lt === normalizedType);
  };

  const isLayout = isLayoutField(config);

  const getFieldTypeColor = () => {
    if (isLayout) return '#9c27b0';
    if (config.type === 'url-param' || config.urlParam) return '#e91e63';
    if (config.source === 'custom') return '#ff9800';
    if (config.computed) return '#9c27b0';
    if (config.lookup) return '#2196f3';
    return '#00ED64';
  };

  // Check if this is a URL parameter field
  const isUrlParamField = config.type === 'url-param' || !!config.urlParam;

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.paper' }}>
      {/* Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: alpha(getFieldTypeColor(), 0.05)
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              {isLayout && (
                <Box sx={{ color: '#9c27b0', display: 'flex', alignItems: 'center' }}>
                  {getLayoutIcon(config.type as LayoutFieldType)}
                </Box>
              )}
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 600,
                  fontFamily: isLayout ? 'inherit' : 'monospace',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {isLayout ? (config.layout?.title || config.label || config.type) : config.path}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label={config.type}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.65rem',
                  bgcolor: alpha(getFieldTypeColor(), 0.1),
                  color: getFieldTypeColor()
                }}
              />
              {config.source === 'custom' && !isLayout && !isUrlParamField && (
                <Chip
                  label="Custom"
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.65rem',
                    bgcolor: alpha('#ff9800', 0.1),
                    color: '#ff9800'
                  }}
                />
              )}
              {isUrlParamField && (
                <Chip
                  label="URL Param"
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.65rem',
                    bgcolor: alpha('#e91e63', 0.1),
                    color: '#e91e63'
                  }}
                />
              )}
              {isLayout && (
                <Chip
                  label="Layout"
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.65rem',
                    bgcolor: alpha('#9c27b0', 0.1),
                    color: '#9c27b0'
                  }}
                />
              )}
            </Box>
          </Box>
          <IconButton size="small" onClick={onClose}>
            <Close fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* Content - scrollable */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {/* Include toggle for non-layout fields */}
        {!isLayout && (
          <Box sx={{ mb: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={config.included}
                  onChange={(e) =>
                    onUpdateField(config.path, { included: e.target.checked })
                  }
                />
              }
              label={
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  Include in form
                </Typography>
              }
              sx={{ m: 0 }}
            />
          </Box>
        )}

        {/* Layout field content */}
        {isLayout && config.included && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {config.layout?.type === 'section-header' && (
              <>
                <TextField
                  size="small"
                  label="Section Title"
                  value={config.layout.title || ''}
                  onChange={(e) => onUpdateField(config.path, {
                    layout: { ...config.layout!, title: e.target.value },
                    label: e.target.value
                  })}
                  fullWidth
                />
                <TextField
                  size="small"
                  label="Subtitle"
                  value={config.layout.subtitle || ''}
                  onChange={(e) => onUpdateField(config.path, {
                    layout: { ...config.layout!, subtitle: e.target.value }
                  })}
                  fullWidth
                  multiline
                  rows={2}
                />
              </>
            )}
            {config.layout?.type === 'description' && (
              <TextField
                size="small"
                label="Text Content"
                value={config.layout.content || ''}
                onChange={(e) => onUpdateField(config.path, {
                  layout: { ...config.layout!, content: e.target.value }
                })}
                fullWidth
                multiline
                rows={4}
              />
            )}
            {config.layout?.type === 'image' && (
              <>
                <TextField
                  size="small"
                  label="Image URL"
                  value={config.layout.imageUrl || ''}
                  onChange={(e) => onUpdateField(config.path, {
                    layout: { ...config.layout!, imageUrl: e.target.value }
                  })}
                  fullWidth
                />
                <TextField
                  size="small"
                  label="Alt Text"
                  value={config.layout.imageAlt || ''}
                  onChange={(e) => onUpdateField(config.path, {
                    layout: { ...config.layout!, imageAlt: e.target.value }
                  })}
                  fullWidth
                />
              </>
            )}
            {config.layout?.type === 'spacer' && (
              <TextField
                size="small"
                label="Height (pixels)"
                type="number"
                value={config.layout.height || 24}
                onChange={(e) => onUpdateField(config.path, {
                  layout: { ...config.layout!, height: Number(e.target.value) || 24 }
                })}
                inputProps={{ min: 8, max: 200 }}
                fullWidth
              />
            )}
            {config.layout?.type === 'divider' && (
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                A horizontal line will be displayed to separate sections.
              </Typography>
            )}

            <Divider sx={{ my: 1 }} />

            {/* Conditional logic for layout fields */}
            <ConditionalLogicEditor
              config={config}
              allFieldConfigs={allFieldConfigs}
              onUpdate={(conditionalLogic) =>
                onUpdateField(config.path, { conditionalLogic })
              }
            />
          </Box>
        )}

        {/* Data field content - Progressive Disclosure with Accordions */}
        {!isLayout && config.included && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {/* Basic Settings - Always visible, no accordion */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
              <TextField
                size="small"
                label="Label"
                value={config.label}
                onChange={(e) => onUpdateField(config.path, { label: e.target.value })}
                fullWidth
              />
              <TextField
                size="small"
                label="Placeholder"
                value={config.placeholder || ''}
                onChange={(e) => onUpdateField(config.path, { placeholder: e.target.value })}
                fullWidth
              />
              <FormControl size="small" fullWidth>
                <InputLabel>Field Width</InputLabel>
                <Select
                  label="Field Width"
                  value={config.fieldWidth || 'full'}
                  onChange={(e) => onUpdateField(config.path, { fieldWidth: e.target.value as FieldWidth })}
                >
                  <MenuItem value="full">Full Width</MenuItem>
                  <MenuItem value="half">Half (1/2)</MenuItem>
                  <MenuItem value="third">Third (1/3)</MenuItem>
                  <MenuItem value="quarter">Quarter (1/4)</MenuItem>
                </Select>
              </FormControl>

              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={config.required}
                      onChange={(e) =>
                        onUpdateField(config.path, { required: e.target.checked })
                      }
                    />
                  }
                  label={<Typography variant="body2">Required</Typography>}
                  sx={{ m: 0 }}
                />
                {config.source === 'custom' && (
                  <FormControlLabel
                    control={
                      <Switch
                        size="small"
                        checked={config.includeInDocument !== false}
                        onChange={(e) =>
                          onUpdateField(config.path, { includeInDocument: e.target.checked })
                        }
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="body2">Save to DB</Typography>
                        <HelpButton
                          topicId="include-in-document"
                          tooltip="What does 'Include in Document' mean?"
                          size="small"
                        />
                      </Box>
                    }
                    sx={{ m: 0 }}
                  />
                )}
              </Box>
            </Box>

            <Divider sx={{ mb: 1 }} />

            {/* Type Options - Accordion */}
            <Accordion defaultExpanded>
              <AccordionSummary
                expandIcon={<ExpandMore />}
                sx={{ px: 0, minHeight: 40 }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Tune sx={{ fontSize: 18, color: 'text.secondary' }} />
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Type Options
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 0, pt: 0 }}>
                <QuestionTypeAttributeEditor
                  config={config}
                  onUpdate={(updates) => onUpdateField(config.path, updates)}
                />
              </AccordionDetails>
            </Accordion>

            {/* Logic & Data - Accordion (Advanced mode or if has active config) */}
            {(advancedMode || config.conditionalLogic?.conditions?.length || config.lookup || config.computed || config.repeater?.enabled) && (
              <Accordion>
                <AccordionSummary
                  expandIcon={<ExpandMore />}
                  sx={{ px: 0, minHeight: 40 }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Rule sx={{ fontSize: 18, color: 'text.secondary' }} />
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      Logic & Data
                    </Typography>
                    {(config.conditionalLogic?.conditions?.length || config.lookup || config.computed) && (
                      <Chip
                        label="Active"
                        size="small"
                        sx={{
                          height: 16,
                          fontSize: '0.6rem',
                          bgcolor: alpha('#00ED64', 0.1),
                          color: '#00ED64',
                        }}
                      />
                    )}
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ px: 0, pt: 0 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <ConditionalLogicEditor
                      config={config}
                      allFieldConfigs={allFieldConfigs}
                      onUpdate={(conditionalLogic) =>
                        onUpdateField(config.path, { conditionalLogic })
                      }
                    />

                    <LookupConfigEditor
                      config={config}
                      allFieldConfigs={allFieldConfigs}
                      onUpdate={(lookup) =>
                        onUpdateField(config.path, { lookup })
                      }
                    />

                    <ComputedConfigEditor
                      config={config}
                      allFieldConfigs={allFieldConfigs}
                      onUpdate={(computed) =>
                        onUpdateField(config.path, { computed })
                      }
                    />

                    <RepeaterConfigEditor
                      config={config}
                      onUpdate={(repeater) =>
                        onUpdateField(config.path, { repeater })
                      }
                    />

                    {/* Array Pattern Editor - only for array fields */}
                    {(config.type === 'array' || config.type === 'array-object') && (
                      <ArrayPatternConfigEditor
                        config={config.arrayPattern}
                        onChange={(arrayPattern) =>
                          onUpdateField(config.path, { arrayPattern })
                        }
                        sampleValue={config.defaultValue}
                      />
                    )}

                    {/* URL Parameter Config Editor - for url-param fields */}
                    {isUrlParamField && (
                      <URLParamConfigEditor
                        config={config.urlParam || { paramName: '', dataType: 'string' }}
                        fieldPath={config.path}
                        formSlug={formSlug}
                        onChange={(urlParam) =>
                          onUpdateField(config.path, { urlParam })
                        }
                      />
                    )}
                  </Box>
                </AccordionDetails>
              </Accordion>
            )}

            {/* Security - Accordion (Advanced mode or if has active config) */}
            {(advancedMode || config.encryption?.enabled) && (
              <Accordion>
                <AccordionSummary
                  expandIcon={<ExpandMore />}
                  sx={{ px: 0, minHeight: 40 }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Security sx={{ fontSize: 18, color: 'text.secondary' }} />
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      Security
                    </Typography>
                    {config.encryption?.enabled && (
                      <Chip
                        label="Encrypted"
                        size="small"
                        sx={{
                          height: 16,
                          fontSize: '0.6rem',
                          bgcolor: alpha('#9c27b0', 0.1),
                          color: '#9c27b0',
                        }}
                      />
                    )}
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ px: 0, pt: 0 }}>
                  <FieldEncryptionSettings
                    fieldConfig={config}
                    onChange={(encryption) =>
                      onUpdateField(config.path, { encryption })
                    }
                  />
                </AccordionDetails>
              </Accordion>
            )}

            {/* Hint for simple mode users */}
            {!advancedMode && !config.conditionalLogic?.conditions?.length && !config.lookup && !config.computed && !config.encryption?.enabled && (
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  mt: 2,
                  p: 1.5,
                  bgcolor: alpha('#00ED64', 0.05),
                  borderRadius: 1,
                  color: 'text.secondary',
                  textAlign: 'center',
                }}
              >
                Enable Advanced Mode in the toolbar to access conditional logic, lookups, and security settings.
              </Typography>
            )}
          </Box>
        )}

        {/* Disabled state message */}
        {!config.included && !isLayout && (
          <Box
            sx={{
              textAlign: 'center',
              py: 4,
              color: 'text.secondary'
            }}
          >
            <Typography variant="body2">
              This field is excluded from the form.
            </Typography>
            <Typography variant="caption">
              Toggle &quot;Include in form&quot; to configure this field.
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
