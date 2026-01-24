/**
 * Node editor for extension-provided workflow nodes
 * Dynamically renders config fields based on the extension's configFields definition
 */

'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  TextField,
  FormControlLabel,
  Switch,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  InputAdornment,
  Alert,
  Chip,
  alpha,
  useTheme,
} from '@mui/material';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import { Extension as ExtensionIcon } from '@mui/icons-material';
import { VariablePickerButton } from '../VariablePicker';
import { NodeEditorProps } from './shared/utils';

/**
 * Extension node config field definition (from extension's configFields)
 * This matches the format from the collaborate extension
 */
interface ExtensionConfigField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'boolean' | 'select';
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  defaultValue?: unknown;
  options?: Array<{ label: string; value: string }>;
}

/**
 * Extension node definition from API
 */
interface ExtensionNodeDefinition {
  type: string;
  label: string;
  description: string;
  category: string;
  color: string;
  icon: string;
  version: string;
  providedBy: string;
  configFields?: ExtensionConfigField[];
}

interface ExtensionNodeEditorProps extends Omit<NodeEditorProps, 'availableForms' | 'formsLoading' | 'availableConnections' | 'connectionsLoading' | 'availableEmailCredentials' | 'emailCredentialsLoading'> {
  // Extension-specific props (optional, can be loaded from API)
  configFields?: ExtensionConfigField[];
}

export function ExtensionNodeEditor({
  node,
  config,
  onConfigChange,
  nodeId,
  configFields: initialConfigFields,
}: ExtensionNodeEditorProps) {
  const theme = useTheme();
  const [configFields, setConfigFields] = useState<ExtensionConfigField[]>(initialConfigFields || []);
  const [loading, setLoading] = useState(!initialConfigFields);
  const [error, setError] = useState<string | null>(null);
  const [extensionInfo, setExtensionInfo] = useState<{ providedBy?: string; version?: string } | null>(null);

  // Fetch extension node definition if configFields not provided
  useEffect(() => {
    if (initialConfigFields) {
      setConfigFields(initialConfigFields);
      setLoading(false);
      return;
    }

    const fetchNodeDefinition = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/ext/workflow-nodes');
        const data = await response.json();

        if (data.success && data.data?.nodes) {
          const nodeDef = data.data.nodes.find((n: ExtensionNodeDefinition) => n.type === node.type);
          if (nodeDef) {
            setConfigFields(nodeDef.configFields || []);
            setExtensionInfo({ providedBy: nodeDef.providedBy, version: nodeDef.version });
          } else {
            setError(`No configuration found for node type: ${node.type}`);
          }
        } else {
          setError('Failed to load extension node configuration');
        }
      } catch (err) {
        console.error('Failed to fetch extension node definition:', err);
        setError('Failed to load extension node configuration');
      } finally {
        setLoading(false);
      }
    };

    fetchNodeDefinition();
  }, [node.type, initialConfigFields]);

  // Render a single config field based on its type
  const renderField = (field: ExtensionConfigField) => {
    const value = config[field.name];

    switch (field.type) {
      case 'text':
        return (
          <Box key={field.name} sx={{ mb: 2 }}>
            <TextField
              fullWidth
              size="small"
              label={field.label}
              value={(value as string) || field.defaultValue || ''}
              onChange={(e) => onConfigChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              helperText={field.helpText}
              required={field.required}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <VariablePickerButton
                      nodeId={nodeId}
                      onInsert={(variable) => {
                        const currentValue = (value as string) || '';
                        onConfigChange(field.name, currentValue + variable);
                      }}
                    />
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        );

      case 'textarea':
        return (
          <Box key={field.name} sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {field.label}
                {field.required && <span style={{ color: theme.palette.error.main }}> *</span>}
              </Typography>
              <VariablePickerButton
                nodeId={nodeId}
                onInsert={(variable) => {
                  const currentValue = (value as string) || '';
                  onConfigChange(field.name, currentValue + variable);
                }}
              />
            </Box>
            <TextField
              fullWidth
              multiline
              rows={4}
              size="small"
              value={(value as string) || field.defaultValue || ''}
              onChange={(e) => onConfigChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              helperText={field.helpText}
              required={field.required}
              sx={{
                '& .MuiInputBase-input': {
                  fontFamily: field.placeholder?.includes('{{') ? 'monospace' : 'inherit',
                  fontSize: '0.85rem',
                },
              }}
            />
          </Box>
        );

      case 'number':
        return (
          <TextField
            key={field.name}
            fullWidth
            size="small"
            label={field.label}
            type="number"
            value={value ?? field.defaultValue ?? ''}
            onChange={(e) => onConfigChange(field.name, e.target.value ? Number(e.target.value) : undefined)}
            placeholder={field.placeholder}
            helperText={field.helpText}
            required={field.required}
            sx={{ mb: 2 }}
          />
        );

      case 'boolean':
        return (
          <FormControlLabel
            key={field.name}
            control={
              <Switch
                checked={Boolean(value ?? field.defaultValue)}
                onChange={(e) => onConfigChange(field.name, e.target.checked)}
              />
            }
            label={
              <Box>
                <Typography variant="body2">{field.label}</Typography>
                {field.helpText && (
                  <Typography variant="caption" color="text.secondary">
                    {field.helpText}
                  </Typography>
                )}
              </Box>
            }
            sx={{ mb: 2, display: 'flex' }}
          />
        );

      case 'select':
        return (
          <FormControl key={field.name} fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>{field.label}</InputLabel>
            <Select
              value={(value as string) || field.defaultValue || ''}
              label={field.label}
              onChange={(e) => onConfigChange(field.name, e.target.value)}
              required={field.required}
            >
              {field.options?.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
            {field.helpText && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, ml: 1.5 }}>
                {field.helpText}
              </Typography>
            )}
          </FormControl>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 3 }}>
        <NetPadLoader size="large" variant="ascii" message="Loading extension configuration..." />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="warning" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (configFields.length === 0) {
    return (
      <Box sx={{ py: 2 }}>
        <Typography variant="body2" color="text.secondary">
          This extension node has no configurable options.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Extension info badge */}
      {extensionInfo && (
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            icon={<ExtensionIcon sx={{ fontSize: 16 }} />}
            label={`${extensionInfo.providedBy} v${extensionInfo.version}`}
            size="small"
            sx={{
              bgcolor: alpha(theme.palette.info.main, 0.1),
              color: theme.palette.info.main,
              '& .MuiChip-icon': {
                color: theme.palette.info.main,
              },
            }}
          />
        </Box>
      )}

      {/* Render all config fields */}
      {configFields.map(renderField)}
    </Box>
  );
}

export default ExtensionNodeEditor;
