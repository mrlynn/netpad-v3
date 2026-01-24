'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  TextField,
  Alert,
  alpha,
  IconButton,
  Chip,
  Autocomplete,
} from '@mui/material';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import {
  ContentCopy,
  Close,
  Storage,
} from '@mui/icons-material';

interface SourceConnection {
  vaultId: string;
  name: string;
  description?: string;
  database: string;
  allowedCollections: string[];
}

interface DuplicateConnectionDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (connection: {
    vaultId: string;
    name: string;
    database: string;
    allowedCollections: string[];
  }) => void;
  organizationId: string;
  sourceConnection: SourceConnection;
}

export function DuplicateConnectionDialog({
  open,
  onClose,
  onSuccess,
  organizationId,
  sourceConnection,
}: DuplicateConnectionDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [database, setDatabase] = useState('');
  const [allowedCollections, setAllowedCollections] = useState<string[]>([]);
  const [duplicating, setDuplicating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Available collections from source connection test
  const [availableCollections, setAvailableCollections] = useState<string[]>([]);
  const [loadingCollections, setLoadingCollections] = useState(false);

  // Initialize form with source connection values
  useEffect(() => {
    if (open && sourceConnection) {
      setName(`${sourceConnection.name} - Copy`);
      setDescription(sourceConnection.description || '');
      setDatabase(sourceConnection.database);
      setAllowedCollections(sourceConnection.allowedCollections);
      setError(null);

      // Fetch available collections from the source connection
      fetchCollections();
    }
  }, [open, sourceConnection]);

  const fetchCollections = async () => {
    if (!sourceConnection?.vaultId) return;

    try {
      setLoadingCollections(true);
      const response = await fetch(
        `/api/organizations/${organizationId}/vault/${sourceConnection.vaultId}/test`,
        { method: 'POST' }
      );
      const data = await response.json();

      if (data.success && data.collections) {
        setAvailableCollections(data.collections);
      }
    } catch (err) {
      console.error('Failed to fetch collections:', err);
    } finally {
      setLoadingCollections(false);
    }
  };

  const handleDuplicate = async () => {
    if (!name.trim()) {
      setError('Connection name is required');
      return;
    }

    try {
      setDuplicating(true);
      setError(null);

      const response = await fetch(
        `/api/organizations/${organizationId}/vault/${sourceConnection.vaultId}/duplicate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || undefined,
            database: database.trim() || undefined,
            allowedCollections: allowedCollections.length > 0 ? allowedCollections : undefined,
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        onSuccess({
          vaultId: data.vault.vaultId,
          name: data.vault.name,
          database: data.vault.database,
          allowedCollections: data.vault.allowedCollections,
        });
      } else {
        setError(data.error || 'Failed to duplicate connection');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setDuplicating(false);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setDatabase('');
    setAllowedCollections([]);
    setError(null);
    setAvailableCollections([]);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: alpha('#2196f3', 0.1),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ContentCopy sx={{ color: '#2196f3' }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Duplicate Connection
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Create a copy with same connection string
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={handleClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Source Connection Info */}
          <Box
            sx={{
              p: 2,
              borderRadius: 1,
              bgcolor: alpha('#00ED64', 0.05),
              border: '1px solid',
              borderColor: alpha('#00ED64', 0.2),
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Duplicating from:
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Storage sx={{ fontSize: 20, color: '#00ED64' }} />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {sourceConnection.name}
              </Typography>
              <Chip
                label={sourceConnection.database}
                size="small"
                sx={{ bgcolor: alpha('#00ED64', 0.1), color: '#00ED64' }}
              />
            </Box>
          </Box>

          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* New Connection Name */}
          <TextField
            label="Connection Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            required
            helperText="Give your new connection a unique name"
          />

          {/* Description */}
          <TextField
            label="Description (Optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={2}
          />

          {/* Database - Can be changed */}
          <TextField
            label="Database Name"
            value={database}
            onChange={(e) => setDatabase(e.target.value)}
            fullWidth
            helperText="Change the database name if you want to use a different database on the same MongoDB cluster"
          />

          {/* Allowed Collections */}
          <Autocomplete
            multiple
            options={availableCollections}
            value={allowedCollections}
            onChange={(_, newValue) => setAllowedCollections(newValue)}
            loading={loadingCollections}
            freeSolo
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  {...getTagProps({ index })}
                  key={option}
                  label={option}
                  size="small"
                />
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label="Allowed Collections (Optional)"
                helperText="Leave empty to allow all collections"
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {loadingCollections ? <NetPadLoader size="small" variant="svg" showPhrases={false} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} disabled={duplicating}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleDuplicate}
          disabled={duplicating || !name.trim()}
          startIcon={duplicating ? <NetPadLoader size="small" variant="svg" showPhrases={false} /> : <ContentCopy />}
          sx={{
            bgcolor: '#2196f3',
            '&:hover': { bgcolor: '#1976d2' },
          }}
        >
          {duplicating ? 'Duplicating...' : 'Duplicate Connection'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
