/**
 * npm Package Install API
 * 
 * POST /api/marketplace/npm/install - Install a package from npm registry
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { findUserById } from '@/lib/platform/users';
import { importFromNpm } from '@/lib/npm/package-importer';
import { InstallPackageRequest } from '@/types/npm-package';

export const dynamic = 'force-dynamic';

/**
 * POST /api/marketplace/npm/install
 * Install a package from npm registry
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user to verify organization access
    const user = await findUserById(session.userId);
    if (!user || user.organizations.length === 0) {
      return NextResponse.json(
        { error: 'No organization found' },
        { status: 403 }
      );
    }

    const body = await request.json() as InstallPackageRequest;
    const {
      packageName,
      version,
      orgId,
      projectId,
      applicationId, // Optional, for updates
      overwriteExisting = false,
      installDependencies = true,
    } = body;

    // Validate required fields
    if (!packageName || !orgId || !projectId) {
      return NextResponse.json(
        { error: 'Missing required fields: packageName, orgId, projectId' },
        { status: 400 }
      );
    }

    // Verify user has access to organization
    const hasOrgAccess = user.organizations.some(org => org.orgId === orgId);
    if (!hasOrgAccess) {
      return NextResponse.json(
        { error: 'Access denied to organization' },
        { status: 403 }
      );
    }

    // Import package
    const result = await importFromNpm(
      packageName,
      version,
      orgId,
      projectId,
      {
        userId: session.userId,
        overwriteExisting,
        installDependencies,
      }
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.errors?.[0] || 'Failed to install package',
          errors: result.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      packageName,
      version: result.version,
      applicationId: result.applicationId,
      dependencies: result.dependencies,
      message: `Successfully installed ${packageName}@${result.version}`,
    });
  } catch (error) {
    console.error('[npm Install API] Install error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to install package',
      },
      { status: 500 }
    );
  }
}
