/**
 * Test Moltboard Connection API
 *
 * POST /api/organizations/[orgId]/integrations/test-moltboard
 *
 * Tests Moltboard API credentials before saving them.
 * Makes a simple API call to verify the credentials work.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { validateMoltboardCredentials } from '@/lib/platform/integrationCredentials';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const session = await getSession();
    await params; // Validate org access (unused but required for route)

    if (!session.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { apiKey, baseUrl } = body as {
      apiKey: string;
      baseUrl?: string;
    };

    // Validate required fields
    if (!apiKey) {
      return NextResponse.json(
        { error: 'apiKey is required' },
        { status: 400 }
      );
    }

    // Test the connection
    const result = await validateMoltboardCredentials(
      apiKey,
      baseUrl || 'https://kanban.mlynn.org'
    );

    if (!result.valid) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Connection test failed',
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully connected to Moltboard!',
      boards: result.boards,
    });
  } catch (error) {
    console.error('[Test Moltboard API] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed',
      },
      { status: 500 }
    );
  }
}
