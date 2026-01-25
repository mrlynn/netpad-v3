import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const baseUrl = process.env.OAUTH_ISSUER || 'https://mcp.netpad.io';

  res.status(200).json({
    name: '@netpad/mcp-server-remote',
    version: '1.2.0',
    description: 'NetPad MCP Server - Remote API for Claude Custom Connectors. Includes all 80+ tools from @netpad/mcp-server.',
    endpoints: {
      mcp: '/mcp',
      health: '/health',
      authorize: '/authorize',
      token: '/token',
      oauth_metadata: '/.well-known/oauth-authorization-server',
    },
    features: {
      tools: '80+ tools',
      categories: [
        'Form Building (6 tools)',
        'Application Management (7 tools)',
        'Marketplace & npm (8 tools)',
        'Workflow Automation (10 tools)',
        'Conversational & Search Forms (11 tools)',
        'Enhanced Templates (5 tools)',
        'Data Browser (12 tools)',
        'Extension Development (5 tools)',
        'Consolidated Reference Tools',
        'Legacy Reference & Helper (16 tools)',
      ],
    },
    authentication: {
      methods: ['oauth2', 'api_key'],
      oauth2: {
        type: 'OAuth 2.0 + PKCE',
        authorization_endpoint: `${baseUrl}/authorize`,
        token_endpoint: `${baseUrl}/token`,
        metadata_endpoint: `${baseUrl}/.well-known/oauth-authorization-server`,
      },
      api_key: {
        type: 'Bearer token',
        format: 'Authorization: Bearer np_live_xxx',
        generateAt: 'https://netpad.io/settings',
      },
    },
    claude_ai_setup: {
      instructions: [
        '1. Go to Claude.ai Settings > Connectors',
        '2. Click "Add custom connector"',
        `3. Enter URL: ${baseUrl}/mcp`,
        '4. Click "Connect" to authorize with your NetPad account',
        '5. Enable the connector in your conversations',
      ],
    },
    documentation: 'https://docs.netpad.io/docs/developer/mcp-server',
  });
}
