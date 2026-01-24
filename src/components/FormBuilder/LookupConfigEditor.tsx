'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  IconButton,
  Collapse,
  Paper,
  alpha,
} from '@mui/material';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import { ExpandMore, ExpandLess, Link as LinkIcon } from '@mui/icons-material';
import { FieldConfig, LookupConfig, FormDataSource } from '@/types/form';
import { usePipeline } from '@/contexts/PipelineContext';

interface LookupConfigEditorProps {
  config: FieldConfig;
  allFieldConfigs: FieldConfig[];
  onUpdate: (lookup: LookupConfig | undefined) => void;
  // New props for vault-based connections
  dataSource?: FormDataSource;
  organizationId?: string;
}

export function LookupConfigEditor({
  config,
  allFieldConfigs,
  onUpdate,
  dataSource,
  organizationId
}: LookupConfigEditorProps) {
  const { connectionString: pipelineConnString, databaseName: pipelineDbName } = usePipeline();
  const [expanded, setExpanded] = useState(!!config.lookup);
  const [collections, setCollections] = useState<string[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(false);
  const [collectionFields, setCollectionFields] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const lookup = config.lookup || {
    collection: '',
    displayField: '',
    valueField: '_id',
    searchable: true,
    multiple: false,
    preloadOptions: true
  };

  const hasLookup = !!config.lookup;

  // Determine which connection to use: vault-based or legacy pipeline
  const hasVaultConnection = !!(dataSource?.vaultId && organizationId);
  const hasLegacyConnection = !!(pipelineConnString && pipelineDbName);
  const hasAnyConnection = hasVaultConnection || hasLegacyConnection;

  // Fetch available collections
  useEffect(() => {
    if (!hasAnyConnection) return;

    const fetchCollections = async () => {
      setCollectionsLoading(true);
      try {
        let response;

        if (hasVaultConnection) {
          // Use vault-based connection - first decrypt, then fetch collections
          const decryptResponse = await fetch(
            `/api/organizations/${organizationId}/vault/${dataSource!.vaultId}/decrypt`
          );
          const decryptData = await decryptResponse.json();

          if (!decryptData.connectionString) {
            console.error('Failed to decrypt vault connection');
            return;
          }

          response = await fetch('/api/mongodb/collections', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              connectionString: decryptData.connectionString,
              databaseName: decryptData.database
            })
          });
        } else {
          // Use legacy pipeline connection
          response = await fetch('/api/mongodb/collections', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              connectionString: pipelineConnString,
              databaseName: pipelineDbName
            })
          });
        }

        const data = await response.json();
        if (data.collections && Array.isArray(data.collections)) {
          // Handle both string arrays and object arrays with name property
          const collectionNames = data.collections.map((col: any) =>
            typeof col === 'string' ? col : col.name
          );
          setCollections(collectionNames);
        }
      } catch (err) {
        console.error('Failed to fetch collections:', err);
      } finally {
        setCollectionsLoading(false);
      }
    };

    fetchCollections();
  }, [hasVaultConnection, hasLegacyConnection, hasAnyConnection, dataSource, organizationId, pipelineConnString, pipelineDbName]);

  // Fetch fields from selected collection
  useEffect(() => {
    if (!hasAnyConnection || !lookup.collection) {
      setCollectionFields([]);
      return;
    }

    const fetchFields = async () => {
      setLoading(true);
      try {
        let connectionString: string;
        let databaseName: string;

        if (hasVaultConnection) {
          // Decrypt vault connection
          const decryptResponse = await fetch(
            `/api/organizations/${organizationId}/vault/${dataSource!.vaultId}/decrypt`
          );
          const decryptData = await decryptResponse.json();

          if (!decryptData.connectionString) {
            console.error('Failed to decrypt vault connection');
            return;
          }
          connectionString = decryptData.connectionString;
          databaseName = decryptData.database;
        } else {
          connectionString = pipelineConnString!;
          databaseName = pipelineDbName!;
        }

        const response = await fetch('/api/mongodb/sample-documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            connectionString,
            databaseName,
            collection: lookup.collection,
            limit: 5
          })
        });
        const data = await response.json();
        if (data.success && data.documents && data.documents.length > 0) {
          // Extract field names from sample documents
          const fields = extractFieldNames(data.documents[0]);
          setCollectionFields(fields);
        }
      } catch (err) {
        console.error('Failed to fetch collection fields:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFields();
  }, [hasVaultConnection, hasAnyConnection, dataSource, organizationId, pipelineConnString, pipelineDbName, lookup.collection]);

  const extractFieldNames = (doc: any, prefix = ''): string[] => {
    const fields: string[] = [];
    if (!doc || typeof doc !== 'object') return fields;

    Object.keys(doc).forEach((key) => {
      const path = prefix ? `${prefix}.${key}` : key;
      fields.push(path);

      // Recurse into nested objects (limit depth)
      if (doc[key] && typeof doc[key] === 'object' && !Array.isArray(doc[key])) {
        const depth = path.split('.').length;
        if (depth < 3) {
          fields.push(...extractFieldNames(doc[key], path));
        }
      }
    });

    return fields;
  };

  const handleUpdate = (updates: Partial<LookupConfig>) => {
    onUpdate({ ...lookup, ...updates });
  };

  const handleToggle = () => {
    if (hasLookup) {
      onUpdate(undefined);
      setExpanded(false);
    } else {
      onUpdate(lookup);
      setExpanded(true);
    }
  };

  // Get available fields from current form for cascading filter
  const availableFormFields = allFieldConfigs.filter(
    (f) => f.path !== config.path && f.included
  );

  return (
    <Box sx={{ mt: 2 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          py: 0.5
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LinkIcon fontSize="small" sx={{ color: hasLookup ? '#00ED64' : 'text.secondary' }} />
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
            Lookup Field
          </Typography>
          {hasLookup && (
            <Typography variant="caption" sx={{ color: '#00ED64' }}>
              ({lookup.collection})
            </Typography>
          )}
        </Box>
        <IconButton size="small">
          {expanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <Paper
          elevation={0}
          sx={{
            mt: 1,
            p: 2,
            bgcolor: alpha('#00ED64', 0.03),
            border: '1px solid',
            borderColor: alpha('#00ED64', 0.15),
            borderRadius: 1
          }}
        >
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={hasLookup}
                onChange={handleToggle}
              />
            }
            label={
              <Typography variant="caption">
                Enable lookup from another collection
              </Typography>
            }
            sx={{ mb: 2 }}
          />

          {hasLookup && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Source Collection */}
              <FormControl size="small" fullWidth>
                <InputLabel>Source Collection</InputLabel>
                <Select
                  value={lookup.collection}
                  label="Source Collection"
                  onChange={(e) => handleUpdate({ collection: e.target.value })}
                  disabled={collectionsLoading}
                  endAdornment={
                    collectionsLoading ? (
                      <NetPadLoader size="small" variant="svg" showPhrases={false} />
                    ) : null
                  }
                >
                  {collections.length === 0 && !collectionsLoading ? (
                    <MenuItem value="" disabled>
                      No collections found
                    </MenuItem>
                  ) : (
                    collections.map((col) => (
                      <MenuItem key={col} value={col}>
                        {col}
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
              {collections.length === 0 && !collectionsLoading && (
                <Typography variant="caption" color="error">
                  No collections available. Make sure you're connected to a database.
                </Typography>
              )}

              {loading && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <NetPadLoader size="small" variant="svg" showPhrases={false} />
                  <Typography variant="caption">Loading fields...</Typography>
                </Box>
              )}

              {/* Display Field */}
              <FormControl size="small" fullWidth disabled={!lookup.collection}>
                <InputLabel>Display Field</InputLabel>
                <Select
                  value={lookup.displayField}
                  label="Display Field"
                  onChange={(e) => handleUpdate({ displayField: e.target.value })}
                >
                  {collectionFields.map((field) => (
                    <MenuItem key={field} value={field}>
                      {field}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Value Field */}
              <FormControl size="small" fullWidth disabled={!lookup.collection}>
                <InputLabel>Value Field (stored)</InputLabel>
                <Select
                  value={lookup.valueField}
                  label="Value Field (stored)"
                  onChange={(e) => handleUpdate({ valueField: e.target.value })}
                >
                  <MenuItem value="_id">_id (ObjectId)</MenuItem>
                  {collectionFields
                    .filter((f) => f !== '_id')
                    .map((field) => (
                      <MenuItem key={field} value={field}>
                        {field}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>

              {/* Cascading Filter */}
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                Cascading Filter (Optional)
              </Typography>

              <Box sx={{ display: 'flex', gap: 1 }}>
                <FormControl size="small" sx={{ flex: 1 }}>
                  <InputLabel>Filter by field</InputLabel>
                  <Select
                    value={lookup.filterField || ''}
                    label="Filter by field"
                    onChange={(e) => handleUpdate({ filterField: e.target.value || undefined })}
                  >
                    <MenuItem value="">None</MenuItem>
                    {collectionFields.map((field) => (
                      <MenuItem key={field} value={field}>
                        {field}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ flex: 1 }}>
                  <InputLabel>Based on form field</InputLabel>
                  <Select
                    value={lookup.filterSourceField || ''}
                    label="Based on form field"
                    onChange={(e) => handleUpdate({ filterSourceField: e.target.value || undefined })}
                    disabled={!lookup.filterField}
                  >
                    <MenuItem value="">None</MenuItem>
                    {availableFormFields.map((f) => (
                      <MenuItem key={f.path} value={f.path}>
                        {f.label} ({f.path})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {/* Options */}
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={lookup.searchable ?? true}
                      onChange={(e) => handleUpdate({ searchable: e.target.checked })}
                    />
                  }
                  label={<Typography variant="caption">Searchable</Typography>}
                />
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={lookup.multiple ?? false}
                      onChange={(e) => handleUpdate({ multiple: e.target.checked })}
                    />
                  }
                  label={<Typography variant="caption">Allow Multiple</Typography>}
                />
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={lookup.preloadOptions ?? true}
                      onChange={(e) => handleUpdate({ preloadOptions: e.target.checked })}
                    />
                  }
                  label={<Typography variant="caption">Preload Options</Typography>}
                />
              </Box>
            </Box>
          )}
        </Paper>
      </Collapse>
    </Box>
  );
}
