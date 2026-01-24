/**
 * Admin Alert Rule Test API
 *
 * POST: Test an alert rule without triggering notifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { isPlatformAdmin } from '@/lib/platform/users';
import { testAlertRule } from '@/lib/platform/alertService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ruleId: string }> }
) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check admin access
    const isAdmin = await isPlatformAdmin(session.userId);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { ruleId } = await params;

    const result = await testAlertRule(ruleId);

    return NextResponse.json({
      success: true,
      test: {
        ruleId,
        triggered: result.triggered,
        metricValue: result.metricValue,
        threshold: result.threshold,
        wouldNotify: result.wouldNotify.map((channel) => ({
          type: channel.type,
          configured: true,
        })),
      },
    });
  } catch (error) {
    console.error('[Admin Alert Rule Test] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to test alert rule';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
