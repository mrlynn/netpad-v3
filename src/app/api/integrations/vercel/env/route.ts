/**
 * Vercel Integration - Environment Variables API
 *
 * This endpoint helps configure environment variables in Vercel projects.
 * It can push the required environment variables to a Vercel project
 * after MongoDB has been provisioned.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getPlatformDb } from '@/lib/platform/db';
import { getProvisioningStatus, getProvisionedClusterForOrg } from '@/lib/atlas/provisioning';
import { getVault, getDecryptedConnectionString } from '@/lib/platform/connectionVault';
import crypto from 'crypto';

const APP_URL = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

interface EnvVarsRequest {
  installationId: string;
  projectId: string;
  organizationId: string;
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

/**
 * Push environment variables to a Vercel project
 */
async function pushEnvVarsToVercel(
  accessToken: string,
  projectId: string,
  teamId: string | undefined,
  envVars: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  const baseUrl = teamId
    ? `https://api.vercel.com/v10/projects/${projectId}/env?teamId=${teamId}`
    : `https://api.vercel.com/v10/projects/${projectId}/env`;

  try {
    for (const [key, value] of Object.entries(envVars)) {
      // First, try to get existing env var to check if we need to update
      const getResponse = await fetch(
        `${baseUrl.replace('/env', `/env/${key}`)}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      let method = 'POST';
      let url = baseUrl;

      if (getResponse.ok) {
        // Env var exists, need to patch
        method = 'PATCH';
        const existing = await getResponse.json();
        url = `${baseUrl.replace('/env', `/env/${existing.id}`)}`;
      }

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key,
          value,
          type: key.startsWith('NEXT_PUBLIC_') ? 'plain' : 'encrypted',
          target: ['production', 'preview', 'development'],
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(`[Vercel Env] Failed to set ${key}:`, error);
        return { success: false, error: `Failed to set ${key}: ${error}` };
      }
    }

    return { success: true };
  } catch (error) {
    console.error('[Vercel Env] Error pushing env vars:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body: EnvVarsRequest = await request.json();
    const { installationId, projectId, organizationId } = body;

    if (!installationId || !projectId || !organizationId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Get the Vercel integration for this installation
    const db = await getPlatformDb();
    const integrationsCollection = db.collection('vercel_integrations');
    const integration = await integrationsCollection.findOne({ installationId });

    if (!integration) {
      return NextResponse.json(
        { success: false, error: 'Integration not found' },
        { status: 404 }
      );
    }

    // Check provisioning status
    const provisioningStatus = await getProvisioningStatus(organizationId);

    if (!provisioningStatus || provisioningStatus.status !== 'ready') {
      return NextResponse.json({
        success: false,
        error: 'Database not ready. Please wait for provisioning to complete.',
        status: provisioningStatus?.status || 'not_started',
      });
    }

    // Get the connection string from the vault
    const cluster = await getProvisionedClusterForOrg(organizationId);

    if (!cluster?.vaultId) {
      return NextResponse.json({
        success: false,
        error: 'Database vault not found',
      });
    }

    const vault = await getVault(organizationId, cluster.vaultId);

    if (!vault) {
      return NextResponse.json({
        success: false,
        error: 'Vault not found',
      });
    }

    // Decrypt the connection string
    const decryptResult = await getDecryptedConnectionString(organizationId, cluster.vaultId);

    if (!decryptResult) {
      return NextResponse.json({
        success: false,
        error: 'Failed to decrypt connection string',
      });
    }

    // Generate secrets for this deployment
    const sessionSecret = generateSecretKey(32);
    const vaultEncryptionKey = generateEncryptionKey();

    // Build environment variables
    const envVars: Record<string, string> = {
      MONGODB_URI: decryptResult.connectionString,
      MONGODB_DATABASE: 'forms',
      SESSION_SECRET: sessionSecret,
      VAULT_ENCRYPTION_KEY: vaultEncryptionKey,
      NEXT_PUBLIC_APP_URL: '${VERCEL_URL}',
      APP_URL: '${VERCEL_URL}',
    };

    // Push to Vercel
    const result = await pushEnvVarsToVercel(
      integration.accessToken,
      projectId,
      integration.teamId,
      envVars
    );

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error,
      });
    }

    // Update integration with project info
    await integrationsCollection.updateOne(
      { installationId },
      {
        $set: {
          projectId,
          envVarsConfigured: true,
          envVarsConfiguredAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Environment variables configured successfully',
      envVarsSet: Object.keys(envVars),
    });
  } catch (error) {
    console.error('[Vercel Env] Error:', error);
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
 * GET endpoint to retrieve environment variables for manual configuration
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
      // Return template with placeholders
      return NextResponse.json({
        success: true,
        envVars: {
          MONGODB_URI: {
            value: '',
            description: 'MongoDB connection string. Get from MongoDB Atlas.',
            required: true,
          },
          MONGODB_DATABASE: {
            value: 'forms',
            description: 'Database name for NetPad data.',
            required: true,
          },
          SESSION_SECRET: {
            value: generateSecretKey(32),
            description: 'Secret key for session encryption. Auto-generated.',
            required: true,
          },
          VAULT_ENCRYPTION_KEY: {
            value: generateEncryptionKey(),
            description: 'Key for vault encryption. Auto-generated.',
            required: true,
          },
          NEXT_PUBLIC_APP_URL: {
            value: '${VERCEL_URL}',
            description: 'Public URL of your app. Use ${VERCEL_URL} for auto-detection.',
            required: true,
          },
          APP_URL: {
            value: '${VERCEL_URL}',
            description: 'Server-side URL. Use ${VERCEL_URL} for auto-detection.',
            required: true,
          },
          OPENAI_API_KEY: {
            value: '',
            description: 'OpenAI API key for AI features. Optional.',
            required: false,
          },
          BLOB_READ_WRITE_TOKEN: {
            value: '',
            description: 'Vercel Blob token for file uploads. Optional.',
            required: false,
          },
        },
      });
    }

    // Get actual values for the organization
    const provisioningStatus = await getProvisioningStatus(organizationId);

    if (!provisioningStatus || provisioningStatus.status !== 'ready') {
      return NextResponse.json({
        success: false,
        error: 'Database not ready',
        status: provisioningStatus?.status || 'not_started',
      });
    }

    const cluster = await getProvisionedClusterForOrg(organizationId);

    if (!cluster?.vaultId) {
      return NextResponse.json({
        success: false,
        error: 'Vault not found',
      });
    }

    const vault = await getVault(organizationId, cluster.vaultId);

    if (!vault) {
      return NextResponse.json({
        success: false,
        error: 'Vault not found',
      });
    }

    // Return the env vars (connection string is already encrypted in vault)
    return NextResponse.json({
      success: true,
      envVars: {
        MONGODB_URI: {
          value: '[ENCRYPTED - View in NetPad Dashboard]',
          description: 'Connection string is stored securely. View in dashboard.',
          required: true,
        },
        MONGODB_DATABASE: {
          value: vault.database || 'forms',
          description: 'Database name',
          required: true,
        },
        SESSION_SECRET: {
          value: generateSecretKey(32),
          description: 'Auto-generated session secret',
          required: true,
        },
        VAULT_ENCRYPTION_KEY: {
          value: generateEncryptionKey(),
          description: 'Auto-generated encryption key',
          required: true,
        },
        NEXT_PUBLIC_APP_URL: {
          value: '${VERCEL_URL}',
          description: 'Use ${VERCEL_URL} for auto-detection',
          required: true,
        },
      },
    });
  } catch (error) {
    console.error('[Vercel Env] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
