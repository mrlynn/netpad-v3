/**
 * Individual Integration Credential API
 *
 * GET    /api/organizations/[orgId]/integrations/[credentialId] - Get credential details
 * DELETE /api/organizations/[orgId]/integrations/[credentialId] - Delete credential
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import {
  getIntegrationCredential,
  deleteIntegrationCredential,
  checkCredentialPermission,
} from '@/lib/platform/integrationCredentials';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; credentialId: string }> }
) {
  try {
    const session = await getSession();
    const { orgId, credentialId } = await params;

    if (!session.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check permission
    const hasPermission = await checkCredentialPermission(orgId, credentialId, session.userId);
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

    const credential = await getIntegrationCredential(orgId, credentialId);

    if (!credential) {
      return NextResponse.json(
        { error: 'Credential not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      credential: {
        credentialId: credential.credentialId,
        provider: credential.provider,
        name: credential.name,
        description: credential.description,
        authType: credential.authType,
        status: credential.status,
        lastUsedAt: credential.lastUsedAt,
        usageCount: credential.usageCount,
        oauthMetadata: credential.oauthMetadata,
        serviceAccountMetadata: credential.serviceAccountMetadata,
        createdAt: credential.createdAt,
      },
    });
  } catch (error) {
    console.error('[Integrations API] Get error:', error);
    return NextResponse.json(
      { error: 'Failed to get integration credential' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; credentialId: string }> }
) {
  try {
    const session = await getSession();
    const { orgId, credentialId } = await params;

    if (!session.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check permission (user must have access to the credential)
    const hasPermission = await checkCredentialPermission(orgId, credentialId, session.userId);
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

    const deleted = await deleteIntegrationCredential(orgId, credentialId, session.userId);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Credential not found or already deleted' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Integration credential deleted',
    });
  } catch (error) {
    console.error('[Integrations API] Delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete integration credential' },
      { status: 500 }
    );
  }
}
