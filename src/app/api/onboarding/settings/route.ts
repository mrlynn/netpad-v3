import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { connectDB } from '@/lib/mongodb';
import { OnboardingBrandingConfig, DEFAULT_BRANDING } from '@/types/onboarding';

// Session configuration
const sessionOptions = {
  password: process.env.SESSION_SECRET || 'complex_password_at_least_32_characters_long_for_development',
  cookieName: 'onboarding_admin_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax' as const,
  },
};

interface OnboardingAdminSession {
  isAuthenticated: boolean;
}

/**
 * Get branding settings
 * GET /api/onboarding/settings
 * Public endpoint - no auth required for reading
 */
export async function GET() {
  try {
    const db = await connectDB();
    const collection = db.collection<OnboardingBrandingConfig>('onboarding_branding');

    // Get active branding config
    const branding = await collection.findOne({ isActive: true });

    if (!branding) {
      // Return defaults if no branding configured
      return NextResponse.json({
        success: true,
        branding: {
          ...DEFAULT_BRANDING,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }

    return NextResponse.json({ success: true, branding });
  } catch (error) {
    console.error('Get settings error:', error);
    // Return defaults on error
    return NextResponse.json({
      success: true,
      branding: {
        ...DEFAULT_BRANDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }
}

/**
 * Update branding settings
 * PUT /api/onboarding/settings
 * Protected endpoint - requires auth
 */
export async function PUT(request: NextRequest) {
  try {
    // Check authentication
    const session = await getIronSession<OnboardingAdminSession>(
      await cookies(),
      sessionOptions
    );

    if (!session.isAuthenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const now = new Date();

    // Validate required fields
    if (!body.companyName || !body.primaryColor) {
      return NextResponse.json(
        { success: false, error: 'Company name and primary color are required' },
        { status: 400 }
      );
    }

    const db = await connectDB();
    const collection = db.collection<OnboardingBrandingConfig>('onboarding_branding');

    // Create or update branding config
    const brandingConfig: OnboardingBrandingConfig = {
      configId: body.configId || 'brand_default',
      companyName: body.companyName,
      logoUrl: body.logoUrl || undefined,
      primaryColor: body.primaryColor,
      secondaryColor: body.secondaryColor || '#001E2B',
      welcomeTitle: body.welcomeTitle || DEFAULT_BRANDING.welcomeTitle,
      welcomeMessage: body.welcomeMessage || DEFAULT_BRANDING.welcomeMessage,
      successTitle: body.successTitle || DEFAULT_BRANDING.successTitle,
      successMessage: body.successMessage || DEFAULT_BRANDING.successMessage,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    // Upsert branding config
    const result = await collection.findOneAndUpdate(
      { configId: brandingConfig.configId },
      {
        $set: {
          ...brandingConfig,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true, returnDocument: 'after' }
    );

    return NextResponse.json({ success: true, branding: result });
  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
