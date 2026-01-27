/**
 * DEV ONLY: Test Reset API
 *
 * Comprehensive testing reset endpoint for development.
 * This route should be disabled in production!
 * Set NODE_ENV=production to disable these endpoints.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { performTestReset, ResetOptions } from '@/lib/dev/test-reset';

export const dynamic = 'force-dynamic';

// Block in production
function checkDevMode() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Dev endpoints disabled in production');
  }
}

/**
 * POST /api/dev/reset
 * Perform test reset operations
 *
 * Body:
 * - orgId?: string - Organization ID to reset (required for org-specific operations)
 * - userId?: string - User ID to reset (optional)
 * - clearSessions?: boolean - Clear sessions (note: sessions are cookie-based)
 * - clearUsers?: boolean - Clear test users
 * - clearOrgs?: boolean - Clear organizations
 * - clearForms?: boolean - Clear forms (requires orgId)
 * - clearWorkflows?: boolean - Clear workflows (requires orgId)
 * - clearClusters?: boolean - Clear provisioned clusters (requires orgId)
 * - clearVaults?: boolean - Clear connection vaults (requires orgId)
 * - clearUsage?: boolean - Reset usage counters (requires orgId)
 * - clearLegacyStorage?: boolean - Clear legacy storage
 */
export async function POST(req: NextRequest) {
  try {
    checkDevMode();

    // Require authentication even in dev mode (for safety)
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      orgId,
      userId,
      clearSessions,
      clearUsers,
      clearOrgs,
      clearForms,
      clearWorkflows,
      clearClusters,
      clearVaults,
      clearUsage,
      clearLegacyStorage,
    } = body;

    // Validate that org-specific operations have orgId
    if ((clearForms || clearWorkflows || clearClusters || clearVaults || clearUsage) && !orgId) {
      return NextResponse.json(
        {
          error: 'orgId is required for forms, workflows, clusters, vaults, and usage operations',
        },
        { status: 400 }
      );
    }

    // Build reset options
    const options: ResetOptions = {
      orgId,
      userId,
      clearSessions: clearSessions === true,
      clearUsers: clearUsers === true,
      clearOrgs: clearOrgs === true,
      clearForms: clearForms === true,
      clearWorkflows: clearWorkflows === true,
      clearClusters: clearClusters === true,
      clearVaults: clearVaults === true,
      clearUsage: clearUsage === true,
      clearLegacyStorage: clearLegacyStorage === true,
    };

    // Check if at least one operation is requested
    const hasOperation =
      options.clearSessions ||
      options.clearUsers ||
      options.clearOrgs ||
      options.clearForms ||
      options.clearWorkflows ||
      options.clearClusters ||
      options.clearVaults ||
      options.clearUsage ||
      options.clearLegacyStorage;

    if (!hasOperation) {
      return NextResponse.json(
        { error: 'At least one reset operation must be specified' },
        { status: 400 }
      );
    }

    // Perform the reset
    console.log(`[Dev Reset] User ${session.userId} performing test reset:`, options);
    const result = await performTestReset(options);

    return NextResponse.json({
      success: result.success,
      operations: result.operations,
      errors: result.errors,
      summary: result.summary,
    });
  } catch (error) {
    console.error('[Dev Reset] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to perform reset' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/dev/reset?orgId=xxx
 * Get reset status/options info (doesn't perform reset, just shows what would happen)
 */
export async function GET(req: NextRequest) {
  try {
    checkDevMode();

    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId');
    const userId = searchParams.get('userId');

    // Return available reset options and what they would do
    return NextResponse.json({
      available: {
        clearSessions: {
          description: 'Clear all sessions (note: sessions are cookie-based, requires client-side clearing)',
          requires: [],
        },
        clearUsers: {
          description: 'Delete all test users (excluding platform admins)',
          requires: [],
        },
        clearOrgs: {
          description: 'Delete all organizations (excludes specified orgId if provided)',
          requires: [],
        },
        clearForms: {
          description: 'Delete all forms and submissions for an organization',
          requires: ['orgId'],
        },
        clearWorkflows: {
          description: 'Delete all workflows and executions for an organization',
          requires: ['orgId'],
        },
        clearClusters: {
          description: 'Delete provisioned MongoDB Atlas cluster for an organization',
          requires: ['orgId'],
        },
        clearVaults: {
          description: 'Delete all connection vaults for an organization',
          requires: ['orgId'],
        },
        clearUsage: {
          description: 'Reset usage counters for an organization',
          requires: ['orgId'],
        },
        clearLegacyStorage: {
          description: 'Clear legacy storage (user_forms, user_connections from platform DB)',
          requires: [],
        },
      },
      current: {
        userId: session.userId,
        orgId: orgId || null,
        requestedUserId: userId || null,
      },
      warning: 'These operations are destructive and cannot be undone. Use with caution!',
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 }
    );
  }
}
