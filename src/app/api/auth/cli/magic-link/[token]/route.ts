/**
 * Magic Link Verification Endpoint
 * 
 * GET /api/auth/cli/magic-link/:token - Verify magic link and get session
 */

import { NextRequest, NextResponse } from 'next/server';
import { findMagicLinkByToken, markMagicLinkUsed, findUserByEmail } from '@/lib/auth/db';
import { createSession } from '@/lib/auth/session';
import { ensurePlatformUser } from '@/lib/platform/users';
import crypto from 'crypto';
import { updateCLISession } from '@/lib/auth/cli-sessions';

/**
 * GET /api/auth/cli/magic-link/:token
 * Verify magic link and return session token
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const cliToken = request.nextUrl.searchParams.get('cliToken');

    console.log('[CLI Magic Link GET] Received request:', {
      tokenPrefix: token.substring(0, 8) + '...',
      hasCliToken: !!cliToken,
      cliTokenPrefix: cliToken ? cliToken.substring(0, 8) + '...' : 'none',
    });

    // Find magic link
    const magicLink = await findMagicLinkByToken(token);
    if (!magicLink) {
      console.log('[CLI Magic Link GET] Magic link not found or expired');
      return NextResponse.json(
        { error: 'Invalid or expired magic link' },
        { status: 400 }
      );
    }

    // Mark as used
    await markMagicLinkUsed(token);

    // Find or create user
    let user = await findUserByEmail(magicLink.email);
    if (!user) {
      console.log('[CLI Magic Link GET] User not found for email:', magicLink.email);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Ensure platform user exists
    const platformUser = await ensurePlatformUser(user._id, user.email, {
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    });

    // Create session
    await createSession(platformUser.userId, user.email);

    // Generate CLI session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    
    // Update CLI session in database with userId
    if (cliToken) {
      console.log('[CLI Magic Link GET] Updating session for cliToken:', cliToken.substring(0, 8) + '...');
      console.log('[CLI Magic Link GET] Platform userId:', platformUser.userId);
      const updated = await updateCLISession(cliToken, platformUser.userId);
      if (updated) {
        console.log('[CLI Magic Link GET] ✓ Session updated successfully with userId:', platformUser.userId);
      } else {
        console.log('[CLI Magic Link GET] ✗ Warning: cliToken not found in database');
        // Debug: Check what sessions exist
        const { getAuthDb } = await import('@/lib/auth/db');
        const db = await getAuthDb();
        const allSessions = await db.collection('cli_sessions').find({}).toArray();
        console.log('[CLI Magic Link GET] All sessions in DB:', allSessions.map(s => ({
          cliToken: s.cliToken?.substring(0, 8) + '...',
          cliTokenLength: s.cliToken?.length,
          email: s.email,
          hasUserId: !!s.userId,
        })));
      }
    } else {
      console.log('[CLI Magic Link GET] Warning: No cliToken provided in request');
    }

    return NextResponse.json({
      success: true,
      access_token: sessionToken,
      token_type: 'Bearer',
      expires_in: 60 * 60 * 24 * 7, // 7 days
      user: {
        userId: platformUser.userId,
        email: user.email,
        displayName: platformUser.displayName,
      },
    });
  } catch (error: any) {
    console.error('[CLI Magic Link GET] Verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify magic link', details: error.message },
      { status: 500 }
    );
  }
}
