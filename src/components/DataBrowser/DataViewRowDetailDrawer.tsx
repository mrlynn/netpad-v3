'use client';

/**
 * DataViewRowDetailDrawer
 *
 * Row detail drawer for data views with:
 * - Fields tab: Auto-generated form from column definitions
 * - JSON tab: Read-only by default, editable if allowed
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
  Divider,
  Tabs,
  Tab,
  Chip,
  Tooltip,
  alpha,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import {
  Close,
  Check,
  Code,
  Edit,
  Lock,
  Delete,
  ContentCopy,
  Warning,
} from '@mui/icons-material';
import { DataView, DataViewColumn } from '@/types/platform';

interface DataViewRowDetailDrawerProps {
  open: boolean;
  document: any;
  dataView: DataView | null;
  capabilities: {
    canEdit: boolean;
    canJsonEdit: boolean;
    writablePaths: string[];
    maskedColumns?: string[];
  };
  onClose: () => void;
  onSave: (ops: Array<{ op: 'set' | 'unset'; path: string; value?: any }>) => Promise<void>;
  onDelete: () => Promise<void>;
  saving: boolean;
  error: string | null;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`row-detail-tabpanel-${index}`}
      aria-labelledby={`row-detail-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
}

/**
 * Get nested value from object using dot notation path
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Set nested value in object using dot notation path
 */
function setNestedValue(obj: any, path: string, value: any): any {
  const keys = path.split('.');
  const result = { ...obj };
  let current = result;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]] || typeof current[keys[i]] !== 'object') {
      current[keys[i]] = {};
    } else {
      current[keys[i]] = { ...current[keys[i]] };
    }
    current = current[keys[i]];
  }
  current[keys[keys.length - 1]] = value;
  return result;
}

/**
 * Render a field input based on column type
 */
function renderFieldInput(
  column: DataViewColumn,
  value: any,
  onChange: (value: any) => void,
  editable: boolean,
  readOnlyReason: string | null | undefined,
  saving: boolean
) {
  const commonProps = {
    fullWidth: true,
    size: 'small' as const,
    label: column.label,
    disabled: !editable || saving,
    helperText: readOnlyReason || (column.required ? 'Required' : ''),
    error: column.required && !value,
  };

  switch (column.type) {
    case 'string':
    case 'stringArray':
      if (column.format?.mode === 'email') {
        return (
          <TextField
            {...commonProps}
            type="email"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            InputProps={{
              readOnly: !editable,
              endAdornment: !editable && (
                <IconButton size="small" disabled>
                  <Lock sx={{ fontSize: 16 }} />
                </IconButton>
              ),
            }}
          />
        );
      }
      return (
        <TextField
          {...commonProps}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          multiline={column.type === 'stringArray'}
          rows={column.type === 'stringArray' ? 3 : 1}
          InputProps={{
            readOnly: !editable,
            endAdornment: !editable && (
              <IconButton size="small" disabled>
                <Lock sx={{ fontSize: 16 }} />
              </IconButton>
            ),
          }}
        />
      );

    case 'number':
      return (
        <TextField
          {...commonProps}
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
          InputProps={{
            readOnly: !editable,
            endAdornment: !editable && (
              <IconButton size="small" disabled>
                <Lock sx={{ fontSize: 16 }} />
              </IconButton>
            ),
          }}
        />
      );

    case 'boolean':
      return (
        <FormControlLabel
          control={
            <Switch
              checked={value || false}
              onChange={(e) => onChange(e.target.checked)}
              disabled={!editable || saving}
            />
          }
          label={column.label}
        />
      );

    case 'date':
      return (
        <TextField
          {...commonProps}
          type="datetime-local"
          value={value ? new Date(value).toISOString().slice(0, 16) : ''}
          onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : null)}
          InputProps={{
            readOnly: !editable,
            endAdornment: !editable && (
              <IconButton size="small" disabled>
                <Lock sx={{ fontSize: 16 }} />
              </IconButton>
            ),
          }}
        />
      );

    case 'enum':
      return (
        <FormControl fullWidth size="small" disabled={!editable || saving}>
          <InputLabel>{column.label}</InputLabel>
          <Select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            label={column.label}
            disabled={!editable || saving}
          >
            {column.validation?.enum?.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      );

    case 'json':
      return (
        <TextField
          {...commonProps}
          multiline
          rows={4}
          value={value ? JSON.stringify(value, null, 2) : ''}
          onChange={(e) => {
            try {
              const parsed = e.target.value ? JSON.parse(e.target.value) : null;
              onChange(parsed);
            } catch {
              // Invalid JSON, but allow typing
              onChange(e.target.value);
            }
          }}
          InputProps={{
            readOnly: !editable,
            endAdornment: !editable && (
              <IconButton size="small" disabled>
                <Lock sx={{ fontSize: 16 }} />
              </IconButton>
            ),
          }}
          helperText={readOnlyReason || 'Enter valid JSON'}
        />
      );

    default:
      return (
        <TextField
          {...commonProps}
          value={value !== null && value !== undefined ? String(value) : ''}
          onChange={(e) => onChange(e.target.value)}
          InputProps={{
            readOnly: !editable,
            endAdornment: !editable && (
              <IconButton size="small" disabled>
                <Lock sx={{ fontSize: 16 }} />
              </IconButton>
            ),
          }}
        />
      );
  }
}

