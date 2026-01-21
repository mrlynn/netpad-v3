/**
 * Public API - Applications Endpoint
 *
 * GET /api/v1/applications - List all applications for the organization
 */

import { NextRequest } from 'next/server';
import {
  authenticateAPIRequest,
  createPaginatedResponse,
  createAPIErrorResponse,
} from '@/lib/api/middleware';
import { listAllOrgApplications } from '@/lib/platform/applications';

/**
 * GET /api/v1/applications
 * List all applications for the organization
 */
export async function GET(request: NextRequest) {
  // Authenticate with API key
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
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') as 'draft' | 'active' | 'archived' | undefined;

    // Get applications for the organization
    const result = await listAllOrgApplications(context.organizationId, {
      page,
      pageSize,
      sortBy: 'updatedAt',
      sortOrder: 'desc',
      search,
      status,
    });

    // Transform to API response format
    const data = result.applications.map((app: any) => ({
      applicationId: app.applicationId,
      projectId: app.projectId,
      name: app.name,
      description: app.description,
      slug: app.slug,
      icon: app.icon,
      color: app.color,
      version: app.version,
      tags: app.tags,
      status: app.status,
      isDefault: app.isDefault,
      stats: app.stats,
      marketplaceApplicationId: app.marketplaceApplicationId,
      marketplaceVersion: app.marketplaceVersion,
      createdAt: app.createdAt instanceof Date ? app.createdAt.toISOString() : app.createdAt,
      updatedAt: app.updatedAt instanceof Date ? app.updatedAt.toISOString() : app.updatedAt,
    }));

    return createPaginatedResponse(data, context, {
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    });
  } catch (error) {
    console.error('[API v1] Error listing applications:', error);
    return createAPIErrorResponse(
      'INTERNAL_ERROR',
      'Failed to list applications',
      500,
      context
    );
  }
}
