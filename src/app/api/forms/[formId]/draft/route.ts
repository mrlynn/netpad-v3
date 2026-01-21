import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, ensureSessionId } from '@/lib/session';
import {
  getDraftForForm,
  saveDraft,
  deleteDraft,
  getGlobalDraftForForm,
  saveGlobalDraft,
  deleteGlobalDraft,
} from '@/lib/draftStorage';
import { getFormById, getPublishedFormById } from '@/lib/storage';
import { FormDraft, FormConfiguration } from '@/types/form';
import {
  savePartialSubmission,
  getPartialSubmission,
  PartialSubmissionProgress,
} from '@/lib/platform/submissions';

export const dynamic = 'force-dynamic';

/**
 * Calculate completion progress from form data and configuration
 */
function calculateFormProgress(
  data: Record<string, unknown>,
  form: FormConfiguration,
  currentPage: number,
  fieldInteractions?: Record<string, any>
): PartialSubmissionProgress {
  const completedFields: string[] = [];
  const missingRequiredFields: string[] = [];

  // Get all fields from the form (using fieldConfigs)
  const allFields = form.fieldConfigs || [];
  const requiredFields = allFields.filter((f) => f.required);

  // Check which fields are completed
  for (const field of allFields) {
    const fieldId = field.path;
    const value = data[fieldId];

    if (value !== null && value !== undefined && value !== '') {
      completedFields.push(fieldId);
    }
  }

  // Check which required fields are missing
  for (const field of requiredFields) {
    const fieldId = field.path;
    const value = data[fieldId];

    if (value === null || value === undefined || value === '') {
      missingRequiredFields.push(fieldId);
    }
  }

  // Calculate completion percentage
  const completionPercentage = requiredFields.length > 0
    ? Math.round(((requiredFields.length - missingRequiredFields.length) / requiredFields.length) * 100)
    : (allFields.length > 0 ? Math.round((completedFields.length / allFields.length) * 100) : 0);

  return {
    completionPercentage,
    completedFields,
    missingRequiredFields,
    currentPage,
    totalPages: 1, // Multi-page support can be added later
    fieldInteractions,
  };
}

/**
 * GET - Retrieve draft for a form
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { formId } = await params;
    const session = await getIronSession(await cookies(), sessionOptions);
    const sessionId = ensureSessionId(session);
    await session.save();

    // Check for fingerprint (for published forms)
    const fingerprint = request.nextUrl.searchParams.get('fingerprint');

    // Try to find draft
    let draft: FormDraft | null = null;

    // First check session-based draft
    draft = await getDraftForForm(sessionId, formId);

    // If not found and fingerprint provided, check global drafts
    if (!draft && fingerprint) {
      draft = await getGlobalDraftForForm(formId, fingerprint);
    }

    // Also check by session ID in global drafts
    if (!draft) {
      draft = await getGlobalDraftForForm(formId, sessionId);
    }

    if (!draft) {
      return NextResponse.json({
        success: true,
        draft: null,
      });
    }

    // Check if draft has expired
    if (draft.expiresAt && new Date(draft.expiresAt) < new Date()) {
      // Delete expired draft
      await deleteDraft(sessionId, formId);
      await deleteGlobalDraft(formId, fingerprint || sessionId);

      return NextResponse.json({
        success: true,
        draft: null,
      });
    }

    return NextResponse.json({
      success: true,
      draft,
    });
  } catch (error: any) {
    console.error('Error getting draft:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get draft' },
      { status: 500 }
    );
  }
}

/**
 * POST - Save/update draft for a form
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { formId } = await params;
    const body = await request.json();

    const session = await getIronSession(await cookies(), sessionOptions);
    const sessionId = ensureSessionId(session);
    await session.save();

    // Validate required fields
    if (!body.data || typeof body.data !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Draft data is required' },
        { status: 400 }
      );
    }

    // Check if this is for a published form or user's own form
    const isPublishedForm = await getPublishedFormById(formId);
    const isOwnForm = await getFormById(sessionId, formId);

    if (!isPublishedForm && !isOwnForm) {
      return NextResponse.json(
        { success: false, error: 'Form not found' },
        { status: 404 }
      );
    }

    // Check if form has draft settings enabled
    const form = isPublishedForm || isOwnForm;
    if (form?.draftSettings?.enabled === false) {
      return NextResponse.json(
        { success: false, error: 'Drafts are not enabled for this form' },
        { status: 400 }
      );
    }

    // Calculate expiry based on form settings or default (7 days)
    const draftTTL = form?.draftSettings?.draftTTL || 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + draftTTL);

    const draft: FormDraft = {
      id: body.id || `draft_${formId}_${Date.now()}`,
      formId,
      data: body.data,
      currentPage: body.currentPage || 0,
      fieldInteractions: body.fieldInteractions || {},
      startedAt: body.startedAt || new Date().toISOString(),
      lastSavedAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      sessionId,
      fingerprint: body.fingerprint,
    };

    // Determine storage type from form settings
    const storageType = form?.draftSettings?.storageType || 'both';

    if (isPublishedForm) {
      // For published forms, save to global drafts
      if (storageType === 'server' || storageType === 'both') {
        await saveGlobalDraft(draft);
      }
    } else {
      // For user's own forms, save to session drafts
      if (storageType === 'server' || storageType === 'both') {
        await saveDraft(sessionId, draft);
      }
    }

    // Also persist to MongoDB for platform forms (for analytics)
    // This runs in addition to file-based storage
    if (form?.organizationId) {
      try {
        // Calculate progress for analytics
        const progress = calculateFormProgress(
          body.data,
          form,
          body.currentPage || 0,
          body.fieldInteractions
        );

        await savePartialSubmission(form.organizationId, {
          formId,
          projectId: form.projectId,
          data: body.data,
          progress,
          sessionId,
          fingerprint: body.fingerprint,
          draftTTLDays: draftTTL,
        });
      } catch (dbError) {
        // Don't fail the request if DB save fails - file storage is primary
        console.error('[Draft API] Failed to save partial to DB:', dbError);
      }
    }

    return NextResponse.json({
      success: true,
      draft: {
        id: draft.id,
        lastSavedAt: draft.lastSavedAt,
        expiresAt: draft.expiresAt,
      },
    });
  } catch (error: any) {
    console.error('Error saving draft:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save draft' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete draft for a form
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { formId } = await params;

    const session = await getIronSession(await cookies(), sessionOptions);
    const sessionId = ensureSessionId(session);
    await session.save();

    // Get fingerprint from query params or body
    const fingerprint = request.nextUrl.searchParams.get('fingerprint');

    // Delete from both session and global storage
    const sessionDeleted = await deleteDraft(sessionId, formId);
    const globalDeleted = await deleteGlobalDraft(formId, fingerprint || sessionId);

    return NextResponse.json({
      success: true,
      deleted: sessionDeleted || globalDeleted,
    });
  } catch (error: any) {
    console.error('Error deleting draft:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete draft' },
      { status: 500 }
    );
  }
}
