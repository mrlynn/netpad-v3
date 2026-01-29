/**
 * RAG Usage API
 *
 * GET /api/rag/usage
 * Retrieves usage statistics and limits for an organization's RAG features
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateAIRequest } from '@/lib/ai/aiRequestGuard';
import { getOrganizationRAGConfig } from '@/lib/rag/config';
import { RAGUsageTrackingService } from '@/lib/rag/usage/tracking';

export async function GET(request: NextRequest) {
  try {
    // Validate authentication
    const guard = await validateAIRequest('ai_form_generator', false);
    if (!guard.success) {
      return guard.response;
    }

    // Get organization ID from query params
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: 'organizationId is required' },
        { status: 400 }
      );
    }

    // Validate organization access
    if (organizationId !== guard.context.orgId) {
      return NextResponse.json(
        { success: false, error: 'Access denied to this organization' },
        { status: 403 }
      );
    }

    // Get RAG configuration (includes limits)
    const config = await getOrganizationRAGConfig(organizationId);

    // Get usage summary
    const usageTracker = new RAGUsageTrackingService();
    const summary = await usageTracker.getUsageSummary(organizationId, config);

    // Get limit check results
    const limitCheck = await usageTracker.checkLimits(organizationId, config);

    return NextResponse.json({
      success: true,
      usage: summary,
      limits: {
        canUpload: limitCheck.canUpload,
        canQuery: limitCheck.canQuery,
        violations: limitCheck.violations,
        warnings: limitCheck.warnings,
      },
      config: {
        mode: config.mode,
        tier: config.limits,
      },
    });
  } catch (error) {
    console.error('[RAG] Usage API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch usage',
      },
      { status: 500 }
    );
  }
}
