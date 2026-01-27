/**
 * Admin Referral Payouts API
 *
 * GET /api/admin/referrals/payouts - List all payout requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { isPlatformAdmin } from '@/lib/platform/users';
import { isFeatureAvailable } from '@/lib/extensions';
import {
  getReferralPayoutsCollection,
  getOrganizationsCollection,
} from '@/lib/platform/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
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

    // Parse query params
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get payouts from database
    const payoutsCollection = await getReferralPayoutsCollection();
    const orgsCollection = await getOrganizationsCollection();

    const query: Record<string, unknown> = {};
    if (status) {
      query.status = status;
    }

    const payouts = await payoutsCollection
      .find(query)
      .sort({ requestedAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();

    const total = await payoutsCollection.countDocuments(query);

    // Enrich with org names
    const enrichedPayouts = await Promise.all(
      payouts.map(async (p) => {
        const org = await orgsCollection.findOne({ orgId: p.organizationId });

        return {
          payoutId: p.payoutId,
          organizationId: p.organizationId,
          organizationName: org?.name || 'Unknown',
          amount: p.amount,
          currency: p.currency,
          method: p.method,
          paymentDetails: p.paymentDetails,
          status: p.status,
          requestedAt: p.requestedAt,
          approvedBy: p.approvedBy,
          approvedAt: p.approvedAt,
          rejectedBy: p.rejectedBy,
          rejectedAt: p.rejectedAt,
          rejectionReason: p.rejectionReason,
          processedAt: p.processedAt,
          transactionId: p.transactionId,
        };
      })
    );

    return NextResponse.json({
      payouts: enrichedPayouts,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[Admin Referrals] Error fetching payouts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payouts' },
      { status: 500 }
    );
  }
}
