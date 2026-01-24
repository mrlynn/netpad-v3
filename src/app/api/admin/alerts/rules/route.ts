/**
 * Admin Alert Rules API
 *
 * GET: Get all alert rules
 * POST: Create a new alert rule
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { isPlatformAdmin } from '@/lib/platform/users';
import {
  getAllAlertRules,
  createAlertRule,
  evaluateAllRules,
  getAlertStats,
} from '@/lib/platform/alertService';

export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;
    const includeStats = searchParams.get('includeStats') === 'true';
    const statsDays = parseInt(searchParams.get('statsDays') || '7', 10);

    const rules = await getAllAlertRules();

    let stats = null;
    if (includeStats) {
      stats = await getAlertStats(statsDays);
    }

    return NextResponse.json({
      success: true,
      rules: rules.map((rule) => ({
        ...rule,
        _id: rule._id?.toString(),
        createdAt: rule.createdAt.toISOString(),
        lastEvaluatedAt: rule.lastEvaluatedAt?.toISOString(),
        lastAlertedAt: rule.lastAlertedAt?.toISOString(),
      })),
      stats,
    });
  } catch (error) {
    console.error('[Admin Alert Rules] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch alert rules' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();

    // Validate required fields
    const threshold = body.condition?.value ?? body.threshold;
    if (!body.name || !body.metric || !body.condition || threshold === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: name, metric, condition, condition.value or threshold' },
        { status: 400 }
      );
    }

    // Check for evaluate action (triggers all rules)
    if (body.action === 'evaluate') {
      const result = await evaluateAllRules();
      return NextResponse.json({
        success: true,
        message: `Evaluated ${result.evaluated} rules, ${result.triggered} triggered`,
        ...result,
      });
    }

    const now = new Date();
    const rule = await createAlertRule({
      name: body.name,
      description: body.description,
      metric: body.metric,
      condition: {
        operator: body.condition.operator,
        value: threshold,
      },
      scope: body.scope || 'platform',
      organizationId: body.organizationId,
      evaluationIntervalMinutes: body.evaluationIntervalMinutes || 5,
      cooldownMinutes: body.cooldownMinutes || 30,
      channels: body.channels || [],
      status: 'active',
      enabled: body.enabled !== false,
      createdBy: session.userId,
      updatedAt: now,
    });

    return NextResponse.json({
      success: true,
      rule: {
        ...rule,
        _id: rule._id?.toString(),
        createdAt: rule.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('[Admin Alert Rules] Error:', error);
    return NextResponse.json({ error: 'Failed to create alert rule' }, { status: 500 });
  }
}
