/**
 * HTTP Request Node Handler
 *
 * Makes HTTP requests to external APIs. Supports all common HTTP methods,
 * custom headers, query parameters, request body, and authentication.
 *
 * Config:
 *   - url: The URL to request (supports template variables)
 *   - method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'
 *   - headers: Object of header key-value pairs
 *   - queryParams: Object of query parameter key-value pairs
 *   - body: Request body (for POST, PUT, PATCH)
 *   - bodyType: 'json' | 'form' | 'text' | 'binary'
 *   - auth: Authentication configuration
 *     - type: 'none' | 'basic' | 'bearer' | 'api_key'
 *     - credentials: Based on auth type
 *   - timeout: Request timeout in ms (default 30000)
 *   - followRedirects: Whether to follow redirects (default true)
 *   - validateStatus: Array of valid status codes or 'all'
 *
 * Output:
 *   - status: HTTP status code
 *   - statusText: HTTP status text
 *   - headers: Response headers
 *   - data: Response body (parsed as JSON if possible)
 *   - ok: Boolean indicating if request was successful (2xx)
 */

import { registerHandler } from './registry';
import {
  ExtendedNodeContext,
  NodeHandler,
  HandlerMetadata,
  successResult,
  failureResult,
  NodeErrorCodes,
} from './types';

const metadata: HandlerMetadata = {
  type: 'http-request',
  name: 'HTTP Request',
  description: 'Makes HTTP requests to external APIs',
  version: '1.0.0',
};

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
type BodyType = 'json' | 'form' | 'text' | 'binary' | 'none';
type AuthType = 'none' | 'basic' | 'bearer' | 'api_key';

interface AuthConfig {
  type: AuthType;
  username?: string;
  password?: string;
  token?: string;
  apiKey?: string;
  apiKeyHeader?: string;
}

/**
 * Build URL with query parameters
 */
function buildUrl(baseUrl: string, queryParams?: Record<string, unknown>): string {
  if (!queryParams || Object.keys(queryParams).length === 0) {
    return baseUrl;
  }

  const url = new URL(baseUrl);
  for (const [key, value] of Object.entries(queryParams)) {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, String(value));
    }
  }
  return url.toString();
}

/**
 * Build request headers with authentication
 */
function buildHeaders(
  headers: Record<string, string> = {},
  auth?: AuthConfig,
  bodyType?: BodyType
): Record<string, string> {
  const result: Record<string, string> = { ...headers };

  // Set content-type based on body type
  if (bodyType === 'json' && !result['Content-Type']) {
    result['Content-Type'] = 'application/json';
  } else if (bodyType === 'form' && !result['Content-Type']) {
    result['Content-Type'] = 'application/x-www-form-urlencoded';
  }

  // Add authentication
  if (auth) {
    switch (auth.type) {
      case 'basic':
        if (auth.username && auth.password) {
          const credentials = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
          result['Authorization'] = `Basic ${credentials}`;
        }
        break;

      case 'bearer':
        if (auth.token) {
          result['Authorization'] = `Bearer ${auth.token}`;
        }
        break;

      case 'api_key':
        if (auth.apiKey) {
          const headerName = auth.apiKeyHeader || 'X-API-Key';
          result[headerName] = auth.apiKey;
        }
        break;
    }
  }

  return result;
}

/**
 * Prepare request body
 */
function prepareBody(body: unknown, bodyType: BodyType): string | undefined {
  if (bodyType === 'none' || body === undefined || body === null) {
    return undefined;
  }

  switch (bodyType) {
    case 'json':
      return typeof body === 'string' ? body : JSON.stringify(body);

    case 'form':
      if (typeof body === 'object' && body !== null) {
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(body)) {
          if (value !== undefined && value !== null) {
            params.append(key, String(value));
          }
        }
        return params.toString();
      }
      return String(body);

    case 'text':
      return String(body);

    case 'binary':
      return String(body);

    default:
      return typeof body === 'string' ? body : JSON.stringify(body);
  }
}

/**
 * Parse response body
 */
async function parseResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') || '';

  try {
    if (contentType.includes('application/json')) {
      return await response.json();
    } else if (contentType.includes('text/')) {
      return await response.text();
    } else {
      // Try JSON first, fall back to text
      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    }
  } catch {
    return null;
  }
}

