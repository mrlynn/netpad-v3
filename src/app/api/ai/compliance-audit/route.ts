/**
 * AI Compliance Audit API Endpoint
 *
 * Audits forms for compliance with data privacy regulations.
 *
 * POST /api/ai/compliance-audit
 */

import { NextRequest, NextResponse } from 'next/server';
import { createComplianceAuditAgent } from '@/lib/ai/complianceAuditAgent';
import { ComplianceAuditRequest } from '@/lib/ai/types';
import { validateAIRequest } from '@/lib/ai/aiRequestGuard';
import { incrementAIUsage } from '@/lib/platform/billing';

export async function POST(request: NextRequest) {
  try {
    // Validate authentication and feature access
    const guard = await validateAIRequest('agent_compliance_audit', false);
    if (!guard.success) return guard.response;

    const body = await request.json();

    // Validate required fields
    if (!body.formId || typeof body.formId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'formId is required' },
        { status: 400 }
      );
    }

    if (!body.form || typeof body.form !== 'object') {
      return NextResponse.json(
        { success: false, error: 'form configuration is required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.frameworks) || body.frameworks.length === 0) {
      return NextResponse.json(
        { success: false, error: 'at least one compliance framework is required' },
        { status: 400 }
      );
    }

    const validFrameworks = ['GDPR', 'HIPAA', 'CCPA', 'PCI-DSS', 'SOC2'];
    const invalidFrameworks = body.frameworks.filter((f: string) => !validFrameworks.includes(f));
    if (invalidFrameworks.length > 0) {
      return NextResponse.json(
        { success: false, error: `Invalid frameworks: ${invalidFrameworks.join(', ')}. Valid options: ${validFrameworks.join(', ')}` },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'AI service not configured' },
        { status: 503 }
      );
    }

    const agent = createComplianceAuditAgent(apiKey);
    const auditRequest: ComplianceAuditRequest = {
      formId: body.formId,
      form: body.form,
      frameworks: body.frameworks,
    };

    const result = await agent.audit(auditRequest);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 422 }
      );
    }

    // Record agent session usage
    await incrementAIUsage(guard.context.orgId, 'agentSessions', 1);

    return NextResponse.json({
      success: true,
      scores: result.scores,
      violations: result.violations,
      recommendations: result.recommendations,
      compliantAspects: result.compliantAspects,
      usage: result.usage,
    });
  } catch (error) {
    console.error('Compliance audit API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
