/**
 * CLI Session Token Management
 * 
 * POST /api/auth/cli/session - Exchange session token for user info
 * GET /api/auth/cli/session - Validate session token
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { findUserById as findPlatformUserById } from '@/lib/platform/users';
import { getUserOrganizations } from '@/lib/platform/organizations';
import crypto from 'crypto';
import { getCLISessionToken } from '@/lib/auth/cli-sessions';

/**
 * POST /api/auth/cli/session
 * Create a session token from a web session
 */
export async function POST(request: NextRequest) {
  try {
    // Get web session
    const session = await getSession();
    
    if (!session.userId || !session.email) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Generate CLI session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    
    // Store session token in database
    const { storeCLISessionToken } = await import('@/lib/auth/cli-sessions');
    await storeCLISessionToken(sessionToken, session.userId, session.email, 7);

    // Get user's organizations
    const organizations = await getUserOrganizations(session.userId);

    return NextResponse.json({
      success: true,
      sessionToken,
      user: {
        userId: session.userId,
        email: session.email,
      },
      organizations: organizations.map(org => ({
        organizationId: org.orgId,
        name: org.name,
        slug: org.slug,
      })),
    });
  } catch (error: any) {
    console.error('[CLI Session] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create session token', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/cli/session
 * Validate session token and return user info
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
      return NextResponse.json(
        { error: 'Invalid authorization format' },
        { status: 401 }
      );
    }

    const sessionToken = parts[1];
    console.log('[CLI Session GET] Looking up sessionToken:', sessionToken.substring(0, 8) + '...');
    
    const sessionInfo = await getCLISessionToken(sessionToken);

    if (!sessionInfo) {
      console.log('[CLI Session GET] ✗ Session token not found or expired');
      return NextResponse.json(
        { error: 'Invalid or expired session token' },
        { status: 401 }
      );
    }
    
    console.log('[CLI Session GET] ✓ Found session token:', {
      userId: sessionInfo.userId,
      email: sessionInfo.email,
    });

    // Get user's organizations
    const organizations = await getUserOrganizations(sessionInfo.userId);

    return NextResponse.json({
      success: true,
      user: {
        userId: sessionInfo.userId,
        email: sessionInfo.email,
      },
      organizations: organizations.map(org => ({
        organizationId: org.orgId,
        name: org.name,
        slug: org.slug,
      })),
    });
  } catch (error: any) {
    console.error('[CLI Session] Validation error:', error);
    return NextResponse.json(
      { error: 'Failed to validate session token', details: error.message },
      { status: 500 }
    );
  }
}
