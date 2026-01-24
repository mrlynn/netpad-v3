'use client';

/**
 * DataViewEditorDialog
 *
 * Dialog for creating and editing data views
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Divider,
  IconButton,
  Chip,
  Alert,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
    Autocomplete,
  ListItemText,
  Checkbox,
} from '@mui/material';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import {
  Close,
  Add,
  Delete,
  ExpandMore,
  Edit,
  Lock,
  Refresh,
  Search,
} from '@mui/icons-material';
import { DataView, DataViewColumn, DataViewColumnType, DataViewSourceConfig } from '@/types/platform';
import { useOrganization } from '@/contexts/OrganizationContext';

interface DataViewEditorDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (view: Partial<DataView>) => Promise<void>;
  existingView?: DataView | null;
  projectId: string;
  availableVaults: Array<{ vaultId: string; name: string; database: string }>;
}

export function DataViewEditorDialog({
  open,
  onClose,
  onSave,
  existingView,
  projectId,
  availableVaults,
}: DataViewEditorDialogProps) {
  const { currentOrgId } = useOrganization();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [source, setSource] = useState<DataViewSourceConfig>({
    connectionId: '',
    db: '',
    collection: '',
    queryMode: 'query',
    query: {},
    defaultSort: { _id: -1 },
    defaultLimit: 100,
  });
  const [columns, setColumns] = useState<DataViewColumn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [availableFields, setAvailableFields] = useState<Array<{
    path: string;
    type: string;
    frequency: number;
    sampleValues: any[];
    isRequired: boolean;
    label: string;
  }>>([]);
  const [loadingFields, setLoadingFields] = useState(false);
  const [fieldsError, setFieldsError] = useState<string | null>(null);

  // Initialize from existing view
  useEffect(() => {
    if (existingView) {
      setName(existingView.name);
      setSlug(existingView.slug);
      setDescription(existingView.description || '');
      setSource(existingView.source);
      setColumns(existingView.columns);
      setAvailableFields([]); // Don't discover for existing views
    } else {
      setName('');
      setSlug('');
      setDescription('');
      setSource({
        connectionId: availableVaults[0]?.vaultId || '',
        db: availableVaults[0]?.database || '',
        collection: '',
        queryMode: 'query',
        query: {},
        defaultSort: { _id: -1 },
        defaultLimit: 100,
      });
      setColumns([]);
      setAvailableFields([]);
    }
    setError(null);
    setFieldsError(null);
  }, [existingView, open, availableVaults]);

  // Auto-generate slug from name
  useEffect(() => {
    if (!existingView && name) {
      const generatedSlug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 50);
      setSlug(generatedSlug);
    }
  }, [name, existingView]);

  // Discover fields when source is configured
  const discoverFields = async () => {
    if (!source.connectionId || !source.db || !source.collection || !projectId) {
      return;
    }

    setLoadingFields(true);
    setFieldsError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/data-views/discover-fields`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionId: source.connectionId,
          db: source.db,
          collection: source.collection,
          sampleSize: 100,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setAvailableFields(data.fields || []);
      } else {
        setFieldsError(data.error || 'Failed to discover fields');
      }
    } catch (err) {
      setFieldsError(err instanceof Error ? err.message : 'Failed to discover fields');
    } finally {
      setLoadingFields(false);
    }
  };

  // Auto-discover when source is complete
  useEffect(() => {
    if (source.connectionId && source.db && source.collection && !existingView && open) {
      discoverFields();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source.connectionId, source.db, source.collection, open]);

  const handleAddColumn = (fieldPath?: string) => {
    let newColumn: DataViewColumn;
    
    if (fieldPath) {
      // Add from discovered field
      const field = availableFields.find(f => f.path === fieldPath);
      if (field) {
        newColumn = {
          key: field.path.split('.').pop() || field.path,
          label: field.label,
          path: field.path,
          type: field.type as DataViewColumnType,
          visible: true,
          editable: true,
          required: field.isRequired,
          width: 200,
          pinned: false,
        };
      } else {
        // Custom field path
        newColumn = {
          key: fieldPath.split('.').pop() || fieldPath,
          label: fieldPath.split('.').pop() || fieldPath,
          path: fieldPath,
          type: 'string',
          visible: true,
          editable: true,
          required: false,
          width: 200,
          pinned: false,
        };
      }
    } else {
      // Empty column
      newColumn = {
        key: `field_${columns.length + 1}`,
        label: '',
        path: '',
        type: 'string',
        visible: true,
        editable: true,
        required: false,
        width: 200,
        pinned: false,
      };
    }
    
    setColumns([...columns, newColumn]);
  };

  const handleUpdateColumn = (index: number, updates: Partial<DataViewColumn>) => {
    const updated = [...columns];
    updated[index] = { ...updated[index], ...updates };
    setColumns(updated);
  };

  const handleRemoveColumn = (index: number) => {
    setColumns(columns.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setError(null);

    // Validation
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!slug.trim()) {
      setError('Slug is required');
      return;
    }
    if (!source.connectionId || !source.db || !source.collection) {
      setError('Connection, database, and collection are required');
      return;
    }
    if (columns.length === 0) {
      setError('At least one column is required');
      return;
    }
    if (columns.some(col => !col.key || !col.path || !col.label)) {
      setError('All columns must have key, path, and label');
      return;
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slug.trim())) {
      setError('Slug must contain only lowercase letters, numbers, and hyphens');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || undefined,
        source: {
          ...source,
          connectionId: source.connectionId,
          db: source.db.trim(),
          collection: source.collection.trim(),
        },
        columns: columns.map(col => ({
          ...col,
          key: col.key.trim(),
          label: col.label.trim(),
          path: col.path.trim(),
        })),
        permissions: existingView?.permissions || {
          viewAccess: {
            mode: 'projectRoles',
            roles: ['viewer', 'editor', 'admin'],
          },
          editPolicy: {
            allowRowCreate: false,
            allowRowDelete: false,
            allowJsonEdit: false,
            allowBulkEdit: false,
          },
        },
        settings: existingView?.settings || {
          patchWritesOnly: true,
          concurrency: {
            mode: 'none',
          },
        },
      });
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save data view';
      // Provide more helpful error messages
      if (errorMessage.includes('Topology is closed') || errorMessage.includes('connection')) {
        setError('Connection error. Please verify the connection is active and try again.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setSaving(false);
    }
  };

  const selectedVault = availableVaults.find(v => v.vaultId === source.connectionId);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">
            {existingView ? 'Edit Data View' : 'Create Data View'}
          </Typography>
          <IconButton size="small" onClick={onClose}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {error && <Alert severity="error">{error}</Alert>}

          {/* Basic Info */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
              Basic Information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  size="small"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  required
                  size="small"
                  helperText="URL-friendly identifier (lowercase, hyphens only)"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  multiline
                  rows={2}
                  size="small"
                />
              </Grid>
            </Grid>
          </Box>

          <Divider />

          {/* Source Configuration */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
              Data Source
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControl fullWidth size="small" required>
                  <InputLabel>Connection</InputLabel>
                  <Select
                    value={source.connectionId || ''}
                    onChange={(e) => {
                      const vault = availableVaults.find(v => v.vaultId === e.target.value);
                      setSource({
                        ...source,
                        connectionId: e.target.value,
                        db: vault?.database || '',
                      });
                    }}
                    label="Connection"
                    error={!source.connectionId}
                  >
                    {availableVaults.length === 0 ? (
                      <MenuItem disabled>No active connections available</MenuItem>
                    ) : (
                      availableVaults.map((vault) => (
                        <MenuItem key={vault.vaultId} value={vault.vaultId}>
                          {vault.name} ({vault.database})
                        </MenuItem>
                      ))
                    )}
                  </Select>
                  {availableVaults.length === 0 && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                      No active connections found. Please create a connection first.
                    </Typography>
                  )}
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Database"
                  value={source.db}
                  onChange={(e) => setSource({ ...source, db: e.target.value })}
                  required
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Collection"
                  value={source.collection}
                  onChange={(e) => setSource({ ...source, collection: e.target.value })}
                  required
                  size="small"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel>Query Mode</InputLabel>
                  <Select
                    value={source.queryMode}
                    onChange={(e) => setSource({ ...source, queryMode: e.target.value as 'query' | 'pipeline' })}
                    label="Query Mode"
                  >
                    <MenuItem value="query">Query</MenuItem>
                    <MenuItem value="pipeline">Pipeline</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>

          <Divider />

          {/* Columns */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Columns ({columns.length})
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {source.connectionId && source.db && source.collection && (
                  <>
                    <Button
                      size="small"
                      startIcon={loadingFields ? <NetPadLoader size="small" variant="svg" showPhrases={false} /> : <Refresh />}
                      onClick={discoverFields}
                      variant="outlined"
                      disabled={loadingFields}
                    >
                      {loadingFields ? 'Discovering...' : 'Refresh Fields'}
                    </Button>
                    <Autocomplete
                      size="small"
                      sx={{ minWidth: 250 }}
                      options={availableFields.filter(f => !columns.some(c => c.path === f.path))}
                      getOptionLabel={(option) => `${option.label} (${option.path})`}
                      renderOption={(props, option) => (
                        <Box component="li" {...props}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                            <Typography variant="body2">{option.label}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {option.path} • {option.type} • {option.frequency} docs
                            </Typography>
                          </Box>
                        </Box>
                      )}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          placeholder="Add field from collection..."
                          size="small"
                        />
                      )}
                      onChange={(_, value) => {
                        if (value) {
                          handleAddColumn(value.path);
                        }
                      }}
                      disabled={loadingFields || availableFields.length === 0}
                    />
                  </>
                )}
                <Button
                  size="small"
                  startIcon={<Add />}
                  onClick={() => handleAddColumn()}
                  variant="outlined"
                >
                  Add Custom Field
                </Button>
              </Box>
            </Box>

            {fieldsError && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                {fieldsError}
              </Alert>
            )}

            {source.connectionId && source.db && source.collection && availableFields.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Alert severity="info" sx={{ mb: 1 }}>
                  Found {availableFields.length} fields in collection. Select from the dropdown above or add custom fields.
                </Alert>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, maxHeight: 200, overflow: 'auto', p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                  {availableFields
                    .filter(f => !columns.some(c => c.path === f.path))
                    .slice(0, 20)
                    .map((field) => (
                      <Chip
                        key={field.path}
                        label={`${field.label} (${field.type})`}
                        size="small"
                        onClick={() => handleAddColumn(field.path)}
                        sx={{ cursor: 'pointer' }}
                        title={`${field.path} - Found in ${field.frequency} documents`}
                      />
                    ))}
                  {availableFields.filter(f => !columns.some(c => c.path === f.path)).length > 20 && (
                    <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center', px: 1 }}>
                      +{availableFields.filter(f => !columns.some(c => c.path === f.path)).length - 20} more...
                    </Typography>
                  )}
                </Box>
              </Box>
            )}

            {columns.length === 0 ? (
              <Alert severity="info">Add at least one column to define the view structure</Alert>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {columns.map((col, index) => (
                  <Accordion key={index} defaultExpanded={index === columns.length - 1}>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                        <Typography sx={{ flex: 1 }}>
                          {col.label || col.key || `Column ${index + 1}`}
                        </Typography>
                        <Chip label={col.type} size="small" />
                        {!col.editable && <Lock sx={{ fontSize: 14 }} />}
                        {col.required && <Chip label="Required" size="small" color="primary" />}
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            label="Key"
                            value={col.key}
                            onChange={(e) => handleUpdateColumn(index, { key: e.target.value })}
                            required
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            label="Label"
                            value={col.label}
                            onChange={(e) => handleUpdateColumn(index, { label: e.target.value })}
                            required
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Autocomplete
                            freeSolo
                            fullWidth
                            size="small"
                            options={availableFields.map(f => f.path)}
                            value={col.path}
                            onInputChange={(_, newValue) => {
                              handleUpdateColumn(index, { path: newValue });
                            }}
                            onChange={(_, value) => {
                              if (typeof value === 'string') {
                                const field = availableFields.find(f => f.path === value);
                                if (field) {
                                  handleUpdateColumn(index, {
                                    path: field.path,
                                    type: field.type as DataViewColumnType,
                                    label: field.label,
                                    required: field.isRequired,
                                  });
                                } else {
                                  handleUpdateColumn(index, { path: value });
                                }
                              }
                            }}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                label="Path"
                                required
                                helperText="Dot notation path (e.g., 'user.email') or select from collection"
                              />
                            )}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Type</InputLabel>
                            <Select
                              value={col.type}
                              onChange={(e) => handleUpdateColumn(index, { type: e.target.value as DataViewColumnType })}
                              label="Type"
                            >
                              <MenuItem value="string">String</MenuItem>
                              <MenuItem value="number">Number</MenuItem>
                              <MenuItem value="boolean">Boolean</MenuItem>
                              <MenuItem value="date">Date</MenuItem>
                              <MenuItem value="enum">Enum</MenuItem>
                              <MenuItem value="json">JSON</MenuItem>
                              <MenuItem value="objectId">ObjectId</MenuItem>
                              <MenuItem value="array">Array</MenuItem>
                              <MenuItem value="stringArray">String Array</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={col.visible}
                                onChange={(e) => handleUpdateColumn(index, { visible: e.target.checked })}
                              />
                            }
                            label="Visible"
                          />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={col.editable}
                                onChange={(e) => handleUpdateColumn(index, { editable: e.target.checked })}
                              />
                            }
                            label="Editable"
                          />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={col.required}
                                onChange={(e) => handleUpdateColumn(index, { required: e.target.checked })}
                              />
                            }
                            label="Required"
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <Button
                              size="small"
                              color="error"
                              startIcon={<Delete />}
                              onClick={() => handleRemoveColumn(index)}
                            >
                              Remove
                            </Button>
                          </Box>
                        </Grid>
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving}
          sx={{
            background: 'linear-gradient(135deg, #00ED64 0%, #4DFF9F 100%)',
            color: '#001E2B',
            fontWeight: 600,
            '&:hover': {
              background: 'linear-gradient(135deg, #00CC55 0%, #3DFF8F 100%)',
            },
          }}
        >
          {saving ? 'Saving...' : existingView ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
