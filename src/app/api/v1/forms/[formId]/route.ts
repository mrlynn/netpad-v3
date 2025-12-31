/**
 * Public API - Single Form Endpoint
 *
 * GET /api/v1/forms/:formId - Get form details
 * PATCH /api/v1/forms/:formId - Update form
 * DELETE /api/v1/forms/:formId - Delete form
 */

import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import {
  authenticateAPIRequest,
  checkFormAccess,
  createAPIResponse,
  createAPIErrorResponse,
} from '@/lib/api/middleware';
import { PublicFormDetail, PublicFieldConfig } from '@/types/api';

interface RouteParams {
  params: Promise<{ formId: string }>;
}

/**
 * GET /api/v1/forms/:formId
 * Get form details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { formId } = await params;

  // Authenticate
  const auth = await authenticateAPIRequest(request, ['forms:read']);
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
    const formsCollection = db.collection('forms');

    // Find form by ID or slug
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

    // Get response count
    const responsesCollection = db.collection('form_responses');
    const responseCount = await responsesCollection.countDocuments({
      formId: form.id || form._id.toString(),
    });

    // Transform fields to public format
    const fields: PublicFieldConfig[] = (form.fieldConfigs || [])
      .filter((f: any) => f.included !== false)
      .map((f: any) => ({
        id: f.path,
        path: f.path,
        label: f.label,
        type: f.type,
        required: f.required || false,
        placeholder: f.placeholder,
        helpText: f.description,
        options: f.options,
        validation: f.validation
          ? {
              minLength: f.validation.minLength,
              maxLength: f.validation.maxLength,
              pattern: f.validation.pattern,
              min: f.validation.min,
              max: f.validation.max,
            }
          : undefined,
      }));

    const response: PublicFormDetail = {
      id: form.id || form._id.toString(),
      slug: form.slug || form.id || form._id.toString(),
      name: form.name,
      description: form.description,
      status: form.isPublished ? 'published' : 'draft',
      responseCount,
      createdAt: form.createdAt?.toISOString?.() || form.createdAt,
      updatedAt: form.updatedAt?.toISOString?.() || form.updatedAt || form.createdAt?.toISOString?.() || form.createdAt,
      publishedAt: form.publishedAt?.toISOString?.() || form.publishedAt,
      fields,
      settings: {
        submitButtonText: form.submitButtonText,
        successMessage: form.hooks?.onSuccess?.message,
        redirectUrl: form.hooks?.onSuccess?.redirect?.url,
      },
    };

    return createAPIResponse(response, context);
  } catch (error) {
    console.error('[API v1] Error getting form:', error);
    return createAPIErrorResponse(
      'INTERNAL_ERROR',
      'Failed to get form',
      500,
      context
    );
  }
}

/**
 * PATCH /api/v1/forms/:formId
 * Update form
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { formId } = await params;

  // Authenticate
  const auth = await authenticateAPIRequest(request, ['forms:write']);
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
    const db = await connectDB();
    const formsCollection = db.collection('forms');

    // Find existing form
    const existingForm = await formsCollection.findOne({
      organizationId: context.organizationId,
      $or: [{ id: formId }, { slug: formId }],
    });

    if (!existingForm) {
      return createAPIErrorResponse(
        'FORM_NOT_FOUND',
        'Form not found',
        404,
        context
      );
    }

    // Build update object (only allow certain fields)
    const updates: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.fields !== undefined) updates.fieldConfigs = body.fields;

    // Handle publish/unpublish
    if (body.status === 'published' && !existingForm.isPublished) {
      updates.isPublished = true;
      updates.publishedAt = new Date();
    } else if (body.status === 'draft' && existingForm.isPublished) {
      updates.isPublished = false;
    }

    await formsCollection.updateOne(
      { _id: existingForm._id },
      { $set: updates }
    );

    // Return updated form
    const updatedForm = await formsCollection.findOne({ _id: existingForm._id });

    const response = {
      id: updatedForm!.id || updatedForm!._id.toString(),
      slug: updatedForm!.slug,
      name: updatedForm!.name,
      description: updatedForm!.description,
      status: updatedForm!.isPublished ? 'published' : 'draft',
      updatedAt: updatedForm!.updatedAt?.toISOString?.() || updatedForm!.updatedAt,
    };

    return createAPIResponse(response, context);
  } catch (error) {
    console.error('[API v1] Error updating form:', error);
    return createAPIErrorResponse(
      'INTERNAL_ERROR',
      'Failed to update form',
      500,
      context
    );
  }
}

/**
 * DELETE /api/v1/forms/:formId
 * Delete form
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { formId } = await params;

  // Authenticate
  const auth = await authenticateAPIRequest(request, ['forms:delete']);
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
    const formsCollection = db.collection('forms');

    // Find and delete form
    const result = await formsCollection.findOneAndDelete({
      organizationId: context.organizationId,
      $or: [{ id: formId }, { slug: formId }],
    });

    if (!result) {
      return createAPIErrorResponse(
        'FORM_NOT_FOUND',
        'Form not found',
        404,
        context
      );
    }

    // Optionally delete associated responses
    const responsesCollection = db.collection('form_responses');
    await responsesCollection.deleteMany({
      formId: result.id || result._id.toString(),
    });

    return createAPIResponse(
      { deleted: true, formId: result.id || result._id.toString() },
      context
    );
  } catch (error) {
    console.error('[API v1] Error deleting form:', error);
    return createAPIErrorResponse(
      'INTERNAL_ERROR',
      'Failed to delete form',
      500,
      context
    );
  }
}
