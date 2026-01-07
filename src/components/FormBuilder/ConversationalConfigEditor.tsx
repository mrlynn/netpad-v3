'use client';

import { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormControlLabel,
  Switch,
  Button,
  IconButton,
  Chip,
  Paper,
  Slider,
  Divider,
  Alert,
  Collapse,
  alpha,
} from '@mui/material';
import {
  Add,
  Delete,
  Chat,
  Psychology,
  ExpandMore,
  ExpandLess,
  AutoAwesome,
  SupportAgent,
  Feedback,
  Assignment,
  LocalHospital,
  MedicalServices,
  RateReview,
} from '@mui/icons-material';
import { FormType, FieldConfig } from '@/types/form';
import {
  ConversationalFormConfig,
  ConversationTopic,
  ConversationPersona,
  ExtractionSchema,
  ConversationLimits,
} from '@/types/conversational';
import {
  getTemplates,
  applyTemplateById,
  ConversationTemplate,
} from '@/lib/conversational/templates';

interface ConversationalConfigEditorProps {
  formType: FormType;
  onFormTypeChange: (type: FormType) => void;
  config?: ConversationalFormConfig;
  onChange: (config: ConversationalFormConfig | undefined) => void;
  fieldConfigs: FieldConfig[];
  /** Optional callback to generate form fields from extraction schema */
  onGenerateFieldsFromSchema?: (schema: ExtractionSchema[]) => void;
}

const DEFAULT_CONFIG: ConversationalFormConfig = {
  formType: 'conversational',
  objective: '',
  context: '',
  topics: [],
  persona: {
    style: 'friendly',
  },
  extractionSchema: [],
  conversationLimits: {
    maxTurns: 15,
    maxDuration: 30,
    minConfidence: 0.7,
  },
};

const PERSONA_STYLES = [
  { value: 'professional', label: 'Professional', description: 'Formal, courteous, business-appropriate' },
  { value: 'friendly', label: 'Friendly', description: 'Warm, approachable, conversational' },
  { value: 'casual', label: 'Casual', description: 'Relaxed, informal, easy-going' },
  { value: 'empathetic', label: 'Empathetic', description: 'Sensitive, understanding, supportive' },
  { value: 'custom', label: 'Custom', description: 'Define your own persona prompt' },
];

const TOPIC_PRIORITIES = [
  { value: 'required', label: 'Required', color: '#f44336' },
  { value: 'important', label: 'Important', color: '#ff9800' },
  { value: 'optional', label: 'Optional', color: '#4caf50' },
];

const TOPIC_DEPTHS = [
  { value: 'surface', label: 'Surface', description: 'Quick mention' },
  { value: 'moderate', label: 'Moderate', description: 'Some follow-up' },
  { value: 'deep', label: 'Deep', description: 'Thorough exploration' },
];

// UI template type for display in the editor
interface UITemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
}

// Map template icon names to MUI components
const ICON_MAP: Record<string, React.ElementType> = {
  SupportAgent: SupportAgent,
  RateReview: RateReview,
  MedicalServices: MedicalServices,
  Assignment: Assignment,
  Feedback: Feedback,
  LocalHospital: LocalHospital,
};

// Map template categories to colors
const CATEGORY_COLORS: Record<string, string> = {
  support: '#2196f3',
  feedback: '#9c27b0',
  intake: '#f44336',
  application: '#ff9800',
  general: '#4caf50',
};

// Convert registry template to UI template
function toUITemplate(template: ConversationTemplate): UITemplate {
  return {
    id: template.id,
    name: template.name,
    description: template.description,
    icon: ICON_MAP[template.icon || 'Assignment'] || Assignment,
    color: CATEGORY_COLORS[template.category] || '#4caf50',
  };
}

