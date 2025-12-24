'use client';

import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  TextField,
  IconButton,
  Tooltip,
  CircularProgress,
  alpha,
  Snackbar,
  Alert,
  InputAdornment,
  Paper,
} from '@mui/material';
import {
  Rocket,
  ContentCopy,
  OpenInNew,
  Check,
  Close,
  Public,
  QrCode2,
  Share,
  Warning,
  Storage,
} from '@mui/icons-material';
import { FormConfiguration, FormDataSource } from '@/types/form';
import { saveFormConfiguration } from '@/lib/formStorage';
import { usePipeline } from '@/contexts/PipelineContext';

interface QuickPublishButtonProps {
  formConfig: Omit<FormConfiguration, 'createdAt' | 'updatedAt'> & {
    id?: string;
    slug?: string;
    isPublished?: boolean;
    name?: string;
  };
  onPublished?: (info: { id: string; slug: string; url: string }) => void;
  onConfigureStorage?: () => void;
  disabled?: boolean;
}

export function QuickPublishButton({
  formConfig,
  onPublished,
  onConfigureStorage,
  disabled = false,
}: QuickPublishButtonProps) {
  const { connectionString } = usePipeline();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showStorageWarning, setShowStorageWarning] = useState(false);
  const [formName, setFormName] = useState(formConfig.name || '');
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Check if data storage is configured (either new vault-based or legacy direct connection)
  const hasDataSource = !!(formConfig.dataSource?.vaultId && formConfig.dataSource?.collection);
  const hasLegacyConnection = !!(connectionString && formConfig.database && formConfig.collection);
  const hasValidStorage = hasDataSource || hasLegacyConnection;

  const handleQuickPublish = async () => {
    // If no data storage configured, show warning
    if (!hasValidStorage) {
      setShowStorageWarning(true);
      return;
    }

    // If no name, open dialog to get one
    if (!formName.trim()) {
      setDialogOpen(true);
      return;
    }

    await doPublish();
  };

  const doPublish = async () => {
    if (!formName.trim()) {
      setError('Please enter a form name');
      return;
    }

    setPublishing(true);
    setError(null);

    try {
      const config: FormConfiguration = {
        ...formConfig,
        name: formName.trim(),
        connectionString: connectionString || undefined,
      };

      // Debug: Log theme being published
      console.log('[QuickPublish] Publishing form with theme:', {
        hasTheme: !!config.theme,
        theme: config.theme,
        pageBackgroundColor: config.theme?.pageBackgroundColor,
        pageBackgroundGradient: config.theme?.pageBackgroundGradient,
        primaryColor: config.theme?.primaryColor,
      });

      const response = await fetch('/api/forms-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formConfig: config, publish: true }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to publish form');
      }

      // Save to localStorage
      const localConfig = { ...config, id: data.form.id, slug: data.form.slug };
      saveFormConfiguration(localConfig);

      // Generate shareable URL
      const url = `${window.location.origin}/forms/${data.form.slug}`;
      setPublishedUrl(url);

      // Notify parent
      onPublished?.({
        id: data.form.id,
        slug: data.form.slug,
        url,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPublishing(false);
    }
  };

  const handleCopyUrl = async () => {
    if (publishedUrl) {
      await navigator.clipboard.writeText(publishedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenForm = () => {
    if (publishedUrl) {
      window.open(publishedUrl, '_blank');
    }
  };

  const handleShare = async () => {
    if (publishedUrl && navigator.share) {
      try {
        await navigator.share({
          title: formName,
          text: `Check out this form: ${formName}`,
          url: publishedUrl,
        });
      } catch (err) {
        // User cancelled or share not supported
        handleCopyUrl();
      }
    } else {
      handleCopyUrl();
    }
  };

  const handleClose = () => {
    setDialogOpen(false);
    setPublishedUrl(null);
    setError(null);
  };

  // If already published, show different state
  if (formConfig.isPublished && formConfig.slug) {
    const currentUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/forms/${formConfig.slug}`;

    return (
      <>
        <Tooltip title="Form is published - click to copy link">
          <Button
            variant="contained"
            size="small"
            startIcon={<Public />}
            onClick={() => {
              navigator.clipboard.writeText(currentUrl);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            sx={{
              background: 'linear-gradient(135deg, #00ED64 0%, #4DFF9F 100%)',
              color: '#001E2B',
              fontWeight: 600,
              '&:hover': {
                background: 'linear-gradient(135deg, #00CC55 0%, #3DFF8F 100%)',
              },
            }}
          >
            {copied ? 'Copied!' : 'Published'}
          </Button>
        </Tooltip>
        <Snackbar
          open={copied}
          autoHideDuration={2000}
          onClose={() => setCopied(false)}
          message="Link copied to clipboard"
        />
      </>
    );
  }

  return (
    <>
      <Button
        variant="contained"
        size="small"
        startIcon={publishing ? <CircularProgress size={16} color="inherit" /> : <Rocket />}
        onClick={handleQuickPublish}
        disabled={disabled || publishing}
        sx={{
          background: 'linear-gradient(135deg, #9c27b0 0%, #ba68c8 100%)',
          color: '#fff',
          fontWeight: 600,
          '&:hover': {
            background: 'linear-gradient(135deg, #7b1fa2 0%, #ab47bc 100%)',
          },
          '&:disabled': {
            background: alpha('#9c27b0', 0.3),
            color: alpha('#fff', 0.5),
          },
        }}
      >
        {publishing ? 'Publishing...' : 'Publish'}
      </Button>

      {/* Quick Publish Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: 'hidden',
          },
        }}
      >
        {!publishedUrl ? (
          // Step 1: Enter name and publish
          <>
            <DialogTitle sx={{ pb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #9c27b0 0%, #ba68c8 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Rocket sx={{ color: '#fff' }} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Publish Your Form
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Make it live and shareable in seconds
                  </Typography>
                </Box>
              </Box>
            </DialogTitle>

            <DialogContent>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                  {error}
                </Alert>
              )}

              <TextField
                label="Form Name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                fullWidth
                required
                autoFocus
                placeholder="e.g., Contact Form, Event Registration"
                sx={{ mt: 1 }}
                helperText="Give your form a name so you can find it later"
              />

              <Box
                sx={{
                  mt: 3,
                  p: 2,
                  borderRadius: 2,
                  bgcolor: alpha('#9c27b0', 0.05),
                  border: '1px solid',
                  borderColor: alpha('#9c27b0', 0.2),
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Your form will be published at:
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: 'monospace',
                    mt: 0.5,
                    color: '#9c27b0',
                    fontWeight: 500,
                  }}
                >
                  {typeof window !== 'undefined' ? window.location.origin : ''}/forms/
                  {formName.trim()
                    ? formName
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/(^-|-$)/g, '')
                        .slice(0, 30)
                    : 'your-form-name'}
                </Typography>
              </Box>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 3 }}>
              <Button onClick={handleClose}>Cancel</Button>
              <Button
                onClick={doPublish}
                variant="contained"
                disabled={!formName.trim() || publishing}
                startIcon={publishing ? <CircularProgress size={16} /> : <Rocket />}
                sx={{
                  background: 'linear-gradient(135deg, #9c27b0 0%, #ba68c8 100%)',
                  px: 4,
                  '&:hover': {
                    background: 'linear-gradient(135deg, #7b1fa2 0%, #ab47bc 100%)',
                  },
                }}
              >
                {publishing ? 'Publishing...' : 'Publish Now'}
              </Button>
            </DialogActions>
          </>
        ) : (
          // Step 2: Show published URL with share options
          <>
            <DialogTitle sx={{ pb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #00ED64 0%, #4DFF9F 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Check sx={{ color: '#001E2B' }} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Your Form is Live!
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Share it with the world
                  </Typography>
                </Box>
              </Box>
            </DialogTitle>

            <DialogContent>
              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  borderRadius: 2,
                  bgcolor: alpha('#00ED64', 0.05),
                  border: '2px solid',
                  borderColor: '#00ED64',
                }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                  Shareable Link
                </Typography>
                <TextField
                  value={publishedUrl}
                  fullWidth
                  InputProps={{
                    readOnly: true,
                    sx: {
                      bgcolor: 'background.paper',
                      fontFamily: 'monospace',
                      fontSize: '0.9rem',
                    },
                    endAdornment: (
                      <InputAdornment position="end">
                        <Tooltip title="Copy link">
                          <IconButton onClick={handleCopyUrl} edge="end">
                            {copied ? <Check sx={{ color: '#00ED64' }} /> : <ContentCopy />}
                          </IconButton>
                        </Tooltip>
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>

              {/* Quick action buttons */}
              <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                <Button
                  variant="outlined"
                  startIcon={<OpenInNew />}
                  onClick={handleOpenForm}
                  fullWidth
                  sx={{
                    borderColor: alpha('#00ED64', 0.5),
                    color: '#00ED64',
                    '&:hover': {
                      borderColor: '#00ED64',
                      bgcolor: alpha('#00ED64', 0.05),
                    },
                  }}
                >
                  Open Form
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Share />}
                  onClick={handleShare}
                  fullWidth
                >
                  Share
                </Button>
              </Box>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 3 }}>
              <Button onClick={handleClose} variant="contained" fullWidth>
                Done
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Storage Warning Dialog */}
      <Dialog
        open={showStorageWarning}
        onClose={() => setShowStorageWarning(false)}
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
                bgcolor: alpha('#ff9800', 0.15),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Warning sx={{ color: '#ff9800' }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Data Storage Required
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Configure where form submissions will be saved
              </Typography>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              mt: 1,
              bgcolor: alpha('#ff9800', 0.05),
              border: '1px solid',
              borderColor: alpha('#ff9800', 0.2),
              borderRadius: 2,
            }}
          >
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              <Storage sx={{ color: '#ff9800', mt: 0.5 }} />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                  Before publishing, you need to configure data storage
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Form submissions need a MongoDB collection to be stored in. This ensures your
                  collected data is saved securely.
                </Typography>
              </Box>
            </Box>
          </Paper>

          <Box sx={{ mt: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              What you&apos;ll configure:
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 2.5, '& li': { mb: 0.5 } }}>
              <Typography component="li" variant="body2">
                Organization - Who owns this form
              </Typography>
              <Typography component="li" variant="body2">
                Connection - A secure MongoDB connection
              </Typography>
              <Typography component="li" variant="body2">
                Collection - Where submissions are stored
              </Typography>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setShowStorageWarning(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={<Storage />}
            onClick={() => {
              setShowStorageWarning(false);
              onConfigureStorage?.();
            }}
            sx={{
              background: 'linear-gradient(135deg, #00ED64 0%, #4DFF9F 100%)',
              color: '#001E2B',
              px: 3,
              '&:hover': {
                background: 'linear-gradient(135deg, #00CC55 0%, #3DFF8F 100%)',
              },
            }}
          >
            Configure Storage
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