/**
 * Convert Headers to plain object
 */
function headersToObject(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

const handler: NodeHandler = async (context: ExtendedNodeContext) => {
  const startTime = Date.now();

  await context.log('info', 'Making HTTP request', {
    nodeId: context.nodeId,
  });

  const { resolvedConfig } = context;

  // Extract configuration
  const url = resolvedConfig.url as string | undefined;
  const method = (resolvedConfig.method as HttpMethod) || 'GET';
  const headers = (resolvedConfig.headers as Record<string, string>) || {};
  const queryParams = resolvedConfig.queryParams as Record<string, unknown> | undefined;
  const body = resolvedConfig.body;
  const bodyType = (resolvedConfig.bodyType as BodyType) || 'json';
  const auth = resolvedConfig.auth as AuthConfig | undefined;
  const timeout = (resolvedConfig.timeout as number) || 30000;
  const followRedirects = resolvedConfig.followRedirects !== false;
  const validateStatus = resolvedConfig.validateStatus as number[] | 'all' | undefined;

  // Validate URL
  if (!url) {
    await context.log('error', 'URL is required');
    return failureResult(
      NodeErrorCodes.MISSING_CONFIG,
      'URL is required for HTTP request',
      false
    );
  }

  // Validate URL format
  let finalUrl: string;
  try {
    finalUrl = buildUrl(url, queryParams);
    new URL(finalUrl); // Validate URL format
  } catch (error) {
    await context.log('error', 'Invalid URL format', { url });
    return failureResult(
      NodeErrorCodes.INVALID_CONFIG,
      `Invalid URL format: ${url}`,
      false
    );
  }

  await context.log('info', `${method} ${finalUrl}`, {
    hasBody: body !== undefined,
    hasAuth: auth?.type !== 'none' && auth?.type !== undefined,
  });

  try {
    // Build request options
    const requestHeaders = buildHeaders(headers, auth, bodyType);
    const requestBody = ['POST', 'PUT', 'PATCH'].includes(method)
      ? prepareBody(body, bodyType)
      : undefined;

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(finalUrl, {
        method,
        headers: requestHeaders,
        body: requestBody,
        redirect: followRedirects ? 'follow' : 'manual',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Parse response
      const responseData = await parseResponse(response);
      const responseHeaders = headersToObject(response.headers);

      // Check status validation
      const isValidStatus =
        validateStatus === 'all' ||
        validateStatus === undefined ||
        (Array.isArray(validateStatus) && validateStatus.includes(response.status)) ||
        (response.status >= 200 && response.status < 300);

      await context.log(
        isValidStatus ? 'info' : 'warn',
        `Response: ${response.status} ${response.statusText}`,
        {
          status: response.status,
          contentType: responseHeaders['content-type'],
        }
      );

      const outputData = {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        data: responseData,
        ok: response.ok,
        url: response.url,
      };

      if (!isValidStatus) {
        return failureResult(
          NodeErrorCodes.OPERATION_FAILED,
          `HTTP request failed with status ${response.status}: ${response.statusText}`,
          response.status >= 500 // Server errors are retryable
        );
      }

      return successResult(outputData, {
        durationMs: Date.now() - startTime,
        bytesProcessed: JSON.stringify(responseData).length,
      });
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Check for specific error types
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        await context.log('error', `Request timeout after ${timeout}ms`);
        return failureResult(
          NodeErrorCodes.TIMEOUT,
          `HTTP request timeout after ${timeout}ms`,
          true // Timeouts are retryable
        );
      }

      if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ENOTFOUND')) {
        await context.log('error', 'Connection failed', { error: errorMessage });
        return failureResult(
          NodeErrorCodes.CONNECTION_FAILED,
          `Failed to connect: ${errorMessage}`,
          true // Connection errors are retryable
        );
      }
    }

    await context.log('error', 'HTTP request failed', { error: errorMessage });
    return failureResult(
      NodeErrorCodes.OPERATION_FAILED,
      `HTTP request failed: ${errorMessage}`,
      true // Most HTTP errors are retryable
    );
  }
};

// Register the handler
registerHandler(metadata, handler);

export { handler, metadata };
