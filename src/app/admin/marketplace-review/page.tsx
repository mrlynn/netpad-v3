/**
 * Admin Marketplace Review Console
 *
 * Platform admins can review, approve, or reject marketplace application submissions.
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardActions,
  Divider,
  Stack,
  IconButton,
  Tooltip,
  FormControlLabel,
  Checkbox,
  Breadcrumbs,
  Link as MuiLink,
} from '@mui/material';
import Link from 'next/link';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Visibility as VisibilityIcon,
  Refresh as RefreshIcon,
  Pending as PendingIcon,
  Verified as VerifiedIcon,
  NavigateNext as NavigateNextIcon,
  Article as FormIcon,
  AccountTree as WorkflowIcon,
  Inventory as ApplicationIcon,
  Extension as ExtensionIcon,
} from '@mui/icons-material';
import { AppNavBar } from '@/components/Navigation/AppNavBar';
import { useAuth } from '@/contexts/AuthContext';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr';

type ApplicationStatus = 'pending' | 'approved' | 'rejected';
type ItemType = 'application' | 'form' | 'workflow' | 'extension';

interface MarketplaceApplication {
  id: string;
  itemType?: ItemType;
  name: string;
  summary?: string;
  description?: string;
  version: string;
  category: string;
  tags: string[];
  icon?: string;
  author?: any;
  license?: string;
  status: ApplicationStatus;
  published: boolean;
  isOfficial: boolean;
  publishedAt?: string;
  publishedBy?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  // Application bundle fields
  formsCount?: number;
  workflowsCount?: number;
  connectionsCount?: number;
  // Form fields
  fieldCount?: number;
  formType?: string;
  isMultiPage?: boolean;
  hasConditionalLogic?: boolean;
  // Workflow fields
  nodeCount?: number;
  triggerType?: string;
  nodeTypes?: string[];
  // Extension fields
  extensionType?: string;
  nodeCategories?: string[];
  routeCount?: number;
  npmPackage?: string;
  minNetPadVersion?: string;
  verified?: boolean;
  stats: {
    downloads: number;
    rating?: number;
    reviews: number;
  };
  createdAt: string;
  updatedAt: string;
}

export default function MarketplaceReviewPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [selectedStatus, setSelectedStatus] = useState<ApplicationStatus | 'all'>('pending');
  const [selectedApp, setSelectedApp] = useState<MarketplaceApplication | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isOfficial, setIsOfficial] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  // Check admin access
  const isAdmin = user?.platformRole === 'admin';

  // Fetch pending applications
  const statusParam = selectedStatus === 'all' ? 'all' : selectedStatus;
  const { data, error, isLoading, mutate } = useSWR<{
    applications: MarketplaceApplication[];
    total: number;
  }>(
    isAdmin ? `/api/marketplace/applications/admin/pending?status=${statusParam}` : null,
    fetcher
  );

  // Redirect if not admin
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/');
    }
  }, [authLoading, isAdmin, router]);

  const handleReview = (app: MarketplaceApplication, action: 'approve' | 'reject') => {
    setSelectedApp(app);
    setReviewAction(action);
    setRejectionReason('');
    setIsOfficial(app.isOfficial || false);
    setReviewDialogOpen(true);
  };

  const handleConfirmReview = async () => {
    if (!selectedApp) return;

    if (reviewAction === 'reject' && !rejectionReason.trim()) {
      return;
    }

    setReviewing(true);
    try {
      // URL-encode the ID to handle special characters like @ and /
      const encodedId = encodeURIComponent(selectedApp.id);
      const response = await fetch(`/api/marketplace/applications/${encodedId}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: reviewAction,
          rejectionReason: reviewAction === 'reject' ? rejectionReason : undefined,
          isOfficial: reviewAction === 'approve' ? isOfficial : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to review application');
      }

      // Refresh the list
      await mutate();
      setReviewDialogOpen(false);
      setSelectedApp(null);
      setRejectionReason('');
      setIsOfficial(false);
    } catch (error: any) {
      console.error('Review error:', error);
      alert(error.message || 'Failed to review application');
    } finally {
      setReviewing(false);
    }
  };

  const getStatusColor = (status: ApplicationStatus) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: ApplicationStatus) => {
    switch (status) {
      case 'pending':
        return <PendingIcon />;
      case 'approved':
        return <CheckCircleIcon />;
      case 'rejected':
        return <CancelIcon />;
      default:
        return undefined;
    }
  };

  const getItemTypeInfo = (itemType?: ItemType) => {
    switch (itemType) {
      case 'form':
        return { label: 'Form', icon: <FormIcon fontSize="small" />, color: '#2196F3' };
      case 'workflow':
        return { label: 'Workflow', icon: <WorkflowIcon fontSize="small" />, color: '#9C27B0' };
      case 'extension':
        return { label: 'Extension', icon: <ExtensionIcon fontSize="small" />, color: '#a855f7' };
      case 'application':
      default:
        return { label: 'Application', icon: <ApplicationIcon fontSize="small" />, color: '#00ED64' };
    }
  };

  const getItemTypeMetadata = (app: MarketplaceApplication) => {
    const itemType = app.itemType || 'application';
    switch (itemType) {
      case 'form':
        return `${app.fieldCount || 0} fields • ${app.formType || 'traditional'}${app.isMultiPage ? ' • Multi-page' : ''}`;
      case 'workflow':
        return `${app.nodeCount || 0} nodes • ${app.triggerType || 'manual'} trigger`;
      case 'extension':
        return `${app.nodeCount || 0} nodes • ${app.routeCount || 0} routes${app.npmPackage ? ` • ${app.npmPackage}` : ''}`;
      case 'application':
      default:
        return `${app.formsCount || 0} forms • ${app.workflowsCount || 0} workflows`;
    }
  };

  if (authLoading) {
    return (
      <>
        <AppNavBar />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
          <CircularProgress />
        </Box>
      </>
    );
  }

  if (!isAdmin) {
    return (
      <>
        <AppNavBar />
        <Container maxWidth="md" sx={{ mt: 4 }}>
          <Alert severity="error">Access denied. Admin privileges required.</Alert>
        </Container>
      </>
    );
  }

  const applications = data?.applications || [];
  const pendingCount = applications.filter((a) => a.status === 'pending').length;
  const approvedCount = applications.filter((a) => a.status === 'approved').length;
  const rejectedCount = applications.filter((a) => a.status === 'rejected').length;

  return (
    <>
      <AppNavBar />
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        {/* Breadcrumb Navigation */}
        <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 2 }}>
          <MuiLink component={Link} href="/admin" color="inherit" underline="hover">
            Admin Dashboard
          </MuiLink>
          <Typography color="text.primary">Marketplace Review</Typography>
        </Breadcrumbs>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" fontWeight={600}>
            Marketplace Review Console
          </Typography>
          <Button
            startIcon={<RefreshIcon />}
            onClick={() => mutate()}
            disabled={isLoading}
            variant="outlined"
          >
            Refresh
          </Button>
        </Box>

        {/* Status Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={selectedStatus}
            onChange={(_, newValue) => setSelectedStatus(newValue)}
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PendingIcon fontSize="small" />
                  Pending
                  {pendingCount > 0 && (
                    <Chip label={pendingCount} size="small" color="warning" sx={{ ml: 0.5 }} />
                  )}
                </Box>
              }
              value="pending"
            />
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircleIcon fontSize="small" />
                  Approved
                  {approvedCount > 0 && (
                    <Chip label={approvedCount} size="small" color="success" sx={{ ml: 0.5 }} />
                  )}
                </Box>
              }
              value="approved"
            />
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CancelIcon fontSize="small" />
                  Rejected
                  {rejectedCount > 0 && (
                    <Chip label={rejectedCount} size="small" color="error" sx={{ ml: 0.5 }} />
                  )}
                </Box>
              }
              value="rejected"
            />
            <Tab label="All" value="all" />
          </Tabs>
        </Paper>

        {/* Applications List */}
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">Failed to load applications: {error.message}</Alert>
        ) : applications.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              No {selectedStatus === 'all' ? '' : selectedStatus} applications found.
            </Typography>
          </Paper>
        ) : (
          <Stack spacing={2}>
            {applications.map((app) => {
              const typeInfo = getItemTypeInfo(app.itemType);
              return (
              <Card key={app.id} variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="h6">{app.icon || '📦'} {app.name}</Typography>
                        <Chip
                          icon={typeInfo.icon}
                          label={typeInfo.label}
                          size="small"
                          sx={{ bgcolor: `${typeInfo.color}20`, color: typeInfo.color }}
                        />
                        {(() => {
                          const statusIcon = getStatusIcon(app.status);
                          return statusIcon ? (
                            <Chip
                              icon={statusIcon}
                              label={app.status}
                              color={getStatusColor(app.status) as any}
                              size="small"
                            />
                          ) : (
                            <Chip
                              label={app.status}
                              color={getStatusColor(app.status) as any}
                              size="small"
                            />
                          );
                        })()}
                        {app.isOfficial && (
                          <Chip
                            icon={<VerifiedIcon />}
                            label="Official"
                            color="primary"
                            size="small"
                            sx={{ fontWeight: 600 }}
                          />
                        )}
                        {app.published && (
                          <Chip label="Published" color="success" size="small" />
                        )}
                      </Box>
                      {app.summary && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {app.summary}
                        </Typography>
                      )}
                      <Box sx={{ display: 'flex', gap: 2, mt: 1, flexWrap: 'wrap' }}>
                        <Typography variant="caption" color="text.secondary">
                          Version: {app.version}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Category: {app.category}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {getItemTypeMetadata(app)}
                        </Typography>
                        {app.author && (
                          <Typography variant="caption" color="text.secondary">
                            Author: {typeof app.author === 'object' ? app.author.name : app.author}
                          </Typography>
                        )}
                      </Box>
                      {app.tags && app.tags.length > 0 && (
                        <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
                          {app.tags.map((tag) => (
                            <Chip key={tag} label={tag} size="small" variant="outlined" />
                          ))}
                        </Box>
                      )}
                      {app.rejectionReason && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                          <Typography variant="subtitle2" fontWeight={600}>
                            Rejection Reason:
                          </Typography>
                          {app.rejectionReason}
                        </Alert>
                      )}
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                        Submitted: {new Date(app.createdAt).toLocaleString()}
                        {app.reviewedAt && ` • Reviewed: ${new Date(app.reviewedAt).toLocaleString()}`}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
                {app.status === 'pending' && (
                  <>
                    <Divider />
                    <CardActions sx={{ justifyContent: 'flex-end', gap: 1 }}>
                      <Button
                        startIcon={<CheckCircleIcon />}
                        variant="contained"
                        color="success"
                        onClick={() => handleReview(app, 'approve')}
                      >
                        Approve
                      </Button>
                      <Button
                        startIcon={<CancelIcon />}
                        variant="contained"
                        color="error"
                        onClick={() => handleReview(app, 'reject')}
                      >
                        Reject
                      </Button>
                    </CardActions>
                  </>
                )}
              </Card>
              );
            })}
          </Stack>
        )}

        {/* Review Dialog */}
        <Dialog open={reviewDialogOpen} onClose={() => !reviewing && setReviewDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            {reviewAction === 'approve' ? 'Approve Application' : 'Reject Application'}
          </DialogTitle>
          <DialogContent>
            {selectedApp && (
              <Box>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  <strong>{selectedApp.name}</strong> (v{selectedApp.version})
                </Typography>
                {reviewAction === 'reject' && (
                  <TextField
                    label="Rejection Reason"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    fullWidth
                    multiline
                    rows={4}
                    required
                    helperText="Please provide a clear reason for rejection to help the publisher improve their submission."
                    sx={{ mt: 2 }}
                  />
                )}
                {reviewAction === 'approve' && (
                  <Box sx={{ mt: 2 }}>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      This application will be published to the marketplace and visible to all users.
                    </Alert>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={isOfficial}
                          onChange={(e) => setIsOfficial(e.target.checked)}
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            Mark as Official NetPad Application
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Official applications are verified by NetPad/MongoDB and appear with a verified badge in the marketplace.
                          </Typography>
                        </Box>
                      }
                    />
                  </Box>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setReviewDialogOpen(false)} disabled={reviewing}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmReview}
              variant="contained"
              color={reviewAction === 'approve' ? 'success' : 'error'}
              disabled={reviewing || (reviewAction === 'reject' && !rejectionReason.trim())}
            >
              {reviewing ? <CircularProgress size={20} /> : reviewAction === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </>
  );
}
