/**
 * Public API - Single Submission Endpoint
 *
 * GET /api/v1/forms/:formId/submissions/:submissionId - Get submission
 * DELETE /api/v1/forms/:formId/submissions/:submissionId - Delete submission
 */

import { NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';
import { connectDB } from '@/lib/mongodb';
import {
  authenticateAPIRequest,
  checkFormAccess,
  createAPIResponse,
  createAPIErrorResponse,
} from '@/lib/api/middleware';
import { PublicSubmission } from '@/types/api';

interface RouteParams {
  params: Promise<{ formId: string; submissionId: string }>;
}

/**
 * GET /api/v1/forms/:formId/submissions/:submissionId
 * Get a single submission
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { formId, submissionId } = await params;

  // Authenticate
  const auth = await authenticateAPIRequest(request, ['submissions:read']);
  if (!auth.success) {
    return auth.response;
  }

  const { context } = auth;

  // Check form access
  const formAccess = checkFormAccess(context, formId);
  if (!formAccess.allowed) {
    return formAccess.response!;
  }

  try {
    const db = await connectDB();

    // Verify form exists and belongs to org
    const formsCollection = db.collection('forms');
    const form = await formsCollection.findOne({
      organizationId: context.organizationId,
      $or: [{ id: formId }, { slug: formId }],
    });

    if (!form) {
      return createAPIErrorResponse(
        'FORM_NOT_FOUND',
        'Form not found',
        404,
        context
      );
    }

    const actualFormId = form.id || form._id.toString();

    // Get submission
    const responsesCollection = db.collection('form_responses');

    // Build query - try both id field and ObjectId
    const submissionQuery: any = { formId: actualFormId };
    if (ObjectId.isValid(submissionId)) {
      submissionQuery.$or = [{ id: submissionId }, { _id: new ObjectId(submissionId) }];
    } else {
      submissionQuery.id = submissionId;
    }

    const submission = await responsesCollection.findOne(submissionQuery);

    if (!submission) {
      return createAPIErrorResponse(
        'SUBMISSION_NOT_FOUND',
        'Submission not found',
        404,
        context
      );
    }

    const response: PublicSubmission = {
      id: submission.id || submission._id.toString(),
      formId: submission.formId,
      data: submission.data,
      metadata: {
        submittedAt: submission.submittedAt?.toISOString?.() || submission.submittedAt,
        ipAddress: submission.metadata?.ipAddress,
        userAgent: submission.metadata?.userAgent,
        referrer: submission.metadata?.referrer,
      },
    };

    return createAPIResponse(response, context);
  } catch (error) {
    console.error('[API v1] Error getting submission:', error);
    return createAPIErrorResponse(
      'INTERNAL_ERROR',
      'Failed to get submission',
      500,
      context
    );
  }
}

/**
 * DELETE /api/v1/forms/:formId/submissions/:submissionId
 * Delete a submission
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { formId, submissionId } = await params;

  // Authenticate
  const auth = await authenticateAPIRequest(request, ['submissions:delete']);
  if (!auth.success) {
    return auth.response;
  }

  const { context } = auth;

  // Check form access
  const formAccess = checkFormAccess(context, formId);
  if (!formAccess.allowed) {
    return formAccess.response!;
  }

  try {
    const db = await connectDB();

    // Verify form exists and belongs to org
    const formsCollection = db.collection('forms');
    const form = await formsCollection.findOne({
      organizationId: context.organizationId,
      $or: [{ id: formId }, { slug: formId }],
    });

    if (!form) {
      return createAPIErrorResponse(
        'FORM_NOT_FOUND',
        'Form not found',
        404,
        context
      );
    }

    const actualFormId = form.id || form._id.toString();

    // Delete submission
    const responsesCollection = db.collection('form_responses');

    // Build query - try both id field and ObjectId
    const deleteQuery: any = { formId: actualFormId };
    if (ObjectId.isValid(submissionId)) {
      deleteQuery.$or = [{ id: submissionId }, { _id: new ObjectId(submissionId) }];
    } else {
      deleteQuery.id = submissionId;
    }

    const result = await responsesCollection.findOneAndDelete(deleteQuery);

    if (!result) {
      return createAPIErrorResponse(
        'SUBMISSION_NOT_FOUND',
        'Submission not found',
        404,
        context
      );
    }

    return createAPIResponse(
      { deleted: true, submissionId: result.id || result._id.toString() },
      context
    );
  } catch (error) {
    console.error('[API v1] Error deleting submission:', error);
    return createAPIErrorResponse(
      'INTERNAL_ERROR',
      'Failed to delete submission',
      500,
      context
    );
  }
}
