/**
 * Application Details API
 *
 * GET    /api/applications/[applicationId] - Get application details
 * PATCH  /api/applications/[applicationId] - Update application
 * DELETE /api/applications/[applicationId] - Delete application
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import {
  getApplication,
  updateApplication,
  deleteApplication,
  calculateApplicationStats,
} from '@/lib/platform/applications';
import { getUserOrgPermissions } from '@/lib/platform/permissions';
import { checkApplicationPermission } from '@/lib/platform/applicationPermissions';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    const session = await getSession();
    const { applicationId } = await params;
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');

    if (!session.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!orgId) {
      return NextResponse.json(
        { error: 'orgId query parameter is required' },
        { status: 400 }
      );
    }

    let application = await getApplication(orgId, applicationId);
    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Check permission to read application (Phase 10)
    const permissionCheck = await checkApplicationPermission(
      session.userId,
      orgId,
      applicationId,
      'read'
    );

    if (!permissionCheck.allowed) {
      return NextResponse.json(
        { error: 'Insufficient permissions', reason: permissionCheck.reason },
        { status: 403 }
      );
    }

    // Recalculate stats to ensure they're up-to-date
    try {
      await calculateApplicationStats(orgId, applicationId);
      // Refresh application to get updated stats
      const refreshedApplication = await getApplication(orgId, applicationId);
      if (refreshedApplication) {
        application = refreshedApplication;
      }
    } catch (error) {
      console.error('[Applications API] Failed to recalculate stats:', error);
      // Continue with existing stats if recalculation fails
    }

    // TypeScript guard: application should never be null here, but add check for safety
    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      application: {
        applicationId: application.applicationId,
        projectId: application.projectId,
        organizationId: application.organizationId,
        name: application.name,
        description: application.description,
        slug: application.slug,
        icon: application.icon,
        color: application.color,
        version: application.version,
        tags: application.tags,
        stats: application.stats,
        status: application.status,
        isDefault: application.isDefault,
        marketplaceApplicationId: application.marketplaceApplicationId,
        marketplaceVersion: application.marketplaceVersion,
        createdBy: application.createdBy,
        createdAt: application.createdAt,
        updatedAt: application.updatedAt,
      },
    });
  } catch (error) {
    console.error('[Applications API] Get error:', error);
    return NextResponse.json(
      { error: 'Failed to get application' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    const session = await getSession();
    const { applicationId } = await params;
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');

    if (!session.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!orgId) {
      return NextResponse.json(
        { error: 'orgId query parameter is required' },
        { status: 400 }
      );
    }

    // Get existing application to check permissions
    const existing = await getApplication(orgId, applicationId);
    if (!existing) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Check permission to edit application (Phase 10)
    const permissionCheck = await checkApplicationPermission(
      session.userId,
      orgId,
      applicationId,
      'edit'
    );

    if (!permissionCheck.allowed) {
      return NextResponse.json(
        { error: 'Insufficient permissions', reason: permissionCheck.reason },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      description,
      slug,
      icon,
      color,
      version,
      tags,
      status,
    } = body;

    // Validate slug if provided
    if (slug && !/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { error: 'Slug must contain only lowercase letters, numbers, and hyphens' },
        { status: 400 }
      );
    }

    // Prevent modifying isDefault flag
    if (body.isDefault !== undefined) {
      return NextResponse.json(
        { error: 'Cannot modify isDefault flag' },
        { status: 400 }
      );
    }

    const application = await updateApplication(orgId, applicationId, {
      name,
      description,
      slug,
      icon,
      color,
      version,
      tags,
      status,
    });

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      application: {
        applicationId: application.applicationId,
        projectId: application.projectId,
        organizationId: application.organizationId,
        name: application.name,
        description: application.description,
        slug: application.slug,
        icon: application.icon,
        color: application.color,
        version: application.version,
        tags: application.tags,
        stats: application.stats,
        status: application.status,
        isDefault: application.isDefault,
        updatedAt: application.updatedAt,
      },
    });
  } catch (error) {
    console.error('[Applications API] Update error:', error);

    if (error instanceof Error) {
      if (
        error.message.includes('already exists') ||
        error.message.includes('Slug must contain')
      ) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to update application' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    const session = await getSession();
    const { applicationId } = await params;
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');
    const force = searchParams.get('force') === 'true';

    if (!session.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!orgId) {
      return NextResponse.json(
        { error: 'orgId query parameter is required' },
        { status: 400 }
      );
    }

    // Get existing application to check permissions
    const existing = await getApplication(orgId, applicationId);
    if (!existing) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Check permission to delete application (Phase 10)
    const permissionCheck = await checkApplicationPermission(
      session.userId,
      orgId,
      applicationId,
      'delete'
    );

    if (!permissionCheck.allowed) {
      return NextResponse.json(
        { error: 'Insufficient permissions', reason: permissionCheck.reason },
        { status: 403 }
      );
    }

    await deleteApplication(orgId, applicationId, { force });

    return NextResponse.json({
      success: true,
      message: 'Application deleted successfully',
    });
  } catch (error) {
    console.error('[Applications API] Delete error:', error);

    if (error instanceof Error) {
      if (
        error.message.includes('Cannot delete') ||
        error.message.includes('existing forms') ||
        error.message.includes('existing workflows')
      ) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to delete application' },
      { status: 500 }
    );
  }
}
