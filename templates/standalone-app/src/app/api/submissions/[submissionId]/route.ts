/**
 * Single Submission API
 *
 * GET /api/submissions/[submissionId] - Get submission details
 * PATCH /api/submissions/[submissionId] - Update submission status/data
 * DELETE /api/submissions/[submissionId] - Delete submission
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSubmissionsCollection } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ submissionId: string }>;
}

/**
 * Get a single submission by ID
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { submissionId } = await context.params;

    const collection = await getSubmissionsCollection();
    const submission = await collection.findOne({ submissionId });

    if (!submission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      submission,
    });
  } catch (error) {
    console.error('[Submission API] GET Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch submission' },
      { status: 500 }
    );
  }
}

/**
 * Update a submission (status, data, or notes)
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { submissionId } = await context.params;
    const body = await request.json();

    const collection = await getSubmissionsCollection();

    // Check if submission exists
    const existing = await collection.findOne({ submissionId });
    if (!existing) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      );
    }

    // Build update object
    const updateFields: Record<string, any> = {
      updatedAt: new Date(),
    };

    // Update status if provided
    if (body.status) {
      const validStatuses = ['pending', 'submitted', 'processed', 'failed', 'approved', 'rejected'];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json(
          { error: 'Invalid status', validStatuses },
          { status: 400 }
        );
      }
      updateFields.status = body.status;
      if (body.status === 'processed') {
        updateFields.processedAt = new Date();
      }
    }

    // Update data if provided
    if (body.data && typeof body.data === 'object') {
      updateFields.data = { ...existing.data, ...body.data };
    }

    // Update notes if provided
    if (body.notes !== undefined) {
      updateFields.notes = body.notes;
    }

    const result = await collection.findOneAndUpdate(
      { submissionId },
      { $set: updateFields },
      { returnDocument: 'after' }
    );

    return NextResponse.json({
      success: true,
      submission: result,
      message: 'Submission updated successfully',
    });
  } catch (error) {
    console.error('[Submission API] PATCH Error:', error);
    return NextResponse.json(
      { error: 'Failed to update submission' },
      { status: 500 }
    );
  }
}

/**
 * Delete a submission
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { submissionId } = await context.params;

    const collection = await getSubmissionsCollection();

    // Check if submission exists
    const existing = await collection.findOne({ submissionId });
    if (!existing) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      );
    }

    await collection.deleteOne({ submissionId });

    return NextResponse.json({
      success: true,
      message: 'Submission deleted successfully',
    });
  } catch (error) {
    console.error('[Submission API] DELETE Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete submission' },
      { status: 500 }
    );
  }
}
