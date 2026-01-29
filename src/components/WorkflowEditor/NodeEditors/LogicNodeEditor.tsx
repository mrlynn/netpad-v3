/**
 * Node editor for logic nodes
 * Handles: conditional, switch, loop, delay
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Box, TextField, ToggleButtonGroup, ToggleButton } from '@mui/material';
import { ConfigField, NodeEditorProps } from './shared/utils';
import { ConfigFieldRenderer } from './shared/ConfigFieldRenderer';
import { ConditionBuilder, ConditionGroup, conditionGroupToExpression } from '../Panels/ConditionBuilder';

// Config schemas for logic nodes (excluding conditional which has special handling)
const LOGIC_CONFIG_SCHEMAS: Record<string, ConfigField[]> = {
  'switch': [
    { key: 'field', label: 'Field to Match', type: 'text', description: 'Data path to evaluate (e.g., "status", "user.role")' },
    { key: 'matchMode', label: 'Match Mode', type: 'select', options: ['exact', 'contains', 'regex', 'range'], description: 'How to compare values' },
    { key: 'cases', label: 'Cases', type: 'switch-cases', description: 'Define case values and their output branches' },
  ],
  'loop': [
    { key: 'iterateOver', label: 'Iterate Over', type: 'text', description: 'Path to array to iterate (e.g., nodes.<nodeId>.data.items — use upstream node reference ID)' },
    { key: 'itemVariable', label: 'Item Variable Name', type: 'text', description: 'Variable name for current item (default: "item")' },
  ],
  'delay': [
    { key: 'duration', label: 'Duration (ms)', type: 'number', description: 'Wait time in milliseconds' },
    { key: 'until', label: 'Wait Until', type: 'text', description: 'ISO date string to wait until (alternative to duration)' },
  ],
};

// Helper to create default condition group
function createDefaultConditionGroup(): ConditionGroup {
  return {
    id: Math.random().toString(36).substring(2, 10),
    logic: 'and',
    conditions: [],
  };
}

interface LogicNodeEditorProps extends NodeEditorProps {
  availableFields?: Array<{ path: string; label: string; type: string }>;
}

export function LogicNodeEditor({
  node,
  config,
  onConfigChange,
  availableForms = [],
  formsLoading = false,
  availableConnections = [],
  connectionsLoading = false,
  nodeId,
  availableFields = [],
}: LogicNodeEditorProps) {
  // Conditional node state
  const [conditionTab, setConditionTab] = useState<'visual' | 'code'>('visual');
  const [conditionGroup, setConditionGroup] = useState<ConditionGroup>(createDefaultConditionGroup());

  // Initialize condition group from config for conditional nodes
  useEffect(() => {
    if (node.type === 'conditional') {
      if (config.conditionGroup) {
        setConditionGroup(config.conditionGroup as ConditionGroup);
      } else {
        setConditionGroup(createDefaultConditionGroup());
      }
    }
  }, [node.type, config.conditionGroup]);

  // Handle conditional node config changes
  const handleConditionalConfigChange = (key: string, value: unknown) => {
    if (key === 'condition' && conditionTab === 'code') {
      // Direct code edit
      onConfigChange(key, value);
    } else if (key === 'includeElse') {
      // Boolean toggle
      onConfigChange(key, value);
    }
  };

  // Update condition group and sync to config
  const handleConditionGroupChange = (newGroup: ConditionGroup) => {
    setConditionGroup(newGroup);
    const expression = conditionGroupToExpression(newGroup);
    onConfigChange('conditionGroup', newGroup);
    onConfigChange('condition', expression);
  };

  // Handle conditional node - special UI with ConditionBuilder
  if (node.type === 'conditional') {
    return (
      <Box>
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
            onChange={handleConditionGroupChange}
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
            onChange={(e) => handleConditionalConfigChange('condition', e.target.value)}
            helperText="JavaScript expression that returns true/false"
            sx={{
              '& .MuiInputBase-input': {
                fontFamily: 'monospace',
                fontSize: '0.85rem',
              },
            }}
          />
        )}
      </Box>
    );
  }

  // Handle other logic nodes (switch, loop, delay) using standard field rendering
  const configSchema = LOGIC_CONFIG_SCHEMAS[node.type] || [];

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
