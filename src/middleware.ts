/**
 * Next.js Middleware
 * 
 * Protects authenticated routes and redirects unauthenticated users to login
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getIronSession } from 'iron-session';
import type { SessionData } from '@/lib/auth/session';

const SESSION_OPTIONS = {
  cookieName: 'mdb_tools_session',
  password: process.env.SESSION_SECRET || 'complex_password_at_least_32_characters_long_for_iron_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
};

// Routes that require authentication
const PROTECTED_ROUTES = [
  '/orgs',
  '/projects',
  '/settings',
  '/builder',
  '/workflows',
  '/my-forms',
  '/applications',
  '/marketplace',
  '/data',
  '/admin',
  '/api/projects',
  '/api/organizations',
  '/api/forms',
  '/api/workflows',
  '/api/applications',
  '/api/collections',
  '/api/executions',
  '/api/vault',
  '/api/api-keys',
  '/api/billing',
  '/api/integrations',
  '/api/templates',
  '/api/deployments',
];

// Routes that are always public (no auth required)
const PUBLIC_ROUTES = [
  '/auth/login',
  '/auth/verify',
  '/auth/signup',
  '/signup',
  '/',
  '/page',
  '/why-netpad',
  '/for-mongodb',
  '/pricing',
  '/privacy',
  '/terms',
  '/contact',
  '/manifesto',
  '/api/auth',
  '/api/forms', // Form submission endpoints can be public
  '/forms', // Public form pages
  '/wizard', // Public wizard pages
  '/waitlist', // Public waitlist signup
  '/waitlist/pending', // Waitlist pending page
];

// API routes that can be accessed without auth (public endpoints)
const PUBLIC_API_ROUTES = [
  '/api/auth/',
  '/api/forms/', // Form submission endpoints
  '/api/onboarding/', // Onboarding endpoints (has separate auth)
  '/api/waitlist/signup', // Waitlist signup endpoint
  '/api/workflows/process', // Workflow cron processor (has separate CRON_SECRET auth)
  '/api/workflows/public/', // Public workflow execution endpoints
];

/**
 * Check if a path requires authentication
 */
function isProtectedRoute(pathname: string): boolean {
  // Check if it's a public route first
  if (PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'))) {
    return false;
  }

  // Check if it's a public API route
  if (PUBLIC_API_ROUTES.some(route => pathname.startsWith(route))) {
    return false;
  }

  // Check if it matches any protected route pattern
  return PROTECTED_ROUTES.some(route => {
    if (route.startsWith('/api/')) {
      // For API routes, check exact match or starts with
      return pathname === route || pathname.startsWith(route + '/');
    } else {
      // For page routes, check if pathname starts with the route
      return pathname.startsWith(route + '/') || pathname === route;
    }
  });
}

/**
 * Check if a path is a public form/wizard page
 */
function isPublicFormPage(pathname: string): boolean {
  // Public form pages: /forms/[formId] or /wizard/[wizardId]
  return /^\/forms\/[^/]+$/.test(pathname) || /^\/wizard\/[^/]+$/.test(pathname);
}

/**
 * Check if path is a legacy application URL and return redirect info
 * Pattern: /orgs/:org/projects/:proj/applications/:appId/...
 */
function isLegacyApplicationUrl(pathname: string): {
  isLegacy: boolean;
  orgId?: string;
  projectId?: string;
  applicationId?: string;
  subPath?: string;
} {
  const legacyPattern = /^\/orgs\/([^/]+)\/projects\/([^/]+)\/applications\/([^/]+)(\/.*)?$/;
  const match = pathname.match(legacyPattern);

  if (!match) {
    return { isLegacy: false };
  }

  return {
    isLegacy: true,
    orgId: match[1],
    projectId: match[2],
    applicationId: match[3],
    subPath: match[4] || '',
  };
}

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Check for legacy application URLs and redirect
  const legacyCheck = isLegacyApplicationUrl(pathname);
  if (legacyCheck.isLegacy && legacyCheck.orgId && legacyCheck.applicationId) {
    try {
      // First check if user is authenticated
      const response = NextResponse.next();
      const session = await getIronSession<SessionData>(request, response, SESSION_OPTIONS);

      if (!session.userId) {
        // User is not authenticated - redirect to login with legacy URL as returnUrl
        // After login, the redirect logic can resolve the appId → appSlug
        const loginUrl = new URL('/auth/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        // Preserve query params in the redirect URL
        searchParams.forEach((value, key) => {
          loginUrl.searchParams.set(key, value);
        });
        return NextResponse.redirect(loginUrl);
      }

      // User is authenticated - proceed with redirect lookup
      const baseUrl = new URL(request.url);
      baseUrl.pathname = '/api/redirect/legacy-app';
      baseUrl.search = '';
      
      const redirectParams = new URLSearchParams();
      redirectParams.set('orgId', legacyCheck.orgId);
      if (legacyCheck.projectId) {
        redirectParams.set('projectId', legacyCheck.projectId);
      }
      redirectParams.set('applicationId', legacyCheck.applicationId);
      if (legacyCheck.subPath) {
        redirectParams.set('path', legacyCheck.subPath);
      }
      
      baseUrl.search = redirectParams.toString();

      // Make internal API call to get redirect URL
      const redirectResponse = await fetch(baseUrl.toString(), {
        headers: {
          // Forward cookies for authentication
          cookie: request.headers.get('cookie') || '',
        },
      });

      if (redirectResponse.ok) {
        const data = await redirectResponse.json();
        if (data.success && data.newPath) {
          // Build new URL with query params preserved
          const newUrl = new URL(data.newPath, request.url);
          // Preserve query parameters from original request
          searchParams.forEach((value, key) => {
            newUrl.searchParams.set(key, value);
          });

          // Return 301 permanent redirect
          return NextResponse.redirect(newUrl, { status: 301 });
        }
      }
    } catch (error) {
      // If redirect lookup fails, log and continue
      // The old URL might still work or we can handle it in route handlers
      console.warn('[Middleware] Legacy redirect lookup failed:', error);
    }
  }

  // Allow public form pages
  if (isPublicFormPage(pathname)) {
    return NextResponse.next();
  }

  // Check if route requires authentication
  if (!isProtectedRoute(pathname)) {
    return NextResponse.next();
  }

  // For protected routes, check authentication
  try {
    // Read session from request cookies (middleware runs on Edge runtime)
    const response = NextResponse.next();
    const session = await getIronSession<SessionData>(request, response, SESSION_OPTIONS);

    if (!session.userId) {
      // User is not authenticated
      // For API routes, return 401
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      // For page routes, redirect to login with return URL
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Check waitlist status for authenticated users
    // Block users with 'pending' or 'rejected' status
    // Allow 'approved' users and legacy users (undefined status) through
    // Note: New users now get 'pending' status by default
    const waitlistStatus = session.waitlistStatus;
    if (waitlistStatus === 'pending' || waitlistStatus === 'rejected') {
      // For API routes, return 403
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Account pending waitlist approval' },
          { status: 403 }
        );
      }

      // For page routes, redirect to waitlist pending page
      const pendingUrl = new URL('/waitlist/pending', request.url);
      return NextResponse.redirect(pendingUrl);
    }

    // User is authenticated and approved (or legacy user), allow access
    // Return the response that iron-session may have modified
    return response;
  } catch (error) {
    console.error('[Middleware] Auth check failed:', error);

    // On error, treat as unauthenticated
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
