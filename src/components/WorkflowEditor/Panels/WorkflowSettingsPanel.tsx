'use client';

import React, { useState, useEffect } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Button,
  Slider,
  FormHelperText,
  Switch,
  FormControlLabel,
  Chip,
  Autocomplete,
  Alert,
} from '@mui/material';
import {
  Close as CloseIcon,
  Settings as SettingsIcon,
  Save as SaveIcon,
  Code as CodeIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { useWorkflow, useWorkflowEditor } from '@/contexts/WorkflowContext';
import { WorkflowSettings, RetryPolicy, WorkflowEmbedSettings } from '@/types/workflow';
import { generateExecutionToken, hashExecutionToken, getTokenPrefix } from '@/lib/workflow/embedTokens';
import { WorkflowEmbedCodeGenerator } from '../EmbedCodeGenerator';

interface WorkflowSettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

const EXECUTION_MODES = [
  { value: 'sequential', label: 'Sequential', description: 'Execute nodes one at a time in order' },
  { value: 'parallel', label: 'Parallel', description: 'Execute independent nodes simultaneously' },
  { value: 'auto', label: 'Auto', description: 'Automatically determine best execution strategy' },
  { value: 'immediate', label: 'Immediate', description: 'Execute synchronously without queuing' },
];

const ERROR_HANDLING_OPTIONS = [
  { value: 'stop', label: 'Stop on Error', description: 'Stop workflow immediately when any node fails' },
  { value: 'continue', label: 'Continue on Error', description: 'Continue executing remaining nodes even if one fails' },
  { value: 'rollback', label: 'Rollback on Error', description: 'Attempt to undo completed actions on failure' },
];

const COMMON_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Australia/Sydney',
];