export function ConversationalConfigEditor({
  formType,
  onFormTypeChange,
  config,
  onChange,
  fieldConfigs,
  onGenerateFieldsFromSchema,
}: ConversationalConfigEditorProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(['basics', 'topics']);
  const isConversational = formType === 'conversational';

  // Load templates from registry and convert to UI format
  const uiTemplates = useMemo(() => {
    const registryTemplates = getTemplates();
    return registryTemplates.map(toUITemplate);
  }, []);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    );
  };

  const handleEnableConversational = (enabled: boolean) => {
    if (enabled) {
      onFormTypeChange('conversational');
      if (!config) {
        onChange(DEFAULT_CONFIG);
      }
    } else {
      onFormTypeChange('data-entry');
      onChange(undefined);
    }
  };

  const updateConfig = (updates: Partial<ConversationalFormConfig>) => {
    const newConfig = { ...(config || DEFAULT_CONFIG), ...updates };
    onChange(newConfig);
  };

  const addTopic = () => {
    const newTopic: ConversationTopic = {
      id: `topic_${Date.now()}`,
      name: '',
      description: '',
      priority: 'important',
      depth: 'moderate',
    };
    updateConfig({
      topics: [...(config?.topics || []), newTopic],
    });
  };

  const updateTopic = (index: number, updates: Partial<ConversationTopic>) => {
    const topics = [...(config?.topics || [])];
    topics[index] = { ...topics[index], ...updates };
    updateConfig({ topics });
  };

  const removeTopic = (index: number) => {
    const topics = [...(config?.topics || [])];
    topics.splice(index, 1);
    updateConfig({ topics });
  };

  const addExtractionField = () => {
    const newSchema: ExtractionSchema = {
      field: '',
      type: 'string',
      required: false,
      description: '',
    };
    updateConfig({
      extractionSchema: [...(config?.extractionSchema || []), newSchema],
    });
  };

  const updateExtractionField = (index: number, updates: Partial<ExtractionSchema>) => {
    const schema = [...(config?.extractionSchema || [])];
    schema[index] = { ...schema[index], ...updates };
    updateConfig({ extractionSchema: schema });
  };

  const removeExtractionField = (index: number) => {
    const schema = [...(config?.extractionSchema || [])];
    schema.splice(index, 1);
    updateConfig({ extractionSchema: schema });
  };

  // Auto-generate extraction schema from field configs
  const generateFromFields = () => {
    const dataFields = fieldConfigs.filter(
      (f) => f.included && !f.layout && f.type !== 'section-header' && f.type !== 'description' && f.type !== 'divider'
    );

    const schema: ExtractionSchema[] = dataFields.map((field) => ({
      field: field.path,
      type: mapFieldType(field.type),
      required: field.required,
      description: field.label,
      options: field.validation?.options?.map((o) =>
        typeof o === 'string' ? o : o.label
      ),
    }));

    const topics: ConversationTopic[] = dataFields.map((field) => ({
      id: `topic_${field.path}`,
      name: field.label,
      description: `Collect information about ${field.label.toLowerCase()}`,
      priority: field.required ? 'required' : 'optional',
      depth: 'moderate',
      extractionField: field.path,
    }));

    updateConfig({
      extractionSchema: schema,
      topics: topics,
    });
  };

  const mapFieldType = (fieldType: string): ExtractionSchema['type'] => {
    switch (fieldType) {
      case 'number':
      case 'rating':
      case 'scale':
      case 'nps':
        return 'number';
      case 'boolean':
      case 'yes-no':
        return 'boolean';
      case 'radio':
      case 'select':
        return 'enum';
      case 'checkbox':
      case 'array':
        return 'array';
      case 'object':
        return 'object';
      default:
        return 'string';
    }
  };

  const applyTemplate = (template: UITemplate) => {
    // Use the registry to apply the template
    const result = applyTemplateById(template.id);
    if (!result) {
      console.error(`Template not found: ${template.id}`);
      return;
    }

    // Get the config from the registry result
    const templateConfig = result.config;

    // Also set useITHelpdeskTemplate for backward compatibility
    // This will be removed in a future version
    if (template.id === 'it-helpdesk') {
      templateConfig.useITHelpdeskTemplate = true;
    }

    onChange(templateConfig);
  };

  return (
    <Box>
      {/* Enable/Disable Toggle */}
      <Box
        sx={{
          p: 2,
          bgcolor: alpha('#00ED64', 0.05),
          borderRadius: 2,
          border: '1px solid',
          borderColor: alpha('#00ED64', 0.2),
          mb: 3,
        }}
      >
        <FormControlLabel
          control={
            <Switch
              checked={isConversational}
              onChange={(e) => handleEnableConversational(e.target.checked)}
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': {
                  color: '#00ED64',
                },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                  backgroundColor: '#00ED64',
                },
              }}
            />
          }
          label={
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Enable Conversational Mode
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Replace traditional form with AI-powered conversation
              </Typography>
            </Box>
          }
        />
      </Box>

      {!isConversational && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Enable conversational mode to configure AI-powered form collection.
          The AI will have a natural conversation with users to collect the data
          defined by your form fields.
        </Alert>
      )}

      <Collapse in={isConversational}>
        {/* Template Selector */}
        {(!config?.topics.length || !config?.extractionSchema.length) && (
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
              Start with a Template
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {uiTemplates.map((template) => {
                const IconComponent = template.icon;
                return (
                  <Paper
                    key={template.id}
                    variant="outlined"
                    sx={{
                      p: 2,
                      minWidth: 180,
                      maxWidth: 220,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': {
                        borderColor: template.color,
                        bgcolor: alpha(template.color, 0.05),
                        transform: 'translateY(-2px)',
                      },
                    }}
                    onClick={() => applyTemplate(template)}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <IconComponent sx={{ color: template.color }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {template.name}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {template.description}
                    </Typography>
                  </Paper>
                );
              })}
            </Box>
          </Paper>
        )}

        {/* Quick Setup from Fields */}
        {fieldConfigs.length > 0 && (!config?.topics.length || !config?.extractionSchema.length) && (
          <Alert
            severity="success"
            action={
              <Button
                color="inherit"
                size="small"
                startIcon={<AutoAwesome />}
                onClick={generateFromFields}
              >
                Generate
              </Button>
            }
            sx={{ mb: 3 }}
          >
            Auto-generate topics and extraction schema from your {fieldConfigs.filter(f => f.included && !f.layout).length} form fields
          </Alert>
        )}

        {/* Basics Section */}
        <Paper sx={{ mb: 2 }}>
          <Box
            sx={{
              p: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
            }}
            onClick={() => toggleSection('basics')}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chat sx={{ color: '#00ED64' }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Conversation Basics
              </Typography>
            </Box>
            {expandedSections.includes('basics') ? <ExpandLess /> : <ExpandMore />}
          </Box>

          <Collapse in={expandedSections.includes('basics')}>
            <Box sx={{ p: 2, pt: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Objective"
                value={config?.objective || ''}
                onChange={(e) => updateConfig({ objective: e.target.value })}
                fullWidth
                size="small"
                multiline
                rows={2}
                placeholder="What should this conversation accomplish?"
                helperText={config?.objective ? "Clear objective helps the AI understand the conversation goal" : "Required: E.g., 'Collect IT support ticket information' or 'Gather customer feedback'"}
                required
                error={!config?.objective}
              />

              <TextField
                label="Context"
                value={config?.context || ''}
                onChange={(e) => updateConfig({ context: e.target.value })}
                fullWidth
                size="small"
                multiline
                rows={2}
                placeholder="Background information for the AI"
                helperText="E.g., company name, support policies, or relevant context"
              />

              <Divider sx={{ my: 1 }} />

              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Conversation Limits
              </Typography>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="Max Turns"
                  type="number"
                  value={config?.conversationLimits?.maxTurns || 15}
                  onChange={(e) =>
                    updateConfig({
                      conversationLimits: {
                        ...(config?.conversationLimits || DEFAULT_CONFIG.conversationLimits),
                        maxTurns: parseInt(e.target.value) || 15,
                      },
                    })
                  }
                  size="small"
                  sx={{ width: 120 }}
                  inputProps={{ min: 5, max: 50 }}
                />
                <TextField
                  label="Max Duration (min)"
                  type="number"
                  value={config?.conversationLimits?.maxDuration || 30}
                  onChange={(e) =>
                    updateConfig({
                      conversationLimits: {
                        ...(config?.conversationLimits || DEFAULT_CONFIG.conversationLimits),
                        maxDuration: parseInt(e.target.value) || 30,
                      },
                    })
                  }
                  size="small"
                  sx={{ width: 140 }}
                  inputProps={{ min: 5, max: 120 }}
                />
              </Box>

              <Box>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Minimum Confidence: {Math.round((config?.conversationLimits?.minConfidence || 0.7) * 100)}%
                </Typography>
                <Slider
                  value={(config?.conversationLimits?.minConfidence || 0.7) * 100}
                  onChange={(_, value) =>
                    updateConfig({
                      conversationLimits: {
                        ...(config?.conversationLimits || DEFAULT_CONFIG.conversationLimits),
                        minConfidence: (value as number) / 100,
                      },
                    })
                  }
                  min={30}
                  max={95}
                  step={5}
                  marks={[
                    { value: 30, label: '30%' },
                    { value: 70, label: '70%' },
                    { value: 95, label: '95%' },
                  ]}
                  sx={{ color: '#00ED64' }}
                />
                <Typography variant="caption" color="text.secondary">
                  Minimum confidence in extracted data before completing
                </Typography>
              </Box>
            </Box>
          </Collapse>
        </Paper>

        {/* Topics Section */}
        <Paper sx={{ mb: 2 }}>
          <Box
            sx={{
              p: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
            }}
            onClick={() => toggleSection('topics')}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Psychology sx={{ color: '#2196f3' }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Topics to Cover
              </Typography>
              {config?.topics?.length ? (
                <Chip label={config.topics.length} size="small" sx={{ bgcolor: alpha('#2196f3', 0.1) }} />
              ) : (
                <Chip label="Required" size="small" color="error" sx={{ fontSize: '0.65rem' }} />
              )}
            </Box>
            {expandedSections.includes('topics') ? <ExpandLess /> : <ExpandMore />}
          </Box>

          <Collapse in={expandedSections.includes('topics')}>
            <Box sx={{ p: 2, pt: 0 }}>
              {config?.topics?.map((topic, index) => (
                <Paper
                  key={topic.id}
                  variant="outlined"
                  sx={{ p: 2, mb: 2, bgcolor: 'action.hover' }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <TextField
                      label="Topic Name"
                      value={topic.name}
                      onChange={(e) => updateTopic(index, { name: e.target.value })}
                      size="small"
                      sx={{ flex: 1, mr: 1 }}
                    />
                    <IconButton
                      size="small"
                      onClick={() => removeTopic(index)}
                      sx={{ color: 'error.main' }}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>

                  <TextField
                    label="Description"
                    value={topic.description}
                    onChange={(e) => updateTopic(index, { description: e.target.value })}
                    fullWidth
                    size="small"
                    multiline
                    rows={2}
                    sx={{ mb: 2 }}
                    placeholder="What should the AI explore about this topic?"
                  />

                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel>Priority</InputLabel>
                      <Select
                        value={topic.priority}
                        label="Priority"
                        onChange={(e) =>
                          updateTopic(index, {
                            priority: e.target.value as ConversationTopic['priority'],
                          })
                        }
                      >
                        {TOPIC_PRIORITIES.map((p) => (
                          <MenuItem key={p.value} value={p.value}>
                            <Chip
                              label={p.label}
                              size="small"
                              sx={{
                                bgcolor: alpha(p.color, 0.1),
                                color: p.color,
                                fontWeight: 500,
                              }}
                            />
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel>Depth</InputLabel>
                      <Select
                        value={topic.depth}
                        label="Depth"
                        onChange={(e) =>
                          updateTopic(index, {
                            depth: e.target.value as ConversationTopic['depth'],
                          })
                        }
                      >
                        {TOPIC_DEPTHS.map((d) => (
                          <MenuItem key={d.value} value={d.value}>
                            {d.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <FormControl size="small" sx={{ minWidth: 140 }}>
                      <InputLabel>Maps to Field</InputLabel>
                      <Select
                        value={topic.extractionField || ''}
                        label="Maps to Field"
                        onChange={(e) =>
                          updateTopic(index, { extractionField: e.target.value || undefined })
                        }
                      >
                        <MenuItem value="">None</MenuItem>
                        {config?.extractionSchema?.map((schema) => (
                          <MenuItem key={schema.field} value={schema.field}>
                            {schema.field}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                </Paper>
              ))}

              <Button
                startIcon={<Add />}
                onClick={addTopic}
                variant="outlined"
                size="small"
                sx={{ borderStyle: 'dashed' }}
              >
                Add Topic
              </Button>
            </Box>
          </Collapse>
        </Paper>

        {/* Persona Section */}
        <Paper sx={{ mb: 2 }}>
          <Box
            sx={{
              p: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
            }}
            onClick={() => toggleSection('persona')}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AutoAwesome sx={{ color: '#9c27b0' }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                AI Persona
              </Typography>
            </Box>
            {expandedSections.includes('persona') ? <ExpandLess /> : <ExpandMore />}
          </Box>

          <Collapse in={expandedSections.includes('persona')}>
            <Box sx={{ p: 2, pt: 0 }}>
              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Communication Style</InputLabel>
                <Select
                  value={config?.persona?.style || 'friendly'}
                  label="Communication Style"
                  onChange={(e) =>
                    updateConfig({
                      persona: {
                        ...(config?.persona || { style: 'friendly' }),
                        style: e.target.value as ConversationPersona['style'],
                      },
                    })
                  }
                >
                  {PERSONA_STYLES.map((style) => (
                    <MenuItem key={style.value} value={style.value}>
                      <Box>
                        <Typography variant="body2">{style.label}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {style.description}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {config?.persona?.style === 'custom' && (
                <TextField
                  label="Custom Persona Prompt"
                  value={config?.persona?.customPrompt || ''}
                  onChange={(e) =>
                    updateConfig({
                      persona: {
                        ...(config?.persona || { style: 'custom' }),
                        customPrompt: e.target.value,
                      },
                    })
                  }
                  fullWidth
                  size="small"
                  multiline
                  rows={4}
                  placeholder="Define how the AI should behave and communicate..."
                />
              )}
            </Box>
          </Collapse>
        </Paper>

        {/* Extraction Schema Section */}
        <Paper sx={{ mb: 2 }}>
          <Box
            sx={{
              p: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
            }}
            onClick={() => toggleSection('extraction')}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Psychology sx={{ color: '#ff9800' }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Data Extraction Schema
              </Typography>
              {config?.extractionSchema?.length ? (
                <Chip
                  label={config.extractionSchema.length}
                  size="small"
                  sx={{ bgcolor: alpha('#ff9800', 0.1) }}
                />
              ) : (
                <Chip label="Required" size="small" color="error" sx={{ fontSize: '0.65rem' }} />
              )}
            </Box>
            {expandedSections.includes('extraction') ? <ExpandLess /> : <ExpandMore />}
          </Box>

          <Collapse in={expandedSections.includes('extraction')}>
            <Box sx={{ p: 2, pt: 0 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  Extraction Schema Required
                </Typography>
                <Typography variant="caption" sx={{ mb: 1, display: 'block' }}>
                  Define the structured data fields that should be extracted from the conversation. 
                  The AI will extract values for these fields based on the conversation content.
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'warning.main' }}>
                  ⚠️ Important: Form fields should match your extraction schema. Use the button below to auto-generate form fields from this schema.
                </Typography>
              </Alert>

              {config?.extractionSchema && config.extractionSchema.length > 0 && (
                <Button
                  variant="outlined"
                  startIcon={<AutoAwesome />}
                  onClick={() => {
                    if (onGenerateFieldsFromSchema) {
                      onGenerateFieldsFromSchema(config.extractionSchema || []);
                    }
                  }}
                  sx={{ mb: 2, width: '100%' }}
                  color="primary"
                >
                  Generate Form Fields from Extraction Schema
                </Button>
              )}

              {config?.extractionSchema?.map((schema, index) => (
                <Paper
                  key={index}
                  variant="outlined"
                  sx={{ p: 2, mb: 2, bgcolor: 'action.hover' }}
                >
                  <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <TextField
                      label="Field Name"
                      value={schema.field}
                      onChange={(e) =>
                        updateExtractionField(index, { field: e.target.value })
                      }
                      size="small"
                      sx={{ flex: 1 }}
                    />
                    <FormControl size="small" sx={{ minWidth: 100 }}>
                      <InputLabel>Type</InputLabel>
                      <Select
                        value={schema.type}
                        label="Type"
                        onChange={(e) =>
                          updateExtractionField(index, {
                            type: e.target.value as ExtractionSchema['type'],
                          })
                        }
                      >
                        <MenuItem value="string">Text</MenuItem>
                        <MenuItem value="number">Number</MenuItem>
                        <MenuItem value="boolean">Yes/No</MenuItem>
                        <MenuItem value="enum">Choice</MenuItem>
                        <MenuItem value="array">List</MenuItem>
                      </Select>
                    </FormControl>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={schema.required}
                          onChange={(e) =>
                            updateExtractionField(index, { required: e.target.checked })
                          }
                          size="small"
                        />
                      }
                      label="Required"
                    />
                    <IconButton
                      size="small"
                      onClick={() => removeExtractionField(index)}
                      sx={{ color: 'error.main' }}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>

                  <TextField
                    label="Description"
                    value={schema.description}
                    onChange={(e) =>
                      updateExtractionField(index, { description: e.target.value })
                    }
                    fullWidth
                    size="small"
                    placeholder="What should be extracted for this field?"
                  />

                  {schema.type === 'enum' && (
                    <TextField
                      label="Options (comma-separated)"
                      value={schema.options?.join(', ') || ''}
                      onChange={(e) =>
                        updateExtractionField(index, {
                          options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                        })
                      }
                      fullWidth
                      size="small"
                      sx={{ mt: 2 }}
                      placeholder="Option 1, Option 2, Option 3"
                    />
                  )}

                  {/* Validation Rules */}
                  <Box sx={{ mt: 2 }}>
                    <Button
                      size="small"
                      startIcon={expandedSections.includes(`validation_${index}`) ? <ExpandLess /> : <ExpandMore />}
                      onClick={() => {
                        const key = `validation_${index}`;
                        setExpandedSections((prev) =>
                          prev.includes(key)
                            ? prev.filter((s) => s !== key)
                            : [...prev, key]
                        );
                      }}
                      sx={{ textTransform: 'none' }}
                    >
                      Validation Rules {schema.validation ? '(configured)' : '(optional)'}
                    </Button>

                    <Collapse in={expandedSections.includes(`validation_${index}`)}>
                      <Box sx={{ mt: 1, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                        {schema.type === 'string' && (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Box sx={{ display: 'flex', gap: 2 }}>
                              <TextField
                                label="Min Length"
                                type="number"
                                value={schema.validation?.minLength || ''}
                                onChange={(e) =>
                                  updateExtractionField(index, {
                                    validation: {
                                      ...(schema.validation || {}),
                                      minLength: e.target.value ? parseInt(e.target.value) : undefined,
                                    },
                                  })
                                }
                                size="small"
                                sx={{ width: 120 }}
                                inputProps={{ min: 0 }}
                                helperText="Minimum characters"
                              />
                              <TextField
                                label="Max Length"
                                type="number"
                                value={schema.validation?.maxLength || ''}
                                onChange={(e) =>
                                  updateExtractionField(index, {
                                    validation: {
                                      ...(schema.validation || {}),
                                      maxLength: e.target.value ? parseInt(e.target.value) : undefined,
                                    },
                                  })
                                }
                                size="small"
                                sx={{ width: 120 }}
                                inputProps={{ min: 1 }}
                                helperText="Maximum characters"
                              />
                            </Box>
                            <TextField
                              label="Pattern (Regex)"
                              value={schema.validation?.pattern || ''}
                              onChange={(e) =>
                                updateExtractionField(index, {
                                  validation: {
                                    ...(schema.validation || {}),
                                    pattern: e.target.value || undefined,
                                  },
                                })
                              }
                              size="small"
                              fullWidth
                              placeholder="^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
                              helperText="Regular expression pattern (e.g., email validation)"
                            />
                          </Box>
                        )}

                        {schema.type === 'number' && (
                          <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField
                              label="Min Value"
                              type="number"
                              value={schema.validation?.min !== undefined ? schema.validation.min : ''}
                              onChange={(e) =>
                                updateExtractionField(index, {
                                  validation: {
                                    ...(schema.validation || {}),
                                    min: e.target.value !== '' ? parseFloat(e.target.value) : undefined,
                                  },
                                })
                              }
                              size="small"
                              sx={{ flex: 1 }}
                              helperText="Minimum value"
                            />
                            <TextField
                              label="Max Value"
                              type="number"
                              value={schema.validation?.max !== undefined ? schema.validation.max : ''}
                              onChange={(e) =>
                                updateExtractionField(index, {
                                  validation: {
                                    ...(schema.validation || {}),
                                    max: e.target.value !== '' ? parseFloat(e.target.value) : undefined,
                                  },
                                })
                              }
                              size="small"
                              sx={{ flex: 1 }}
                              helperText="Maximum value"
                            />
                          </Box>
                        )}

                        {(schema.type === 'string' || schema.type === 'number') && (
                          <Button
                            size="small"
                            onClick={() =>
                              updateExtractionField(index, {
                                validation: undefined,
                              })
                            }
                            sx={{ mt: 1 }}
                          >
                            Clear Validation Rules
                          </Button>
                        )}

                        {schema.type !== 'string' && schema.type !== 'number' && (
                          <Typography variant="body2" color="text.secondary">
                            Validation rules are only available for text and number fields.
                          </Typography>
                        )}
                      </Box>
                    </Collapse>
                  </Box>
                </Paper>
              ))}

              <Button
                startIcon={<Add />}
                onClick={addExtractionField}
                variant="outlined"
                size="small"
                sx={{ borderStyle: 'dashed' }}
              >
                Add Field
              </Button>
            </Box>
          </Collapse>
        </Paper>
      </Collapse>
    </Box>
  );
}
