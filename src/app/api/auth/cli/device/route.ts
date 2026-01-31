/**
 * CLI Device Flow - Initiate
 * 
 * POST /api/auth/cli/device
 * 
 * Generates a device code for CLI authentication.
 * The CLI displays this code and the user enters it on the web.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPlatformDb } from '@/lib/platform/db';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// Device code expires in 15 minutes
const CODE_EXPIRY_MS = 15 * 60 * 1000;
// Poll interval: 5 seconds
const POLL_INTERVAL_S = 5;

interface DeviceCode {
  deviceCode: string;      // Internal identifier (secret)
  userCode: string;        // User-facing code (8 chars)
  provider?: string;       // OAuth provider hint
  expiresAt: Date;
  createdAt: Date;
  status: 'pending' | 'authorized' | 'expired' | 'used';
  userId?: string;         // Set when authorized
  sessionToken?: string;   // Set when authorized
}

/**
 * Generate a user-friendly code (8 alphanumeric chars, uppercase)
 */
function generateUserCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars: 0, O, I, 1
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const provider = body.provider; // Optional: google, github

    const db = await getPlatformDb();
    const collection = db.collection<DeviceCode>('cli_device_codes');

    // Ensure TTL index exists (codes auto-delete after expiry)
    await collection.createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0 }
    ).catch(() => {}); // Ignore if exists

    // Generate codes
    const deviceCode = crypto.randomBytes(32).toString('hex');
    const userCode = generateUserCode();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + CODE_EXPIRY_MS);

    // Store device code
    await collection.insertOne({
      deviceCode,
      userCode,
      provider,
      expiresAt,
      createdAt: now,
      status: 'pending',
    });

    // Build verification URL
    const baseUrl = process.env.NEXTAUTH_URL || 
                   process.env.NEXT_PUBLIC_APP_URL || 
                   'http://localhost:3000';
    
    let verificationUrl = `${baseUrl}/auth/cli/verify?code=${userCode}`;
    if (provider) {
      verificationUrl += `&provider=${provider}`;
    }

    return NextResponse.json({
      device_code: deviceCode,
      user_code: userCode,
      verification_uri: verificationUrl,
      verification_uri_complete: verificationUrl,
      expires_in: Math.floor(CODE_EXPIRY_MS / 1000),
      interval: POLL_INTERVAL_S,
    });
  } catch (error) {
    console.error('[CLI Device Flow] Error initiating:', error);
    return NextResponse.json(
      { error: 'Failed to initiate device flow' },
      { status: 500 }
    );
  }
}
