/**
 * Organizations API (v1 - API Key Authentication)
 *
 * GET /api/v1/organizations - List organizations for API key's organization
 *
 * This endpoint uses API key authentication instead of session-based auth.
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateAPIRequest } from '@/lib/api/middleware';
import { getOrganizationsCollection } from '@/lib/platform/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/v1/organizations
 * List organizations accessible by the API key
 */
export async function GET(request: NextRequest) {
  let requestId = 'unknown';
  
  try {
    // Authenticate with API key
    const authResult = await authenticateAPIRequest(request);

    if (!authResult.success) {
      return authResult.response;
    }

    const { apiKey, organizationId } = authResult.context;
    requestId = authResult.context.requestId;

    // Validate organizationId
    if (!organizationId || typeof organizationId !== 'string') {
      console.error('[Organizations API v1] Invalid organizationId:', organizationId);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_ORGANIZATION_ID',
            message: 'Invalid organization ID in API key',
          },
          requestId,
        },
        { status: 400 }
      );
    }

    // Get the organization directly from the API key's organizationId
    let orgsCollection;
    try {
      orgsCollection = await getOrganizationsCollection();
    } catch (dbError: any) {
      console.error('[Organizations API v1] Database connection error:', dbError);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Failed to connect to database',
            ...(process.env.NODE_ENV === 'development' && { details: dbError.message }),
          },
          requestId,
        },
        { status: 500 }
      );
    }

    let org;
    try {
      org = await orgsCollection.findOne({ orgId: organizationId });
    } catch (queryError: any) {
      console.error('[Organizations API v1] Query error:', queryError);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'QUERY_ERROR',
            message: 'Failed to query organization',
            ...(process.env.NODE_ENV === 'development' && { details: queryError.message }),
          },
          requestId,
        },
        { status: 500 }
      );
    }

    if (!org) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'ORGANIZATION_NOT_FOUND',
            message: 'Organization not found for this API key',
          },
          requestId,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: [
        {
          organizationId: org.orgId,
          name: org.name,
          slug: org.slug,
          plan: org.plan,
          subscription: org.subscription,
          settings: org.settings,
          createdAt: org.createdAt instanceof Date ? org.createdAt.toISOString() : org.createdAt,
        },
      ],
      requestId,
    });
  } catch (error: any) {
    console.error('[Organizations API v1] Unexpected error:', error);
    console.error('[Organizations API v1] Error type:', error?.constructor?.name);
    console.error('[Organizations API v1] Stack:', error?.stack);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error?.message || 'Failed to list organizations',
          ...(process.env.NODE_ENV === 'development' && { 
            stack: error?.stack,
            type: error?.constructor?.name,
          }),
        },
        requestId,
      },
      { status: 500 }
    );
  }
}
