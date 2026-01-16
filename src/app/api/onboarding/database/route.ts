/**
 * Onboarding Database Setup API
 *
 * POST /api/onboarding/database - Set up database connection during onboarding
 * Supports both auto-provisioning and BYOC (Bring Your Own Cluster)
 */

import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { getSession } from '@/lib/auth/session';
import { createConnectionVault } from '@/lib/platform/connectionVault';
import { listProjects, createProject } from '@/lib/platform/projects';
import { getUserOrganizations } from '@/lib/platform/organizations';

interface DatabaseSetupRequest {
  orgId: string;
  projectId?: string; // Optional - will create default project if not provided
  method: 'auto' | 'byoc';
  // For BYOC:
  connectionString?: string;
  database?: string;
  name?: string;
}

/**
 * Test a MongoDB connection string
 */
async function testConnection(
  connectionString: string,
  database?: string
): Promise<{ success: boolean; databases?: string[]; collections?: string[]; error?: string }> {
  let client: MongoClient | null = null;

  try {
    client = new MongoClient(connectionString, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });

    await client.connect();

    // List databases
    const adminDb = client.db().admin();
    const { databases } = await adminDb.listDatabases();
    const dbNames = databases.map((db) => db.name);

    // If database specified, list its collections
    let collections: string[] = [];
    if (database) {
      const db = client.db(database);
      const colls = await db.listCollections().toArray();
      collections = colls.map((c) => c.name);
    }

    return {
      success: true,
      databases: dbNames,
      collections,
    };
  } catch (error) {
    console.error('[Onboarding Database] Connection test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Connection failed',
    };
  } finally {
    if (client) {
      await client.close();
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: DatabaseSetupRequest = await request.json();
    const { orgId, method, connectionString, database, name } = body;
    let { projectId } = body;

    // Validate required fields
    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
    }

    if (!method || !['auto', 'byoc'].includes(method)) {
      return NextResponse.json(
        { error: 'method must be "auto" or "byoc"' },
        { status: 400 }
      );
    }

    // Verify user has access to this organization
    const orgs = await getUserOrganizations(session.userId);
    const org = orgs.find((o) => o.orgId === orgId);
    if (!org) {
      return NextResponse.json(
        { error: 'Not a member of this organization' },
        { status: 403 }
      );
    }

    // If no projectId provided, find or create a default project
    if (!projectId) {
      const { projects } = await listProjects(orgId, { page: 1, pageSize: 1 });

      if (projects.length > 0) {
        projectId = projects[0].projectId;
      } else {
        // Create a default project
        const newProject = await createProject({
          organizationId: orgId,
          createdBy: session.userId,
          name: 'My Project',
          description: 'Default project created during onboarding',
          environment: 'dev',
        });
        projectId = newProject.projectId;
      }
    }

    // Handle auto-provisioning
    if (method === 'auto') {
      // The auto-provisioning is already triggered when the org is created
      // We just need to check the cluster status
      const clusterResponse = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/organizations/${orgId}/cluster`,
        {
          headers: {
            Cookie: request.headers.get('cookie') || '',
          },
        }
      );

      if (clusterResponse.ok) {
        const clusterData = await clusterResponse.json();
        return NextResponse.json({
          success: true,
          method: 'auto',
          status: clusterData.cluster?.status || 'CREATING',
          projectId,
        });
      }

      // If no cluster exists, trigger provisioning
      const initResponse = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/organizations/${orgId}/cluster/initialize`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: request.headers.get('cookie') || '',
          },
        }
      );

      const initData = await initResponse.json();
      return NextResponse.json({
        success: true,
        method: 'auto',
        status: 'CREATING',
        projectId,
        ...initData,
      });
    }

    // Handle BYOC (Bring Your Own Cluster)
    if (method === 'byoc') {
      if (!connectionString) {
        return NextResponse.json(
          { error: 'connectionString is required for BYOC' },
          { status: 400 }
        );
      }

      if (!database) {
        return NextResponse.json(
          { error: 'database name is required for BYOC' },
          { status: 400 }
        );
      }

      // Test the connection first
      const testResult = await testConnection(connectionString, database);

      if (!testResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: testResult.error || 'Failed to connect to database',
          },
          { status: 400 }
        );
      }

      // Create the vault entry
      const vault = await createConnectionVault({
        organizationId: orgId,
        projectId,
        createdBy: session.userId,
        name: name || `${database} Connection`,
        description: 'Database connection created during onboarding',
        connectionString,
        database,
        allowedCollections: [], // Allow all collections by default
      });

      return NextResponse.json({
        success: true,
        method: 'byoc',
        vaultId: vault.vaultId,
        projectId,
        databases: testResult.databases,
        collections: testResult.collections,
      });
    }

    return NextResponse.json({ error: 'Invalid method' }, { status: 400 });
  } catch (error) {
    console.error('[Onboarding Database] Error:', error);
    return NextResponse.json(
      { error: 'Failed to set up database' },
      { status: 500 }
    );
  }
}
