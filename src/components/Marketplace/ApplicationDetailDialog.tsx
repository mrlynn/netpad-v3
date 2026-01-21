/**
 * Application Detail Dialog
 *
 * Shows full details of a marketplace application with preview
 * and import functionality.
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
  Alert,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
  alpha,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Stack,
} from '@mui/material';
import {
  Article as FormIcon,
  AccountTree as WorkflowIcon,
  Link as LinkIcon,
  ExpandMore as ExpandMoreIcon,
  Check as CheckIcon,
  PlayArrow as TriggerIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Star as StarIcon,
  CloudDownload as NpmIcon,
  InstallMobile as InstallIcon,
} from '@mui/icons-material';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useApplicationSafe } from '@/contexts/ApplicationContext';
import { usePathname, useRouter } from 'next/navigation';
import { parseOrgProjectFromPath } from '@/lib/routing';
import { FormWorkflowConnection } from '@/types/template';
import { ReviewForm } from './ReviewForm';
import { ReviewsList } from './ReviewsList';
import { RatingSummary } from './RatingSummary';
import { useAuth } from '@/contexts/AuthContext';
import { NetPadLoader, NetPadSpinner } from '@/components/common/NetPadLoader';

interface ApplicationDetailDialogProps {
  open: boolean;
  onClose: () => void;
  applicationId: string;
  organizationId?: string; // Optional - uses context if not provided
  onImportComplete?: () => void;
}

interface ApplicationDetail {
  id: string;
  manifest: {
    name: string;
    version: string;
    description?: string;
    summary?: string;
    category: string;
    tags?: string[];
    icon?: string;
    author?: { name: string; email?: string; url?: string };
    license?: string;
  };
  preview: {
    formsCount: number;
    workflowsCount: number;
    connectionsCount: number;
    forms?: Array<{ name: string; description?: string }>;
    workflows?: Array<{ name: string; description?: string }>;
    connections?: Array<{
      formRef: string;
      workflowRef: string;
      type: string;
      description?: string;
    }>;
  };
  stats: {
    downloads: number;
    rating?: number;
    reviews: number;
    ratingDistribution?: {
      '5': number;
      '4': number;
      '3': number;
      '2': number;
      '1': number;
    };
  };
  publishedAt?: string;
  source?: 'web' | 'npm';
  sourcePackageName?: string;
  versions?: Array<{
    version: string;
    releaseId?: string;
    changelog?: string;
    publishedAt: string | Date;
    publishedBy: string;
  }>;
  latestVersion?: string;
}

export function ApplicationDetailDialog({
  open,
  onClose,
  applicationId,
  organizationId: propOrganizationId,
  onImportComplete,
}: ApplicationDetailDialogProps) {
  const { currentOrgId } = useOrganization();
  const { user } = useAuth();
  const applicationContext = useApplicationSafe();
  const router = useRouter();
  const pathname = usePathname();
  // Use prop orgId if provided, otherwise use context (for imports)
  const organizationId = propOrganizationId || currentOrgId || undefined;
  // Get projectId from URL if available, or from current application context
  const { projectId: urlProjectId } = parseOrgProjectFromPath(pathname);
  const projectId = urlProjectId || applicationContext?.currentProjectId || undefined;
  
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<ApplicationDetail | null>(null);
  const [userReview, setUserReview] = useState<any>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewsKey, setReviewsKey] = useState(0); // Force refresh reviews list

  // Import options
  const [generateNewIds, setGenerateNewIds] = useState(true);
  const [preserveSlugs, setPreserveSlugs] = useState(false);
  const [overwriteExisting, setOverwriteExisting] = useState(false);

  useEffect(() => {
    if (open && applicationId) {
      loadDetail();
      if (user) {
        loadUserReview();
      }
    } else {
      setDetail(null);
      setError(null);
      setUserReview(null);
      setShowReviewForm(false);
    }
  }, [open, applicationId, user]);

  const loadDetail = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/marketplace/applications/${applicationId}`);

      if (!response.ok) {
        throw new Error('Failed to load application details');
      }

      const data = await response.json();
      setDetail(data);
    } catch (err) {
      console.error('Error loading application detail:', err);
      setError(err instanceof Error ? err.message : 'Failed to load application');
    } finally {
      setLoading(false);
    }
  };

  const loadUserReview = async () => {
    if (!user) return;

    try {
      const response = await fetch(`/api/marketplace/applications/${applicationId}/reviews/me`);
      if (response.ok) {
        const data = await response.json();
        setUserReview(data.review);
      }
    } catch (err) {
      console.error('Error loading user review:', err);
    }
  };

  const handleReviewSubmit = async (reviewData: { rating: number; title?: string; review?: string }) => {
    try {
      const response = await fetch(`/api/marketplace/applications/${applicationId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewData),
      });

      if (!response.ok) {
        throw new Error('Failed to submit review');
      }

      const data = await response.json();
      setUserReview(data.review);
      setShowReviewForm(false);
      setReviewsKey((k) => k + 1); // Refresh reviews list
      await loadDetail(); // Reload to get updated stats
    } catch (err) {
      console.error('Error submitting review:', err);
      throw err;
    }
  };

  const handleReviewDelete = async () => {
    if (!userReview) return;

    try {
      const response = await fetch(
        `/api/marketplace/applications/${applicationId}/reviews/${userReview.reviewId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete review');
      }

      setUserReview(null);
      setShowReviewForm(false);
      setReviewsKey((k) => k + 1); // Refresh reviews list
      await loadDetail(); // Reload to get updated stats
    } catch (err) {
      console.error('Error deleting review:', err);
      throw err;
    }
  };

  const handleInstallFromNpm = async (packageName: string) => {
    if (!organizationId) {
      setError('Please select an organization to install the package.');
      return;
    }

    if (!projectId) {
      setError('Please select a project to install the package.');
      return;
    }

    setImporting(true);
    setError(null);

    try {
      const response = await fetch('/api/marketplace/npm/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageName,
          orgId: organizationId,
          projectId,
          overwriteExisting,
          installDependencies: true,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Installation failed');
      }

      const result = await response.json();
      
      if (onImportComplete) {
        onImportComplete();
      }

      // Show success and close
      alert(`Successfully installed ${packageName}@${result.version}!${result.applicationId ? `\nApplication ID: ${result.applicationId}` : ''}`);
      onClose();
    } catch (err) {
      console.error('Error installing package:', err);
      setError(err instanceof Error ? err.message : 'Failed to install package');
    } finally {
      setImporting(false);
    }
  };

  const handleImport = async () => {
    if (!detail) return;

    if (!organizationId) {
      setError('Please select an organization to import the application.');
      return;
    }

    if (!projectId) {
      setError('Please select an application from your workspace first. Click the app selector in the navigation bar to choose where to import this marketplace app.');
      return;
    }

    setImporting(true);
    setError(null);

    try {
      const response = await fetch(`/api/marketplace/applications/${applicationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: organizationId,
          projectId: projectId,
          options: {
            generateNewIds,
            preserveSlugs,
            overwriteExisting,
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Import failed');
      }

      const result = await response.json();

      if (onImportComplete) {
        onImportComplete();
      }

      // Refresh the application context so the new app appears in the switcher
      if (applicationContext?.refreshApplications) {
        await applicationContext.refreshApplications();
      }

      onClose();

      // Navigate to the newly imported application
      if (result.application?.appSlug) {
        router.push(`/apps/${result.application.appSlug}`);
      }
    } catch (err) {
      console.error('Error importing application:', err);
      setError(err instanceof Error ? err.message : 'Failed to import application');
    } finally {
      setImporting(false);
    }
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(`/api/marketplace/applications/${applicationId}?download=true`);

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${detail?.manifest.name || applicationId}-${detail?.manifest.version || 'latest'}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading application:', err);
      setError(err instanceof Error ? err.message : 'Failed to download application');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {detail?.manifest.icon && (
            <Typography variant="h4">{detail.manifest.icon}</Typography>
          )}
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6">{detail?.manifest.name || 'Application'}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="caption" color="text.secondary">
                v{detail?.manifest.version} • {detail?.manifest.category}
              </Typography>
              {detail?.source === 'npm' && detail?.sourcePackageName && (
                <Chip
                  icon={<NpmIcon sx={{ fontSize: 12 }} />}
                  label="npm"
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: '0.65rem',
                    bgcolor: alpha('#CB3837', 0.1),
                    color: '#CB3837',
                    border: `1px solid ${alpha('#CB3837', 0.3)}`,
                  }}
                />
              )}
            </Box>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <NetPadLoader size="small" message="Loading application details..." />
          </Box>
        ) : detail ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Summary */}
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                bgcolor: alpha('#00ED64', 0.02),
                borderColor: alpha('#00ED64', 0.2),
              }}
            >
              <Typography variant="body2" sx={{ mb: 1.5 }}>
                {detail.manifest.summary || detail.manifest.description}
              </Typography>
              {detail.source === 'npm' && detail.sourcePackageName && (
                <Box sx={{ mb: 1.5, p: 1, bgcolor: alpha('#CB3837', 0.05), borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                    npm Package:
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 500 }}>
                    {detail.sourcePackageName}
                  </Typography>
                </Box>
              )}
              <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <FormIcon fontSize="small" color="action" />
                  <Typography variant="caption">
                    {detail.preview.formsCount} Forms
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <WorkflowIcon fontSize="small" color="action" />
                  <Typography variant="caption">
                    {detail.preview.workflowsCount} Workflows
                  </Typography>
                </Box>
                {detail.preview.connectionsCount > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <LinkIcon fontSize="small" sx={{ color: '#00ED64' }} />
                    <Typography variant="caption" sx={{ color: '#00ED64' }}>
                      {detail.preview.connectionsCount} Connections
                    </Typography>
                  </Box>
                )}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <DownloadIcon fontSize="small" color="action" />
                  <Typography variant="caption">{detail.stats.downloads} downloads</Typography>
                </Box>
                {detail.stats.rating && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <StarIcon fontSize="small" sx={{ color: '#FFA500' }} />
                    <Typography variant="caption">{detail.stats.rating.toFixed(1)}</Typography>
                  </Box>
                )}
              </Stack>
            </Paper>

            {/* Forms */}
            {detail.preview.forms && detail.preview.forms.length > 0 && (
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FormIcon fontSize="small" />
                    <Typography variant="subtitle2">
                      Forms ({detail.preview.forms.length})
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0 }}>
                  <List dense disablePadding>
                    {detail.preview.forms.map((form, index) => (
                      <ListItem key={index} disablePadding sx={{ py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <CheckIcon fontSize="small" color="success" />
                        </ListItemIcon>
                        <ListItemText
                          primary={form.name}
                          secondary={form.description || 'No description'}
                          primaryTypographyProps={{ variant: 'body2' }}
                          secondaryTypographyProps={{ variant: 'caption' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>
            )}

            {/* Workflows */}
            {detail.preview.workflows && detail.preview.workflows.length > 0 && (
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WorkflowIcon fontSize="small" />
                    <Typography variant="subtitle2">
                      Workflows ({detail.preview.workflows.length})
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0 }}>
                  <List dense disablePadding>
                    {detail.preview.workflows.map((workflow, index) => (
                      <ListItem key={index} disablePadding sx={{ py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <CheckIcon fontSize="small" color="success" />
                        </ListItemIcon>
                        <ListItemText
                          primary={workflow.name}
                          secondary={workflow.description || 'No description'}
                          primaryTypographyProps={{ variant: 'body2' }}
                          secondaryTypographyProps={{ variant: 'caption' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>
            )}

            {/* Connections */}
            {detail.preview.connections && detail.preview.connections.length > 0 && (
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LinkIcon fontSize="small" sx={{ color: '#00ED64' }} />
                    <Typography variant="subtitle2" sx={{ color: '#00ED64' }}>
                      Connections ({detail.preview.connections.length})
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0 }}>
                  <Alert severity="info" sx={{ mb: 1.5 }}>
                    <Typography variant="caption">
                      These connections will be automatically configured during import.
                    </Typography>
                  </Alert>
                  <List dense disablePadding>
                    {detail.preview.connections.map((conn, index) => {
                      const form = detail.preview.forms?.find((f) => f.name === conn.formRef);
                      const workflow = detail.preview.workflows?.find(
                        (w) => w.name === conn.workflowRef
                      );

                      return (
                        <ListItem key={index} disablePadding sx={{ py: 0.5 }}>
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            <TriggerIcon fontSize="small" sx={{ color: '#00ED64' }} />
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                  {form?.name || conn.formRef}
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#00ED64' }}>
                                  →
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                  {workflow?.name || conn.workflowRef}
                                </Typography>
                              </Box>
                            }
                            secondary={conn.description || `Type: ${conn.type}`}
                            secondaryTypographyProps={{ variant: 'caption' }}
                          />
                        </ListItem>
                      );
                    })}
                  </List>
                </AccordionDetails>
              </Accordion>
            )}

            {/* Version History */}
            {detail.versions && detail.versions.length > 0 && (
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle2">
                      Version History ({detail.versions.length})
                    </Typography>
                    {detail.latestVersion && (
                      <Chip
                        label={`Latest: v${detail.latestVersion}`}
                        size="small"
                        sx={{
                          bgcolor: alpha('#00ED64', 0.1),
                          color: '#00ED64',
                        }}
                      />
                    )}
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0 }}>
                  <List dense disablePadding>
                    {detail.versions
                      .sort((a, b) => {
                        // Sort by version (newest first) - simple string comparison
                        return b.version.localeCompare(a.version);
                      })
                      .map((version, index) => {
                        const publishedDate = new Date(version.publishedAt);
                        return (
                          <ListItem key={index} disablePadding sx={{ py: 1, borderBottom: index < detail.versions!.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                            <ListItemIcon sx={{ minWidth: 40 }}>
                              {version.version === detail.latestVersion ? (
                                <Chip
                                  label="Latest"
                                  size="small"
                                  sx={{
                                    bgcolor: alpha('#00ED64', 0.1),
                                    color: '#00ED64',
                                    fontSize: '0.65rem',
                                    height: 20,
                                  }}
                                />
                              ) : (
                                <Typography variant="caption" color="text.secondary">
                                  v{version.version}
                                </Typography>
                              )}
                            </ListItemIcon>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    Version {version.version}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    • {publishedDate.toLocaleDateString()}
                                  </Typography>
                                </Box>
                              }
                              secondary={
                                version.changelog ? (
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      whiteSpace: 'pre-wrap',
                                      display: 'block',
                                      mt: 0.5,
                                    }}
                                  >
                                    {version.changelog}
                                  </Typography>
                                ) : (
                                  'No changelog available'
                                )
                              }
                            />
                          </ListItem>
                        );
                      })}
                  </List>
                </AccordionDetails>
              </Accordion>
            )}

            <Divider />

            {/* Rating Summary */}
            {detail.stats && (
              <Box sx={{ mb: 2 }}>
                <RatingSummary
                  averageRating={detail.stats.rating || 0}
                  reviewCount={detail.stats.reviews || 0}
                  size="medium"
                  showDistribution
                  ratingDistribution={detail.stats.ratingDistribution}
                />
              </Box>
            )}

            <Divider />

            {/* Reviews Section */}
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Reviews</Typography>
                {user && !showReviewForm && (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setShowReviewForm(true)}
                  >
                    {userReview ? 'Edit Review' : 'Write a Review'}
                  </Button>
                )}
              </Box>

              {/* Review Form */}
              {showReviewForm && user && (
                <Box sx={{ mb: 3 }}>
                  <ReviewForm
                    applicationId={applicationId}
                    existingReview={userReview}
                    onSubmit={handleReviewSubmit}
                    onDelete={userReview ? handleReviewDelete : undefined}
                    onCancel={() => setShowReviewForm(false)}
                  />
                </Box>
              )}

              {/* Reviews List */}
              <ReviewsList
                key={reviewsKey}
                applicationId={applicationId}
                currentUserId={(user as any)?.userId || (user as any)?._id}
                onReviewUpdate={() => {
                  loadUserReview();
                  loadDetail();
                }}
              />
            </Box>

            <Divider />

            {/* Import Options */}
            <Typography variant="subtitle2" sx={{ mt: 1 }}>
              Import Options
            </Typography>
            <FormGroup>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={generateNewIds}
                    onChange={(e) => setGenerateNewIds(e.target.checked)}
                  />
                }
                label="Generate new IDs (recommended)"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={preserveSlugs}
                    onChange={(e) => setPreserveSlugs(e.target.checked)}
                    disabled={!generateNewIds}
                  />
                }
                label="Preserve slugs"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={overwriteExisting}
                    onChange={(e) => setOverwriteExisting(e.target.checked)}
                  />
                }
                label="Overwrite existing forms/workflows"
              />
            </FormGroup>
          </Box>
        ) : null}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={importing}>
          Close
        </Button>
        {detail?.source !== 'npm' && (
          <Button
            onClick={handleDownload}
            startIcon={<DownloadIcon />}
            disabled={!detail || importing}
          >
            Download
          </Button>
        )}
        {detail?.source === 'npm' && detail?.sourcePackageName ? (
          <Button
            onClick={() => handleInstallFromNpm(detail.sourcePackageName!)}
            variant="contained"
            disabled={!detail || importing}
            startIcon={importing ? <NetPadSpinner size={16} /> : <InstallIcon />}
            sx={{
              bgcolor: '#CB3837',
              '&:hover': {
                bgcolor: '#A32A2A',
              },
            }}
          >
            {importing ? 'Installing...' : 'Install from npm'}
          </Button>
        ) : (
          <Button
            onClick={handleImport}
            variant="contained"
            disabled={!detail || importing}
            startIcon={importing ? <NetPadSpinner size={16} /> : <UploadIcon />}
            sx={{
              bgcolor: '#00ED64',
              '&:hover': {
                bgcolor: '#00CC55',
              },
            }}
          >
            {importing ? 'Importing...' : 'Import Application'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
