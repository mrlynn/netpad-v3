/**
 * Google OAuth2 Authorization Endpoint
 *
 * GET /api/auth/google?provider=google_sheets&orgId=xxx
 *
 * Initiates OAuth2 flow to connect Google services.
 * Redirects user to Google's consent screen.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getOAuthStatesCollection } from '@/lib/platform/db';
import { generateSecureId } from '@/lib/encryption';

// Google OAuth2 configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID || '';
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

// Scopes for different Google services
const GOOGLE_SCOPES: Record<string, string[]> = {
  google_sheets: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/userinfo.email',
  ],
  google_drive: [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/userinfo.email',
  ],
  google_calendar: [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/userinfo.email',
  ],
};

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get parameters
    const searchParams = request.nextUrl.searchParams;
    const provider = searchParams.get('provider') || 'google_sheets';
    const orgId = searchParams.get('orgId');
    const credentialName = searchParams.get('name') || 'Google Connection';

    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization ID required' },
        { status: 400 }
      );
    }

    if (!GOOGLE_CLIENT_ID) {
      return NextResponse.json(
        { error: 'Google OAuth not configured. Set GOOGLE_OAUTH_CLIENT_ID environment variable.' },
        { status: 503 }
      );
    }

    // Get scopes for this provider
    const scopes = GOOGLE_SCOPES[provider];
    if (!scopes) {
      return NextResponse.json(
        { error: `Unsupported provider: ${provider}` },
        { status: 400 }
      );
    }

    // Generate state token
    const state = generateSecureId('gstate');

    // Store state in database (with TTL)
    const statesCollection = await getOAuthStatesCollection();
    await statesCollection.insertOne({
      state,
      provider: 'google',
      integrationType: provider,
      userId: session.userId,
      orgId,
      credentialName,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    });

    // Build authorization URL
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/google/callback`;

    const authUrl = new URL(GOOGLE_AUTH_URL);
    authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scopes.join(' '));
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('access_type', 'offline'); // Get refresh token
    authUrl.searchParams.set('prompt', 'consent'); // Always show consent to get refresh token

    // Redirect to Google
    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error('[Google OAuth] Error initiating flow:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Google authentication' },
      { status: 500 }
    );
  }
}
