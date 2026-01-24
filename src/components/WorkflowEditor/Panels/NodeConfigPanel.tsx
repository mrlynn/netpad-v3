'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
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
  Tooltip,
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
  Palette as PaletteIcon,
  Circle as CircleIcon,
  CheckCircle as SavedIcon,
} from '@mui/icons-material';
import { WorkflowNode, RetryPolicy, StickyNoteStyle } from '@/types/workflow';
import { useWorkflowActions, useWorkflowEditor } from '@/contexts/WorkflowContext';
import { useApplicationSafe } from '@/contexts/ApplicationContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { DataContextPanel } from './DataContextPanel';
// ConditionBuilder types imported by LogicNodeEditor
import { VariablePickerButton } from '../VariablePicker';
import { STICKY_NOTE_PRESETS, getStyleFromConfig } from '../Nodes/StickyNote';
import { TriggerNodeEditor } from '../NodeEditors/TriggerNodeEditor';
import { LogicNodeEditor } from '../NodeEditors/LogicNodeEditor';
import { IntegrationNodeEditor } from '../NodeEditors/IntegrationNodeEditor';
import { ActionNodeEditor } from '../NodeEditors/ActionNodeEditor';
import { DataNodeEditor } from '../NodeEditors/DataNodeEditor';
import { AINodeEditor } from '../NodeEditors/AINodeEditor';
import { CustomNodeEditor } from '../NodeEditors/CustomNodeEditor';
import { ExtensionNodeEditor } from '../NodeEditors/ExtensionNodeEditor';

interface NodeConfigPanelProps {
  open: boolean;
  onClose: () => void;
  onTestWorkflow?: () => void;
}

