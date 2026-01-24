/**
 * Guest Form Editor Component
 *
 * A full-featured form editor for unauthenticated users.
 * Allows editing form settings, choosing response mode, and previewing
 * the form before signing up to save.
 */

'use client';

import React, { useState, useMemo, Suspense } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  alpha,
  Tabs,
  Tab,
  Checkbox,
  FormControlLabel,
  Radio,
  RadioGroup,
  FormControl,
  Divider,
  Chip,
  IconButton,
  Tooltip,
  useTheme,
} from '@mui/material';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import {
  Settings,
  Palette,
  ViewList,
  AutoAwesome,
  Bolt,
  ListAlt,
  Chat,
  Info,
  Upload,
  ArrowBack,
  Code,
  ContentCopy,
  Check,
} from '@mui/icons-material';
import { netpadColors } from '@/theme/theme';
import { FieldConfig, FormConfiguration } from '@/types/form';
import { ConversationalFormConfig } from '@/types/conversational';
import { FormRenderer } from '@/components/FormRenderer/FormRenderer';
import { ConversationalFormChat } from '@/components/ConversationalForm/ConversationalFormChat';

// Response mode types
type ResponseMode = 'wizard' | 'traditional' | 'conversational';

/**
 * Map field types to MongoDB BSON types
 */
function fieldTypeToBsonType(fieldType: string): string {
  const typeMap: Record<string, string> = {
    text: 'string',
    email: 'string',
    phone: 'string',
    url: 'string',
    textarea: 'string',
    number: 'number',
    currency: 'number',
    slider: 'number',
    date: 'date',
    datetime: 'date',
    time: 'string',
    checkbox: 'bool',
    toggle: 'bool',
    select: 'string',
    radio: 'string',
    multiselect: 'array',
    checkboxGroup: 'array',
    tags: 'array',
    file: 'object',
    image: 'object',
    rating: 'number',
    signature: 'string',
    address: 'object',
    location: 'object',
  };
  return typeMap[fieldType] || 'string';
}

/**
 * Generate MongoDB JSON Schema from form fields
 */
function generateMongoDBSchema(fields: FieldConfig[], formName: string): object {
  const properties: Record<string, any> = {
    _id: { bsonType: 'objectId' },
    createdAt: { bsonType: 'date' },
    updatedAt: { bsonType: 'date' },
  };

  const required: string[] = [];

  for (const field of fields) {
    const fieldName = field.path.replace(/\./g, '_');
    const bsonType = fieldTypeToBsonType(field.type);

    const fieldSchema: any = {
      bsonType,
      description: field.label,
    };

    // Add enum for select/radio fields with options
    if ((field.type === 'select' || field.type === 'radio') && field.validation?.options) {
      fieldSchema.enum = field.validation.options.map((o: any) =>
        typeof o === 'string' ? o : o.value
      );
    }

    // Add items for array types
    if (bsonType === 'array') {
      fieldSchema.items = { bsonType: 'string' };
    }

    // Add nested structure for file/address objects
    if (field.type === 'file' || field.type === 'image') {
      fieldSchema.properties = {
        filename: { bsonType: 'string' },
        url: { bsonType: 'string' },
        size: { bsonType: 'number' },
        mimeType: { bsonType: 'string' },
      };
    }

    if (field.type === 'address') {
      fieldSchema.properties = {
        street: { bsonType: 'string' },
        city: { bsonType: 'string' },
        state: { bsonType: 'string' },
        zipCode: { bsonType: 'string' },
        country: { bsonType: 'string' },
      };
    }

    properties[fieldName] = fieldSchema;

    if (field.required) {
      required.push(fieldName);
    }
  }

  return {
    $jsonSchema: {
      bsonType: 'object',
      title: formName,
      required: ['_id', 'createdAt', ...required],
      properties,
    },
  };
}

/**
 * Generate a sample document from fields
 */
