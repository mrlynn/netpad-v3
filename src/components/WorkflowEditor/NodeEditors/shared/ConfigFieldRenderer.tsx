/**
 * Shared component for rendering config fields
 * Extracted from NodeConfigPanel's renderConfigField function
 */

'use client';

import React from 'react';
import {
  Box,
  TextField,
  FormControlLabel,
  Switch,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  InputAdornment,
  Typography,
  Autocomplete,
  Chip,
  CircularProgress,
  alpha,
  useTheme,
  Button,
} from '@mui/material';
import { OpenInNew as OpenInNewIcon } from '@mui/icons-material';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getOrgProjectUrl } from '@/lib/routing';
import { VariablePickerButton } from '../../VariablePicker';
import { ConfigField, SwitchCase } from './utils';
import { SwitchCasesEditor } from './SwitchCasesEditor';

interface ConfigFieldRendererProps {
  field: ConfigField;
  value: unknown;
  onChange: (key: string, value: unknown) => void;
  nodeId: string;
  availableForms?: Array<{
    id: string;
    name: string;
    slug?: string;
    isPublished?: boolean;
  }>;
  formsLoading?: boolean;
  availableConnections?: Array<{
    vaultId: string;
    name: string;
    database: string;
    status: string;
  }>;
  connectionsLoading?: boolean;
}

