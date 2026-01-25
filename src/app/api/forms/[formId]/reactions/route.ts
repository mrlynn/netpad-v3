/**
 * Form Reactions API - List and Create
 *
 * GET  /api/forms/[formId]/reactions - List all reactions for a form
 * POST /api/forms/[formId]/reactions - Create a new reaction
 */

import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { getSession } from '@/lib/auth/session';
import { getOrgFormsCollection } from '@/lib/platform/db';
import { getWorkflowById } from '@/lib/workflow/db';
import { validateCreateReaction } from '@/lib/reactions/validation';
import type { FormReaction } from '@/types/reactions';

export const dynamic = 'force-dynamic';

/**
 * GET - List all reactions for a form
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { formId } = await params;

    // Check authentication
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get orgId from query params
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');

    if (!orgId) {
      return NextResponse.json(
        { success: false, error: 'orgId query parameter is required' },
        { status: 400 }
      );
    }

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

    // Return reactions (or empty array if none)
    const reactions = (form.reactions || []) as FormReaction[];

    return NextResponse.json({
      success: true,
      reactions,
      total: reactions.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('[API] Error listing reactions:', error);

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a new reaction
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { formId } = await params;

    // Check authentication
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

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

    const validation = validateCreateReaction(body);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, errors: validation.errors },
        { status: 400 }
      );
    }

    const data = body as Record<string, unknown>;

    // Verify workflow exists and is accessible
    const workflow = await getWorkflowById(orgId, data.workflowId as string);
    if (!workflow) {
      return NextResponse.json(
        { success: false, error: 'Workflow not found' },
        { status: 400 }
      );
    }

    // Load form to verify it exists
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

    // Create the reaction
    const now = new Date();
    const reaction: FormReaction = {
      id: `reaction_${nanoid(12)}`,
      name: data.name as string,
      description: data.description as string | undefined,
      workflowId: data.workflowId as string,
      trigger: data.trigger as FormReaction['trigger'],
      execution: data.execution as FormReaction['execution'],
      feedback: data.feedback as FormReaction['feedback'],
      enabled: data.enabled !== false, // Default to enabled
      createdAt: now,
      updatedAt: now,
    };

    // Push reaction to form's reactions array
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await formsCollection.findOneAndUpdate(
      { $or: [{ formId }, { id: formId }] },
      {
        $push: { reactions: reaction },
        $set: { updatedAt: now },
      } as any,
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Failed to create reaction' },
        { status: 500 }
      );
    }

    console.log('[API] Created reaction:', {
      formId,
      reactionId: reaction.id,
      workflowId: reaction.workflowId,
    });

    return NextResponse.json(
      { success: true, reaction },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('[API] Error creating reaction:', error);

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
