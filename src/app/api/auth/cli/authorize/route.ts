/**
 * CLI Device Flow - Authorize
 * 
 * POST /api/auth/cli/authorize
 * 
 * Called when user authorizes the CLI after logging in.
 * Creates an API key and marks the device code as authorized.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getPlatformDb } from '@/lib/platform/db';
import { createAPIKey } from '@/lib/api/keys';
import { getUserOrganizations } from '@/lib/platform/organizations';

export const dynamic = 'force-dynamic';

interface DeviceCode {
  deviceCode: string;
  userCode: string;
  provider?: string;
  expiresAt: Date;
  createdAt: Date;
  status: 'pending' | 'authorized' | 'expired' | 'used';
  userId?: string;
  apiKey?: string;
  orgId?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Require authenticated session
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { user_code } = body;

    if (!user_code) {
      return NextResponse.json(
        { error: 'user_code is required' },
        { status: 400 }
      );
    }

    const db = await getPlatformDb();
    const collection = db.collection<DeviceCode>('cli_device_codes');

    // Find the device code by user code
    const deviceCode = await collection.findOne({ 
      userCode: user_code.toUpperCase(),
      status: 'pending',
    });

    if (!deviceCode) {
      return NextResponse.json(
        { error: 'Invalid or expired code' },
        { status: 400 }
      );
    }

    // Check expiration
    if (new Date() > deviceCode.expiresAt) {
      await collection.updateOne(
        { userCode: user_code.toUpperCase() },
        { $set: { status: 'expired' } }
      );
      return NextResponse.json(
        { error: 'Code has expired. Please try again.' },
        { status: 400 }
      );
    }

    // Get user's organization
    const userOrgs = await getUserOrganizations(session.userId);
    const orgId = userOrgs[0]?.orgId;

    // Create an API key for CLI access
    const { fullKey } = await createAPIKey(
      orgId || 'personal',
      session.userId,
      {
        name: 'CLI Access',
        description: 'Auto-generated for CLI device flow',
        permissions: ['full_access'], // CLI needs full access
        environment: 'live',
      }
    );

    // Mark device code as authorized
    await collection.updateOne(
      { userCode: user_code.toUpperCase() },
      {
        $set: {
          status: 'authorized',
          userId: session.userId,
          apiKey: fullKey,
          orgId,
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: 'CLI authorized successfully. You can close this window.',
    });
  } catch (error) {
    console.error('[CLI Device Flow] Authorization error:', error);
    return NextResponse.json(
      { error: 'Failed to authorize CLI' },
      { status: 500 }
    );
  }
}
