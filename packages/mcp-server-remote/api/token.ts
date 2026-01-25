/**
 * OAuth 2.0 Token Endpoint
 *
 * POST /token - Exchange authorization code for tokens
 *
 * This endpoint:
 * 1. Validates the authorization code
 * 2. Verifies the PKCE code_verifier
 * 3. Issues access_token and refresh_token
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  OAUTH_CONFIG,
  consumeAuthorizationCode,
  verifyPkceChallenge,
  generateAccessToken,
  generateRefreshToken,
  exchangeRefreshToken,
} from './lib/oauth.js';
import { recordMetric, startMetricsContext, getDuration } from './lib/metrics.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const metricsContext = startMetricsContext();

  // Set CORS headers for token endpoint
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');

  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only POST is allowed
  if (req.method !== 'POST') {
    recordMetric({
      method: req.method as 'GET' | 'POST',
      tool: 'oauth/token',
      authMethod: 'none',
      authSuccess: false,
      durationMs: getDuration(metricsContext),
      statusCode: 405,
      errorCode: 'METHOD_NOT_ALLOWED',
    });
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  // Parse body (support both JSON and form-urlencoded)
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      // Try parsing as form-urlencoded
      body = Object.fromEntries(new URLSearchParams(body));
    }
  }

  const { grant_type, code, redirect_uri, code_verifier, refresh_token, client_id } = body;

  console.log('[Token] Request received:', {
    grant_type,
    code: code ? `${code.substring(0, 30)}...` : undefined,
    redirect_uri,
    code_verifier: code_verifier ? `${code_verifier.substring(0, 20)}...` : undefined,
    client_id,
  });

  // ============================================================================
  // Authorization Code Grant
  // ============================================================================
  if (grant_type === 'authorization_code') {
    // Validate required parameters
    if (!code) {
      res.status(400).json({
        error: 'invalid_request',
        error_description: 'code is required',
      });
      return;
    }

    if (!redirect_uri) {
      res.status(400).json({
        error: 'invalid_request',
        error_description: 'redirect_uri is required',
      });
      return;
    }

    if (!code_verifier) {
      res.status(400).json({
        error: 'invalid_request',
        error_description: 'code_verifier is required (PKCE)',
      });
      return;
    }

    // Consume the authorization code (one-time use)
    console.log('[Token] Attempting to consume auth code...');
    const authCode = consumeAuthorizationCode(code);

    if (!authCode) {
      console.log('[Token] Auth code validation failed');
      res.status(400).json({
        error: 'invalid_grant',
        error_description: 'Authorization code is invalid, expired, or already used',
      });
      return;
    }

    console.log('[Token] Auth code valid:', {
      clientId: authCode.clientId,
      userId: authCode.userId,
      scope: authCode.scope,
    });

    // Validate redirect_uri matches
    if (authCode.redirectUri !== redirect_uri) {
      console.log('[Token] redirect_uri mismatch:', {
        expected: authCode.redirectUri,
        received: redirect_uri,
      });
      res.status(400).json({
        error: 'invalid_grant',
        error_description: 'redirect_uri does not match',
      });
      return;
    }

    console.log('[Token] redirect_uri validated OK');

    // Verify PKCE
    console.log('[Token] Verifying PKCE...');
    const pkceValid = verifyPkceChallenge(
      code_verifier,
      authCode.codeChallenge,
      authCode.codeChallengeMethod
    );

    if (!pkceValid) {
      console.log('[Token] PKCE verification failed:', {
        verifier: code_verifier?.substring(0, 20) + '...',
        challenge: authCode.codeChallenge?.substring(0, 20) + '...',
        method: authCode.codeChallengeMethod,
      });
      res.status(400).json({
        error: 'invalid_grant',
        error_description: 'PKCE verification failed',
      });
      return;
    }

    console.log('[Token] PKCE verified OK, generating tokens...');

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: authCode.userId,
      organizationId: authCode.organizationId,
      scope: authCode.scope,
    });

    const refreshToken = generateRefreshToken({
      userId: authCode.userId,
      organizationId: authCode.organizationId,
      scope: authCode.scope,
    });

    // Record successful token exchange
    recordMetric({
      method: 'POST',
      organizationId: authCode.organizationId,
      userId: authCode.userId,
      tool: 'oauth/token/authorization_code',
      authMethod: 'oauth',
      authSuccess: true,
      durationMs: getDuration(metricsContext),
      statusCode: 200,
    });

    // Return token response
    console.log('[Token] SUCCESS - returning tokens');
    res.status(200).json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: OAUTH_CONFIG.accessTokenTtlSeconds,
      refresh_token: refreshToken,
      scope: authCode.scope,
    });
    return;
  }

  // ============================================================================
  // Refresh Token Grant
  // ============================================================================
  if (grant_type === 'refresh_token') {
    if (!refresh_token) {
      res.status(400).json({
        error: 'invalid_request',
        error_description: 'refresh_token is required',
      });
      return;
    }

    const newTokens = exchangeRefreshToken(refresh_token);

    if (!newTokens) {
      res.status(400).json({
        error: 'invalid_grant',
        error_description: 'Refresh token is invalid or expired',
      });
      return;
    }

    // Record successful refresh token exchange
    recordMetric({
      method: 'POST',
      tool: 'oauth/token/refresh',
      authMethod: 'oauth',
      authSuccess: true,
      durationMs: getDuration(metricsContext),
      statusCode: 200,
    });

    res.status(200).json({
      access_token: newTokens.accessToken,
      token_type: 'Bearer',
      expires_in: newTokens.expiresIn,
      refresh_token: newTokens.refreshToken,
      scope: newTokens.scope,
    });
    return;
  }

  // ============================================================================
  // Unsupported Grant Type
  // ============================================================================
  recordMetric({
    method: 'POST',
    tool: 'oauth/token',
    authMethod: 'none',
    authSuccess: false,
    durationMs: getDuration(metricsContext),
    statusCode: 400,
    errorCode: 'UNSUPPORTED_GRANT_TYPE',
  });
  res.status(400).json({
    error: 'unsupported_grant_type',
    error_description: 'Only authorization_code and refresh_token grants are supported',
  });
}
