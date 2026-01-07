/**
 * Admin Authentication API
 *
 * POST /api/admin/auth/login - Login with password
 * POST /api/admin/auth/logout - Logout
 * GET /api/admin/auth/status - Check authentication status
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  authenticateWithPassword,
  authenticateWithApiKey,
  getSession,
  logout,
  isAuthConfigured,
} from '@/lib/admin/auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/auth/login
 * Authenticate with password or API key
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password, apiKey } = body;

    // Check if authentication is configured
    if (!isAuthConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Admin authentication is not configured. Please set ADMIN_PASSWORD or ADMIN_API_KEY environment variable.',
        },
        { status: 500 }
      );
    }

    // Try API key authentication first
    if (apiKey) {
      const result = await authenticateWithApiKey(apiKey);
      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error || 'Invalid API key',
          },
          { status: 401 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Authenticated with API key',
      });
    }

    // Try password authentication
    if (password) {
      const ipAddress = request.headers.get('x-forwarded-for') || 
                       request.headers.get('x-real-ip') || 
                       'unknown';
      
      const result = await authenticateWithPassword(password, ipAddress);
      
      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error || 'Invalid password',
          },
          { status: 401 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Authenticated successfully',
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Password or API key is required',
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('[Admin Auth] Login error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/auth/logout
 * Logout and clear session
 */
export async function DELETE() {
  try {
    await logout();
    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('[Admin Auth] Logout error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to logout',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/auth/status
 * Check authentication status
 */
export async function GET() {
  try {
    const session = await getSession();
    const configured = isAuthConfigured();

    return NextResponse.json({
      authenticated: session.authenticated,
      configured,
      error: session.error,
    });
  } catch (error) {
    console.error('[Admin Auth] Status check error:', error);
    return NextResponse.json(
      {
        authenticated: false,
        configured: false,
        error: 'Failed to check authentication status',
      },
      { status: 500 }
    );
  }
}
