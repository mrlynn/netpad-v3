'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Box } from '@mui/material';
import { FormBuilder } from '@/components/FormBuilder/FormBuilder';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import { useApplication } from '@/contexts/ApplicationContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { loadGalleryTemplate, convertGalleryToLegacy } from '@/lib/templates/loader';
import type { FormConfiguration } from '@/types/form';

/**
 * /apps/[appSlug]/forms/new
 *
 * App-centric new form page. Opens the form builder for creating a new form.
 * Supports ?template=templateId query param to pre-load a template.
 */
export default function AppNewFormPage() {
  const searchParams = useSearchParams();
  const { currentOrgId } = useOrganization();
  const { currentApplication, isLoading: isAppLoading } = useApplication();
  const [initialConfig, setInitialConfig] = useState<FormConfiguration | undefined>(undefined);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const hasLoadedTemplate = useRef(false);

  const applicationId = currentApplication?.applicationId;
  const projectId = currentApplication?.projectId;
  const templateId = searchParams.get('template');

  // Load template if specified in URL
  useEffect(() => {
    if (templateId && !hasLoadedTemplate.current) {
      hasLoadedTemplate.current = true;
      setIsLoadingTemplate(true);

      const galleryTemplate = loadGalleryTemplate(templateId);
      if (galleryTemplate) {
        // Convert to legacy format and create initial config
        const legacyTemplate = convertGalleryToLegacy(galleryTemplate);
        const config: FormConfiguration = {
          name: galleryTemplate.name,
          description: galleryTemplate.shortDescription,
          collection: '', // Will be set when saving
          database: '',   // Will be set when saving
          fieldConfigs: legacyTemplate.fields.map(field => ({
            ...field,
            source: 'custom' as const,
          })),
          formType: legacyTemplate.formType === 'both' ? 'data-entry' :
                    legacyTemplate.formType === 'conversational' ? 'data-entry' :
                    legacyTemplate.formType || 'data-entry',
          conversationalConfig: legacyTemplate.conversationalConfig,
        };
        setInitialConfig(config);
      }
      setIsLoadingTemplate(false);
    }
  }, [templateId]);

  if (isAppLoading || !currentApplication || !currentOrgId || !projectId || isLoadingTemplate) {
    return (
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <NetPadLoader size="large" variant="ascii" message={isLoadingTemplate ? "Loading template..." : "Loading application..."} />
      </Box>
    );
  }

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <FormBuilder
        key={templateId || 'new'}
        organizationId={currentOrgId}
        projectId={projectId}
        applicationId={applicationId}
        initialFormConfig={initialConfig}
      />
    </Box>
  );
}
