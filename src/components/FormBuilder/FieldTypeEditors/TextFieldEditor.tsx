'use client';

import { Box, TextField, FormControlLabel, Switch, Typography, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { FieldConfig } from '@/types/form';
import { ValidationPatternGenerator } from '../ValidationPatternGenerator';
import { FieldTypeEditorProps, createUpdateValidation } from './shared/utils';

/**
 * Text Field Editor
 * Handles: short-text, long-text, email, url, phone
 */
export function TextFieldEditor({ config, onUpdate }: FieldTypeEditorProps) {
  const updateValidation = createUpdateValidation(config, onUpdate);
  const fieldType = config.type?.toLowerCase();

  // Short text and long text
  if (fieldType === 'short-text' || fieldType === 'long-text' || 
      fieldType === 'text' || fieldType === 'textarea' ||
      fieldType === 'short_text' || fieldType === 'long_text' ||
      fieldType === 'shorttext' || fieldType === 'longtext') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
          Text Settings
        </Typography>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            size="small"
            type="number"
            label="Min Length"
            value={config.validation?.minLength ?? ''}
            onChange={(e) => updateValidation('minLength', e.target.value ? Number(e.target.value) : undefined)}
            inputProps={{ min: 0 }}
            sx={{ flex: 1 }}
          />
          <TextField
            size="small"
            type="number"
            label="Max Length"
            value={config.validation?.maxLength ?? ''}
            onChange={(e) => updateValidation('maxLength', e.target.value ? Number(e.target.value) : undefined)}
            inputProps={{ min: 1 }}
            sx={{ flex: 1 }}
          />
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <TextField
            size="small"
            label="Validation Pattern (Regex)"
            value={config.validation?.pattern ?? ''}
            onChange={(e) => updateValidation('pattern', e.target.value || undefined)}
            placeholder="e.g., ^[A-Z].*"
            helperText="Regular expression to validate input"
            fullWidth
          />
          <ValidationPatternGenerator
            field={config}
            onPatternGenerated={(pattern) => {
              updateValidation('pattern', pattern);
            }}
          />
        </Box>
      </Box>
    );
  }

  // Email
  if (fieldType === 'email') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
          Email Settings
        </Typography>

        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={config.validation?.allowMultipleEmails || false}
              onChange={(e) => updateValidation('allowMultipleEmails', e.target.checked)}
            />
          }
          label={<Typography variant="body2">Allow Multiple Emails</Typography>}
        />

        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={config.validation?.blockDisposable || false}
              onChange={(e) => updateValidation('blockDisposable', e.target.checked)}
            />
          }
          label={<Typography variant="body2">Block Disposable Emails</Typography>}
        />

        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={config.validation?.confirmEmail || false}
              onChange={(e) => updateValidation('confirmEmail', e.target.checked)}
            />
          }
          label={<Typography variant="body2">Require Email Confirmation</Typography>}
        />

        <TextField
          size="small"
          label="Allowed Domains"
          placeholder="gmail.com, company.com"
          value={(config.validation?.allowedDomains || []).join(', ')}
          onChange={(e) => updateValidation('allowedDomains', e.target.value.split(',').map(d => d.trim()).filter(Boolean))}
          helperText="Leave empty to allow all domains"
          fullWidth
        />

        <TextField
          size="small"
          label="Blocked Domains"
          placeholder="spam.com, temp-mail.org"
          value={(config.validation?.blockedDomains || []).join(', ')}
          onChange={(e) => updateValidation('blockedDomains', e.target.value.split(',').map(d => d.trim()).filter(Boolean))}
          helperText="Domains to reject"
          fullWidth
        />
      </Box>
    );
  }

  // URL
  if (fieldType === 'url') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
          URL Settings
        </Typography>

        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={config.validation?.requireHttps || false}
              onChange={(e) => updateValidation('requireHttps', e.target.checked)}
            />
          }
          label={<Typography variant="body2">Require HTTPS</Typography>}
        />

        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={config.validation?.showUrlPreview || false}
              onChange={(e) => updateValidation('showUrlPreview', e.target.checked)}
            />
          }
          label={<Typography variant="body2">Show Link Preview</Typography>}
        />

        <TextField
          size="small"
          label="Allowed Protocols"
          placeholder="https, http, ftp"
          value={(config.validation?.allowedProtocols || ['https', 'http']).join(', ')}
          onChange={(e) => updateValidation('allowedProtocols', e.target.value.split(',').map(p => p.trim()).filter(Boolean))}
          helperText="Comma-separated list of allowed protocols"
          fullWidth
        />
      </Box>
    );
  }

  // Phone
  if (fieldType === 'phone' || fieldType === 'tel' || fieldType === 'telephone') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
          Phone Settings
        </Typography>

        <FormControl fullWidth size="small">
          <InputLabel>Phone Format</InputLabel>
          <Select
            value={config.validation?.phoneFormat || 'national'}
            label="Phone Format"
            onChange={(e) => updateValidation('phoneFormat', e.target.value)}
          >
            <MenuItem value="national">National (555) 123-4567</MenuItem>
            <MenuItem value="international">International +1 555 123 4567</MenuItem>
            <MenuItem value="e164">E.164 (+15551234567)</MenuItem>
          </Select>
        </FormControl>

        <TextField
          size="small"
          label="Default Country"
          placeholder="US"
          value={config.validation?.defaultCountry || ''}
          onChange={(e) => updateValidation('defaultCountry', e.target.value.toUpperCase())}
          helperText="ISO country code (e.g., US, GB, CA)"
          inputProps={{ maxLength: 2 }}
          fullWidth
        />

        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={config.validation?.showCountrySelector !== false}
              onChange={(e) => updateValidation('showCountrySelector', e.target.checked)}
            />
          }
          label={<Typography variant="body2">Show Country Selector</Typography>}
        />

        <TextField
          size="small"
          label="Allowed Countries"
          placeholder="US, CA, GB, AU"
          value={(config.validation?.allowedCountries || []).join(', ')}
          onChange={(e) => updateValidation('allowedCountries', e.target.value.split(',').map(c => c.trim().toUpperCase()).filter(Boolean))}
          helperText="Leave empty to allow all countries"
          fullWidth
        />
      </Box>
    );
  }

  return null;
}
