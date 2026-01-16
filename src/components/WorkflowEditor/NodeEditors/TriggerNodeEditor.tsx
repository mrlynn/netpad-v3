/**
 * Node editor for trigger nodes
 * Handles: manual-trigger, form-trigger, webhook-trigger, schedule-trigger
 */

'use client';

import React from 'react';
import { Box, Button, Divider, Typography, alpha } from '@mui/material';
import { Science as TestIcon } from '@mui/icons-material';
import { ConfigField, NodeEditorProps } from './shared/utils';
import { ConfigFieldRenderer } from './shared/ConfigFieldRenderer';

// Config schemas for trigger nodes
const TRIGGER_CONFIG_SCHEMAS: Record<string, ConfigField[]> = {
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
};

interface TriggerNodeEditorProps extends NodeEditorProps {
  onTestClick?: () => void;
}

export function TriggerNodeEditor({
  node,
  config,
  onConfigChange,
  availableForms = [],
  formsLoading = false,
  availableConnections = [],
  connectionsLoading = false,
  nodeId,
  onTestClick,
}: TriggerNodeEditorProps) {
  const configSchema = TRIGGER_CONFIG_SCHEMAS[node.type] || [];

  // Check if trigger can be tested
  const canTestFormTrigger = node.type === 'form-trigger' && Boolean(config.formId);
  const canTestWebhookTrigger = node.type === 'webhook-trigger';
  const canTestManualTrigger = node.type === 'manual-trigger';
  const canTest = canTestFormTrigger || canTestWebhookTrigger || canTestManualTrigger;

  // Get test button label based on trigger type
  const getTestLabel = () => {
    if (node.type === 'form-trigger') return 'Test with Form';
    if (node.type === 'webhook-trigger') return 'Test Webhook';
    if (node.type === 'manual-trigger') return 'Run Test';
    return 'Test';
  };

  return (
    <Box>
      {configSchema.map((field) => (
        <ConfigFieldRenderer
          key={field.key}
          field={field}
          value={config[field.key]}
          onChange={onConfigChange}
          nodeId={nodeId}
          nodeType={node.type}
          allConfig={config}
          availableForms={availableForms}
          formsLoading={formsLoading}
          availableConnections={availableConnections}
          connectionsLoading={connectionsLoading}
        />
      ))}

      {/* Test button for testable triggers */}
      {canTest && onTestClick && (
        <Box sx={{ mt: 2 }}>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Test this trigger with sample data
          </Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<TestIcon />}
            onClick={onTestClick}
            fullWidth
            sx={{
              borderColor: alpha('#00ED64', 0.5),
              color: '#00ED64',
              '&:hover': {
                borderColor: '#00ED64',
                bgcolor: alpha('#00ED64', 0.08),
              },
            }}
          >
            {getTestLabel()}
          </Button>
        </Box>
      )}

      {/* Manual trigger info */}
      {node.type === 'manual-trigger' && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Manual triggers have no configuration. Use the &quot;Test&quot; button in the toolbar to run the workflow.
          </Typography>
        </Box>
      )}
    </Box>
  );
}
