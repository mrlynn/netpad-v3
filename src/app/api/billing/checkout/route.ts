/**
 * POST /api/billing/checkout
 *
 * Create a Stripe checkout session for upgrading subscription.
 *
 * Note: This endpoint requires cloud billing features.
 * Self-hosted deployments manage subscriptions externally.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { checkOrgPermission } from '@/lib/platform/organizations';
import { SubscriptionTier, BillingInterval } from '@/types/platform';
import { getBillingService, loadExtensions, extensionsLoaded, isFeatureAvailable } from '@/lib/extensions';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Ensure extensions are loaded
    if (!extensionsLoaded()) {
      await loadExtensions();
    }

    // Check if billing feature is available (cloud mode)
    const billingAvailable = isFeatureAvailable('billing');
    if (!billingAvailable.available) {
      return NextResponse.json(
        { error: 'Checkout is not available in self-hosted mode. Manage your subscription through your billing provider.' },
        { status: 400 }
      );
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

    // Get the billing service from cloud extension
    const cloudBilling = getBillingService();
    if (!cloudBilling) {
      return NextResponse.json(
        { error: 'Billing service not available' },
        { status: 503 }
      );
    }

    // Get price ID for the tier/interval from environment
    const priceEnvKey = interval === 'year'
      ? `STRIPE_PRICE_${tier.toUpperCase()}_YEARLY`
      : `STRIPE_PRICE_${tier.toUpperCase()}_MONTHLY`;
    const priceId = process.env[priceEnvKey];

    if (!priceId) {
      return NextResponse.json(
        { error: `No pricing configured for tier: ${tier} (${interval})` },
        { status: 400 }
      );
    }

    const result = await cloudBilling.createCheckoutSession({
      organizationId: orgId,
      priceId,
      successUrl,
      cancelUrl,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[API] /api/billing/checkout error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