export function DataViewRowDetailDrawer({
  open,
  document,
  dataView,
  capabilities,
  onClose,
  onSave,
  onDelete,
  saving,
  error,
}: DataViewRowDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [formData, setFormData] = useState<any>({});
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form data from document
  useEffect(() => {
    if (document && dataView) {
      const initialData: any = {};
      for (const col of dataView.columns) {
        if (col.visible) {
          initialData[col.path] = getNestedValue(document, col.path);
        }
      }
      setFormData(initialData);
      setJsonText(JSON.stringify(document, null, 2));
      setHasChanges(false);
      setJsonError(null);
    }
  }, [document, dataView]);

  // Handle field change
  const handleFieldChange = useCallback((path: string, value: any) => {
    setFormData((prev: any) => {
      const newData = { ...prev, [path]: value };
      setHasChanges(true);
      return newData;
    });
  }, []);

  // Handle JSON change
  const handleJsonChange = useCallback((value: string) => {
    setJsonText(value);
    setJsonError(null);
    try {
      if (value.trim()) {
        JSON.parse(value);
        setHasChanges(true);
      }
    } catch (e) {
      setJsonError('Invalid JSON');
    }
  }, []);

  // Handle save from Fields tab
  const handleSaveFields = useCallback(async () => {
    if (!document || !dataView) return;

    const ops: Array<{ op: 'set' | 'unset'; path: string; value?: any }> = [];

    for (const col of dataView.columns) {
      if (!col.visible) continue;

      const currentValue = getNestedValue(document, col.path);
      const newValue = formData[col.path];

      // Check if value changed
      if (JSON.stringify(currentValue) !== JSON.stringify(newValue)) {
        if (newValue === null || newValue === undefined || newValue === '') {
          ops.push({ op: 'unset', path: col.path });
        } else {
          ops.push({ op: 'set', path: col.path, value: newValue });
        }
      }
    }

    if (ops.length === 0) {
      return; // No changes
    }

    await onSave(ops);
    setHasChanges(false);
  }, [document, dataView, formData, onSave]);

  // Handle save from JSON tab
  const handleSaveJson = useCallback(async () => {
    if (!document || !dataView || !capabilities.canJsonEdit) return;

    try {
      const parsed = JSON.parse(jsonText);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        setJsonError('Document must be a JSON object');
        return;
      }

      // Compute diff and create ops
      // For now, we'll do a simple comparison
      // In production, you'd want a proper diff algorithm
      const ops: Array<{ op: 'set' | 'unset'; path: string; value?: any }> = [];

      // Compare all writable paths
      for (const col of dataView.columns) {
        if (!capabilities.writablePaths.includes(col.path)) continue;

        const currentValue = getNestedValue(document, col.path);
        const newValue = getNestedValue(parsed, col.path);

        if (JSON.stringify(currentValue) !== JSON.stringify(newValue)) {
          if (newValue === null || newValue === undefined) {
            ops.push({ op: 'unset', path: col.path });
          } else {
            ops.push({ op: 'set', path: col.path, value: newValue });
          }
        }
      }

      if (ops.length === 0) {
        setJsonError('No changes detected');
        return;
      }

      await onSave(ops);
      setHasChanges(false);
      setJsonError(null);
    } catch (e) {
      setJsonError('Invalid JSON: ' + (e instanceof Error ? e.message : 'Parse error'));
    }
  }, [document, dataView, jsonText, capabilities, onSave]);

  if (!document || !dataView) return null;

  // Group columns by group if available
  const groupedColumns = dataView.columns.reduce((acc: Record<string, DataViewColumn[]>, col) => {
    const group = col.group || 'Other';
    if (!acc[group]) acc[group] = [];
    acc[group].push(col);
    return acc;
  }, {});

  // Check if JSON tab should be enabled
  const jsonTabEnabled = capabilities.canJsonEdit;

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
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {dataView.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
              {String(document._id)}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Copy JSON">
              <IconButton size="small" onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(document, null, 2));
              }}>
                <ContentCopy sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <IconButton size="small" onClick={onClose} disabled={saving}>
              <Close sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
        </Box>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
          <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
            <Tab label="Fields" icon={<Edit />} iconPosition="start" />
            <Tab
              label="JSON"
              icon={<Code />}
              iconPosition="start"
              disabled={!jsonTabEnabled}
            />
          </Tabs>
        </Box>

        {/* Warning for JSON tab */}
        {activeTab === 1 && jsonTabEnabled && (
          <Alert
            severity="warning"
            icon={<Warning />}
            sx={{ mx: 2, mt: 2 }}
          >
            Advanced mode. Changes are audited. Some fields may be immutable.
          </Alert>
        )}

        {/* Content */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {/* Fields Tab */}
          <TabPanel value={activeTab} index={0}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {Object.entries(groupedColumns).map(([group, columns]) => (
                <Box key={group}>
                  {group !== 'Other' && (
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                      {group}
                    </Typography>
                  )}
                  {columns
                    .filter(col => col.visible)
                    .map((col) => {
                      const value = formData[col.path];
                      const editable = capabilities.writablePaths.includes(col.path);
                      const readOnlyReason = col.readOnlyReason || (!editable ? 'Field is read-only' : null);

                      return (
                          <Box key={col.path} sx={{ mb: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              {renderFieldInput(col, value, (newValue) => handleFieldChange(col.path, newValue), editable, readOnlyReason, saving)}
                            </Box>
                          {!editable && readOnlyReason && (
                            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                              <Lock sx={{ fontSize: 12, verticalAlign: 'middle', mr: 0.5 }} />
                              {readOnlyReason}
                            </Typography>
                          )}
                        </Box>
                      );
                    })}
                </Box>
              ))}
            </Box>
          </TabPanel>

          {/* JSON Tab */}
          <TabPanel value={activeTab} index={1}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="caption" color="text.secondary">
                {jsonTabEnabled
                  ? 'Edit the document JSON below. Only writable paths will be updated.'
                  : 'JSON editing is disabled for this view.'}
              </Typography>
              <TextField
                multiline
                fullWidth
                value={jsonText}
                onChange={(e) => handleJsonChange(e.target.value)}
                disabled={!jsonTabEnabled || saving}
                sx={{
                  flex: 1,
                  '& .MuiInputBase-root': {
                    fontFamily: 'Monaco, Consolas, monospace',
                    fontSize: 12,
                  },
                }}
                error={!!jsonError}
                helperText={jsonError}
              />
            </Box>
          </TabPanel>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mx: 2, mt: 2 }}>
            {error}
          </Alert>
        )}

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
          {activeTab === 0 ? (
            <Button
              variant="contained"
              onClick={handleSaveFields}
              disabled={saving || !hasChanges || !capabilities.canEdit}
              startIcon={saving ? <NetPadLoader size="small" variant="svg" showPhrases={false} /> : <Check />}
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
          ) : (
            <Button
              variant="contained"
              onClick={handleSaveJson}
              disabled={saving || !hasChanges || !jsonTabEnabled || !!jsonError}
              startIcon={saving ? <NetPadLoader size="small" variant="svg" showPhrases={false} /> : <Check />}
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
              {saving ? 'Saving...' : 'Save JSON'}
            </Button>
          )}
          {capabilities.canEdit && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<Delete />}
              onClick={onDelete}
              disabled={saving}
            >
              Delete
            </Button>
          )}
        </Box>
      </Box>
    </Drawer>
  );
}
