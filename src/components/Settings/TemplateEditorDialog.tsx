'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Button,
  TextField,
  Typography,
  Tabs,
  Tab,
  IconButton,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Chip,
  Paper,
  Alert,
  CircularProgress,
  alpha,
  Tooltip,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Close,
  Save,
  Add,
  Delete,
  ExpandMore,
  ContentCopy,
  Preview,
  SupportAgent,
  Feedback,
  Assignment,
  Work,
  Category,
} from '@mui/icons-material';
import {
  TemplateCategory,
  TemplatePromptConfig,
  StoredTemplateDefaultConfig,
  ConversationTopic,
  ExtractionSchema,
  StoredTemplateMetadata,
  CreateTemplateRequest,
  StoredTemplate,
} from '@/types/conversational';

// Category options
const CATEGORIES: { value: TemplateCategory; label: string; icon: React.ReactNode }[] = [
  { value: 'support', label: 'Support', icon: <SupportAgent /> },
  { value: 'feedback', label: 'Feedback', icon: <Feedback /> },
  { value: 'intake', label: 'Intake', icon: <Assignment /> },
  { value: 'application', label: 'Application', icon: <Work /> },
  { value: 'general', label: 'General', icon: <Category /> },
];

// Style options for persona
const PERSONA_STYLES = [
  { value: 'professional', label: 'Professional' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'casual', label: 'Casual' },
  { value: 'empathetic', label: 'Empathetic' },
  { value: 'custom', label: 'Custom' },
];

// Topic priority options
const TOPIC_PRIORITIES = [
  { value: 'required', label: 'Required' },
  { value: 'important', label: 'Important' },
  { value: 'optional', label: 'Optional' },
];

// Topic depth options
const TOPIC_DEPTHS = [
  { value: 'surface', label: 'Surface' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'deep', label: 'Deep' },
];

// Field type options
const FIELD_TYPES = [
  { value: 'string', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Yes/No' },
  { value: 'enum', label: 'Select from options' },
  { value: 'array', label: 'List' },
  { value: 'object', label: 'Object' },
];

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      sx={{ py: 2, display: value === index ? 'block' : 'none' }}
    >
      {value === index && children}
    </Box>
  );
}

interface TemplateEditorDialogProps {
  open: boolean;
  onClose: () => void;
  template?: StoredTemplate | null;
  orgId: string;
  onSave: () => void;
}

// Default empty template
const createEmptyTemplate = (): Partial<StoredTemplate> => ({
  name: '',
  description: '',
  category: 'general',
  icon: 'Category',
  status: 'draft',
  scope: 'organization',
  priority: 50,
  enabled: true,
  promptConfig: {
    strategyType: 'default',
    systemPromptTemplate: '',
    templateVariables: {},
  },
  defaultConfig: {
    objective: '',
    context: '',
    persona: {
      style: 'professional',
      tone: '',
      behaviors: [],
      restrictions: [],
    },
    conversationLimits: {
      maxTurns: 10,
      maxDuration: 15,
      minConfidence: 0.7,
    },
  },
  topics: [],
  extractionSchema: [],
  metadata: {
    previewDescription: '',
    useCases: [],
    tags: [],
    estimatedDuration: 5,
  },
});

