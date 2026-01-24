'use client';

import { useState, useEffect, memo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  IconButton,
  alpha,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Tooltip,
  Snackbar,
  Alert,
  useTheme as useMuiTheme,
  Theme,
} from '@mui/material';
import {
  Add,
  Search,
  Edit,
  Delete,
  ContentCopy,
  BarChart,
  MoreVert,
  Public,
  Lock,
  Description,
  CalendarToday,
  People,
  OpenInNew,
} from '@mui/icons-material';
import Link from 'next/link';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import { useApplication } from '@/contexts/ApplicationContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { getAppUrl } from '@/lib/routing';
import { OrphanedFormsBanner } from '@/components/Migration/OrphanedFormsBanner';
import { FeaturedTemplatesSection } from '@/components/Templates/FeaturedTemplatesSection';
import { ClusterSetupBanner } from '@/components/Cluster/ClusterSetupBanner';
import { useClusterStatus } from '@/hooks/useClusterStatus';

interface SavedForm {
  id: string;
  name: string;
  description?: string;
  slug?: string;
  collection?: string;
  fieldCount?: number;
  isPublished?: boolean;
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  responseCount?: number;
  projectId?: string;
  thumbnailUrl?: string;
  applicationId?: string;
}

interface FormCardProps {
  form: SavedForm;
  theme: Theme;
  appSlug: string;
  onMenuOpen: (event: React.MouseEvent<HTMLElement>, formId: string) => void;
  onCopyLink: (form: SavedForm) => void;
  formatDate: (dateString?: string) => string;
}

