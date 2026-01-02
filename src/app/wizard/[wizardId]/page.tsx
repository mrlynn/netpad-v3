'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import {
  Box,
  Container,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  alpha,
} from '@mui/material';
import { FormConfiguration, FormPage } from '@/types/form';
import { WizardTemplate } from '@/types/wizardTemplates';
import { getTemplateById } from '@/data/wizardTemplates';
import { FormRenderer } from '@/components/FormRenderer/FormRenderer';

/**
 * Standalone Wizard Page
 *
 * This page can render:
 * 1. A wizard template directly (using template ID)
 * 2. A saved wizard instance (wizard created from a template and customized)
 *
 * URL patterns:
 * - /wizard/employee-onboarding-v1 - Renders the template directly (demo mode)
 * - /wizard/[instanceId] - Renders a saved wizard instance
 *
 * Query params:
 * - ?demo=true - Force demo mode for templates
 * - ?embedded=true - Embedded mode (for iframe)
 */
export default function StandaloneWizardPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const wizardId = params.wizardId as string;

  const isDemo = searchParams.get('demo') === 'true';
  const isEmbedded = searchParams.get('embedded') === 'true';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [template, setTemplate] = useState<WizardTemplate | null>(null);
  const [formConfig, setFormConfig] = useState<FormConfiguration | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState<Record<string, any> | null>(null);

  /**
   * Send message to parent window if embedded
   */
  const postMessageToParent = useCallback((type: string, payload?: any) => {
    if (!isEmbedded || typeof window === 'undefined') return;

    try {
      window.parent.postMessage({
        source: 'netpad-wizard',
        wizardId,
        type,
        payload,
      }, '*');
    } catch (e) {
      // Ignore if postMessage fails
    }
  }, [isEmbedded, wizardId]);

  useEffect(() => {
    const loadWizard = async () => {
      try {
        // First, try to load as a template (demo mode or direct template access)
        const templateData = getTemplateById(wizardId);

        if (templateData) {
          setTemplate(templateData);

          // Convert template to FormConfiguration for rendering
          const config: FormConfiguration = {
            id: `wizard-${templateData.id}`,
            name: templateData.name,
            description: templateData.description,
            collection: 'wizard_submissions',
            database: 'netpad',
            fieldConfigs: templateData.fieldConfigs,
            multiPage: {
              ...templateData.multiPageConfig,
              pages: templateData.pages,
            },
            formType: 'data-entry',
            isPublished: true,
            branding: {
              showPoweredBy: true,
            },
            // Use a clean light theme for wizards
            theme: {
              preset: 'mongodb-green',
              primaryColor: '#00ED64',
              secondaryColor: '#001E2B',
              backgroundColor: '#FFFFFF',
              surfaceColor: '#F9FBFA',
              textColor: '#001E2B',
              textSecondaryColor: '#5C6C75',
              errorColor: '#CF4747',
              successColor: '#00ED64',
              fontFamily: '"Inter", "Segoe UI", sans-serif',
              fontSize: 'medium',
              borderRadius: 8,
              spacing: 'comfortable',
              inputStyle: 'outlined',
              inputBorderRadius: 8,
              buttonStyle: 'contained',
              buttonBorderRadius: 8,
              elevation: 1,
              mode: 'light',
            },
          };

          setFormConfig(config);
          postMessageToParent('loaded', { wizardName: templateData.name });
          setLoading(false);
          return;
        }

        // If not a template, try to fetch as a saved wizard instance
        const response = await fetch(`/api/wizard/${wizardId}`);
        const data = await response.json();

        if (!data.success) {
          setError(data.error || 'Wizard not found');
          setLoading(false);
          return;
        }

        // Load the saved wizard instance
        setFormConfig(data.wizard.formConfig);
        postMessageToParent('loaded', { wizardName: data.wizard.name });
      } catch (err: any) {
        setError(err.message || 'Failed to load wizard');
      } finally {
        setLoading(false);
      }
    };

    loadWizard();
  }, [wizardId, postMessageToParent]);

  const handleSubmit = async (formData: Record<string, any>) => {
    try {
      // For demo mode, just show success
      if (isDemo || template) {
        setSubmittedData(formData);
        setSubmitted(true);
        postMessageToParent('submit', { data: formData });

        console.log('[Wizard Demo] Submitted data:', formData);
        return;
      }

      // For saved wizard instances, submit to API
      const response = await fetch(`/api/wizard/${wizardId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: formData }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Submission failed');
      }

      setSubmittedData(formData);
      setSubmitted(true);
      postMessageToParent('submit', {
        responseId: result.responseId,
        data: formData,
      });
    } catch (err: any) {
      setError(err.message);
      postMessageToParent('error', { message: err.message });
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          bgcolor: '#f5f5f5',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#f5f5f5',
        }}
      >
        <Container maxWidth="sm">
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
            <Typography variant="body2" color="text.secondary">
              This wizard may not exist or may not be available.
            </Typography>
          </Paper>
        </Container>
      </Box>
    );
  }

  if (submitted && formConfig) {
    // Get completion config from the last page if available
    const completionPage = formConfig.multiPage?.pages?.find(
      (p: FormPage) => p.pageType === 'complete'
    );
    const completionConfig = completionPage?.completionConfig;

    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#f5f5f5',
        }}
      >
        <Container maxWidth="sm">
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h5" sx={{ mb: 2, color: '#4CAF50', fontWeight: 600 }}>
              {completionConfig?.heading || 'Submission Complete!'}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
              {completionConfig?.message || 'Thank you for completing the wizard. Your information has been submitted successfully.'}
            </Typography>

            {/* Demo mode indicator */}
            {(isDemo || template) && (
              <Alert severity="info" sx={{ mt: 3 }}>
                <Typography variant="body2">
                  <strong>Demo Mode:</strong> In a live wizard, this data would be saved to your database.
                </Typography>
              </Alert>
            )}

            {/* Show submitted data in demo mode */}
            {(isDemo || template) && submittedData && (
              <Box sx={{ mt: 3, textAlign: 'left' }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Submitted Data (Demo):
                </Typography>
                <Box
                  component="pre"
                  sx={{
                    p: 2,
                    bgcolor: alpha('#000', 0.03),
                    borderRadius: 1,
                    fontSize: 12,
                    fontFamily: 'monospace',
                    overflow: 'auto',
                    maxHeight: 300,
                  }}
                >
                  {JSON.stringify(submittedData, null, 2)}
                </Box>
              </Box>
            )}
          </Paper>
        </Container>
      </Box>
    );
  }

  if (!formConfig) {
    return null;
  }

  return (
    <Box sx={{ py: 4 }}>
      <Container maxWidth="md">
        {/* Wizard Header */}
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
            {formConfig.name}
          </Typography>
          {formConfig.description && (
            <Typography variant="body1" color="text.secondary">
              {formConfig.description}
            </Typography>
          )}

          {/* Demo mode badge */}
          {(isDemo || template) && (
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                mt: 2,
                px: 2,
                py: 0.5,
                bgcolor: alpha('#FF9800', 0.1),
                color: '#F57C00',
                borderRadius: 2,
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              DEMO MODE - Data will not be saved
            </Box>
          )}
        </Box>

        {/* Wizard Form */}
        <Paper
          elevation={1}
          sx={{
            p: { xs: 2, md: 4 },
            borderRadius: 2,
          }}
        >
          <FormRenderer
            form={formConfig}
            onSubmit={handleSubmit}
          />
        </Paper>

        {/* Footer */}
        {formConfig.branding?.showPoweredBy !== false && (
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
