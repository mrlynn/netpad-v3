import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { isPlatformAdmin } from '@/lib/platform/users';
import { approveUser, rejectUser } from '@/lib/platform/waitlist';
import { sendWaitlistApprovalEmail, sendWaitlistRejectionEmail } from '@/lib/auth/waitlist-emails';

interface RouteParams {
  params: Promise<{ userId: string }>;
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await params;

    // Check authentication
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check admin permission
    const isAdmin = await isPlatformAdmin(session.userId);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { action, reason, sendEmail = true } = body;

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject".' },
        { status: 400 }
      );
    }

    if (action === 'reject' && !reason) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      );
    }

    let result;
    if (action === 'approve') {
      result = await approveUser(userId, session.userId);

      if (result.success && result.user && sendEmail) {
        await sendWaitlistApprovalEmail(result.user.email, result.user.displayName);
      }
    } else {
      result = await rejectUser(userId, session.userId, reason);

      if (result.success && result.user && sendEmail) {
        await sendWaitlistRejectionEmail(result.user.email, result.user.displayName, reason);
      }
    }

    if (!result.success) {
      return NextResponse.json(
        { error: 'User not found or update failed' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: action === 'approve' ? 'User approved successfully' : 'User rejected',
      user: result.user,
    });
  } catch (error) {
    console.error('[Admin Waitlist] Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}
