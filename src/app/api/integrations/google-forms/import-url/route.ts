/**
 * Google Forms URL Import API
 *
 * POST /api/integrations/google-forms/import-url
 *
 * Imports a Google Form from a public URL and creates a NetPad form.
 * Does not require OAuth - parses the public form page directly.
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { getSession } from '@/lib/auth/session';
import {
  parseGoogleFormUrl,
  mapParsedFormToNetPad,
  buildViewFormUrl,
} from '@/lib/integrations/googleForms';
import { FormConfiguration } from '@/types/form';
import { getOrgFormsCollection } from '@/lib/platform/db';
import { ensureDefaultApplication } from '@/lib/platform/applications';
import { getProjectDefaultVault } from '@/lib/platform/projects';

interface ImportUrlRequest {
  url: string;
  orgId: string;
  projectId: string;
  applicationId?: string;
  customizations?: {
    name?: string;
    description?: string;
    excludeFields?: string[];
  };
}

interface ImportUrlResponse {
  success: boolean;
  form?: {
    id: string;
    name: string;
    slug: string;
    fieldCount: number;
  };
  importReport?: {
    duration: number;
    statistics: {
      totalFields: number;
      mappedFields: number;
      unmappedFields: number;
    };
    warnings: string[];
    viewUrl: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

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

export async function POST(request: NextRequest): Promise<NextResponse<ImportUrlResponse>> {
  const startTime = Date.now();

  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        },
        { status: 401 }
      );
    }

    const body: ImportUrlRequest = await request.json();
    const { url, orgId, projectId, applicationId, customizations } = body;

    // Validate required fields
    if (!url || !orgId || !projectId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Missing required parameters: url, orgId, projectId',
          },
        },
        { status: 400 }
      );
    }

    // Parse the form from URL
    console.log('[Google Forms URL Import] Parsing URL:', url);
    const parseResult = await parseGoogleFormUrl(url);

    if (!parseResult.success || !parseResult.form) {
      console.error('[Google Forms URL Import] Parse failed:', parseResult.error);
      return NextResponse.json(
        {
          success: false,
          error: parseResult.error || {
            code: 'PARSE_FAILED',
            message: 'Failed to parse form from URL',
          },
        },
        { status: 400 }
      );
    }

    const parsedForm = parseResult.form;

    // Map to NetPad fields
    const mappingResult = mapParsedFormToNetPad(parsedForm);

    if (!mappingResult.success || mappingResult.fields.length === 0) {
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
    const formName = customizations?.name || parsedForm.title;
    const formDescription = customizations?.description || parsedForm.description;

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
        console.error('[Google Forms URL Import] Failed to ensure default application:', error);
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
      console.error('[Google Forms URL Import] Failed to get project default vault:', error);
    }

    // Build import metadata
    const importMetadata = {
      source: 'google_forms_url' as const,
      sourceFormId: parsedForm.formId,
      sourceFormUrl: parsedForm.sourceUrl || buildViewFormUrl(parsedForm.formId),
      sourceFormTitle: parsedForm.title,
      importedAt: new Date(),
      importedBy: session.userId,
      importVersion: '1.0.0',
      importMethod: 'url_parse' as const,
      mappingReport: {
        totalSourceItems: mappingResult.statistics.totalFields,
        successfulMappings: mappingResult.statistics.mappedFields,
        warnings: mappingResult.warnings,
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
      _importMetadata: typeof importMetadata;
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
    if (parsedForm.pageCount > 1) {
      // Group fields by page
      const pageGroups = new Map<number, string[]>();
      parsedForm.fields.forEach((field, index) => {
        const pageIndex = field.pageIndex;
        if (!pageGroups.has(pageIndex)) {
          pageGroups.set(pageIndex, []);
        }
        // Map the original field index to the mapped field path
        if (fields[index]) {
          pageGroups.get(pageIndex)!.push(fields[index].path);
        }
      });

      formConfig.multiPage = {
        enabled: true,
        pages: Array.from(pageGroups.entries()).map(([pageIndex, fieldPaths], order) => ({
          id: `page_${pageIndex}`,
          title: `Page ${pageIndex + 1}`,
          fields: fieldPaths,
          order,
        })),
      };
    }

    // Save to organization database
    const orgFormsCollection = await getOrgFormsCollection(orgId);
    await orgFormsCollection.insertOne(formConfig);

    const duration = Date.now() - startTime;

    console.log('[Google Forms URL Import] Import completed:', {
      formId: newFormId,
      sourceUrl: url,
      fields: fields.length,
      duration,
    });

    return NextResponse.json({
      success: true,
      form: {
        id: newFormId,
        name: formName,
        slug,
        fieldCount: fields.length,
      },
      importReport: {
        duration,
        statistics: mappingResult.statistics,
        warnings: mappingResult.warnings,
        viewUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/org/${orgId}/forms/${newFormId}/edit`,
      },
    });
  } catch (error) {
    console.error('[Google Forms URL Import] Error:', error);
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
