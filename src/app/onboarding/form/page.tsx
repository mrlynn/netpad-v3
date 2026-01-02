'use client';

import { useState, useMemo, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Paper,
  Typography,
  Avatar,
  CircularProgress,
  IconButton,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { FormRenderer } from '@/components/FormRenderer/FormRenderer';
import { FormConfiguration, FormPage, FieldConfig } from '@/types/form';
import { employeeOnboardingTemplate } from '@/data/wizardTemplates/employeeOnboarding';
import { useBranding } from '@/contexts/OnboardingBrandingContext';
import { OnboardingFormData, generateSubmissionId } from '@/types/onboarding';

// Convert the wizard template to a FormConfiguration
function createFormConfig(companyName: string, primaryColor: string): FormConfiguration {
  const template = employeeOnboardingTemplate;

  // Create field configs map for quick lookup
  const fieldConfigMap = new Map<string, FieldConfig>();
  template.fieldConfigs.forEach((fc) => {
    fieldConfigMap.set(fc.path, fc);
  });

  // Build pages with proper field references
  const pages: FormPage[] = template.pages.map((page, index) => {
    // Get field configs for this page
    const pageFieldConfigs = page.fields
      .map((fieldPath) => fieldConfigMap.get(fieldPath))
      .filter((fc): fc is FieldConfig => fc !== undefined);

    return {
      ...page,
      id: page.id || `page-${index}`,
      title: page.title,
      description: page.description,
      pageType: page.pageType || 'form',
      fields: page.fields,
      order: page.order ?? index,
      showInNavigation: page.showInNavigation ?? true,
      content: page.content,
      summaryConfig: page.summaryConfig,
      completionConfig: page.completionConfig
        ? {
            ...page.completionConfig,
            // Override completion actions for onboarding flow
            actions: [], // We'll handle navigation ourselves
          }
        : undefined,
    };
  });

  return {
    id: 'onboarding-form',
    name: `${companyName} Employee Onboarding`,
    description: template.description,
    collection: 'onboarding_submissions',
    database: 'onboarding',
    fieldConfigs: template.fieldConfigs,
    multiPage: {
      enabled: true,
      pages,
      showStepIndicator: true,
      stepIndicatorStyle: 'progress',
      allowJumpToPage: false,
      validateOnPageChange: true,
      showPageTitles: true,
      submitButtonLabel: 'Complete Onboarding',
    },
    theme: {
      preset: 'mongodb-green',
      primaryColor: primaryColor,
      backgroundColor: '#ffffff',
      surfaceColor: '#f8f9fa',
      textColor: '#001E2B',
      textSecondaryColor: '#5C6C75',
      errorColor: '#d32f2f',
      successColor: primaryColor,
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      borderRadius: 8,
      inputBorderRadius: 8,
      buttonBorderRadius: 8,
      spacing: 'comfortable',
      inputStyle: 'outlined',
      mode: 'light',
    },
  };
}

function OnboardingFormContent() {
  const router = useRouter();
  const { branding, isLoading } = useBranding();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [startTime] = useState(() => new Date());

  // Create form configuration based on branding
  const formConfig = useMemo(
    () => createFormConfig(branding.companyName, branding.primaryColor),
    [branding.companyName, branding.primaryColor]
  );

  const handleSubmit = async (data: Record<string, any>) => {
    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch('/api/onboarding/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: data as OnboardingFormData,
          startedAt: startTime.toISOString(),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to submit onboarding form');
      }

      // Navigate to success page with submission ID
      router.push(`/onboarding/success/${result.submissionId}`);
    } catch (err) {
      console.error('Submission error:', err);
      setSubmitError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    router.push('/onboarding');
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          flex: 1,
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

  return (
    <Box sx={{ flex: 1, py: { xs: 2, md: 4 } }}>
      <Container maxWidth="md">
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            mb: 3,
          }}
        >
          <IconButton onClick={handleBack} size="small" sx={{ color: 'text.secondary' }}>
            <ArrowBackIcon />
          </IconButton>
          {branding.logoUrl ? (
            <Box
              component="img"
              src={branding.logoUrl}
              alt={branding.companyName}
              sx={{
                height: 40,
                maxWidth: 120,
                objectFit: 'contain',
              }}
            />
          ) : (
            <Avatar
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                fontSize: '1rem',
                fontWeight: 700,
              }}
            >
              {branding.companyName.charAt(0)}
            </Avatar>
          )}
          <Typography variant="body2" color="text.secondary">
            {branding.companyName} • Employee Onboarding
          </Typography>
        </Box>

        {/* Error Alert */}
        {submitError && (
          <Paper
            sx={{
              p: 2,
              mb: 3,
              bgcolor: 'error.light',
              border: '1px solid',
              borderColor: 'error.main',
            }}
          >
            <Typography color="error.dark">{submitError}</Typography>
          </Paper>
        )}

        {/* Form */}
        <Paper
          elevation={0}
          sx={{
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            overflow: 'hidden',
            p: { xs: 2, sm: 3, md: 4 },
          }}
        >
          <FormRenderer form={formConfig} onSubmit={handleSubmit} isPreview={false} />
        </Paper>

        {/* Footer */}
        <Box sx={{ textAlign: 'center', mt: 4, pb: 4 }}>
          <Typography variant="caption" color="text.secondary">
            Your information is encrypted and stored securely.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}

export default function OnboardingFormPage() {
  return (
    <Suspense
      fallback={
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
          }}
        >
          <CircularProgress />
        </Box>
      }
    >
      <OnboardingFormContent />
    </Suspense>
  );
}
