/**
 * Signup Onboarding Status API
 *
 * GET  - Check if user has completed signup onboarding
 * POST - Mark signup onboarding as complete
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getPlatformDb } from '@/lib/platform/db';
import { PlatformUser } from '@/types/platform';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getPlatformDb();
    const usersCollection = db.collection<PlatformUser>('users');

    const user = await usersCollection.findOne({ userId: session.userId });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user has completed signup onboarding
    const hasCompletedSignupOnboarding = user.signupOnboarding?.completed ?? false;

    // Check if user has an organization
    const hasOrganization = user.organizations && user.organizations.length > 0;
    const firstOrg = hasOrganization ? user.organizations[0] : null;

    // If user has an org, check if they have a cluster
    let hasCluster = false;
    let organizationId: string | undefined;
    let organizationName: string | undefined;
    let organizationSlug: string | undefined;

    if (firstOrg) {
      organizationId = firstOrg.orgId;

      // Fetch org details
      const orgsCollection = db.collection('organizations');
      const org = await orgsCollection.findOne({ orgId: firstOrg.orgId });

      if (org) {
        organizationName = org.name;
        organizationSlug = org.slug;

        // Check for provisioned cluster
        hasCluster = !!org.provisionedCluster?.status && org.provisionedCluster.status === 'ready';
      }
    }

    return NextResponse.json({
      hasCompletedSignupOnboarding,
      hasOrganization,
      hasCluster,
      organizationId,
      organizationName,
      organizationSlug,
    });
  } catch (error) {
    console.error('[SignupOnboarding API] GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { completed, skippedSteps } = body;

    const db = await getPlatformDb();
    const usersCollection = db.collection<PlatformUser>('users');

    // Update user's signup onboarding status
    const updateData: Record<string, unknown> = {
      'signupOnboarding.completed': completed === true,
      'signupOnboarding.completedAt': completed === true ? new Date() : null,
      updatedAt: new Date(),
    };

    if (skippedSteps && Array.isArray(skippedSteps)) {
      updateData['signupOnboarding.skippedSteps'] = skippedSteps;
    }

    await usersCollection.updateOne(
      { userId: session.userId },
      { $set: updateData }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[SignupOnboarding API] POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
