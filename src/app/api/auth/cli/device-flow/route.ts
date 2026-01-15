/**
 * OAuth Device Flow for CLI
 * 
 * POST /api/auth/cli/device-flow - Initiate device flow
 * GET /api/auth/cli/device-flow/:deviceCode - Poll for token
 * 
 * Implements OAuth 2.0 Device Authorization Grant (RFC 8628)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationUrl, handleOAuthCallback, isProviderAvailable } from '@/lib/platform/oauth';
import { createSession } from '@/lib/auth/session';
import { getOAuthStatesCollection } from '@/lib/platform/db';
import crypto from 'crypto';

interface DeviceFlowState {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  verificationUriComplete: string;
  expiresIn: number;
  interval: number;
  provider: 'google' | 'github';
  state?: string;
  createdAt: Date;
  status: 'pending' | 'authorized' | 'expired';
  accessToken?: string;
  userId?: string;
  email?: string;
}

// In-memory store for device flow states (in production, use Redis)
const deviceFlowStore = new Map<string, DeviceFlowState>();

// Cleanup expired entries every 10 minutes
setInterval(() => {
  const now = new Date();
  for (const [code, state] of deviceFlowStore.entries()) {
    const expiresAt = new Date(state.createdAt.getTime() + state.expiresIn * 1000);
    if (now > expiresAt) {
      state.status = 'expired';
      deviceFlowStore.delete(code);
    }
  }
}, 10 * 60 * 1000);

/**
 * POST /api/auth/cli/device-flow
 * Initiate OAuth device flow
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider } = body;

    if (!provider || (provider !== 'google' && provider !== 'github')) {
      return NextResponse.json(
        { error: 'Invalid provider. Must be "google" or "github"' },
        { status: 400 }
      );
    }

    if (!isProviderAvailable(provider)) {
      return NextResponse.json(
        { error: `${provider} OAuth is not configured` },
        { status: 503 }
      );
    }

    // Generate device code and user code
    const deviceCode = crypto.randomBytes(32).toString('hex');
    const userCode = generateUserCode(); // 8 character code

    // Generate authorization URL
    const authUrl = await getAuthorizationUrl(provider, `/auth/cli/callback?deviceCode=${deviceCode}`);
    
    // Extract state from auth URL
    const url = new URL(authUrl);
    const state = url.searchParams.get('state');

    const deviceFlowState: DeviceFlowState = {
      deviceCode,
      userCode,
      verificationUri: `${process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/cli/verify?code=${userCode}`,
      verificationUriComplete: `${process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/cli/verify?code=${userCode}&provider=${provider}`,
      expiresIn: 600, // 10 minutes
      interval: 5, // Poll every 5 seconds
      provider,
      state: state || undefined,
      createdAt: new Date(),
      status: 'pending',
    };

    deviceFlowStore.set(deviceCode, deviceFlowState);

    return NextResponse.json({
      device_code: deviceCode,
      user_code: userCode,
      verification_uri: deviceFlowState.verificationUri,
      verification_uri_complete: deviceFlowState.verificationUriComplete,
      expires_in: deviceFlowState.expiresIn,
      interval: deviceFlowState.interval,
    });
  } catch (error: any) {
    console.error('[Device Flow] Error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate device flow', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/cli/device-flow/:deviceCode
 * Poll for authorization token
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deviceCode: string }> }
) {
  try {
    const { deviceCode } = await params;
    const state = deviceFlowStore.get(deviceCode);

    if (!state) {
      return NextResponse.json(
        { error: 'invalid_grant', error_description: 'Device code not found or expired' },
        { status: 400 }
      );
    }

    // Check expiration
    const expiresAt = new Date(state.createdAt.getTime() + state.expiresIn * 1000);
    if (new Date() > expiresAt) {
      state.status = 'expired';
      deviceFlowStore.delete(deviceCode);
      return NextResponse.json(
        { error: 'expired_token', error_description: 'Device code has expired' },
        { status: 400 }
      );
    }

    if (state.status === 'pending') {
      // Still waiting for authorization
      return NextResponse.json(
        { error: 'authorization_pending', error_description: 'User has not yet completed authorization' },
        { status: 400 }
      );
    }

    if (state.status === 'authorized' && state.accessToken && state.userId && state.email) {
      // Create session and return token
      const sessionToken = crypto.randomBytes(32).toString('hex');
      
      // Store session token (in production, use Redis or database)
      // For now, we'll return the session info and let the CLI store it
      
      // Clean up device flow state
      deviceFlowStore.delete(deviceCode);

      return NextResponse.json({
        access_token: sessionToken,
        token_type: 'Bearer',
        expires_in: 60 * 60 * 24 * 7, // 7 days
        user: {
          userId: state.userId,
          email: state.email,
        },
      });
    }

    return NextResponse.json(
      { error: 'invalid_grant', error_description: 'Authorization failed' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[Device Flow] Poll error:', error);
    return NextResponse.json(
      { error: 'Failed to poll device flow', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auth/cli/device-flow/:deviceCode/authorize
 * Called by the web callback after OAuth completes
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deviceCode: string }> }
) {
  try {
    const { deviceCode } = await params;
    const body = await request.json();
    const { code, state: oauthState } = body;

    const deviceFlowState = deviceFlowStore.get(deviceCode);
    if (!deviceFlowState || deviceFlowState.status !== 'pending') {
      return NextResponse.json(
        { error: 'Invalid device code' },
        { status: 400 }
      );
    }

    // Handle OAuth callback
    const result = await handleOAuthCallback(deviceFlowState.provider, code, oauthState);

    // Update device flow state
    deviceFlowState.status = 'authorized';
    deviceFlowState.userId = result.user.userId;
    deviceFlowState.email = result.user.email;
    deviceFlowState.accessToken = 'pending'; // Will be replaced with session token

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Device Flow] Authorization error:', error);
    return NextResponse.json(
      { error: 'Failed to authorize', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Generate a user-friendly 8-character code
 */
function generateUserCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
