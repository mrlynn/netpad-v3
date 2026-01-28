/**
 * Root endpoint - Health check and service info
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    status: 'ok',
    service: 'netpad-chatgpt',
    version: '1.0.1',
    deployedAt: '2026-01-27T20:15:00Z',
    description: 'NetPad ChatGPT App - Build forms, workflows, and applications from ChatGPT conversations',
    timestamp: new Date().toISOString(),
    endpoints: {
      mcp: '/mcp',
      health: '/',
      verification: '/.well-known/openai-apps-challenge',
    },
  });
}
