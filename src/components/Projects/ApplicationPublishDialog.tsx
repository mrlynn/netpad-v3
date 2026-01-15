/**
 * Application Publish Dialog
 *
 * Dialog for publishing an application bundle to the marketplace.
 * Allows users to set marketplace metadata before publishing.
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Autocomplete,
  Alert,
  CircularProgress,
  Divider,
  alpha,
  FormHelperText,
} from '@mui/material';
import {
  Publish as PublishIcon,
  Check as CheckIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { BundleExport, ApplicationManifest } from '@/types/template';
import { useAuth } from '@/contexts/AuthContext';

interface ApplicationPublishDialogProps {
  open: boolean;
  onClose: () => void;
  bundle?: BundleExport;
  releaseContext?: {
    orgId: string;
    projectId: string;
    applicationId: string;
    releaseId: string;
    baseManifest: Partial<ApplicationManifest>;
    changelog?: string;
    counts?: { forms?: number; workflows?: number; connections?: number };
  };
  onPublished?: (applicationId: string) => void;
}

const CATEGORIES = [
  'helpdesk',
  'onboarding',
  'survey',
  'ecommerce',
  'healthcare',
  'finance',
  'education',
  'realestate',
  'business',
  'events',
  'support',
  'other',
];

const COMMON_TAGS = [
  'forms',
  'workflows',
  'automation',
  'data-collection',
  'notifications',
  'integrations',
  'mongodb',
  'email',
  'slack',
  'webhook',
  'ai',
  'analytics',
];

export function ApplicationPublishDialog({
  open,
  onClose,
  bundle,
  releaseContext,
  onPublished,
}: ApplicationPublishDialogProps) {
  const { user } = useAuth();
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const sourceManifest: Partial<ApplicationManifest> = (bundle?.manifest as ApplicationManifest) || releaseContext?.baseManifest || {};

  // Form state - initialized from existing data
  const [name, setName] = useState('');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [version, setVersion] = useState('');
  const [category, setCategory] = useState('other');
  const [tags, setTags] = useState<string[]>([]);
  const [icon, setIcon] = useState('📦');
  const [authorName, setAuthorName] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');
  const [license, setLicense] = useState('MIT');
  const [publishNow, setPublishNow] = useState(true);
  const [changelog, setChangelog] = useState('');
  const [existingMarketplaceApp, setExistingMarketplaceApp] = useState<any>(null);

  // Initialize form fields from existing data when dialog opens or data changes
  useEffect(() => {
    if (open) {
      // Application name (required, always available)
      setName(sourceManifest.name || '');

      // Description (pre-fill from application)
      setDescription(sourceManifest.description || '');

      // Summary: try to derive from changelog, then description, but user can edit
      let derivedSummary = '';
      if (releaseContext?.changelog) {
        // Use first line of changelog as summary
        derivedSummary = releaseContext.changelog.split('\n')[0].trim();
      } else if (sourceManifest.description) {
        // Fall back to first sentence of description
        derivedSummary = sourceManifest.description.split('.')[0] + (sourceManifest.description.includes('.') ? '.' : '');
      }
      setSummary(derivedSummary);

      // Version (from release)
      setVersion(sourceManifest.version || '1.0.0');

      // Changelog (from release context)
      setChangelog(releaseContext?.changelog || '');

      // Check if application already exists in marketplace (async)
      const checkExistingApp = async () => {
        if (sourceManifest.id || sourceManifest.name) {
          try {
            const appId = sourceManifest.id || `app_${(sourceManifest.name || '').toLowerCase().replace(/\s+/g, '-')}_${sourceManifest.version || '1.0.0'}`;
            const checkResponse = await fetch(`/api/marketplace/applications/${appId}`);
            if (checkResponse.ok) {
              const existingData = await checkResponse.json();
              if (existingData.id) {
                setExistingMarketplaceApp(existingData);
              }
            }
          } catch {
            // Ignore errors - just means it's a new application
          }
        }
      };
      checkExistingApp();

      // Category (default to 'other', but try to infer from tags if possible)
      const inferredCategory = inferCategoryFromTags(sourceManifest.tags || []);
      setCategory(inferredCategory || sourceManifest.category || 'other');

      // Tags (from application)
      setTags(sourceManifest.tags || []);

      // Icon (from application)
      setIcon((sourceManifest as { icon?: string }).icon || '📦');

      // Author info (from user session)
      setAuthorName(
        user?.displayName ||
        (typeof sourceManifest.author === 'object' ? sourceManifest.author?.name : '') ||
        user?.email?.split('@')[0] ||
        ''
      );
      setAuthorEmail(
        user?.email ||
        (typeof sourceManifest.author === 'object' ? sourceManifest.author?.email : '') ||
        ''
      );

      // License (default to MIT)
      setLicense(sourceManifest.license || 'MIT');
    }
  }, [open, sourceManifest, user]);

  // Helper to infer category from tags
  const inferCategoryFromTags = (tags: string[]): string | null => {
    const tagLower = tags.map(t => t.toLowerCase());
    if (tagLower.some(t => ['helpdesk', 'support', 'ticket'].includes(t))) return 'helpdesk';
    if (tagLower.some(t => ['onboarding', 'onboard'].includes(t))) return 'onboarding';
    if (tagLower.some(t => ['survey', 'feedback', 'poll'].includes(t))) return 'survey';
    if (tagLower.some(t => ['ecommerce', 'shop', 'store', 'order'].includes(t))) return 'ecommerce';
    if (tagLower.some(t => ['healthcare', 'health', 'medical', 'patient'].includes(t))) return 'healthcare';
    if (tagLower.some(t => ['finance', 'financial', 'payment', 'billing'].includes(t))) return 'finance';
    if (tagLower.some(t => ['education', 'school', 'student', 'course'].includes(t))) return 'education';
    if (tagLower.some(t => ['realestate', 'property', 'rental'].includes(t))) return 'realestate';
    if (tagLower.some(t => ['event', 'events', 'registration'].includes(t))) return 'events';
    if (tagLower.some(t => ['business', 'enterprise'].includes(t))) return 'business';
    return null;
  };

  const handlePublish = async () => {
    if (!name.trim()) {
      setError('Application name is required');
      return;
    }

    if (!summary.trim()) {
      setError('Summary is required (1-2 sentences describing the application)');
      return;
    }

    if (!category) {
      setError('Category is required');
      return;
    }

    setPublishing(true);
    setError(null);

    try {
      // Create enhanced manifest (used for both bundle and release publishing)
      const existingManifest = sourceManifest as ApplicationManifest;
      const manifest: ApplicationManifest = {
        ...(bundle?.manifest || {}),
        ...existingManifest,
        id: existingManifest.id || `app_${name.toLowerCase().replace(/\s+/g, '-')}_${version}`,
        name: name.trim(),
        version: version.trim(),
        summary: summary.trim(),
        description: description.trim() || summary.trim(),
        category,
        tags: tags.length > 0 ? tags : existingManifest.tags || [],
        icon: icon || '📦',
        author: {
          name: authorName.trim() || 'Anonymous',
          email: authorEmail.trim() || undefined,
        },
        license: license || 'MIT',
      };

      const response = await fetch('/api/marketplace/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(releaseContext
            ? {
                orgId: releaseContext.orgId,
                projectId: releaseContext.projectId,
                applicationId: releaseContext.applicationId,
                releaseId: releaseContext.releaseId,
                manifest: {
                  ...manifest,
                  changelog: changelog.trim()
                    ? [
                        {
                          version: version.trim(),
                          date: new Date().toISOString(),
                          changes: changelog.trim().split('\n').filter(Boolean),
                        },
                      ]
                    : releaseContext.changelog
                    ? [
                        {
                          version: version.trim(),
                          date: new Date().toISOString(),
                          changes: releaseContext.changelog.split('\n').filter(Boolean),
                        },
                      ]
                    : undefined,
                },
                publish: publishNow,
              }
            : {
                bundle: {
                  ...(bundle as BundleExport),
                  manifest: {
                    ...manifest,
                    changelog: changelog.trim()
                      ? [
                          {
                            version: version.trim(),
                            date: new Date().toISOString(),
                            changes: changelog.trim().split('\n').filter(Boolean),
                          },
                        ]
                      : undefined,
                  },
                },
                publish: publishNow,
              }),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to publish application');
      }

      const result = await response.json();
      setSuccess(true);
      setSuccessMessage(result.application?.message || 'Application submitted successfully!');

      if (onPublished) {
        onPublished(result.application.id);
      }

      // Close after a brief delay (longer if pending review)
      const delay = result.application?.status === 'pending' ? 4000 : 2000;
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setSuccessMessage(null);
      }, delay);
    } catch (err) {
      console.error('Error publishing application:', err);
      setError(err instanceof Error ? err.message : 'Failed to publish application');
    } finally {
      setPublishing(false);
    }
  };

  const handleClose = () => {
    if (!publishing) {
      setError(null);
      setSuccess(false);
      setSuccessMessage(null);
      // Reset form state when closing
      setName('');
      setSummary('');
      setDescription('');
      setVersion('');
      setCategory('other');
      setTags([]);
      setIcon('📦');
      setAuthorName('');
      setAuthorEmail('');
      setLicense('MIT');
      setChangelog('');
      setExistingMarketplaceApp(null);
      onClose();
    }
  };

  const formsCount = releaseContext?.counts?.forms ?? bundle?.forms?.length ?? 0;
  const workflowsCount = releaseContext?.counts?.workflows ?? bundle?.workflows?.length ?? 0;
  const connectionsCount = releaseContext?.counts?.connections ?? bundle?.connections?.length ?? 0;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PublishIcon sx={{ color: '#00ED64' }} />
          <Typography variant="h6">Publish to Marketplace</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert
            severity={successMessage?.includes('pending') || successMessage?.includes('review') ? 'info' : 'success'}
            icon={<CheckIcon />}
            sx={{ mb: 2 }}
          >
            {successMessage || 'Application published successfully!'}
          </Alert>
        )}

        {/* Preview Summary */}
        <Box
          sx={{
            p: 2,
            mb: 3,
            bgcolor: alpha('#00ED64', 0.02),
            border: `1px solid ${alpha('#00ED64', 0.2)}`,
            borderRadius: 1,
          }}
        >
          <Typography variant="subtitle2" sx={{ mb: 1, color: '#00ED64' }}>
            Application Preview
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            {formsCount} Forms • {workflowsCount} Workflows • {connectionsCount} Connections
          </Typography>
          <Typography variant="caption" color="text.secondary">
            This application will be available in the marketplace for others to import and use.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Basic Information */}
          <Typography variant="subtitle2">Basic Information</Typography>

          <TextField
            label="Application Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            fullWidth
            helperText="Pre-filled from your application"
            InputProps={{
              readOnly: true,
            }}
            sx={{
              '& .MuiInputBase-input': {
                bgcolor: alpha('#00ED64', 0.05),
              },
            }}
          />

          <TextField
            label="Summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            required
            fullWidth
            multiline
            rows={2}
            helperText="1-2 sentences for marketplace listing (auto-filled from changelog/description, please review)"
            placeholder="Complete IT help desk system with ticket submission, automated routing, and notifications"
          />

          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={3}
            helperText="Pre-filled from your application (optional to edit)"
          />

          {/* Changelog - required for new versions */}
          {existingMarketplaceApp && (
            <TextField
              label="Changelog"
              value={changelog}
              onChange={(e) => setChangelog(e.target.value)}
              required
              fullWidth
              multiline
              rows={4}
              helperText="Required: Describe what changed in this version"
              placeholder="• Added new form fields\n• Improved workflow automation\n• Fixed bug with email notifications"
            />
          )}

          {/* Update Notice */}
          {existingMarketplaceApp && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                This will publish a new version of your existing marketplace application.
                Current version: <strong>v{existingMarketplaceApp.manifest?.version || 'unknown'}</strong>
              </Typography>
            </Alert>
          )}

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Version"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              required
              helperText={existingMarketplaceApp ? "New version number (must be higher than current)" : "Pre-filled from release version"}
              InputProps={{
                readOnly: !existingMarketplaceApp, // Allow editing if updating
              }}
              sx={{
                flex: 1,
                '& .MuiInputBase-input': {
                  bgcolor: existingMarketplaceApp ? undefined : alpha('#00ED64', 0.05),
                },
              }}
            />
            <TextField
              label="Icon"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              sx={{ width: 120 }}
              helperText="Pre-filled from application"
            />
          </Box>

          <Divider />

          {/* Categorization */}
          <Typography variant="subtitle2">Categorization</Typography>

          <FormControl fullWidth required>
            <InputLabel>Category</InputLabel>
            <Select value={category} onChange={(e) => setCategory(e.target.value)} label="Category">
              {CATEGORIES.map((cat) => (
                <MenuItem key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>Choose the primary category for your application</FormHelperText>
          </FormControl>

          <Autocomplete
            multiple
            freeSolo
            options={COMMON_TAGS}
            value={tags}
            onChange={(_, newValue) => setTags(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Tags"
                helperText="Pre-filled from application tags (add more if needed)"
                placeholder="Type to add tags"
              />
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  {...getTagProps({ index })}
                  key={option}
                  label={option}
                  size="small"
                  sx={{
                    bgcolor: alpha('#00ED64', 0.1),
                    color: '#00ED64',
                  }}
                />
              ))
            }
          />

          <Divider />

          {/* Author Information */}
          <Typography variant="subtitle2">Author Information</Typography>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Author Name"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              fullWidth
              helperText="Pre-filled from your account"
            />
            <TextField
              label="Author Email"
              value={authorEmail}
              onChange={(e) => setAuthorEmail(e.target.value)}
              fullWidth
              type="email"
              helperText="Pre-filled from your account"
            />
          </Box>

          <FormControl fullWidth>
            <InputLabel>License</InputLabel>
            <Select value={license} onChange={(e) => setLicense(e.target.value)} label="License">
              <MenuItem value="MIT">MIT</MenuItem>
              <MenuItem value="Apache-2.0">Apache 2.0</MenuItem>
              <MenuItem value="GPL-3.0">GPL 3.0</MenuItem>
              <MenuItem value="BSD-3-Clause">BSD 3-Clause</MenuItem>
              <MenuItem value="Proprietary">Proprietary</MenuItem>
              <MenuItem value="Other">Other</MenuItem>
            </Select>
            <FormHelperText>License for your application</FormHelperText>
          </FormControl>

          <Divider />

          {/* Publishing Options */}
          <Typography variant="subtitle2">Publishing Options</Typography>

          <Alert severity="info" icon={<WarningIcon />}>
            <Typography variant="body2">
              {publishNow
                ? 'Your application will be published immediately and visible to all marketplace users.'
                : 'Your application will be saved as a draft. You can publish it later from "My Applications".'}
            </Typography>
          </Alert>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={publishing}>
          Cancel
        </Button>
        <Button
          onClick={handlePublish}
          variant="contained"
          disabled={publishing || !name.trim() || !summary.trim() || !category}
          startIcon={publishing ? <CircularProgress size={16} /> : <PublishIcon />}
          sx={{
            bgcolor: '#00ED64',
            '&:hover': {
              bgcolor: '#00CC55',
            },
          }}
        >
          {publishing ? 'Publishing...' : publishNow ? 'Publish Now' : 'Save as Draft'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
