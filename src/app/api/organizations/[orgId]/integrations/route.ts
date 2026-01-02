/**
 * Integration Credentials API
 *
 * GET  /api/organizations/[orgId]/integrations - List integration credentials
 * POST /api/organizations/[orgId]/integrations - Create integration credential
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import {
  createIntegrationCredential,
  listUserIntegrationCredentials,
  CredentialData,
} from '@/lib/platform/integrationCredentials';
import { assertOrgPermission } from '@/lib/platform/permissions';
import {
  IntegrationProvider,
  IntegrationAuthType,
} from '@/types/platform';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const session = await getSession();
    const { orgId } = await params;

    if (!session.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get provider filter from query
    const searchParams = request.nextUrl.searchParams;
    const provider = searchParams.get('provider') as IntegrationProvider | null;

    // List credentials accessible by this user
    const credentials = await listUserIntegrationCredentials(
      orgId,
      session.userId,
      provider || undefined
    );

    return NextResponse.json({
      success: true,
      credentials: credentials.map((c) => ({
        credentialId: c.credentialId,
        provider: c.provider,
        name: c.name,
        description: c.description,
        authType: c.authType,
        status: c.status,
        lastUsedAt: c.lastUsedAt,
        usageCount: c.usageCount,
        oauthMetadata: c.oauthMetadata,
        serviceAccountMetadata: c.serviceAccountMetadata,
        createdAt: c.createdAt,
      })),
    });
  } catch (error) {
    console.error('[Integrations API] List error:', error);
    return NextResponse.json(
      { error: 'Failed to list integration credentials' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const session = await getSession();
    const { orgId } = await params;

    if (!session.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check permission
    try {
      await assertOrgPermission(session.userId, orgId, 'use_connections');
    } catch {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      provider,
      name,
      description,
      authType,
      credentials,
    } = body as {
      provider: IntegrationProvider;
      name: string;
      description?: string;
      authType: IntegrationAuthType;
      credentials: Record<string, unknown>;
    };

    // Validate required fields
    if (!provider || !name || !authType || !credentials) {
      return NextResponse.json(
        { error: 'provider, name, authType, and credentials are required' },
        { status: 400 }
      );
    }

    // Validate credentials based on auth type
    let credentialData: CredentialData;
    let oauthMetadata;
    let serviceAccountMetadata;

    if (authType === 'service_account') {
      // Validate service account credentials
      const clientEmail = credentials.clientEmail as string | undefined;
      const privateKey = credentials.privateKey as string | undefined;
      const projectId = credentials.projectId as string | undefined;

      if (!clientEmail || !privateKey) {
        return NextResponse.json(
          { error: 'Service account requires clientEmail and privateKey' },
          { status: 400 }
        );
      }
      credentialData = {
        type: 'service_account',
        projectId: projectId || '',
        privateKeyId: credentials.privateKeyId as string | undefined,
        privateKey: privateKey,
        clientEmail: clientEmail,
        clientId: credentials.clientId as string | undefined,
        authUri: credentials.authUri as string | undefined,
        tokenUri: credentials.tokenUri as string | undefined,
      };
      serviceAccountMetadata = {
        clientEmail: clientEmail,
        projectId: projectId,
      };
    } else if (authType === 'oauth2') {
      // Validate OAuth2 credentials
      const accessToken = credentials.accessToken as string | undefined;
      const refreshToken = credentials.refreshToken as string | undefined;
      const tokenType = credentials.tokenType as string | undefined;
      const expiresAt = credentials.expiresAt as string | Date | undefined;
      const scope = credentials.scope as string | undefined;

      if (!accessToken) {
        return NextResponse.json(
          { error: 'OAuth2 requires accessToken' },
          { status: 400 }
        );
      }
      credentialData = {
        accessToken: accessToken,
        refreshToken: refreshToken,
        tokenType: tokenType || 'Bearer',
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        scope: scope,
      };
      oauthMetadata = {
        scopes: scope?.split(' '),
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      };
    } else if (authType === 'api_key') {
      // Validate API key credentials
      const apiKey = credentials.apiKey as string | undefined;
      const apiSecret = credentials.apiSecret as string | undefined;

      if (!apiKey) {
        return NextResponse.json(
          { error: 'API key authentication requires apiKey' },
          { status: 400 }
        );
      }
      credentialData = {
        apiKey: apiKey,
        apiSecret: apiSecret,
      };
    } else {
      return NextResponse.json(
        { error: 'Unsupported auth type' },
        { status: 400 }
      );
    }

    // Create credential
    const credential = await createIntegrationCredential({
      organizationId: orgId,
      createdBy: session.userId,
      provider,
      name,
      description,
      authType,
      credentials: credentialData,
      oauthMetadata,
      serviceAccountMetadata,
    });

    return NextResponse.json({
      success: true,
      credential: {
        credentialId: credential.credentialId,
        provider: credential.provider,
        name: credential.name,
        authType: credential.authType,
        status: credential.status,
      },
    });
  } catch (error) {
    console.error('[Integrations API] Create error:', error);

    if (error instanceof Error && error.message.includes('VAULT_ENCRYPTION_KEY')) {
      return NextResponse.json(
        { error: 'Server encryption not configured' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create integration credential' },
      { status: 500 }
    );
  }
}
