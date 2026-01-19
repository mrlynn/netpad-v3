'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { Box } from '@mui/material';
import { AppNavBar } from '@/components/Navigation/AppNavBar';
import { ApplicationContextBar } from '@/components/Navigation/ApplicationContextBar';
import { FormBuilder } from '@/components/FormBuilder/FormBuilder';
import { FormConfiguration } from '@/types/form';
import { loadGalleryTemplate } from '@/lib/templates/loader';

const GENERATED_FORM_KEY = 'netpad_generated_form';

// Read form from localStorage once, outside component to avoid Strict Mode issues
function getStoredForm(orgId: string, projectId: string): FormConfiguration | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const stored = localStorage.getItem(GENERATED_FORM_KEY);
    if (stored) {
      const form = JSON.parse(stored) as FormConfiguration;
      form.organizationId = orgId;
      form.projectId = projectId;
      console.log('[Builder] Read form from localStorage:', form.name, 'with', form.fieldConfigs?.length, 'fields');
      return form;
    }
  } catch (error) {
    console.error('[Builder] Failed to read generated form:', error);
  }
  return undefined;
}

// Convert a gallery template to a FormConfiguration
function convertTemplateToFormConfig(
  templateId: string,
  orgId: string,
  projectId: string
): FormConfiguration | undefined {
  const template = loadGalleryTemplate(templateId);
  if (!template) {
    console.error('[Builder] Template not found:', templateId);
    return undefined;
  }

  console.log('[Builder] Loading template:', template.name, 'with', template.fieldConfigs?.length, 'fields');

  // Generate a slug-friendly collection name from the template name
  const collectionName = template.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/(^_|_$)/g, '');

  return {
    name: template.name,
    description: template.shortDescription,
    collection: collectionName,
    database: 'netpad',
    fieldConfigs: template.fieldConfigs,
    theme: template.theme,
    organizationId: orgId,
    projectId: projectId,
    formType: template.formType === 'traditional' ? 'data-entry' : 'conversational',
  };
}

export default function BuilderPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const orgId = params.orgId as string;
  const projectId = params.projectId as string;
  const formId = searchParams.get('formId') || undefined;
  const applicationId = searchParams.get('applicationId') || undefined;
  const shouldRestore = searchParams.get('restore') === 'true';
  const templateId = searchParams.get('template') || undefined;

  // Use ref to track if we've already cleaned up localStorage
  const hasCleanedUp = useRef(false);
  // Track if we've already loaded template to avoid re-running
  const hasLoadedTemplate = useRef(false);

  const [initialForm, setInitialForm] = useState<FormConfiguration | undefined>(() => {
    // Priority 1: Restore from localStorage
    if (shouldRestore) {
      return getStoredForm(orgId, projectId);
    }
    // Priority 2: Load from template
    if (templateId) {
      const config = convertTemplateToFormConfig(templateId, orgId, projectId);
      if (config) {
        hasLoadedTemplate.current = true;
      }
      return config;
    }
    return undefined;
  });

  // Handle template loading after initial mount (in case useState initializer ran during SSR without access to templates)
  useEffect(() => {
    if (templateId && !initialForm && !hasLoadedTemplate.current) {
      console.log('[Builder] Loading template in useEffect:', templateId);
      const config = convertTemplateToFormConfig(templateId, orgId, projectId);
      if (config) {
        hasLoadedTemplate.current = true;
        setInitialForm(config);
      }
    }
  }, [templateId, orgId, projectId, initialForm]);

  // Clean up localStorage after successful restoration (in useEffect to avoid Strict Mode issues)
  useEffect(() => {
    if (shouldRestore && initialForm && !hasCleanedUp.current) {
      hasCleanedUp.current = true;
      localStorage.removeItem(GENERATED_FORM_KEY);
      console.log('[Builder] Cleared form from localStorage after restoration');
    }
  }, [shouldRestore, initialForm]);

  return (
    <Box sx={{ height: '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <AppNavBar />
      {applicationId && (
        <ApplicationContextBar
          applicationId={applicationId}
          orgId={orgId}
          projectId={projectId}
          compact
        />
      )}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <FormBuilder
          key={templateId || formId || 'new'}
          initialFormId={formId}
          initialFormConfig={initialForm}
          organizationId={orgId}
          projectId={projectId}
          applicationId={applicationId}
        />
      </Box>
    </Box>
  );
}
