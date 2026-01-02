/**
 * Google OAuth2 Callback Endpoint
 *
 * GET /api/auth/google/callback?code=xxx&state=xxx
 *
 * Handles the OAuth2 callback from Google after user consent.
 * Exchanges authorization code for tokens and stores credential.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getOAuthStatesCollection } from '@/lib/platform/db';
import { createIntegrationCredential } from '@/lib/platform/integrationCredentials';
import { IntegrationProvider } from '@/types/platform';

// Google OAuth2 configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET || '';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Handle error from Google
    if (error) {
      console.error('[Google OAuth Callback] Error from Google:', error);
      return NextResponse.redirect(
        `${baseUrl}/settings?tab=integrations&error=${encodeURIComponent(error)}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${baseUrl}/settings?tab=integrations&error=${encodeURIComponent('Missing authorization code or state')}`
      );
    }

    // Verify state token
    const statesCollection = await getOAuthStatesCollection();
    const storedState = await statesCollection.findOneAndDelete({
      state,
      expiresAt: { $gt: new Date() },
    });

    if (!storedState) {
      return NextResponse.redirect(
        `${baseUrl}/settings?tab=integrations&error=${encodeURIComponent('Invalid or expired state token')}`
      );
    }

    const { userId, orgId, integrationType, credentialName } = storedState;

    // Validate required integration fields
    if (!userId || !orgId || !integrationType || !credentialName) {
      console.error('[Google OAuth Callback] Missing integration fields in state:', {
        hasUserId: !!userId,
        hasOrgId: !!orgId,
        hasIntegrationType: !!integrationType,
        hasCredentialName: !!credentialName,
      });
      return NextResponse.redirect(
        `${baseUrl}/settings?tab=integrations&error=${encodeURIComponent('Invalid OAuth state - missing required fields')}`
      );
    }

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return NextResponse.redirect(
        `${baseUrl}/settings?tab=integrations&error=${encodeURIComponent('Google OAuth not configured')}`
      );
    }

    // Exchange code for tokens
    const redirectUri = `${baseUrl}/api/auth/google/callback`;

    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[Google OAuth Callback] Token exchange failed:', errorText);
      return NextResponse.redirect(
        `${baseUrl}/settings?tab=integrations&error=${encodeURIComponent('Failed to exchange authorization code')}`
      );
    }

    const tokens = await tokenResponse.json();

    // Get user info (email)
    let userEmail = '';
    try {
      const userInfoResponse = await fetch(GOOGLE_USERINFO_URL, {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      });
      if (userInfoResponse.ok) {
        const userInfo = await userInfoResponse.json();
        userEmail = userInfo.email || '';
      }
    } catch (e) {
      console.warn('[Google OAuth Callback] Failed to fetch user info:', e);
    }

    // Calculate token expiry
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : undefined;

    // Store the credential
    await createIntegrationCredential({
      organizationId: orgId,
      createdBy: userId,
      provider: integrationType as IntegrationProvider,
      name: credentialName,
      description: `Connected via OAuth2${userEmail ? ` (${userEmail})` : ''}`,
      authType: 'oauth2',
      credentials: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenType: tokens.token_type || 'Bearer',
        expiresAt,
        scope: tokens.scope,
      },
      oauthMetadata: {
        connectedEmail: userEmail,
        scopes: tokens.scope?.split(' '),
        expiresAt,
      },
    });

    console.log(`[Google OAuth Callback] Successfully created credential for ${userEmail || userId}`);

    // Redirect back to settings with success
    return NextResponse.redirect(
      `${baseUrl}/settings?tab=integrations&success=google_connected`
    );
  } catch (error) {
    console.error('[Google OAuth Callback] Error:', error);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return NextResponse.redirect(
      `${baseUrl}/settings?tab=integrations&error=${encodeURIComponent('Failed to complete Google authentication')}`
    );
  }
}
