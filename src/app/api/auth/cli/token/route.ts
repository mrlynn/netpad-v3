/**
 * CLI Device Flow - Token Polling
 * 
 * POST /api/auth/cli/token
 * 
 * CLI polls this endpoint to check if user has authorized.
 * Returns access token once authorized.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPlatformDb } from '@/lib/platform/db';

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
    const body = await request.json();
    const { device_code } = body;

    if (!device_code) {
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'device_code is required' },
        { status: 400 }
      );
    }

    const db = await getPlatformDb();
    const collection = db.collection<DeviceCode>('cli_device_codes');

    // Find the device code
    const deviceCode = await collection.findOne({ deviceCode: device_code });

    if (!deviceCode) {
      return NextResponse.json(
        { error: 'invalid_grant', error_description: 'Device code not found or expired' },
        { status: 400 }
      );
    }

    // Check expiration
    if (new Date() > deviceCode.expiresAt) {
      await collection.updateOne(
        { deviceCode: device_code },
        { $set: { status: 'expired' } }
      );
      return NextResponse.json(
        { error: 'expired_token', error_description: 'Device code has expired' },
        { status: 400 }
      );
    }

    // Check status
    switch (deviceCode.status) {
      case 'pending':
        // User hasn't authorized yet - tell CLI to keep polling
        return NextResponse.json(
          { error: 'authorization_pending', error_description: 'User has not yet authorized' },
          { status: 400 }
        );

      case 'authorized':
        // User authorized! Return the token and mark as used
        await collection.updateOne(
          { deviceCode: device_code },
          { $set: { status: 'used' } }
        );

        return NextResponse.json({
          access_token: deviceCode.apiKey,
          token_type: 'Bearer',
          user_id: deviceCode.userId,
          org_id: deviceCode.orgId,
        });

      case 'expired':
        return NextResponse.json(
          { error: 'expired_token', error_description: 'Device code has expired' },
          { status: 400 }
        );

      case 'used':
        return NextResponse.json(
          { error: 'invalid_grant', error_description: 'Device code has already been used' },
          { status: 400 }
        );

      default:
        return NextResponse.json(
          { error: 'server_error', error_description: 'Unknown device code status' },
          { status: 500 }
        );
    }
  } catch (error) {
    console.error('[CLI Device Flow] Token error:', error);
    return NextResponse.json(
      { error: 'server_error', error_description: 'Failed to process token request' },
      { status: 500 }
    );
  }
}
