/**
 * API Authentication Middleware
 *
 * Middleware for authenticating and authorizing public API requests.
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import {
  validateAPIKey,
  hasPermission,
  canAccessForm,
  isIPAllowed,
  checkRateLimit,
  getRateLimitStatus,
} from './keys';
import { APIKey, APIKeyPermission, APIErrorResponse, RateLimitHeaders } from '@/types/api';

// ============================================
// Types
// ============================================

export interface APIContext {
  apiKey: APIKey;
  organizationId: string;
  requestId: string;
}

export type APIHandlerResult =
  | { success: true; context: APIContext }
  | { success: false; response: NextResponse };

// ============================================
// Error Responses
// ============================================

function createErrorResponse(
  code: string,
  message: string,
  status: number,
  requestId: string,
  headers?: Record<string, string>
): NextResponse {
  const body: APIErrorResponse = {
    success: false,
    error: { code, message },
    requestId,
  };

  return NextResponse.json(body, {
    status,
    headers: {
      'X-Request-Id': requestId,
      ...headers,
    },
  });
}

// ============================================
// IP Extraction
// ============================================

function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');

  return cfConnectingIp || realIp || forwardedFor?.split(',')[0]?.trim() || 'unknown';
}

// ============================================
// Main Authentication Function
// ============================================

/**
 * Authenticate an API request using API key
 */
export async function authenticateAPIRequest(
  request: NextRequest,
  requiredPermissions?: APIKeyPermission[]
): Promise<APIHandlerResult> {
  const requestId = randomUUID();

  // Extract API key from Authorization header
  const authHeader = request.headers.get('authorization');

  if (!authHeader) {
    return {
      success: false,
      response: createErrorResponse(
        'MISSING_API_KEY',
        'API key is required. Include it in the Authorization header as: Bearer np_live_xxx',
        401,
        requestId
      ),
    };
  }

  // Parse Bearer token
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return {
      success: false,
      response: createErrorResponse(
        'INVALID_AUTH_FORMAT',
        'Invalid Authorization header format. Use: Bearer np_live_xxx',
        401,
        requestId
      ),
    };
  }

  const apiKeyValue = parts[1];

  // Validate key format
  if (!apiKeyValue.startsWith('np_live_') && !apiKeyValue.startsWith('np_test_')) {
    return {
      success: false,
      response: createErrorResponse(
        'INVALID_API_KEY_FORMAT',
        'Invalid API key format. Keys should start with np_live_ or np_test_',
        401,
        requestId
      ),
    };
  }

  // Validate API key
  const apiKey = await validateAPIKey(apiKeyValue);

  if (!apiKey) {
    return {
      success: false,
      response: createErrorResponse(
        'INVALID_API_KEY',
        'Invalid or expired API key',
        401,
        requestId
      ),
    };
  }

  // Check IP allowlist
  const clientIP = getClientIP(request);
  if (!isIPAllowed(apiKey, clientIP)) {
    return {
      success: false,
      response: createErrorResponse(
        'IP_NOT_ALLOWED',
        'Request from this IP address is not allowed',
        403,
        requestId
      ),
    };
  }

  // Check rate limits (hourly)
  const hourlyLimit = checkRateLimit(apiKey, 'hour');
  if (!hourlyLimit.allowed) {
    const rateLimitHeaders: Record<string, string> = {
      'X-RateLimit-Limit': String(apiKey.rateLimit?.requestsPerHour || 1000),
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': String(Math.floor(hourlyLimit.resetAt / 1000)),
      'Retry-After': String(Math.ceil((hourlyLimit.resetAt - Date.now()) / 1000)),
    };

    return {
      success: false,
      response: createErrorResponse(
        'RATE_LIMIT_EXCEEDED',
        'Hourly rate limit exceeded. Please try again later.',
        429,
        requestId,
        rateLimitHeaders
      ),
    };
  }

  // Check required permissions
  if (requiredPermissions && requiredPermissions.length > 0) {
    const missingPermissions = requiredPermissions.filter(
      (perm) => !hasPermission(apiKey, perm)
    );

    if (missingPermissions.length > 0) {
      return {
        success: false,
        response: createErrorResponse(
          'INSUFFICIENT_PERMISSIONS',
          `Missing required permissions: ${missingPermissions.join(', ')}`,
          403,
          requestId
        ),
      };
    }
  }

  return {
    success: true,
    context: {
      apiKey,
      organizationId: apiKey.organizationId,
      requestId,
    },
  };
}

/**
 * Check if API key can access a specific form
 */
export function checkFormAccess(
  context: APIContext,
  formId: string
): { allowed: boolean; response?: NextResponse } {
  if (!canAccessForm(context.apiKey, formId)) {
    return {
      allowed: false,
      response: createErrorResponse(
        'FORM_ACCESS_DENIED',
        'This API key does not have access to this form',
        403,
        context.requestId
      ),
    };
  }

  return { allowed: true };
}

// ============================================
// Response Helpers
// ============================================

/**
 * Create a success response with standard headers
 */
export function createAPIResponse<T>(
  data: T,
  context: APIContext,
  status: number = 200
): NextResponse {
  const rateLimitStatus = getRateLimitStatus(context.apiKey, 'hour');

  return NextResponse.json(
    {
      success: true,
      data,
      requestId: context.requestId,
    },
    {
      status,
      headers: {
        'X-Request-Id': context.requestId,
        'X-RateLimit-Limit': String(rateLimitStatus.limit),
        'X-RateLimit-Remaining': String(rateLimitStatus.remaining),
        'X-RateLimit-Reset': String(Math.floor(rateLimitStatus.resetAt / 1000)),
      },
    }
  );
}

/**
 * Create a paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  context: APIContext,
  pagination: {
    total: number;
    page: number;
    pageSize: number;
  }
): NextResponse {
  const totalPages = Math.ceil(pagination.total / pagination.pageSize);
  const rateLimitStatus = getRateLimitStatus(context.apiKey, 'hour');

  return NextResponse.json(
    {
      success: true,
      data,
      pagination: {
        total: pagination.total,
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalPages,
        hasMore: pagination.page < totalPages,
      },
      requestId: context.requestId,
    },
    {
      headers: {
        'X-Request-Id': context.requestId,
        'X-RateLimit-Limit': String(rateLimitStatus.limit),
        'X-RateLimit-Remaining': String(rateLimitStatus.remaining),
        'X-RateLimit-Reset': String(Math.floor(rateLimitStatus.resetAt / 1000)),
      },
    }
  );
}

/**
 * Create an error response with context
 */
export function createAPIErrorResponse(
  code: string,
  message: string,
  status: number,
  context: APIContext,
  details?: Record<string, any>
): NextResponse {
  const body: APIErrorResponse = {
    success: false,
    error: { code, message, details },
    requestId: context.requestId,
  };

  return NextResponse.json(body, {
    status,
    headers: {
      'X-Request-Id': context.requestId,
    },
  });
}
