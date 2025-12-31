/**
 * API Key Management Endpoints
 *
 * GET /api/api-keys - List API keys for current user's organization
 * POST /api/api-keys - Create a new API key
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { findUserById } from '@/lib/platform/users';
import { createAPIKey, listAPIKeys } from '@/lib/api/keys';
import { CreateAPIKeyRequest, CreateAPIKeyResponse, APIKeyListItem } from '@/types/api';

/**
 * GET /api/api-keys
 * List all API keys for the user's organization
 */
export async function GET(request: NextRequest) {
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

    // List API keys
    const keys = await listAPIKeys(orgId);

    return NextResponse.json({
      success: true,
      data: keys,
    });
  } catch (error) {
    console.error('[API Keys] Error listing keys:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to list API keys' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/api-keys
 * Create a new API key
 */
export async function POST(request: NextRequest) {
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

    // Parse request
    const body = await request.json() as CreateAPIKeyRequest;

    // Validate required fields
    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json(
        { success: false, error: 'API key name is required' },
        { status: 400 }
      );
    }

    if (!body.permissions || !Array.isArray(body.permissions) || body.permissions.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one permission is required' },
        { status: 400 }
      );
    }

    // Validate permissions
    const validPermissions = [
      'forms:read',
      'forms:write',
      'forms:delete',
      'submissions:read',
      'submissions:write',
      'submissions:delete',
      'analytics:read',
      'webhooks:manage',
    ];

    const invalidPermissions = body.permissions.filter(
      (p) => !validPermissions.includes(p)
    );

    if (invalidPermissions.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid permissions: ${invalidPermissions.join(', ')}`,
          validPermissions,
        },
        { status: 400 }
      );
    }

    // Create API key
    const { apiKey, fullKey } = await createAPIKey(orgId, session.userId, body);

    const response: CreateAPIKeyResponse = {
      success: true,
      apiKey: {
        id: apiKey.id,
        key: fullKey, // Only returned once!
        keyPrefix: apiKey.keyPrefix,
        name: apiKey.name,
        permissions: apiKey.permissions,
        environment: apiKey.environment,
        expiresAt: apiKey.expiresAt?.toISOString(),
      },
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('[API Keys] Error creating key:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create API key' },
      { status: 500 }
    );
  }
}
