/**
 * Magic Link Authentication for CLI
 * 
 * POST /api/auth/cli/magic-link - Request magic link
 */

import { NextRequest, NextResponse } from 'next/server';
import { createMagicLink } from '@/lib/auth/db';
import { sendMagicLinkEmail } from '@/lib/auth/email';
import crypto from 'crypto';
import { createCLISession } from '@/lib/auth/cli-sessions';

/**
 * POST /api/auth/cli/magic-link
 * Request a magic link for CLI authentication
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Create magic link
    const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'CLI';

    const magicLink = await createMagicLink(email, clientIP, userAgent);

    // Send magic link email with CLI-specific instructions
    const cliToken = crypto.randomBytes(32).toString('hex');
    const verificationUrl = `${process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/cli/verify-magic-link?token=${magicLink.token}&cliToken=${cliToken}`;

    // Store CLI token in database for later verification
    await createCLISession(cliToken, email, 5); // 5 minutes expiry

    // Send email with CLI-specific link (use the CLI verification URL directly)
    const emailSent = await sendMagicLinkEmail({
      to: email,
      token: magicLink.token,
      expiresInMinutes: 5,
      directUrl: verificationUrl, // Use CLI verification page directly
    });

    if (!emailSent) {
      return NextResponse.json(
        { error: 'Failed to send magic link email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Magic link sent to your email',
      cliToken, // CLI will use this to poll for verification
      expiresIn: 300, // 5 minutes
    });
  } catch (error: any) {
    console.error('[CLI Magic Link] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create magic link', details: error.message },
      { status: 500 }
    );
  }
}

