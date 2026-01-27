/**
 * Admin Payout Approval API
 *
 * POST /api/admin/referrals/payouts/[payoutId]/approve - Approve a payout request
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { isPlatformAdmin } from '@/lib/platform/users';
import { getReferralService, isFeatureAvailable } from '@/lib/extensions';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ payoutId: string }> }
) {
  try {
    const session = await getSession();
    const { payoutId } = await params;

    if (!session.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check admin permission
    const isAdmin = await isPlatformAdmin(session.userId);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Check feature availability
    const referralAvailable = isFeatureAvailable('referral_commissions');
    if (!referralAvailable.available) {
      return NextResponse.json(
        { error: 'Referral commissions are not available' },
        { status: 403 }
      );
    }

    const referralService = getReferralService();
    if (!referralService) {
      return NextResponse.json(
        { error: 'Referral service not available' },
        { status: 503 }
      );
    }

    try {
      await referralService.approvePayout(payoutId, session.userId);

      return NextResponse.json({
        success: true,
        message: 'Payout approved',
      });
    } catch (err) {
      const error = err as Error;
      return NextResponse.json(
        { error: error.message || 'Failed to approve payout' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[Admin Referrals] Error approving payout:', error);
    return NextResponse.json(
      { error: 'Failed to approve payout' },
      { status: 500 }
    );
  }
}
