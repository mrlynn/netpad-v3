'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Tooltip,
  CircularProgress,
  alpha,
  Alert,
  InputAdornment,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Chip,
} from '@mui/material';
import {
  Rocket,
  ContentCopy,
  OpenInNew,
  Check,
  Close,
  Edit,
  Public,
  Link as LinkIcon,
} from '@mui/icons-material';
import { FormDataSource } from '@/types/form';
import { generateSlug, validateSlug, buildFormUrl } from '@/lib/slugs';

interface Connection {
  vaultId: string;
  name: string;
  database: string;
  allowedCollections: string[];
  status: 'active' | 'disabled';
}

interface PublishDialogProps {
  open: boolean;
  onClose: () => void;
  formName: string;
  formSlug?: string;
  formConfigDataSource?: FormDataSource;
  organizationId?: string;
  organizationSlug?: string;
  projectId?: string;
  isPublished?: boolean;
  onPublish: (config: {
    name: string;
    slug: string;
    dataSource?: FormDataSource;
  }) => Promise<{ success: boolean; error?: string }>;
  onConfigureStorage?: () => void;
}

export function PublishDialog({
  open,
  onClose,
  formName: initialFormName,
  formSlug: initialFormSlug,
  formConfigDataSource,
  organizationId,
  organizationSlug,
  projectId,
  isPublished = false,
  onPublish,
  onConfigureStorage,
}: PublishDialogProps) {
  const [formName, setFormName] = useState(initialFormName || '');
  const [slug, setSlug] = useState(initialFormSlug || '');
  const [isEditingSlug, setIsEditingSlug] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);

  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedVaultId, setSelectedVaultId] = useState<string>(formConfigDataSource?.vaultId || '');
  const [selectedCollection, setSelectedCollection] = useState<string>(formConfigDataSource?.collection || '');
  const [availableCollections, setAvailableCollections] = useState<string[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [loadingCollections, setLoadingCollections] = useState(false);

  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Auto-generate slug from form name if not set
  useEffect(() => {
    if (!slug && formName) {
      setSlug(generateSlug(formName));
    }
  }, [formName, slug]);

  // Update slug when form name changes (only if user hasn't manually edited)
  useEffect(() => {
    if (!isEditingSlug && !initialFormSlug && formName) {
      setSlug(generateSlug(formName));
    }
  }, [formName, isEditingSlug, initialFormSlug]);

  // Check slug availability with debounce
  useEffect(() => {
    if (!slug || !organizationId) {
      setSlugAvailable(null);
      setSlugError(null);
      return;
    }

    // Validate format first
    const validation = validateSlug(slug);
    if (!validation.valid) {
      setSlugError(validation.error || 'Invalid slug');
      setSlugAvailable(false);
      return;
    }

    setSlugError(null);
    setCheckingSlug(true);

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/forms/check-slug?slug=${encodeURIComponent(slug)}&orgId=${organizationId}`
        );
        const data = await response.json();

        if (data.available !== undefined) {
          setSlugAvailable(data.available);
          if (!data.available && !data.isCurrentSlug) {
            setSlugError('This URL is already taken');
          }
        }
      } catch (err) {
        console.error('Error checking slug:', err);
      } finally {
        setCheckingSlug(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [slug, organizationId]);

  // Load connections
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
      const decryptResponse = await fetch(
        `/api/organizations/${organizationId}/vault/${selectedVaultId}/decrypt`
      );
      const decryptData = await decryptResponse.json();

      if (!decryptData.connectionString) {
        console.error('Failed to decrypt vault connection');
        return;
      }

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
      setError('Please enter a form name');
      return;
    }

    if (!slug.trim()) {
      setError('Please enter a URL slug');
      return;
    }

    const validation = validateSlug(slug);
    if (!validation.valid) {
      setError(validation.error || 'Invalid slug');
      return;
    }

    setPublishing(true);
    setError(null);

    try {
      let dataSource: FormDataSource | undefined = formConfigDataSource;

      if (!dataSource && selectedVaultId && selectedCollection) {
        dataSource = {
          vaultId: selectedVaultId,
          collection: selectedCollection,
        };
      }

      const result = await onPublish({
        name: formName.trim(),
        slug: slug.trim(),
        dataSource,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to publish form');
      }

      // Success - close dialog
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPublishing(false);
    }
  };

  const handleCopyUrl = async () => {
    const url = formUrl;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Build the form URL
  const formUrl = organizationSlug
    ? buildFormUrl(organizationSlug, slug || 'your-form', {
        protocol: typeof window !== 'undefined' && window.location.protocol === 'http:' ? 'http' : 'https',
        rootDomain: typeof window !== 'undefined' && window.location.hostname.includes('localhost')
          ? 'localhost:3000'
          : 'netpad.io',
      })
    : `${typeof window !== 'undefined' ? window.location.origin : ''}/forms/${slug || 'your-form'}`;

  const hasDataSource = !!(formConfigDataSource?.vaultId && formConfigDataSource?.collection);
  const needsCollectionSelection = !hasDataSource && organizationId;

  return (
    <Dialog
      open={open}
      onClose={() => !publishing && onClose()}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: 'hidden',
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              background: isPublished
                ? 'linear-gradient(135deg, #00ED64 0%, #4DFF9F 100%)'
                : 'linear-gradient(135deg, #9c27b0 0%, #ba68c8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isPublished ? (
              <Public sx={{ color: '#001E2B' }} />
            ) : (
              <Rocket sx={{ color: '#fff' }} />
            )}
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {isPublished ? 'Update Published Form' : 'Publish Form'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {isPublished ? 'Update your live form settings' : 'Make your form live and shareable'}
            </Typography>
          </Box>
        </Box>
        <IconButton
          onClick={onClose}
          disabled={publishing}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
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
          size="small"
          placeholder="e.g., Contact Form, Event Registration"
          sx={{ mb: 3, mt: 1 }}
        />

        {/* URL Preview & Slug Editor */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Form URL
          </Typography>

          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: alpha('#00ED64', 0.05),
              border: '1px solid',
              borderColor: slugError
                ? 'error.main'
                : slugAvailable === true
                  ? alpha('#00ED64', 0.5)
                  : 'divider',
            }}
          >
            {!isEditingSlug ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LinkIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: 'monospace',
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {formUrl}
                </Typography>

                <Tooltip title="Edit URL">
                  <IconButton size="small" onClick={() => setIsEditingSlug(true)}>
                    <Edit fontSize="small" />
                  </IconButton>
                </Tooltip>

                <Tooltip title={copied ? 'Copied!' : 'Copy URL'}>
                  <IconButton size="small" onClick={handleCopyUrl}>
                    {copied ? <Check fontSize="small" color="success" /> : <ContentCopy fontSize="small" />}
                  </IconButton>
                </Tooltip>
              </Box>
            ) : (
              <Box>
                <TextField
                  fullWidth
                  size="small"
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                    setSlugAvailable(null);
                  }}
                  error={!!slugError}
                  helperText={slugError}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                          {organizationSlug ? `${organizationSlug}.netpad.io/` : '/forms/'}
                        </Typography>
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        {checkingSlug ? (
                          <CircularProgress size={16} />
                        ) : slugAvailable === true ? (
                          <Chip label="Available" size="small" color="success" />
                        ) : slugAvailable === false && !slugError ? (
                          <Chip label="Taken" size="small" color="error" />
                        ) : null}
                      </InputAdornment>
                    ),
                  }}
                  autoFocus
                  onBlur={() => setIsEditingSlug(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setIsEditingSlug(false);
                    }
                  }}
                />
              </Box>
            )}
          </Box>

          {organizationSlug && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              Your form will be accessible at this custom URL
            </Typography>
          )}
        </Box>

        {/* Data Storage Selection (if needed) */}
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
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} disabled={publishing}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handlePublish}
          disabled={
            !formName.trim() ||
            !slug.trim() ||
            Boolean(slugError) ||
            publishing ||
            Boolean(needsCollectionSelection && (!selectedVaultId || !selectedCollection))
          }
          startIcon={publishing ? <CircularProgress size={16} /> : <Rocket />}
          sx={{
            background: 'linear-gradient(135deg, #9c27b0 0%, #ba68c8 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #7b1fa2 0%, #ab47bc 100%)',
            },
          }}
        >
          {publishing ? 'Publishing...' : isPublished ? 'Update' : 'Publish'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
