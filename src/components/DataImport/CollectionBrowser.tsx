'use client';

/**
 * Collection Browser
 * Browse databases and collections in a MongoDB connection
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Collapse,
  CircularProgress,
  Alert,
  Chip,
  Stack,
  IconButton,
  Tooltip,
  Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  Storage as DatabaseIcon,
  TableChart as CollectionIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  CloudUpload as ImportIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { CollectionInfo } from '@/types/dataImport';

interface DatabaseInfo {
  name: string;
  sizeOnDisk?: number;
  empty?: boolean;
}

interface CollectionBrowserProps {
  vaultId: string;
  onSelectCollection?: (database: string, collection: string) => void;
  onImportToCollection?: (database: string, collection: string) => void;
  selectedDatabase?: string;
  selectedCollection?: string;
}

export function CollectionBrowser({
  vaultId,
  onSelectCollection,
  onImportToCollection,
  selectedDatabase,
  selectedCollection,
}: CollectionBrowserProps) {
  const [databases, setDatabases] = useState<DatabaseInfo[]>([]);
  const [expandedDbs, setExpandedDbs] = useState<Set<string>>(new Set());
  const [collections, setCollections] = useState<Record<string, CollectionInfo[]>>({});
  const [loading, setLoading] = useState(false);
  const [loadingDb, setLoadingDb] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Create collection dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createDbName, setCreateDbName] = useState('');
  const [newCollectionName, setNewCollectionName] = useState('');
  const [creating, setCreating] = useState(false);

  // Fetch databases
  const fetchDatabases = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/collections?vaultId=${vaultId}`);
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to fetch databases');
      }
      const data = await response.json();
      setDatabases(data.databases || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch databases');
    } finally {
      setLoading(false);
    }
  }, [vaultId]);

  // Fetch collections for a database
  const fetchCollections = useCallback(
    async (database: string) => {
      setLoadingDb(database);

      try {
        const response = await fetch(
          `/api/collections?vaultId=${vaultId}&database=${database}&includeStats=true`
        );
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Failed to fetch collections');
        }
        const data = await response.json();
        setCollections(prev => ({
          ...prev,
          [database]: data.collections || [],
        }));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch collections');
      } finally {
        setLoadingDb(null);
      }
    },
    [vaultId]
  );

  // Initial fetch
  useEffect(() => {
    fetchDatabases();
  }, [fetchDatabases]);

  // Auto-expand selected database
  useEffect(() => {
    if (selectedDatabase && !expandedDbs.has(selectedDatabase)) {
      setExpandedDbs(prev => new Set([...prev, selectedDatabase]));
      if (!collections[selectedDatabase]) {
        fetchCollections(selectedDatabase);
      }
    }
  }, [selectedDatabase, expandedDbs, collections, fetchCollections]);

  const handleToggleDb = (dbName: string) => {
    const newExpanded = new Set(expandedDbs);
    if (newExpanded.has(dbName)) {
      newExpanded.delete(dbName);
    } else {
      newExpanded.add(dbName);
      if (!collections[dbName]) {
        fetchCollections(dbName);
      }
    }
    setExpandedDbs(newExpanded);
  };

  const handleCreateCollection = async () => {
    if (!createDbName || !newCollectionName) return;

    setCreating(true);
    try {
      const response = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vaultId,
          database: createDbName,
          collectionName: newCollectionName,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to create collection');
      }

      // Refresh collections
      await fetchCollections(createDbName);
      setCreateDialogOpen(false);
      setNewCollectionName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create collection');
    } finally {
      setCreating(false);
    }
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  return (
    <Paper variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="subtitle1" fontWeight={500}>
            Collections
          </Typography>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Refresh">
              <IconButton size="small" onClick={fetchDatabases} disabled={loading}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </Box>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ m: 1 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Loading */}
      {loading && (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress size={24} />
        </Box>
      )}

      {/* Database list */}
      {!loading && (
        <List sx={{ flex: 1, overflow: 'auto' }} dense>
          {databases.map(db => (
            <React.Fragment key={db.name}>
              <ListItemButton onClick={() => handleToggleDb(db.name)}>
                <ListItemIcon>
                  <DatabaseIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={db.name}
                  secondary={db.sizeOnDisk ? formatSize(db.sizeOnDisk) : undefined}
                />
                {loadingDb === db.name ? (
                  <CircularProgress size={16} />
                ) : expandedDbs.has(db.name) ? (
                  <CollapseIcon />
                ) : (
                  <ExpandIcon />
                )}
              </ListItemButton>

              <Collapse in={expandedDbs.has(db.name)}>
                <List disablePadding>
                  {/* Add collection button */}
                  <ListItemButton
                    sx={{ pl: 4 }}
                    onClick={() => {
                      setCreateDbName(db.name);
                      setCreateDialogOpen(true);
                    }}
                  >
                    <ListItemIcon>
                      <AddIcon fontSize="small" color="action" />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="body2" color="text.secondary">
                          New Collection
                        </Typography>
                      }
                    />
                  </ListItemButton>

                  {/* Collections */}
                  {collections[db.name]?.map(coll => (
                    <ListItem
                      key={coll.name}
                      sx={{
                        pl: 4,
                        bgcolor:
                          selectedDatabase === db.name && selectedCollection === coll.name
                            ? 'action.selected'
                            : undefined,
                      }}
                      secondaryAction={
                        <Stack direction="row" spacing={0.5}>
                          <Tooltip title="Import Data">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                onImportToCollection?.(db.name, coll.name);
                              }}
                            >
                              <ImportIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      }
                    >
                      <ListItemButton
                        onClick={() => onSelectCollection?.(db.name, coll.name)}
                      >
                        <ListItemIcon>
                          <CollectionIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary={coll.name}
                          secondary={
                            <Stack direction="row" spacing={1}>
                              <Chip
                                label={`${coll.documentCount.toLocaleString()} docs`}
                                size="small"
                                variant="outlined"
                              />
                              {coll.type === 'view' && (
                                <Chip label="View" size="small" color="info" />
                              )}
                            </Stack>
                          }
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}

                  {/* Empty state */}
                  {collections[db.name]?.length === 0 && (
                    <ListItem sx={{ pl: 4 }}>
                      <ListItemText
                        primary={
                          <Typography variant="body2" color="text.secondary" fontStyle="italic">
                            No collections
                          </Typography>
                        }
                      />
                    </ListItem>
                  )}
                </List>
              </Collapse>
            </React.Fragment>
          ))}

          {/* Empty state */}
          {databases.length === 0 && !loading && (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">No databases found</Typography>
            </Box>
          )}
        </List>
      )}

      {/* Create collection dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)}>
        <DialogTitle>Create New Collection</DialogTitle>
        <DialogContent>
          <TextField
            label="Database"
            value={createDbName}
            disabled
            fullWidth
            margin="normal"
          />
          <TextField
            label="Collection Name"
            value={newCollectionName}
            onChange={(e) => setNewCollectionName(e.target.value)}
            fullWidth
            margin="normal"
            autoFocus
            helperText="Use alphanumeric characters and underscores"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateCollection}
            disabled={!newCollectionName || creating}
          >
            {creating ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
