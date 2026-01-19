/**
 * API Key Validation Endpoint
 *
 * POST /api/v1/auth/validate
 *
 * Validates an API key and returns organization info.
 * Used by the remote MCP server to authenticate requests.
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateAPIRequest } from '@/lib/api/middleware';

export async function POST(request: NextRequest) {
  // Authenticate the request using the existing middleware
  const auth = await authenticateAPIRequest(request);

  if (!auth.success) {
    return auth.response;
  }

  const { context } = auth;

  // Return validation success with organization info
  return NextResponse.json(
    {
      success: true,
      valid: true,
      organizationId: context.organizationId,
      keyId: context.apiKey.id,
      keyPrefix: context.apiKey.keyPrefix,
      environment: context.apiKey.environment,
      permissions: context.apiKey.permissions,
      requestId: context.requestId,
    },
    {
      headers: {
        'X-Request-Id': context.requestId,
      },
    }
  );
}

// Also support GET for simple validation checks
export async function GET(request: NextRequest) {
  return POST(request);
}
