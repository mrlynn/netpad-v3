/**
 * Node editor for action nodes
 * Handles: email-send, notification
 */

'use client';

import React from 'react';
import { Box } from '@mui/material';
import { ConfigField, NodeEditorProps } from './shared/utils';
import { ConfigFieldRenderer } from './shared/ConfigFieldRenderer';

// Config schemas for action nodes
const ACTION_CONFIG_SCHEMAS: Record<string, ConfigField[]> = {
  'email-send': [
    { key: 'to', label: 'To', type: 'text', description: 'Recipient email (use {{nodes.formTrigger.data.email}} for form field)' },
    { key: 'subject', label: 'Subject', type: 'text', description: 'Email subject (supports {{variables}})' },
    { key: 'body', label: 'Body', type: 'code', description: 'Email body (HTML supported, use {{variables}})' },
    { key: 'from', label: 'From', type: 'text', description: 'Sender email address' },
  ],
  'notification': [
    // Notification node config - if it exists, add fields here
    // Currently notification may not have config fields defined
  ],
};

export function ActionNodeEditor({
  node,
  config,
  onConfigChange,
  availableForms = [],
  formsLoading = false,
  availableConnections = [],
  connectionsLoading = false,
  nodeId,
}: NodeEditorProps) {
  const configSchema = ACTION_CONFIG_SCHEMAS[node.type] || [];

  if (configSchema.length === 0) {
    return null;
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
