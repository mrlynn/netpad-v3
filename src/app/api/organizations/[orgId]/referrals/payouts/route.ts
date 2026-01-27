/**
 * Organization Referral Payouts API
 *
 * GET  /api/organizations/[orgId]/referrals/payouts - List payouts
 * POST /api/organizations/[orgId]/referrals/payouts - Request payout
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { assertOrgPermission } from '@/lib/platform/permissions';
import { getReferralService, isFeatureAvailable } from '@/lib/extensions';
import {
  getReferralPayoutsCollection,
} from '@/lib/platform/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const session = await getSession();
    const { orgId } = await params;

    if (!session.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
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

    // Check permission to view payouts (admin required)
    try {
      await assertOrgPermission(session.userId, orgId, 'manage_organization');
    } catch {
      return NextResponse.json(
        { error: 'Admin permission required' },
        { status: 403 }
      );
    }

    // Get payouts from database
    const payoutsCollection = await getReferralPayoutsCollection();
    const payouts = await payoutsCollection
      .find({ organizationId: orgId })
      .sort({ requestedAt: -1 })
      .limit(50)
      .toArray();

    return NextResponse.json({
      payouts: payouts.map((p) => ({
        payoutId: p.payoutId,
        amount: p.amount,
        currency: p.currency,
        method: p.method,
        status: p.status,
        requestedAt: p.requestedAt,
        approvedAt: p.approvedAt,
        processedAt: p.processedAt,
        rejectionReason: p.rejectionReason,
      })),
    });
  } catch (error) {
    console.error('[Referral API] List payouts error:', error);
    return NextResponse.json(
      { error: 'Failed to list payouts' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const session = await getSession();
    const { orgId } = await params;

    if (!session.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
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

    // Check permission to request payouts (admin required)
    try {
      await assertOrgPermission(session.userId, orgId, 'manage_organization');
    } catch {
      return NextResponse.json(
        { error: 'Admin permission required' },
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

    const body = await request.json();
    const { amount, method, paymentDetails } = body;

    // Validate method
    const validMethods = ['paypal', 'wise', 'bank_transfer', 'other'];
    if (!method || !validMethods.includes(method)) {
      return NextResponse.json(
        { error: 'Invalid payment method' },
        { status: 400 }
      );
    }

    // Validate payment details based on method
    if (!paymentDetails || typeof paymentDetails !== 'object') {
      return NextResponse.json(
        { error: 'Payment details are required' },
        { status: 400 }
      );
    }

    if (method === 'paypal' && !paymentDetails.email) {
      return NextResponse.json(
        { error: 'PayPal email is required' },
        { status: 400 }
      );
    }

    if (method === 'wise' && !paymentDetails.email) {
      return NextResponse.json(
        { error: 'Wise email is required' },
        { status: 400 }
      );
    }

    if (method === 'bank_transfer') {
      if (!paymentDetails.accountName || !paymentDetails.accountNumber) {
        return NextResponse.json(
          { error: 'Bank account details are required' },
          { status: 400 }
        );
      }
    }

    try {
      const result = await referralService.requestPayout({
        organizationId: orgId,
        amount: amount || undefined, // Undefined means full balance
        method,
        paymentDetails,
      });

      return NextResponse.json({
        success: true,
        payout: result,
        message: 'Payout request submitted for review',
      });
    } catch (err) {
      const error = err as Error;
      return NextResponse.json(
        { error: error.message || 'Failed to request payout' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[Referral API] Request payout error:', error);
    return NextResponse.json(
      { error: 'Failed to request payout' },
      { status: 500 }
    );
  }
}
