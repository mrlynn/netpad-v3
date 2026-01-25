'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { Box, Alert, Snackbar, alpha } from '@mui/material';
import { SmartToy, Terminal, Share, Api } from '@mui/icons-material';
import { AppNavBar } from '@/components/Navigation/AppNavBar';
import { ApplicationContextBar } from '@/components/Navigation/ApplicationContextBar';
import { FormBuilder } from '@/components/FormBuilder/FormBuilder';
import { FormConfiguration } from '@/types/form';
import { loadGalleryTemplate } from '@/lib/templates/loader';

const GENERATED_FORM_KEY = 'netpad_generated_form';
const IMPORT_KEY = 'netpad_form_import';

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

// Read imported form from sessionStorage (from Claude MCP or other sources)
interface ImportedFormData {
  importId: string;
  config: Partial<FormConfiguration>;
  source: string;
}

function getImportedForm(importId: string, orgId: string, projectId: string): { form: FormConfiguration; source: string } | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const stored = sessionStorage.getItem(IMPORT_KEY);
    if (stored) {
      const data = JSON.parse(stored) as ImportedFormData;
      // Verify the import ID matches
      if (data.importId !== importId) {
        console.warn('[Builder] Import ID mismatch:', data.importId, 'vs', importId);
        return undefined;
      }

      // Generate a collection name from the form name
      const collectionName = (data.config.name || 'imported_form')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/(^_|_$)/g, '');

      const form: FormConfiguration = {
        name: data.config.name || 'Imported Form',
        description: data.config.description,
        collection: collectionName,
        database: 'netpad',
        fieldConfigs: data.config.fieldConfigs || [],
        theme: data.config.theme,
        multiPage: data.config.multiPage,
        formType: data.config.formType || 'data-entry',
        conversationalConfig: data.config.conversationalConfig,
        organizationId: orgId,
        projectId: projectId,
        branding: data.config.branding,
        lifecycle: data.config.lifecycle,
        hooks: data.config.hooks,
      };

      console.log('[Builder] Read imported form from sessionStorage:', form.name, 'with', form.fieldConfigs?.length, 'fields');
      return { form, source: data.source };
    }
  } catch (error) {
    console.error('[Builder] Failed to read imported form:', error);
  }
  return undefined;
}

function getSourceLabel(source: string): string {
  switch (source) {
    case 'claude-mcp': return 'Claude MCP';
    case 'cli': return 'NetPad CLI';
    case 'share': return 'Shared Link';
    default: return 'External Source';
  }
}

function getSourceIcon(source: string) {
  switch (source) {
    case 'claude-mcp': return <SmartToy sx={{ fontSize: 18 }} />;
    case 'cli': return <Terminal sx={{ fontSize: 18 }} />;
    case 'share': return <Share sx={{ fontSize: 18 }} />;
    default: return <Api sx={{ fontSize: 18 }} />;
  }
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
  const importedId = searchParams.get('imported') || undefined;

  // Use ref to track if we've already cleaned up localStorage
  const hasCleanedUp = useRef(false);
  // Track if we've already loaded template to avoid re-running
  const hasLoadedTemplate = useRef(false);
  // Track import source for banner
  const [importSource, setImportSource] = useState<string | null>(null);
  const [showImportBanner, setShowImportBanner] = useState(false);

  const [initialForm, setInitialForm] = useState<FormConfiguration | undefined>(() => {
    // Priority 0: Import from Claude MCP or other source
    if (importedId) {
      const imported = getImportedForm(importedId, orgId, projectId);
      if (imported) {
        return imported.form;
      }
    }
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

  // Handle import from Claude MCP or other source
  useEffect(() => {
    if (importedId && !initialForm) {
      const imported = getImportedForm(importedId, orgId, projectId);
      if (imported) {
        setInitialForm(imported.form);
        setImportSource(imported.source);
        setShowImportBanner(true);
        // Clean up sessionStorage after loading
        sessionStorage.removeItem(IMPORT_KEY);
        console.log('[Builder] Loaded and cleared import from sessionStorage');
        // Mark import as claimed via API (fire and forget)
        fetch(`/api/forms/import/${importedId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'claim' }),
        }).catch((err) => console.error('[Builder] Failed to claim import:', err));
      }
    } else if (importedId && initialForm) {
      // Import was loaded in useState initializer, just set the banner
      const stored = sessionStorage.getItem(IMPORT_KEY);
      if (stored) {
        try {
          const data = JSON.parse(stored) as ImportedFormData;
          if (data.importId === importedId) {
            setImportSource(data.source);
            setShowImportBanner(true);
            sessionStorage.removeItem(IMPORT_KEY);
            // Mark import as claimed via API (fire and forget)
            fetch(`/api/forms/import/${importedId}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'claim' }),
            }).catch((err) => console.error('[Builder] Failed to claim import:', err));
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
  }, [importedId, orgId, projectId, initialForm]);

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
      {/* Import success banner */}
      <Snackbar
        open={showImportBanner}
        autoHideDuration={8000}
        onClose={() => setShowImportBanner(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ top: applicationId ? '120px !important' : '72px !important' }}
      >
        <Alert
          severity="success"
          onClose={() => setShowImportBanner(false)}
          icon={importSource ? getSourceIcon(importSource) : undefined}
          sx={{
            bgcolor: alpha('#4CAF50', 0.95),
            color: 'white',
            '& .MuiAlert-icon': { color: 'white' },
            '& .MuiAlert-action .MuiIconButton-root': { color: 'white' },
          }}
        >
          Form imported from {importSource ? getSourceLabel(importSource) : 'external source'}! Review and save when ready.
        </Alert>
      </Snackbar>
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <FormBuilder
          key={importedId || templateId || formId || 'new'}
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
