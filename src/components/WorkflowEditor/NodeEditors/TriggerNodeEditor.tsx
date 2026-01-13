/**
 * Node editor for trigger nodes
 * Handles: manual-trigger, form-trigger, webhook-trigger, schedule-trigger
 */

'use client';

import React from 'react';
import { Box } from '@mui/material';
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

export function TriggerNodeEditor({
  node,
  config,
  onConfigChange,
  availableForms = [],
  formsLoading = false,
  availableConnections = [],
  connectionsLoading = false,
  nodeId,
}: NodeEditorProps) {
  const configSchema = TRIGGER_CONFIG_SCHEMAS[node.type] || [];

  if (configSchema.length === 0) {
    return null; // manual-trigger has no config
  }

  return (
    <Box>
      {configSchema.map((field) => (
        <ConfigFieldRenderer
          key={field.key}
          field={field}
          value={config[field.key]}
          onChange={onConfigChange}
          nodeId={nodeId}
          availableForms={availableForms}
          formsLoading={formsLoading}
          availableConnections={availableConnections}
          connectionsLoading={connectionsLoading}
        />
      ))}
    </Box>
  );
}