export function ConfigFieldRenderer({
  field,
  value,
  onChange,
  nodeId,
  availableForms = [],
  formsLoading = false,
  availableConnections = [],
  connectionsLoading = false,
}: ConfigFieldRendererProps) {
  const theme = useTheme();
  const params = useParams();
  const orgId = params.orgId as string | undefined;
  const projectId = params.projectId as string | undefined;

  // Skip condition field for conditional nodes - they use the visual builder
  if (field.type === 'condition-builder') {
    return null;
  }

  switch (field.type) {
    case 'text':
    case 'password':
      return (
        <TextField
          key={field.key}
          fullWidth
          size="small"
          label={field.label}
          type={field.type === 'password' ? 'password' : 'text'}
          value={(value as string) || ''}
          onChange={(e) => onChange(field.key, e.target.value)}
          helperText={field.description}
          sx={{ mb: 2 }}
          InputProps={{
            endAdornment: field.type !== 'password' && (
              <InputAdornment position="end">
                <VariablePickerButton
                  nodeId={nodeId}
                  onInsert={(variable) => {
                    const currentValue = (value as string) || '';
                    onChange(field.key, currentValue + variable);
                  }}
                />
              </InputAdornment>
            ),
          }}
        />
      );

    case 'number':
      return (
        <TextField
          key={field.key}
          fullWidth
          size="small"
          label={field.label}
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(field.key, e.target.value ? Number(e.target.value) : undefined)}
          helperText={field.description}
          sx={{ mb: 2 }}
        />
      );

    case 'boolean':
      return (
        <FormControlLabel
          key={field.key}
          control={
            <Switch
              checked={Boolean(value)}
              onChange={(e) => onChange(field.key, e.target.checked)}
            />
          }
          label={
            <Box>
              <Typography variant="body2">{field.label}</Typography>
              {field.description && (
                <Typography variant="caption" color="text.secondary">
                  {field.description}
                </Typography>
              )}
            </Box>
          }
          sx={{ mb: 2, display: 'flex' }}
        />
      );

    case 'select':
      return (
        <FormControl key={field.key} fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>{field.label}</InputLabel>
          <Select
            value={(value as string) || ''}
            label={field.label}
            onChange={(e) => onChange(field.key, e.target.value)}
          >
            {field.options?.map((opt) => (
              <MenuItem key={opt} value={opt}>
                {opt}
              </MenuItem>
            ))}
          </Select>
          {field.description && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, ml: 1.5 }}>
              {field.description}
            </Typography>
          )}
        </FormControl>
      );

    case 'form-select':
      const selectedForm = availableForms.find(f => f.id === value || f.slug === value);
      const currentValueIsValidId = typeof value === 'string' && (
        availableForms.some(f => f.id === value || f.slug === value) ||
        /^[a-f0-9]{32}$/.test(value) // UUID-like form ID pattern
      );
      return (
        <Box key={field.key} sx={{ mb: 2 }}>
          <Autocomplete
            options={availableForms}
            loading={formsLoading}
            value={selectedForm || null}
            onChange={(_, newValue) => {
              if (newValue) {
                onChange(field.key, newValue.id);
              } else {
                onChange(field.key, '');
              }
            }}
            getOptionLabel={(option) => option.name}
            isOptionEqualToValue={(option, val) => option.id === val.id}
            renderOption={(props, option) => (
              <Box component="li" {...props} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start !important' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {option.name}
                  </Typography>
                  {option.isPublished && (
                    <Chip
                      label="Published"
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: '0.65rem',
                        bgcolor: alpha(theme.palette.success.main, 0.1),
                        color: theme.palette.success.main,
                      }}
                    />
                  )}
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                  ID: {option.id}
                  {option.slug && ` • Slug: ${option.slug}`}
                </Typography>
              </Box>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                label={field.label}
                size="small"
                helperText={field.description}
                placeholder="Select a form from the dropdown"
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {formsLoading ? <CircularProgress color="inherit" size={18} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
          />
          {typeof value === 'string' && value.length > 0 && (
            <Box sx={{ mt: 1 }}>
              <Box sx={{ p: 1, bgcolor: currentValueIsValidId ? alpha(theme.palette.success.main, 0.1) : alpha(theme.palette.warning.main, 0.1), borderRadius: 1 }}>
                <Typography variant="caption" sx={{ fontFamily: 'monospace', color: currentValueIsValidId ? 'success.main' : 'warning.main' }}>
                  Form ID: {value}
                </Typography>
                {!currentValueIsValidId && (
                  <Typography variant="caption" display="block" color="warning.main" sx={{ mt: 0.5 }}>
                    Warning: This does not look like a valid form ID. Please select a form from the dropdown.
                  </Typography>
                )}
              </Box>
              {orgId && projectId && (
                <Button
                  component={Link}
                  href={`${getOrgProjectUrl(orgId, projectId, 'builder')}?formId=${value}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  size="small"
                  variant="outlined"
                  startIcon={<OpenInNewIcon />}
                  sx={{ mt: 1, width: '100%' }}
                >
                  Open Form
                </Button>
              )}
            </Box>
          )}
        </Box>
      );

    case 'connection-select':
      const selectedConnection = availableConnections.find(c => c.vaultId === value);
      const currentValueIsValidVaultId = typeof value === 'string' && (
        availableConnections.some(c => c.vaultId === value) ||
        /^vault_[a-zA-Z0-9]+$/.test(value)
      );
      return (
        <Box key={field.key} sx={{ mb: 2 }}>
          <Autocomplete
            options={availableConnections}
            loading={connectionsLoading}
            value={selectedConnection || null}
            onChange={(_, newValue) => {
              if (newValue) {
                onChange(field.key, newValue.vaultId);
              } else {
                onChange(field.key, '');
              }
            }}
            getOptionLabel={(option) => option.name}
            isOptionEqualToValue={(option, val) => option.vaultId === val.vaultId}
            renderOption={(props, option) => (
              <Box component="li" {...props} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start !important' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {option.name}
                  </Typography>
                  <Chip
                    label={option.status}
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: '0.65rem',
                      bgcolor: option.status === 'active'
                        ? alpha(theme.palette.success.main, 0.1)
                        : alpha(theme.palette.warning.main, 0.1),
                      color: option.status === 'active'
                        ? theme.palette.success.main
                        : theme.palette.warning.main,
                    }}
                  />
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                  Database: {option.database}
                </Typography>
              </Box>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                label={field.label}
                size="small"
                helperText={field.description}
                placeholder="Select a connection from the vault"
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {connectionsLoading ? <CircularProgress color="inherit" size={18} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
          />
          {typeof value === 'string' && value.length > 0 && (
            <Box sx={{ mt: 1, p: 1, bgcolor: currentValueIsValidVaultId ? alpha(theme.palette.success.main, 0.1) : alpha(theme.palette.warning.main, 0.1), borderRadius: 1 }}>
              <Typography variant="caption" sx={{ fontFamily: 'monospace', color: currentValueIsValidVaultId ? 'success.main' : 'warning.main' }}>
                Vault ID: {value}
              </Typography>
              {!currentValueIsValidVaultId && (
                <Typography variant="caption" display="block" color="warning.main" sx={{ mt: 0.5 }}>
                  Warning: This does not look like a valid vault ID. Please select a connection from the dropdown.
                </Typography>
              )}
            </Box>
          )}
        </Box>
      );

    case 'code':
      return (
        <Box key={field.key} sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {field.label}
            </Typography>
            <VariablePickerButton
              nodeId={nodeId}
              onInsert={(variable) => {
                const currentValue = typeof value === 'string' ? value : JSON.stringify(value, null, 2) || '';
                onChange(field.key, currentValue + variable);
              }}
            />
          </Box>
          <TextField
            fullWidth
            multiline
            rows={4}
            size="small"
            value={typeof value === 'string' ? value : JSON.stringify(value, null, 2) || ''}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                onChange(field.key, parsed);
              } catch {
                onChange(field.key, e.target.value);
              }
            }}
            helperText={field.description}
            placeholder="Use {{nodes.nodeId.field}} to reference data from other nodes"
            sx={{
              '& .MuiInputBase-input': {
                fontFamily: 'monospace',
                fontSize: '0.85rem',
              },
            }}
          />
        </Box>
      );

    case 'switch-cases':
      return (
        <SwitchCasesEditor
          key={field.key}
          cases={(value as SwitchCase[]) || []}
          onChange={(newCases) => onChange(field.key, newCases)}
        />
      );

    default:
      return null;
  }
}
