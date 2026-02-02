/**
 * Form Reactions API - Get, Update, Delete
 *
 * GET    /api/forms/[formId]/reactions/[reactionId] - Get a single reaction
 * PUT    /api/forms/[formId]/reactions/[reactionId] - Update a reaction
 * DELETE /api/forms/[formId]/reactions/[reactionId] - Delete a reaction
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getOrgFormsCollection } from '@/lib/platform/db';
import { getWorkflowById } from '@/lib/workflow/db';
import { validateUpdateReaction } from '@/lib/reactions/validation';
import type { FormReaction } from '@/types/reactions';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ formId: string; reactionId: string }>;
}

/**
 * GET - Get a single reaction by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { formId, reactionId } = await params;

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

    // Find the reaction
    const reactions = (form.reactions || []) as FormReaction[];
    const reaction = reactions.find((r) => r.id === reactionId);

    if (!reaction) {
      return NextResponse.json(
        { success: false, error: 'Reaction not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, reaction });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('[API] Error getting reaction:', error);

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update a reaction
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { formId, reactionId } = await params;

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

    const validation = validateUpdateReaction(body);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, errors: validation.errors },
        { status: 400 }
      );
    }

    const data = body as Record<string, unknown>;

    // If workflowId is being updated, verify the new workflow exists
    if (data.workflowId) {
      const workflow = await getWorkflowById(orgId, data.workflowId as string);
      if (!workflow) {
        return NextResponse.json(
          { success: false, error: 'Workflow not found' },
          { status: 400 }
        );
      }
    }

    // Load form to verify it exists and has this reaction
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

    // Verify reaction exists
    const reactions = (form.reactions || []) as FormReaction[];
    const existingReaction = reactions.find((r) => r.id === reactionId);

    if (!existingReaction) {
      return NextResponse.json(
        { success: false, error: 'Reaction not found' },
        { status: 404 }
      );
    }

    // Build update object for MongoDB arrayFilters
    const now = new Date();
    const updateFields: Record<string, unknown> = {
      'reactions.$[elem].updatedAt': now,
    };

    if (data.name !== undefined) {
      updateFields['reactions.$[elem].name'] = data.name;
    }
    if (data.description !== undefined) {
      updateFields['reactions.$[elem].description'] = data.description;
    }
    if (data.workflowId !== undefined) {
      updateFields['reactions.$[elem].workflowId'] = data.workflowId;
    }
    if (data.trigger !== undefined) {
      updateFields['reactions.$[elem].trigger'] = data.trigger;
    }
    if (data.execution !== undefined) {
      updateFields['reactions.$[elem].execution'] = data.execution;
    }
    if (data.feedback !== undefined) {
      updateFields['reactions.$[elem].feedback'] = data.feedback;
    }
    if (data.enabled !== undefined) {
      updateFields['reactions.$[elem].enabled'] = data.enabled;
    }

    // Update the reaction using arrayFilters
    const result = await formsCollection.findOneAndUpdate(
      { $or: [{ formId }, { id: formId }] },
      {
        $set: {
          ...updateFields,
          updatedAt: now,
        },
      },
      {
        arrayFilters: [{ 'elem.id': reactionId }],
        returnDocument: 'after',
      }
    );

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Failed to update reaction' },
        { status: 500 }
      );
    }

    // Find the updated reaction
    const updatedReactions = (result.reactions || []) as FormReaction[];
    const updatedReaction = updatedReactions.find((r) => r.id === reactionId);

    console.log('[API] Updated reaction:', {
      formId,
      reactionId,
      updatedFields: Object.keys(data),
    });

    return NextResponse.json({ success: true, reaction: updatedReaction });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('[API] Error updating reaction:', error);

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete a reaction
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { formId, reactionId } = await params;

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

    // Verify reaction exists
    const reactions = (form.reactions || []) as FormReaction[];
    const existingReaction = reactions.find((r) => r.id === reactionId);

    if (!existingReaction) {
      return NextResponse.json(
        { success: false, error: 'Reaction not found' },
        { status: 404 }
      );
    }

    // Remove the reaction using $pull
    
    const result = await formsCollection.findOneAndUpdate(
      { $or: [{ formId }, { id: formId }] },
      {
        $pull: { reactions: { id: reactionId } },
        $set: { updatedAt: new Date() },
      } as any,
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete reaction' },
        { status: 500 }
      );
    }

    console.log('[API] Deleted reaction:', {
      formId,
      reactionId,
    });

    return NextResponse.json({
      success: true,
      deletedId: reactionId,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('[API] Error deleting reaction:', error);

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
