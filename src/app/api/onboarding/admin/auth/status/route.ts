import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';

// Session configuration for onboarding admin
const sessionOptions = {
  password: process.env.SESSION_SECRET || 'complex_password_at_least_32_characters_long_for_development',
  cookieName: 'onboarding_admin_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24, // 24 hours
  },
};

interface OnboardingAdminSession {
  isAuthenticated: boolean;
  authenticatedAt?: number;
}

/**
 * Check admin auth status
 * GET /api/onboarding/admin/auth/status
 */
export async function GET() {
  try {
    const session = await getIronSession<OnboardingAdminSession>(
      await cookies(),
      sessionOptions
    );

    // Check if session is valid and not expired
    const isAuthenticated = session.isAuthenticated === true;

    return NextResponse.json({
      authenticated: isAuthenticated,
      authenticatedAt: session.authenticatedAt,
    });
  } catch (error) {
    console.error('Auth status check error:', error);
    return NextResponse.json({ authenticated: false });
  }
}
