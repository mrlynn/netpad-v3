import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, ensureSessionId, SavedForm } from '@/lib/session';
import { FormConfiguration, FormVersion } from '@/types/form';
import { randomBytes } from 'crypto';
import { getForms, saveForm, publishForm, getPublishedFormById, getVersionsForForm, addFormVersion } from '@/lib/storage';
import { checkFieldLimit } from '@/lib/platform/billing';

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
      // Update existing form
      const forms = await getForms(sessionId);
      const existing = forms.find(f => f.id === formConfig.id);

      if (!existing) {
        return NextResponse.json(
          { success: false, error: 'Form not found' },
          { status: 404 }
        );
      }

      savedForm = {
        ...existing,
        ...formConfig,
        id: existing.id,
        slug: existing.slug || generateSlug(formConfig.name),
        updatedAt: now,
        isPublished: publish ? true : existing.isPublished,
        publishedAt: publish && !existing.publishedAt ? now : existing.publishedAt,
      };
    } else {
      // Create new form
      const id = randomBytes(16).toString('hex');
      const slug = generateSlug(formConfig.name) + '-' + randomBytes(4).toString('hex');

      savedForm = {
        ...formConfig,
        id,
        slug,
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

    // Save to file storage
    await saveForm(sessionId, savedForm);

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
