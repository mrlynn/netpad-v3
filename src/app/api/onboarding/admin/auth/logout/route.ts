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
 * Admin logout
 * POST /api/onboarding/admin/auth/logout
 */
export async function POST() {
  try {
    const session = await getIronSession<OnboardingAdminSession>(
      await cookies(),
      sessionOptions
    );

    session.destroy();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ success: true }); // Still return success even on error
  }
}
