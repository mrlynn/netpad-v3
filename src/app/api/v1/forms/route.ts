/**
 * Public API - Forms Endpoint
 *
 * GET /api/v1/forms - List all forms
 * POST /api/v1/forms - Create a new form
 */

import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import {
  authenticateAPIRequest,
  createAPIResponse,
  createPaginatedResponse,
  createAPIErrorResponse,
} from '@/lib/api/middleware';
import { PublicFormSummary } from '@/types/api';

/**
 * GET /api/v1/forms
 * List all forms for the organization
 */
export async function GET(request: NextRequest) {
  // Authenticate
  const auth = await authenticateAPIRequest(request, ['forms:read']);
  if (!auth.success) {
    return auth.response;
  }

  const { context } = auth;

  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20')));
    const status = searchParams.get('status'); // 'draft' | 'published' | null (all)
    const search = searchParams.get('search');

    // Build query
    const query: Record<string, any> = {
      organizationId: context.organizationId,
    };

    if (status === 'published') {
      query.isPublished = true;
    } else if (status === 'draft') {
      query.isPublished = { $ne: true };
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Get forms
    const db = await connectDB();
    const formsCollection = db.collection('forms');

    const [forms, total] = await Promise.all([
      formsCollection
        .find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .toArray(),
      formsCollection.countDocuments(query),
    ]);

    // Get response counts for each form
    const responsesCollection = db.collection('form_responses');
    const formIds = forms.map((f) => f.id || f._id.toString());

    const responseCounts = await responsesCollection
      .aggregate([
        { $match: { formId: { $in: formIds } } },
        { $group: { _id: '$formId', count: { $sum: 1 } } },
      ])
      .toArray();

    const responseCountMap = new Map(
      responseCounts.map((r) => [r._id, r.count])
    );

    // Transform to public format
    const data: PublicFormSummary[] = forms.map((form) => ({
      id: form.id || form._id.toString(),
      slug: form.slug || form.id || form._id.toString(),
      name: form.name,
      description: form.description,
      status: form.isPublished ? 'published' : 'draft',
      responseCount: responseCountMap.get(form.id || form._id.toString()) || 0,
      createdAt: form.createdAt?.toISOString?.() || form.createdAt,
      updatedAt: form.updatedAt?.toISOString?.() || form.updatedAt || form.createdAt?.toISOString?.() || form.createdAt,
      publishedAt: form.publishedAt?.toISOString?.() || form.publishedAt,
    }));

    return createPaginatedResponse(data, context, {
      total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('[API v1] Error listing forms:', error);
    return createAPIErrorResponse(
      'INTERNAL_ERROR',
      'Failed to list forms',
      500,
      context
    );
  }
}

/**
 * POST /api/v1/forms
 * Create a new form
 */
export async function POST(request: NextRequest) {
  // Authenticate
  const auth = await authenticateAPIRequest(request, ['forms:write']);
  if (!auth.success) {
    return auth.response;
  }

  const { context } = auth;

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name || typeof body.name !== 'string') {
      return createAPIErrorResponse(
        'VALIDATION_ERROR',
        'Form name is required',
        400,
        context,
        { field: 'name' }
      );
    }

    // Generate slug
    const slug = body.slug || body.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const db = await connectDB();
    const formsCollection = db.collection('forms');

    // Check for duplicate slug
    const existingForm = await formsCollection.findOne({
      organizationId: context.organizationId,
      slug,
    });

    if (existingForm) {
      return createAPIErrorResponse(
        'DUPLICATE_SLUG',
        'A form with this slug already exists',
        409,
        context,
        { slug }
      );
    }

    const now = new Date();
    const formId = new Date().getTime().toString(36) + Math.random().toString(36).substr(2, 9);

    const newForm = {
      id: formId,
      organizationId: context.organizationId,
      name: body.name,
      description: body.description || '',
      slug,
      fieldConfigs: body.fields || [],
      isPublished: false,
      createdAt: now,
      updatedAt: now,
      createdBy: `api:${context.apiKey.id}`,
    };

    await formsCollection.insertOne(newForm);

    const response: PublicFormSummary = {
      id: formId,
      slug,
      name: newForm.name,
      description: newForm.description,
      status: 'draft',
      responseCount: 0,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    return createAPIResponse(response, context, 201);
  } catch (error) {
    console.error('[API v1] Error creating form:', error);
    return createAPIErrorResponse(
      'INTERNAL_ERROR',
      'Failed to create form',
      500,
      context
    );
  }
}