function generateSampleDocument(fields: FieldConfig[]): object {
  const doc: Record<string, any> = {
    _id: 'ObjectId("...")',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  for (const field of fields) {
    const fieldName = field.path.replace(/\./g, '_');

    switch (field.type) {
      case 'email':
        doc[fieldName] = 'user@example.com';
        break;
      case 'phone':
        doc[fieldName] = '+1 (555) 123-4567';
        break;
      case 'number':
      case 'currency':
      case 'slider':
      case 'rating':
        doc[fieldName] = 5;
        break;
      case 'checkbox':
      case 'toggle':
        doc[fieldName] = true;
        break;
      case 'date':
      case 'datetime':
        doc[fieldName] = new Date().toISOString().split('T')[0];
        break;
      case 'multiselect':
      case 'checkboxGroup':
      case 'tags':
        doc[fieldName] = ['option1', 'option2'];
        break;
      case 'file':
      case 'image':
        doc[fieldName] = { filename: 'document.pdf', url: '...', size: 1024 };
        break;
      case 'address':
        doc[fieldName] = { street: '123 Main St', city: 'San Francisco', state: 'CA', zipCode: '94102' };
        break;
      default:
        doc[fieldName] = field.placeholder || `Sample ${field.label}`;
    }
  }

  return doc;
}

interface GuestFormEditorProps {
  /** Initial form configuration from generation */
  form: FormConfiguration;
  /** Conversational config if generated */
  conversationalConfig?: ConversationalFormConfig;
  /** Fields from generation */
  fields: FieldConfig[];
  /** Callback to go back to generator */
  onBack?: () => void;
  /** Callback for sign up */
  onSignUp: () => void;
}

/**
 * Wizard Form Preview - Shows form in wizard/multi-page mode with progress indicator
 */
function WizardFormPreview({
  form,
  fields,
}: {
  form: FormConfiguration;
  fields: FieldConfig[];
}) {
  // Create wizard config - group fields into pages (approximately 3-5 fields per page)
  const fieldsPerPage = Math.max(1, Math.ceil(fields.length / 3)); // Aim for 3 pages
  const pages: Array<{ id: string; title: string; fields: string[]; order: number }> = [];
  
  for (let i = 0; i < fields.length; i += fieldsPerPage) {
    const pageFields = fields.slice(i, i + fieldsPerPage);
    pages.push({
      id: `page-${pages.length + 1}`,
      title: `Step ${pages.length + 1}`,
      fields: pageFields.map(f => f.path),
      order: pages.length + 1,
    });
  }

  // Create a form config with wizard/multi-page enabled
  const formConfig: FormConfiguration = {
    ...form,
    fieldConfigs: fields,
    multiPage: {
      enabled: true,
      pages: pages,
      showStepIndicator: true,
      stepIndicatorStyle: 'progress',
      validateOnPageChange: true,
      showPageTitles: true,
      allowJumpToPage: false,
    },
    theme: {
      ...form.theme,
      mode: 'light',
      backgroundColor: '#ffffff',
    },
  };

  return (
    <Box
      sx={{
        p: 2,
        height: '100%',
        overflow: 'auto',
        backgroundImage: netpadColors.gridPatternLight,
        backgroundSize: netpadColors.gridSize,
      }}
    >
      <FormRenderer
        form={formConfig}
        isPreview={true}
        onSubmit={async () => {}}
      />
    </Box>
  );
}

/**
 * Conversational Form Preview - Shows chat interface
 */
function ConversationalFormPreview({
  form,
  conversationalConfig,
  fields,
}: {
  form: FormConfiguration;
  conversationalConfig?: ConversationalFormConfig;
  fields: FieldConfig[];
}) {
  // Build a config if not provided
  const config: ConversationalFormConfig = conversationalConfig || {
    formType: 'conversational',
    objective: `Help the user fill out the "${form.name}" form`,
    context: form.description || '',
    persona: {
      style: 'friendly',
      tone: 'warm and helpful',
      behaviors: ['Be concise', 'Ask one question at a time'],
    },
    topics: fields.map((f) => ({
      id: f.path,
      name: f.label,
      description: `Collect ${f.label}`,
      priority: f.required ? 'required' as const : 'optional' as const,
      depth: 'surface' as const,
      extractionField: f.path,
    })),
    extractionSchema: fields.map((f) => ({
      field: f.path,
      type: 'string' as const,
      required: f.required || false,
      description: f.label,
    })),
    conversationLimits: {
      maxTurns: 20,
      maxDuration: 15,
      minConfidence: 0.7,
    },
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Form header */}
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: netpadColors.gradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: netpadColors.glowPrimary,
            }}
          >
            <AutoAwesome sx={{ fontSize: 16, color: '#000' }} />
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {form.name || 'Untitled Form'}
            </Typography>
            {form.description && (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {form.description}
              </Typography>
            )}
          </Box>
        </Box>
      </Box>

      {/* Chat area */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          p: 2,
          bgcolor: 'background.default',
          backgroundImage: netpadColors.gridPatternLight,
          backgroundSize: netpadColors.gridSize,
        }}
      >
        <Suspense
          fallback={
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <NetPadLoader size="large" variant="ascii" message="Loading..." />
            </Box>
          }
        >
          <ConversationalFormChat
            formId="guest-preview"
            config={config}
            sx={{
              '& .MuiPaper-root': {
                boxShadow: 'none',
                bgcolor: 'transparent',
              },
            }}
          />
        </Suspense>
      </Box>
    </Box>
  );
}

