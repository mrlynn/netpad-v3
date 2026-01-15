/**
 * Magic Link Polling Endpoint
 * 
 * GET /api/auth/cli/magic-link/poll/:cliToken
 * Poll for magic link verification status
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getCLISession, deleteCLISession, storeCLISessionToken } from '@/lib/auth/cli-sessions';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cliToken: string }> }
) {
  try {
    const { cliToken } = await params;
    const fullCliToken = cliToken; // Keep full token for logging comparison
    console.log('[CLI Magic Link Poll] Checking cliToken:', cliToken.substring(0, 8) + '...');
    console.log('[CLI Magic Link Poll] Full cliToken length:', cliToken.length);
    
    const session = await getCLISession(cliToken);

    if (!session) {
      console.log('[CLI Magic Link Poll] ✗ Token not found or expired');
      // Also check the database directly for debugging
      const { getAuthDb } = await import('@/lib/auth/db');
      const db = await getAuthDb();
      const allSessions = await db.collection('cli_sessions').find({}).toArray();
      console.log('[CLI Magic Link Poll] All sessions in DB:', allSessions.map(s => ({
        cliToken: s.cliToken?.substring(0, 8) + '...',
        cliTokenLength: s.cliToken?.length,
        hasUserId: !!s.userId,
        userId: s.userId,
        email: s.email,
        matches: s.cliToken === cliToken,
      })));
      return NextResponse.json(
        { error: 'invalid_grant', error_description: 'CLI token not found or expired' },
        { status: 400 }
      );
    }
    
    console.log('[CLI Magic Link Poll] ✓ Found session:', { 
      hasUserId: !!session.userId, 
      userId: session.userId,
      email: session.email,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
    });

    if (!session.userId) {
      // Still waiting for verification
      return NextResponse.json(
        { error: 'authorization_pending', error_description: 'Magic link not yet verified' },
        { status: 400 }
      );
    }

    // Generate session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    
    // Store session token in database (so GET /api/auth/cli/session can find it)
    await storeCLISessionToken(sessionToken, session.userId!, session.email, 7);
    
    console.log('[CLI Magic Link Poll] ✓ Session token generated and stored in DB:', {
      sessionTokenPrefix: sessionToken.substring(0, 8) + '...',
      userId: session.userId,
    });
    
    // Clean up CLI session from database
    await deleteCLISession(cliToken);

    return NextResponse.json({
      access_token: sessionToken,
      token_type: 'Bearer',
      expires_in: 60 * 60 * 24 * 7, // 7 days
      user: {
        userId: session.userId,
        email: session.email,
      },
    });
  } catch (error: any) {
    console.error('[CLI Magic Link] Poll error:', error);
    return NextResponse.json(
      { error: 'Failed to poll magic link', details: error.message },
      { status: 500 }
    );
  }
}

