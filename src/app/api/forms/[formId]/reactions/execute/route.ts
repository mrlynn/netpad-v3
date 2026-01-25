/**
 * Form Reactions API - Execute
 *
 * POST /api/forms/[formId]/reactions/execute - Execute a reaction synchronously
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getOrgFormsCollection } from '@/lib/platform/db';
import { executeReaction } from '@/lib/reactions/executor';
import { validateExecuteReaction } from '@/lib/reactions/validation';
import type { FormReaction, ReactionExecutionResult } from '@/types/reactions';

export const dynamic = 'force-dynamic';

/**
 * POST - Execute a reaction synchronously
 *
 * Request body:
 * {
 *   reactionId: string;
 *   triggerField: string;
 *   triggerEvent: 'change' | 'blur' | 'focus' | 'validate' | 'clear';
 *   formData: Record<string, any>;
 * }
 *
 * Response:
 * {
 *   success: boolean;
 *   status: 'completed' | 'pending' | 'failed';
 *   executionId: string;
 *   result?: { updates: Record<string, any>; feedback?: {...} };
 *   error?: { message: string; code: string; details?: {...} };
 *   durationMs?: number;
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { formId } = await params;

    // Get session (optional - reactions can work for public forms too)
    const session = await getSession();
    const userId = session?.userId;

    // Get orgId from query params
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');

    if (!orgId) {
      return NextResponse.json(
        { success: false, error: 'orgId query parameter is required' },
        { status: 400 }
      );
    }

    // Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const validation = validateExecuteReaction(body);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, errors: validation.errors },
        { status: 400 }
      );
    }

    const data = body as {
      reactionId: string;
      triggerField: string;
      triggerEvent: 'change' | 'blur' | 'focus' | 'validate' | 'clear';
      formData: Record<string, unknown>;
    };

    // Load form from organization database
    const formsCollection = await getOrgFormsCollection(orgId);
    const form = await formsCollection.findOne({
      $or: [{ formId }, { id: formId }],
    });

    if (!form) {
      return NextResponse.json(
        { success: false, error: 'Form not found' },
        { status: 404 }
      );
    }

    // Find the reaction
    const reactions = (form.reactions || []) as FormReaction[];
    const reaction = reactions.find((r) => r.id === data.reactionId);

    if (!reaction) {
      return NextResponse.json(
        {
          success: false,
          error: 'Reaction not found',
          code: 'REACTION_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Check if reaction is enabled
    if (!reaction.enabled) {
      return NextResponse.json(
        {
          success: false,
          error: 'Reaction is disabled',
          code: 'REACTION_DISABLED',
        },
        { status: 400 }
      );
    }

    console.log('[API] Executing reaction:', {
      formId,
      reactionId: reaction.id,
      workflowId: reaction.workflowId,
      triggerField: data.triggerField,
      triggerEvent: data.triggerEvent,
    });

    // Execute the reaction synchronously
    const result: ReactionExecutionResult = await executeReaction({
      reaction,
      formId,
      orgId,
      triggerField: data.triggerField,
      triggerEvent: data.triggerEvent,
      formData: data.formData,
      userId,
      cascadeDepth: 0,
    });

    console.log('[API] Reaction execution result:', {
      formId,
      reactionId: reaction.id,
      status: result.status,
      durationMs: result.durationMs,
      updatesCount: result.result?.updates
        ? Object.keys(result.result.updates).length
        : 0,
    });

    // Determine HTTP status code based on result
    let statusCode = 200;
    if (result.status === 'failed') {
      if (result.error?.code === 'EXECUTION_TIMEOUT') {
        statusCode = 408; // Request Timeout
      } else if (result.error?.code === 'RATE_LIMITED') {
        statusCode = 429; // Too Many Requests
      } else {
        statusCode = 500; // Internal Server Error
      }
    }

    return NextResponse.json(
      {
        success: result.status === 'completed',
        ...result,
      },
      { status: statusCode }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('[API] Error executing reaction:', error);

    return NextResponse.json(
      {
        success: false,
        status: 'failed',
        error: {
          message,
          code: 'INTERNAL_ERROR',
        },
      },
      { status: 500 }
    );
  }
}
