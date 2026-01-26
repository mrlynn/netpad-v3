/**
 * Projects API (v1 - API Key Authentication)
 *
 * GET /api/v1/projects - List projects for the API key's organization
 *
 * This endpoint uses API key authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateAPIRequest, createAPIErrorResponse } from '@/lib/api/middleware';
import { getProjectsCollection } from '@/lib/platform/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/v1/projects
 * List projects accessible by the API key
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate with API key
    const authResult = await authenticateAPIRequest(request);

    if (!authResult.success) {
      return authResult.response;
    }

    const { organizationId, requestId } = authResult.context;

    // Get projects for this organization
    const projectsCollection = await getProjectsCollection();
    const projects = await projectsCollection
      .find({ organizationId })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      data: projects.map((project) => ({
        projectId: project.projectId,
        name: project.name,
        slug: project.slug,
        description: project.description,
        organizationId: project.organizationId,
        createdAt: project.createdAt instanceof Date ? project.createdAt.toISOString() : project.createdAt,
      })),
      requestId,
    });
  } catch (error: unknown) {
    console.error('[Projects API v1] Error:', error);
    return createAPIErrorResponse(
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : 'Failed to list projects',
      500
    );
  }
}
