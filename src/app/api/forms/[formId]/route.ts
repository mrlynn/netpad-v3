import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, ensureSessionId } from '@/lib/session';
import {
  getForms,
  getFormById,
  saveForm,
  deleteForm,
  publishForm,
  unpublishForm,
  getPublishedFormBySlug,
  getPublishedFormById,
} from '@/lib/storage';
import { getSession } from '@/lib/auth/session';
import { checkFormAccess, describeAccessRequirements } from '@/lib/platform/formAccess';
import { getOrgFormsCollection } from '@/lib/platform/db';
import { withTiming } from '@/lib/performance/withTiming';

export const dynamic = 'force-dynamic';

// GET - Retrieve a specific form by ID or slug
async function handleGET(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { formId } = await params;
    const isPublicAccess = request.nextUrl.searchParams.get('public') === 'true';
    const isPreviewMode = request.nextUrl.searchParams.get('preview') === 'true';

    // Preview mode - allows viewing unpublished forms for the owner
    if (isPreviewMode) {
      const session = await getIronSession(await cookies(), sessionOptions);
      const sessionId = ensureSessionId(session);
      await session.save();

      // Get form from user's session storage (draft form)
      const forms = await getForms(sessionId);
      const form = forms.find(f => f.id === formId || f.slug === formId);

      if (!form) {
        return NextResponse.json(
          { success: false, error: 'Form not found' },
          { status: 404 }
        );
      }

      // Don't expose sensitive connection info in preview
      const { connectionString, ...previewForm } = form;

      return NextResponse.json({
        success: true,
        form: previewForm,
        isPreview: true,
      });
    }

    // For public access, check published forms first
    if (isPublicAccess) {
      // Try by slug first, then by ID
      let form = await getPublishedFormBySlug(formId);
      if (!form) {
        form = await getPublishedFormById(formId);
      }

      if (!form) {
        return NextResponse.json(
          { success: false, error: 'Form not found' },
          { status: 404 }
        );
      }

      if (!form.isPublished) {
        return NextResponse.json(
          { success: false, error: 'Form is not published' },
          { status: 403 }
        );
      }

      // Check access control BEFORE returning the form
      // This prevents users from filling out a form they can't submit
      if (form.accessControl && form.accessControl.type !== 'public') {
        const authSession = await getSession();
        const userId = authSession.userId;
        const userEmail = authSession.email;

        // Debug logging for access control issues
        console.log('[FormAccess] Checking access:', {
          formId,
          accessType: form.accessControl.type,
          hasSession: !!authSession,
          userId: userId || 'not authenticated',
          userEmail: userEmail || 'no email',
          allowedDomains: form.accessControl.allowedDomains,
          allowedEmails: form.accessControl.allowedEmails,
        });

        const accessResult = await checkFormAccess(
          form.accessControl,
          userId,
          userEmail
        );

        console.log('[FormAccess] Access check result:', {
          allowed: accessResult.allowed,
          reason: accessResult.reason,
          requiresAuth: accessResult.requiresAuth,
        });

        if (!accessResult.allowed) {
          // Don't expose sensitive connection info
          const { connectionString, ...publicForm } = form;

          return NextResponse.json({
            success: true,
            form: publicForm,
            accessDenied: true,
            accessResult: {
              allowed: false,
              reason: accessResult.reason,
              requiresAuth: accessResult.requiresAuth,
              allowedAuthMethods: accessResult.allowedAuthMethods,
              accessDescription: describeAccessRequirements(form.accessControl),
            },
          });
        }
      }

      // Don't expose sensitive connection info for public access
      const { connectionString, ...publicForm } = form;

      // Debug: Log what we're returning
      console.log('[API forms/[formId]] Returning form theme:', {
        hasTheme: !!publicForm.theme,
        theme: publicForm.theme,
        pageBackgroundColor: publicForm.theme?.pageBackgroundColor,
        pageBackgroundGradient: publicForm.theme?.pageBackgroundGradient,
      });

      return NextResponse.json({
        success: true,
        form: publicForm,
        accessDenied: false,
      });
    }

    // For authenticated access, try organization database first if orgId provided
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');
    
    if (orgId) {
      try {
        const session = await getSession();
        if (session.userId) {
          // Check organization database
          const formsCollection = await getOrgFormsCollection(orgId);
          // Try by formId first, then by id field
          const orgForm = await formsCollection.findOne({
            $or: [
              { formId },
              { id: formId },
              { slug: formId },
            ],
          });

          if (orgForm) {
            // Convert org form format to form builder format
            const form = {
              id: orgForm.formId || orgForm.id,
              formId: orgForm.formId || orgForm.id,
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
              isPublished: orgForm.isPublished || false,
              publishedAt: orgForm.publishedAt,
              organizationId: orgForm.organizationId,
              projectId: orgForm.projectId,
              applicationId: orgForm.applicationId,
              createdAt: orgForm.createdAt,
              updatedAt: orgForm.updatedAt,
            };

            console.log('[API forms/[formId]] Returning org form:', {
              formId: form.id,
              hasDataSource: !!form.dataSource,
              organizationId: form.organizationId,
              hasConversationalConfig: !!form.conversationalConfig,
              conversationalConfig: JSON.stringify(form.conversationalConfig),
              formType: form.formType,
            });

            return NextResponse.json({
              success: true,
              form,
            });
          }
        }
      } catch (orgError) {
        console.error('[API forms/[formId]] Error loading from org database:', orgError);
        // Fall through to session storage
      }
    }

    // Fall back to session storage
    const session = await getIronSession(await cookies(), sessionOptions);
    const sessionId = ensureSessionId(session);
    await session.save();

    const forms = await getForms(sessionId);
    const form = forms.find(f => f.id === formId || f.slug === formId);

    if (!form) {
      return NextResponse.json(
        { success: false, error: 'Form not found' },
        { status: 404 }
      );
    }

    // Debug: Log what we're returning
    console.log('[API forms/[formId]] Returning form dataSource:', {
      formId: form.id,
      hasDataSource: !!form.dataSource,
      dataSource: form.dataSource,
      vaultId: form.dataSource?.vaultId,
      collection: form.dataSource?.collection,
      organizationId: form.organizationId,
    });

    return NextResponse.json({
      success: true,
      form,
    });
  } catch (error: any) {
    console.error('Error getting form:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get form' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a form
async function handleDELETE(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { formId } = await params;
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');

    // If orgId is provided, delete from organization database
    if (orgId) {
      try {
        const session = await getSession();
        if (!session?.userId) {
          return NextResponse.json(
            { success: false, error: 'Unauthorized' },
            { status: 401 }
          );
        }

        // Check organization permissions
        const { getUserOrgPermissions } = await import('@/lib/platform/permissions');
        const permissions = await getUserOrgPermissions(session.userId, orgId);
        if (!permissions.orgRole) {
          return NextResponse.json(
            { success: false, error: 'Forbidden' },
            { status: 403 }
          );
        }

        // Delete from organization database
        const formsCollection = await getOrgFormsCollection(orgId);
        const result = await formsCollection.findOneAndDelete({
          $or: [
            { formId },
            { id: formId },
            { slug: formId },
          ],
        });

        if (!result) {
          return NextResponse.json(
            { success: false, error: 'Form not found' },
            { status: 404 }
          );
        }

        // Also remove from published forms
        await unpublishForm(formId);

        console.log('[API forms/[formId]] Deleted form from org database:', {
          formId,
          orgId,
          deletedFormId: result.formId || result.id,
        });

        return NextResponse.json({
          success: true,
          message: 'Form deleted successfully',
        });
      } catch (orgError) {
        console.error('[API forms/[formId]] Error deleting from org database:', orgError);
        // Fall through to session storage for backward compatibility
      }
    }

    // Fall back to session storage (for backward compatibility)
    const session = await getIronSession(await cookies(), sessionOptions);
    const sessionId = ensureSessionId(session);
    await session.save();

    const deleted = await deleteForm(sessionId, formId);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Form not found' },
        { status: 404 }
      );
    }

    // Also remove from published forms
    await unpublishForm(formId);

    return NextResponse.json({
      success: true,
      message: 'Form deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting form:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete form' },
      { status: 500 }
    );
  }
}

