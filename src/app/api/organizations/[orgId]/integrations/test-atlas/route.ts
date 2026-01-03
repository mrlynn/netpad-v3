/**
 * Test Atlas Connection API
 *
 * POST /api/organizations/[orgId]/integrations/test-atlas
 *
 * Tests MongoDB Atlas API credentials before saving them.
 * Makes a simple API call to verify the credentials work.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { AtlasApiClient } from '@/lib/atlas/client';

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

    const body = await request.json();
    const { publicKey, privateKey, atlasOrgId } = body as {
      publicKey: string;
      privateKey: string;
      atlasOrgId: string;
    };

    // Validate required fields
    if (!publicKey || !privateKey || !atlasOrgId) {
      return NextResponse.json(
        { error: 'publicKey, privateKey, and atlasOrgId are required' },
        { status: 400 }
      );
    }

    // Create a temporary Atlas client with the provided credentials
    const client = new AtlasApiClient({ publicKey, privateKey });

    // Test the connection by listing projects in the organization
    // We use a short timeout to fail fast if credentials are invalid
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    try {
      // Try to list projects in the organization
      // This is a simple read operation that requires minimal permissions
      const result = await client.getProjectByName(atlasOrgId, '__test_connection__');

      clearTimeout(timeoutId);

      // The getProjectByName method returns success: true even if no project is found
      // It only returns success: false on authentication/authorization errors
      if (!result.success) {
        const errorDetail = result.error?.detail;
        const errorCode = result.error?.error;
        const errorMessage = String(errorDetail || errorCode || 'Authentication failed');

        // Parse common Atlas API error codes
        if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
          return NextResponse.json({
            success: false,
            error: 'Invalid API credentials. Please check your public and private keys.',
          });
        }

        if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
          return NextResponse.json({
            success: false,
            error: 'API key does not have permission to access this organization. Please verify the organization ID and key permissions.',
          });
        }

        if (errorMessage.includes('404')) {
          return NextResponse.json({
            success: false,
            error: 'Organization not found. Please verify the Atlas Organization ID.',
          });
        }

        return NextResponse.json({
          success: false,
          error: `Atlas API error: ${errorMessage}`,
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Successfully connected to MongoDB Atlas!',
        atlasOrgId,
      });
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return NextResponse.json({
            success: false,
            error: 'Connection timed out. Please check your network connection.',
          });
        }

        if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
          return NextResponse.json({
            success: false,
            error: 'Could not reach MongoDB Atlas. Please check your network connection.',
          });
        }
      }

      throw error;
    }
  } catch (error) {
    console.error('[Test Atlas API] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed',
      },
      { status: 500 }
    );
  }
}
