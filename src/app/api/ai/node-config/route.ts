/**
 * Unified API endpoint for AI-assisted node configuration
 * Handles configuration generation for all workflow node types
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateAIRequestWithGuestAccess, recordAIUsage, recordGuestUsage } from '@/lib/ai/aiRequestGuard';
import { generateNodeConfig } from '@/lib/ai/nodeConfigGenerator';
import { NodeConfigGenerationRequest } from '@/lib/ai/types/nodeConfig';
import { getNodePromptConfig } from '@/lib/ai/nodeConfigPrompts';

export async function POST(request: NextRequest) {
  try {
    // Validate AI access (with guest support)
    const validation = await validateAIRequestWithGuestAccess(
      'ai_node_config_assistant',
      request,
      true // check usage limits
    );

    if (!validation.success) {
      return validation.response;
    }

    const body = await request.json() as NodeConfigGenerationRequest;

    // Validate required fields
    if (!body.nodeType || !body.fieldKey || !body.userQuery) {
      return NextResponse.json(
        { error: 'Missing required fields: nodeType, fieldKey, userQuery' },
        { status: 400 }
      );
    }

    // Check if we have a prompt for this node/field combination
    const promptConfig = getNodePromptConfig(body.nodeType, body.fieldKey);
    if (!promptConfig) {
      return NextResponse.json(
        { error: `AI assistance not available for ${body.nodeType}.${body.fieldKey}` },
        { status: 400 }
      );
    }

    // Generate the configuration
    const result = await generateNodeConfig(body);

    // Record usage
    if (validation.context.isGuest) {
      recordGuestUsage(request);
    } else {
      await recordAIUsage(validation.context.orgId);
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Error in node-config API:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate configuration';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
