/**
 * API Route: Serve MCP App UI bundles
 *
 * This route serves the pre-built MCP App HTML bundles for:
 * - workflow-viewer
 * - template-gallery
 * - form-preview
 *
 * URL pattern: /_mcp/ui/{app}/bundle.html
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Valid MCP App names
const VALID_APPS = ['workflow-viewer', 'template-gallery', 'form-preview'] as const;
type AppName = (typeof VALID_APPS)[number];

// Cache for loaded bundles (in-memory caching for performance)
const bundleCache = new Map<AppName, string>();

/**
 * Load the MCP App bundle HTML from the @netpad/mcp-apps package.
 */
function loadBundle(appName: AppName): string | null {
  // Check cache first
  if (bundleCache.has(appName)) {
    return bundleCache.get(appName) ?? null;
  }

  // Try to load from the mcp-apps package dist folder
  const possiblePaths = [
    // Monorepo local development
    path.join(process.cwd(), 'packages', 'mcp-apps', 'dist', `${appName}.html`),
    // npm package (when installed as dependency)
    path.join(process.cwd(), 'node_modules', '@netpad', 'mcp-apps', 'dist', `${appName}.html`),
  ];

  for (const bundlePath of possiblePaths) {
    try {
      if (fs.existsSync(bundlePath)) {
        const content = fs.readFileSync(bundlePath, 'utf-8');
        bundleCache.set(appName, content);
        return content;
      }
    } catch {
      // Continue to next path
    }
  }

  return null;
}

/**
 * GET /_mcp/ui/{app}/bundle.html
 *
 * Serves the MCP App HTML bundle with appropriate caching headers.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ app: string }> }
) {
  const { app } = await params;

  // Validate app name
  if (!VALID_APPS.includes(app as AppName)) {
    return NextResponse.json(
      {
        error: 'Invalid MCP App',
        message: `Valid apps are: ${VALID_APPS.join(', ')}`,
      },
      { status: 404 }
    );
  }

  // Load the bundle
  const bundle = loadBundle(app as AppName);

  if (!bundle) {
    return NextResponse.json(
      {
        error: 'Bundle not found',
        message: `The ${app} bundle has not been built yet. Run: cd packages/mcp-apps && npm run build`,
      },
      { status: 404 }
    );
  }

  // Return the HTML with appropriate headers
  return new NextResponse(bundle, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Cache for 1 hour in browser, 1 day at edge
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
      // Security headers for iframe embedding
      'X-Frame-Options': 'ALLOWALL', // Allow embedding in MCP clients
      'Content-Security-Policy': "frame-ancestors *", // Allow any origin to embed
      // CORS headers for MCP clients
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    },
  });
}

/**
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}
