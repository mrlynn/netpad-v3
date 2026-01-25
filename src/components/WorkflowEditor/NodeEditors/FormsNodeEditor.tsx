/**
 * Node editor for form reaction nodes
 * Handles: field-event-trigger, form-field-update
 */

'use client';

import React from 'react';
import { Box, Alert, Typography, TextField, Divider } from '@mui/material';
import { ConfigField, NodeEditorProps } from './shared/utils';
import { ConfigFieldRenderer } from './shared/ConfigFieldRenderer';

// Config schemas for form reaction nodes
const FORMS_CONFIG_SCHEMAS: Record<string, ConfigField[]> = {
  'field-event-trigger': [
    {
      key: 'formId',
      label: 'Form ID',
      type: 'form-select',
      description: 'Optional: The form this trigger watches. Usually set automatically by the reaction system.',
    },
    {
      key: 'triggerMode',
      label: 'Trigger Mode',
      type: 'select',
      options: ['any', 'all'],
      description: '"any" fires when any specified field triggers; "all" requires all fields to have values',
    },
    {
      key: 'debounceMs',
      label: 'Debounce (ms)',
      type: 'number',
      description: 'Delay before executing to prevent rapid firing. Range: 0-30000ms',
    },
  ],
  'form-field-update': [
    {
      key: 'feedbackMode',
      label: 'Feedback Mode',
      type: 'select',
      options: ['silent', 'subtle', 'toast'],
      description: 'How to notify users when fields are updated',
    },
    {
      key: 'validateAfterUpdate',
      label: 'Validate After Update',
      type: 'boolean',
      description: 'Run form validation after applying updates',
    },
  ],
};

// Field update type for the editor
interface FieldUpdateMapping {
  fieldPath: string;
  sourcePath: string;
  nullBehavior?: 'skip' | 'clear' | 'default';
  defaultValue?: unknown;
}

