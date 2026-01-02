import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { connectDB } from '@/lib/mongodb';
import {
  OnboardingSubmission,
  OnboardingStatus,
  UpdateSubmissionRequest,
} from '@/types/onboarding';

// Session configuration
const sessionOptions = {
  password: process.env.SESSION_SECRET || 'complex_password_at_least_32_characters_long_for_development',
  cookieName: 'onboarding_admin_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax' as const,
  },
};

interface OnboardingAdminSession {
  isAuthenticated: boolean;
}

/**
 * Get single submission
 * GET /api/onboarding/submissions/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check authentication
    const session = await getIronSession<OnboardingAdminSession>(
      await cookies(),
      sessionOptions
    );

    if (!session.isAuthenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch submission
    const db = await connectDB();
    const collection = db.collection<OnboardingSubmission>('onboarding_submissions');

    const submission = await collection.findOne({ submissionId: id });

    if (!submission) {
      return NextResponse.json(
        { success: false, error: 'Submission not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, submission });
  } catch (error) {
    console.error('Get submission error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch submission' },
      { status: 500 }
    );
  }
}

/**
 * Update submission (status change)
 * PATCH /api/onboarding/submissions/[id]
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: UpdateSubmissionRequest = await request.json();

    // Check authentication
    const session = await getIronSession<OnboardingAdminSession>(
      await cookies(),
      sessionOptions
    );

    if (!session.isAuthenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Validate status
    const validStatuses: OnboardingStatus[] = [
      'draft',
      'submitted',
      'under_review',
      'approved',
      'rejected',
    ];

    if (body.status && !validStatuses.includes(body.status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status' },
        { status: 400 }
      );
    }

    // Update submission
    const db = await connectDB();
    const collection = db.collection<OnboardingSubmission>('onboarding_submissions');

    const now = new Date();
    const updateFields: Record<string, any> = {
      updatedAt: now,
    };

    if (body.status) {
      updateFields.status = body.status;
      updateFields.$push = {
        statusHistory: {
          status: body.status,
          changedAt: now,
          notes: body.notes,
        },
      };
    }

    const result = await collection.findOneAndUpdate(
      { submissionId: id },
      body.status
        ? {
            $set: { status: body.status, updatedAt: now },
            $push: {
              statusHistory: {
                status: body.status,
                changedAt: now,
                notes: body.notes,
              },
            },
          }
        : { $set: updateFields },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Submission not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, submission: result });
  } catch (error) {
    console.error('Update submission error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update submission' },
      { status: 500 }
    );
  }
}

/**
 * Delete submission
 * DELETE /api/onboarding/submissions/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check authentication
    const session = await getIronSession<OnboardingAdminSession>(
      await cookies(),
      sessionOptions
    );

    if (!session.isAuthenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Delete submission
    const db = await connectDB();
    const collection = db.collection<OnboardingSubmission>('onboarding_submissions');

    const result = await collection.deleteOne({ submissionId: id });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Submission not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete submission error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete submission' },
      { status: 500 }
    );
  }
}
