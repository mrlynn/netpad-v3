/**
 * POST /api/billing/portal
 *
 * Create a Stripe customer portal session for managing billing.
 *
 * This endpoint supports both:
 * - Cloud mode: Uses the cloud extension's billing service
 * - Self-hosted mode: Uses the built-in billing module
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPortalSession } from '@/lib/platform/billing';
import { getSession } from '@/lib/auth/session';
import { checkOrgPermission } from '@/lib/platform/organizations';
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

    // Try to use cloud extension billing service if available
    const cloudBilling = getBillingService();
    if (cloudBilling) {
      const result = await cloudBilling.createPortalSession({
        organizationId: orgId,
        returnUrl,
      });

      return NextResponse.json(result);
    }

    // Fall back to built-in billing module
    const result = await createPortalSession(orgId, returnUrl);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[API] /api/billing/portal error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create portal session' },
      { status: 500 }
    );
  }
}
