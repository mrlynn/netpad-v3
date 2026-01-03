/**
 * Vercel Integration - MongoDB Atlas Provisioning
 *
 * This endpoint provisions a MongoDB Atlas M0 cluster for a Vercel deployment.
 * It can be called after the OAuth callback to automatically set up the database.
 *
 * Flow:
 * 1. Verify the installation ID and user session
 * 2. Create a new NetPad organization (if needed)
 * 3. Provision an M0 cluster via Atlas Admin API
 * 4. Return environment variables to configure in Vercel
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { createOrganization, getUserOrganizations } from '@/lib/platform/organizations';
import { provisionM0Cluster, getProvisioningStatus, isAutoProvisioningAvailable } from '@/lib/atlas/provisioning';
import { getPlatformDb } from '@/lib/platform/db';
import crypto from 'crypto';

interface ProvisionRequest {
  installationId?: string;
  projectName?: string;
  organizationId?: string;
}

interface ProvisionResponse {
  success: boolean;
  organizationId?: string;
  status?: string;
  envVars?: Record<string, string>;
  error?: string;
  message?: string;
}

/**
 * Generate a secure secret key
 */
function generateSecretKey(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a base64-encoded encryption key
 */
function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('base64');
}

export async function POST(request: NextRequest): Promise<NextResponse<ProvisionResponse>> {
  try {
    // Verify user session
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body: ProvisionRequest = await request.json();
    const { installationId, projectName, organizationId: providedOrgId } = body;

    // Check if Atlas provisioning is available
    if (!isAutoProvisioningAvailable()) {
      // Return manual setup instructions with generated secrets
      const sessionSecret = generateSecretKey(32);
      const vaultEncryptionKey = generateEncryptionKey();

      return NextResponse.json({
        success: true,
        status: 'manual_setup_required',
        message: 'Atlas auto-provisioning is not configured. Please set up MongoDB manually.',
        envVars: {
          MONGODB_URI: 'mongodb+srv://username:password@cluster.mongodb.net/forms?retryWrites=true&w=majority',
          SESSION_SECRET: sessionSecret,
          VAULT_ENCRYPTION_KEY: vaultEncryptionKey,
          NEXT_PUBLIC_APP_URL: '${VERCEL_URL}',
        },
      });
    }

    // Get or create organization
    let organizationId = providedOrgId;

    if (!organizationId) {
      // Check if user already has an organization
      const userOrgs = await getUserOrganizations(session.userId);

      if (userOrgs.length > 0) {
        // Use the first organization
        organizationId = userOrgs[0].orgId;
      } else {
        // Create a new organization for the Vercel deployment
        const orgName = projectName || `Vercel Deployment ${new Date().toLocaleDateString()}`;
        const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const newOrg = await createOrganization({
          name: orgName,
          slug,
          createdBy: session.userId,
        });
        organizationId = newOrg.orgId;
      }
    }

    // Ensure we have an organization ID at this point
    if (!organizationId) {
      return NextResponse.json({
        success: false,
        error: 'Failed to create or find organization',
      }, { status: 500 });
    }

    // Check if cluster is already provisioned or in progress
    const existingStatus = await getProvisioningStatus(organizationId);

    if (existingStatus) {
      if (existingStatus.status === 'ready') {
        // Already provisioned, return success with generated secrets
        const sessionSecret = generateSecretKey(32);
        const vaultEncryptionKey = generateEncryptionKey();

        return NextResponse.json({
          success: true,
          organizationId,
          status: 'ready',
          message: 'Database already provisioned',
          envVars: {
            MONGODB_URI: '[PROVISIONED - Check NetPad Dashboard]',
            SESSION_SECRET: sessionSecret,
            VAULT_ENCRYPTION_KEY: vaultEncryptionKey,
            NEXT_PUBLIC_APP_URL: '${VERCEL_URL}',
          },
        });
      }

      if (['pending', 'creating_project', 'creating_cluster', 'creating_user', 'configuring_network'].includes(existingStatus.status)) {
        return NextResponse.json({
          success: true,
          organizationId,
          status: existingStatus.status,
          message: 'Provisioning in progress',
        });
      }
    }

    // Start provisioning
    const result = await provisionM0Cluster({
      organizationId,
      userId: session.userId,
    });

    if (!result.success) {
      return NextResponse.json({
        success: false,
        organizationId,
        status: result.status,
        error: result.error || 'Provisioning failed',
      });
    }

    // Generate environment variables for Vercel
    const sessionSecret = generateSecretKey(32);
    const vaultEncryptionKey = generateEncryptionKey();

    // Store the Vercel installation link
    if (installationId) {
      const db = await getPlatformDb();
      const integrationsCollection = db.collection('vercel_integrations');

      await integrationsCollection.updateOne(
        { installationId },
        {
          $set: {
            organizationId,
            clusterId: result.clusterId,
            provisionedAt: new Date(),
          },
        }
      );
    }

    return NextResponse.json({
      success: true,
      organizationId,
      status: result.status,
      message: 'Database provisioning initiated',
      envVars: {
        MONGODB_URI: '[PROVISIONING - Will be available shortly]',
        SESSION_SECRET: sessionSecret,
        VAULT_ENCRYPTION_KEY: vaultEncryptionKey,
        NEXT_PUBLIC_APP_URL: '${VERCEL_URL}',
      },
    });
  } catch (error) {
    console.error('[Vercel Provision] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check provisioning status
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const organizationId = request.nextUrl.searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: 'Organization ID required' },
        { status: 400 }
      );
    }

    const status = await getProvisioningStatus(organizationId);

    if (!status) {
      return NextResponse.json({
        success: true,
        status: 'not_started',
        message: 'No provisioning found for this organization',
      });
    }

    return NextResponse.json({
      success: true,
      ...status,
    });
  } catch (error) {
    console.error('[Vercel Provision] Status check error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
