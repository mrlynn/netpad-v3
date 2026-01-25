/**
 * OAuth 2.0 + PKCE utilities for NetPad MCP Remote Server
 *
 * This implements the OAuth 2.0 Authorization Code flow with PKCE
 * for Claude.ai's Remote MCP connector integration.
 */

import crypto from 'crypto';

// ============================================================================
// CONFIGURATION
// ============================================================================

export const OAUTH_CONFIG = {
  // Issuer URL (the MCP server itself)
  issuer: process.env.OAUTH_ISSUER || 'https://mcp.netpad.io',

  // NetPad API URL for user authentication
  // Note: Using www.netpad.io because netpad.io redirects to www with 307
  netpadApiUrl: process.env.NETPAD_API_URL || 'https://www.netpad.io',

  // Token settings
  accessTokenTtlSeconds: 3600, // 1 hour
  refreshTokenTtlSeconds: 86400 * 30, // 30 days
  authCodeTtlSeconds: 600, // 10 minutes

  // Allowed OAuth clients
  allowedClients: {
    'netpad': {
      name: 'NetPad MCP Connector',
      redirectUris: [
        'https://claude.ai/api/mcp/auth_callback',
        'https://www.claude.ai/api/mcp/auth_callback',
        // Add localhost for testing
        'http://localhost:3000/api/mcp/auth_callback',
      ],
      scopes: ['claudeai', 'mcp', 'read', 'write'],
      pkceRequired: true,
    },
  },

  // Supported scopes
  scopes: {
    'claudeai': 'Access NetPad via Claude.ai',
    'mcp': 'Use MCP tools',
    'read': 'Read forms, workflows, and data',
    'write': 'Create and modify forms, workflows, and data',
  },
};

// ============================================================================
// TYPES
// ============================================================================

export interface AuthorizationCode {
  code: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  userId: string;
  organizationId: string;
  expiresAt: number;
}

export interface OAuthToken {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  scope: string;
}

