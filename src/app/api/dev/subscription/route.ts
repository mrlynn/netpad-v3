/**
 * DEV ONLY: Subscription management for local development
 *
 * This route should be disabled in production!
 * Set NODE_ENV=production to disable these endpoints.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  setDevSubscriptionTier,
  resetDevUsage,
  setDevUsage,
  getDevSubscriptionInfo,
} from '@/lib/platform/billing-dev';
import { SubscriptionTier } from '@/types/platform';

// Block in production
function checkDevMode() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Dev endpoints disabled in production');
  }
}

/**
 * GET /api/dev/subscription?orgId=xxx
 * Get current subscription info for debugging
 */
export async function GET(req: NextRequest) {
  try {
    checkDevMode();

    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId');

    if (!orgId) {
      return NextResponse.json({ error: 'Missing orgId' }, { status: 400 });
    }

    const info = await getDevSubscriptionInfo(orgId);
    return NextResponse.json(info);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/dev/subscription
 * Set subscription tier or usage
 *
 * Body:
 * - orgId: string (required)
 * - tier: 'free' | 'pro' | 'team' | 'enterprise' (optional)
 * - resetUsage: boolean (optional)
 * - usage: { aiGenerations?, agentSessions?, submissions?, workflowExecutions? } (optional)
 */
export async function POST(req: NextRequest) {
  try {
    checkDevMode();

    const body = await req.json();
    const { orgId, tier, resetUsage, usage } = body;

    if (!orgId) {
      return NextResponse.json({ error: 'Missing orgId' }, { status: 400 });
    }

    const results: string[] = [];

    // Set tier if provided
    if (tier) {
      const validTiers: SubscriptionTier[] = ['free', 'pro', 'team', 'enterprise'];
      if (!validTiers.includes(tier)) {
        return NextResponse.json(
          { error: `Invalid tier. Must be one of: ${validTiers.join(', ')}` },
          { status: 400 }
        );
      }
      await setDevSubscriptionTier(orgId, tier);
      results.push(`Set tier to ${tier}`);
    }

    // Reset usage if requested
    if (resetUsage) {
      await resetDevUsage(orgId);
      results.push('Reset usage counters');
    }

    // Set specific usage values
    if (usage) {
      await setDevUsage(orgId, usage);
      results.push(`Set usage: ${JSON.stringify(usage)}`);
    }

    // Get updated info
    const info = await getDevSubscriptionInfo(orgId);

    return NextResponse.json({
      success: true,
      actions: results,
      current: info,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 }
    );
  }
}
