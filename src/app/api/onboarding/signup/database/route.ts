/**
 * Signup Onboarding Database Setup API
 *
 * POST - Handle database setup choice (auto-provision, BYOC, or skip)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getPlatformDb } from '@/lib/platform/db';
import { Organization, PlatformUser } from '@/types/platform';

type DatabaseChoice = 'auto-provision' | 'byoc' | 'skip';

interface DatabaseSetupRequest {
  organizationId: string;
  choice: DatabaseChoice;
  connectionString?: string;
  databaseName?: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: DatabaseSetupRequest = await request.json();
    const { organizationId, choice, connectionString, databaseName } = body;

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
    }

    if (!choice || !['auto-provision', 'byoc', 'skip'].includes(choice)) {
      return NextResponse.json({ error: 'Invalid database choice' }, { status: 400 });
    }

    const db = await getPlatformDb();
    const usersCollection = db.collection<PlatformUser>('users');
    const orgsCollection = db.collection<Organization>('organizations');

    // Verify user has access to this organization
    const user = await usersCollection.findOne({ userId: session.userId });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const hasOrgAccess = user.organizations.some(
      (org) => org.orgId === organizationId && ['owner', 'admin'].includes(org.role)
    );
    if (!hasOrgAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Handle different choices
    switch (choice) {
      case 'auto-provision': {
        // Trigger cluster provisioning via the existing cluster API
        // We'll make an internal call to the cluster endpoint
        const clusterResponse = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/organizations/${organizationId}/cluster`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cookie': request.headers.get('cookie') || '',
            },
            body: JSON.stringify({
              action: 'provision',
            }),
          }
        );

        if (!clusterResponse.ok) {
          const errorData = await clusterResponse.json();
          return NextResponse.json(
            { error: errorData.error || 'Failed to start cluster provisioning' },
            { status: clusterResponse.status }
          );
        }

        const clusterData = await clusterResponse.json();

        return NextResponse.json({
          status: 'provisioning',
          message: 'Cluster provisioning started',
          clusterId: clusterData.clusterId,
        });
      }

      case 'byoc': {
        // Validate required fields for BYOC
        if (!connectionString) {
          return NextResponse.json(
            { error: 'Connection string required for BYOC' },
            { status: 400 }
          );
        }

        // Basic validation of connection string format
        if (!connectionString.startsWith('mongodb://') && !connectionString.startsWith('mongodb+srv://')) {
          return NextResponse.json(
            { error: 'Invalid MongoDB connection string format' },
            { status: 400 }
          );
        }

        // Get the first project for this org
        const projectsCollection = db.collection('projects');
        const project = await projectsCollection.findOne({ organizationId });

        if (!project) {
          return NextResponse.json(
            { error: 'No project found for organization' },
            { status: 404 }
          );
        }

        // Create connection vault entry via the connections API
        const connectionsResponse = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/organizations/${organizationId}/projects/${project.projectId}/connections`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cookie': request.headers.get('cookie') || '',
            },
            body: JSON.stringify({
              name: 'Primary Database',
              connectionString,
              database: databaseName || 'netpad_data',
            }),
          }
        );

        if (!connectionsResponse.ok) {
          const errorData = await connectionsResponse.json();
          return NextResponse.json(
            { error: errorData.error || 'Failed to save connection' },
            { status: connectionsResponse.status }
          );
        }

        const connectionData = await connectionsResponse.json();

        return NextResponse.json({
          status: 'ready',
          vaultId: connectionData.vaultId,
        });
      }

      case 'skip': {
        // Mark database setup as skipped in user record
        await usersCollection.updateOne(
          { userId: session.userId },
          {
            $addToSet: { 'signupOnboarding.skippedSteps': 'database' },
            $set: { updatedAt: new Date() },
          }
        );

        return NextResponse.json({
          status: 'skipped',
          message: 'Database setup skipped',
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid choice' }, { status: 400 });
    }
  } catch (error) {
    console.error('[SignupOnboarding Database API] POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