export interface TokenPayload {
  sub: string; // User ID
  org: string; // Organization ID
  scope: string;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

// ============================================================================
// IN-MEMORY STORES (Replace with database in production)
// ============================================================================

// Store authorization codes (short-lived, should use Redis in production)
const authorizationCodes = new Map<string, AuthorizationCode>();

// Store refresh tokens (should use database in production)
const refreshTokens = new Map<string, { userId: string; organizationId: string; scope: string; expiresAt: number }>();

// Cleanup expired codes periodically
setInterval(() => {
  const now = Date.now();
  for (const [code, data] of authorizationCodes) {
    if (data.expiresAt < now) {
      authorizationCodes.delete(code);
    }
  }
  for (const [token, data] of refreshTokens) {
    if (data.expiresAt < now) {
      refreshTokens.delete(token);
    }
  }
}, 60000); // Every minute

// ============================================================================
// PKCE UTILITIES
// ============================================================================

/**
 * Verify PKCE code_verifier against code_challenge
 *
 * For S256: code_challenge = BASE64URL(SHA256(code_verifier))
 */
export function verifyPkceChallenge(
  codeVerifier: string,
  codeChallenge: string,
  method: string
): boolean {
  if (method === 'S256') {
    const hash = crypto.createHash('sha256').update(codeVerifier).digest();
    const computed = base64UrlEncode(hash);
    return computed === codeChallenge;
  } else if (method === 'plain') {
    return codeVerifier === codeChallenge;
  }
  return false;
}

/**
 * Base64 URL encode (RFC 4648)
 */
function base64UrlEncode(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// ============================================================================
// AUTHORIZATION CODE MANAGEMENT
// ============================================================================

/**
 * Generate and store an authorization code
 */
export function generateAuthorizationCode(params: {
  clientId: string;
  redirectUri: string;
  scope: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  userId: string;
  organizationId: string;
}): string {
  const code = crypto.randomBytes(32).toString('hex');

  authorizationCodes.set(code, {
    code,
    clientId: params.clientId,
    redirectUri: params.redirectUri,
    scope: params.scope,
    codeChallenge: params.codeChallenge,
    codeChallengeMethod: params.codeChallengeMethod,
    userId: params.userId,
    organizationId: params.organizationId,
    expiresAt: Date.now() + OAUTH_CONFIG.authCodeTtlSeconds * 1000,
  });

  return code;
}

/**
 * Consume an authorization code (one-time use)
 */
export function consumeAuthorizationCode(code: string): AuthorizationCode | null {
  const data = authorizationCodes.get(code);

  if (!data) {
    return null;
  }

  // Delete immediately (one-time use)
  authorizationCodes.delete(code);

  // Check expiration
  if (data.expiresAt < Date.now()) {
    return null;
  }

  return data;
}

// ============================================================================
// TOKEN GENERATION
// ============================================================================

/**
 * Generate access token (JWT-like but simpler for now)
 *
 * In production, use proper JWT with RS256 signing
 */
export function generateAccessToken(params: {
  userId: string;
  organizationId: string;
  scope: string;
}): string {
  const payload: TokenPayload = {
    sub: params.userId,
    org: params.organizationId,
    scope: params.scope,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + OAUTH_CONFIG.accessTokenTtlSeconds,
    iss: OAUTH_CONFIG.issuer,
    aud: 'mcp.netpad.io',
  };

  // Simple encoding (in production, use proper JWT signing)
  const header = base64UrlEncode(Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const body = base64UrlEncode(Buffer.from(JSON.stringify(payload)));
  const secret = process.env.OAUTH_SECRET || 'netpad-mcp-oauth-secret-change-in-production';
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest();
  const sig = base64UrlEncode(signature);

  return `${header}.${body}.${sig}`;
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(params: {
  userId: string;
  organizationId: string;
  scope: string;
}): string {
  const token = crypto.randomBytes(32).toString('hex');

  refreshTokens.set(token, {
    userId: params.userId,
    organizationId: params.organizationId,
    scope: params.scope,
    expiresAt: Date.now() + OAUTH_CONFIG.refreshTokenTtlSeconds * 1000,
  });

  return token;
}

/**
 * Validate and decode an access token
 */
export function validateAccessToken(token: string): TokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const [header, body, sig] = parts;

    // Verify signature
    const secret = process.env.OAUTH_SECRET || 'netpad-mcp-oauth-secret-change-in-production';
    const expectedSig = base64UrlEncode(
      crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest()
    );

    if (sig !== expectedSig) {
      return null;
    }

    // Decode payload
    const payload = JSON.parse(Buffer.from(body, 'base64').toString()) as TokenPayload;

    // Check expiration
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Exchange refresh token for new access token
 */
export function exchangeRefreshToken(refreshToken: string): {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  scope: string;
} | null {
  const data = refreshTokens.get(refreshToken);

  if (!data || data.expiresAt < Date.now()) {
    return null;
  }

  // Generate new tokens
  const newAccessToken = generateAccessToken({
    userId: data.userId,
    organizationId: data.organizationId,
    scope: data.scope,
  });

  // Optionally rotate refresh token
  refreshTokens.delete(refreshToken);
  const newRefreshToken = generateRefreshToken({
    userId: data.userId,
    organizationId: data.organizationId,
    scope: data.scope,
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    expiresIn: OAUTH_CONFIG.accessTokenTtlSeconds,
    scope: data.scope,
  };
}

// ============================================================================
// CLIENT VALIDATION
// ============================================================================

/**
 * Validate OAuth client and redirect URI
 */
export function validateClient(
  clientId: string,
  redirectUri: string
): { valid: boolean; error?: string } {
  const client = OAUTH_CONFIG.allowedClients[clientId as keyof typeof OAUTH_CONFIG.allowedClients];

  if (!client) {
    return { valid: false, error: 'invalid_client' };
  }

  if (!client.redirectUris.includes(redirectUri)) {
    return { valid: false, error: 'invalid_redirect_uri' };
  }

  return { valid: true };
}

/**
 * Validate requested scopes
 */
export function validateScopes(requestedScopes: string, clientId: string): string[] {
  const client = OAUTH_CONFIG.allowedClients[clientId as keyof typeof OAUTH_CONFIG.allowedClients];
  if (!client) return [];

  const requested = requestedScopes.split(' ').filter(Boolean);
  const allowed = requested.filter(scope => client.scopes.includes(scope));

  // Default to 'mcp' if no valid scopes
  return allowed.length > 0 ? allowed : ['mcp'];
}
