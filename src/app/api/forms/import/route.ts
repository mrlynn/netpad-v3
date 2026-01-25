/**
 * Form Import API Endpoint
 *
 * Handles form imports from Claude MCP and other sources.
 * Supports both GET (base64 encoded config in URL) and POST (JSON body).
 *
 * @see docs/specs/CLAUDE-NETPAD-INTEGRATION-SPEC.md Phase 1
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createFormImport,
  validateFormConfig,
  type FormImportSource,
  type CreateFormImportInput,
} from '@/lib/platform/formImportsDbOps';

// ============================================
// Constants
// ============================================

const MAX_CONFIG_SIZE_BYTES = 100 * 1024; // 100KB
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX_REQUESTS = 100;

// Simple in-memory rate limit (for production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

// ============================================
// Helpers
// ============================================

/**
 * Get client IP address from request
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || 'unknown';
}

/**
 * Check rate limit for IP
 */
function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  // Clean up expired entries periodically
  if (rateLimitMap.size > 10000) {
    for (const [key, value] of rateLimitMap.entries()) {
      if (value.resetAt < now) {
        rateLimitMap.delete(key);
      }
    }
  }

  if (!entry || entry.resetAt < now) {
    // New window
    const resetAt = now + RATE_LIMIT_WINDOW_MS;
    rateLimitMap.set(ip, { count: 1, resetAt });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1, resetAt };
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - entry.count, resetAt: entry.resetAt };
}

/**
 * Validate source parameter
 */
function validateSource(source: unknown): FormImportSource {
  const validSources: FormImportSource[] = ['claude-mcp', 'cli', 'api', 'share'];
  if (typeof source === 'string' && validSources.includes(source as FormImportSource)) {
    return source as FormImportSource;
  }
  return 'api'; // Default
}

/**
 * Get base URL for redirects
 * Always use production domain for import links
 */
function getBaseUrl(): string {
  // Always use production URL for import links to ensure they work correctly
  return process.env.NEXTAUTH_URL || 'https://netpad.io';
}

// ============================================
// GET /api/forms/import
// ============================================

/**
 * Handle GET request with base64-encoded config
 *
 * Query parameters:
 * - config: base64-encoded JSON form configuration (required)
 * - projectId: target project ID (optional)
 * - redirect: where to redirect after import (optional, default: "builder")
 * - source: attribution source (optional, default: "api")
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const configBase64 = searchParams.get('config');
    const projectId = searchParams.get('projectId') || undefined;
    const source = validateSource(searchParams.get('source'));

    // Validate config parameter
    if (!configBase64) {
      return NextResponse.json(
        { error: 'Missing config parameter', code: 'MISSING_CONFIG' },
        { status: 400 }
      );
    }

    // Check size before decoding
    if (configBase64.length > MAX_CONFIG_SIZE_BYTES * 1.4) { // Base64 is ~1.33x larger
      return NextResponse.json(
        { error: `Config too large. Maximum ${MAX_CONFIG_SIZE_BYTES / 1024}KB`, code: 'CONFIG_TOO_LARGE' },
        { status: 413 }
      );
    }

    // Rate limit check
    const clientIP = getClientIP(request);
    const rateLimit = checkRateLimit(clientIP);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Please try again later.',
          code: 'RATE_LIMITED',
          retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(rateLimit.resetAt),
          },
        }
      );
    }

    // Decode base64 config
    let config: unknown;
    try {
      const decoded = Buffer.from(configBase64, 'base64').toString('utf-8');
      config = JSON.parse(decoded);
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid config format. Expected base64-encoded JSON.', code: 'INVALID_CONFIG' },
        { status: 400 }
      );
    }

    // Validate config
    const validation = validateFormConfig(config);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'Invalid form configuration',
          code: 'VALIDATION_ERROR',
          details: validation.errors,
        },
        { status: 400 }
      );
    }

    // Create import record
    const input: CreateFormImportInput = {
      config: validation.sanitized!,
      projectId,
      source,
      metadata: {
        userAgent: request.headers.get('user-agent') || undefined,
        ipAddress: clientIP,
      },
    };

    const result = await createFormImport(input);

    // Redirect to import page
    const baseUrl = getBaseUrl();
    const redirectUrl = `${baseUrl}/import/${result.importId}`;

    return NextResponse.redirect(redirectUrl, { status: 302 });
  } catch (error) {
    console.error('[Form Import] GET error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process import',
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/forms/import
// ============================================

/**
 * Handle POST request with JSON body
 *
 * Request body:
 * {
 *   config: FormConfiguration (required)
 *   projectId: string (optional)
 *   source: "claude-mcp" | "cli" | "api" | "share" (optional)
 *   expiresIn: number (optional, seconds, max 7 days)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limit check
    const clientIP = getClientIP(request);
    const rateLimit = checkRateLimit(clientIP);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Please try again later.',
          code: 'RATE_LIMITED',
          retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(rateLimit.resetAt),
          },
        }
      );
    }

    // Parse request body
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid JSON body', code: 'INVALID_JSON' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!body.config) {
      return NextResponse.json(
        { error: 'Missing config in request body', code: 'MISSING_CONFIG' },
        { status: 400 }
      );
    }

    // Check size
    const bodySize = JSON.stringify(body.config).length;
    if (bodySize > MAX_CONFIG_SIZE_BYTES) {
      return NextResponse.json(
        { error: `Config too large. Maximum ${MAX_CONFIG_SIZE_BYTES / 1024}KB`, code: 'CONFIG_TOO_LARGE' },
        { status: 413 }
      );
    }

    // Validate config
    const validation = validateFormConfig(body.config);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'Invalid form configuration',
          code: 'VALIDATION_ERROR',
          details: validation.errors,
        },
        { status: 400 }
      );
    }

    // Parse optional parameters
    const source = validateSource(body.source);
    const expiresInSeconds = typeof body.expiresIn === 'number'
      ? Math.max(60, Math.min(body.expiresIn, 604800)) // 1 minute to 7 days
      : undefined;

    // Create import record
    const input: CreateFormImportInput = {
      config: validation.sanitized!,
      projectId: typeof body.projectId === 'string' ? body.projectId : undefined,
      source,
      expiresInSeconds,
      metadata: {
        claudeSessionId: typeof body.claudeSessionId === 'string' ? body.claudeSessionId : undefined,
        mcpVersion: typeof body.mcpVersion === 'string' ? body.mcpVersion : undefined,
        userAgent: request.headers.get('user-agent') || undefined,
        ipAddress: clientIP,
      },
    };

    const result = await createFormImport(input);

    // Return import URL (no redirect for POST)
    return NextResponse.json(
      {
        importId: result.importId,
        importUrl: result.importUrl,
        expiresAt: result.expiresAt.toISOString(),
      },
      {
        status: 201,
        headers: {
          'X-RateLimit-Remaining': String(rateLimit.remaining),
          'X-RateLimit-Reset': String(rateLimit.resetAt),
        },
      }
    );
  } catch (error) {
    console.error('[Form Import] POST error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create import',
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================
// OPTIONS (CORS preflight)
// ============================================

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
