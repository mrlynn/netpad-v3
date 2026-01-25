/**
 * OAuth 2.0 Authorization Endpoint
 *
 * GET /authorize - Initiates the OAuth flow
 *
 * This endpoint:
 * 1. Validates the OAuth client and redirect URI
 * 2. Redirects to NetPad login if user is not authenticated
 * 3. Shows consent screen (or auto-approves for trusted clients)
 * 4. Redirects back to Claude.ai with an authorization code
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  OAUTH_CONFIG,
  validateClient,
  validateScopes,
  generateAuthorizationCode,
} from './lib/oauth.js';

/**
 * Generate the HTML for the authorization page
 */
function generateAuthorizationPage(params: {
  clientId: string;
  redirectUri: string;
  scope: string;
  state: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  error?: string;
}): string {
  const netpadUrl = OAUTH_CONFIG.netpadApiUrl;
  const scopes = params.scope.split(' ').filter(Boolean);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Authorize NetPad - Claude.ai</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      max-width: 420px;
      width: 100%;
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #00d9a5 0%, #00b894 100%);
      padding: 32px;
      text-align: center;
    }
    .logo {
      width: 200px;
      height: 200px;
      margin: 0 auto 12px;
    }
    .logo img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .header h1 {
      color: white;
      font-size: 24px;
      font-weight: 600;
    }
    .header p {
      color: rgba(255, 255, 255, 0.9);
      margin-top: 8px;
      font-size: 14px;
    }
    .content {
      padding: 32px;
    }
    .app-info {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 12px;
      margin-bottom: 24px;
    }
    .app-icon {
      width: 48px;
      height: 48px;
      background: #5436da;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 18px;
    }
    .app-details h3 {
      font-size: 16px;
      color: #333;
    }
    .app-details p {
      font-size: 13px;
      color: #666;
      margin-top: 2px;
    }f
    .permissions {
      margin-bottom: 24px;
    }
    .permissions h4 {
      font-size: 14px;
      color: #333;
      margin-bottom: 12px;
    }
    .permission-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
      margin-bottom: 8px;
    }
    .permission-icon {
      width: 32px;
      height: 32px;
      background: #e8f5e9;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #4caf50;
    }
    .permission-text {
      font-size: 14px;
      color: #333;
    }
    .error-message {
      background: #ffebee;
      color: #c62828;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 16px;
      font-size: 14px;
    }
    .form-group {
      margin-bottom: 16px;
    }
    .form-group label {
      display: block;
      font-size: 14px;
      color: #333;
      margin-bottom: 8px;
      font-weight: 500;
    }
    .form-group input {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 16px;
      transition: border-color 0.2s;
    }
    .form-group input:focus {
      outline: none;
      border-color: #00b894;
    }
    .buttons {
      display: flex;
      gap: 12px;
      margin-top: 24px;
    }
    .btn {
      flex: 1;
      padding: 14px 24px;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-primary {
      background: #00b894;
      color: white;
    }
    .btn-primary:hover {
      background: #00a383;
    }
    .btn-secondary {
      background: #f5f5f5;
      color: #666;
    }
    .btn-secondary:hover {
      background: #e0e0e0;
    }
    .footer {
      text-align: center;
      padding: 16px 32px 32px;
      font-size: 12px;
      color: #999;
    }
    .footer a {
      color: #00b894;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">
        <img src="${netpadUrl}/micro-mark-black-trans.png" alt="NetPad" onerror="this.parentElement.innerHTML='NP'">
      </div>
      <h1>Connect to NetPad</h1>
      <p>Authorize Claude.ai to access your NetPad workspace</p>
    </div>
    <div class="content">
      ${params.error ? `<div class="error-message">${params.error}</div>` : ''}

      <div class="app-info">
        <div class="app-icon">C</div>
        <div class="app-details">
          <h3>Claude.ai</h3>
          <p>wants to access your NetPad account</p>
        </div>
      </div>

      <div class="permissions">
        <h4>This will allow Claude.ai to:</h4>
        ${scopes.map(scope => {
          const descriptions: Record<string, string> = {
            'claudeai': 'Connect via Claude.ai interface',
            'mcp': 'Use NetPad MCP tools (80+ tools)',
            'read': 'View your forms, workflows, and data',
            'write': 'Create and modify forms and workflows',
          };
          return `
            <div class="permission-item">
              <div class="permission-icon">&#10003;</div>
              <span class="permission-text">${descriptions[scope] || scope}</span>
            </div>
          `;
        }).join('')}
      </div>

      <form method="POST" action="/api/authorize">
        <input type="hidden" name="client_id" value="${params.clientId}">
        <input type="hidden" name="redirect_uri" value="${params.redirectUri}">
        <input type="hidden" name="scope" value="${params.scope}">
        <input type="hidden" name="state" value="${params.state}">
        <input type="hidden" name="code_challenge" value="${params.codeChallenge}">
        <input type="hidden" name="code_challenge_method" value="${params.codeChallengeMethod}">

        <div class="form-group">
          <label for="api_key">Your NetPad API Key</label>
          <input
            type="password"
            id="api_key"
            name="api_key"
            placeholder="np_live_xxxxx or np_test_xxxxx"
            required
            autocomplete="off"
          >
        </div>

        <p style="font-size: 13px; color: #666; margin-bottom: 16px;">
          Don't have an API key? <a href="${netpadUrl}/settings" target="_blank" style="color: #00b894;">Create one in NetPad Settings</a>
        </p>

        <div class="buttons">
          <button type="button" class="btn btn-secondary" onclick="handleDeny()">Deny</button>
          <button type="submit" class="btn btn-primary">Authorize</button>
        </div>
      </form>
    </div>
    <div class="footer">
      By authorizing, you agree to NetPad's <a href="${netpadUrl}/terms">Terms of Service</a>
      and <a href="${netpadUrl}/privacy">Privacy Policy</a>.
    </div>
  </div>

  <script>
    function handleDeny() {
      const redirectUri = new URL('${params.redirectUri}');
      redirectUri.searchParams.set('error', 'access_denied');
      redirectUri.searchParams.set('error_description', 'User denied the authorization request');
      ${params.state ? `redirectUri.searchParams.set('state', '${params.state}');` : ''}
      window.location.href = redirectUri.toString();
    }
  </script>
</body>
</html>`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle both GET (show form) and POST (process authorization)

  if (req.method === 'GET') {
    // ========================================================================
    // GET /authorize - Show authorization page
    // ========================================================================

    const {
      response_type,
      client_id,
      redirect_uri,
      code_challenge,
      code_challenge_method,
      state,
      scope,
    } = req.query;

    // Validate required parameters
    if (response_type !== 'code') {
      res.status(400).json({
        error: 'unsupported_response_type',
        error_description: 'Only "code" response_type is supported',
      });
      return;
    }

    if (!client_id || typeof client_id !== 'string') {
      res.status(400).json({
        error: 'invalid_request',
        error_description: 'client_id is required',
      });
      return;
    }

    if (!redirect_uri || typeof redirect_uri !== 'string') {
      res.status(400).json({
        error: 'invalid_request',
        error_description: 'redirect_uri is required',
      });
      return;
    }

    // Validate client and redirect URI
    const clientValidation = validateClient(client_id, redirect_uri);
    if (!clientValidation.valid) {
      res.status(400).json({
        error: clientValidation.error,
        error_description: 'Invalid client_id or redirect_uri',
      });
      return;
    }

    // PKCE is required
    if (!code_challenge || typeof code_challenge !== 'string') {
      res.status(400).json({
        error: 'invalid_request',
        error_description: 'code_challenge is required (PKCE)',
      });
      return;
    }

    const challengeMethod = (code_challenge_method as string) || 'S256';
    if (challengeMethod !== 'S256' && challengeMethod !== 'plain') {
      res.status(400).json({
        error: 'invalid_request',
        error_description: 'code_challenge_method must be S256 or plain',
      });
      return;
    }

    // Generate and serve the authorization page
    const html = generateAuthorizationPage({
      clientId: client_id,
      redirectUri: redirect_uri,
      scope: (scope as string) || 'mcp',
      state: (state as string) || '',
      codeChallenge: code_challenge,
      codeChallengeMethod: challengeMethod,
    });

    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
    return;
  }

  if (req.method === 'POST') {
    // ========================================================================
    // POST /authorize - Process authorization (user submitted the form)
    // ========================================================================

    const {
      client_id,
      redirect_uri,
      scope,
      state,
      code_challenge,
      code_challenge_method,
      api_key,
    } = req.body;

    // Validate the API key against NetPad
    if (!api_key || typeof api_key !== 'string') {
      const html = generateAuthorizationPage({
        clientId: client_id,
        redirectUri: redirect_uri,
        scope: scope || 'mcp',
        state: state || '',
        codeChallenge: code_challenge,
        codeChallengeMethod: code_challenge_method || 'S256',
        error: 'Please enter your NetPad API key',
      });
      res.setHeader('Content-Type', 'text/html');
      res.status(400).send(html);
      return;
    }

    // Validate API key format
    if (!api_key.startsWith('np_live_') && !api_key.startsWith('np_test_')) {
      const html = generateAuthorizationPage({
        clientId: client_id,
        redirectUri: redirect_uri,
        scope: scope || 'mcp',
        state: state || '',
        codeChallenge: code_challenge,
        codeChallengeMethod: code_challenge_method || 'S256',
        error: 'Invalid API key format. Keys should start with np_live_ or np_test_',
      });
      res.setHeader('Content-Type', 'text/html');
      res.status(400).send(html);
      return;
    }

    // Validate the API key against NetPad API
    try {
      const netpadUrl = OAUTH_CONFIG.netpadApiUrl;
      console.log(`[OAuth] Validating API key against ${netpadUrl}/api/v1/auth/validate`);
      console.log(`[OAuth] Key prefix: ${api_key.substring(0, 16)}...`);

      const response = await fetch(`${netpadUrl}/api/v1/auth/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${api_key}`,
        },
        body: JSON.stringify({ source: 'mcp-server-remote-oauth' }),
      });

      console.log(`[OAuth] Validation response status: ${response.status}`);

      if (!response.ok) {
        const errorBody = await response.text();
        console.log(`[OAuth] Validation error response: ${errorBody}`);

        let errorMessage = 'Invalid or expired API key. Please check your key and try again.';
        try {
          const errorJson = JSON.parse(errorBody);
          if (errorJson.error?.message) {
            errorMessage = errorJson.error.message;
          }
        } catch {
          // Keep default error message
        }

        const html = generateAuthorizationPage({
          clientId: client_id,
          redirectUri: redirect_uri,
          scope: scope || 'mcp',
          state: state || '',
          codeChallenge: code_challenge,
          codeChallengeMethod: code_challenge_method || 'S256',
          error: errorMessage,
        });
        res.setHeader('Content-Type', 'text/html');
        res.status(400).send(html);
        return;
      }

      const userData = await response.json();
      const userId = userData.userId || userData.user?.id || 'unknown';
      const organizationId = userData.organizationId || userData.organization?.id || 'unknown';

      // Validate scopes
      const validatedScopes = validateScopes(scope || 'mcp', client_id);

      // Generate authorization code
      const authCode = generateAuthorizationCode({
        clientId: client_id,
        redirectUri: redirect_uri,
        scope: validatedScopes.join(' '),
        codeChallenge: code_challenge,
        codeChallengeMethod: code_challenge_method || 'S256',
        userId,
        organizationId,
      });

      // Build redirect URL with authorization code
      const redirectUrl = new URL(redirect_uri);
      redirectUrl.searchParams.set('code', authCode);
      if (state) {
        redirectUrl.searchParams.set('state', state);
      }

      // Redirect back to Claude.ai
      res.redirect(302, redirectUrl.toString());
      return;
    } catch (error) {
      console.error('Error validating API key:', error);

      const html = generateAuthorizationPage({
        clientId: client_id,
        redirectUri: redirect_uri,
        scope: scope || 'mcp',
        state: state || '',
        codeChallenge: code_challenge,
        codeChallengeMethod: code_challenge_method || 'S256',
        error: 'Unable to validate API key. Please try again.',
      });
      res.setHeader('Content-Type', 'text/html');
      res.status(500).send(html);
      return;
    }
  }

  // Method not allowed
  res.status(405).json({ error: 'Method not allowed' });
}
