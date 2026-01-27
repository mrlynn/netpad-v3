/**
 * Google Forms Integration API - Execute Import
 *
 * POST /api/integrations/google-forms/import
 *
 * Imports a Google Form and creates a new NetPad form.
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { getSession } from '@/lib/auth/session';
import {
  createGoogleFormsClient,
  mapGoogleFormToNetPad,
  buildFormResponderUrl,
} from '@/lib/integrations/googleForms';
import {
  GoogleFormsExecuteRequest,
  GoogleFormsExecuteResponse,
  GoogleFormsImportMetadata,
} from '@/types/googleFormsImport';
import { FormConfiguration } from '@/types/form';
import { getOrgFormsCollection } from '@/lib/platform/db';
import { ensureDefaultApplication } from '@/lib/platform/applications';
import { getProjectDefaultVault } from '@/lib/platform/projects';

export const dynamic = 'force-dynamic';

// Generate a URL-friendly slug from a name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

// Generate a collection name from a form name
function formNameToCollectionName(formName: string): string {
  return formName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 40) + '_responses';
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await getSession();

    if (!session.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body: GoogleFormsExecuteRequest = await request.json();
    const { orgId, credentialId, formId, projectId, applicationId, customizations } = body;

    if (!orgId || !credentialId || !formId || !projectId) {
      return NextResponse.json(
        { error: 'Missing required parameters: orgId, credentialId, formId, projectId' },
        { status: 400 }
      );
    }

    // Create Google Forms client and fetch the form
    const client = createGoogleFormsClient(orgId, credentialId);
    const formResult = await client.getForm(formId);

    if (!formResult.success || !formResult.data) {
      console.error('[Google Forms Import] Fetch failed:', formResult.error);
      return NextResponse.json(
        { error: formResult.error?.message || 'Failed to fetch form' },
        { status: formResult.error?.status || 500 }
      );
    }

    const googleForm = formResult.data;

    // Map the form to NetPad field configs
    const mappingResult = mapGoogleFormToNetPad(googleForm);

    if (!mappingResult.success && mappingResult.fields.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MAPPING_FAILED',
            message: 'Could not map any fields from the Google Form',
          },
        },
        { status: 400 }
      );
    }

    // Apply customizations
    let fields = mappingResult.fields;
    const formName = customizations?.name || googleForm.info.title;
    const formDescription = customizations?.description || googleForm.info.description;

    // Apply field overrides
    if (customizations?.fieldOverrides) {
      fields = fields.map((field) => {
        const override = customizations.fieldOverrides?.[field.path];
        if (override) {
          return { ...field, ...override };
        }
        return field;
      });
    }

    // Exclude fields if specified
    if (customizations?.excludeFields) {
      fields = fields.filter((field) => !customizations.excludeFields?.includes(field.path));
    }

    // Generate form ID and slug
    const newFormId = randomBytes(16).toString('hex');
    const slug = generateSlug(formName) + '-' + randomBytes(4).toString('hex');

    // Determine applicationId
    let finalApplicationId = applicationId;
    if (!finalApplicationId && projectId) {
      try {
        const defaultApp = await ensureDefaultApplication(orgId, projectId, session.userId);
        finalApplicationId = defaultApp.applicationId;
      } catch (error) {
        console.error('[Google Forms Import] Failed to ensure default application:', error);
      }
    }

    // Get data source from project default vault
    let dataSource;
    try {
      const defaultVault = await getProjectDefaultVault(projectId);
      if (defaultVault?.vaultId) {
        dataSource = {
          vaultId: defaultVault.vaultId,
          collection: formNameToCollectionName(formName),
        };
      }
    } catch (error) {
      console.error('[Google Forms Import] Failed to get project default vault:', error);
    }

    // Build import metadata
    const importMetadata: GoogleFormsImportMetadata = {
      source: 'google_forms',
      sourceFormId: googleForm.formId,
      sourceFormUrl: googleForm.responderUri || buildFormResponderUrl(formId),
      sourceFormTitle: googleForm.info.title,
      importedAt: new Date(),
      importedBy: session.userId,
      importVersion: '1.0.0',
      googleFormVersion: googleForm.revisionId,
      mappingReport: {
        totalSourceItems: mappingResult.statistics.totalItems,
        successfulMappings: mappingResult.statistics.mappedFields,
        warnings: mappingResult.warnings,
        unsupportedItems: mappingResult.unsupportedItems,
      },
    };

    // Build the form configuration
    const now = new Date().toISOString();
    const formConfig: Partial<FormConfiguration> & {
      formId: string;
      organizationId: string;
      projectId: string;
      applicationId?: string;
      createdBy: string;
      createdAt: string;
      updatedAt: string;
      _importMetadata: GoogleFormsImportMetadata;
    } = {
      formId: newFormId,
      name: formName,
      description: formDescription,
      slug,
      fieldConfigs: fields,
      formType: 'data-entry',
      organizationId: orgId,
      projectId,
      applicationId: finalApplicationId,
      dataSource,
      createdBy: session.userId,
      createdAt: now,
      updatedAt: now,
      isPublished: false,
      _importMetadata: importMetadata,
    };

    // Add multi-page configuration if the form has multiple pages
    if (mappingResult.pages && mappingResult.pages.length > 1) {
      formConfig.multiPage = {
        enabled: true,
        pages: mappingResult.pages.map((page, index) => ({
          id: page.id,
          title: page.title,
          description: page.description,
          fields: page.fieldPaths,
          order: index,
        })),
      };
    }

    // Save to organization database
    const orgFormsCollection = await getOrgFormsCollection(orgId);
    await orgFormsCollection.insertOne(formConfig);

    const duration = Date.now() - startTime;

    // Build response
    const response: GoogleFormsExecuteResponse = {
      success: true,
      form: {
        id: newFormId,
        name: formName,
        slug,
        fieldCount: fields.length,
      },
      importReport: {
        duration,
        mappingStatistics: mappingResult.statistics,
        warnings: mappingResult.warnings,
        viewUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/org/${orgId}/forms/${newFormId}/edit`,
      },
    };

    console.log('[Google Forms Import] Import completed:', {
      formId: newFormId,
      sourceFormId: formId,
      fields: fields.length,
      duration,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Google Forms Import] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'IMPORT_FAILED',
          message: error instanceof Error ? error.message : 'Import failed',
        },
      },
      { status: 500 }
    );
  }
}
