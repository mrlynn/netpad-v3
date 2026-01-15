'use client';

import { useState, useEffect } from 'react';
import {
  Popover,
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  alpha,
  Alert,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
} from '@mui/material';
import {
  Rocket,
  Storage,
  Warning,
} from '@mui/icons-material';
import { FormDataSource } from '@/types/form';

interface QuickPublishPopoverProps {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  formName: string;
  formConfigDataSource?: FormDataSource;
  organizationId?: string;
  projectId?: string;
  onPublish: (name: string, dataSource?: FormDataSource) => Promise<void>;
  onConfigureStorage?: () => void;
  publishing: boolean;
  error: string | null;
}

interface Connection {
  vaultId: string;
  name: string;
  database: string;
  allowedCollections: string[];
  status: 'active' | 'disabled';
}

export function QuickPublishPopover({
  open,
  anchorEl,
  onClose,
  formName: initialFormName,
  formConfigDataSource,
  organizationId,
  projectId,
  onPublish,
  onConfigureStorage,
  publishing,
  error,
}: QuickPublishPopoverProps) {
  const [formName, setFormName] = useState(initialFormName || '');
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedVaultId, setSelectedVaultId] = useState<string>(formConfigDataSource?.vaultId || '');
  const [selectedCollection, setSelectedCollection] = useState<string>(formConfigDataSource?.collection || '');
  const [availableCollections, setAvailableCollections] = useState<string[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [loadingCollections, setLoadingCollections] = useState(false);

  // Load connections when popover opens
  useEffect(() => {
    if (open && organizationId && !formConfigDataSource) {
      loadConnections();
    }
  }, [open, organizationId, formConfigDataSource]);

  // Load collections when connection is selected
  useEffect(() => {
    if (selectedVaultId && organizationId && !formConfigDataSource) {
      loadCollections();
    }
  }, [selectedVaultId, organizationId, formConfigDataSource]);

  const loadConnections = async () => {
    if (!organizationId) return;
    setLoadingConnections(true);
    try {
      const response = await fetch(`/api/organizations/${organizationId}/vault`);
      const data = await response.json();
      if (response.ok) {
        setConnections((data.connections || []).filter((c: Connection) => c.status === 'active'));
        // Auto-select first connection if available
        if (data.connections?.length > 0 && !selectedVaultId) {
          setSelectedVaultId(data.connections[0].vaultId);
        }
      }
    } catch (err) {
      console.error('Failed to load connections:', err);
    } finally {
      setLoadingConnections(false);
    }
  };

  const loadCollections = async () => {
    if (!selectedVaultId || !organizationId) return;
    setLoadingCollections(true);
    setAvailableCollections([]);
    try {
      // Decrypt vault connection
      const decryptResponse = await fetch(
        `/api/organizations/${organizationId}/vault/${selectedVaultId}/decrypt`
      );
      const decryptData = await decryptResponse.json();

      if (!decryptData.connectionString) {
        console.error('Failed to decrypt vault connection');
        return;
      }

      // Fetch collections
      const response = await fetch('/api/mongodb/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionString: decryptData.connectionString,
          databaseName: decryptData.database,
        }),
      });

      const data = await response.json();
      if (data.collections && Array.isArray(data.collections)) {
        const collectionNames = data.collections.map((col: any) =>
          typeof col === 'string' ? col : col.name
        );
        setAvailableCollections(collectionNames);
      }
    } catch (err) {
      console.error('Failed to load collections:', err);
    } finally {
      setLoadingCollections(false);
    }
  };

  const handlePublish = async () => {
    if (!formName.trim()) {
      return;
    }

    let dataSource: FormDataSource | undefined = formConfigDataSource;
    
    // If no data source configured, use selected one
    if (!dataSource && selectedVaultId && selectedCollection) {
      dataSource = {
        vaultId: selectedVaultId,
        collection: selectedCollection,
      };
    }

    await onPublish(formName.trim(), dataSource);
  };

  const hasDataSource = !!(formConfigDataSource?.vaultId && formConfigDataSource?.collection);
  const needsCollectionSelection = !hasDataSource && organizationId;

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      PaperProps={{
        sx: {
          mt: 1,
          width: 380,
          maxWidth: '90vw',
          borderRadius: 2,
          overflow: 'hidden',
        },
      }}
    >
      <Box sx={{ p: 2.5 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 1.5,
              background: 'linear-gradient(135deg, #9c27b0 0%, #ba68c8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Rocket sx={{ color: '#fff', fontSize: 20 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
              Publish Form
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Make it live and shareable
            </Typography>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => {}}>
            {error}
          </Alert>
        )}

        {/* Form Name */}
        <TextField
          label="Form Name"
          value={formName}
          onChange={(e) => setFormName(e.target.value)}
          fullWidth
          required
          autoFocus
          size="small"
          placeholder="e.g., Contact Form, Event Registration"
          sx={{ mb: 2 }}
          helperText="Give your form a name"
        />

        {/* Collection Selection (if needed) */}
        {needsCollectionSelection && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
              Data Storage
            </Typography>

            {loadingConnections ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 2 }}>
                <CircularProgress size={16} />
                <Typography variant="body2" color="text.secondary">
                  Loading connections...
                </Typography>
              </Box>
            ) : connections.length === 0 ? (
              <Alert
                severity="warning"
                sx={{ mb: 2 }}
                action={
                  onConfigureStorage && (
                    <Button
                      size="small"
                      onClick={() => {
                        onClose();
                        onConfigureStorage();
                      }}
                    >
                      Configure
                    </Button>
                  )
                }
              >
                No database connection available
              </Alert>
            ) : (
              <>
                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                  <InputLabel>Connection</InputLabel>
                  <Select
                    value={selectedVaultId}
                    label="Connection"
                    onChange={(e) => setSelectedVaultId(e.target.value)}
                  >
                    {connections.map((conn) => (
                      <MenuItem key={conn.vaultId} value={conn.vaultId}>
                        {conn.name} ({conn.database})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {selectedVaultId && (
                  <Autocomplete
                    freeSolo
                    options={availableCollections}
                    value={selectedCollection}
                    onChange={(_, newValue) => setSelectedCollection(newValue || '')}
                    onInputChange={(_, newValue) => setSelectedCollection(newValue)}
                    loading={loadingCollections}
                    size="small"
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Collection"
                        placeholder="Select or enter collection name"
                        helperText="Where form submissions will be stored"
                      />
                    )}
                  />
                )}
              </>
            )}
          </>
        )}

        {/* Actions */}
        <Box sx={{ display: 'flex', gap: 1.5, mt: 3 }}>
          <Button
            onClick={onClose}
            disabled={publishing}
            sx={{ flex: 1 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handlePublish}
            variant="contained"
            disabled={!formName.trim() || publishing || (needsCollectionSelection && (!selectedVaultId || !selectedCollection)) || false}
            startIcon={publishing ? <CircularProgress size={16} /> : <Rocket />}
            sx={{
              flex: 1,
              background: 'linear-gradient(135deg, #9c27b0 0%, #ba68c8 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #7b1fa2 0%, #ab47bc 100%)',
              },
            }}
          >
            {publishing ? 'Publishing...' : 'Publish'}
          </Button>
        </Box>
      </Box>
    </Popover>
  );
}
