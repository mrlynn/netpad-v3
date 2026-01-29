/**
 * RAG Cluster Validation API
 *
 * POST /api/rag/cluster/validate
 * Validates a MongoDB Atlas cluster for RAG storage compatibility
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateAIRequest } from '@/lib/ai/aiRequestGuard';
import { validateClusterForRAG, getValidationSummary } from '@/lib/rag/storage/validation';

export async function POST(request: NextRequest) {
  try {
    // Validate authentication
    const guard = await validateAIRequest('ai_form_generator', false);
    if (!guard.success) {
      return guard.response;
    }

    // Parse request body
    const body = await request.json();
    const { organizationId, connectionId } = body;

    // Validate required fields
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

    // Perform validation
    const result = await validateClusterForRAG(organizationId, connectionId);

    // Return validation result
    return NextResponse.json({
      success: true,
      validation: {
        isValid: result.isValid,
        clusterTier: result.clusterTier,
        mongoVersion: result.mongoVersion,
        vectorSearchAvailable: result.vectorSearchAvailable,
        connectionSuccessful: result.connectionSuccessful,
        latencyMs: result.latencyMs,
        issues: result.issues,
        summary: getValidationSummary(result),
      },
    });
  } catch (error) {
    console.error('[RAG] Cluster validation error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Cluster validation failed',
      },
      { status: 500 }
    );
  }
}