export function NodeConfigPanel({ open, onClose, onTestWorkflow }: NodeConfigPanelProps) {
  const theme = useTheme();
  const params = useParams();

  // Get org/project/app context from multiple sources:
  // 1. URL params (for /orgs/[orgId]/projects/[projectId]/... routes)
  // 2. ApplicationContext (for /apps/[appSlug]/... routes)
  // 3. OrganizationContext (fallback for orgId)
  const appContext = useApplicationSafe();
  const { currentOrgId } = useOrganization();

  const orgId = (params.orgId as string) || currentOrgId || undefined;
  const projectId = (params.projectId as string) || appContext?.currentProjectId || undefined;
  const applicationId = appContext?.currentAppId || undefined;

  const { selectedNode, nodes, edges } = useWorkflowEditor();
  const { updateNode, removeNode } = useWorkflowActions();

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

  // Email credentials list for email-credential-select dropdown
  interface EmailCredentialOption {
    credentialId: string;
    name: string;
    provider: 'smtp' | 'sendgrid';
    status: string;
    fromEmail?: string;
  }
  const [availableEmailCredentials, setAvailableEmailCredentials] = useState<EmailCredentialOption[]>([]);
  const [emailCredentialsLoading, setEmailCredentialsLoading] = useState(false);

  // Fetch available forms when panel opens
  useEffect(() => {
    if (open && selectedNode?.type === 'form-trigger' && orgId) {
      const fetchForms = async () => {
        setFormsLoading(true);
        try {
          // Include projectId and applicationId to filter forms to the current context
          const queryParams = new URLSearchParams({ orgId });
          if (projectId) {
            queryParams.append('projectId', projectId);
          }
          if (applicationId) {
            queryParams.append('applicationId', applicationId);
          }
          const response = await fetch(`/api/forms/list?${queryParams.toString()}`);
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
  }, [open, selectedNode?.type, orgId, projectId, applicationId]);

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

  // Fetch available email credentials when panel opens for email-send node
  useEffect(() => {
    if (open && selectedNode?.type === 'email-send' && orgId) {
      const fetchEmailCredentials = async () => {
        setEmailCredentialsLoading(true);
        try {
          const response = await fetch(`/api/organizations/${orgId}/integrations/email`);
          const data = await response.json();
          if (data.success && data.credentials) {
            setAvailableEmailCredentials(data.credentials.map((c: any) => ({
              credentialId: c.credentialId,
              name: c.name,
              provider: c.provider,
              status: c.status,
              fromEmail: c.fromEmail,
            })));
          }
        } catch (error) {
          console.error('Failed to fetch email credentials:', error);
        } finally {
          setEmailCredentialsLoading(false);
        }
      };
      fetchEmailCredentials();
    }
  }, [open, selectedNode?.type, orgId]);

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

  // Track if this is the initial sync (to avoid triggering autosave on mount)
  const isInitialSyncRef = useRef(true);
  const autosaveTimerRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Sync local state with selected node
  useEffect(() => {
    if (selectedNode) {
      isInitialSyncRef.current = true;
      setLabel(selectedNode.label || '');
      setNotes(selectedNode.notes || '');
      setEnabled(selectedNode.enabled !== false);
      setTimeout(selectedNode.timeout);
      setConfig(selectedNode.config || {});
      setRetryEnabled(!!selectedNode.retryPolicy);
      if (selectedNode.retryPolicy) {
        setRetryPolicy(selectedNode.retryPolicy);
      }
      // Allow autosave after initial sync
      requestAnimationFrame(() => {
        isInitialSyncRef.current = false;
      });
    }
  }, [selectedNode]);

  // Debounced autosave function
  const debouncedSave = useCallback(() => {
    if (!selectedNode || isInitialSyncRef.current) return;

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = globalThis.setTimeout(() => {
      updateNode(selectedNode.id, {
        label: label || undefined,
        notes: notes || undefined,
        enabled,
        timeout: timeout || undefined,
        config: config,
        retryPolicy: retryEnabled ? retryPolicy : undefined,
      });
      setLastSaved(new Date());
    }, 300); // 300ms debounce
  }, [selectedNode, label, notes, enabled, timeout, config, retryEnabled, retryPolicy, updateNode]);

  // Trigger autosave when any value changes
  useEffect(() => {
    if (!isInitialSyncRef.current && selectedNode) {
      debouncedSave();
    }
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [label, notes, enabled, timeout, config, retryEnabled, retryPolicy, debouncedSave, selectedNode]);

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

  const isConditionalNode = selectedNode.type === 'conditional';
  const isStickyNote = selectedNode.type === 'sticky-note';
  const isTriggerNode = ['manual-trigger', 'form-trigger', 'webhook-trigger', 'schedule-trigger'].includes(selectedNode.type);
  const isLogicNode = ['conditional', 'switch', 'loop', 'delay'].includes(selectedNode.type);
  const isIntegrationNode = ['http-request', 'mongodb-query', 'mongodb-write', 'google-sheets', 'atlas-cluster', 'atlas-data-api'].includes(selectedNode.type);
  const isActionNode = ['email-send', 'notification'].includes(selectedNode.type);
  const isDataNode = ['transform', 'filter'].includes(selectedNode.type);
  const isAINode = ['ai-prompt', 'ai-classify', 'ai-extract'].includes(selectedNode.type);
  const isCustomNode = ['code'].includes(selectedNode.type);

  // Extension nodes are identified by having a colon in the type (e.g., 'collaborate:notify-collaborators')
  // or by having extension metadata in config
  const isExtensionNode = selectedNode.type.includes(':') || Boolean(selectedNode.config?._providedBy);

  // Determine if node has config (all node types except conditional and sticky-note use editors)
  const hasConfig = !isConditionalNode && !isStickyNote && (isTriggerNode || isLogicNode || isIntegrationNode || isActionNode || isDataNode || isAINode || isCustomNode || isExtensionNode);

  // Get current sticky note style
  const currentStickyStyle = getStyleFromConfig(config);
  const currentStickyPreset = STICKY_NOTE_PRESETS.find(
    (p) =>
      (p.style.bgColor === currentStickyStyle.bgColor && p.style.bgType === 'solid') ||
      (p.style.bgType === 'gradient' &&
        currentStickyStyle.bgType === 'gradient' &&
        JSON.stringify(p.style.gradient) === JSON.stringify(currentStickyStyle.gradient))
  );


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
        {lastSaved && (
          <Tooltip title={`Last saved: ${lastSaved.toLocaleTimeString()}`}>
            <Chip
              icon={<SavedIcon sx={{ fontSize: 14 }} />}
              label="Auto-saved"
              size="small"
              sx={{
                height: 24,
                fontSize: '0.75rem',
                color: theme.palette.success.main,
                bgcolor: alpha(theme.palette.success.main, 0.1),
                border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
                '& .MuiChip-icon': {
                  color: 'inherit',
                },
              }}
            />
          </Tooltip>
        )}
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
              <LogicNodeEditor
                node={selectedNode}
                config={config}
                onConfigChange={handleConfigChange}
                availableForms={availableForms}
                formsLoading={formsLoading}
                availableConnections={availableConnections}
                connectionsLoading={connectionsLoading}
                nodeId={selectedNode.id}
                availableFields={availableFields}
              />
              {/* Include Else Output Toggle */}
              <Divider sx={{ my: 2 }} />
              <FormControlLabel
                control={
                  <Switch
                    checked={Boolean(config.includeElse)}
                    onChange={(e) => handleConfigChange('includeElse', e.target.checked)}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2">Include Else Output</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Add a third "Else" output handle for fallback cases
                    </Typography>
                  </Box>
                }
                sx={{ display: 'flex' }}
              />
            </AccordionDetails>
          </Accordion>
        )}

        {/* Sticky Note Configuration */}
        {isStickyNote && (
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandIcon />}>
              <PaletteIcon sx={{ mr: 1, fontSize: 20 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Note Content & Style
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              {/* Content */}
              <TextField
                fullWidth
                multiline
                rows={8}
                size="small"
                label="Note Content"
                value={(config.content as string) || ''}
                onChange={(e) => handleConfigChange('content', e.target.value)}
                placeholder="Write your note here...

# Markdown Supported
- **Bold** and *italic* text
- Lists and checkboxes
- [Links](https://example.com)
- `code` snippets"
                helperText="Supports Markdown formatting"
                sx={{
                  mb: 2,
                  '& .MuiInputBase-input': {
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                  },
                }}
              />

              {/* Style Selection */}
              <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                Note Style
              </Typography>

              {/* Solid Colors */}
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Solid Colors
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.5 }}>
                {STICKY_NOTE_PRESETS.slice(0, 8).map((preset) => (
                  <IconButton
                    key={preset.name}
                    onClick={() => {
                      handleConfigChange('style', preset.style);
                      if (preset.style.bgColor) {
                        handleConfigChange('bgColor', preset.style.bgColor);
                      }
                    }}
                    size="small"
                    title={preset.name}
                    sx={{
                      p: 0.25,
                      border: currentStickyPreset?.name === preset.name ? `2px solid ${preset.preview.border}` : '2px solid transparent',
                      borderRadius: 1,
                    }}
                  >
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: 0.5,
                        background: preset.preview.bg,
                        border: `1px solid ${preset.preview.border}`,
                      }}
                    />
                  </IconButton>
                ))}
              </Box>

              {/* Gradients */}
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Gradients
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.5 }}>
                {STICKY_NOTE_PRESETS.slice(8, 14).map((preset) => (
                  <IconButton
                    key={preset.name}
                    onClick={() => handleConfigChange('style', preset.style)}
                    size="small"
                    title={preset.name}
                    sx={{
                      p: 0.25,
                      border: currentStickyPreset?.name === preset.name ? `2px solid ${preset.preview.border}` : '2px solid transparent',
                      borderRadius: 1,
                    }}
                  >
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: 0.5,
                        background: preset.preview.bg,
                        border: `1px solid ${preset.preview.border}`,
                      }}
                    />
                  </IconButton>
                ))}
              </Box>

              {/* Special Effects */}
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Special Effects
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                {STICKY_NOTE_PRESETS.slice(14).map((preset) => (
                  <IconButton
                    key={preset.name}
                    onClick={() => handleConfigChange('style', preset.style)}
                    size="small"
                    title={preset.name}
                    sx={{
                      p: 0.25,
                      border: currentStickyPreset?.name === preset.name ? `2px solid ${preset.preview.border}` : '2px solid transparent',
                      borderRadius: 1,
                    }}
                  >
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: 0.5,
                        background: preset.preview.bg,
                        border: `1px solid ${preset.preview.border}`,
                        ...(preset.style.borderStyle === 'glow' && {
                          boxShadow: `0 0 4px ${preset.preview.border}`,
                        }),
                      }}
                    />
                  </IconButton>
                ))}
              </Box>

              <Typography variant="caption" color="text.secondary">
                Current: {currentStickyPreset?.name || 'Custom'}
              </Typography>

              {/* Size Info */}
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                  Size
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {(config.width as number) || 200}px × {(config.height as number) || 150}px
                </Typography>
                <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                  Tip: Drag the edges of the sticky note on the canvas to resize
                </Typography>
              </Box>
            </AccordionDetails>
          </Accordion>
        )}

        {/* Node-Specific Config */}
        {hasConfig && (
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandIcon />}>
              <CodeIcon sx={{ mr: 1, fontSize: 20 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Configuration
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              {isTriggerNode ? (
                <TriggerNodeEditor
                  node={selectedNode}
                  config={config}
                  onConfigChange={handleConfigChange}
                  availableForms={availableForms}
                  formsLoading={formsLoading}
                  availableConnections={availableConnections}
                  connectionsLoading={connectionsLoading}
                  nodeId={selectedNode.id}
                  onTestClick={onTestWorkflow ? () => {
                    onClose(); // Close config panel first
                    onTestWorkflow(); // Then open test dialog
                  } : undefined}
                />
              ) : isLogicNode ? (
                <LogicNodeEditor
                  node={selectedNode}
                  config={config}
                  onConfigChange={handleConfigChange}
                  availableForms={availableForms}
                  formsLoading={formsLoading}
                  availableConnections={availableConnections}
                  connectionsLoading={connectionsLoading}
                  nodeId={selectedNode.id}
                  availableFields={availableFields}
                />
              ) : isIntegrationNode ? (
                <IntegrationNodeEditor
                  node={selectedNode}
                  config={config}
                  onConfigChange={handleConfigChange}
                  availableForms={availableForms}
                  formsLoading={formsLoading}
                  availableConnections={availableConnections}
                  connectionsLoading={connectionsLoading}
                  nodeId={selectedNode.id}
                />
              ) : isActionNode ? (
                <ActionNodeEditor
                  node={selectedNode}
                  config={config}
                  onConfigChange={handleConfigChange}
                  availableForms={availableForms}
                  formsLoading={formsLoading}
                  availableConnections={availableConnections}
                  connectionsLoading={connectionsLoading}
                  availableEmailCredentials={availableEmailCredentials}
                  emailCredentialsLoading={emailCredentialsLoading}
                  nodeId={selectedNode.id}
                />
              ) : isDataNode ? (
                <DataNodeEditor
                  node={selectedNode}
                  config={config}
                  onConfigChange={handleConfigChange}
                  availableForms={availableForms}
                  formsLoading={formsLoading}
                  availableConnections={availableConnections}
                  connectionsLoading={connectionsLoading}
                  nodeId={selectedNode.id}
                />
              ) : isAINode ? (
                <AINodeEditor
                  node={selectedNode}
                  config={config}
                  onConfigChange={handleConfigChange}
                  availableForms={availableForms}
                  formsLoading={formsLoading}
                  availableConnections={availableConnections}
                  connectionsLoading={connectionsLoading}
                  nodeId={selectedNode.id}
                />
              ) : isCustomNode ? (
                <CustomNodeEditor
                  node={selectedNode}
                  config={config}
                  onConfigChange={handleConfigChange}
                  availableForms={availableForms}
                  formsLoading={formsLoading}
                  availableConnections={availableConnections}
                  connectionsLoading={connectionsLoading}
                  nodeId={selectedNode.id}
                />
              ) : isExtensionNode ? (
                <ExtensionNodeEditor
                  node={selectedNode}
                  config={config}
                  onConfigChange={handleConfigChange}
                  nodeId={selectedNode.id}
                />
              ) : null}
            </AccordionDetails>
          </Accordion>
        )}

        {/* Data Context Panel - show available variables (not for sticky notes) */}
        {!isStickyNote && (
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
        )}

        {/* Execution Settings (not for sticky notes) */}
        {!isStickyNote && (
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
        )}

        {/* Retry Policy (not for sticky notes) */}
        {!isStickyNote && (
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
        )}

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
          justifyContent: 'flex-end',
        }}
      >
        <Button variant="outlined" onClick={onClose}>
          Done
        </Button>
      </Box>
    </Drawer>
  );
}

export default NodeConfigPanel;
