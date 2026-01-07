'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
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
import { Add, Search, Close, Lock, Email, Key, Google, GitHub, TrendingUp, Bolt, AllInclusive } from '@mui/icons-material';
import { FormConfiguration, FormType, SearchConfig } from '@/types/form';
import Link from 'next/link';
import { replaceTemplateVariables, buildRedirectUrl } from '@/types/formHooks';
import { FormRenderer } from '@/components/FormRenderer/FormRenderer';
import { SearchFormRenderer } from '@/components/FormRenderer/SearchFormRenderer';
import { ConversationalFormChat } from '@/components/ConversationalForm';
import { AuthMethod } from '@/types/platform';
import { getResolvedTheme } from '@/lib/formThemes';
import { mapExtractedDataToFormFields, validateMappedData } from '@/lib/conversational/mapping';
import { getExtractionSchemaForConfig } from '@/lib/conversational/schemas';
import { ConversationState } from '@/types/conversational';
import { useAuth } from '@/contexts/AuthContext';

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
  const searchParams = useSearchParams();
  const formId = params.formId as string;
  const { user, isAuthenticated } = useAuth();

  // Read embed parameters from query string
  const hideHeader = searchParams.get('hideHeader') === 'true';
  const hideBranding = searchParams.get('hideBranding') === 'true';
  const embedTheme = searchParams.get('theme') as 'light' | 'dark' | 'auto' | null;
  const isEmbedded = searchParams.get('embedded') === 'true';

  /**
   * Send message to parent window if embedded
   */
  const postMessageToParent = useCallback((type: string, payload?: any) => {
    if (!isEmbedded || typeof window === 'undefined') return;

    try {
      window.parent.postMessage({
        source: 'netpad-form',
        formSlug: formId,
        type,
        payload,
      }, '*');
    } catch (e) {
      // Ignore if postMessage fails (e.g., cross-origin restrictions)
    }
  }, [isEmbedded, formId]);

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

        // Notify parent if embedded
        postMessageToParent('loaded', { formName: data.form.name });

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

      // Notify parent if embedded
      postMessageToParent('submit', {
        responseId: result.responseId,
        data: formData,
      });

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
      // Notify parent if embedded
      postMessageToParent('error', { message: err.message });
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
    // Check if this is a limit-exceeded error
    const isLimitError = error.toLowerCase().includes('limit reached') ||
                         error.toLowerCase().includes('limit exceeded') ||
                         error.toLowerCase().includes('upgrade');

    if (isLimitError) {
      return (
        <Container maxWidth="sm" sx={{ py: 8 }}>
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Bolt sx={{ fontSize: 48, color: 'warning.main', mb: 2 }} />
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
              This Form is Temporarily Unavailable
            </Typography>
            <Alert severity="warning" sx={{ mb: 3, textAlign: 'left' }}>
              {error}
            </Alert>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              The organization that created this form has reached their plan limits.
              Don&apos;t worry - this is usually resolved quickly when the form owner upgrades their plan.
            </Typography>

            <Divider sx={{ my: 3 }} />

            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
              Are you the form owner?
            </Typography>

            <Box sx={{
              bgcolor: alpha('#00ED64', 0.05),
              borderRadius: 2,
              p: 3,
              mb: 3,
              border: `1px solid ${alpha('#00ED64', 0.2)}`
            }}>
              <Typography variant="body2" sx={{ mb: 2, fontWeight: 500 }}>
                Upgrade to unlock:
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, textAlign: 'left', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AllInclusive sx={{ fontSize: 18, color: '#00ED64' }} />
                  <Typography variant="body2">Unlimited form submissions</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TrendingUp sx={{ fontSize: 18, color: '#00ED64' }} />
                  <Typography variant="body2">More forms, workflows & connections</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Bolt sx={{ fontSize: 18, color: '#00ED64' }} />
                  <Typography variant="body2">Advanced AI features & automation</Typography>
                </Box>
              </Box>
              <Button
                component={Link}
                href="/pricing"
                variant="contained"
                fullWidth
                sx={{
                  bgcolor: '#00ED64',
                  color: '#001E2B',
                  fontWeight: 600,
                  '&:hover': {
                    bgcolor: '#00C853',
                  },
                }}
              >
                View Plans & Pricing
              </Button>
            </Box>

            <Typography variant="caption" color="text.secondary">
              Questions? Contact the form owner or reach out to support.
            </Typography>
          </Paper>
        </Container>
      );
    }

    // Default error display for other errors
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
              Powered by NetPad
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
  const conversationalConfig = form.conversationalConfig;
  const showModeToggle = formType === 'both';
  const showSearchMode = formType === 'search' || (formType === 'both' && activeMode === 'search');
  const showCreateMode = formType === 'data-entry' || (formType === 'both' && activeMode === 'create');
  const showConversationalMode = formType === 'conversational' && conversationalConfig;

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
      {/* Form Header - only show if no header banner with title is configured and not hidden by embed params */}
      {!hasHeaderWithTitle && !hideHeader && (
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
        {showConversationalMode && conversationalConfig ? (
          <ConversationalFormChat
            formId={form.id || formId}
            config={conversationalConfig}
            onComplete={(conversationState: ConversationState) => {
              // Map extracted data to form field structure
              if (!form?.fieldConfigs) {
                setError('Form configuration error: fieldConfigs not found');
                return;
              }

              try {
                // Get extraction schema (use IT Helpdesk schema if template is enabled)
                const extractionSchema = getExtractionSchemaForConfig(conversationalConfig);

                // Map extracted data to form fields
                const { mappedData, unmappedFields, mappingReport } = mapExtractedDataToFormFields(
                  conversationState.partialExtractions,
                  extractionSchema,
                  form.fieldConfigs
                );

                // Validate mapped data
                const validation = validateMappedData(mappedData, form.fieldConfigs);

                // Calculate conversation duration
                const duration = conversationState.completedAt && conversationState.startedAt
                  ? Math.round((conversationState.completedAt.getTime() - conversationState.startedAt.getTime()) / 1000)
                  : Math.round((Date.now() - conversationState.startedAt.getTime()) / 1000);

                // Inject authenticated user information if available
                // This allows workflows to use email, fullName, etc. without asking the user
                const userInfo: Record<string, any> = {};
                if (isAuthenticated && user) {
                  // Map auth user fields to common form field names
                  if (user.email) {
                    userInfo.email = user.email;
                  }
                  if (user.displayName) {
                    // Use displayName as fullName for workflows
                    userInfo.fullName = user.displayName;
                    userInfo.name = user.displayName; // Also provide as 'name' for compatibility
                  }
                  // Add userId for reference (User type has _id, not userId)
                  if (user._id) {
                    userInfo._userId = user._id;
                  }
                }

                // Prepare submission data with conversation metadata
                // User info takes precedence over extracted data (auth is more reliable)
                const submissionData = {
                  ...userInfo, // Auth data first
                  ...mappedData, // Then extracted data (may override auth if explicitly provided)
                  _meta: {
                    submissionType: 'conversational',
                    conversationId: conversationState.conversationId,
                    transcript: conversationState.messages,
                    turnCount: conversationState.turnCount,
                    confidence: conversationState.confidence,
                    completionReason: conversationState.status === 'completed' ? 'completed' : 'user_confirmed',
                    duration,
                    topicsCovered: conversationState.topics.map(t => ({
                      topicId: t.topicId,
                      name: t.name,
                      covered: t.covered,
                      depth: t.depth,
                    })),
                    extractionSchema: extractionSchema.map(s => ({
                      field: s.field,
                      type: s.type,
                      required: s.required,
                    })),
                    mappingReport,
                    validationWarnings: validation.warnings,
                    missingRequiredFields: validation.missingRequiredFields,
                    unmappedFields: Object.keys(unmappedFields).length > 0 ? unmappedFields : undefined,
                    // Include auth info in metadata for reference
                    authenticatedUser: isAuthenticated && user ? {
                      userId: user._id,
                      email: user.email,
                      displayName: user.displayName,
                    } : undefined,
                  },
                };

                // Submit the mapped data
                handleSubmit(submissionData);
              } catch (err: any) {
                console.error('[PublicForm] Error mapping conversational data:', err);
                setError('Failed to process conversation data. Please try again.');
              }
            }}
          />
        ) : showSearchMode && searchConfig ? (
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

      {/* Footer - hide if hideBranding is true */}
      {form.branding?.showPoweredBy !== false && !hideBranding && (
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
