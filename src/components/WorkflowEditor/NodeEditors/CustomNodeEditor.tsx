/**
 * Node editor for custom nodes
 * Handles: code
 */

'use client';

import React from 'react';
import { Box } from '@mui/material';
import { ConfigField, NodeEditorProps } from './shared/utils';
import { ConfigFieldRenderer } from './shared/ConfigFieldRenderer';

// Config schemas for custom nodes
const CUSTOM_CONFIG_SCHEMAS: Record<string, ConfigField[]> = {
  'code': [
    {
      key: 'code',
      label: 'JavaScript Code',
      type: 'code',
      description: 'Code to execute. Use "input" for node inputs, "return" to output data.',
      aiAssist: {
        enabled: true,
        promptHint: 'e.g., "Calculate order total from items array"',
        buttonLabel: 'Generate Code',
      },
    },
    { key: 'timeout', label: 'Timeout (ms)', type: 'number', description: 'Max execution time (default: 5000, max: 30000)' },
  ],
};

export function CustomNodeEditor({
  node,
  config,
  onConfigChange,
  availableForms = [],
  formsLoading = false,
  availableConnections = [],
  connectionsLoading = false,
  nodeId,
}: NodeEditorProps) {
  const configSchema = CUSTOM_CONFIG_SCHEMAS[node.type] || [];

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
          nodeType={node.type}
          allConfig={config}
          availableForms={availableForms}
          formsLoading={formsLoading}
          availableConnections={availableConnections}
          connectionsLoading={connectionsLoading}
        />
      ))}
    </Box>
  );
}