export function FormsNodeEditor({
  node,
  config,
  onConfigChange,
  availableForms = [],
  formsLoading = false,
  availableConnections = [],
  connectionsLoading = false,
  nodeId,
}: NodeEditorProps) {
  const configSchema = FORMS_CONFIG_SCHEMAS[node.type] || [];

  // For form-field-update, we need a special editor for the updates array
  const isFormFieldUpdate = node.type === 'form-field-update';
  const updates = (config.updates as FieldUpdateMapping[]) || [];

  // Handle updates array change
  const handleUpdatesChange = (newUpdates: FieldUpdateMapping[]) => {
    onConfigChange('updates', newUpdates);
  };

  // Add a new update mapping
  const handleAddMapping = () => {
    handleUpdatesChange([
      ...updates,
      {
        fieldPath: '',
        sourcePath: '',
        nullBehavior: 'skip',
      },
    ]);
  };

  // Update a specific mapping
  const handleUpdateMapping = (index: number, field: keyof FieldUpdateMapping, value: unknown) => {
    const newUpdates = [...updates];
    newUpdates[index] = { ...newUpdates[index], [field]: value };
    handleUpdatesChange(newUpdates);
  };

  // Remove a mapping
  const handleRemoveMapping = (index: number) => {
    handleUpdatesChange(updates.filter((_, i) => i !== index));
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Info alert explaining the node's purpose */}
      <Alert severity="info" sx={{ fontSize: '0.85rem' }}>
        {node.type === 'field-event-trigger' ? (
          <>
            <strong>Field Event Trigger</strong> receives data when a form reaction fires.
            The trigger provides form data, the triggering field, and event type to downstream nodes.
          </>
        ) : (
          <>
            <strong>Form Field Update</strong> sends computed values back to form fields.
            Configure mappings below to specify which form fields should receive which workflow data.
          </>
        )}
      </Alert>

      {/* Standard config fields */}
      {configSchema.map((field) => (
        <ConfigFieldRenderer
          key={field.key}
          field={field}
          value={config[field.key]}
          onChange={(value) => onConfigChange(field.key, value)}
          availableForms={availableForms}
          formsLoading={formsLoading}
          availableConnections={availableConnections}
          connectionsLoading={connectionsLoading}
          nodeId={nodeId}
        />
      ))}

      {/* Special editor for form-field-update mappings */}
      {isFormFieldUpdate && (
        <>
          <Divider sx={{ my: 1 }} />
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            Field Update Mappings
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
            Map workflow data to form fields. Use dot notation for nested paths (e.g., &quot;httpRequest.data.company.name&quot;).
          </Typography>

          {updates.length === 0 ? (
            <Alert severity="warning" sx={{ fontSize: '0.85rem' }}>
              No field mappings configured. Add at least one mapping to update form fields.
            </Alert>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {updates.map((mapping, index) => (
                <Box
                  key={index}
                  sx={{
                    p: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    bgcolor: 'background.default',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, flex: 1 }}>
                      Mapping {index + 1}
                    </Typography>
                    <Box
                      component="button"
                      onClick={() => handleRemoveMapping(index)}
                      sx={{
                        border: 'none',
                        background: 'none',
                        color: 'error.main',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        '&:hover': { textDecoration: 'underline' },
                      }}
                    >
                      Remove
                    </Box>
                  </Box>

                  <TextField
                    size="small"
                    fullWidth
                    label="Form Field Path"
                    value={mapping.fieldPath}
                    onChange={(e) => handleUpdateMapping(index, 'fieldPath', e.target.value)}
                    placeholder="e.g., industry"
                    helperText="The form field to update (dot notation for nested)"
                    sx={{ mb: 1.5 }}
                  />

                  <TextField
                    size="small"
                    fullWidth
                    label="Source Data Path"
                    value={mapping.sourcePath}
                    onChange={(e) => handleUpdateMapping(index, 'sourcePath', e.target.value)}
                    placeholder="e.g., httpRequest.data.company.industry"
                    helperText="Path to value in workflow data (use node ID prefix)"
                    sx={{ mb: 1.5 }}
                  />

                  <TextField
                    size="small"
                    fullWidth
                    select
                    label="Null Behavior"
                    value={mapping.nullBehavior || 'skip'}
                    onChange={(e) => handleUpdateMapping(index, 'nullBehavior', e.target.value)}
                    SelectProps={{ native: true }}
                    helperText="What to do if source value is null/undefined"
                  >
                    <option value="skip">Skip - don&apos;t update field</option>
                    <option value="clear">Clear - set field to null</option>
                    <option value="default">Default - use default value</option>
                  </TextField>

                  {mapping.nullBehavior === 'default' && (
                    <TextField
                      size="small"
                      fullWidth
                      label="Default Value"
                      value={String(mapping.defaultValue || '')}
                      onChange={(e) => handleUpdateMapping(index, 'defaultValue', e.target.value)}
                      placeholder="Default value if source is null"
                      sx={{ mt: 1.5 }}
                    />
                  )}
                </Box>
              ))}
            </Box>
          )}

          <Box
            component="button"
            onClick={handleAddMapping}
            sx={{
              mt: 1,
              p: 1.5,
              border: '2px dashed',
              borderColor: 'primary.main',
              borderRadius: 1,
              bgcolor: 'transparent',
              color: 'primary.main',
              cursor: 'pointer',
              textAlign: 'center',
              fontWeight: 500,
              fontSize: '0.875rem',
              '&:hover': {
                bgcolor: 'action.hover',
              },
            }}
          >
            + Add Field Mapping
          </Box>
        </>
      )}

      {/* Tips section */}
      <Box sx={{ mt: 2 }}>
        <Typography variant="caption" color="text.secondary">
          <strong>Tips:</strong>
          <br />
          {node.type === 'field-event-trigger' ? (
            <>
              • The trigger data is available to downstream nodes via{' '}
              <code>{'{{nodes.fieldEventTrigger.formData.fieldName}}'}</code>
              <br />
              • Access the trigger field value directly via{' '}
              <code>{'{{nodes.fieldEventTrigger.fieldValue}}'}</code>
            </>
          ) : (
            <>
              • Reference upstream node outputs using their node ID prefix
              <br />
              • Example: <code>httpRequest.data.result.name</code> for HTTP response data
              <br />
              • Example: <code>fieldEventTrigger.formData.existingField</code> for form values
            </>
          )}
        </Typography>
      </Box>
    </Box>
  );
}