export function TemplateEditorDialog({
  open,
  onClose,
  template,
  orgId,
  onSave,
}: TemplateEditorDialogProps) {
  const [tabValue, setTabValue] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<StoredTemplate>>(createEmptyTemplate());

  // Reset form when template changes
  useEffect(() => {
    if (template) {
      setFormData({
        ...template,
        // Deep clone nested objects
        promptConfig: { ...template.promptConfig },
        defaultConfig: {
          ...template.defaultConfig,
          persona: { ...template.defaultConfig.persona },
          conversationLimits: { ...template.defaultConfig.conversationLimits },
        },
        topics: template.topics.map(t => ({ ...t })),
        extractionSchema: template.extractionSchema.map(s => ({ ...s })),
        metadata: { ...template.metadata },
      });
    } else {
      setFormData(createEmptyTemplate());
    }
    setTabValue(0);
    setError(null);
  }, [template, open]);

  const isEditMode = !!template;

  // Update nested field helper
  const updateField = useCallback((path: string, value: any) => {
    setFormData(prev => {
      const newData = { ...prev };
      const parts = path.split('.');
      let current: any = newData;

      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) {
          current[parts[i]] = {};
        }
        current[parts[i]] = { ...current[parts[i]] };
        current = current[parts[i]];
      }

      current[parts[parts.length - 1]] = value;
      return newData;
    });
  }, []);

  // Topic management
  const addTopic = useCallback(() => {
    const newTopic: ConversationTopic = {
      id: `topic-${Date.now()}`,
      name: '',
      description: '',
      priority: 'important',
      depth: 'moderate',
    };
    setFormData(prev => ({
      ...prev,
      topics: [...(prev.topics || []), newTopic],
    }));
  }, []);

  const updateTopic = useCallback((index: number, field: keyof ConversationTopic, value: any) => {
    setFormData(prev => {
      const topics = [...(prev.topics || [])];
      topics[index] = { ...topics[index], [field]: value };
      return { ...prev, topics };
    });
  }, []);

  const removeTopic = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      topics: (prev.topics || []).filter((_, i) => i !== index),
    }));
  }, []);

  // Schema field management
  const addSchemaField = useCallback(() => {
    const newField: ExtractionSchema = {
      field: '',
      type: 'string',
      required: false,
      description: '',
    };
    setFormData(prev => ({
      ...prev,
      extractionSchema: [...(prev.extractionSchema || []), newField],
    }));
  }, []);

  const updateSchemaField = useCallback((index: number, field: keyof ExtractionSchema, value: any) => {
    setFormData(prev => {
      const schema = [...(prev.extractionSchema || [])];
      schema[index] = { ...schema[index], [field]: value };
      return { ...prev, extractionSchema: schema };
    });
  }, []);

  const removeSchemaField = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      extractionSchema: (prev.extractionSchema || []).filter((_, i) => i !== index),
    }));
  }, []);

  // Validation
  const validate = useCallback((): boolean => {
    if (!formData.name?.trim()) {
      setError('Template name is required');
      setTabValue(0);
      return false;
    }
    if (!formData.description?.trim()) {
      setError('Description is required');
      setTabValue(0);
      return false;
    }
    if (!formData.defaultConfig?.objective?.trim()) {
      setError('Objective is required');
      setTabValue(1);
      return false;
    }
    if (!formData.topics || formData.topics.length === 0) {
      setError('At least one topic is required');
      setTabValue(2);
      return false;
    }
    for (const topic of formData.topics || []) {
      if (!topic.name?.trim()) {
        setError('All topics must have a name');
        setTabValue(2);
        return false;
      }
    }
    if (!formData.extractionSchema || formData.extractionSchema.length === 0) {
      setError('At least one extraction field is required');
      setTabValue(3);
      return false;
    }
    for (const field of formData.extractionSchema || []) {
      if (!field.field?.trim()) {
        setError('All extraction fields must have a name');
        setTabValue(3);
        return false;
      }
    }
    return true;
  }, [formData]);

  // Save handler
  const handleSave = async () => {
    if (!validate()) return;

    try {
      setSaving(true);
      setError(null);

      const body: CreateTemplateRequest = {
        name: formData.name!,
        description: formData.description!,
        category: formData.category!,
        icon: formData.icon,
        priority: formData.priority,
        promptConfig: formData.promptConfig!,
        defaultConfig: formData.defaultConfig!,
        topics: formData.topics!,
        extractionSchema: formData.extractionSchema!,
        metadata: formData.metadata,
      };

      const url = isEditMode
        ? `/api/organizations/${orgId}/templates/${template!.templateId}`
        : `/api/organizations/${orgId}/templates`;

      const response = await fetch(url, {
        method: isEditMode ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save template');
      }

      onSave();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { height: '85vh', maxHeight: 800 },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid',
          borderColor: 'divider',
          pb: 2,
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {isEditMode ? 'Edit Template' : 'Create Template'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isEditMode ? `Editing: ${template?.name}` : 'Create a new conversational form template'}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={tabValue}
          onChange={(_, v) => setTabValue(v)}
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
          <Tab label="Basics" />
          <Tab label="Persona & Limits" />
          <Tab label="Topics" />
          <Tab label="Extraction Schema" />
          <Tab label="Prompts" />
        </Tabs>
      </Box>

      <DialogContent sx={{ flex: 1, overflow: 'auto' }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Tab 0: Basics */}
        <TabPanel value={tabValue} index={0}>
          <Stack spacing={3}>
            <TextField
              label="Template Name"
              value={formData.name || ''}
              onChange={(e) => updateField('name', e.target.value)}
              fullWidth
              required
              placeholder="e.g., IT Helpdesk Ticket"
            />

            <TextField
              label="Description"
              value={formData.description || ''}
              onChange={(e) => updateField('description', e.target.value)}
              fullWidth
              required
              multiline
              rows={2}
              placeholder="What is this template used for?"
            />

            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={formData.category || 'general'}
                onChange={(e) => updateField('category', e.target.value)}
                label="Category"
              >
                {CATEGORIES.map((cat) => (
                  <MenuItem key={cat.value} value={cat.value}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {cat.icon}
                      {cat.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Priority"
                type="number"
                value={formData.priority || 50}
                onChange={(e) => updateField('priority', parseInt(e.target.value) || 50)}
                sx={{ width: 120 }}
                helperText="Higher = shown first"
              />
              <TextField
                label="Estimated Duration (min)"
                type="number"
                value={formData.metadata?.estimatedDuration || 5}
                onChange={(e) => updateField('metadata.estimatedDuration', parseInt(e.target.value) || 5)}
                sx={{ width: 180 }}
              />
            </Box>

            <TextField
              label="Preview Description"
              value={formData.metadata?.previewDescription || ''}
              onChange={(e) => updateField('metadata.previewDescription', e.target.value)}
              fullWidth
              multiline
              rows={2}
              placeholder="Short description shown in template selector"
            />

            <TextField
              label="Tags (comma-separated)"
              value={(formData.metadata?.tags || []).join(', ')}
              onChange={(e) => updateField('metadata.tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
              fullWidth
              placeholder="helpdesk, support, technical"
            />
          </Stack>
        </TabPanel>

        {/* Tab 1: Persona & Limits */}
        <TabPanel value={tabValue} index={1}>
          <Stack spacing={3}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Conversation Objective
            </Typography>
            <TextField
              label="Objective"
              value={formData.defaultConfig?.objective || ''}
              onChange={(e) => updateField('defaultConfig.objective', e.target.value)}
              fullWidth
              required
              multiline
              rows={2}
              placeholder="What should the AI accomplish in this conversation?"
            />

            <TextField
              label="Context"
              value={formData.defaultConfig?.context || ''}
              onChange={(e) => updateField('defaultConfig.context', e.target.value)}
              fullWidth
              multiline
              rows={2}
              placeholder="Additional context about the business or situation"
            />

            <Divider />

            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              AI Persona
            </Typography>

            <FormControl fullWidth>
              <InputLabel>Communication Style</InputLabel>
              <Select
                value={formData.defaultConfig?.persona?.style || 'professional'}
                onChange={(e) => updateField('defaultConfig.persona.style', e.target.value)}
                label="Communication Style"
              >
                {PERSONA_STYLES.map((style) => (
                  <MenuItem key={style.value} value={style.value}>
                    {style.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Tone"
              value={formData.defaultConfig?.persona?.tone || ''}
              onChange={(e) => updateField('defaultConfig.persona.tone', e.target.value)}
              fullWidth
              placeholder="e.g., Warm and helpful"
            />

            <TextField
              label="Behaviors (one per line)"
              value={(formData.defaultConfig?.persona?.behaviors || []).join('\n')}
              onChange={(e) => updateField('defaultConfig.persona.behaviors', e.target.value.split('\n').filter(Boolean))}
              fullWidth
              multiline
              rows={3}
              placeholder="Ask clarifying questions\nProvide helpful suggestions"
            />

            <TextField
              label="Restrictions (one per line)"
              value={(formData.defaultConfig?.persona?.restrictions || []).join('\n')}
              onChange={(e) => updateField('defaultConfig.persona.restrictions', e.target.value.split('\n').filter(Boolean))}
              fullWidth
              multiline
              rows={3}
              placeholder="Don't make promises\nDon't provide medical advice"
            />

            <Divider />

            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Conversation Limits
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <TextField
                label="Max Turns"
                type="number"
                value={formData.defaultConfig?.conversationLimits?.maxTurns || 10}
                onChange={(e) => updateField('defaultConfig.conversationLimits.maxTurns', parseInt(e.target.value) || 10)}
                sx={{ width: 120 }}
              />
              <TextField
                label="Max Duration (min)"
                type="number"
                value={formData.defaultConfig?.conversationLimits?.maxDuration || 15}
                onChange={(e) => updateField('defaultConfig.conversationLimits.maxDuration', parseInt(e.target.value) || 15)}
                sx={{ width: 150 }}
              />
              <TextField
                label="Min Confidence"
                type="number"
                inputProps={{ step: 0.1, min: 0, max: 1 }}
                value={formData.defaultConfig?.conversationLimits?.minConfidence || 0.7}
                onChange={(e) => updateField('defaultConfig.conversationLimits.minConfidence', parseFloat(e.target.value) || 0.7)}
                sx={{ width: 150 }}
                helperText="0-1 scale"
              />
            </Box>
          </Stack>
        </TabPanel>

        {/* Tab 2: Topics */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Conversation Topics ({formData.topics?.length || 0})
            </Typography>
            <Button
              startIcon={<Add />}
              onClick={addTopic}
              variant="outlined"
              size="small"
              sx={{
                borderColor: '#00ED64',
                color: '#00ED64',
                '&:hover': { borderColor: '#00D659', bgcolor: alpha('#00ED64', 0.1) },
              }}
            >
              Add Topic
            </Button>
          </Box>

          {formData.topics?.length === 0 && (
            <Paper
              elevation={0}
              sx={{
                p: 4,
                textAlign: 'center',
                border: '1px dashed',
                borderColor: 'divider',
                borderRadius: 2,
              }}
            >
              <Typography color="text.secondary">
                No topics defined. Add topics to guide the conversation.
              </Typography>
            </Paper>
          )}

          <Stack spacing={2}>
            {formData.topics?.map((topic, index) => (
              <Paper
                key={topic.id}
                elevation={0}
                sx={{
                  p: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                }}
              >
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <TextField
                    label="Topic Name"
                    value={topic.name}
                    onChange={(e) => updateTopic(index, 'name', e.target.value)}
                    size="small"
                    sx={{ flex: 1 }}
                    required
                  />
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Priority</InputLabel>
                    <Select
                      value={topic.priority}
                      onChange={(e) => updateTopic(index, 'priority', e.target.value)}
                      label="Priority"
                    >
                      {TOPIC_PRIORITIES.map((p) => (
                        <MenuItem key={p.value} value={p.value}>
                          {p.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Depth</InputLabel>
                    <Select
                      value={topic.depth}
                      onChange={(e) => updateTopic(index, 'depth', e.target.value)}
                      label="Depth"
                    >
                      {TOPIC_DEPTHS.map((d) => (
                        <MenuItem key={d.value} value={d.value}>
                          {d.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <IconButton
                    onClick={() => removeTopic(index)}
                    color="error"
                    size="small"
                  >
                    <Delete />
                  </IconButton>
                </Box>
                <TextField
                  label="Description"
                  value={topic.description}
                  onChange={(e) => updateTopic(index, 'description', e.target.value)}
                  fullWidth
                  size="small"
                  multiline
                  rows={2}
                  placeholder="What should be explored in this topic?"
                />
              </Paper>
            ))}
          </Stack>
        </TabPanel>

        {/* Tab 3: Extraction Schema */}
        <TabPanel value={tabValue} index={3}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Extraction Fields ({formData.extractionSchema?.length || 0})
            </Typography>
            <Button
              startIcon={<Add />}
              onClick={addSchemaField}
              variant="outlined"
              size="small"
              sx={{
                borderColor: '#00ED64',
                color: '#00ED64',
                '&:hover': { borderColor: '#00D659', bgcolor: alpha('#00ED64', 0.1) },
              }}
            >
              Add Field
            </Button>
          </Box>

          {formData.extractionSchema?.length === 0 && (
            <Paper
              elevation={0}
              sx={{
                p: 4,
                textAlign: 'center',
                border: '1px dashed',
                borderColor: 'divider',
                borderRadius: 2,
              }}
            >
              <Typography color="text.secondary">
                No extraction fields defined. Add fields to specify what data to extract.
              </Typography>
            </Paper>
          )}

          <Stack spacing={2}>
            {formData.extractionSchema?.map((field, index) => (
              <Paper
                key={index}
                elevation={0}
                sx={{
                  p: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                }}
              >
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <TextField
                    label="Field Name"
                    value={field.field}
                    onChange={(e) => updateSchemaField(index, 'field', e.target.value)}
                    size="small"
                    sx={{ flex: 1 }}
                    required
                    placeholder="e.g., issue_description"
                  />
                  <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Type</InputLabel>
                    <Select
                      value={field.type}
                      onChange={(e) => updateSchemaField(index, 'type', e.target.value)}
                      label="Type"
                    >
                      {FIELD_TYPES.map((t) => (
                        <MenuItem key={t.value} value={t.value}>
                          {t.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={field.required}
                        onChange={(e) => updateSchemaField(index, 'required', e.target.checked)}
                        size="small"
                      />
                    }
                    label="Required"
                  />
                  <IconButton
                    onClick={() => removeSchemaField(index)}
                    color="error"
                    size="small"
                  >
                    <Delete />
                  </IconButton>
                </Box>
                <TextField
                  label="Description"
                  value={field.description}
                  onChange={(e) => updateSchemaField(index, 'description', e.target.value)}
                  fullWidth
                  size="small"
                  placeholder="What information should be extracted?"
                />
                {field.type === 'enum' && (
                  <TextField
                    label="Options (comma-separated)"
                    value={(field.options || []).join(', ')}
                    onChange={(e) => updateSchemaField(index, 'options', e.target.value.split(',').map(o => o.trim()).filter(Boolean))}
                    fullWidth
                    size="small"
                    sx={{ mt: 2 }}
                    placeholder="low, medium, high"
                  />
                )}
              </Paper>
            ))}
          </Stack>
        </TabPanel>

        {/* Tab 4: Prompts */}
        <TabPanel value={tabValue} index={4}>
          <Stack spacing={3}>
            <Alert severity="info">
              Customize the AI prompts. Use {'{{variable}}'} syntax for dynamic values like {'{{objective}}'}, {'{{context}}'}, {'{{persona}}'}, {'{{topics}}'}.
            </Alert>

            <FormControl fullWidth>
              <InputLabel>Prompt Strategy</InputLabel>
              <Select
                value={formData.promptConfig?.strategyType || 'default'}
                onChange={(e) => updateField('promptConfig.strategyType', e.target.value)}
                label="Prompt Strategy"
              >
                <MenuItem value="default">Default</MenuItem>
                <MenuItem value="it-helpdesk">IT Helpdesk</MenuItem>
                <MenuItem value="custom">Custom</MenuItem>
              </Select>
            </FormControl>

            {formData.promptConfig?.strategyType === 'custom' && (
              <>
                <TextField
                  label="System Prompt Template"
                  value={formData.promptConfig?.systemPromptTemplate || ''}
                  onChange={(e) => updateField('promptConfig.systemPromptTemplate', e.target.value)}
                  fullWidth
                  multiline
                  rows={8}
                  placeholder="You are an AI assistant helping with {{objective}}..."
                />

                <TextField
                  label="Wrap-up Prompt Template"
                  value={formData.promptConfig?.wrapUpPromptTemplate || ''}
                  onChange={(e) => updateField('promptConfig.wrapUpPromptTemplate', e.target.value)}
                  fullWidth
                  multiline
                  rows={4}
                  placeholder="Thank the user and summarize..."
                />
              </>
            )}
          </Stack>
        </TabPanel>
      </DialogContent>

      <DialogActions sx={{ borderTop: '1px solid', borderColor: 'divider', px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} /> : <Save />}
          sx={{
            bgcolor: '#00ED64',
            color: '#000',
            '&:hover': { bgcolor: '#00D659' },
          }}
        >
          {isEditMode ? 'Save Changes' : 'Create Template'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
