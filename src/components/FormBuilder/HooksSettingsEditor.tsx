'use client';

import { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  alpha,
  Switch,
  FormControlLabel,
  TextField,
  Divider,
  IconButton,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Collapse,
  Tooltip,
  InputAdornment,
} from '@mui/material';
import {
  Add,
  Delete,
  ExpandMore,
  ExpandLess,
  Link as LinkIcon,
  Send as WebhookIcon,
  CheckCircle,
  Error as ErrorIcon,
  Info,
  Key,
} from '@mui/icons-material';
import { FormHooksConfig, PrefillConfig, OnSubmitSuccessConfig, OnSubmitErrorConfig, WebhookConfig, RedirectConfig } from '@/types/formHooks';
import { FieldConfig } from '@/types/form';
import { FormVariablePickerButton } from './FormVariablePicker';

interface HooksSettingsEditorProps {
  config?: FormHooksConfig;
  onChange: (config: FormHooksConfig | undefined) => void;
  fieldConfigs: FieldConfig[];
}

export function HooksSettingsEditor({
  config,
  onChange,
  fieldConfigs,
}: HooksSettingsEditorProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    prefill: false,
    success: false,
    error: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const updateConfig = (updates: Partial<FormHooksConfig>) => {
    const newConfig = { ...config, ...updates };
    // Clean up empty objects
    if (newConfig.prefill && !newConfig.prefill.fromUrlParams && !newConfig.prefill.urlParamMapping?.length) {
      delete newConfig.prefill;
    }
    onChange(Object.keys(newConfig).length > 0 ? newConfig : undefined);
  };

  const hasConfig = !!(config?.prefill?.fromUrlParams || config?.onSuccess?.message || config?.onSuccess?.redirect || config?.onSuccess?.webhook || config?.onError?.message);

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
        Actions & Automation
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
        Configure automated actions for your form: pre-fill fields from URLs, customize messages, redirect after submission, and send webhook notifications.
      </Typography>

      {hasConfig && (
        <Chip
          label="Configured"
          size="small"
          icon={<CheckCircle sx={{ fontSize: 14 }} />}
          sx={{
            mb: 2,
            height: 22,
            fontSize: '0.7rem',
            bgcolor: alpha('#00ED64', 0.1),
            color: '#00ED64',
            '& .MuiChip-icon': { color: '#00ED64' }
          }}
        />
      )}

      {/* ON FORM LOAD Section */}
      <SectionCard
        title="On Form Load"
        description="Actions that run when the form first loads"
        expanded={expandedSections.prefill}
        onToggle={() => toggleSection('prefill')}
        color="#2196f3"
        hasContent={!!config?.prefill?.fromUrlParams}
      >
        <PrefillSection
          config={config?.prefill}
          onChange={(prefill) => updateConfig({ prefill })}
          fieldConfigs={fieldConfigs}
        />
      </SectionCard>

      {/* AFTER SUCCESSFUL SUBMISSION Section */}
      <SectionCard
        title="After Successful Submission"
        description="What happens when the form is submitted successfully"
        expanded={expandedSections.success}
        onToggle={() => toggleSection('success')}
        color="#00ED64"
        hasContent={!!(config?.onSuccess?.message || config?.onSuccess?.redirect || config?.onSuccess?.webhook)}
      >
        <SuccessSection
          config={config?.onSuccess}
          onChange={(onSuccess) => updateConfig({ onSuccess })}
          fieldConfigs={fieldConfigs}
        />
      </SectionCard>

      {/* ON SUBMISSION ERROR Section */}
      <SectionCard
        title="On Submission Error"
        description="What happens when form submission fails"
        expanded={expandedSections.error}
        onToggle={() => toggleSection('error')}
        color="#f44336"
        hasContent={!!config?.onError?.message}
      >
        <ErrorSection
          config={config?.onError}
          onChange={(onError) => updateConfig({ onError })}
        />
      </SectionCard>
    </Box>
  );
}

