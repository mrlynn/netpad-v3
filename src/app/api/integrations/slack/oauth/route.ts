import { NextRequest, NextResponse } from 'next/server';
import { getIronSession, IronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/auth/session';
import { createIntegrationCredential } from '@/lib/platform/integrationCredentials';
import { connectDB } from '@/lib/mongodb';
import { encrypt } from '@/lib/encryption';
import { nanoid } from 'nanoid';

export const dynamic = 'force-dynamic';

const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID;
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET;
const SLACK_REDIRECT_URI = process.env.SLACK_REDIRECT_URI || `${process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL}/api/integrations/slack/oauth/callback`;

// Session options for Slack OAuth state storage
interface SlackOAuthSession {
  slackOAuthState?: string;
}

const SLACK_SESSION_OPTIONS = {
  cookieName: 'slack_oauth_session',
  password: process.env.SESSION_SECRET || 'complex_password_at_least_32_characters_long_for_iron_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax' as const,
    maxAge: 60 * 10, // 10 minutes for OAuth flow
  },
};

/**
 * GET /api/integrations/slack/oauth
 * Initiate Slack OAuth flow
 * Redirects user to Slack authorization page
 */
export async function GET(request: NextRequest) {
  try {
    if (!SLACK_CLIENT_ID) {
      return NextResponse.json(
        { error: 'Slack client ID not configured' },
        { status: 500 }
      );
    }

    // Get auth session to verify user is logged in
    const authSession = await getSession();
    if (!authSession.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get OAuth state session
    const session = await getIronSession<SlackOAuthSession>(await cookies(), SLACK_SESSION_OPTIONS);
    const sessionId = nanoid();

    // Get organization ID from query params (required)
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID required' },
        { status: 400 }
      );
    }

    // Generate state parameter for CSRF protection
    const state = Buffer.from(JSON.stringify({
      sessionId,
      organizationId,
      timestamp: Date.now(),
    })).toString('base64url');

    // Store state in session
    session.slackOAuthState = state;
    await session.save();

    // Build Slack OAuth URL
    const scopes = [
      'chat:write',
      'chat:write.public',
      'channels:read',
      'channels:history',
      'users:read',
      'files:write',
    ].join(',');

    const authUrl = new URL('https://slack.com/oauth/v2/authorize');
    authUrl.searchParams.set('client_id', SLACK_CLIENT_ID);
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('redirect_uri', SLACK_REDIRECT_URI);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('user_scope', ''); // Optional: user token scopes

    // Redirect to Slack authorization
    return NextResponse.redirect(authUrl.toString());
  } catch (error: any) {
    console.error('[Slack OAuth] Initiation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initiate OAuth' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/integrations/slack/oauth/callback
 * Handle OAuth callback from Slack
 * Exchanges authorization code for access token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, state, error } = body;

    if (error) {
      return NextResponse.json(
        { error: `Slack authorization denied: ${error}` },
        { status: 400 }
      );
    }

    if (!code || !state) {
      return NextResponse.json(
        { error: 'Missing code or state parameter' },
        { status: 400 }
      );
    }

    // Verify state
    const session = await getIronSession<SlackOAuthSession>(await cookies(), SLACK_SESSION_OPTIONS);
    if (session.slackOAuthState !== state) {
      return NextResponse.json(
        { error: 'Invalid state parameter' },
        { status: 400 }
      );
    }

    // Decode state to get organization ID
    let stateData: { organizationId: string; sessionId: string };
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64url').toString());
    } catch {
      return NextResponse.json(
        { error: 'Invalid state format' },
        { status: 400 }
      );
    }

    const { organizationId } = stateData;

    if (!SLACK_CLIENT_ID || !SLACK_CLIENT_SECRET) {
      return NextResponse.json(
        { error: 'Slack credentials not configured' },
        { status: 500 }
      );
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: SLACK_CLIENT_ID,
        client_secret: SLACK_CLIENT_SECRET,
        code,
        redirect_uri: SLACK_REDIRECT_URI,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.ok) {
      console.error('[Slack OAuth] Token exchange failed:', tokenData);
      return NextResponse.json(
        { error: tokenData.error || 'Failed to exchange code for token' },
        { status: 400 }
      );
    }

    // Get workspace info
    const workspaceInfo = tokenData.team || {};
    const botToken = tokenData.access_token;
    const botUserId = tokenData.bot_user_id;
    const authedUser = tokenData.authed_user;

    // Verify token by getting workspace info
    const authTestResponse = await fetch('https://slack.com/api/auth.test', {
      headers: {
        'Authorization': `Bearer ${botToken}`,
      },
    });

    const authTest = await authTestResponse.json();

    if (!authTest.ok) {
      return NextResponse.json(
        { error: 'Failed to verify Slack token' },
        { status: 400 }
      );
    }

    // Store credentials using existing integration system
    const authSession = await getSession();
    const userId = authSession.userId || 'system';
    
    // Check if credential already exists for this workspace
    const db = await connectDB();
    const credentialsCollection = db.collection('integration_credentials');
    const existing = await credentialsCollection.findOne({
      organizationId,
      provider: 'slack',
      'oauthMetadata.workspaceId': workspaceInfo.id,
      status: { $ne: 'disabled' },
    });

    const oauthTokens = {
      accessToken: botToken,
      refreshToken: tokenData.refresh_token || undefined,
      tokenType: 'Bearer',
      expiresAt: tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000)
        : undefined,
      scope: tokenData.scope || '',
    };

    // Extended OAuth tokens with Slack-specific metadata
    const extendedTokens = {
      ...oauthTokens,
      // Store Slack-specific metadata in the encrypted credentials
      workspaceId: workspaceInfo.id,
      workspaceName: workspaceInfo.name,
      botUserId,
      authedUserId: authedUser?.id,
    };

    // Standard oauth metadata for display
    const standardMetadata = {
      connectedAccount: `${workspaceInfo.name} (${workspaceInfo.id})`,
      scopes: tokenData.scope?.split(',') || [],
      expiresAt: oauthTokens.expiresAt,
    };

    if (existing) {
      // Update existing credential
      await credentialsCollection.updateOne(
        { credentialId: existing.credentialId },
        {
          $set: {
            encryptedCredentials: encrypt(JSON.stringify(extendedTokens)),
            oauthMetadata: standardMetadata,
            updatedAt: new Date(),
            status: 'active',
          },
        }
      );

      return NextResponse.json({
        success: true,
        credentialId: existing.credentialId,
        workspaceName: workspaceInfo.name,
        message: 'Slack workspace reconnected successfully',
      });
    } else {
      // Create new credential
      const credential = await createIntegrationCredential({
        organizationId,
        createdBy: userId,
        provider: 'slack',
        name: `Slack - ${workspaceInfo.name}`,
        description: `Slack workspace: ${workspaceInfo.name}`,
        authType: 'oauth2',
        credentials: extendedTokens,
        oauthMetadata: standardMetadata,
      });

      return NextResponse.json({
        success: true,
        credentialId: credential.credentialId,
        workspaceName: workspaceInfo.name,
        message: 'Slack workspace connected successfully',
      });
    }
  } catch (error: any) {
    console.error('[Slack OAuth] Callback error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to complete OAuth flow' },
      { status: 500 }
    );
  }
}
