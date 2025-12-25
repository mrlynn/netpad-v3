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
  ToggleButtonGroup,
  ToggleButton,
  alpha,
  Drawer,
  IconButton,
  Button,
  Divider,
} from '@mui/material';
import { Add, Search, Close, Lock, Email, Key, Google, GitHub } from '@mui/icons-material';
import { FormConfiguration, FormType, SearchConfig } from '@/types/form';
import { replaceTemplateVariables, buildRedirectUrl } from '@/types/formHooks';
import { FormRenderer } from '@/components/FormRenderer/FormRenderer';
import { SearchFormRenderer } from '@/components/FormRenderer/SearchFormRenderer';
import { AuthMethod } from '@/types/platform';
import { getResolvedTheme } from '@/lib/formThemes';

interface SearchResult {
  _id: string;
  [key: string]: any;
}

interface AccessResult {
  allowed: boolean;
  reason?: string;
  requiresAuth?: boolean;
  allowedAuthMethods?: AuthMethod[];
  accessDescription?: string;
}

export default function PublicFormPage() {
  const params = useParams();
  const router = useRouter();
  const formId = params.formId as string;

  const [form, setForm] = useState<FormConfiguration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState<Record<string, any> | null>(null);
  const [responseId, setResponseId] = useState<string | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);
  const [activeMode, setActiveMode] = useState<'create' | 'search'>('create');
  const [viewingDocument, setViewingDocument] = useState<SearchResult | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [accessResult, setAccessResult] = useState<AccessResult | null>(null);

  useEffect(() => {
    const fetchForm = async () => {
      try {
        const response = await fetch(`/api/forms/${formId}?public=true`);
        const data = await response.json();

        if (!data.success) {
          setError(data.error || 'Form not found');
          return;
        }

        setForm(data.form);

        // Debug: Log theme data received from API
        console.log('[PublicForm] Theme data received:', {
          hasTheme: !!data.form.theme,
          theme: data.form.theme,
          preset: data.form.theme?.preset,
          pageBackgroundColor: data.form.theme?.pageBackgroundColor,
          pageBackgroundGradient: data.form.theme?.pageBackgroundGradient,
          primaryColor: data.form.theme?.primaryColor,
        });

        // Check if access was denied
        if (data.accessDenied) {
          setAccessDenied(true);
          setAccessResult(data.accessResult);
        }

        // Set initial mode based on form type
        const formType = data.form.formType || 'data-entry';
        if (formType === 'search') {
          setActiveMode('search');
        } else {
          setActiveMode('create');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load form');
      } finally {
        setLoading(false);
      }
    };

    fetchForm();
  }, [formId]);

  const handleSubmit = async (formData: Record<string, any>) => {
    try {
      const response = await fetch(`/api/forms/${formId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: formData }),
      });

      const result = await response.json();

      if (!result.success) {
        // Use custom error message if configured
        const customErrorMessage = form?.hooks?.onError?.message;
        throw new Error(customErrorMessage || result.error || 'Submission failed');
      }

      // Store submission data for template replacement
      setSubmittedData(formData);
      setResponseId(result.responseId || null);
      setSubmitted(true);

      // Handle redirect if configured
      const redirectConfig = form?.hooks?.onSuccess?.redirect;
      if (redirectConfig?.url) {
        const delay = redirectConfig.delay ?? 3;
        if (delay > 0) {
          // Start countdown
          setRedirectCountdown(delay);
        } else {
          // Immediate redirect
          const redirectUrl = buildRedirectUrl(redirectConfig, formData, result.responseId);
          window.location.href = redirectUrl;
        }
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Handle redirect countdown
  useEffect(() => {
    if (redirectCountdown === null || redirectCountdown <= 0) return;

    const timer = setTimeout(() => {
      setRedirectCountdown(prev => {
        if (prev === null || prev <= 1) {
          // Execute redirect
          const redirectConfig = form?.hooks?.onSuccess?.redirect;
          if (redirectConfig?.url && submittedData) {
            const redirectUrl = buildRedirectUrl(redirectConfig, submittedData, responseId || undefined);
            window.location.href = redirectUrl;
          }
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [redirectCountdown, form?.hooks?.onSuccess?.redirect, submittedData, responseId]);

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
          <Typography variant="body2" color="text.secondary">
            This form may not exist or may not be published yet.
          </Typography>
        </Paper>
      </Container>
    );
  }

  if (submitted && form) {
    // Get custom success message or use default
    const customSuccessMessage = form.hooks?.onSuccess?.message;
    const successMessage = customSuccessMessage
      ? replaceTemplateVariables(customSuccessMessage, submittedData || {}, responseId || undefined)
      : 'Your submission has been received.';

    // Get redirect config for countdown display
    const redirectConfig = form.hooks?.onSuccess?.redirect;

    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h5" sx={{ mb: 2, color: '#00ED64' }}>
            Thank You!
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
            {successMessage}
          </Typography>

          {/* Show redirect countdown if configured */}
          {redirectCountdown !== null && redirectCountdown > 0 && redirectConfig && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
              Redirecting in {redirectCountdown} second{redirectCountdown !== 1 ? 's' : ''}...
            </Typography>
          )}
        </Paper>
      </Container>
    );
  }

  // Show access denied/requires auth UI before form
  if (accessDenied && accessResult && form) {
    const getAuthMethodIcon = (method: AuthMethod) => {
      switch (method) {
        case 'magic-link':
          return <Email sx={{ fontSize: 20 }} />;
        case 'passkey':
          return <Key sx={{ fontSize: 20 }} />;
        case 'google':
          return <Google sx={{ fontSize: 20 }} />;
        case 'github':
          return <GitHub sx={{ fontSize: 20 }} />;
        default:
          return <Lock sx={{ fontSize: 20 }} />;
      }
    };

    const getAuthMethodLabel = (method: AuthMethod) => {
      switch (method) {
        case 'magic-link':
          return 'Sign in with Email';
        case 'passkey':
          return 'Sign in with Passkey';
        case 'google':
          return 'Sign in with Google';
        case 'github':
          return 'Sign in with GitHub';
        default:
          return method;
      }
    };

    const handleSignIn = (method: AuthMethod) => {
      // Redirect to auth page with return URL
      const returnUrl = encodeURIComponent(window.location.pathname);
      router.push(`/auth/login?returnUrl=${returnUrl}&method=${method}`);
    };

    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        {/* Form Header - show form name even when access denied */}
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

        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Lock sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />

          {accessResult.requiresAuth ? (
            // User needs to sign in
            <>
              <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
                Sign In Required
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Please sign in to access this form.
              </Typography>

              {accessResult.accessDescription && (
                <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
                  {accessResult.accessDescription}
                </Alert>
              )}

              <Divider sx={{ my: 3 }} />

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {accessResult.allowedAuthMethods?.map((method) => (
                  <Button
                    key={method}
                    variant="outlined"
                    size="large"
                    startIcon={getAuthMethodIcon(method)}
                    onClick={() => handleSignIn(method)}
                    sx={{
                      textTransform: 'none',
                      py: 1.5,
                      borderColor: alpha('#00ED64', 0.3),
                      '&:hover': {
                        borderColor: '#00ED64',
                        bgcolor: alpha('#00ED64', 0.05),
                      },
                    }}
                  >
                    {getAuthMethodLabel(method)}
                  </Button>
                ))}
              </Box>
            </>
          ) : (
            // User is authenticated but doesn't have access
            <>
              <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
                Access Denied
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                {accessResult.reason || 'You do not have permission to access this form.'}
              </Typography>

              {accessResult.accessDescription && (
                <Alert severity="warning" sx={{ mt: 2, textAlign: 'left' }}>
                  {accessResult.accessDescription}
                </Alert>
              )}
            </>
          )}
        </Paper>

        {/* Footer */}
        {form.branding?.showPoweredBy !== false && (
          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              Powered by MongoDB Form Builder
            </Typography>
          </Box>
        )}
      </Container>
    );
  }

  if (!form) {
    return null;
  }

  const formType = form.formType || 'data-entry';
  const searchConfig = form.searchConfig;
  const showModeToggle = formType === 'both';
  const showSearchMode = formType === 'search' || (formType === 'both' && activeMode === 'search');
  const showCreateMode = formType === 'data-entry' || (formType === 'both' && activeMode === 'create');

  // Check if form has a header banner that displays the title
  const headerConfig = form.theme?.header;
  const hasHeaderWithTitle = headerConfig &&
    headerConfig.type !== 'none' &&
    headerConfig.showTitle !== false;

  // Get resolved theme for page background
  const resolvedTheme = getResolvedTheme(form.theme);

  // Debug: Log resolved theme
  console.log('[PublicForm] Resolved theme:', {
    inputTheme: form.theme,
    resolvedPageBg: resolvedTheme.pageBackgroundColor,
    resolvedPageGradient: resolvedTheme.pageBackgroundGradient,
    resolvedPrimaryColor: resolvedTheme.primaryColor,
  });

  const handleViewDocument = (doc: SearchResult) => {
    setViewingDocument(doc);
  };

  const handleCloseDocumentView = () => {
    setViewingDocument(null);
  };

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
    <Container maxWidth="md" sx={{ py: 4 }}>
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

      {/* Mode Toggle (only for 'both' type) */}
      {showModeToggle && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <ToggleButtonGroup
            value={activeMode}
            exclusive
            onChange={(_, newMode) => newMode && setActiveMode(newMode)}
            sx={{
              '& .MuiToggleButton-root': {
                px: 3,
                py: 1,
                textTransform: 'none',
                fontWeight: 600,
                '&.Mui-selected': {
                  bgcolor: alpha('#00ED64', 0.1),
                  color: '#00ED64',
                  borderColor: alpha('#00ED64', 0.3),
                  '&:hover': {
                    bgcolor: alpha('#00ED64', 0.15),
                  },
                },
              },
            }}
          >
            <ToggleButton value="create">
              <Add sx={{ fontSize: 18, mr: 1 }} />
              Add New
            </ToggleButton>
            <ToggleButton value="search">
              <Search sx={{ fontSize: 18, mr: 1 }} />
              Search
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      )}

      {/* Form Content */}
      <Paper sx={{ p: { xs: 2, md: 4 } }}>
        {showSearchMode && searchConfig ? (
          <SearchFormRenderer
            form={form}
            searchConfig={searchConfig}
            onViewDocument={handleViewDocument}
          />
        ) : showCreateMode ? (
          <FormRenderer
            form={form}
            onSubmit={handleSubmit}
          />
        ) : (
          <Typography color="text.secondary">
            Form configuration error: No valid form mode available.
          </Typography>
        )}
      </Paper>

      {/* Document View Drawer */}
      <Drawer
        anchor="right"
        open={!!viewingDocument}
        onClose={handleCloseDocumentView}
        PaperProps={{
          sx: { width: { xs: '100%', sm: 480 }, maxWidth: '100%' }
        }}
      >
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Document Details
          </Typography>
          <IconButton onClick={handleCloseDocumentView} size="small">
            <Close />
          </IconButton>
        </Box>
        <Box sx={{ p: 2 }}>
          {viewingDocument && (
            <Box
              component="pre"
              sx={{
                p: 2,
                bgcolor: alpha('#00ED64', 0.02),
                borderRadius: 1,
                fontSize: 12,
                fontFamily: 'monospace',
                overflow: 'auto',
                m: 0,
              }}
            >
              {JSON.stringify(viewingDocument, null, 2)}
            </Box>
          )}
        </Box>
      </Drawer>

      {/* Footer */}
      {form.branding?.showPoweredBy !== false && (
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            Powered by MongoDB Form Builder
          </Typography>
        </Box>
      )}
    </Container>
    </Box>
  );
}
