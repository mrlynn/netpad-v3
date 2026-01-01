'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  alpha,
  IconButton,
  Tooltip,
  Chip,
  Button,
} from '@mui/material';
import { Close, Edit, Visibility, VisibilityOff, Refresh } from '@mui/icons-material';
import { FormConfiguration } from '@/types/form';
import { FormRenderer } from '@/components/FormRenderer/FormRenderer';
import { getResolvedTheme } from '@/lib/formThemes';

export default function FormPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const formId = params.formId as string;

  const [form, setForm] = useState<FormConfiguration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPreviewBanner, setShowPreviewBanner] = useState(true);

  const fetchForm = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/forms/${formId}?preview=true`);
      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Form not found');
        return;
      }

      setForm(data.form);
    } catch (err: any) {
      setError(err.message || 'Failed to load form');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForm();
  }, [formId]);

  // Handle mock submit - just show success message in preview mode
  const handleSubmit = async (formData: Record<string, any>) => {
    // In preview mode, we don't actually submit - just show what would happen
    alert('Preview Mode: Form would be submitted with the following data:\n\n' + JSON.stringify(formData, null, 2));
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Make sure you have saved your form before previewing.
          </Typography>
          <Button
            variant="outlined"
            onClick={() => router.back()}
          >
            Go Back to Editor
          </Button>
        </Paper>
      </Container>
    );
  }

  if (!form) {
    return null;
  }

  // Check if form has a header banner that displays the title
  const headerConfig = form.theme?.header;
  const hasHeaderWithTitle = headerConfig &&
    headerConfig.type !== 'none' &&
    headerConfig.showTitle !== false;

  // Get resolved theme for page background
  const resolvedTheme = getResolvedTheme(form.theme);

  // Build page background styles
  const pageBackgroundStyles = {
    minHeight: '100vh',
    background: resolvedTheme.pageBackgroundGradient ||
      resolvedTheme.pageBackgroundColor ||
      '#F5F5F5',
    ...(resolvedTheme.pageBackgroundImage && {
      backgroundImage: `url(${resolvedTheme.pageBackgroundImage})`,
      backgroundSize: resolvedTheme.pageBackgroundSize || 'cover',
      backgroundPosition: resolvedTheme.pageBackgroundPosition || 'center center',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'fixed',
    }),
  };

  return (
    <Box sx={pageBackgroundStyles}>
      {/* Preview Banner */}
      {showPreviewBanner && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1200,
            bgcolor: alpha('#FF9800', 0.95),
            color: '#000',
            py: 1,
            px: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          <Visibility sx={{ fontSize: 20 }} />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Preview Mode
          </Typography>
          <Chip
            label={form.isPublished ? 'Published' : 'Draft'}
            size="small"
            sx={{
              height: 20,
              fontSize: '0.7rem',
              fontWeight: 600,
              bgcolor: form.isPublished ? alpha('#4CAF50', 0.2) : alpha('#000', 0.1),
              color: form.isPublished ? '#2E7D32' : '#000',
            }}
          />
          <Typography variant="caption" sx={{ opacity: 0.8 }}>
            Submissions are disabled in preview
          </Typography>

          <Box sx={{ flex: 1 }} />

          <Tooltip title="Refresh preview">
            <IconButton
              size="small"
              onClick={fetchForm}
              sx={{ color: 'inherit' }}
            >
              <Refresh fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title="Edit form">
            <IconButton
              size="small"
              onClick={() => router.push(`/?formId=${formId}`)}
              sx={{ color: 'inherit' }}
            >
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title="Hide banner">
            <IconButton
              size="small"
              onClick={() => setShowPreviewBanner(false)}
              sx={{ color: 'inherit' }}
            >
              <VisibilityOff fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title="Close preview">
            <IconButton
              size="small"
              onClick={() => router.back()}
              sx={{ color: 'inherit' }}
            >
              <Close fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )}

      {/* Show banner toggle when hidden */}
      {!showPreviewBanner && (
        <Tooltip title="Show preview banner">
          <IconButton
            onClick={() => setShowPreviewBanner(true)}
            sx={{
              position: 'fixed',
              top: 16,
              right: 16,
              zIndex: 1200,
              bgcolor: alpha('#FF9800', 0.9),
              color: '#000',
              '&:hover': {
                bgcolor: '#FF9800',
              },
            }}
          >
            <Visibility />
          </IconButton>
        </Tooltip>
      )}

      <Container
        maxWidth="md"
        sx={{
          py: 4,
          pt: showPreviewBanner ? 8 : 4, // Add padding when banner is visible
        }}
      >
        {/* Form Header - only show if no header banner with title is configured */}
        {!hasHeaderWithTitle && (
          <Box sx={{ mb: 4, textAlign: 'center' }}>
            {form.branding?.logoUrl && (
              <Box
                component="img"
                src={form.branding.logoUrl}
                alt={form.branding.companyName || 'Logo'}
                sx={{ maxHeight: 60, mb: 2 }}
              />
            )}
            <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
              {form.name}
            </Typography>
            {form.description && (
              <Typography variant="body1" color="text.secondary">
                {form.description}
              </Typography>
            )}
          </Box>
        )}

        {/* Form Content */}
        <Paper sx={{ p: { xs: 2, md: 4 } }}>
          <FormRenderer
            form={form}
            onSubmit={handleSubmit}
            isPreview={true}
          />
        </Paper>

        {/* Footer */}
        {form.branding?.showPoweredBy !== false && (
          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              Powered by NetPad
            </Typography>
          </Box>
        )}
      </Container>
    </Box>
  );
}
