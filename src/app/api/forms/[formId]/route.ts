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

export const dynamic = 'force-dynamic';

// GET - Retrieve a specific form by ID or slug
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { formId } = await params;
    const isPublicAccess = request.nextUrl.searchParams.get('public') === 'true';

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

    // For authenticated access, get from session storage
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
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { formId } = await params;
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
export async function PATCH(
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
