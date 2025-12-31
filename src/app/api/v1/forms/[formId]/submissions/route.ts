/**
 * Public API - Form Submissions Endpoint
 *
 * GET /api/v1/forms/:formId/submissions - List submissions
 * POST /api/v1/forms/:formId/submissions - Create a new submission
 */

import { NextRequest } from 'next/server';
import { randomBytes } from 'crypto';
import { connectDB } from '@/lib/mongodb';
import {
  authenticateAPIRequest,
  checkFormAccess,
  createAPIResponse,
  createPaginatedResponse,
  createAPIErrorResponse,
} from '@/lib/api/middleware';
import { PublicSubmission, SubmitFormResponse } from '@/types/api';

interface RouteParams {
  params: Promise<{ formId: string }>;
}

/**
 * GET /api/v1/forms/:formId/submissions
 * List form submissions
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { formId } = await params;

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
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20')));
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const sortBy = searchParams.get('sortBy') || 'submittedAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;

    const db = await connectDB();

    // First, verify form exists and belongs to org
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

    // Build query
    const query: Record<string, any> = {
      formId: actualFormId,
    };

    if (startDate || endDate) {
      query.submittedAt = {};
      if (startDate) query.submittedAt.$gte = new Date(startDate);
      if (endDate) query.submittedAt.$lte = new Date(endDate);
    }

    // Get submissions
    const responsesCollection = db.collection('form_responses');

    const [submissions, total] = await Promise.all([
      responsesCollection
        .find(query)
        .sort({ [sortBy]: sortOrder })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .toArray(),
      responsesCollection.countDocuments(query),
    ]);

    // Transform to public format
    const data: PublicSubmission[] = submissions.map((sub) => ({
      id: sub.id || sub._id.toString(),
      formId: sub.formId,
      data: sub.data,
      metadata: {
        submittedAt: sub.submittedAt?.toISOString?.() || sub.submittedAt,
        ipAddress: sub.metadata?.ipAddress,
        userAgent: sub.metadata?.userAgent,
        referrer: sub.metadata?.referrer,
      },
    }));

    return createPaginatedResponse(data, context, {
      total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('[API v1] Error listing submissions:', error);
    return createAPIErrorResponse(
      'INTERNAL_ERROR',
      'Failed to list submissions',
      500,
      context
    );
  }
}

/**
 * POST /api/v1/forms/:formId/submissions
 * Create a new submission (submit form data)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { formId } = await params;

  // Authenticate
  const auth = await authenticateAPIRequest(request, ['submissions:write']);
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
    const body = await request.json();

    if (!body.data || typeof body.data !== 'object') {
      return createAPIErrorResponse(
        'VALIDATION_ERROR',
        'Submission data is required',
        400,
        context,
        { field: 'data' }
      );
    }

    const db = await connectDB();

    // Verify form exists and is published (unless test mode)
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

    // Allow test API keys to submit to unpublished forms
    if (!form.isPublished && context.apiKey.environment !== 'test') {
      return createAPIErrorResponse(
        'FORM_NOT_PUBLISHED',
        'Form is not published. Use a test API key to submit to draft forms.',
        400,
        context
      );
    }

    const actualFormId = form.id || form._id.toString();
    const now = new Date();
    const submissionId = randomBytes(16).toString('hex');

    // Extract client info from request headers
    const userAgent = request.headers.get('user-agent') || undefined;
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor?.split(',')[0]?.trim() || 'api';

    const submission = {
      id: submissionId,
      formId: actualFormId,
      formName: form.name,
      data: body.data,
      status: 'submitted',
      submittedAt: now,
      metadata: {
        ipAddress,
        userAgent,
        referrer: body.metadata?.referrer,
        source: 'api',
        apiKeyId: context.apiKey.id,
        customFields: body.metadata?.customFields,
      },
    };

    const responsesCollection = db.collection('form_responses');
    await responsesCollection.insertOne(submission);

    const response: SubmitFormResponse = {
      success: true,
      data: {
        submissionId,
        formId: actualFormId,
        submittedAt: now.toISOString(),
      },
      requestId: context.requestId,
    };

    return createAPIResponse(response.data, context, 201);
  } catch (error) {
    console.error('[API v1] Error creating submission:', error);
    return createAPIErrorResponse(
      'INTERNAL_ERROR',
      'Failed to create submission',
      500,
      context
    );
  }
}
