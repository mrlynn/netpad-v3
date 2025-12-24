'use client';

/**
 * SchemaAwareDocumentEditor
 *
 * Form-based document editor that uses form schema when available.
 * Features:
 * - Uses form field configs for proper input types
 * - Handles encrypted fields: hidden by default with eye icon to reveal
 * - Re-encrypts fields on save when editing encrypted data
 * - Falls back to raw JSON for fields not in schema
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Drawer,
  Typography,
  TextField,
  Button,
  IconButton,
  Alert,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  Switch,
  InputAdornment,
  Chip,
  alpha,
  Skeleton,
  Tooltip,
  Collapse,
} from '@mui/material';
import {
  Close,
  Check,
  Visibility,
  VisibilityOff,
  Lock,
  LockOpen,
  ExpandMore,
  ExpandLess,
  Code,
} from '@mui/icons-material';

interface FieldConfig {
  path: string;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string;
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    options?: Array<string | { value: any; label: string }>;
    [key: string]: any;
  };
  encryption?: {
    enabled: boolean;
    algorithm: string;
    queryType: string;
    sensitivityLevel: string;
  };
}

interface FormSchema {
  id?: string;
  name: string;
  collection: string;
  database: string;
  fieldConfigs: FieldConfig[];
  collectionEncryption?: any;
  dataSource?: any;
}

interface Document {
  _id: string;
  [key: string]: any;
}

interface SchemaAwareDocumentEditorProps {
  open: boolean;
  document: Document | null;
  database: string;
  collection: string;
  connectionString: string;
  organizationId?: string;
  vaultId?: string;
  onClose: () => void;
  onSave: (updatedDoc: Record<string, unknown>, encryptedFields?: string[]) => Promise<void>;
  saving: boolean;
  error: string | null;
}

// Get nested value from object using dot notation
function getNestedValue(obj: Record<string, any>, path: string): any {
  const keys = path.split('.');
  let current = obj;
  for (const key of keys) {
    if (current === null || current === undefined) return undefined;
    current = current[key];
  }
  return current;
}

// Set nested value in object using dot notation
function setNestedValue(obj: Record<string, any>, path: string, value: any): void {
  const keys = path.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  current[keys[keys.length - 1]] = value;
}

// Field Renderer Component
function FieldEditor({
  field,
  value,
  onChange,
  disabled,
  revealedEncrypted,
  onToggleReveal,
  isDecrypting,
}: {
  field: FieldConfig;
  value: any;
  onChange: (value: any) => void;
  disabled: boolean;
  revealedEncrypted: boolean;
  onToggleReveal: () => void;
  isDecrypting?: boolean;
}) {
  const isEncrypted = field.encryption?.enabled;
  const isHidden = isEncrypted && !revealedEncrypted;

  // Common input props for encrypted fields
  const encryptedAdornment = isEncrypted ? (
    <InputAdornment position="end">
      <Tooltip title={revealedEncrypted ? 'Hide encrypted value' : 'Click to decrypt and reveal'}>
        <IconButton
          onClick={onToggleReveal}
          edge="end"
          size="small"
          disabled={isDecrypting}
          sx={{ color: isHidden ? 'warning.main' : 'text.secondary' }}
        >
          {isDecrypting ? (
            <CircularProgress size={16} color="warning" />
          ) : revealedEncrypted ? (
            <VisibilityOff fontSize="small" />
          ) : (
            <Visibility fontSize="small" />
          )}
        </IconButton>
      </Tooltip>
    </InputAdornment>
  ) : undefined;

  // Render based on field type
  switch (field.type) {
    case 'boolean':
    case 'yes_no':
    case 'checkbox':
      return (
        <FormControlLabel
          control={
            <Switch
              checked={Boolean(value)}
              onChange={(e) => onChange(e.target.checked)}
              disabled={disabled || isHidden}
            />
          }
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {field.label}
              {isEncrypted && (
                <Chip
                  icon={<Lock sx={{ fontSize: 12 }} />}
                  label="Encrypted"
                  size="small"
                  sx={{ height: 18, fontSize: 10 }}
                  color="warning"
                />
              )}
            </Box>
          }
        />
      );

    case 'select':
    case 'radio':
    case 'dropdown':
      const options = field.validation?.options || [];
      return (
        <FormControl fullWidth size="small">
          <InputLabel>{field.label}</InputLabel>
          <Select
            value={isHidden ? '' : (value || '')}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled || isHidden}
            label={field.label}
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {options.map((opt, idx) => {
              const optValue = typeof opt === 'string' ? opt : opt.value;
              const optLabel = typeof opt === 'string' ? opt : opt.label;
              return (
                <MenuItem key={idx} value={optValue}>
                  {optLabel}
                </MenuItem>
              );
            })}
          </Select>
          {isEncrypted && isHidden && (
            <Typography variant="caption" sx={{ mt: 0.5, color: 'warning.main', display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Lock sx={{ fontSize: 12 }} /> Click eye icon to reveal
            </Typography>
          )}
        </FormControl>
      );

    case 'number':
    case 'integer':
    case 'decimal':
    case 'currency':
    case 'rating':
    case 'scale':
      return (
        <TextField
          fullWidth
          size="small"
          type="number"
          label={
            <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {field.label}
              {isEncrypted && <Lock sx={{ fontSize: 12, color: 'warning.main' }} />}
            </Box>
          }
          value={isHidden ? '' : (value ?? '')}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
          disabled={disabled || isHidden}
          placeholder={isHidden ? '********' : field.placeholder}
          InputProps={{
            endAdornment: encryptedAdornment,
            inputProps: {
              min: field.validation?.min,
              max: field.validation?.max,
            },
          }}
        />
      );

    case 'date':
      return (
        <TextField
          fullWidth
          size="small"
          type="date"
          label={
            <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {field.label}
              {isEncrypted && <Lock sx={{ fontSize: 12, color: 'warning.main' }} />}
            </Box>
          }
          value={isHidden ? '' : (value ? new Date(value).toISOString().split('T')[0] : '')}
          onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : null)}
          disabled={disabled || isHidden}
          InputLabelProps={{ shrink: true }}
          InputProps={{ endAdornment: encryptedAdornment }}
        />
      );

    case 'datetime':
      return (
        <TextField
          fullWidth
          size="small"
          type="datetime-local"
          label={
            <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {field.label}
              {isEncrypted && <Lock sx={{ fontSize: 12, color: 'warning.main' }} />}
            </Box>
          }
          value={isHidden ? '' : (value ? new Date(value).toISOString().slice(0, 16) : '')}
          onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : null)}
          disabled={disabled || isHidden}
          InputLabelProps={{ shrink: true }}
          InputProps={{ endAdornment: encryptedAdornment }}
        />
      );

    case 'email':
      return (
        <TextField
          fullWidth
          size="small"
          type="email"
          label={
            <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {field.label}
              {isEncrypted && <Lock sx={{ fontSize: 12, color: 'warning.main' }} />}
            </Box>
          }
          value={isHidden ? '' : (value || '')}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || isHidden}
          placeholder={isHidden ? '********' : field.placeholder}
          InputProps={{ endAdornment: encryptedAdornment }}
        />
      );

    case 'long_text':
    case 'textarea':
      return (
        <TextField
          fullWidth
          size="small"
          multiline
          rows={4}
          label={
            <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {field.label}
              {isEncrypted && <Lock sx={{ fontSize: 12, color: 'warning.main' }} />}
            </Box>
          }
          value={isHidden ? '' : (value || '')}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || isHidden}
          placeholder={isHidden ? '********' : field.placeholder}
          InputProps={{ endAdornment: encryptedAdornment }}
        />
      );

    case 'phone':
    case 'url':
    case 'string':
    case 'short_text':
    default:
      return (
        <TextField
          fullWidth
          size="small"
          type={field.type === 'phone' ? 'tel' : field.type === 'url' ? 'url' : 'text'}
          label={
            <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {field.label}
              {isEncrypted && <Lock sx={{ fontSize: 12, color: 'warning.main' }} />}
            </Box>
          }
          value={isHidden ? '' : (value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || isHidden}
          placeholder={isHidden ? '********' : field.placeholder}
          InputProps={{ endAdornment: encryptedAdornment }}
          inputProps={{
            minLength: field.validation?.minLength,
            maxLength: field.validation?.maxLength,
          }}
        />
      );
  }
}

export function SchemaAwareDocumentEditor({
  open,
  document,
  database,
  collection,
  connectionString,
  organizationId,
  vaultId,
  onClose,
  onSave,
  saving,
  error,
}: SchemaAwareDocumentEditorProps) {
  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [decryptedData, setDecryptedData] = useState<Record<string, any>>({});
  const [revealedFields, setRevealedFields] = useState<Set<string>>(new Set());
  const [decryptingFields, setDecryptingFields] = useState<Set<string>>(new Set());
  const [showExtraFields, setShowExtraFields] = useState(false);
  const [extraFieldsJson, setExtraFieldsJson] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [encryptedFieldPaths, setEncryptedFieldPaths] = useState<string[]>([]);

  // Fetch schema when dialog opens
  useEffect(() => {
    if (open && database && collection) {
      fetchSchema();
    }
  }, [open, database, collection]);

  // Initialize form data when document changes
  useEffect(() => {
    if (document) {
      const { _id, ...editableFields } = document;
      setFormData(editableFields);
      setRevealedFields(new Set());
      setDecryptedData({});
      setDecryptingFields(new Set());

      // Find fields in document that aren't in schema
      if (schema) {
        const schemaFieldPaths = new Set(schema.fieldConfigs.map(f => f.path));
        const extraFields: Record<string, any> = {};

        for (const [key, value] of Object.entries(editableFields)) {
          if (!schemaFieldPaths.has(key)) {
            extraFields[key] = value;
          }
        }

        if (Object.keys(extraFields).length > 0) {
          setExtraFieldsJson(JSON.stringify(extraFields, null, 2));
        } else {
          setExtraFieldsJson('');
        }
      }
    }
  }, [document, schema]);

  const fetchSchema = async () => {
    setSchemaLoading(true);
    setSchemaError(null);

    try {
      const params = new URLSearchParams({
        collection,
        database,
      });
      if (organizationId) {
        params.set('organizationId', organizationId);
      }

      const response = await fetch(`/api/forms/by-collection?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load form schema');
      }

      setSchema(data.form);
      // Store encrypted field paths for decryption
      if (data.encryptedFieldPaths) {
        setEncryptedFieldPaths(data.encryptedFieldPaths);
      }
    } catch (err) {
      console.error('Schema fetch error:', err);
      setSchemaError(err instanceof Error ? err.message : 'Failed to load schema');
    } finally {
      setSchemaLoading(false);
    }
  };

  // Fetch decrypted document when user wants to reveal encrypted fields
  const fetchDecryptedDocument = useCallback(async () => {
    if (!document || !connectionString || encryptedFieldPaths.length === 0) return;

    try {
      const params = new URLSearchParams({
        connectionString,
        databaseName: database,
        collection,
        documentId: String(document._id),
        encryptedFieldPaths: JSON.stringify(encryptedFieldPaths),
      });

      // Add organizationId for vault connection resolution
      if (organizationId) {
        params.set('organizationId', organizationId);
      }

      const response = await fetch(`/api/mongodb/document?${params}`);
      const data = await response.json();

      if (response.ok && data.document) {
        // Extract decrypted values for encrypted fields
        const decrypted: Record<string, any> = {};
        for (const path of encryptedFieldPaths) {
          const value = getNestedValue(data.document, path);
          if (value !== undefined) {
            decrypted[path] = value;
          }
        }
        setDecryptedData(decrypted);

        // Update form data with decrypted values
        setFormData(prev => {
          const updated = { ...prev };
          for (const [path, value] of Object.entries(decrypted)) {
            setNestedValue(updated, path, value);
          }
          return updated;
        });
      }
    } catch (err) {
      console.error('Failed to fetch decrypted document:', err);
    }
  }, [document, connectionString, database, collection, encryptedFieldPaths, organizationId]);

  const handleFieldChange = useCallback((path: string, value: any) => {
    setFormData(prev => {
      const updated = { ...prev };
      setNestedValue(updated, path, value);
      return updated;
    });
  }, []);

  const toggleRevealField = useCallback(async (path: string) => {
    const isRevealing = !revealedFields.has(path);

    if (isRevealing && !decryptedData[path]) {
      // Need to fetch decrypted value first
      setDecryptingFields(prev => new Set(prev).add(path));

      try {
        // Fetch decrypted document if we haven't already
        if (Object.keys(decryptedData).length === 0) {
          await fetchDecryptedDocument();
        }
      } finally {
        setDecryptingFields(prev => {
          const updated = new Set(prev);
          updated.delete(path);
          return updated;
        });
      }
    }

    setRevealedFields(prev => {
      const updated = new Set(prev);
      if (updated.has(path)) {
        updated.delete(path);
      } else {
        updated.add(path);
      }
      return updated;
    });
  }, [revealedFields, decryptedData, fetchDecryptedDocument]);

  const handleSave = async () => {
    let finalDoc = { ...formData };

    // Parse and merge extra fields if present
    if (extraFieldsJson.trim()) {
      try {
        const extraFields = JSON.parse(extraFieldsJson);
        finalDoc = { ...finalDoc, ...extraFields };
      } catch (e) {
        setParseError('Invalid JSON in extra fields');
        return;
      }
    }

    // Add back the _id
    finalDoc._id = document?._id;

    // Get list of encrypted fields that were modified
    const encryptedFieldPaths = schema?.fieldConfigs
      .filter(f => f.encryption?.enabled)
      .map(f => f.path) || [];

    await onSave(finalDoc, encryptedFieldPaths.length > 0 ? encryptedFieldPaths : undefined);
  };

  if (!document) return null;

  // Count encrypted fields
  const encryptedCount = schema?.fieldConfigs.filter(f => f.encryption?.enabled).length || 0;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={saving ? undefined : onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 600 },
          bgcolor: 'background.default',
        },
      }}
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box
          sx={{
            px: 2,
            py: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
              Edit Document
              {schema && (
                <Chip
                  label={schema.name}
                  size="small"
                  sx={{ height: 20, fontSize: 10 }}
                  color="primary"
                  variant="outlined"
                />
              )}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
              {String(document._id)}
            </Typography>
          </Box>
          <IconButton size="small" onClick={onClose} disabled={saving}>
            <Close sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          {schemaLoading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Skeleton variant="rectangular" height={56} />
              <Skeleton variant="rectangular" height={56} />
              <Skeleton variant="rectangular" height={56} />
              <Skeleton variant="rectangular" height={56} />
            </Box>
          ) : schemaError ? (
            <Alert severity="warning" sx={{ mb: 2 }}>
              No form schema found. Falling back to JSON editor.
            </Alert>
          ) : !schema ? (
            <Alert severity="info" sx={{ mb: 2 }}>
              No form schema linked to this collection. Using JSON editor.
            </Alert>
          ) : (
            <>
              {/* Encrypted fields notice */}
              {encryptedCount > 0 && (
                <Alert
                  severity="warning"
                  icon={<Lock />}
                  sx={{ mb: 2 }}
                >
                  This document has {encryptedCount} encrypted field{encryptedCount > 1 ? 's' : ''}.
                  Click the eye icon to reveal values. Changes will be re-encrypted on save.
                </Alert>
              )}

              {/* Form Fields */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {schema.fieldConfigs.map((field) => (
                  <FieldEditor
                    key={field.path}
                    field={field}
                    value={getNestedValue(formData, field.path)}
                    onChange={(value) => handleFieldChange(field.path, value)}
                    disabled={saving}
                    revealedEncrypted={revealedFields.has(field.path)}
                    onToggleReveal={() => toggleRevealField(field.path)}
                    isDecrypting={decryptingFields.has(field.path)}
                  />
                ))}
              </Box>

              {/* Extra Fields Section (fields not in schema) */}
              {extraFieldsJson && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Box>
                    <Button
                      size="small"
                      onClick={() => setShowExtraFields(!showExtraFields)}
                      startIcon={<Code />}
                      endIcon={showExtraFields ? <ExpandLess /> : <ExpandMore />}
                      sx={{ mb: 1 }}
                    >
                      Additional Fields (not in schema)
                    </Button>
                    <Collapse in={showExtraFields}>
                      <TextField
                        fullWidth
                        multiline
                        rows={6}
                        value={extraFieldsJson}
                        onChange={(e) => {
                          setExtraFieldsJson(e.target.value);
                          setParseError(null);
                        }}
                        disabled={saving}
                        sx={{
                          fontFamily: 'Monaco, Consolas, monospace',
                          fontSize: 12,
                        }}
                        InputProps={{
                          sx: { fontFamily: 'Monaco, Consolas, monospace', fontSize: 12 },
                        }}
                      />
                    </Collapse>
                  </Box>
                </>
              )}
            </>
          )}

          {/* Fallback JSON Editor when no schema */}
          {!schemaLoading && (!schema || schemaError) && (
            <FallbackJsonEditor
              document={document}
              formData={formData}
              onChange={setFormData}
              disabled={saving}
            />
          )}

          {(parseError || error) && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {parseError || error}
            </Alert>
          )}
        </Box>

        {/* Actions */}
        <Box
          sx={{
            px: 2,
            py: 1.5,
            display: 'flex',
            gap: 1,
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Button variant="outlined" onClick={onClose} disabled={saving} sx={{ flex: 1 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !!parseError}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Check />}
            sx={{
              flex: 1,
              background: 'linear-gradient(135deg, #00ED64 0%, #4DFF9F 100%)',
              color: '#001E2B',
              fontWeight: 600,
              '&:hover': {
                background: 'linear-gradient(135deg, #00CC55 0%, #3DFF8F 100%)',
              },
            }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
}

// Fallback JSON Editor when no schema is available
function FallbackJsonEditor({
  document,
  formData,
  onChange,
  disabled,
}: {
  document: Document;
  formData: Record<string, any>;
  onChange: (data: Record<string, any>) => void;
  disabled: boolean;
}) {
  const [jsonText, setJsonText] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);

  useEffect(() => {
    setJsonText(JSON.stringify(formData, null, 2));
  }, [formData]);

  const handleChange = (text: string) => {
    setJsonText(text);
    setParseError(null);

    try {
      const parsed = JSON.parse(text);
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        onChange(parsed);
      }
    } catch (e) {
      setParseError('Invalid JSON');
    }
  };

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
        Edit the document JSON below. The _id field cannot be changed.
      </Typography>
      <TextField
        fullWidth
        multiline
        rows={16}
        value={jsonText}
        onChange={(e) => handleChange(e.target.value)}
        disabled={disabled}
        error={!!parseError}
        helperText={parseError}
        sx={{
          '& .MuiInputBase-root': {
            fontFamily: 'Monaco, Consolas, monospace',
            fontSize: 12,
          },
        }}
      />
    </Box>
  );
}

export default SchemaAwareDocumentEditor;
