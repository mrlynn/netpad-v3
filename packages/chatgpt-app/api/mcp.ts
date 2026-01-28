/**
 * MCP Endpoint for ChatGPT App
 *
 * This handles the Model Context Protocol communication with ChatGPT.
 * Uses WebStandardStreamableHTTPServerTransport directly with Accept header injection.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { registerTools } from '../src/tools/index.js';
import { registerResources } from '../src/resources/widgets.js';

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

/**
 * Convert Vercel request to Web Standard Request with Accept header injection
 */
async function toWebRequest(req: VercelRequest): Promise<Request> {
  const url = new URL(req.url || '/', `https://${req.headers.host || 'localhost'}`);

  // Create new headers with required Accept value
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value) {
      if (Array.isArray(value)) {
        value.forEach(v => headers.append(key, v));
      } else {
        headers.set(key, value);
      }
    }
  }

  // Inject required Accept header for MCP SDK
  const currentAccept = headers.get('accept') || '';
  if (!currentAccept.includes('text/event-stream')) {
    headers.set('accept', 'application/json, text/event-stream');
  }

  // Build the request options
  const init: RequestInit = {
    method: req.method,
    headers,
  };

  // Only add body for methods that support it
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    // For Vercel, body is already parsed as JSON
    if (req.body) {
      init.body = JSON.stringify(req.body);
    }
  }

  return new Request(url.toString(), init);
}

/**
 * Write Web Standard Response to Vercel Response
 */
async function writeResponse(webResponse: Response, res: VercelResponse): Promise<void> {
  // Set status
  res.status(webResponse.status);

  // Copy headers
  webResponse.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  // Handle body
  if (webResponse.body) {
    const reader = webResponse.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    } finally {
      reader.releaseLock();
    }
  }

  res.end();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const method = req.method ?? 'GET';

  // CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type, mcp-session-id, accept');
  res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id');

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  // Convert to Web Standard Request with Accept header injection
  const webRequest = await toWebRequest(req);

  // Create stateless transport for each request (no session management)
  // This works for serverless environments where state can't be maintained
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // Stateless mode
    enableJsonResponse: true,
  });

  const server = createMcpServer();
  await server.connect(transport);

  // Handle GET requests for SSE streams
  if (method === 'GET') {
    const response = await transport.handleRequest(webRequest);
    await writeResponse(response, res);
    return;
  }

  // Handle POST requests
  if (method === 'POST') {
    const response = await transport.handleRequest(webRequest, {
      parsedBody: req.body,
    });
    await writeResponse(response, res);
    return;
  }

  // Handle DELETE requests (session termination - no-op in stateless mode)
  if (method === 'DELETE') {
    res.status(204).end();
    return;
  }

  // Method not allowed
  res.status(405).json({ error: 'Method not allowed' });
}
