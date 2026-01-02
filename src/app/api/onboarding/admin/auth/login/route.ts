import { NextRequest, NextResponse } from 'next/server';
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
 * Admin login
 * POST /api/onboarding/admin/auth/login
 */
export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    // Get admin password from environment
    const adminPassword = process.env.ONBOARDING_ADMIN_PASSWORD;

    if (!adminPassword) {
      console.error('ONBOARDING_ADMIN_PASSWORD not configured');
      return NextResponse.json(
        { success: false, error: 'Admin access not configured' },
        { status: 500 }
      );
    }

    // Validate password
    if (password !== adminPassword) {
      return NextResponse.json(
        { success: false, error: 'Invalid password' },
        { status: 401 }
      );
    }

    // Create session
    const session = await getIronSession<OnboardingAdminSession>(
      await cookies(),
      sessionOptions
    );

    session.isAuthenticated = true;
    session.authenticatedAt = Date.now();
    await session.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { success: false, error: 'Login failed' },
      { status: 500 }
    );
  }
}
