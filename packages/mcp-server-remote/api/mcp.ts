import type { VercelRequest, VercelResponse } from '@vercel/node';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { IncomingMessage, ServerResponse } from 'node:http';
import { createNetPadMcpServer } from '@netpad/mcp-server';
import { validateAccessToken } from './lib/oauth.js';
import {
  recordMetric,
  startMetricsContext,
  getDuration,
  extractToolFromBody,
  flushMetrics,
} from './lib/metrics.js';

// Store transports by session ID for reconnection
const transports = new Map<string, StreamableHTTPServerTransport>();

// ============================================================================
// AUTHENTICATION (Supports both OAuth tokens and API keys)
// ============================================================================

// Cache validated API keys for 5 minutes to reduce API calls
const apiKeyCache = new Map<string, { valid: boolean; organizationId?: string; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get the NetPad API base URL from environment or default
 * Note: Using www.netpad.io because netpad.io redirects to www with 307
 */
function getNetPadApiUrl(): string {
  return process.env.NETPAD_API_URL || 'https://www.netpad.io';
}

/**
 * Authentication result
 */
interface AuthResult {
  valid: boolean;
  userId?: string;
  organizationId?: string;
  scope?: string;
  error?: {
    status: number;
    error: string;
    code: string;
  };
}

/**
 * Validate the request using either OAuth token or API key
 *
 * Supports:
 * 1. OAuth access tokens (JWT-like tokens from /token endpoint)
 * 2. NetPad API keys (np_live_xxx or np_test_xxx)
 */
async function validateRequest(req: VercelRequest): Promise<AuthResult> {
  const authHeader = req.headers['authorization'];

  // Check if Authorization header is present
  if (!authHeader) {
    return {
      valid: false,
      error: {
        status: 401,
        error: 'Missing Authorization header. Use: Authorization: Bearer <token>',
        code: 'MISSING_AUTH',
      },
    };
  }

  // Check if it's a Bearer token
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return {
      valid: false,
      error: {
        status: 401,
        error: 'Invalid Authorization header format. Use: Authorization: Bearer <token>',
        code: 'INVALID_AUTH_FORMAT',
      },
    };
  }

  const token = parts[1].trim();

  if (!token) {
    return {
      valid: false,
      error: {
        status: 401,
        error: 'Token is empty',
        code: 'EMPTY_TOKEN',
      },
    };
  }

  // ============================================================================
  // Try OAuth token first (JWT-like format with dots)
  // ============================================================================
  if (token.includes('.')) {
    console.log('[MCP] Attempting OAuth token validation...');
    const payload = validateAccessToken(token);
    if (payload) {
      console.log('[MCP] OAuth token valid:', { userId: payload.sub, org: payload.org });
      return {
        valid: true,
        userId: payload.sub,
        organizationId: payload.org,
        scope: payload.scope,
      };
    }
    // If it looks like a JWT but failed validation, return error
    // (don't fall through to API key validation)
    console.log('[MCP] OAuth token validation failed');
    return {
      valid: false,
      error: {
        status: 401,
        error: 'Invalid or expired OAuth token',
        code: 'INVALID_OAUTH_TOKEN',
      },
    };
  }

  // ============================================================================
  // Try API key (np_live_xxx or np_test_xxx format)
  // ============================================================================
  if (token.startsWith('np_live_') || token.startsWith('np_test_')) {
    return validateApiKey(token);
  }

  // Unknown token format
  return {
    valid: false,
    error: {
      status: 401,
      error: 'Invalid token format. Use an OAuth token or NetPad API key (np_live_xxx)',
      code: 'INVALID_TOKEN_FORMAT',
    },
  };
}

/**
 * Validate a NetPad API key
 */
