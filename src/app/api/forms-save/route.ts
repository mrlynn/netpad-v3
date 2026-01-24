import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, ensureSessionId, SavedForm } from '@/lib/session';
import { FormConfiguration, FormVersion, FormDataSource } from '@/types/form';
import { randomBytes } from 'crypto';
import { getForms, saveForm, publishForm, getVersionsForForm, addFormVersion } from '@/lib/storage';
import { checkFieldLimit } from '@/lib/platform/usageService';
import { getOrgFormsCollection } from '@/lib/platform/db';
import { ensureDefaultApplication } from '@/lib/platform/applications';
import { getProjectDefaultVault } from '@/lib/platform/projects';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

// Auto-assign dataSource from project's default vault if not set
async function ensureDataSource(
  dataSource: FormDataSource | undefined,
  projectId: string | undefined,
  formName: string
): Promise<FormDataSource | undefined> {
  // If dataSource already has a vaultId, keep it
  if (dataSource?.vaultId) {
    return dataSource;
  }

  // If no projectId, can't auto-assign
  if (!projectId) {
    return dataSource;
  }

  try {
    const defaultVault = await getProjectDefaultVault(projectId);
    if (defaultVault?.vaultId) {
      console.log('[API forms-save] Auto-assigning dataSource from project default vault:', {
        projectId,
        vaultId: defaultVault.vaultId,
      });
      return {
        vaultId: defaultVault.vaultId,
        collection: formNameToCollectionName(formName),
      };
    }
  } catch (error) {
    console.error('[API forms-save] Failed to get project default vault:', error);
  }

  return dataSource;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const formConfig: FormConfiguration = body.formConfig;
    const publish = body.publish ?? false;

    // Debug: Log what the API received (full body for debugging)
    console.log('[API forms-save] Received body:', JSON.stringify(body, null, 2));
    console.log('[API forms-save] Received formConfig theme:', {
      hasTheme: !!formConfig?.theme,
      theme: formConfig?.theme,
      pageBackgroundColor: formConfig?.theme?.pageBackgroundColor,
      pageBackgroundGradient: formConfig?.theme?.pageBackgroundGradient,
    });
    console.log('[API forms-save] Received formConfig dataSource:', {
      hasDataSource: !!formConfig?.dataSource,
      dataSource: formConfig?.dataSource,
      vaultId: formConfig?.dataSource?.vaultId,
      collection: formConfig?.dataSource?.collection,
      organizationId: formConfig?.organizationId,
    });

    if (!formConfig || !formConfig.name) {
      return NextResponse.json(
        { success: false, error: 'Form configuration with name is required' },
        { status: 400 }
      );
    }

    // Check field limit if form has organization context
    const fieldCount = formConfig.fieldConfigs?.length || 0;
    if (formConfig.organizationId && fieldCount > 0) {
      const fieldLimitCheck = await checkFieldLimit(formConfig.organizationId, fieldCount);
      if (!fieldLimitCheck.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: fieldLimitCheck.reason || 'Maximum fields per form limit reached',
            code: 'FIELD_LIMIT_EXCEEDED',
            usage: {
              current: fieldLimitCheck.current,
              limit: fieldLimitCheck.limit,
              remaining: fieldLimitCheck.remaining,
            },
          },
          { status: 429 }
        );
      }
    }

    // Phase 2: Validate applicationId if projectId is provided
    if (formConfig.projectId && formConfig.organizationId) {
      // If projectId is set, applicationId should be set (will be auto-assigned if missing)
      // This is a soft validation - we'll ensure default app exists below
      if (!formConfig.applicationId) {
        // ApplicationId will be assigned automatically below
        console.log('[API forms-save] Form has projectId but no applicationId - will assign default app');
      }
    }

    // Validate data destination before publishing
    if (publish) {
      const hasDataSource = formConfig.dataSource && formConfig.organizationId;
      const hasLegacyConnection = formConfig.connectionString && formConfig.database && formConfig.collection;

      if (!hasDataSource && !hasLegacyConnection) {
        return NextResponse.json(
          {
            success: false,
            error: 'Cannot publish form without a data destination. Please configure a MongoDB connection in the Data tab.',
            code: 'NO_DATA_DESTINATION',
          },
          { status: 400 }
        );
      }
    }

    // Get session ID
    const session = await getIronSession(await cookies(), sessionOptions);
    const sessionId = ensureSessionId(session);
    await session.save();

    const now = new Date().toISOString();
    // Check if this is a client-side generated ID (form-timestamp-random) or a server-generated ID (hex)
    // Client-side IDs start with "form-" and should be treated as new forms
    const isClientSideId = formConfig.id?.startsWith('form-');
    const isUpdate = !!formConfig.id && !isClientSideId;

    let savedForm: SavedForm;

    if (isUpdate) {
      // Update existing form - check both session storage and organization database
      let existing: SavedForm | null = null;
      
      // First check session storage
      const forms = await getForms(sessionId);
      existing = forms.find(f => f.id === formConfig.id) || null;
      
      // If not found in session storage and we have organizationId, check org database
      if (!existing && formConfig.organizationId) {
        try {
          const orgFormsCollection = await getOrgFormsCollection(formConfig.organizationId);
          const orgForm = await orgFormsCollection.findOne({
            $or: [
              { formId: formConfig.id },
              { id: formConfig.id },
            ],
          });
          
          if (orgForm) {
            // Convert org form format to SavedForm format
            existing = {
              id: orgForm.formId || orgForm.id,
              name: orgForm.name,
              description: orgForm.description,
              slug: orgForm.slug,
              fieldConfigs: orgForm.fieldConfigs || [],
              variables: orgForm.variables || [],
              multiPage: orgForm.multiPage,
              lifecycle: orgForm.lifecycle,
              theme: orgForm.theme,
              formType: orgForm.formType || 'data-entry',
              searchConfig: orgForm.searchConfig,
              conversationalConfig: orgForm.conversationalConfig,
              dataSource: orgForm.dataSource,
              accessControl: orgForm.accessControl,
              connectionString: orgForm.connectionString,
              database: orgForm.database,
              collection: orgForm.collection,
              isPublished: orgForm.isPublished || false,
              publishedAt: orgForm.publishedAt,
              organizationId: orgForm.organizationId,
              projectId: orgForm.projectId,
              applicationId: orgForm.applicationId,
              createdAt: orgForm.createdAt,
              updatedAt: orgForm.updatedAt,
            } as SavedForm;
            
            console.log('[API forms-save] Found form in organization database:', formConfig.id);
          }
        } catch (orgError) {
          console.error('[API forms-save] Error checking organization database:', orgError);
          // Continue - will check session storage result below
        }
      }

      if (!existing) {
        return NextResponse.json(
          { success: false, error: 'Form not found' },
          { status: 404 }
        );
      }

      // Build savedForm, explicitly handling dataSource, organizationId, projectId, and applicationId to preserve them
      const { dataSource: formDataSource, organizationId: formOrgId, projectId: formProjectId, applicationId: formApplicationId, ...restFormConfig } = formConfig;

      // Determine applicationId: use provided, existing, or ensure default app exists
      let finalApplicationId = formApplicationId || existing.applicationId;
      if (!finalApplicationId && formProjectId && formOrgId) {
        // Ensure default application exists and use it
        try {
          const defaultApp = await ensureDefaultApplication(formOrgId, formProjectId, 'system');
          finalApplicationId = defaultApp.applicationId;
        } catch (error) {
          console.error('[API forms-save] Failed to ensure default application:', error);
          // Continue without applicationId for now - will be backfilled in migration
        }
      }

      // Determine projectId: use provided or existing
      const finalProjectId = formProjectId !== undefined ? formProjectId : existing.projectId;

      // Determine dataSource: use provided, existing, or auto-assign from project default vault
      let finalDataSource = formDataSource !== undefined ? formDataSource : existing.dataSource;
      if (!finalDataSource?.vaultId && finalProjectId) {
        finalDataSource = await ensureDataSource(finalDataSource, finalProjectId, formConfig.name);
      }

      savedForm = {
        ...existing,
        ...restFormConfig,
        id: existing.id,
        slug: existing.slug || generateSlug(formConfig.name),
        updatedAt: now,
        isPublished: publish ? true : existing.isPublished,
        publishedAt: publish && !existing.publishedAt ? now : existing.publishedAt,
        // Explicitly preserve dataSource, organizationId, projectId, and applicationId
        dataSource: finalDataSource,
        organizationId: formOrgId !== undefined ? formOrgId : existing.organizationId,
        projectId: finalProjectId,
        applicationId: finalApplicationId,
      };
    } else {
      // Create new form
      const id = randomBytes(16).toString('hex');
      const slug = generateSlug(formConfig.name) + '-' + randomBytes(4).toString('hex');

      // Ensure applicationId is set if projectId is provided
      let applicationId = formConfig.applicationId;
      if (!applicationId && formConfig.projectId && formConfig.organizationId) {
        // Ensure default application exists and use it
        try {
          const defaultApp = await ensureDefaultApplication(formConfig.organizationId, formConfig.projectId, 'system');
          applicationId = defaultApp.applicationId;
        } catch (error) {
          console.error('[API forms-save] Failed to ensure default application:', error);
          // Continue without applicationId for now - will be backfilled in migration
        }
      }

      // Ensure dataSource is set if projectId is provided - auto-assign from project default vault
      let dataSource = formConfig.dataSource;
      if (!dataSource?.vaultId && formConfig.projectId) {
        dataSource = await ensureDataSource(dataSource, formConfig.projectId, formConfig.name);
      }

      savedForm = {
        ...formConfig,
        id,
        slug,
        applicationId,
        dataSource,
        createdAt: now,
        updatedAt: now,
        isPublished: publish,
        publishedAt: publish ? now : undefined,
      };
    }

    // Debug: Log what we're about to save
    console.log('[API forms-save] Saving form with theme:', {
      hasTheme: !!savedForm.theme,
      theme: savedForm.theme,
      pageBackgroundColor: savedForm.theme?.pageBackgroundColor,
      pageBackgroundGradient: savedForm.theme?.pageBackgroundGradient,
    });
    console.log('[API forms-save] Saving form with dataSource:', {
      hasDataSource: !!savedForm.dataSource,
      dataSource: savedForm.dataSource,
      vaultId: savedForm.dataSource?.vaultId,
      collection: savedForm.dataSource?.collection,
      organizationId: savedForm.organizationId,
    });

    // Save to file storage (platform database - session-based)
    await saveForm(sessionId, savedForm);

    // Also save to organization database if organizationId is provided
    // This ensures the form appears in the organization's forms list
    if (savedForm.organizationId) {
      try {
        const orgFormsCollection = await getOrgFormsCollection(savedForm.organizationId);

        // Prepare the org form document
        const orgFormDoc = {
          formId: savedForm.id,
          name: savedForm.name,
          description: savedForm.description,
          slug: savedForm.slug,
          organizationId: savedForm.organizationId,
          projectId: savedForm.projectId,
          applicationId: savedForm.applicationId, // Phase 2: Include applicationId
          fieldConfigs: savedForm.fieldConfigs,
          variables: savedForm.variables,
          theme: savedForm.theme,
          dataSource: savedForm.dataSource,
          connectionString: savedForm.connectionString,
          database: savedForm.database,
          collection: savedForm.collection,
          isPublished: savedForm.isPublished,
          publishedAt: savedForm.publishedAt,
          createdBy: savedForm.createdBy,
          createdAt: savedForm.createdAt,
          updatedAt: savedForm.updatedAt,
          thumbnailUrl: savedForm.thumbnailUrl,
          conversationalConfig: savedForm.conversationalConfig,
        };

        await orgFormsCollection.updateOne(
          { formId: savedForm.id },
          { $set: orgFormDoc },
          { upsert: true }
        );

        console.log('[API forms-save] Form saved to organization database:', savedForm.organizationId);

        // Update application stats if applicationId is set
        if (savedForm.applicationId && savedForm.organizationId) {
          try {
            const { calculateApplicationStats } = await import('@/lib/platform/applications');
            await calculateApplicationStats(savedForm.organizationId, savedForm.applicationId);
            console.log('[API forms-save] Application stats updated');
          } catch (statsError) {
            console.error('[API forms-save] Failed to update application stats:', statsError);
            // Don't fail the request if stats update fails
          }
        }
      } catch (orgError) {
        console.error('[API forms-save] Failed to save to organization database:', orgError);
        // Don't fail the request if org save fails - the form is still saved to platform DB
      }
    }

    // Create a new version on each save
    const existingVersions = await getVersionsForForm(sessionId, savedForm.id);
    const nextVersionNumber = existingVersions.length > 0
      ? Math.max(...existingVersions.map(v => v.version)) + 1
      : 1;

    const newVersion: FormVersion = {
      id: randomBytes(8).toString('hex'),
      formId: savedForm.id,
      version: nextVersionNumber,
      name: savedForm.name,
      description: savedForm.description,
      fieldConfigs: savedForm.fieldConfigs,
      variables: savedForm.variables,
      createdAt: now,
      createdBy: 'user',
      changeNotes: isUpdate ? 'Updated form configuration' : 'Initial version',
      isPublished: savedForm.isPublished,
    };

    await addFormVersion(sessionId, newVersion);

    // If publishing, also save to published forms
    if (publish || savedForm.isPublished) {
      await publishForm(savedForm);
    }

    return NextResponse.json({
      success: true,
      form: {
        id: savedForm.id,
        name: savedForm.name,
        slug: savedForm.slug,
        isPublished: savedForm.isPublished,
        publishedAt: savedForm.publishedAt,
        createdAt: savedForm.createdAt,
        updatedAt: savedForm.updatedAt,
        version: nextVersionNumber,
      },
    });
  } catch (error: any) {
    console.error('Error saving form:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save form' },
      { status: 500 }
    );
  }
}
