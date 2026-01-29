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
  alpha,
  useTheme,
  Button,
} from '@mui/material';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import { OpenInNew as OpenInNewIcon } from '@mui/icons-material';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getOrgProjectUrl } from '@/lib/routing';
import { VariablePickerButton } from '../../VariablePicker';
import { ConfigField, SwitchCase, EmailCredentialOption } from './utils';
import { SwitchCasesEditor } from './SwitchCasesEditor';
import { Email as EmailIcon, Send as SendIcon } from '@mui/icons-material';
import { MongoQueryBuilder, QueryOptionsBuilder, AggregationBuilder } from '../../QueryBuilder';
import { AIConfigAssistant } from '../../shared/AIConfigAssistant';

interface ConfigFieldRendererProps {
  field: ConfigField;
  value: unknown;
  onChange: (key: string, value: unknown) => void;
  nodeId: string;
  /** Node type for AI assistance context */
  nodeType?: string;
  /** Full config object for AI assistance context */
  allConfig?: Record<string, unknown>;
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
  availableEmailCredentials?: EmailCredentialOption[];
  emailCredentialsLoading?: boolean;
}

export function ConfigFieldRenderer({
  field,
  value,
  onChange,
  nodeId,
  nodeType,
  allConfig = {},
  availableForms = [],
  formsLoading = false,
  availableConnections = [],
  connectionsLoading = false,
  availableEmailCredentials = [],
  emailCredentialsLoading = false,
}: ConfigFieldRendererProps) {
  const theme = useTheme();
  const params = useParams();
  const orgId = params.orgId as string | undefined;
  const projectId = params.projectId as string | undefined;

  // Skip condition field for conditional nodes - they use the visual builder
  if (field.type === 'condition-builder') {
    return null;
  }

  // Helper to render AI assistant if enabled for this field
  const renderAIAssistant = () => {
    if (!field.aiAssist?.enabled || !nodeType) return null;
    return (
      <AIConfigAssistant
        nodeId={nodeId}
        nodeType={nodeType}
        fieldKey={field.key}
        currentConfig={allConfig}
        currentFieldValue={value}
        onApply={(newValue) => onChange(field.key, newValue)}
        promptHint={field.aiAssist.promptHint}
        buttonLabel={field.aiAssist.buttonLabel}
      />
    );
  };

  switch (field.type) {
    case 'text':
    case 'password':
      return (
        <Box key={field.key} sx={{ mb: 2 }}>
          {renderAIAssistant()}
          <TextField
            fullWidth
            size="small"
            label={field.label}
            type={field.type === 'password' ? 'password' : 'text'}
            value={(value as string) || ''}
            onChange={(e) => onChange(field.key, e.target.value)}
            helperText={field.description}
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
        </Box>
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
                      {formsLoading ? <NetPadLoader size="small" variant="svg" showPhrases={false} /> : null}
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
                      {connectionsLoading ? <NetPadLoader size="small" variant="svg" showPhrases={false} /> : null}
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
          {renderAIAssistant()}
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
            placeholder="Use {{nodes.<referenceId>.field}} — see Node references in config or use the variable picker"
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

    case 'mongodb-query-builder':
      return (
        <MongoQueryBuilder
          key={field.key}
          value={value as Record<string, unknown> | string | undefined}
          onChange={(newValue) => onChange(field.key, newValue)}
          nodeId={nodeId}
          showPreview={true}
          label={field.label}
          description={field.description}
        />
      );

    case 'mongodb-options-builder':
      return (
        <QueryOptionsBuilder
          key={field.key}
          value={value as Record<string, unknown> | string | undefined}
          onChange={(newValue) => onChange(field.key, newValue)}
          label={field.label}
          description={field.description}
        />
      );

    case 'mongodb-pipeline-builder':
      return (
        <AggregationBuilder
          key={field.key}
          value={value as Record<string, unknown>[] | string | undefined}
          onChange={(newValue) => onChange(field.key, newValue)}
          nodeId={nodeId}
          showPreview={true}
          label={field.label}
          description={field.description}
        />
      );

    case 'email-credential-select':
      const selectedEmailCred = availableEmailCredentials.find(c => c.credentialId === value);
      const currentValueIsValidCredId = typeof value === 'string' && (
        availableEmailCredentials.some(c => c.credentialId === value) ||
        /^intcred_[a-zA-Z0-9]+$/.test(value)
      );
      return (
        <Box key={field.key} sx={{ mb: 2 }}>
          <Autocomplete
            options={availableEmailCredentials}
            loading={emailCredentialsLoading}
            value={selectedEmailCred || null}
            onChange={(_, newValue) => {
              if (newValue) {
                onChange(field.key, newValue.credentialId);
              } else {
                onChange(field.key, '');
              }
            }}
            getOptionLabel={(option) => option.name}
            isOptionEqualToValue={(option, val) => option.credentialId === val.credentialId}
            renderOption={(props, option) => (
              <Box component="li" {...props} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start !important' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                  {option.provider === 'sendgrid' ? (
                    <SendIcon sx={{ fontSize: 16, color: '#1A82E2' }} />
                  ) : (
                    <EmailIcon sx={{ fontSize: 16, color: '#EA4335' }} />
                  )}
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {option.name}
                  </Typography>
                  <Chip
                    label={option.provider.toUpperCase()}
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: '0.65rem',
                      bgcolor: option.provider === 'sendgrid'
                        ? alpha('#1A82E2', 0.1)
                        : alpha('#EA4335', 0.1),
                      color: option.provider === 'sendgrid' ? '#1A82E2' : '#EA4335',
                    }}
                  />
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
                {option.fromEmail && (
                  <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', ml: 3 }}>
                    From: {option.fromEmail}
                  </Typography>
                )}
              </Box>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                label={field.label}
                size="small"
                helperText={field.description}
                placeholder="Select an email credential"
                error={field.required && !value}
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {emailCredentialsLoading ? <NetPadLoader size="small" variant="svg" showPhrases={false} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
            noOptionsText={
              <Box sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  No email credentials configured
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Add SMTP or SendGrid credentials in Settings → Integrations
                </Typography>
              </Box>
            }
          />
          {typeof value === 'string' && value.length > 0 && (
            <Box sx={{ mt: 1, p: 1, bgcolor: currentValueIsValidCredId ? alpha(theme.palette.success.main, 0.1) : alpha(theme.palette.warning.main, 0.1), borderRadius: 1 }}>
              <Typography variant="caption" sx={{ fontFamily: 'monospace', color: currentValueIsValidCredId ? 'success.main' : 'warning.main' }}>
                Credential ID: {value}
              </Typography>
              {!currentValueIsValidCredId && (
                <Typography variant="caption" display="block" color="warning.main" sx={{ mt: 0.5 }}>
                  Warning: This does not look like a valid credential ID. Please select a credential from the dropdown.
                </Typography>
              )}
            </Box>
          )}
          {availableEmailCredentials.length === 0 && !emailCredentialsLoading && (
            <Box sx={{ mt: 1, p: 1.5, bgcolor: alpha(theme.palette.warning.main, 0.1), borderRadius: 1 }}>
              <Typography variant="body2" color="warning.main" sx={{ fontWeight: 500 }}>
                No email credentials found
              </Typography>
              <Typography variant="caption" color="text.secondary" component="div">
                To send emails, add an SMTP or SendGrid credential in{' '}
                {orgId ? (
                  <Link
                    href={`/settings?tab=integrations`}
                    target="_blank"
                    style={{ color: 'inherit', textDecoration: 'underline' }}
                  >
                    Settings → Integrations
                  </Link>
                ) : (
                  'Settings → Integrations'
                )}
                .
              </Typography>
            </Box>
          )}
        </Box>
      );

    default:
      return null;
  }
}
