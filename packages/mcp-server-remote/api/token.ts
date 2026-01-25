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

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
    const authCode = consumeAuthorizationCode(code);

    if (!authCode) {
      res.status(400).json({
        error: 'invalid_grant',
        error_description: 'Authorization code is invalid, expired, or already used',
      });
      return;
    }

    // Validate redirect_uri matches
    if (authCode.redirectUri !== redirect_uri) {
      res.status(400).json({
        error: 'invalid_grant',
        error_description: 'redirect_uri does not match',
      });
      return;
    }

    // Verify PKCE
    const pkceValid = verifyPkceChallenge(
      code_verifier,
      authCode.codeChallenge,
      authCode.codeChallengeMethod
    );

    if (!pkceValid) {
      res.status(400).json({
        error: 'invalid_grant',
        error_description: 'PKCE verification failed',
      });
      return;
    }

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

    // Return token response
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
  res.status(400).json({
    error: 'unsupported_grant_type',
    error_description: 'Only authorization_code and refresh_token grants are supported',
  });
}
