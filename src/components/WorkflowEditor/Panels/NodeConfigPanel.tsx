'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Drawer,
  Typography,
  TextField,
  Switch,
  FormControlLabel,
  IconButton,
  Divider,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  useTheme,
  alpha,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  InputAdornment,
  Tabs,
  Tab,
  ToggleButton,
  ToggleButtonGroup,
  Autocomplete,
  CircularProgress,
} from '@mui/material';
import {
  Close as CloseIcon,
  ExpandMore as ExpandIcon,
  Settings as SettingsIcon,
  Code as CodeIcon,
  Timer as TimerIcon,
  Refresh as RetryIcon,
  Delete as DeleteIcon,
  DataObject as DataIcon,
  CallSplit as ConditionalIcon,
} from '@mui/icons-material';
import { WorkflowNode, RetryPolicy } from '@/types/workflow';
import { useWorkflowActions, useWorkflowEditor } from '@/contexts/WorkflowContext';
import { DataContextPanel } from './DataContextPanel';
import { ConditionBuilder, ConditionGroup, conditionGroupToExpression } from './ConditionBuilder';
import { VariablePickerButton } from '../VariablePicker';

interface NodeConfigPanelProps {
  open: boolean;
  onClose: () => void;
}

// Node type specific config fields
const NODE_CONFIG_SCHEMAS: Record<string, ConfigField[]> = {
  'manual-trigger': [],
  'form-trigger': [
    { key: 'formId', label: 'Form ID', type: 'form-select', description: 'Select the form that triggers this workflow' },
    { key: 'waitForValidation', label: 'Wait for Validation', type: 'boolean', description: 'Wait for form validation before triggering' },
    { key: 'includeMetadata', label: 'Include Submission Metadata', type: 'boolean', description: 'Include IP, user agent, and timing info' },
  ],
  'webhook-trigger': [
    { key: 'path', label: 'Webhook Path', type: 'text', description: 'Custom path for the webhook endpoint' },
    { key: 'method', label: 'HTTP Method', type: 'select', options: ['POST', 'GET', 'PUT', 'DELETE'], description: 'Allowed HTTP method' },
    { key: 'secret', label: 'Secret Key', type: 'password', description: 'Secret for webhook validation' },
  ],
  'schedule-trigger': [
    { key: 'schedule', label: 'Cron Expression', type: 'text', description: 'Cron expression (e.g., "0 9 * * *" for 9 AM daily)' },
    { key: 'timezone', label: 'Timezone', type: 'text', description: 'Timezone for the schedule (e.g., "America/New_York")' },
  ],
  'conditional': [
    { key: 'condition', label: 'Condition', type: 'condition-builder', description: 'Define conditions for branching' },
  ],
  'switch': [
    { key: 'field', label: 'Field to Match', type: 'text', description: 'Data path to evaluate (e.g., "status", "user.role")' },
    { key: 'matchMode', label: 'Match Mode', type: 'select', options: ['exact', 'contains', 'regex', 'range'], description: 'How to compare values' },
    { key: 'cases', label: 'Cases', type: 'code', description: 'Array of cases: [{ "value": "active", "output": "active-branch" }, ...]' },
    { key: 'defaultOutput', label: 'Default Output', type: 'text', description: 'Output branch when no case matches (default: "default")' },
  ],
  'code': [
    { key: 'code', label: 'JavaScript Code', type: 'code', description: 'Code to execute. Use "input" for node inputs, "return" to output data.' },
    { key: 'timeout', label: 'Timeout (ms)', type: 'number', description: 'Max execution time (default: 5000, max: 30000)' },
  ],
  'loop': [
    { key: 'iterateOver', label: 'Iterate Over', type: 'text', description: 'Path to array to iterate (e.g., nodes.formTrigger.data.items)' },
    { key: 'itemVariable', label: 'Item Variable Name', type: 'text', description: 'Variable name for current item (default: "item")' },
  ],
  'delay': [
    { key: 'duration', label: 'Duration (ms)', type: 'number', description: 'Wait time in milliseconds' },
    { key: 'until', label: 'Wait Until', type: 'text', description: 'ISO date string to wait until (alternative to duration)' },
  ],
  'http-request': [
    { key: 'url', label: 'URL', type: 'text', description: 'The URL to request (use {{variable}} for dynamic values)' },
    { key: 'method', label: 'Method', type: 'select', options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], description: 'HTTP method' },
    { key: 'headers', label: 'Headers', type: 'code', description: 'Request headers as JSON' },
    { key: 'body', label: 'Body', type: 'code', description: 'Request body (for POST/PUT/PATCH)' },
    { key: 'timeout', label: 'Timeout (ms)', type: 'number', description: 'Request timeout in milliseconds' },
  ],
  'mongodb-query': [
    { key: 'connectionId', label: 'Connection', type: 'connection-select', description: 'Select a MongoDB connection from the vault' },
    { key: 'database', label: 'Database', type: 'text', description: 'Database name (optional, uses connection default)' },
    { key: 'collection', label: 'Collection', type: 'text', description: 'Collection name' },
    { key: 'operation', label: 'Operation', type: 'select', options: ['find', 'findOne', 'aggregate', 'count'], description: 'Query operation' },
    { key: 'query', label: 'Query/Pipeline', type: 'code', description: 'MongoDB query or aggregation pipeline as JSON (use {{variable}} for dynamic values)' },
    { key: 'options', label: 'Options', type: 'code', description: 'Query options (sort, limit, projection) as JSON' },
  ],
  'mongodb-write': [
    { key: 'connectionId', label: 'Connection', type: 'connection-select', description: 'Select a MongoDB connection from the vault' },
    { key: 'database', label: 'Database', type: 'text', description: 'Database name (optional, uses connection default)' },
    { key: 'collection', label: 'Collection', type: 'text', description: 'Collection name' },
    { key: 'operation', label: 'Operation', type: 'select', options: ['insertOne', 'insertMany', 'updateOne', 'updateMany', 'deleteOne', 'deleteMany', 'replaceOne'], description: 'Write operation' },
    { key: 'filter', label: 'Filter', type: 'code', description: 'Filter query for update/delete operations (use {{variable}} for dynamic values)' },
    { key: 'document', label: 'Document/Update', type: 'code', description: 'Document to insert, or update operators ($set, $inc, etc.)' },
    { key: 'options', label: 'Options', type: 'code', description: 'Write options (upsert, etc.) as JSON' },
  ],
  'google-sheets': [
    { key: 'connectionId', label: 'Google Credentials', type: 'connection-select', description: 'Select Google credentials from the vault' },
    { key: 'spreadsheetId', label: 'Spreadsheet ID', type: 'text', description: 'Google Sheets spreadsheet ID (from the URL)' },
    { key: 'action', label: 'Action', type: 'select', options: ['append_row', 'read_range', 'update_range', 'clear_range', 'get_spreadsheet_info'], description: 'Operation to perform' },
    { key: 'range', label: 'Range', type: 'text', description: 'Sheet range (e.g., "Sheet1!A1:D10" or just "Sheet1")' },
    { key: 'values', label: 'Values', type: 'code', description: 'Data to write (for append/update). Use {{variable}} for dynamic values' },
    { key: 'valueInputOption', label: 'Value Input Option', type: 'select', options: ['USER_ENTERED', 'RAW'], description: 'How values are interpreted (USER_ENTERED parses formulas)' },
    { key: 'insertDataOption', label: 'Insert Data Option', type: 'select', options: ['INSERT_ROWS', 'OVERWRITE'], description: 'How new data is inserted (for append)' },
    { key: 'majorDimension', label: 'Major Dimension', type: 'select', options: ['ROWS', 'COLUMNS'], description: 'How values are organized (default: ROWS)' },
  ],
  'email-send': [
    { key: 'to', label: 'To', type: 'text', description: 'Recipient email (use {{nodes.formTrigger.data.email}} for form field)' },
    { key: 'subject', label: 'Subject', type: 'text', description: 'Email subject (supports {{variables}})' },
    { key: 'body', label: 'Body', type: 'code', description: 'Email body (HTML supported, use {{variables}})' },
    { key: 'from', label: 'From', type: 'text', description: 'Sender email address' },
  ],
  'transform': [
    { key: 'expression', label: 'Transform Expression', type: 'code', description: 'JavaScript expression to transform data' },
  ],
  'filter': [
    { key: 'inputField', label: 'Input Array Field', type: 'text', description: 'Path to array to filter (default: "items")' },
    { key: 'conditions', label: 'Filter Conditions', type: 'code', description: 'Array of conditions: [{ "field": "status", "operator": "equals", "value": "active" }]' },
    { key: 'combineWith', label: 'Combine With', type: 'select', options: ['and', 'or'], description: 'How to combine multiple conditions' },
  ],
  'ai-prompt': [
    { key: 'prompt', label: 'Prompt', type: 'code', description: 'The prompt to send (use {{variables}} for dynamic content)' },
    { key: 'model', label: 'Model', type: 'select', options: ['gpt-4', 'gpt-3.5-turbo', 'claude-3-opus', 'claude-3-sonnet'], description: 'AI model to use' },
    { key: 'temperature', label: 'Temperature', type: 'number', description: 'Creativity level (0-1)' },
  ],
  'ai-classify': [
    { key: 'prompt', label: 'Classification Prompt', type: 'code', description: 'Describe what to classify and how' },
    { key: 'categories', label: 'Categories', type: 'text', description: 'Comma-separated list of categories' },
    { key: 'model', label: 'Model', type: 'select', options: ['gpt-4', 'gpt-3.5-turbo', 'claude-3-opus', 'claude-3-sonnet'], description: 'AI model to use' },
  ],
  'ai-extract': [
    { key: 'prompt', label: 'Extraction Prompt', type: 'code', description: 'Describe what data to extract' },
    { key: 'schema', label: 'Output Schema', type: 'code', description: 'JSON schema for extracted data structure' },
    { key: 'model', label: 'Model', type: 'select', options: ['gpt-4', 'gpt-3.5-turbo', 'claude-3-opus', 'claude-3-sonnet'], description: 'AI model to use' },
  ],
  'atlas-cluster': [
    { key: 'credentialId', label: 'Atlas Credentials', type: 'connection-select', description: 'Select Atlas Admin API credentials from integrations' },
    { key: 'operation', label: 'Operation', type: 'select', options: ['list', 'get_status', 'create', 'delete', 'list_projects'], description: 'Cluster operation to perform' },
    { key: 'projectId', label: 'Atlas Project ID', type: 'text', description: 'The Atlas project ID (required for cluster operations)' },
    { key: 'clusterName', label: 'Cluster Name', type: 'text', description: 'Target cluster name (required for single cluster operations)' },
    { key: 'clusterConfig', label: 'Cluster Config (JSON)', type: 'code', description: 'Configuration for create: { "provider": "AWS", "region": "US_EAST_1" }' },
  ],
  'atlas-data-api': [
    { key: 'credentialId', label: 'Data API Credentials', type: 'connection-select', description: 'Select Atlas Data API credentials from integrations' },
    { key: 'dataSource', label: 'Data Source', type: 'text', description: 'Cluster name or data source identifier' },
    { key: 'database', label: 'Database', type: 'text', description: 'Database name' },
    { key: 'collection', label: 'Collection', type: 'text', description: 'Collection name' },
    { key: 'operation', label: 'Operation', type: 'select', options: ['find', 'findOne', 'insertOne', 'insertMany', 'updateOne', 'updateMany', 'deleteOne', 'deleteMany', 'aggregate'], description: 'Data operation to perform' },
    { key: 'filter', label: 'Filter (JSON)', type: 'code', description: 'Query filter for find/update/delete operations' },
    { key: 'document', label: 'Document (JSON)', type: 'code', description: 'Document for insertOne operation' },
    { key: 'documents', label: 'Documents (JSON Array)', type: 'code', description: 'Documents array for insertMany operation' },
    { key: 'update', label: 'Update (JSON)', type: 'code', description: 'Update operations for updateOne/updateMany (e.g., { "$set": {...} })' },
    { key: 'pipeline', label: 'Pipeline (JSON Array)', type: 'code', description: 'Aggregation pipeline for aggregate operation' },
    { key: 'options', label: 'Options (JSON)', type: 'code', description: 'Additional options: { "sort": {...}, "limit": 10, "projection": {...}, "upsert": true }' },
  ],
};

interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'code' | 'password' | 'form-select' | 'connection-select' | 'condition-builder';
  options?: string[];
  description?: string;
}

// Default condition group
function createDefaultConditionGroup(): ConditionGroup {
  return {
    id: Math.random().toString(36).substring(2, 10),
    logic: 'and',
    conditions: [],
  };
}

export function NodeConfigPanel({ open, onClose }: NodeConfigPanelProps) {
  const theme = useTheme();
  const { selectedNode, nodes, edges } = useWorkflowEditor();
  const { updateNode, removeNode } = useWorkflowActions();

  // Tab state for conditional nodes
  const [conditionTab, setConditionTab] = useState<'visual' | 'code'>('visual');

  // Local state for editing
  const [label, setLabel] = useState('');
  const [notes, setNotes] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [timeout, setTimeout] = useState<number | undefined>(undefined);
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [retryEnabled, setRetryEnabled] = useState(false);
  const [retryPolicy, setRetryPolicy] = useState<RetryPolicy>({
    maxRetries: 3,
    backoffMultiplier: 2,
    initialDelayMs: 1000,
  });

  // Condition builder state
  const [conditionGroup, setConditionGroup] = useState<ConditionGroup>(createDefaultConditionGroup());

  // Forms list for form-select dropdown
  interface FormOption {
    id: string;
    name: string;
    slug?: string;
    isPublished?: boolean;
  }
  const [availableForms, setAvailableForms] = useState<FormOption[]>([]);
  const [formsLoading, setFormsLoading] = useState(false);

  // Connections list for connection-select dropdown
  interface ConnectionOption {
    vaultId: string;
    name: string;
    database: string;
    status: string;
  }
  const [availableConnections, setAvailableConnections] = useState<ConnectionOption[]>([]);
  const [connectionsLoading, setConnectionsLoading] = useState(false);

  // Fetch available forms when panel opens
  useEffect(() => {
    if (open && selectedNode?.type === 'form-trigger') {
      const fetchForms = async () => {
        setFormsLoading(true);
        try {
          const response = await fetch('/api/forms/list');
          const data = await response.json();
          if (data.success && data.forms) {
            setAvailableForms(data.forms.map((f: any) => ({
              id: f.id,
              name: f.name,
              slug: f.slug,
              isPublished: f.isPublished,
            })));
          }
        } catch (error) {
          console.error('Failed to fetch forms:', error);
        } finally {
          setFormsLoading(false);
        }
      };
      fetchForms();
    }
  }, [open, selectedNode?.type]);

  // Fetch available connections when panel opens for nodes that need them
  useEffect(() => {
    if (open && (selectedNode?.type === 'mongodb-write' || selectedNode?.type === 'mongodb-query' || selectedNode?.type === 'google-sheets')) {
      const fetchConnections = async () => {
        setConnectionsLoading(true);
        try {
          const response = await fetch('/api/vault/connections');
          const data = await response.json();
          if (data.success && data.connections) {
            setAvailableConnections(data.connections.map((c: any) => ({
              vaultId: c.vaultId,
              name: c.name,
              database: c.database,
              status: c.status,
            })));
          }
        } catch (error) {
          console.error('Failed to fetch connections:', error);
        } finally {
          setConnectionsLoading(false);
        }
      };
      fetchConnections();
    }
  }, [open, selectedNode?.type]);

  // Get available fields from upstream nodes for autocomplete
  const availableFields = useMemo(() => {
    if (!selectedNode) return [];

    // Find upstream nodes
    const upstream: { path: string; label: string; type: string }[] = [];
    const visited = new Set<string>();

    function traverse(nodeId: string) {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const incomingEdges = edges.filter(e => e.target === nodeId);
      for (const edge of incomingEdges) {
        const sourceNode = nodes.find(n => n.id === edge.source);
        if (sourceNode) {
          const prefix = `nodes.${sourceNode.id}`;
          const nodeLabel = sourceNode.label || sourceNode.type;

          // Add fields based on node type
          if (sourceNode.type === 'form-trigger') {
            upstream.push(
              { path: `${prefix}.data`, label: `${nodeLabel}: Form Data`, type: 'object' },
              { path: `${prefix}.data.email`, label: `${nodeLabel}: Email`, type: 'string' },
              { path: `${prefix}.data.name`, label: `${nodeLabel}: Name`, type: 'string' },
              { path: `${prefix}.data.status`, label: `${nodeLabel}: Status`, type: 'string' },
            );
          } else if (sourceNode.type === 'http-request') {
            upstream.push(
              { path: `${prefix}.response.data`, label: `${nodeLabel}: Response Data`, type: 'any' },
              { path: `${prefix}.response.status`, label: `${nodeLabel}: Status Code`, type: 'number' },
            );
          } else if (sourceNode.type === 'mongodb-query') {
            upstream.push(
              { path: `${prefix}.result`, label: `${nodeLabel}: Query Result`, type: 'array' },
              { path: `${prefix}.count`, label: `${nodeLabel}: Count`, type: 'number' },
            );
          } else if (sourceNode.type === 'google-sheets') {
            upstream.push(
              { path: `${prefix}.values`, label: `${nodeLabel}: Cell Values`, type: 'array' },
              { path: `${prefix}.range`, label: `${nodeLabel}: Range`, type: 'string' },
              { path: `${prefix}.spreadsheetId`, label: `${nodeLabel}: Spreadsheet ID`, type: 'string' },
              { path: `${prefix}.title`, label: `${nodeLabel}: Sheet Title`, type: 'string' },
            );
          }

          traverse(sourceNode.id);
        }
      }
    }

    traverse(selectedNode.id);
    return upstream;
  }, [selectedNode, nodes, edges]);

  // Sync local state with selected node
  useEffect(() => {
    if (selectedNode) {
      setLabel(selectedNode.label || '');
      setNotes(selectedNode.notes || '');
      setEnabled(selectedNode.enabled !== false);
      setTimeout(selectedNode.timeout);
      setConfig(selectedNode.config || {});
      setRetryEnabled(!!selectedNode.retryPolicy);
      if (selectedNode.retryPolicy) {
        setRetryPolicy(selectedNode.retryPolicy);
      }

      // Parse condition for conditional nodes
      if (selectedNode.type === 'conditional' && selectedNode.config?.conditionGroup) {
        setConditionGroup(selectedNode.config.conditionGroup as ConditionGroup);
      } else {
        setConditionGroup(createDefaultConditionGroup());
      }
    }
  }, [selectedNode]);

  // Save changes
  const handleSave = () => {
    if (!selectedNode) return;

    let finalConfig = { ...config };

    // For conditional nodes, save both the condition group and generated expression
    if (selectedNode.type === 'conditional') {
      finalConfig = {
        ...finalConfig,
        conditionGroup,
        condition: conditionGroupToExpression(conditionGroup),
      };
    }

    updateNode(selectedNode.id, {
      label: label || undefined,
      notes: notes || undefined,
      enabled,
      timeout: timeout || undefined,
      config: finalConfig,
      retryPolicy: retryEnabled ? retryPolicy : undefined,
    });

    onClose();
  };

  // Update config field
  const handleConfigChange = (key: string, value: unknown) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  // Handle variable insertion from data context panel
  const handleInsertVariable = (path: string) => {
    // Copy to clipboard with handlebars syntax
    navigator.clipboard.writeText(`{{${path}}}`);
  };

  // Handle delete
  const handleDelete = () => {
    if (!selectedNode) return;
    if (confirm('Are you sure you want to delete this node?')) {
      removeNode(selectedNode.id);
      onClose();
    }
  };

  if (!selectedNode) {
    return null;
  }

  const configSchema = NODE_CONFIG_SCHEMAS[selectedNode.type] || [];
  const isConditionalNode = selectedNode.type === 'conditional';

  // Render config field based on type
  const renderConfigField = (field: ConfigField) => {
    const value = config[field.key];

    // Skip condition field for conditional nodes - we use the visual builder
    if (field.type === 'condition-builder') {
      return null;
    }

    switch (field.type) {
      case 'text':
      case 'password':
        return (
          <TextField
            key={field.key}
            fullWidth
            size="small"
            label={field.label}
            type={field.type === 'password' ? 'password' : 'text'}
            value={(value as string) || ''}
            onChange={(e) => handleConfigChange(field.key, e.target.value)}
            helperText={field.description}
            sx={{ mb: 2 }}
            InputProps={{
              endAdornment: field.type !== 'password' && (
                <InputAdornment position="end">
                  <VariablePickerButton
                    nodeId={selectedNode.id}
                    onInsert={(variable) => {
                      const currentValue = (value as string) || '';
                      handleConfigChange(field.key, currentValue + variable);
                    }}
                  />
                </InputAdornment>
              ),
            }}
          />
        );
      case 'number':
        return (
          <TextField
            key={field.key}
            fullWidth
            size="small"
            label={field.label}
            type="number"
            value={value ?? ''}
            onChange={(e) => handleConfigChange(field.key, e.target.value ? Number(e.target.value) : undefined)}
            helperText={field.description}
            sx={{ mb: 2 }}
          />
        );
      case 'boolean':
        return (
          <FormControlLabel
            key={field.key}
            control={
              <Switch
                checked={Boolean(value)}
                onChange={(e) => handleConfigChange(field.key, e.target.checked)}
              />
            }
            label={
              <Box>
                <Typography variant="body2">{field.label}</Typography>
                {field.description && (
                  <Typography variant="caption" color="text.secondary">
                    {field.description}
                  </Typography>
                )}
              </Box>
            }
            sx={{ mb: 2, display: 'flex' }}
          />
        );
      case 'select':
        return (
          <FormControl key={field.key} fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>{field.label}</InputLabel>
            <Select
              value={(value as string) || ''}
              label={field.label}
              onChange={(e) => handleConfigChange(field.key, e.target.value)}
            >
              {field.options?.map((opt) => (
                <MenuItem key={opt} value={opt}>
                  {opt}
                </MenuItem>
              ))}
            </Select>
            {field.description && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, ml: 1.5 }}>
                {field.description}
              </Typography>
            )}
          </FormControl>
        );
      case 'form-select':
        // Find the currently selected form for display
        const selectedForm = availableForms.find(f => f.id === value || f.slug === value);
        // Check if the current value looks like a valid form ID (not just text)
        const currentValueIsValidId = typeof value === 'string' && (
          availableForms.some(f => f.id === value || f.slug === value) ||
          /^[a-f0-9]{32}$/.test(value) // UUID-like form ID pattern
        );
        return (
          <Box key={field.key} sx={{ mb: 2 }}>
            <Autocomplete
              options={availableForms}
              loading={formsLoading}
              value={selectedForm || null}
              onChange={(_, newValue) => {
                if (newValue) {
                  // Use form ID when selecting from dropdown
                  handleConfigChange(field.key, newValue.id);
                } else {
                  handleConfigChange(field.key, '');
                }
              }}
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(option, val) => option.id === val.id}
              renderOption={(props, option) => (
                <Box component="li" {...props} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start !important' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {option.name}
                    </Typography>
                    {option.isPublished && (
                      <Chip
                        label="Published"
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: '0.65rem',
                          bgcolor: alpha(theme.palette.success.main, 0.1),
                          color: theme.palette.success.main,
                        }}
                      />
                    )}
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                    ID: {option.id}
                    {option.slug && ` • Slug: ${option.slug}`}
                  </Typography>
                </Box>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={field.label}
                  size="small"
                  helperText={field.description}
                  placeholder="Select a form from the dropdown"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {formsLoading ? <CircularProgress color="inherit" size={18} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
            {typeof value === 'string' && value.length > 0 && (
              <Box sx={{ mt: 1, p: 1, bgcolor: currentValueIsValidId ? alpha(theme.palette.success.main, 0.1) : alpha(theme.palette.warning.main, 0.1), borderRadius: 1 }}>
                <Typography variant="caption" sx={{ fontFamily: 'monospace', color: currentValueIsValidId ? 'success.main' : 'warning.main' }}>
                  Form ID: {value}
                </Typography>
                {!currentValueIsValidId && (
                  <Typography variant="caption" display="block" color="warning.main" sx={{ mt: 0.5 }}>
                    Warning: This does not look like a valid form ID. Please select a form from the dropdown.
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        );
      case 'connection-select':
        // Find the currently selected connection for display
        const selectedConnection = availableConnections.find(c => c.vaultId === value);
        // Check if the current value looks like a valid vault ID
        const currentValueIsValidVaultId = typeof value === 'string' && (
          availableConnections.some(c => c.vaultId === value) ||
          /^vault_[a-zA-Z0-9]+$/.test(value)
        );
        return (
          <Box key={field.key} sx={{ mb: 2 }}>
            <Autocomplete
              options={availableConnections}
              loading={connectionsLoading}
              value={selectedConnection || null}
              onChange={(_, newValue) => {
                if (newValue) {
                  // Use vault ID when selecting from dropdown
                  handleConfigChange(field.key, newValue.vaultId);
                } else {
                  handleConfigChange(field.key, '');
                }
              }}
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(option, val) => option.vaultId === val.vaultId}
              renderOption={(props, option) => (
                <Box component="li" {...props} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start !important' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {option.name}
                    </Typography>
                    <Chip
                      label={option.status}
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: '0.65rem',
                        bgcolor: option.status === 'active'
                          ? alpha(theme.palette.success.main, 0.1)
                          : alpha(theme.palette.warning.main, 0.1),
                        color: option.status === 'active'
                          ? theme.palette.success.main
                          : theme.palette.warning.main,
                      }}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                    Database: {option.database}
                  </Typography>
                </Box>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={field.label}
                  size="small"
                  helperText={field.description}
                  placeholder="Select a connection from the vault"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {connectionsLoading ? <CircularProgress color="inherit" size={18} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
            {typeof value === 'string' && value.length > 0 && (
              <Box sx={{ mt: 1, p: 1, bgcolor: currentValueIsValidVaultId ? alpha(theme.palette.success.main, 0.1) : alpha(theme.palette.warning.main, 0.1), borderRadius: 1 }}>
                <Typography variant="caption" sx={{ fontFamily: 'monospace', color: currentValueIsValidVaultId ? 'success.main' : 'warning.main' }}>
                  Vault ID: {value}
                </Typography>
                {!currentValueIsValidVaultId && (
                  <Typography variant="caption" display="block" color="warning.main" sx={{ mt: 0.5 }}>
                    Warning: This does not look like a valid vault ID. Please select a connection from the dropdown.
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        );
      case 'code':
        return (
          <Box key={field.key} sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {field.label}
              </Typography>
              <VariablePickerButton
                nodeId={selectedNode.id}
                onInsert={(variable) => {
                  const currentValue = typeof value === 'string' ? value : JSON.stringify(value, null, 2) || '';
                  handleConfigChange(field.key, currentValue + variable);
                }}
              />
            </Box>
            <TextField
              fullWidth
              multiline
              rows={4}
              size="small"
              value={typeof value === 'string' ? value : JSON.stringify(value, null, 2) || ''}
              onChange={(e) => {
                try {
                  // Try to parse as JSON
                  const parsed = JSON.parse(e.target.value);
                  handleConfigChange(field.key, parsed);
                } catch {
                  // Store as string if not valid JSON
                  handleConfigChange(field.key, e.target.value);
                }
              }}
              helperText={field.description}
              placeholder="Use {{nodes.nodeId.field}} to reference data from other nodes"
              sx={{
                '& .MuiInputBase-input': {
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                },
              }}
            />
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: isConditionalNode ? 500 : 420,
          bgcolor: 'background.paper',
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          p: 2,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <SettingsIcon color="primary" />
        <Typography variant="h6" sx={{ flex: 1, fontWeight: 600 }}>
          Node Configuration
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {/* Node Type Badge */}
        <Box sx={{ mb: 2 }}>
          <Chip
            label={selectedNode.type}
            size="small"
            sx={{
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              color: 'primary.main',
              fontWeight: 500,
            }}
          />
        </Box>

        {/* Basic Settings */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandIcon />}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Basic Settings
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <TextField
              fullWidth
              size="small"
              label="Label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Custom node label"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              size="small"
              label="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this node"
              multiline
              rows={2}
              sx={{ mb: 2 }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                />
              }
              label="Enabled"
            />
          </AccordionDetails>
        </Accordion>

        {/* Conditional Node - Visual Condition Builder */}
        {isConditionalNode && (
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandIcon />}>
              <ConditionalIcon sx={{ mr: 1, fontSize: 20 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Conditions
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              {/* Tab toggle for visual/code */}
              <Box sx={{ mb: 2 }}>
                <ToggleButtonGroup
                  value={conditionTab}
                  exclusive
                  onChange={(_, value) => value && setConditionTab(value)}
                  size="small"
                  fullWidth
                >
                  <ToggleButton value="visual">Visual Builder</ToggleButton>
                  <ToggleButton value="code">Code</ToggleButton>
                </ToggleButtonGroup>
              </Box>

              {conditionTab === 'visual' ? (
                <ConditionBuilder
                  conditions={conditionGroup}
                  onChange={setConditionGroup}
                  availableFields={availableFields}
                />
              ) : (
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  size="small"
                  label="Condition Expression"
                  value={(config.condition as string) || conditionGroupToExpression(conditionGroup)}
                  onChange={(e) => handleConfigChange('condition', e.target.value)}
                  helperText="JavaScript expression that returns true/false"
                  sx={{
                    '& .MuiInputBase-input': {
                      fontFamily: 'monospace',
                      fontSize: '0.85rem',
                    },
                  }}
                />
              )}
            </AccordionDetails>
          </Accordion>
        )}

        {/* Node-Specific Config */}
        {configSchema.length > 0 && !isConditionalNode && (
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandIcon />}>
              <CodeIcon sx={{ mr: 1, fontSize: 20 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Configuration
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              {configSchema.map(renderConfigField)}
            </AccordionDetails>
          </Accordion>
        )}

        {/* Data Context Panel - show available variables */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandIcon />}>
            <DataIcon sx={{ mr: 1, fontSize: 20 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Available Data
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 0 }}>
            <DataContextPanel
              nodeId={selectedNode.id}
              onInsertVariable={handleInsertVariable}
            />
          </AccordionDetails>
        </Accordion>

        {/* Execution Settings */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandIcon />}>
            <TimerIcon sx={{ mr: 1, fontSize: 20 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Execution
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <TextField
              fullWidth
              size="small"
              label="Timeout (ms)"
              type="number"
              value={timeout ?? ''}
              onChange={(e) => setTimeout(e.target.value ? Number(e.target.value) : undefined)}
              helperText="Override workflow timeout for this node"
              sx={{ mb: 2 }}
            />
          </AccordionDetails>
        </Accordion>

        {/* Retry Policy */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandIcon />}>
            <RetryIcon sx={{ mr: 1, fontSize: 20 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Retry Policy
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <FormControlLabel
              control={
                <Switch
                  checked={retryEnabled}
                  onChange={(e) => setRetryEnabled(e.target.checked)}
                />
              }
              label="Enable custom retry policy"
              sx={{ mb: 2 }}
            />
            {retryEnabled && (
              <>
                <TextField
                  fullWidth
                  size="small"
                  label="Max Retries"
                  type="number"
                  value={retryPolicy.maxRetries}
                  onChange={(e) =>
                    setRetryPolicy((prev) => ({
                      ...prev,
                      maxRetries: Number(e.target.value),
                    }))
                  }
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Initial Delay (ms)"
                  type="number"
                  value={retryPolicy.initialDelayMs}
                  onChange={(e) =>
                    setRetryPolicy((prev) => ({
                      ...prev,
                      initialDelayMs: Number(e.target.value),
                    }))
                  }
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Backoff Multiplier"
                  type="number"
                  value={retryPolicy.backoffMultiplier}
                  onChange={(e) =>
                    setRetryPolicy((prev) => ({
                      ...prev,
                      backoffMultiplier: Number(e.target.value),
                    }))
                  }
                />
              </>
            )}
          </AccordionDetails>
        </Accordion>

        <Divider sx={{ my: 2 }} />

        {/* Delete Node */}
        <Button
          fullWidth
          variant="outlined"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={handleDelete}
        >
          Delete Node
        </Button>
      </Box>

      {/* Footer */}
      <Box
        sx={{
          p: 2,
          borderTop: `1px solid ${theme.palette.divider}`,
          display: 'flex',
          gap: 1,
        }}
      >
        <Button variant="outlined" onClick={onClose} sx={{ flex: 1 }}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSave} sx={{ flex: 1 }}>
          Save Changes
        </Button>
      </Box>
    </Drawer>
  );
}

export default NodeConfigPanel;
