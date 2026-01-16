/**
 * Legacy Application URL Redirect API
 *
 * GET /api/redirect/legacy-app?orgId=X&projectId=Y&applicationId=Z&path=...
 *
 * Returns the new URL for a legacy application URL.
 * Used by middleware to perform 301 redirects.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getApplication } from '@/lib/platform/applications';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');
    const projectId = searchParams.get('projectId');
    const applicationId = searchParams.get('applicationId');
    const path = searchParams.get('path') || '';

    if (!orgId || !applicationId) {
      return NextResponse.json(
        { error: 'orgId and applicationId are required' },
        { status: 400 }
      );
    }

    // Get application to retrieve slug
    const application = await getApplication(orgId, applicationId);

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Build new URL path
    // Old: /orgs/:org/projects/:proj/applications/:appId/forms
    // New: /apps/:appSlug/forms
    let newPath = `/apps/${application.slug}`;

    // Map old sub-paths to new sub-paths
    if (path) {
      // Remove leading slash if present
      const cleanPath = path.startsWith('/') ? path.slice(1) : path;

      // Map common paths
      if (cleanPath === '' || cleanPath === 'forms') {
        newPath = `/apps/${application.slug}/forms`;
      } else if (cleanPath === 'workflows') {
        newPath = `/apps/${application.slug}/workflows`;
      } else if (cleanPath === 'data') {
        newPath = `/apps/${application.slug}/data`;
      } else if (cleanPath === 'settings') {
        newPath = `/apps/${application.slug}/settings`;
      } else {
        // Preserve other paths (e.g., /forms/:formId, /workflows/:workflowId)
        newPath = `/apps/${application.slug}/${cleanPath}`;
      }
    } else {
      // Default to forms if no path specified
      newPath = `/apps/${application.slug}/forms`;
    }

    // Return the new path (middleware will handle the redirect)
    return NextResponse.json({
      success: true,
      newPath,
      slug: application.slug,
    });
  } catch (error) {
    console.error('[Legacy App Redirect API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to resolve redirect' },
      { status: 500 }
    );
  }
}