async function validateApiKey(apiKey: string): Promise<AuthResult> {
  // Check cache first
  const cached = apiKeyCache.get(apiKey);
  if (cached && cached.expiresAt > Date.now()) {
    if (cached.valid) {
      return {
        valid: true,
        organizationId: cached.organizationId,
      };
    }
    return {
      valid: false,
      error: {
        status: 401,
        error: 'Invalid or expired API key',
        code: 'INVALID_API_KEY',
      },
    };
  }

  // Validate against NetPad API
  try {
    const netpadUrl = getNetPadApiUrl();
    const response = await fetch(`${netpadUrl}/api/v1/auth/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ source: 'mcp-server-remote' }),
    });

    if (response.ok) {
      const data = await response.json() as { userId?: string; organizationId?: string };
      // Cache the valid result
      apiKeyCache.set(apiKey, {
        valid: true,
        organizationId: data.organizationId,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
      return {
        valid: true,
        userId: data.userId,
        organizationId: data.organizationId,
      };
    }

    // Key is invalid - cache the negative result too (shorter TTL)
    apiKeyCache.set(apiKey, {
      valid: false,
      expiresAt: Date.now() + 60 * 1000, // Cache invalid keys for 1 minute
    });

    // Parse error response
    const errorData = await response.json().catch(() => ({})) as { error?: { message?: string; code?: string } };
    return {
      valid: false,
      error: {
        status: response.status,
        error: errorData.error?.message || 'Invalid or expired API key',
        code: errorData.error?.code || 'INVALID_API_KEY',
      },
    };
  } catch (error) {
    console.error('Error validating API key against NetPad:', error);

    // On network error, fall back to format validation only
    // This allows the MCP server to work even if NetPad API is temporarily unavailable
    // but only accepts properly formatted keys
    console.warn('NetPad API unavailable, accepting key based on format validation only');
    return { valid: true };
  }
}

// Main handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const metricsContext = startMetricsContext();

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // ============================================================================
  // AUTHENTICATE REQUEST
  // ============================================================================
  const authResult = await validateRequest(req);
  if (!authResult.valid) {
    // Record failed auth metric
    recordMetric({
      method: req.method as 'GET' | 'POST',
      authMethod: 'none',
      authSuccess: false,
      durationMs: getDuration(metricsContext),
      statusCode: authResult.error?.status || 401,
      errorCode: authResult.error?.code,
    });

    // Flush metrics (serverless: memory is ephemeral)
    flushMetrics().catch(() => {});

    // Per MCP spec and RFC 9728, include WWW-Authenticate header with resource_metadata
    // This tells OAuth clients where to find the authorization server
    const resourceMetadataUrl = 'https://mcp.netpad.io/.well-known/oauth-protected-resource';
    res.setHeader(
      'WWW-Authenticate',
      `Bearer resource_metadata="${resourceMetadataUrl}", scope="mcp read write"`
    );
    res.status(authResult.error?.status || 401).json({
      error: authResult.error?.error || 'Authentication failed',
      code: authResult.error?.code || 'AUTH_FAILED',
      hint: 'Connect via Claude.ai Settings > Connectors, or use an API key from netpad.io/settings',
    });
    return;
  }

  // Determine auth method for metrics
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.split(' ')[1] || '';
  const authMethod: 'oauth' | 'api_key' = token.includes('.') ? 'oauth' : 'api_key';

  // Get session ID from headers
  const sessionId = req.headers['mcp-session-id'] as string | undefined;

  // Handle GET requests for SSE streams
  if (req.method === 'GET') {
    // For initialization or reconnection
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
    });

    // Create the full NetPad MCP server with all 80+ tools
    const server = createNetPadMcpServer({
      name: '@netpad/mcp-server-remote',
      version: '1.2.0',
    });
    await server.connect(transport);

    // Store transport for future requests
    if (transport.sessionId) {
      transports.set(transport.sessionId, transport);
    }

    // Record successful SSE connection metric
    recordMetric({
      method: 'GET',
      organizationId: authResult.organizationId,
      userId: authResult.userId,
      authMethod,
      authSuccess: true,
      durationMs: getDuration(metricsContext),
      statusCode: 200,
      sessionId: transport.sessionId,
    });

    // Flush metrics (serverless: memory is ephemeral)
    flushMetrics().catch(() => {});

    await transport.handleRequest(
      req as unknown as IncomingMessage,
      res as unknown as ServerResponse
    );
    return;
  }

  // Handle POST requests
  if (req.method === 'POST') {
    // Extract tool name from request body for metrics
    const tool = extractToolFromBody(req.body);

    // Try to reuse existing transport for this session
    let transport = sessionId ? transports.get(sessionId) : undefined;

    if (!transport) {
      // Create new transport for this request
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID(),
      });

      // Create the full NetPad MCP server with all 80+ tools
      const server = createNetPadMcpServer({
        name: '@netpad/mcp-server-remote',
        version: '1.2.0',
      });
      await server.connect(transport);

      if (transport.sessionId) {
        transports.set(transport.sessionId, transport);
      }
    }

    await transport.handleRequest(
      req as unknown as IncomingMessage,
      res as unknown as ServerResponse,
      req.body
    );

    // Record POST request metric
    recordMetric({
      method: 'POST',
      organizationId: authResult.organizationId,
      userId: authResult.userId,
      tool,
      authMethod,
      authSuccess: true,
      durationMs: getDuration(metricsContext),
      statusCode: 200,
      sessionId: sessionId || transport.sessionId,
    });

    // Opportunistically flush metrics (non-blocking)
    flushMetrics().catch(() => {});
    return;
  }

  // Method not allowed
  recordMetric({
    method: req.method as 'GET' | 'POST',
    authMethod,
    authSuccess: true,
    durationMs: getDuration(metricsContext),
    statusCode: 405,
    errorCode: 'METHOD_NOT_ALLOWED',
  });
  flushMetrics().catch(() => {});
  res.status(405).json({ error: 'Method not allowed' });
}
