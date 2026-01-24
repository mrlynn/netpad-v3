/**
 * Submit to Marketplace Dialog
 *
 * Allows users to submit applications, forms, workflows, or extensions
 * to the marketplace for approval.
 */

'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  Alert,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  alpha,
  Autocomplete,
  Stack,
  Paper,
  Tabs,
  Tab,
  Divider,
} from '@mui/material';
import {
  Article as FormIcon,
  AccountTree as WorkflowIcon,
  Inventory as BundleIcon,
  CloudUpload as PublishIcon,
  Extension as ExtensionIcon,
  Code as CodeIcon,
  Link as LinkIcon,
} from '@mui/icons-material';
import { MarketplaceItemType, ApplicationManifest } from '@/types/template';
import { NetPadSpinner } from '@/components/common/NetPadLoader';

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
  'integrations',
  'developer-tools',
  'ai-ml',
  'data-processing',
  'other',
];

const COMMON_TAGS = [
  'form',
  'workflow',
  'automation',
  'customer-service',
  'data-collection',
  'onboarding',
  'feedback',
  'survey',
  'healthcare',
  'finance',
  'education',
  'internal-tools',
  'extension',
  'workflow-node',
  'integration',
  'ai',
  'api',
];

interface SubmitToMarketplaceDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type SubmitMethod = 'npm' | 'json';

const ITEM_TYPES: { value: MarketplaceItemType; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'extension', label: 'Extension', icon: <ExtensionIcon />, color: '#a855f7' },
  { value: 'application', label: 'Application', icon: <BundleIcon />, color: '#00ED64' },
  { value: 'form', label: 'Form', icon: <FormIcon />, color: '#2196F3' },
  { value: 'workflow', label: 'Workflow', icon: <WorkflowIcon />, color: '#9C27B0' },
];

