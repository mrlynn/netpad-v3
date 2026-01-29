/**
 * RAG Configuration API
 *
 * GET /api/rag/config - Get RAG configuration for an organization
 * PUT /api/rag/config - Update RAG configuration for an organization
 * DELETE /api/rag/config - Reset to tier-based defaults
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateAIRequest } from '@/lib/ai/aiRequestGuard';
import {
  getOrganizationRAGConfig,
  updateOrganizationRAGConfig,
  resetOrganizationRAGConfig,
  canUseRAG,
} from '@/lib/rag/config';
import { RAGUsageTrackingService } from '@/lib/rag/usage/tracking';
import { RAGStorageConfig } from '@/types/rag-storage';

/**
 * GET /api/rag/config
 * Retrieve RAG configuration for an organization
 */
export async function GET(request: NextRequest) {
  try {
    // Validate authentication
    const guard = await validateAIRequest('ai_form_generator', false);
    if (!guard.success) {
      return guard.response;
    }

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

    // Get configuration
    const config = await getOrganizationRAGConfig(organizationId);

    // Get usage summary
    const usageTracker = new RAGUsageTrackingService();
    const usage = await usageTracker.getUsageSummary(organizationId, config);

    // Check if RAG is available
    const ragCheck = await canUseRAG(organizationId);

    return NextResponse.json({
      success: true,
      config,
      usage,
      available: ragCheck.allowed,
      reason: ragCheck.reason,
    });
  } catch (error) {
    console.error('[RAG Config] GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get configuration',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/rag/config
 * Update RAG configuration for an organization
 */
export async function PUT(request: NextRequest) {
  try {
    // Validate authentication
    const guard = await validateAIRequest('ai_form_generator');
    if (!guard.success) {
      return guard.response;
    }

    const body = await request.json();
    const { organizationId, config } = body;

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: 'organizationId is required' },
        { status: 400 }
      );
    }

    if (!config) {
      return NextResponse.json(
        { success: false, error: 'config is required' },
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

    // Validate configuration object
    const partialConfig = config as Partial<RAGStorageConfig>;

    // If switching to user-cluster mode, require connection ID
    if (partialConfig.mode === 'user-cluster') {
      if (!partialConfig.userCluster?.connectionId) {
        return NextResponse.json(
          {
            success: false,
            error: 'connectionId is required for user-cluster mode',
          },
          { status: 400 }
        );
      }

      // TODO: Validate connection by attempting to connect to the vault entry
      // This should be done carefully to avoid exposing connection errors
    }

    // Update configuration
    await updateOrganizationRAGConfig(organizationId, partialConfig);

    // Get updated configuration
    const updatedConfig = await getOrganizationRAGConfig(organizationId);

    return NextResponse.json({
      success: true,
      config: updatedConfig,
      message: 'Configuration updated successfully',
    });
  } catch (error) {
    console.error('[RAG Config] PUT error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update configuration',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/rag/config
 * Reset RAG configuration to tier-based defaults
 */
export async function DELETE(request: NextRequest) {
  try {
    // Validate authentication
    const guard = await validateAIRequest('ai_form_generator');
    if (!guard.success) {
      return guard.response;
    }

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

    // Reset configuration
    await resetOrganizationRAGConfig(organizationId);

    // Get new default configuration
    const config = await getOrganizationRAGConfig(organizationId);

    return NextResponse.json({
      success: true,
      config,
      message: 'Configuration reset to tier-based defaults',
    });
  } catch (error) {
    console.error('[RAG Config] DELETE error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reset configuration',
      },
      { status: 500 }
    );
  }
}
