/**
 * Skip Onboarding API
 *
 * POST /api/onboarding/skip - Skip intent onboarding and create a blank workspace
 *
 * This endpoint creates the minimal workspace structure for users who
 * want to skip the intent-first flow and start with a blank slate.
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { autoScaffoldForUser } from '@/lib/platform/organizations';
import { getApplication } from '@/lib/platform/applications';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    // Check authentication
    const session = await getSession();
    if (!session.userId || !session.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Auto-scaffold organization, project, and default application
    const scaffold = await autoScaffoldForUser(
      session.userId,
      session.email
    );

    if (!scaffold) {
      return NextResponse.json(
        { error: 'Failed to create workspace' },
        { status: 500 }
      );
    }

    const { organization, projectId, applicationId } = scaffold;

    // Get the default application details
    const application = await getApplication(organization.orgId, applicationId);

    if (!application) {
      return NextResponse.json(
        { error: 'Failed to find application' },
        { status: 500 }
      );
    }

    // Build app URL
    const appUrl = `/apps/${application.slug}`;

    return NextResponse.json({
      success: true,
      result: {
        application: {
          applicationId: application.applicationId,
          name: application.name,
          slug: application.slug,
          description: application.description,
        },
        form: null,
        workflow: null,
        appUrl,
      },
    });
  } catch (error) {
    console.error('[Skip Onboarding] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