const FormCard = memo(function FormCard({
  form,
  theme,
  appSlug,
  onMenuOpen,
  onCopyLink,
  formatDate
}: FormCardProps) {
  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: form.isPublished ? alpha(theme.palette.primary.main, 0.3) : 'divider',
        borderRadius: 2,
        transition: 'all 0.2s ease',
        '&:hover': {
          borderColor: theme.palette.primary.main,
          boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.15)}`,
          transform: 'translateY(-2px)',
        },
      }}
    >
      {/* Thumbnail Preview */}
      <Box
        sx={{
          height: 180,
          bgcolor: alpha(theme.palette.primary.main, 0.02),
          borderBottom: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
        }}
      >
        {form.thumbnailUrl ? (
          <Box
            component="img"
            src={form.thumbnailUrl}
            alt={`${form.name || 'Form'} preview`}
            sx={{
              width: '100%',
              height: 'auto',
              minHeight: '100%',
              objectFit: 'cover',
              objectPosition: 'top center',
            }}
          />
        ) : (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: 1,
              color: 'text.disabled',
            }}
          >
            <Description sx={{ fontSize: 40, opacity: 0.3 }} />
            <Typography variant="caption" sx={{ opacity: 0.5 }}>
              No preview
            </Typography>
          </Box>
        )}
      </Box>

      <CardContent sx={{ flex: 1, pb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Box sx={{ flex: 1, mr: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem', mb: 0.5 }}>
              {form.name || 'Untitled Form'}
            </Typography>
            {form.description && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {form.description}
              </Typography>
            )}
          </Box>
          <IconButton size="small" onClick={(e) => onMenuOpen(e, form.id)}>
            <MoreVert fontSize="small" />
          </IconButton>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2 }}>
          <Chip
            icon={form.isPublished ? <Public sx={{ fontSize: 14 }} /> : <Lock sx={{ fontSize: 14 }} />}
            label={form.isPublished ? 'Published' : 'Draft'}
            size="small"
            sx={{
              height: 24,
              fontSize: '0.7rem',
              bgcolor: form.isPublished ? alpha(theme.palette.primary.main, 0.15) : alpha(theme.palette.text.primary, 0.05),
              color: form.isPublished ? theme.palette.primary.main : 'text.secondary',
              '& .MuiChip-icon': {
                color: form.isPublished ? theme.palette.primary.main : 'text.secondary',
              },
            }}
          />
          {form.collection && (
            <Chip
              icon={<Description sx={{ fontSize: 14 }} />}
              label={form.collection}
              size="small"
              sx={{
                height: 24,
                fontSize: '0.7rem',
                bgcolor: alpha(theme.palette.text.primary, 0.05),
              }}
            />
          )}
          {form.responseCount !== undefined && form.responseCount > 0 && (
            <Chip
              icon={<People sx={{ fontSize: 14 }} />}
              label={`${form.responseCount} responses`}
              size="small"
              sx={{
                height: 24,
                fontSize: '0.7rem',
                bgcolor: alpha(theme.palette.info.main, 0.15),
                color: theme.palette.info.main,
                '& .MuiChip-icon': { color: theme.palette.info.main },
              }}
            />
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CalendarToday sx={{ fontSize: 12 }} />
            {formatDate(form.updatedAt || form.createdAt)}
          </Typography>
          {form.fieldCount !== undefined && (
            <Typography variant="caption" color="text.secondary">
              {form.fieldCount} fields
            </Typography>
          )}
        </Box>
      </CardContent>

      <CardActions sx={{ px: 2, pb: 2, pt: 0, gap: 1 }}>
        <Tooltip title="Edit form in builder">
          <Button
            size="small"
            variant="outlined"
            startIcon={<Edit sx={{ fontSize: 16 }} />}
            component={Link}
            href={`${getAppUrl(appSlug, 'forms')}/${form.id}/edit`}
            sx={{
              borderColor: alpha(theme.palette.info.main, 0.5),
              color: theme.palette.info.main,
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': {
                borderColor: theme.palette.info.main,
                bgcolor: alpha(theme.palette.info.main, 0.1),
              },
            }}
          >
            Edit
          </Button>
        </Tooltip>
        {form.isPublished && (
          <Tooltip title="View published form">
            <Button
              size="small"
              variant="contained"
              startIcon={<OpenInNew sx={{ fontSize: 16 }} />}
              component={Link}
              href={`/forms/${form.slug || form.id}`}
              target="_blank"
              sx={{
                bgcolor: theme.palette.primary.main,
                color: theme.palette.primary.contrastText,
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': { bgcolor: theme.palette.primary.dark },
              }}
            >
              Open
            </Button>
          </Tooltip>
        )}
        <Tooltip title="Copy form link">
          <IconButton size="small" onClick={() => onCopyLink(form)} sx={{ color: 'text.secondary' }}>
            <ContentCopy sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="View responses">
          <IconButton
            size="small"
            component={Link}
            href={`/forms/${form.id}/responses`}
            sx={{ color: 'text.secondary' }}
          >
            <People sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="View analytics">
          <IconButton
            size="small"
            component={Link}
            href={`/forms/${form.id}/analytics`}
            sx={{ color: 'text.secondary' }}
          >
            <BarChart sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      </CardActions>
    </Card>
  );
});

/**
 * /apps/[appSlug]/forms
 *
 * App-centric forms list page. Shows forms belonging to the current application.
 * This is the canonical URL for forms within an application.
 */
export default function AppFormsPage() {
  const router = useRouter();
  const theme = useMuiTheme();

  const { currentOrgId } = useOrganization();
  const { currentApplication, isLoading: isAppLoading } = useApplication();

  const [forms, setForms] = useState<SavedForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement | null; formId: string | null }>({
    el: null,
    formId: null,
  });
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const appSlug = currentApplication?.slug || '';
  const applicationId = currentApplication?.applicationId;
  const projectId = currentApplication?.projectId;

  // Check cluster status for this organization/project
  const { clusterStatus } = useClusterStatus(currentOrgId, projectId);
  const hasDatabase = clusterStatus?.hasCluster || clusterStatus?.isReady;

  useEffect(() => {
    if (currentOrgId && projectId && applicationId) {
      loadForms();
    }
  }, [currentOrgId, projectId, applicationId]);

  const loadForms = async () => {
    if (!currentOrgId || !projectId) return;

    try {
      setLoading(true);
      // Filter forms by applicationId - response counts are included by default
      const response = await fetch(`/api/forms/list?orgId=${currentOrgId}&projectId=${projectId}&applicationId=${applicationId}`);
      const data = await response.json();

      if (data.success && data.forms) {
        // Forms now include responseCount directly from the API
        setForms(data.forms as SavedForm[]);
      } else {
        setForms([]);
      }
    } catch (error) {
      console.error('Error loading forms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (formId: string) => {
    if (!confirm('Are you sure you want to delete this form? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/forms/${formId}?orgId=${currentOrgId}`, { method: 'DELETE' });
      const data = await response.json();

      if (data.success) {
        setSnackbar({ open: true, message: 'Form deleted successfully', severity: 'success' });
        loadForms();
      } else {
        setSnackbar({ open: true, message: 'Failed to delete form', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Error deleting form', severity: 'error' });
    }

    handleMenuClose();
  };

  const handleCopyLink = (form: SavedForm) => {
    const baseUrl = window.location.origin;
    const formUrl = `${baseUrl}/forms/${form.slug || form.id}`;
    navigator.clipboard.writeText(formUrl);
    setSnackbar({ open: true, message: 'Link copied to clipboard!', severity: 'success' });
    handleMenuClose();
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, formId: string) => {
    event.stopPropagation();
    event.preventDefault();
    setMenuAnchor({ el: event.currentTarget, formId });
  };

  const handleMenuClose = () => {
    setMenuAnchor({ el: null, formId: null });
  };

  const filteredForms = forms.filter((form) => {
    const matchesSearch =
      (form.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (form.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (form.collection || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const publishedForms = filteredForms.filter((f) => f.isPublished);
  const draftForms = filteredForms.filter((f) => !f.isPublished);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Show loading while app context loads
  if (isAppLoading || !currentApplication) {
    return (
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <NetPadLoader size="large" variant="ascii" />
        <NetPadLoader size="large" variant="ascii" />

      </Box>
    );
  }

  return (
    <Box sx={{ flex: 1, bgcolor: 'background.default', overflow: 'auto' }}>
      <Box
        sx={{
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: alpha(theme.palette.background.paper, 0.5),
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{
            py: { xs: 2, sm: 3 },
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: 'space-between',
            gap: { xs: 2, sm: 0 },
          }}>
            <Box sx={{ flex: 1 }}>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  color: 'text.primary',
                  fontSize: { xs: '1.75rem', sm: '2.125rem' },
                }}
              >
                Forms
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ wordBreak: 'break-word' }}
              >
                Forms in {currentApplication.name}
              </Typography>
            </Box>
            <Button
              component={Link}
              href={`${getAppUrl(appSlug, 'forms')}/new`}
              variant="contained"
              startIcon={<Add />}
              fullWidth={false}
              sx={{
                bgcolor: theme.palette.primary.main,
                color: theme.palette.primary.contrastText,
                textTransform: 'none',
                fontWeight: 600,
                px: 3,
                '&:hover': { bgcolor: theme.palette.primary.dark },
              }}
            >
              Create Form
            </Button>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Migration Banner for Orphaned Forms */}
        {currentOrgId && (
          <OrphanedFormsBanner
            orgId={currentOrgId}
            onMigrationComplete={loadForms}
          />
        )}

        {/* Database Setup Banner - show if no cluster/connection exists */}
        {currentOrgId && projectId && !hasDatabase && (
          <ClusterSetupBanner
            orgId={currentOrgId}
            projectId={projectId}
            compact
          />
        )}

        <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
          <TextField
            fullWidth
            placeholder="Search forms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: alpha(theme.palette.background.paper, 0.5),
                '& fieldset': { borderColor: 'divider' },
                '&:hover fieldset': { borderColor: alpha(theme.palette.text.primary, 0.2) },
                '&.Mui-focused fieldset': { borderColor: theme.palette.primary.main },
              },
            }}
          />
        </Box>

        {loading ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 300,
            }}
          >
            <NetPadLoader size="large" variant="ascii" />
          </Box>
        ) : filteredForms.length === 0 ? (
          <Paper
            sx={{
              p: 6,
              textAlign: 'center',
              bgcolor: alpha(theme.palette.background.paper, 0.5),
              border: '1px dashed',
              borderColor: 'divider',
              borderRadius: 2,
            }}
          >
            {searchQuery ? (
              <>
                <Description sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" sx={{ color: 'text.primary', mb: 1 }}>
                  No forms found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Try adjusting your search query
                </Typography>
              </>
            ) : (
              <>
                <Description sx={{ fontSize: 48, color: theme.palette.primary.main, mb: 2 }} />
                <Typography variant="h5" sx={{ color: 'text.primary', mb: 1, fontWeight: 600 }}>
                  Create Your First Form
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 500, mx: 'auto' }}>
                  Build forms with drag-and-drop, connect to MongoDB, and use AI to generate forms.
                </Typography>

                <Button
                  component={Link}
                  href={`${getAppUrl(appSlug, 'forms')}/new`}
                  variant="contained"
                  size="large"
                  startIcon={<Add />}
                  sx={{
                    bgcolor: theme.palette.primary.main,
                    color: theme.palette.primary.contrastText,
                    textTransform: 'none',
                    fontWeight: 600,
                    px: 4,
                    py: 1.5,
                    mb: 5,
                    '&:hover': { bgcolor: theme.palette.primary.dark },
                  }}
                >
                  Create Your First Form
                </Button>

                {/* Featured Templates */}
                <Divider sx={{ my: 4, width: '100%' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ px: 2 }}>
                    or
                  </Typography>
                </Divider>

                <Box sx={{ width: '100%', textAlign: 'left' }}>
                  <FeaturedTemplatesSection
                    createFormBaseUrl={`${getAppUrl(appSlug, 'forms')}/new`}
                    browseTemplatesUrl="/templates"
                    limit={6}
                  />
                </Box>
              </>
            )}
          </Paper>
        ) : (
          <>
            {publishedForms.length > 0 && (
              <Box sx={{ mb: 5 }}>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    color: theme.palette.primary.main,
                    mb: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <Public sx={{ fontSize: 20 }} />
                  Published Forms
                  <Chip
                    label={publishedForms.length}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '0.7rem',
                      bgcolor: alpha(theme.palette.primary.main, 0.15),
                      color: theme.palette.primary.main,
                    }}
                  />
                </Typography>
                <Grid container spacing={3}>
                  {publishedForms.map((form) => (
                    <Grid item xs={12} sm={6} md={4} key={form.id}>
                      <FormCard
                        form={form}
                        theme={theme}
                        appSlug={appSlug}
                        onMenuOpen={handleMenuOpen}
                        onCopyLink={handleCopyLink}
                        formatDate={formatDate}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

            {draftForms.length > 0 && (
              <Box>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    color: 'text.secondary',
                    mb: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <Lock sx={{ fontSize: 20 }} />
                  Draft Forms
                  <Chip
                    label={draftForms.length}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '0.7rem',
                      bgcolor: alpha(theme.palette.text.primary, 0.1),
                      color: 'text.secondary',
                    }}
                  />
                </Typography>
                <Grid container spacing={3}>
                  {draftForms.map((form) => (
                    <Grid item xs={12} sm={6} md={4} key={form.id}>
                      <FormCard
                        form={form}
                        theme={theme}
                        appSlug={appSlug}
                        onMenuOpen={handleMenuOpen}
                        onCopyLink={handleCopyLink}
                        formatDate={formatDate}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}
          </>
        )}
      </Container>

      <Menu
        anchorEl={menuAnchor.el}
        open={Boolean(menuAnchor.el)}
        onClose={handleMenuClose}
        slotProps={{
          paper: {
            sx: {
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              minWidth: 180,
            },
          },
        }}
      >
        <MenuItem
          component={Link}
          href={`${getAppUrl(appSlug, 'forms')}/${menuAnchor.formId}/edit`}
          onClick={handleMenuClose}
        >
          <ListItemIcon>
            <Edit fontSize="small" sx={{ color: theme.palette.info.main }} />
          </ListItemIcon>
          <ListItemText>Edit Form</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            const form = forms.find((f) => f.id === menuAnchor.formId);
            if (form) handleCopyLink(form);
          }}
        >
          <ListItemIcon>
            <ContentCopy fontSize="small" />
          </ListItemIcon>
          <ListItemText>Copy Link</ListItemText>
        </MenuItem>
        <MenuItem
          component={Link}
          href={`/forms/${menuAnchor.formId}/responses`}
          onClick={handleMenuClose}
        >
          <ListItemIcon>
            <People fontSize="small" />
          </ListItemIcon>
          <ListItemText>View Responses</ListItemText>
        </MenuItem>
        <MenuItem
          component={Link}
          href={`/forms/${menuAnchor.formId}/analytics`}
          onClick={handleMenuClose}
        >
          <ListItemIcon>
            <BarChart fontSize="small" />
          </ListItemIcon>
          <ListItemText>View Analytics</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => menuAnchor.formId && handleDelete(menuAnchor.formId)}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <Delete fontSize="small" sx={{ color: 'error.main' }} />
          </ListItemIcon>
          <ListItemText>Delete Form</ListItemText>
        </MenuItem>
      </Menu>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
