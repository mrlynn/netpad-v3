/**
 * Node editor for data nodes
 * Handles: transform, filter
 */

'use client';

import React from 'react';
import { Box } from '@mui/material';
import { ConfigField, NodeEditorProps } from './shared/utils';
import { ConfigFieldRenderer } from './shared/ConfigFieldRenderer';

// Config schemas for data nodes
const DATA_CONFIG_SCHEMAS: Record<string, ConfigField[]> = {
  'transform': [
    {
      key: 'expression',
      label: 'Transform Expression',
      type: 'code',
      description: 'JavaScript expression to transform data',
      aiAssist: {
        enabled: true,
        promptHint: 'e.g., "Extract emails from user array" or "Add processed timestamp"',
        buttonLabel: 'Generate Transform',
      },
    },
  ],
  'filter': [
    { key: 'inputField', label: 'Input Array Field', type: 'text', description: 'Path to array to filter (default: "items")' },
    { key: 'conditions', label: 'Filter Conditions', type: 'code', description: 'Array of conditions: [{ "field": "status", "operator": "equals", "value": "active" }]' },
    { key: 'combineWith', label: 'Combine With', type: 'select', options: ['and', 'or'], description: 'How to combine multiple conditions' },
  ],
};

export function DataNodeEditor({
  node,
  config,
  onConfigChange,
  availableForms = [],
  formsLoading = false,
  availableConnections = [],
  connectionsLoading = false,
  nodeId,
}: NodeEditorProps) {
  const configSchema = DATA_CONFIG_SCHEMAS[node.type] || [];

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
