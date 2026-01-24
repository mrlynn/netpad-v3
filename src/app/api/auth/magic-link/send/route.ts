import { NextRequest, NextResponse } from 'next/server';
import { createMagicLink, countRecentMagicLinks } from '@/lib/auth/db';
import { sendMagicLinkEmail } from '@/lib/auth/email';
import { MAGIC_LINK_CONFIG } from '@/types/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, returnUrl } = await req.json();

    // Validate email
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Email is required' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Validate returnUrl if provided (must be a relative path for security)
    let safeReturnUrl: string | undefined;
    if (returnUrl && typeof returnUrl === 'string') {
      // Only allow relative paths starting with /
      if (returnUrl.startsWith('/') && !returnUrl.startsWith('//')) {
        safeReturnUrl = returnUrl;
      }
    }

    // Rate limiting - check recent magic links
    const recentCount = await countRecentMagicLinks(email, 1);
    if (recentCount >= MAGIC_LINK_CONFIG.maxAttemptsPerHour) {
      return NextResponse.json(
        {
          success: false,
          message: 'Too many login attempts. Please try again later.',
        },
        { status: 429 }
      );
    }

    // Get request metadata
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0] ||
                      req.headers.get('x-real-ip') ||
                      'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Create magic link
    const magicLink = await createMagicLink(email, ipAddress, userAgent);

    // Send email with optional returnUrl
    const emailSent = await sendMagicLinkEmail({
      to: email,
      token: magicLink.token,
      expiresInMinutes: MAGIC_LINK_CONFIG.expiresInMinutes,
      returnUrl: safeReturnUrl,
    });

    if (!emailSent) {
      console.error('Failed to send magic link email:', {
        to: email,
        hasSmtpUser: !!process.env.SMTP_USER,
        hasSmtpPass: !!process.env.SMTP_PASS,
        smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com (default)',
        nodeEnv: process.env.NODE_ENV,
      });

      // In dev mode, still return success since we log the link
      if (process.env.NODE_ENV !== 'production') {
        return NextResponse.json({
          success: true,
          message: 'Magic link created (check console in dev mode)',
        });
      }

      return NextResponse.json(
        { success: false, message: 'Failed to send email. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Check your email for the login link',
    });
  } catch (error) {
    console.error('Error sending magic link:', error);
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { success: false, message: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
