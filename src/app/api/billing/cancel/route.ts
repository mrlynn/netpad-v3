/**
 * POST /api/billing/cancel
 *
 * Cancel subscription (at period end by default).
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
        { error: 'Subscription management is not available in self-hosted mode. Manage your subscription through your billing portal.' },
        { status: 400 }
      );
    }

    // Get session
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { orgId, immediate = false } = body;

    if (!orgId) {
      return NextResponse.json({ error: 'Missing orgId' }, { status: 400 });
    }

    // Check permission
    const hasPermission = await checkOrgPermission(session.userId, orgId, 'manage_billing');
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'You do not have permission to manage billing for this organization' },
        { status: 403 }
      );
    }

    // Get the billing service from cloud extension
    const billingService = getBillingService();
    if (!billingService) {
      return NextResponse.json(
        { error: 'Billing service not available' },
        { status: 503 }
      );
    }

    // Note: The BillingService interface doesn't include cancel/reactivate
    // These would need to be added to the interface and implementation
    // For now, return a message about using the portal
    return NextResponse.json({
      success: false,
      message: 'Please use the billing portal to cancel your subscription',
      portalUrl: '/api/billing/portal',
    });
  } catch (error) {
    console.error('[API] /api/billing/cancel error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/billing/cancel
 *
 * Reactivate a subscription that was scheduled for cancellation.
 *
 * Note: This endpoint requires cloud billing features.
 * Self-hosted deployments manage subscriptions externally.
 */
export async function DELETE(req: NextRequest) {
  try {
    // Ensure extensions are loaded
    if (!extensionsLoaded()) {
      await loadExtensions();
    }

    // Check if billing feature is available (cloud mode)
    const billingAvailable = isFeatureAvailable('billing');
    if (!billingAvailable.available) {
      return NextResponse.json(
        { error: 'Subscription management is not available in self-hosted mode. Manage your subscription through your billing portal.' },
        { status: 400 }
      );
    }

    // Get session
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId');

    if (!orgId) {
      return NextResponse.json({ error: 'Missing orgId' }, { status: 400 });
    }

    // Check permission
    const hasPermission = await checkOrgPermission(session.userId, orgId, 'manage_billing');
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'You do not have permission to manage billing for this organization' },
        { status: 403 }
      );
    }

    // Note: The BillingService interface doesn't include cancel/reactivate
    // These would need to be added to the interface and implementation
    // For now, return a message about using the portal
    return NextResponse.json({
      success: false,
      message: 'Please use the billing portal to reactivate your subscription',
      portalUrl: '/api/billing/portal',
    });
  } catch (error) {
    console.error('[API] /api/billing/cancel DELETE error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to reactivate subscription' },
      { status: 500 }
    );
  }
}
