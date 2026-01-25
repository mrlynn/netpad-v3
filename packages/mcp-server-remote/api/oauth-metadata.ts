/**
 * OAuth 2.0 Authorization Server Metadata
 *
 * GET /.well-known/oauth-authorization-server
 *
 * This endpoint returns metadata about the OAuth server according to RFC 8414.
 * Claude.ai and other OAuth clients can use this to discover endpoints.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { OAUTH_CONFIG } from './lib/oauth.js';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const issuer = OAUTH_CONFIG.issuer;

  // OAuth 2.0 Authorization Server Metadata (RFC 8414)
  const metadata = {
    // REQUIRED: Issuer identifier
    issuer: issuer,

    // REQUIRED: Authorization endpoint
    authorization_endpoint: `${issuer}/authorize`,

    // REQUIRED: Token endpoint
    token_endpoint: `${issuer}/token`,

    // OPTIONAL: Registration endpoint (not implemented)
    // registration_endpoint: `${issuer}/register`,

    // OPTIONAL: Scopes supported
    scopes_supported: Object.keys(OAUTH_CONFIG.scopes),

    // REQUIRED: Response types supported
    response_types_supported: ['code'],

    // OPTIONAL: Response modes supported
    response_modes_supported: ['query'],

    // OPTIONAL: Grant types supported
    grant_types_supported: ['authorization_code', 'refresh_token'],

    // OPTIONAL: Token endpoint authentication methods
    token_endpoint_auth_methods_supported: ['none'],

    // OPTIONAL: PKCE code challenge methods (RFC 7636)
    code_challenge_methods_supported: ['S256', 'plain'],

    // MCP REQUIRED: Support for Client ID Metadata Documents
    // This allows Claude.ai to use its hosted client metadata
    client_id_metadata_document_supported: true,

    // OPTIONAL: Service documentation
    service_documentation: 'https://docs.netpad.io/docs/developer/mcp-server',

    // OPTIONAL: MCP-specific metadata
    mcp_endpoint: `${issuer}/mcp`,

    // Custom: NetPad-specific info
    netpad: {
      name: 'NetPad MCP Server',
      version: '1.2.0',
      tools_count: '80+',
      api_key_url: 'https://netpad.io/settings',
    },
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
  res.status(200).json(metadata);
}