export function SubmitToMarketplaceDialog({
  open,
  onClose,
  onSuccess,
}: SubmitToMarketplaceDialogProps) {
  // Tab state for submission method
  const [submitMethod, setSubmitMethod] = useState<SubmitMethod>('npm');

  // Form state
  const [itemType, setItemType] = useState<MarketplaceItemType>('extension');
  const [npmPackage, setNpmPackage] = useState('');
  const [jsonContent, setJsonContent] = useState('');
  const [name, setName] = useState('');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [version, setVersion] = useState('1.0.0');
  const [category, setCategory] = useState('other');
  const [tags, setTags] = useState<string[]>([]);
  const [icon, setIcon] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [minNetPadVersion, setMinNetPadVersion] = useState('');

  // Status
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fetchingNpm, setFetchingNpm] = useState(false);

  const selectedType = ITEM_TYPES.find(t => t.value === itemType) || ITEM_TYPES[0];

  // Fetch npm package info
  const handleFetchNpmInfo = async () => {
    if (!npmPackage.trim()) {
      setError('Please enter an npm package name');
      return;
    }

    setFetchingNpm(true);
    setError(null);

    try {
      const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(npmPackage.trim())}`);

      if (!response.ok) {
        throw new Error(`Package "${npmPackage}" not found on npm`);
      }

      const data = await response.json();
      const latestVersion = data['dist-tags']?.latest;
      const pkg = data.versions?.[latestVersion];

      if (!pkg) {
        throw new Error('Could not find latest version');
      }

      // Auto-fill form from package.json
      setName(pkg.netpad?.name || pkg.name);
      setDescription(pkg.netpad?.description || pkg.description || '');
      setVersion(pkg.version);
      setTags(pkg.keywords || []);
      if (typeof pkg.author === 'string') {
        setAuthorName(pkg.author);
      } else if (pkg.author?.name) {
        setAuthorName(pkg.author.name);
      }

      // Detect type from netpad config
      if (pkg.netpad?.type === 'extension' || pkg.netpad?.workflowNodes) {
        setItemType('extension');
      } else if (pkg.netpad?.type === 'application') {
        setItemType('application');
      }

      if (pkg.netpad?.minNetPadVersion) {
        setMinNetPadVersion(pkg.netpad.minNetPadVersion);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch package info');
    } finally {
      setFetchingNpm(false);
    }
  };

  // Parse JSON content
  const handleParseJson = () => {
    if (!jsonContent.trim()) {
      setError('Please paste JSON content');
      return;
    }

    try {
      const parsed = JSON.parse(jsonContent);

      // Try to detect what type of JSON this is
      if (parsed.netpad) {
        // package.json with netpad config
        setName(parsed.netpad?.name || parsed.name);
        setDescription(parsed.netpad?.description || parsed.description || '');
        setVersion(parsed.version || '1.0.0');
        setTags(parsed.keywords || []);

        if (parsed.netpad?.type === 'extension' || parsed.netpad?.workflowNodes) {
          setItemType('extension');
        }
      } else if (parsed.manifest) {
        // Bundle export
        setName(parsed.manifest.name);
        setDescription(parsed.manifest.description || '');
        setVersion(parsed.manifest.version || '1.0.0');
        setSummary(parsed.manifest.summary || '');
        setCategory(parsed.manifest.category || 'other');
        setTags(parsed.manifest.tags || []);
        setIcon(parsed.manifest.icon || '');
      } else if (parsed.form || parsed.fieldConfigs) {
        // Form definition
        const form = parsed.form || parsed;
        setItemType('form');
        setName(form.name || 'Untitled Form');
        setDescription(form.description || '');
      } else if (parsed.workflow || parsed.canvas) {
        // Workflow definition
        const workflow = parsed.workflow || parsed;
        setItemType('workflow');
        setName(workflow.name || 'Untitled Workflow');
        setDescription(workflow.description || '');
      } else if (parsed.metadata && (parsed.workflowNodes || parsed.routes)) {
        // Extension definition
        setItemType('extension');
        setName(parsed.metadata.name);
        setDescription(parsed.metadata.description || '');
        setVersion(parsed.metadata.version || '1.0.0');
        setAuthorName(parsed.metadata.author || '');
      } else {
        throw new Error('Could not detect content type. Expected package.json, bundle, form, workflow, or extension definition.');
      }

      setError(null);
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError('Invalid JSON format');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to parse JSON');
      }
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    if (!summary.trim() && !description.trim()) {
      setError('Summary or description is required');
      return;
    }

    if (submitMethod === 'npm' && !npmPackage.trim()) {
      setError('npm package name is required');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Build the manifest
      const manifest: Partial<ApplicationManifest> = {
        name: name.trim(),
        version,
        summary: summary.trim() || undefined,
        description: description.trim() || undefined,
        category,
        tags: tags.length > 0 ? tags : undefined,
        icon: icon.trim() || undefined,
        author: authorName.trim() ? { name: authorName.trim() } : undefined,
      };

      // Build the request body
      let body: Record<string, any> = {
        itemType,
        manifest,
      };

      if (submitMethod === 'npm') {
        // For npm packages, we need to fetch the full package info
        const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(npmPackage.trim())}`);
        if (!response.ok) {
          throw new Error(`Package "${npmPackage}" not found on npm`);
        }

        const data = await response.json();
        const latestVersion = data['dist-tags']?.latest;
        const pkg = data.versions?.[latestVersion];

        if (itemType === 'extension') {
          // Build extension definition from npm package
          const netpad = pkg.netpad || {};
          const extension = {
            metadata: {
              id: netpad.extensionMetadata?.id || pkg.name.replace('@', '').replace('/', '-'),
              name: name.trim(),
              version,
              description: description.trim(),
              author: authorName.trim(),
            },
            features: netpad.features || [],
            workflowNodes: (netpad.workflowNodes || []).map((node: any) => ({
              definition: {
                type: node.type,
                label: node.label,
                description: node.description,
                category: node.category || 'custom',
                color: node.color || '#666666',
                icon: node.icon || 'Extension',
                version: node.version || '1.0.0',
                configFields: node.configFields,
                outputs: node.outputs,
              },
            })),
            routes: netpad.routes || [],
          };

          body.extension = extension;
          body.npmPackage = npmPackage.trim();
          body.minNetPadVersion = minNetPadVersion || netpad.minNetPadVersion;
          body.extensionMetadata = {
            extensionType: netpad.extensionType || 'node',
            nodeCount: extension.workflowNodes?.length || 0,
            nodeCategories: [...new Set(extension.workflowNodes?.map((n: any) => n.definition?.category).filter(Boolean) || [])],
            routeCount: extension.routes?.length || 0,
            npmPackage: npmPackage.trim(),
            minNetPadVersion: minNetPadVersion || netpad.minNetPadVersion,
            verified: false,
          };
        } else {
          body.source = 'npm';
          body.sourcePackageName = npmPackage.trim();
        }
      } else if (submitMethod === 'json' && jsonContent.trim()) {
        // Parse the JSON content and include it
        const parsed = JSON.parse(jsonContent);

        if (itemType === 'form') {
          const form = parsed.form || parsed;
          body.form = form;
          body.formMetadata = {
            fieldCount: form.fieldConfigs?.length || 0,
            formType: 'traditional',
            isMultiPage: !!form.multiPage?.enabled,
            hasConditionalLogic: form.fieldConfigs?.some((f: any) => f.conditionalLogic?.enabled) || false,
          };
        } else if (itemType === 'workflow') {
          const workflow = parsed.workflow || parsed;
          body.workflow = workflow;
          body.workflowMetadata = {
            nodeCount: workflow.canvas?.nodes?.length || 0,
            triggerType: 'manual',
            nodeTypes: [...new Set(workflow.canvas?.nodes?.map((n: any) => n.type) || [])],
          };
        } else if (itemType === 'extension') {
          const extension = parsed.metadata ? parsed : parsed.extension;
          body.extension = extension;
          body.extensionMetadata = {
            extensionType: 'node',
            nodeCount: extension.workflowNodes?.length || 0,
            nodeCategories: [...new Set(extension.workflowNodes?.map((n: any) => n.definition?.category).filter(Boolean) || [])],
            routeCount: extension.routes?.length || 0,
            verified: false,
          };
        } else if (parsed.manifest) {
          body.bundle = parsed;
        }
      }

      const response = await fetch('/api/marketplace/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit');
      }

      setSuccess(true);

      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 1500);
      }
    } catch (err) {
      console.error('Error submitting:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubmitMethod('npm');
    setItemType('extension');
    setNpmPackage('');
    setJsonContent('');
    setName('');
    setSummary('');
    setDescription('');
    setVersion('1.0.0');
    setCategory('other');
    setTags([]);
    setIcon('');
    setAuthorName('');
    setMinNetPadVersion('');
    setError(null);
    setSuccess(false);
  };

  const handleClose = () => {
    if (!submitting) {
      resetForm();
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              p: 1,
              borderRadius: 1,
              bgcolor: alpha(selectedType.color, 0.1),
              color: selectedType.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <PublishIcon />
          </Box>
          <Box>
            <Typography variant="h6">Submit to Marketplace</Typography>
            <Typography variant="caption" color="text.secondary">
              Share your application, form, workflow, or extension with the community
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

        {success ? (
          <Alert severity="success" sx={{ my: 2 }}>
            Your submission has been received and is pending review. You will be notified once it has been approved.
          </Alert>
        ) : (
          <Stack spacing={3} sx={{ mt: 1 }}>
            {/* Item Type Selection */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                What are you submitting?
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {ITEM_TYPES.map((type) => (
                  <Chip
                    key={type.value}
                    icon={type.icon as React.ReactElement}
                    label={type.label}
                    onClick={() => setItemType(type.value)}
                    variant={itemType === type.value ? 'filled' : 'outlined'}
                    sx={{
                      cursor: 'pointer',
                      bgcolor: itemType === type.value ? alpha(type.color, 0.15) : undefined,
                      borderColor: itemType === type.value ? type.color : undefined,
                      color: itemType === type.value ? type.color : undefined,
                      '& .MuiChip-icon': {
                        color: itemType === type.value ? type.color : undefined,
                      },
                    }}
                  />
                ))}
              </Box>
            </Box>

            <Divider />

            {/* Submission Method */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                How do you want to submit?
              </Typography>
              <Tabs
                value={submitMethod}
                onChange={(_, value) => setSubmitMethod(value)}
                sx={{ mb: 2 }}
              >
                <Tab
                  value="npm"
                  icon={<LinkIcon />}
                  iconPosition="start"
                  label="npm Package"
                />
                <Tab
                  value="json"
                  icon={<CodeIcon />}
                  iconPosition="start"
                  label="Paste JSON"
                />
              </Tabs>

              {submitMethod === 'npm' ? (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    label="npm Package Name"
                    value={npmPackage}
                    onChange={(e) => setNpmPackage(e.target.value)}
                    placeholder="@netpad/my-extension"
                    disabled={submitting}
                    helperText="Enter the full npm package name (e.g., @myorg/my-extension)"
                  />
                  <Button
                    variant="outlined"
                    onClick={handleFetchNpmInfo}
                    disabled={submitting || fetchingNpm || !npmPackage.trim()}
                    sx={{ minWidth: 100 }}
                  >
                    {fetchingNpm ? <NetPadSpinner size={20} /> : 'Fetch'}
                  </Button>
                </Box>
              ) : (
                <Box>
                  <TextField
                    fullWidth
                    multiline
                    rows={6}
                    label="JSON Content"
                    value={jsonContent}
                    onChange={(e) => setJsonContent(e.target.value)}
                    placeholder="Paste your package.json, bundle.json, form, workflow, or extension definition..."
                    disabled={submitting}
                  />
                  <Button
                    variant="outlined"
                    onClick={handleParseJson}
                    disabled={submitting || !jsonContent.trim()}
                    sx={{ mt: 1 }}
                  >
                    Parse & Auto-fill
                  </Button>
                </Box>
              )}
            </Box>

            <Divider />

            {/* Metadata Fields */}
            <Typography variant="subtitle2">Marketplace Listing Details</Typography>

            <TextField
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              required
              disabled={submitting}
              placeholder="My Awesome Extension"
            />

            <TextField
              label="Summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              fullWidth
              disabled={submitting}
              placeholder="A brief one-line summary..."
              helperText="Short description shown in marketplace listings"
            />

            <TextField
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              multiline
              rows={3}
              disabled={submitting}
              placeholder="Detailed description..."
              helperText="Full description (markdown supported)"
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Version"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                disabled={submitting}
                sx={{ width: 120 }}
                placeholder="1.0.0"
              />

              <FormControl fullWidth disabled={submitting}>
                <InputLabel>Category</InputLabel>
                <Select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  label="Category"
                >
                  {CATEGORIES.map((cat) => (
                    <MenuItem key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1).replace('-', ' ')}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Autocomplete
              multiple
              freeSolo
              options={COMMON_TAGS}
              value={tags}
              onChange={(_, newValue) => setTags(newValue as string[])}
              disabled={submitting}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    {...getTagProps({ index })}
                    key={option}
                    label={option}
                    size="small"
                    sx={{
                      bgcolor: alpha(selectedType.color, 0.1),
                      color: selectedType.color,
                    }}
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Tags"
                  placeholder="Add tags..."
                  helperText="Type and press Enter to add custom tags"
                />
              )}
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Icon (emoji)"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                disabled={submitting}
                sx={{ width: 120 }}
                placeholder="🔌"
                inputProps={{ maxLength: 4 }}
              />

              <TextField
                label="Author Name"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                fullWidth
                disabled={submitting}
                placeholder="Your name or organization"
              />
            </Box>

            {itemType === 'extension' && (
              <TextField
                label="Minimum NetPad Version"
                value={minNetPadVersion}
                onChange={(e) => setMinNetPadVersion(e.target.value)}
                disabled={submitting}
                placeholder="3.0.0"
                helperText="Optional: minimum NetPad version required"
                sx={{ width: 200 }}
              />
            )}

            {/* Preview */}
            <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(selectedType.color, 0.02) }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                Preview
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                {icon && (
                  <Typography variant="h4">{icon}</Typography>
                )}
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {name || 'Untitled'}
                    </Typography>
                    <Chip
                      label={selectedType.label}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: '0.65rem',
                        bgcolor: alpha(selectedType.color, 0.1),
                        color: selectedType.color,
                      }}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    v{version} • {category}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {summary || description || 'No description'}
                  </Typography>
                </Box>
              </Box>
            </Paper>

            <Alert severity="info">
              <Typography variant="caption">
                Your submission will be reviewed by an administrator before being published.
                You will be notified once it has been approved or if changes are requested.
              </Typography>
            </Alert>
          </Stack>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={submitting}>
          {success ? 'Close' : 'Cancel'}
        </Button>
        {!success && (
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={submitting || !name.trim()}
            startIcon={submitting ? <NetPadSpinner size={16} /> : <PublishIcon />}
            sx={{
              bgcolor: selectedType.color,
              color: itemType === 'extension' ? 'white' : '#001E2B',
              '&:hover': {
                bgcolor: alpha(selectedType.color, 0.85),
              },
            }}
          >
            {submitting ? 'Submitting...' : 'Submit for Review'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
