/**
 * Public Referral Code Validation API
 *
 * GET /api/referrals/validate?code=XXX - Validate a referral code
 *
 * This is a public endpoint that can be called without authentication.
 * It's used on the signup page to validate referral codes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getReferralService, isFeatureAvailable } from '@/lib/extensions';

export async function GET(request: NextRequest) {
  try {
    // Check feature availability
    const referralAvailable = isFeatureAvailable('referral_program');
    if (!referralAvailable.available) {
      return NextResponse.json(
        { valid: false, reason: 'Referral program is not available' },
        { status: 200 }
      );
    }

    const referralService = getReferralService();
    if (!referralService) {
      return NextResponse.json(
        { valid: false, reason: 'Referral service not available' },
        { status: 200 }
      );
    }

    // Get code from query params
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json(
        { valid: false, reason: 'Code is required' },
        { status: 400 }
      );
    }

    // Validate the code
    const result = await referralService.validateCode(code);

    return NextResponse.json({
      valid: result.valid,
      referrerName: result.referrerName,
    });
  } catch (error) {
    console.error('[Referral API] Validate code error:', error);
    return NextResponse.json(
      { valid: false, reason: 'Validation failed' },
      { status: 200 }
    );
  }
}
