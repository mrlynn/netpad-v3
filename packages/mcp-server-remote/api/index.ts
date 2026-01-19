import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    name: '@netpad/mcp-server-remote',
    version: '1.0.0',
    description: 'NetPad MCP Server - Remote API for Claude Custom Connectors',
    endpoints: {
      mcp: '/mcp',
      health: '/health',
    },
    documentation: 'https://github.com/mrlynn/netpad-v3/tree/main/packages/mcp-server-remote',
  });
}
