/**
 * OAuth Provider Service
 *
 * Handles OAuth authentication with Google and GitHub.
 * Uses the Authorization Code flow.
 */

import crypto from 'crypto';
import { getOAuthStatesCollection } from './db';
import { findOrCreateUser, updateLastLogin } from './users';
import { OAuthConnection, OAuthState, PlatformUser } from '@/types/platform';

// ============================================
// OAuth Configuration
// ============================================

interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  authorizeUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scopes: string[];
}

function getGoogleConfig(): OAuthConfig {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.');
  }

  return {
    clientId,
    clientSecret,
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
    scopes: ['openid', 'email', 'profile'],
  };
}

function getGitHubConfig(): OAuthConfig {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('GitHub OAuth not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET.');
  }

  return {
    clientId,
    clientSecret,
    authorizeUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    scopes: ['read:user', 'user:email'],
  };
}

function getConfig(provider: 'google' | 'github'): OAuthConfig {
  return provider === 'google' ? getGoogleConfig() : getGitHubConfig();
}

function getCallbackUrl(provider: 'google' | 'github'): string {
  // For server-side OAuth, prefer APP_URL (runtime) over NEXT_PUBLIC_APP_URL (build-time)
  // VERCEL_URL is auto-set by Vercel but doesn't include protocol
  const baseUrl =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    'http://localhost:3000';
  return `${baseUrl}/api/auth/oauth/callback/${provider}`;
}

// ============================================
// OAuth State Management
// ============================================

/**
 * Generate and store OAuth state token
 */
export async function createOAuthState(
  provider: 'google' | 'github',
  redirectTo?: string
): Promise<string> {
  const collection = await getOAuthStatesCollection();

  const state = crypto.randomBytes(32).toString('hex');

  const oauthState: OAuthState = {
    state,
    provider,
    redirectTo,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
  };

  await collection.insertOne(oauthState);

  return state;
}

/**
 * Verify and consume OAuth state token
 */
export async function verifyOAuthState(
  state: string
): Promise<{ provider: 'google' | 'github'; redirectTo?: string } | null> {
  const collection = await getOAuthStatesCollection();

  const oauthState = await collection.findOneAndDelete({
    state,
    expiresAt: { $gt: new Date() },
  });

  if (!oauthState) return null;

  return {
    provider: oauthState.provider,
    redirectTo: oauthState.redirectTo,
  };
}

// ============================================
// OAuth URL Generation
// ============================================

/**
 * Generate OAuth authorization URL
 */
export async function getAuthorizationUrl(
  provider: 'google' | 'github',
  redirectTo?: string
): Promise<string> {
  const config = getConfig(provider);
  const state = await createOAuthState(provider, redirectTo);
  const callbackUrl = getCallbackUrl(provider);

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: callbackUrl,
    scope: config.scopes.join(' '),
    state,
    response_type: 'code',
  });

  // Google-specific parameters
  if (provider === 'google') {
    params.set('access_type', 'offline');
    params.set('prompt', 'consent');
  }

  return `${config.authorizeUrl}?${params.toString()}`;
}

// ============================================
// OAuth Token Exchange
// ============================================

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

/**
 * Exchange authorization code for access token
 */
async function exchangeCodeForToken(
  provider: 'google' | 'github',
  code: string
): Promise<TokenResponse> {
  const config = getConfig(provider);
  const callbackUrl = getCallbackUrl(provider);

  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    redirect_uri: callbackUrl,
    grant_type: 'authorization_code',
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  // GitHub requires Accept header for JSON
  if (provider === 'github') {
    headers['Accept'] = 'application/json';
  }

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers,
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  return response.json();
}

// ============================================
// User Info Fetching
// ============================================

interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

interface GitHubUserInfo {
  id: number;
  login: string;
  name?: string;
  email?: string;
  avatar_url?: string;
}

interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}

/**
 * Fetch user info from Google
 */
async function getGoogleUserInfo(accessToken: string): Promise<{
  providerId: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
}> {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Google user info');
  }

  const data: GoogleUserInfo = await response.json();

  if (!data.email) {
    throw new Error('Google account does not have an email');
  }

  return {
    providerId: data.id,
    email: data.email,
    displayName: data.name,
    avatarUrl: data.picture,
  };
}

/**
 * Fetch user info from GitHub
 */
async function getGitHubUserInfo(accessToken: string): Promise<{
  providerId: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
}> {
  // Get user profile
  const userResponse = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!userResponse.ok) {
    throw new Error('Failed to fetch GitHub user info');
  }

  const userData: GitHubUserInfo = await userResponse.json();

  // GitHub may not expose email in profile, need to fetch emails separately
  let email = userData.email;

  if (!email) {
    const emailsResponse = await fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (emailsResponse.ok) {
      const emails: GitHubEmail[] = await emailsResponse.json();
      const primaryEmail = emails.find((e) => e.primary && e.verified);
      const verifiedEmail = emails.find((e) => e.verified);
      email = primaryEmail?.email || verifiedEmail?.email;
    }
  }

  if (!email) {
    throw new Error('GitHub account does not have a verified email');
  }

  return {
    providerId: userData.id.toString(),
    email,
    displayName: userData.name || userData.login,
    avatarUrl: userData.avatar_url,
  };
}

// ============================================
// Complete OAuth Flow
// ============================================

export interface OAuthResult {
  user: PlatformUser;
  isNewUser: boolean;
  redirectTo?: string;
}

/**
 * Handle OAuth callback - exchange code, get user info, create/update user
 */
export async function handleOAuthCallback(
  provider: 'google' | 'github',
  code: string,
  state: string
): Promise<OAuthResult> {
  // Verify state
  const stateData = await verifyOAuthState(state);
  if (!stateData || stateData.provider !== provider) {
    throw new Error('Invalid OAuth state');
  }

  // Exchange code for token
  const tokenResponse = await exchangeCodeForToken(provider, code);

  // Get user info
  const userInfo =
    provider === 'google'
      ? await getGoogleUserInfo(tokenResponse.access_token)
      : await getGitHubUserInfo(tokenResponse.access_token);

  // Create OAuth connection
  const oauthConnection: OAuthConnection = {
    provider,
    providerId: userInfo.providerId,
    email: userInfo.email,
    displayName: userInfo.displayName,
    avatarUrl: userInfo.avatarUrl,
    connectedAt: new Date(),
    lastUsedAt: new Date(),
  };

  // Find or create user
  const { user, isNew } = await findOrCreateUser(userInfo.email, oauthConnection);

  // Update last login
  await updateLastLogin(user.userId);

  return {
    user,
    isNewUser: isNew,
    redirectTo: stateData.redirectTo,
  };
}

// ============================================
// OAuth Provider Availability
// ============================================

/**
 * Check which OAuth providers are configured
 */
export function getAvailableProviders(): { google: boolean; github: boolean } {
  return {
    google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    github: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
  };
}

/**
 * Check if a specific provider is available
 */
export function isProviderAvailable(provider: 'google' | 'github'): boolean {
  const available = getAvailableProviders();
  return available[provider];
}
