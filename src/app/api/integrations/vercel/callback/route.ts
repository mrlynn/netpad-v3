/**
 * Vercel Integration OAuth Callback
 *
 * This endpoint handles the OAuth callback from Vercel after a user
 * authorizes the NetPad integration. It exchanges the code for an
 * access token and stores it for the user.
 *
 * Flow:
 * 1. User clicks "Add Integration" on Vercel
 * 2. Vercel redirects to our callback with an authorization code
 * 3. We exchange the code for an access token
 * 4. We redirect the user to our setup wizard
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPlatformDb } from '@/lib/platform/db';

const VERCEL_CLIENT_ID = process.env.VERCEL_CLIENT_ID || '';
const VERCEL_CLIENT_SECRET = process.env.VERCEL_CLIENT_SECRET || '';
const APP_URL = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

interface VercelTokenResponse {
  access_token: string;
  token_type: string;
  installation_id: string;
  user_id: string;
  team_id?: string;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const configurationId = searchParams.get('configurationId');
  const teamId = searchParams.get('teamId');
  const next = searchParams.get('next');

  // Handle errors from Vercel
  const error = searchParams.get('error');
  if (error) {
    console.error('[Vercel Integration] OAuth error:', error);
    return NextResponse.redirect(
      new URL(`/setup/vercel?error=${encodeURIComponent(error)}`, APP_URL)
    );
  }

  if (!code) {
    console.error('[Vercel Integration] No authorization code received');
    return NextResponse.redirect(
      new URL('/setup/vercel?error=missing_code', APP_URL)
    );
  }

  // If Vercel integration is not configured, redirect to setup with instructions
  if (!VERCEL_CLIENT_ID || !VERCEL_CLIENT_SECRET) {
    console.log('[Vercel Integration] Integration not configured, redirecting to manual setup');
    return NextResponse.redirect(
      new URL('/setup/vercel?mode=manual', APP_URL)
    );
  }

  try {
    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://api.vercel.com/v2/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: VERCEL_CLIENT_ID,
        client_secret: VERCEL_CLIENT_SECRET,
        code,
        redirect_uri: `${APP_URL}/api/integrations/vercel/callback`,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[Vercel Integration] Token exchange failed:', errorText);
      return NextResponse.redirect(
        new URL(`/setup/vercel?error=token_exchange_failed`, APP_URL)
      );
    }

    const tokenData: VercelTokenResponse = await tokenResponse.json();

    // Store the integration data
    const db = await getPlatformDb();
    const integrationsCollection = db.collection('vercel_integrations');

    await integrationsCollection.updateOne(
      {
        installationId: tokenData.installation_id,
      },
      {
        $set: {
          accessToken: tokenData.access_token,
          tokenType: tokenData.token_type,
          userId: tokenData.user_id,
          teamId: tokenData.team_id || teamId,
          configurationId,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    console.log('[Vercel Integration] Successfully stored integration for installation:', tokenData.installation_id);

    // Redirect to setup wizard with installation ID
    const setupUrl = new URL('/setup/vercel', APP_URL);
    setupUrl.searchParams.set('installation_id', tokenData.installation_id);
    if (configurationId) {
      setupUrl.searchParams.set('configuration_id', configurationId);
    }
    if (next) {
      setupUrl.searchParams.set('next', next);
    }

    return NextResponse.redirect(setupUrl);
  } catch (error) {
    console.error('[Vercel Integration] Callback error:', error);
    return NextResponse.redirect(
      new URL('/setup/vercel?error=internal_error', APP_URL)
    );
  }
}
