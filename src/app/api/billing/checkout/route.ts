/**
 * POST /api/billing/checkout
 *
 * Create a Stripe checkout session for upgrading subscription.
 *
 * This endpoint supports both:
 * - Cloud mode: Uses the cloud extension's billing service
 * - Self-hosted mode: Uses the built-in billing module
 */

import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSession, STRIPE_PRICES } from '@/lib/platform/billing';
import { getSession } from '@/lib/auth/session';
import { checkOrgPermission } from '@/lib/platform/organizations';
import { SubscriptionTier, BillingInterval } from '@/types/platform';
import { getBillingService, loadExtensions, extensionsLoaded } from '@/lib/extensions';

export async function POST(req: NextRequest) {
  try {
    // Ensure extensions are loaded
    if (!extensionsLoaded()) {
      await loadExtensions();
    }

    // Get session
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { orgId, tier, interval = 'month', seatCount } = body as {
      orgId: string;
      tier: SubscriptionTier;
      interval?: BillingInterval;
      seatCount?: number;
    };

    // Validate required fields
    if (!orgId) {
      return NextResponse.json({ error: 'Missing orgId' }, { status: 400 });
    }

    if (!tier || !['pro', 'team'].includes(tier)) {
      return NextResponse.json(
        { error: 'Invalid tier. Must be "pro" or "team"' },
        { status: 400 }
      );
    }

    // Check permission (must be owner or admin)
    const hasPermission = await checkOrgPermission(session.userId, orgId, 'manage_billing');
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'You do not have permission to manage billing for this organization' },
        { status: 403 }
      );
    }

    // Validate seat count for team tier
    if (tier === 'team') {
      if (!seatCount || seatCount < 1) {
        return NextResponse.json(
          { error: 'Seat count is required for team tier' },
          { status: 400 }
        );
      }
    }

    // Build URLs
    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || '';
    const successUrl = `${origin}/settings/billing?success=true`;
    const cancelUrl = `${origin}/settings/billing?canceled=true`;

    // Try to use cloud extension billing service if available
    const cloudBilling = getBillingService();
    if (cloudBilling) {
      // Get price ID for the tier/interval
      const prices = STRIPE_PRICES[tier];
      if (!prices) {
        return NextResponse.json(
          { error: `No pricing configured for tier: ${tier}` },
          { status: 400 }
        );
      }
      const priceId = interval === 'year' ? prices.yearly : prices.monthly;

      const result = await cloudBilling.createCheckoutSession({
        organizationId: orgId,
        priceId,
        successUrl,
        cancelUrl,
      });

      return NextResponse.json(result);
    }

    // Fall back to built-in billing module
    const result = await createCheckoutSession(
      orgId,
      tier,
      interval,
      session.userId,
      successUrl,
      cancelUrl,
      tier === 'team' ? seatCount : undefined
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('[API] /api/billing/checkout error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
