/**
 * Admin Alert Rule Detail API
 *
 * GET: Get single alert rule
 * PATCH: Update alert rule
 * DELETE: Delete alert rule
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { isPlatformAdmin } from '@/lib/platform/users';
import {
  getAlertRule,
  updateAlertRule,
  deleteAlertRule,
} from '@/lib/platform/alertService';

export const dynamic = 'force-dynamic';

export async function GET(
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
    const rule = await getAlertRule(ruleId);

    if (!rule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      rule: {
        ...rule,
        _id: rule._id?.toString(),
        createdAt: rule.createdAt.toISOString(),
        lastEvaluatedAt: rule.lastEvaluatedAt?.toISOString(),
        lastAlertedAt: rule.lastAlertedAt?.toISOString(),
      },
    });
  } catch (error) {
    console.error('[Admin Alert Rule Detail] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch alert rule' }, { status: 500 });
  }
}

export async function PATCH(
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
    const body = await request.json();

    // Build updates object (only include provided fields)
    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.metric !== undefined) updates.metric = body.metric;
    if (body.condition !== undefined) updates.condition = body.condition;
    if (body.threshold !== undefined) updates.threshold = body.threshold;
    if (body.evaluationIntervalMinutes !== undefined) updates.evaluationIntervalMinutes = body.evaluationIntervalMinutes;
    if (body.cooldownMinutes !== undefined) updates.cooldownMinutes = body.cooldownMinutes;
    if (body.channels !== undefined) updates.channels = body.channels;
    if (body.enabled !== undefined) updates.enabled = body.enabled;

    const success = await updateAlertRule(ruleId, updates);

    if (!success) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    // Return updated rule
    const updatedRule = await getAlertRule(ruleId);

    return NextResponse.json({
      success: true,
      rule: updatedRule
        ? {
            ...updatedRule,
            _id: updatedRule._id?.toString(),
            createdAt: updatedRule.createdAt.toISOString(),
            lastEvaluatedAt: updatedRule.lastEvaluatedAt?.toISOString(),
            lastAlertedAt: updatedRule.lastAlertedAt?.toISOString(),
          }
        : null,
    });
  } catch (error) {
    console.error('[Admin Alert Rule Update] Error:', error);
    return NextResponse.json({ error: 'Failed to update alert rule' }, { status: 500 });
  }
}

export async function DELETE(
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
    const success = await deleteAlertRule(ruleId);

    if (!success) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Rule deleted successfully',
    });
  } catch (error) {
    console.error('[Admin Alert Rule Delete] Error:', error);
    return NextResponse.json({ error: 'Failed to delete alert rule' }, { status: 500 });
  }
}