export function WorkflowSettingsPanel({ open, onClose }: WorkflowSettingsPanelProps) {
  const { updateWorkflowSettings } = useWorkflow();
  const { workflow } = useWorkflowEditor();

  // Local state for editing
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [settings, setSettings] = useState<WorkflowSettings>({
    executionMode: 'auto',
    maxExecutionTime: 300000,
    retryPolicy: {
      maxRetries: 3,
      backoffMultiplier: 2,
      initialDelayMs: 1000,
    },
    errorHandling: 'stop',
    timezone: 'UTC',
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'settings' | 'embed'>('settings');

  // Sync local state when workflow changes
  useEffect(() => {
    if (workflow) {
      setName(workflow.name || '');
      setDescription(workflow.description || '');
      setTags(workflow.tags || []);
      setSettings(workflow.settings || {
        executionMode: 'auto',
        maxExecutionTime: 300000,
        retryPolicy: {
          maxRetries: 3,
          backoffMultiplier: 2,
          initialDelayMs: 1000,
        },
        errorHandling: 'stop',
        timezone: 'UTC',
      });
      setHasChanges(false);
      setNewToken(null);
      setShowToken(false);
    }
  }, [workflow, open]);

  const handleSettingChange = <K extends keyof WorkflowSettings>(
    key: K,
    value: WorkflowSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleRetryPolicyChange = <K extends keyof RetryPolicy>(
    key: K,
    value: RetryPolicy[K]
  ) => {
    setSettings((prev) => ({
      ...prev,
      retryPolicy: { ...prev.retryPolicy, [key]: value },
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    if (workflow) {
      updateWorkflowSettings({
        name,
        description,
        tags,
        settings,
      });
      setHasChanges(false);
      setNewToken(null); // Clear new token after saving
    }
  };

  const handleGenerateToken = async () => {
    try {
      const token = generateExecutionToken();
      setNewToken(token);
      setShowToken(true);
      
      // Update settings with hashed token
      const hashedToken = await hashExecutionToken(token);
      const embedSettings: WorkflowEmbedSettings = {
        ...settings.embedSettings,
        allowPublicExecution: true,
        executionToken: hashedToken,
      };
      handleSettingChange('embedSettings', embedSettings);
    } catch (error) {
      console.error('Failed to generate token:', error);
      // Token generation failed, but we can still show the unhashed token
      // The server will hash it when saving
    }
  };

  const handleRemoveToken = () => {
    const embedSettings: WorkflowEmbedSettings = {
      ...settings.embedSettings,
      executionToken: undefined,
    };
    handleSettingChange('embedSettings', embedSettings);
    setNewToken(null);
    setShowToken(false);
  };

  const handleEmbedSettingChange = <K extends keyof WorkflowEmbedSettings>(
    key: K,
    value: WorkflowEmbedSettings[K]
  ) => {
    const embedSettings: WorkflowEmbedSettings = {
      ...(settings.embedSettings || {}),
      [key]: value,
    };
    handleSettingChange('embedSettings', embedSettings);
  };

  const formatTime = (ms: number): string => {
    if (ms < 60000) return `${ms / 1000}s`;
    return `${ms / 60000}m`;
  };

  if (!workflow) return null;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: 420, maxWidth: '100%' },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <Box
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SettingsIcon color="primary" />
            <Typography variant="h6">Workflow Settings</Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant={activeTab === 'settings' ? 'contained' : 'text'}
              onClick={() => setActiveTab('settings')}
              size="small"
            >
              Settings
            </Button>
            <Button
              variant={activeTab === 'embed' ? 'contained' : 'text'}
              onClick={() => setActiveTab('embed')}
              size="small"
              startIcon={<CodeIcon />}
            >
              Embed
            </Button>
          </Box>
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          {activeTab === 'embed' ? (
            <>
              {/* Embed Settings */}
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Public Execution
              </Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.embedSettings?.allowPublicViewing || false}
                    onChange={(e) =>
                      handleEmbedSettingChange('allowPublicViewing', e.target.checked)
                    }
                  />
                }
                label="Allow public viewing (read-only)"
                sx={{ mb: 1 }}
              />
              <Alert severity="info" sx={{ mb: 2 }}>
                When enabled, this workflow can be viewed publicly for documentation purposes. The workflow structure is visible but cannot be executed or edited.
              </Alert>

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.embedSettings?.allowPublicExecution || false}
                    onChange={(e) =>
                      handleEmbedSettingChange('allowPublicExecution', e.target.checked)
                    }
                  />
                }
                label="Allow public execution via slug"
                sx={{ mb: 1 }}
              />
              <Alert severity="warning" sx={{ mb: 2 }}>
                When enabled, this workflow can be executed publicly using its slug without authentication. Use execution tokens for additional security.
              </Alert>

              {/* Execution Token */}
              <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mt: 3 }}>
                Execution Token (Optional)
              </Typography>
              <Alert severity="warning" sx={{ mb: 2 }}>
                Execution tokens provide an additional layer of security. If set, the token must be included in execution requests.
              </Alert>

              {settings.embedSettings?.executionToken && !newToken && (
                <Box sx={{ mb: 2 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Current Token"
                    value={showToken ? 'wf_exec_••••••••••••••••' : 'Token is set (hidden)'}
                    InputProps={{
                      readOnly: true,
                      endAdornment: (
                        <IconButton
                          size="small"
                          onClick={() => setShowToken(!showToken)}
                          sx={{ mr: -1 }}
                        >
                          {showToken ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      ),
                    }}
                    sx={{ mb: 1 }}
                  />
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    onClick={handleRemoveToken}
                  >
                    Remove Token
                  </Button>
                </Box>
              )}

              {newToken && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    New Token Generated
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 1 }}>
                    {newToken}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Copy this token now. It will not be shown again after you save.
                  </Typography>
                </Alert>
              )}

              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={handleGenerateToken}
                sx={{ mb: 3 }}
              >
                {settings.embedSettings?.executionToken ? 'Regenerate Token' : 'Generate Token'}
              </Button>

              {/* Rate Limiting */}
              <Divider sx={{ my: 3 }} />
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Rate Limiting
              </Typography>

              <TextField
                fullWidth
                size="small"
                label="Requests Per Hour"
                type="number"
                value={settings.embedSettings?.rateLimit?.requestsPerHour || ''}
                onChange={(e) => {
                  const value = e.target.value ? parseInt(e.target.value, 10) : undefined;
                  handleEmbedSettingChange('rateLimit', {
                    ...settings.embedSettings?.rateLimit,
                    requestsPerHour: value,
                    requestsPerDay: settings.embedSettings?.rateLimit?.requestsPerDay || value ? (value * 24) : undefined,
                  });
                }}
                helperText="Maximum number of executions per hour (optional)"
                sx={{ mb: 2 }}
              />

              {/* Embed Code Generator */}
              <Divider sx={{ my: 3 }} />
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Embed Code
              </Typography>

              {workflow && (
                <WorkflowEmbedCodeGenerator
                  workflowId={workflow.id}
                  workflowSlug={workflow.slug}
                  workflowName={workflow.name}
                  executionToken={newToken || (settings.embedSettings?.executionToken ? '***' : undefined)}
                />
              )}
            </>
          ) : (
            <>
              {/* General Settings */}
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            General
          </Typography>

          <TextField
            fullWidth
            label="Workflow Name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setHasChanges(true);
            }}
            size="small"
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Description"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setHasChanges(true);
            }}
            size="small"
            multiline
            rows={2}
            sx={{ mb: 2 }}
          />

          <Autocomplete
            multiple
            freeSolo
            options={[]}
            value={tags}
            onChange={(_, newValue) => {
              setTags(newValue);
              setHasChanges(true);
            }}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  variant="outlined"
                  label={option}
                  size="small"
                  {...getTagProps({ index })}
                  key={option}
                />
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label="Tags"
                size="small"
                placeholder="Add tags..."
              />
            )}
            sx={{ mb: 3 }}
          />

          <Divider sx={{ my: 2 }} />

          {/* Execution Settings */}
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Execution
          </Typography>

          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Execution Mode</InputLabel>
            <Select
              value={settings.executionMode}
              label="Execution Mode"
              onChange={(e) => handleSettingChange('executionMode', e.target.value as WorkflowSettings['executionMode'])}
            >
              {EXECUTION_MODES.map((mode) => (
                <MenuItem key={mode.value} value={mode.value}>
                  <Box>
                    <Typography variant="body2">{mode.label}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {mode.description}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              Max Execution Time: {formatTime(settings.maxExecutionTime)}
            </Typography>
            <Slider
              value={settings.maxExecutionTime}
              onChange={(_, value) => handleSettingChange('maxExecutionTime', value as number)}
              min={30000}
              max={600000}
              step={30000}
              marks={[
                { value: 30000, label: '30s' },
                { value: 300000, label: '5m' },
                { value: 600000, label: '10m' },
              ]}
              valueLabelDisplay="auto"
              valueLabelFormat={formatTime}
            />
            <FormHelperText>Maximum time the workflow can run before timeout</FormHelperText>
          </Box>

          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Timezone</InputLabel>
            <Select
              value={settings.timezone}
              label="Timezone"
              onChange={(e) => handleSettingChange('timezone', e.target.value)}
            >
              {COMMON_TIMEZONES.map((tz) => (
                <MenuItem key={tz} value={tz}>
                  {tz}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>Used for scheduled triggers</FormHelperText>
          </FormControl>

          <Divider sx={{ my: 2 }} />

          {/* Error Handling */}
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Error Handling
          </Typography>

          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>On Error</InputLabel>
            <Select
              value={settings.errorHandling}
              label="On Error"
              onChange={(e) => handleSettingChange('errorHandling', e.target.value as WorkflowSettings['errorHandling'])}
            >
              {ERROR_HANDLING_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  <Box>
                    <Typography variant="body2">{opt.label}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {opt.description}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Divider sx={{ my: 2 }} />

          {/* Retry Policy */}
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Retry Policy
          </Typography>

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              Max Retries: {settings.retryPolicy.maxRetries}
            </Typography>
            <Slider
              value={settings.retryPolicy.maxRetries}
              onChange={(_, value) => handleRetryPolicyChange('maxRetries', value as number)}
              min={0}
              max={10}
              step={1}
              marks={[
                { value: 0, label: '0' },
                { value: 3, label: '3' },
                { value: 5, label: '5' },
                { value: 10, label: '10' },
              ]}
              valueLabelDisplay="auto"
            />
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              Initial Delay: {settings.retryPolicy.initialDelayMs / 1000}s
            </Typography>
            <Slider
              value={settings.retryPolicy.initialDelayMs}
              onChange={(_, value) => handleRetryPolicyChange('initialDelayMs', value as number)}
              min={500}
              max={30000}
              step={500}
              marks={[
                { value: 1000, label: '1s' },
                { value: 5000, label: '5s' },
                { value: 30000, label: '30s' },
              ]}
              valueLabelDisplay="auto"
              valueLabelFormat={(v) => `${v / 1000}s`}
            />
            <FormHelperText>Time to wait before first retry</FormHelperText>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              Backoff Multiplier: {settings.retryPolicy.backoffMultiplier}x
            </Typography>
            <Slider
              value={settings.retryPolicy.backoffMultiplier}
              onChange={(_, value) => handleRetryPolicyChange('backoffMultiplier', value as number)}
              min={1}
              max={5}
              step={0.5}
              marks={[
                { value: 1, label: '1x' },
                { value: 2, label: '2x' },
                { value: 5, label: '5x' },
              ]}
              valueLabelDisplay="auto"
              valueLabelFormat={(v) => `${v}x`}
            />
            <FormHelperText>Delay multiplier between retries (exponential backoff)</FormHelperText>
          </Box>

          {/* Stats Display */}
          {workflow.stats && workflow.stats.totalExecutions > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Statistics
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Total Runs
                  </Typography>
                  <Typography variant="h6">{workflow.stats.totalExecutions}</Typography>
                </Box>
                <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Success Rate
                  </Typography>
                  <Typography variant="h6">
                    {workflow.stats.totalExecutions > 0
                      ? `${Math.round((workflow.stats.successfulExecutions / workflow.stats.totalExecutions) * 100)}%`
                      : 'N/A'}
                  </Typography>
                </Box>
                <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Avg Duration
                  </Typography>
                  <Typography variant="h6">
                    {workflow.stats.avgExecutionTimeMs > 0
                      ? formatTime(workflow.stats.avgExecutionTimeMs)
                      : 'N/A'}
                  </Typography>
                </Box>
                <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Failed
                  </Typography>
                  <Typography variant="h6" color="error.main">
                    {workflow.stats.failedExecutions}
                  </Typography>
                </Box>
              </Box>
            </>
          )}
            </>
          )}
        </Box>

        {/* Footer */}
        <Box
          sx={{
            p: 2,
            borderTop: 1,
            borderColor: 'divider',
            display: 'flex',
            gap: 1,
            justifyContent: 'flex-end',
          }}
        >
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={!hasChanges}
          >
            Apply Changes
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
}

export default WorkflowSettingsPanel;