// ============================================
// Section Card Component
// ============================================

interface SectionCardProps {
  title: string;
  description: string;
  expanded: boolean;
  onToggle: () => void;
  color: string;
  hasContent: boolean;
  children: React.ReactNode;
}

function SectionCard({ title, description, expanded, onToggle, color, hasContent, children }: SectionCardProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        mb: 2,
        border: '1px solid',
        borderColor: expanded ? alpha(color, 0.3) : 'divider',
        borderRadius: 1,
        overflow: 'hidden',
        transition: 'border-color 0.2s',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 1.5,
          cursor: 'pointer',
          bgcolor: expanded ? alpha(color, 0.05) : 'transparent',
          '&:hover': { bgcolor: alpha(color, 0.05) },
        }}
        onClick={onToggle}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: hasContent ? color : 'grey.400',
            }}
          />
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {title}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {description}
            </Typography>
          </Box>
        </Box>
        <IconButton size="small">
          {expanded ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
      </Box>
      <Collapse in={expanded}>
        <Box sx={{ p: 2, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
          {children}
        </Box>
      </Collapse>
    </Paper>
  );
}

// ============================================
// Pre-fill Section
// ============================================

interface PrefillSectionProps {
  config?: PrefillConfig;
  onChange: (config: PrefillConfig | undefined) => void;
  fieldConfigs: FieldConfig[];
}

function PrefillSection({ config, onChange, fieldConfigs }: PrefillSectionProps) {
  const [mappings, setMappings] = useState<Array<{ param: string; field: string }>>(
    Object.entries(config?.urlParamMapping || {}).map(([param, field]) => ({ param, field }))
  );

  const handleToggle = (enabled: boolean) => {
    onChange(enabled ? { fromUrlParams: true } : undefined);
  };

  const handleMappingChange = (newMappings: Array<{ param: string; field: string }>) => {
    setMappings(newMappings);
    const mapping: Record<string, string> = {};
    newMappings.forEach(m => {
      if (m.param && m.field) {
        mapping[m.param] = m.field;
      }
    });
    onChange({
      ...config,
      fromUrlParams: config?.fromUrlParams ?? true,
      urlParamMapping: Object.keys(mapping).length > 0 ? mapping : undefined,
    });
  };

  const addMapping = () => {
    handleMappingChange([...mappings, { param: '', field: '' }]);
  };

  const removeMapping = (index: number) => {
    handleMappingChange(mappings.filter((_, i) => i !== index));
  };

  const updateMapping = (index: number, updates: Partial<{ param: string; field: string }>) => {
    const newMappings = [...mappings];
    newMappings[index] = { ...newMappings[index], ...updates };
    handleMappingChange(newMappings);
  };

  return (
    <Box>
      <FormControlLabel
        control={
          <Switch
            size="small"
            checked={config?.fromUrlParams ?? false}
            onChange={(e) => handleToggle(e.target.checked)}
          />
        }
        label={
          <Typography variant="body2">
            Pre-fill fields from URL parameters
          </Typography>
        }
      />

      {config?.fromUrlParams && (
        <Box sx={{ mt: 2, pl: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Info sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">
              Example: yourform.com/form?email=test@example.com will pre-fill the email field
            </Typography>
          </Box>

          <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mt: 2, mb: 1 }}>
            Custom Parameter Mapping (optional)
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Map URL parameter names to different field paths
          </Typography>

          {mappings.map((mapping, index) => (
            <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
              <TextField
                size="small"
                placeholder="URL param"
                value={mapping.param}
                onChange={(e) => updateMapping(index, { param: e.target.value })}
                sx={{ flex: 1 }}
                InputProps={{
                  startAdornment: <InputAdornment position="start">?</InputAdornment>,
                }}
              />
              <Typography variant="body2" color="text.secondary">→</Typography>
              <FormControl size="small" sx={{ flex: 1 }}>
                <Select
                  value={mapping.field}
                  onChange={(e) => updateMapping(index, { field: e.target.value })}
                  displayEmpty
                >
                  <MenuItem value="" disabled>Select field</MenuItem>
                  {fieldConfigs.map(field => (
                    <MenuItem key={field.path} value={field.path}>
                      {field.label || field.path}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <IconButton size="small" onClick={() => removeMapping(index)}>
                <Delete fontSize="small" />
              </IconButton>
            </Box>
          ))}

          <Button
            size="small"
            startIcon={<Add />}
            onClick={addMapping}
            sx={{ mt: 1 }}
          >
            Add Mapping
          </Button>
        </Box>
      )}
    </Box>
  );
}

// ============================================
// Success Section
// ============================================

interface SuccessSectionProps {
  config?: OnSubmitSuccessConfig;
  onChange: (config: OnSubmitSuccessConfig | undefined) => void;
  fieldConfigs: FieldConfig[];
}

function SuccessSection({ config, onChange, fieldConfigs }: SuccessSectionProps) {
  const [showRedirect, setShowRedirect] = useState(!!config?.redirect);
  const [showWebhook, setShowWebhook] = useState(!!config?.webhook);

  const updateConfig = (updates: Partial<OnSubmitSuccessConfig>) => {
    const newConfig = { ...config, ...updates };
    // Clean up empty values
    if (!newConfig.message && !newConfig.redirect && !newConfig.webhook) {
      onChange(undefined);
    } else {
      onChange(newConfig);
    }
  };

  return (
    <Box>
      {/* Custom Success Message */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
        <Typography variant="caption" sx={{ fontWeight: 600 }}>
          Success Message
        </Typography>
        <FormVariablePickerButton
          fieldConfigs={fieldConfigs}
          context="template"
          useTemplateSyntax
          onInsert={(value) => {
            const currentMsg = config?.message || '';
            updateConfig({ message: currentMsg + value });
          }}
        />
      </Box>
      <TextField
        size="small"
        fullWidth
        multiline
        rows={2}
        placeholder="Thank you, {{name}}! Your response has been recorded."
        value={config?.message || ''}
        onChange={(e) => updateConfig({ message: e.target.value || undefined })}
        helperText="Use {{fieldPath}} to include field values. Click {x} to browse available fields."
      />

      <Divider sx={{ my: 2 }} />

      {/* Redirect Configuration */}
      <FormControlLabel
        control={
          <Switch
            size="small"
            checked={showRedirect}
            onChange={(e) => {
              setShowRedirect(e.target.checked);
              if (!e.target.checked) {
                updateConfig({ redirect: undefined });
              }
            }}
          />
        }
        label={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <LinkIcon sx={{ fontSize: 16 }} />
            <Typography variant="body2">Redirect after submission</Typography>
          </Box>
        }
      />

      {showRedirect && (
        <RedirectConfigEditor
          config={config?.redirect}
          onChange={(redirect) => updateConfig({ redirect })}
          fieldConfigs={fieldConfigs}
        />
      )}

      <Divider sx={{ my: 2 }} />

      {/* Webhook Configuration */}
      <FormControlLabel
        control={
          <Switch
            size="small"
            checked={showWebhook}
            onChange={(e) => {
              setShowWebhook(e.target.checked);
              if (!e.target.checked) {
                updateConfig({ webhook: undefined });
              }
            }}
          />
        }
        label={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <WebhookIcon sx={{ fontSize: 16 }} />
            <Typography variant="body2">Send webhook notification</Typography>
          </Box>
        }
      />

      {showWebhook && (
        <WebhookConfigEditor
          config={config?.webhook}
          onChange={(webhook) => updateConfig({ webhook })}
          fieldConfigs={fieldConfigs}
        />
      )}
    </Box>
  );
}

// ============================================
// Redirect Config Editor
// ============================================

interface RedirectConfigEditorProps {
  config?: RedirectConfig;
  onChange: (config: RedirectConfig | undefined) => void;
  fieldConfigs: FieldConfig[];
}

function RedirectConfigEditor({ config, onChange, fieldConfigs }: RedirectConfigEditorProps) {
  const [selectedFields, setSelectedFields] = useState<string[]>(config?.includeFields || []);

  const updateConfig = (updates: Partial<RedirectConfig>) => {
    const newConfig = { ...config, ...updates } as RedirectConfig;
    if (!newConfig.url) {
      onChange(undefined);
    } else {
      onChange(newConfig);
    }
  };

  const handleFieldToggle = (field: string) => {
    const newFields = selectedFields.includes(field)
      ? selectedFields.filter(f => f !== field)
      : [...selectedFields, field];
    setSelectedFields(newFields);
    updateConfig({ includeFields: newFields.length > 0 ? newFields : undefined });
  };

  return (
    <Box sx={{ pl: 2, mt: 1 }}>
      <TextField
        size="small"
        fullWidth
        label="Redirect URL"
        placeholder="https://example.com/thank-you"
        value={config?.url || ''}
        onChange={(e) => updateConfig({ url: e.target.value })}
        sx={{ mb: 1.5 }}
      />

      <Box sx={{ display: 'flex', gap: 2, mb: 1.5 }}>
        <TextField
          size="small"
          type="number"
          label="Delay (seconds)"
          value={config?.delay ?? 3}
          onChange={(e) => updateConfig({ delay: parseInt(e.target.value) || 0 })}
          inputProps={{ min: 0, max: 30 }}
          sx={{ width: 140 }}
        />
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={config?.includeResponseId ?? false}
              onChange={(e) => updateConfig({ includeResponseId: e.target.checked })}
            />
          }
          label={<Typography variant="caption">Include response ID in URL</Typography>}
        />
      </Box>

      <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
        Include field values in URL
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {fieldConfigs.slice(0, 10).map(field => (
          <Chip
            key={field.path}
            label={field.label || field.path}
            size="small"
            variant={selectedFields.includes(field.path) ? 'filled' : 'outlined'}
            onClick={() => handleFieldToggle(field.path)}
            sx={{ height: 24, fontSize: '0.7rem', cursor: 'pointer' }}
          />
        ))}
      </Box>
    </Box>
  );
}

// ============================================
// Webhook Config Editor
// ============================================

interface WebhookConfigEditorProps {
  config?: WebhookConfig;
  onChange: (config: WebhookConfig | undefined) => void;
  fieldConfigs: FieldConfig[];
}

function WebhookConfigEditor({ config, onChange, fieldConfigs }: WebhookConfigEditorProps) {
  const [headers, setHeaders] = useState<Array<{ key: string; value: string }>>(
    Object.entries(config?.headers || {}).map(([key, value]) => ({ key, value }))
  );

  const updateConfig = (updates: Partial<WebhookConfig>) => {
    const newConfig = { ...config, ...updates } as WebhookConfig;
    if (!newConfig.url) {
      onChange(undefined);
    } else {
      onChange(newConfig);
    }
  };

  const handleHeaderChange = (newHeaders: Array<{ key: string; value: string }>) => {
    setHeaders(newHeaders);
    const headersObj: Record<string, string> = {};
    newHeaders.forEach(h => {
      if (h.key && h.value) {
        headersObj[h.key] = h.value;
      }
    });
    updateConfig({ headers: Object.keys(headersObj).length > 0 ? headersObj : undefined });
  };

  const addHeader = () => {
    handleHeaderChange([...headers, { key: '', value: '' }]);
  };

  const removeHeader = (index: number) => {
    handleHeaderChange(headers.filter((_, i) => i !== index));
  };

  const updateHeader = (index: number, updates: Partial<{ key: string; value: string }>) => {
    const newHeaders = [...headers];
    newHeaders[index] = { ...newHeaders[index], ...updates };
    handleHeaderChange(newHeaders);
  };

  return (
    <Box sx={{ pl: 2, mt: 1 }}>
      <TextField
        size="small"
        fullWidth
        label="Webhook URL"
        placeholder="https://hooks.zapier.com/hooks/catch/..."
        value={config?.url || ''}
        onChange={(e) => updateConfig({ url: e.target.value })}
        sx={{ mb: 1.5 }}
      />

      <Box sx={{ display: 'flex', gap: 2, mb: 1.5 }}>
        <FormControl size="small" sx={{ minWidth: 100 }}>
          <InputLabel>Method</InputLabel>
          <Select
            value={config?.method || 'POST'}
            label="Method"
            onChange={(e) => updateConfig({ method: e.target.value as 'POST' | 'PUT' })}
          >
            <MenuItem value="POST">POST</MenuItem>
            <MenuItem value="PUT">PUT</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Include Fields</InputLabel>
          <Select
            value={config?.includeFields === 'all' ? 'all' : 'selected'}
            label="Include Fields"
            onChange={(e) => updateConfig({
              includeFields: e.target.value === 'all' ? 'all' : undefined
            })}
          >
            <MenuItem value="all">All fields</MenuItem>
            <MenuItem value="selected">Select fields...</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Headers */}
      <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
        <Key sx={{ fontSize: 12, mr: 0.5 }} />
        Custom Headers (for authentication)
      </Typography>

      {headers.map((header, index) => (
        <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1 }}>
          <TextField
            size="small"
            placeholder="Header name"
            value={header.key}
            onChange={(e) => updateHeader(index, { key: e.target.value })}
            sx={{ flex: 1 }}
          />
          <TextField
            size="small"
            placeholder="Value"
            value={header.value}
            onChange={(e) => updateHeader(index, { value: e.target.value })}
            sx={{ flex: 2 }}
            type="password"
          />
          <IconButton size="small" onClick={() => removeHeader(index)}>
            <Delete fontSize="small" />
          </IconButton>
        </Box>
      ))}

      <Button size="small" startIcon={<Add />} onClick={addHeader} sx={{ mb: 1.5 }}>
        Add Header
      </Button>

      {/* Retry settings */}
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={config?.retryOnFailure ?? false}
              onChange={(e) => updateConfig({ retryOnFailure: e.target.checked })}
            />
          }
          label={<Typography variant="caption">Retry on failure</Typography>}
        />
        {config?.retryOnFailure && (
          <TextField
            size="small"
            type="number"
            label="Max retries"
            value={config?.maxRetries ?? 3}
            onChange={(e) => updateConfig({ maxRetries: parseInt(e.target.value) || 3 })}
            inputProps={{ min: 1, max: 5 }}
            sx={{ width: 100 }}
          />
        )}
      </Box>
    </Box>
  );
}

// ============================================
// Error Section
// ============================================

interface ErrorSectionProps {
  config?: OnSubmitErrorConfig;
  onChange: (config: OnSubmitErrorConfig | undefined) => void;
}

function ErrorSection({ config, onChange }: ErrorSectionProps) {
  const updateConfig = (updates: Partial<OnSubmitErrorConfig>) => {
    const newConfig = { ...config, ...updates };
    if (!newConfig.message && !newConfig.webhook) {
      onChange(undefined);
    } else {
      onChange(newConfig);
    }
  };

  return (
    <Box>
      <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
        Error Message
      </Typography>
      <TextField
        size="small"
        fullWidth
        multiline
        rows={2}
        placeholder="Something went wrong. Please try again or contact support@example.com"
        value={config?.message || ''}
        onChange={(e) => updateConfig({ message: e.target.value || undefined })}
        helperText="Leave empty to show the default API error message"
      />
    </Box>
  );
}
