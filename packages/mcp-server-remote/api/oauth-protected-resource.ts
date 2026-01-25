/**
 * OAuth 2.0 Protected Resource Metadata
 *
 * GET /.well-known/oauth-protected-resource
 *
 * This endpoint tells Claude.ai where to find the OAuth authorization server.
 * Claude.ai queries this endpoint FIRST before initiating the OAuth flow.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { OAUTH_CONFIG } from './lib/oauth.js';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const issuer = OAUTH_CONFIG.issuer;

  // OAuth 2.0 Protected Resource Metadata (RFC 9728)
  // This tells clients where to find the authorization server
  const metadata = {
    // The resource server (this MCP server)
    resource: issuer,

    // Where to find the authorization server(s)
    authorization_servers: [issuer],

    // Bearer token is the only supported method
    bearer_methods_supported: ['header'],

    // Scopes required to access this resource
    scopes_supported: Object.keys(OAUTH_CONFIG.scopes),
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
  res.status(200).json(metadata);
}
