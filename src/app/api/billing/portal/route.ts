/**
 * POST /api/billing/portal
 *
 * Create a Stripe customer portal session for managing billing.
 *
 * Note: This endpoint requires cloud billing features.
 * Self-hosted deployments manage subscriptions externally.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { checkOrgPermission } from '@/lib/platform/organizations';
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
        { error: 'Billing portal is not available in self-hosted mode. Manage your subscription through your billing provider.' },
        { status: 400 }
      );
    }

    // Get session
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { orgId } = body;

    if (!orgId) {
      return NextResponse.json({ error: 'Missing orgId' }, { status: 400 });
    }

    // Check permission (must be owner or admin)
    const hasPermission = await checkOrgPermission(session.userId, orgId, 'manage_billing');
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'You do not have permission to manage billing for this organization' },
        { status: 403 }
      );
    }

    // Build return URL
    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || '';
    const returnUrl = `${origin}/settings/billing`;

    // Get the billing service from cloud extension
    const cloudBilling = getBillingService();
    if (!cloudBilling) {
      return NextResponse.json(
        { error: 'Billing service not available' },
        { status: 503 }
      );
    }

    const result = await cloudBilling.createPortalSession({
      organizationId: orgId,
      returnUrl,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[API] /api/billing/portal error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create portal session' },
      { status: 500 }
    );
  }
}