/**
 * Traditional Form Preview - Shows all fields at once
 */
function TraditionalFormPreview({
  form,
  fields,
}: {
  form: FormConfiguration;
  fields: FieldConfig[];
}) {
  // Create a form config for the renderer
  const formConfig: FormConfiguration = {
    ...form,
    fieldConfigs: fields,
    theme: {
      ...form.theme,
      mode: 'light',
      backgroundColor: '#ffffff',
    },
  };

  return (
    <Box
      sx={{
        p: 2,
        height: '100%',
        overflow: 'auto',
        backgroundImage: netpadColors.gridPatternLight,
        backgroundSize: netpadColors.gridSize,
      }}
    >
      <FormRenderer
        form={formConfig}
        isPreview={true}
        onSubmit={async () => {}}
      />
    </Box>
  );
}

/**
 * Schema Tab - Shows MongoDB schema and sample document
 */
function SchemaTab({ fields, formName }: { fields: FieldConfig[]; formName: string }) {
  const [viewMode, setViewMode] = useState<'schema' | 'sample'>('schema');
  const [copied, setCopied] = useState(false);

  const schema = useMemo(() => generateMongoDBSchema(fields, formName), [fields, formName]);
  const sampleDoc = useMemo(() => generateSampleDocument(fields), [fields]);

  const currentCode = viewMode === 'schema'
    ? JSON.stringify(schema, null, 2)
    : JSON.stringify(sampleDoc, null, 2);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Box>
      {/* Header with info */}
      <Paper
        sx={{
          p: 2,
          mb: 2,
          bgcolor: alpha(netpadColors.secondary, 0.08),
          border: '1px solid',
          borderColor: alpha(netpadColors.secondary, 0.2),
          borderRadius: 2,
          backgroundImage: 'none',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
          <Code sx={{ color: netpadColors.secondary, mt: 0.25 }} />
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
              MongoDB Schema
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              Your form data will be stored in MongoDB with this schema. NetPad automatically
              validates submissions against this structure and stores data directly to your collection.
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Toggle between schema and sample */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <Button
          size="small"
          variant={viewMode === 'schema' ? 'contained' : 'outlined'}
          onClick={() => setViewMode('schema')}
          sx={{
            flex: 1,
            textTransform: 'none',
            background: viewMode === 'schema' ? netpadColors.gradientLight : 'transparent',
            color: viewMode === 'schema' ? '#fff' : 'text.secondary',
            borderColor: alpha(netpadColors.secondary, 0.3),
            boxShadow: viewMode === 'schema' ? netpadColors.shadowPrimary : 'none',
            transition: 'all 0.15s ease',
            '&:hover': {
              background: viewMode === 'schema' ? netpadColors.gradientLight : alpha(netpadColors.secondary, 0.08),
              borderColor: netpadColors.secondary,
              transform: 'translateY(-1px)',
            },
          }}
        >
          JSON Schema
        </Button>
        <Button
          size="small"
          variant={viewMode === 'sample' ? 'contained' : 'outlined'}
          onClick={() => setViewMode('sample')}
          sx={{
            flex: 1,
            textTransform: 'none',
            background: viewMode === 'sample' ? netpadColors.gradientLight : 'transparent',
            color: viewMode === 'sample' ? '#fff' : 'text.secondary',
            borderColor: alpha(netpadColors.secondary, 0.3),
            boxShadow: viewMode === 'sample' ? netpadColors.shadowPrimary : 'none',
            transition: 'all 0.15s ease',
            '&:hover': {
              background: viewMode === 'sample' ? netpadColors.gradientLight : alpha(netpadColors.secondary, 0.08),
              borderColor: netpadColors.secondary,
              transform: 'translateY(-1px)',
            },
          }}
        >
          Sample Document
        </Button>
      </Box>

      {/* Code block */}
      <Paper
        sx={{
          position: 'relative',
          bgcolor: '#0a0e14',
          borderRadius: 2,
          overflow: 'hidden',
          border: `1px solid ${alpha(netpadColors.primary, 0.2)}`,
          backgroundImage: netpadColors.gridPatternDark,
          backgroundSize: netpadColors.gridSize,
        }}
      >
        {/* Copy button */}
        <Tooltip title={copied ? 'Copied!' : 'Copy to clipboard'}>
          <IconButton
            size="small"
            onClick={handleCopy}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              color: copied ? netpadColors.primary : alpha('#fff', 0.6),
              transition: 'all 0.15s ease',
              '&:hover': { color: netpadColors.primary, bgcolor: alpha('#fff', 0.1) },
            }}
          >
            {copied ? <Check sx={{ fontSize: 18 }} /> : <ContentCopy sx={{ fontSize: 18 }} />}
          </IconButton>
        </Tooltip>

        {/* Code content */}
        <Box
          component="pre"
          sx={{
            p: 2,
            m: 0,
            overflow: 'auto',
            maxHeight: 350,
            fontSize: '0.75rem',
            fontFamily: '"Fira Code", "Monaco", monospace',
            color: '#e6edf3',
            lineHeight: 1.5,
            '&::-webkit-scrollbar': {
              width: 8,
              height: 8,
            },
            '&::-webkit-scrollbar-track': {
              bgcolor: '#141920',
            },
            '&::-webkit-scrollbar-thumb': {
              bgcolor: alpha(netpadColors.primary, 0.3),
              borderRadius: 4,
            },
          }}
        >
          <code>{currentCode}</code>
        </Box>
      </Paper>

      {/* Field type legend */}
      <Box sx={{ mt: 2 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
          BSON Types Used:
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {Array.from(new Set(fields.map(f => fieldTypeToBsonType(f.type)))).map(type => (
            <Chip
              key={type}
              label={type}
              size="small"
              sx={{
                height: 20,
                fontSize: '0.65rem',
                bgcolor: alpha(netpadColors.secondary, 0.1),
                color: netpadColors.secondary,
              }}
            />
          ))}
          <Chip
            label="objectId"
            size="small"
            sx={{
              height: 20,
              fontSize: '0.65rem',
              bgcolor: alpha(netpadColors.secondary, 0.1),
              color: netpadColors.secondary,
            }}
          />
          <Chip
            label="date"
            size="small"
            sx={{
              height: 20,
              fontSize: '0.65rem',
              bgcolor: alpha(netpadColors.secondary, 0.1),
              color: netpadColors.secondary,
            }}
          />
        </Box>
      </Box>
    </Box>
  );
}

/**
 * Main Guest Form Editor Component
 */
export function GuestFormEditor({
  form: initialForm,
  conversationalConfig,
  fields: initialFields,
  onBack,
  onSignUp,
}: GuestFormEditorProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // Generate a stable temporary form ID for this session
  const tempFormId = useMemo(() => {
    // Check if we already have a temp ID stored
    const stored = localStorage.getItem('netpad_generated_form');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.tempFormId) return parsed.tempFormId;
      } catch {
        // ignore
      }
    }
    // Generate new temp ID
    return `tmp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }, []);

  // Form state - use a local "title" display value that maps from form.name
  const [form, setForm] = useState<FormConfiguration>({
    ...initialForm,
    name: initialForm.name || 'Untitled Form',
    description: initialForm.description || '',
  });
  const [fields] = useState<FieldConfig[]>(initialFields);

  // Editor state
  const [activeTab, setActiveTab] = useState(0);
  const [responseMode, setResponseMode] = useState<ResponseMode>('conversational');
  const [emailNotifications, setEmailNotifications] = useState(true);

  // Update form in localStorage when it changes
  React.useEffect(() => {
    const stored = localStorage.getItem('netpad_generated_form');
    if (stored) {
      const parsed = JSON.parse(stored);
      localStorage.setItem('netpad_generated_form', JSON.stringify({
        ...parsed,
        ...form,
        tempFormId,
        responseMode,
        emailNotifications,
      }));
    }
  }, [form, tempFormId, responseMode, emailNotifications]);

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        {onBack && (
          <Button
            startIcon={<ArrowBack />}
            onClick={onBack}
            sx={{
              color: 'text.secondary',
              textTransform: 'none',
              mb: 2,
              transition: 'all 0.15s ease',
              '&:hover': {
                color: 'text.primary',
                transform: 'translateX(-2px)',
              },
            }}
          >
            Back to generator
          </Button>
        )}
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
          Edit Your Form
        </Typography>
        <Typography sx={{ color: 'text.secondary' }}>
          Customize your form before publishing
        </Typography>
      </Box>

      {/* Main editor layout */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 3,
        }}
      >
        {/* Left: Form Editor */}
        <Paper
          elevation={0}
          sx={{
            bgcolor: 'background.paper',
            borderRadius: 3,
            overflow: 'hidden',
            border: '1px solid',
            borderColor: isDark ? alpha(netpadColors.accent, 0.3) : alpha(netpadColors.secondary, 0.2),
            backgroundImage: isDark ? netpadColors.gridPatternDark : netpadColors.gridPatternLight,
            backgroundSize: netpadColors.gridSize,
            transition: 'all 0.2s ease',
            '&:hover': {
              borderColor: isDark ? alpha(netpadColors.accent, 0.5) : alpha(netpadColors.secondary, 0.3),
              boxShadow: isDark ? netpadColors.glowSubtle : netpadColors.shadowSubtle,
            },
          }}
        >
          {/* Editor header */}
          <Box
            sx={{
              background: isDark ? netpadColors.gradientReverse : netpadColors.gradientLight,
              p: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Settings sx={{ color: isDark ? '#000' : '#fff' }} />
              <Typography variant="h6" sx={{ fontWeight: 700, color: isDark ? '#000' : '#fff' }}>
                Form Editor
              </Typography>
            </Box>
          </Box>

          {/* Tabs */}
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            sx={{
              borderBottom: '1px solid',
              borderColor: 'divider',
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 500,
                minHeight: 48,
              },
              '& .Mui-selected': {
                color: isDark ? netpadColors.accent : netpadColors.secondary,
              },
              '& .MuiTabs-indicator': {
                bgcolor: isDark ? netpadColors.accent : netpadColors.secondary,
              },
            }}
          >
            <Tab icon={<Settings sx={{ fontSize: 18 }} />} iconPosition="start" label="Settings" />
            <Tab icon={<Palette sx={{ fontSize: 18 }} />} iconPosition="start" label="Appearance" />
            <Tab icon={<ViewList sx={{ fontSize: 18 }} />} iconPosition="start" label={`Fields (${fields.length})`} />
            <Tab icon={<Code sx={{ fontSize: 18 }} />} iconPosition="start" label="Schema" />
          </Tabs>

          {/* Tab content */}
          <Box sx={{ p: 3, maxHeight: 600, overflowY: 'auto' }}>
            {activeTab === 0 && (
              <Box>
                {/* Basic Information */}
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
                  Basic Information
                </Typography>

                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  Form Title
                </Typography>
                <TextField
                  fullWidth
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  size="small"
                  sx={{ mb: 2 }}
                />

                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  Description (Optional)
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  size="small"
                  sx={{ mb: 2 }}
                />

                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  Form ID
                </Typography>
                <TextField
                  fullWidth
                  value={tempFormId}
                  disabled
                  size="small"
                  sx={{
                    mb: 1,
                    '& .MuiInputBase-input': {
                      fontFamily: 'monospace',
                      fontSize: '0.85rem',
                    },
                  }}
                />
                <Paper
                  sx={{
                    p: 1.5,
                    bgcolor: alpha(isDark ? netpadColors.accent : netpadColors.secondary, 0.08),
                    border: '1px solid',
                    borderColor: alpha(isDark ? netpadColors.accent : netpadColors.secondary, 0.2),
                    borderRadius: 2,
                    mb: 3,
                    backgroundImage: 'none',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <Info sx={{ fontSize: 16, color: isDark ? netpadColors.accent : netpadColors.secondary, mt: 0.25 }} />
                    <Typography variant="caption" sx={{ color: isDark ? netpadColors.accent : netpadColors.secondary }}>
                      Your form is saved locally in your browser. Sign in to save permanently and get a shareable link.
                    </Typography>
                  </Box>
                </Paper>

                <Divider sx={{ my: 2 }} />

                {/* Response Settings */}
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
                  Response Settings
                </Typography>

                <Paper
                  sx={{
                    p: 2,
                    bgcolor: alpha(isDark ? netpadColors.accent : netpadColors.secondary, 0.05),
                    border: '1px solid',
                    borderColor: alpha(isDark ? netpadColors.accent : netpadColors.secondary, 0.15),
                    borderRadius: 2,
                    mb: 2,
                    backgroundImage: 'none',
                  }}
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={emailNotifications}
                        onChange={(e) => setEmailNotifications(e.target.checked)}
                        sx={{
                          color: isDark ? netpadColors.accent : netpadColors.secondary,
                          '&.Mui-checked': { color: isDark ? netpadColors.accent : netpadColors.secondary },
                        }}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          Email Notifications
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          Get notified when someone submits a response
                        </Typography>
                      </Box>
                    }
                  />
                </Paper>

                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1.5 }}>
                  Allowed Response Mode
                </Typography>

                <FormControl component="fieldset">
                  <RadioGroup
                    value={responseMode}
                    onChange={(e) => setResponseMode(e.target.value as ResponseMode)}
                  >
                    <Paper
                      sx={{
                        p: 2,
                        mb: 1,
                        border: '1px solid',
                        borderColor: responseMode === 'wizard'
                          ? (isDark ? netpadColors.accent : netpadColors.secondary)
                          : 'divider',
                        borderRadius: 2,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        backgroundImage: 'none',
                        '&:hover': {
                          borderColor: alpha(isDark ? netpadColors.accent : netpadColors.secondary, 0.5),
                          transform: 'translateY(-1px)',
                        },
                      }}
                      onClick={() => setResponseMode('wizard')}
                    >
                      <FormControlLabel
                        value="wizard"
                        control={<Radio sx={{ '&.Mui-checked': { color: isDark ? netpadColors.accent : netpadColors.secondary } }} />}
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Bolt sx={{ fontSize: 18, color: responseMode === 'wizard' ? (isDark ? netpadColors.accent : netpadColors.secondary) : 'text.secondary' }} />
                            <Typography sx={{ fontWeight: 500 }}>
                              Wizard Mode (Multi-Step with Progress)
                            </Typography>
                          </Box>
                        }
                      />
                    </Paper>

                    <Paper
                      sx={{
                        p: 2,
                        mb: 1,
                        border: '1px solid',
                        borderColor: responseMode === 'traditional'
                          ? (isDark ? netpadColors.accent : netpadColors.secondary)
                          : 'divider',
                        borderRadius: 2,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        backgroundImage: 'none',
                        '&:hover': {
                          borderColor: alpha(isDark ? netpadColors.accent : netpadColors.secondary, 0.5),
                          transform: 'translateY(-1px)',
                        },
                      }}
                      onClick={() => setResponseMode('traditional')}
                    >
                      <FormControlLabel
                        value="traditional"
                        control={<Radio sx={{ '&.Mui-checked': { color: isDark ? netpadColors.accent : netpadColors.secondary } }} />}
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <ListAlt sx={{ fontSize: 18, color: responseMode === 'traditional' ? (isDark ? netpadColors.accent : netpadColors.secondary) : 'text.secondary' }} />
                            <Typography sx={{ fontWeight: 500 }}>
                              Traditional Form Mode
                            </Typography>
                          </Box>
                        }
                      />
                    </Paper>

                    <Paper
                      sx={{
                        p: 2,
                        border: '1px solid',
                        borderColor: responseMode === 'conversational'
                          ? (isDark ? netpadColors.accent : netpadColors.secondary)
                          : 'divider',
                        borderRadius: 2,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        backgroundImage: 'none',
                        '&:hover': {
                          borderColor: alpha(isDark ? netpadColors.accent : netpadColors.secondary, 0.5),
                          transform: 'translateY(-1px)',
                        },
                      }}
                      onClick={() => setResponseMode('conversational')}
                    >
                      <FormControlLabel
                        value="conversational"
                        control={<Radio sx={{ '&.Mui-checked': { color: isDark ? netpadColors.accent : netpadColors.secondary } }} />}
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chat sx={{ fontSize: 18, color: responseMode === 'conversational' ? (isDark ? netpadColors.accent : netpadColors.secondary) : 'text.secondary' }} />
                            <Typography sx={{ fontWeight: 500 }}>
                              Conversational Chat Mode
                            </Typography>
                          </Box>
                        }
                      />
                    </Paper>
                  </RadioGroup>
                </FormControl>

                <Typography variant="caption" sx={{ color: 'text.secondary', mt: 1, display: 'block' }}>
                  Select which mode users will use to fill out this form
                </Typography>

                <Divider sx={{ my: 3 }} />

                {/* Integrations */}
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
                  Integrations
                </Typography>

                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  Webhook URL (Optional)
                </Typography>
                <TextField
                  fullWidth
                  placeholder="https://example.com/webhook"
                  size="small"
                  sx={{ mb: 0.5 }}
                />
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Send form responses to your webhook endpoint
                </Typography>
              </Box>
            )}

            {activeTab === 1 && (
              <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                <Palette sx={{ fontSize: 48, opacity: 0.3, mb: 2 }} />
                <Typography>
                  Appearance customization available after sign up
                </Typography>
              </Box>
            )}

            {activeTab === 2 && (
              <Box>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                  {fields.length} field{fields.length !== 1 ? 's' : ''} will be collected
                </Typography>
                {fields.map((field, index) => (
                  <Paper
                    key={field.path}
                    sx={{
                      p: 2,
                      mb: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Typography variant="caption" sx={{ color: 'text.disabled', width: 20 }}>
                          {index + 1}.
                        </Typography>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {field.label}
                            {field.required && (
                              <Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>
                                *
                              </Typography>
                            )}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {field.type}
                          </Typography>
                        </Box>
                      </Box>
                      {field.type === 'file' && (
                        <Chip
                          icon={<Upload sx={{ fontSize: 14 }} />}
                          label="File"
                          size="small"
                          sx={{ bgcolor: alpha('#2196f3', 0.1), color: '#2196f3' }}
                        />
                      )}
                    </Box>
                  </Paper>
                ))}
              </Box>
            )}

            {activeTab === 3 && (
              <SchemaTab fields={fields} formName={form.name} />
            )}
          </Box>

          {/* Sign up button */}
          <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Button
              fullWidth
              variant="contained"
              size="large"
              startIcon={<Upload />}
              onClick={onSignUp}
              sx={{
                background: isDark ? netpadColors.gradient : netpadColors.gradientLight,
                color: isDark ? '#000' : '#fff',
                fontWeight: 600,
                textTransform: 'none',
                py: 1.5,
                borderRadius: 2,
                boxShadow: isDark ? netpadColors.glowPrimary : netpadColors.shadowPrimary,
                transition: 'all 0.15s ease',
                '&:hover': {
                  background: isDark ? netpadColors.gradient : netpadColors.gradientLight,
                  boxShadow: isDark ? netpadColors.glowPrimaryHover : netpadColors.shadowPrimaryHover,
                  transform: 'translateY(-2px)',
                },
              }}
            >
              Sign In to Save & Publish
            </Button>
          </Box>
        </Paper>

        {/* Right: Live Preview */}
        <Paper
          elevation={0}
          sx={{
            bgcolor: 'background.paper',
            borderRadius: 3,
            overflow: 'hidden',
            border: '1px solid',
            borderColor: isDark ? alpha(netpadColors.primary, 0.3) : alpha(netpadColors.secondary, 0.2),
            display: 'flex',
            flexDirection: 'column',
            minHeight: 600,
            backgroundImage: isDark ? netpadColors.gridPatternDark : netpadColors.gridPatternLight,
            backgroundSize: netpadColors.gridSize,
            transition: 'all 0.2s ease',
            '&:hover': {
              borderColor: isDark ? alpha(netpadColors.primary, 0.5) : alpha(netpadColors.secondary, 0.3),
              boxShadow: isDark ? netpadColors.glowSubtle : netpadColors.shadowSubtle,
            },
          }}
        >
          {/* Preview header */}
          <Box
            sx={{
              background: isDark ? netpadColors.gradient : netpadColors.gradientLight,
              p: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AutoAwesome sx={{ color: isDark ? '#000' : '#fff' }} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: isDark ? '#000' : '#fff' }}>
                  Live Preview
                </Typography>
                <Typography variant="caption" sx={{ color: isDark ? alpha('#000', 0.7) : alpha('#fff', 0.8) }}>
                  See how your form looks to users
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Preview content */}
          <Box sx={{ flex: 1, overflow: 'hidden' }}>
            {responseMode === 'wizard' && (
              <WizardFormPreview form={form} fields={fields} />
            )}
            {responseMode === 'traditional' && (
              <TraditionalFormPreview form={form} fields={fields} />
            )}
            {responseMode === 'conversational' && (
              <ConversationalFormPreview
                form={form}
                conversationalConfig={conversationalConfig}
                fields={fields}
              />
            )}
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}

export default GuestFormEditor;