// PATCH - Update form (publish/unpublish)
async function handlePATCH(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { formId } = await params;
    const body = await request.json();
    const session = await getIronSession(await cookies(), sessionOptions);
    const sessionId = ensureSessionId(session);
    await session.save();

    const form = await getFormById(sessionId, formId);

    if (!form) {
      return NextResponse.json(
        { success: false, error: 'Form not found' },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();

    // Handle publish/unpublish
    if (body.isPublished !== undefined) {
      form.isPublished = body.isPublished;
      if (body.isPublished && !form.publishedAt) {
        form.publishedAt = now;
      }
    }

    // Handle other updates
    if (body.name) form.name = body.name;
    if (body.description !== undefined) form.description = body.description;
    if (body.theme) form.theme = body.theme;
    if (body.branding) form.branding = body.branding;

    form.updatedAt = now;

    // Save to session storage
    await saveForm(sessionId, form);

    // Update published forms if needed
    if (form.isPublished) {
      await publishForm(form);
    } else {
      await unpublishForm(formId);
    }

    return NextResponse.json({
      success: true,
      form: {
        id: form.id,
        name: form.name,
        slug: form.slug,
        isPublished: form.isPublished,
        publishedAt: form.publishedAt,
        updatedAt: form.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('Error updating form:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update form' },
      { status: 500 }
    );
  }
}

// Export with timing instrumentation
export const GET = withTiming(handleGET);
export const DELETE = withTiming(handleDELETE);
export const PATCH = withTiming(handlePATCH);
