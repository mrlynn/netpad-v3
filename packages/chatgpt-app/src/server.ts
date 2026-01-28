/**
 * NetPad ChatGPT App - MCP Server
 *
 * An MCP server that enables ChatGPT to interact with NetPad for building
 * forms, workflows, and applications through natural conversation.
 *
 * Based on OpenAI's official Apps SDK example using StreamableHTTPServerTransport.
 *
 * Usage:
 *   # Development (with ngrok)
 *   npm run dev
 *   ngrok http 2091
 *
 *   # Production
 *   npm start
 */

import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { registerTools } from './tools/index.js';
import { registerResources } from './resources/widgets.js';

// =============================================================================
// Configuration
// =============================================================================

const PORT = parseInt(process.env.PORT || '2091', 10);
const MCP_PATH = '/mcp';

// =============================================================================
// MCP Server Factory
// =============================================================================

/**
 * Create a new MCP server instance with all tools and resources registered.
 */
function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'netpad-chatgpt',
    version: '1.0.0',
  });

  // Register all tools
  registerTools(server);

  // Register UI resources (widgets)
  registerResources(server);

  return server;
}

// =============================================================================
// HTTP Server (matches OpenAI's official example pattern)
// =============================================================================

const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  if (!req.url) {
    res.writeHead(400).end('Missing URL');
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
  const method = req.method ?? 'GET';

  console.log(`[${new Date().toISOString()}] ${method} ${url.pathname}`);

  // CORS preflight for /mcp
  if (method === 'OPTIONS' && url.pathname === MCP_PATH) {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'content-type, mcp-session-id',
      'Access-Control-Expose-Headers': 'Mcp-Session-Id',
    });
    res.end();
    return;
  }

  // OpenAI Apps domain verification challenge
  // Token from: https://platform.openai.com/apps
  const OPENAI_VERIFICATION_TOKEN = process.env.OPENAI_VERIFICATION_TOKEN || '';
  if (method === 'GET' && url.pathname === '/.well-known/openai-apps-challenge') {
    if (!OPENAI_VERIFICATION_TOKEN) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Verification token not configured');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(OPENAI_VERIFICATION_TOKEN);
    return;
  }

  // Health check
  if (method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      service: 'netpad-chatgpt',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    }));
    return;
  }

  // MCP endpoint - handles POST, GET (SSE), and DELETE
  const MCP_METHODS = new Set(['POST', 'GET', 'DELETE']);
  if (url.pathname === MCP_PATH && MCP_METHODS.has(method)) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id');

    // Create fresh server and transport for each request
    const server = createMcpServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    // Clean up on connection close
    res.on('close', () => {
      console.log('[MCP] Connection closed');
      transport.close();
      server.close();
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res);
    } catch (error) {
      console.error('[MCP] Error handling request:', error);
      if (!res.headersSent) {
        res.writeHead(500).end('Internal server error');
      }
    }
    return;
  }

  // 404 for everything else
  res.writeHead(404).end('Not Found');
});

// =============================================================================
// Server Startup
// =============================================================================

httpServer.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                   NetPad ChatGPT App Server                    ║
╠════════════════════════════════════════════════════════════════╣
║  MCP Endpoint:  http://localhost:${PORT}/mcp                       ║
║  Health Check:  http://localhost:${PORT}/health                    ║
╠════════════════════════════════════════════════════════════════╣
║  To connect from ChatGPT:                                      ║
║  1. Run: ngrok http ${PORT}                                       ║
║  2. Copy the https URL                                         ║
║  3. Add connector in ChatGPT Settings → Connectors             ║
║  4. Enter URL: https://xxx.ngrok.app/mcp                       ║
╚════════════════════════════════════════════════════════════════╝
`);
});

export { httpServer, createMcpServer };
