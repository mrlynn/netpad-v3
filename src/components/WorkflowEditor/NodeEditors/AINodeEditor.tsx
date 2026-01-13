/**
 * Node editor for AI nodes
 * Handles: ai-prompt, ai-classify, ai-extract
 */

'use client';

import React from 'react';
import { Box } from '@mui/material';
import { ConfigField, NodeEditorProps } from './shared/utils';
import { ConfigFieldRenderer } from './shared/ConfigFieldRenderer';

// Config schemas for AI nodes
const AI_CONFIG_SCHEMAS: Record<string, ConfigField[]> = {
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
};

export function AINodeEditor({
  node,
  config,
  onConfigChange,
  availableForms = [],
  formsLoading = false,
  availableConnections = [],
  connectionsLoading = false,
  nodeId,
}: NodeEditorProps) {
  const configSchema = AI_CONFIG_SCHEMAS[node.type] || [];

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
