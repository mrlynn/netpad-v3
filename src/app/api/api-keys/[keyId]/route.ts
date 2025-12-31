/**
 * Single API Key Management Endpoints
 *
 * GET /api/api-keys/:keyId - Get API key details
 * PATCH /api/api-keys/:keyId - Update API key
 * DELETE /api/api-keys/:keyId - Delete/revoke API key
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { findUserById } from '@/lib/platform/users';
import { getAPIKeyById, updateAPIKey, revokeAPIKey, deleteAPIKey, formatAPIKeyToListItem } from '@/lib/api/keys';

interface RouteParams {
  params: Promise<{ keyId: string }>;
}

/**
 * GET /api/api-keys/:keyId
 * Get API key details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { keyId } = await params;

  try {
    // Check authentication
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user's organization
    const user = await findUserById(session.userId);
    if (!user || user.organizations.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No organization found' },
        { status: 403 }
      );
    }

    const orgId = user.organizations[0].orgId;

    // Get API key
    const apiKey = await getAPIKeyById(keyId, orgId);

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'API key not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: formatAPIKeyToListItem(apiKey),
    });
  } catch (error) {
    console.error('[API Keys] Error getting key:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get API key' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/api-keys/:keyId
 * Update API key settings
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { keyId } = await params;

  try {
    // Check authentication
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user's organization
    const user = await findUserById(session.userId);
    if (!user || user.organizations.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No organization found' },
        { status: 403 }
      );
    }

    const orgId = user.organizations[0].orgId;
    const body = await request.json();

    // Build updates
    const updates: Record<string, any> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.permissions !== undefined) updates.permissions = body.permissions;
    if (body.scopes !== undefined) updates.scopes = body.scopes;
    if (body.rateLimit !== undefined) updates.rateLimit = body.rateLimit;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No updates provided' },
        { status: 400 }
      );
    }

    // Update API key
    const success = await updateAPIKey(keyId, orgId, updates);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'API key not found or already revoked' },
        { status: 404 }
      );
    }

    // Get updated key
    const updatedKey = await getAPIKeyById(keyId, orgId);

    return NextResponse.json({
      success: true,
      data: {
        id: updatedKey!.id,
        name: updatedKey!.name,
        description: updatedKey!.description,
        permissions: updatedKey!.permissions,
        status: updatedKey!.status,
      },
    });
  } catch (error) {
    console.error('[API Keys] Error updating key:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update API key' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/api-keys/:keyId
 * Revoke or permanently delete an API key
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { keyId } = await params;

  try {
    // Check authentication
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user's organization
    const user = await findUserById(session.userId);
    if (!user || user.organizations.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No organization found' },
        { status: 403 }
      );
    }

    const orgId = user.organizations[0].orgId;

    // Check query param for permanent deletion
    const { searchParams } = new URL(request.url);
    const permanent = searchParams.get('permanent') === 'true';
    const reason = searchParams.get('reason') || undefined;

    let success: boolean;

    if (permanent) {
      // Permanently delete
      success = await deleteAPIKey(keyId, orgId);
    } else {
      // Just revoke
      success = await revokeAPIKey(keyId, orgId, session.userId, reason);
    }

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'API key not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        keyId,
        action: permanent ? 'deleted' : 'revoked',
      },
    });
  } catch (error) {
    console.error('[API Keys] Error deleting key:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete API key' },
      { status: 500 }
    );
  }
}
