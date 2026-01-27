/**
 * Extension Routes Catch-All Handler
 *
 * This route handles all requests to /api/ext/* and routes them to the
 * appropriate extension handler based on the path and method.
 *
 * Extension routes are defined in each extension's `routes` array and
 * follow the pattern: /api/ext/{extension-prefix}/{route-path}
 *
 * Example:
 * - /api/ext/collaborate/gallery -> @netpad/collaborate gallery handler
 * - /api/ext/collaborate/notify -> @netpad/collaborate notify handler
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getExtensionRoutes,
  loadExtensions,
  extensionsLoaded,
} from '@/lib/extensions';
import type { HttpMethod } from '@/lib/extensions/types';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ path: string[] }>;
}

/**
 * Find and execute the matching extension route handler
 */
async function handleExtensionRoute(
  request: NextRequest,
  method: HttpMethod,
  pathParts: string[]
): Promise<NextResponse> {
  // Ensure extensions are loaded
  if (!extensionsLoaded()) {
    await loadExtensions();
  }

  // Reconstruct the full path
  const fullPath = `/api/ext/${pathParts.join('/')}`;

  // Get all registered extension routes
  const routes = getExtensionRoutes();

  // Find a matching route
  const matchingRoute = routes.find((route) => {
    // Check method
    if (route.method !== method) {
      return false;
    }

    // Check path - support both exact match and pattern matching
    if (route.path === fullPath) {
      return true;
    }

    // Support path parameters like /api/ext/collaborate/items/:id
    const routeParts = route.path.split('/');
    const requestParts = fullPath.split('/');

    if (routeParts.length !== requestParts.length) {
      return false;
    }

    return routeParts.every((part, index) => {
      // Parameter placeholder
      if (part.startsWith(':')) {
        return true;
      }
      return part === requestParts[index];
    });
  });

  if (!matchingRoute) {
    console.log(`[Extensions] No route found for ${method} ${fullPath}`);
    return NextResponse.json(
      {
        error: 'Extension route not found',
        path: fullPath,
        method,
      },
      { status: 404 }
    );
  }

  // Extract path parameters if any
  const params: Record<string, string> = {};
  const routeParts = matchingRoute.path.split('/');
  const requestParts = fullPath.split('/');

  routeParts.forEach((part, index) => {
    if (part.startsWith(':')) {
      const paramName = part.slice(1);
      params[paramName] = requestParts[index];
    }
  });

  // TODO: Add authentication check if route.requiresAuth is true
  // if (matchingRoute.requiresAuth) {
  //   const session = await getSession();
  //   if (!session) {
  //     return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  //   }
  // }

  // TODO: Add permission check if route.permissions is defined
  // if (matchingRoute.permissions && matchingRoute.permissions.length > 0) {
  //   // Check user has required permissions
  // }

  try {
    // Execute the route handler
    return await matchingRoute.handler(request, { params });
  } catch (error) {
    console.error(`[Extensions] Route handler error for ${fullPath}:`, error);
    return NextResponse.json(
      {
        error: 'Extension route handler failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET handler
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const resolvedParams = await params;
  return handleExtensionRoute(request, 'GET', resolvedParams.path);
}

/**
 * POST handler
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const resolvedParams = await params;
  return handleExtensionRoute(request, 'POST', resolvedParams.path);
}

/**
 * PUT handler
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const resolvedParams = await params;
  return handleExtensionRoute(request, 'PUT', resolvedParams.path);
}

/**
 * PATCH handler
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const resolvedParams = await params;
  return handleExtensionRoute(request, 'PATCH', resolvedParams.path);
}

/**
 * DELETE handler
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const resolvedParams = await params;
  return handleExtensionRoute(request, 'DELETE', resolvedParams.path);
}
