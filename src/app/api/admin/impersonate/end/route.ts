/**
 * End User Impersonation API
 *
 * POST: End impersonation and restore admin session
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession, endImpersonation } from '@/lib/auth/session';
import { getPlatformDb } from '@/lib/platform/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if actually impersonating
    if (!session.impersonating) {
      return NextResponse.json(
        { error: 'Not currently impersonating anyone' },
        { status: 400 }
      );
    }

    const impersonationInfo = session.impersonating;

    // Log the end of impersonation for audit trail
    const platformDb = await getPlatformDb();
    await platformDb.collection('admin_audit_log').insertOne({
      action: 'impersonation_end',
      adminUserId: impersonationInfo.originalUserId,
      adminEmail: impersonationInfo.originalEmail,
      targetUserId: impersonationInfo.targetUserId,
      targetEmail: impersonationInfo.targetEmail,
      timestamp: new Date(),
      duration: Date.now() - impersonationInfo.startedAt,
      userAgent: req.headers.get('user-agent'),
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
    });

    // End impersonation
    await endImpersonation();

    console.log(`[Admin Impersonate] Admin ${impersonationInfo.originalEmail} stopped impersonating ${impersonationInfo.targetEmail}`);

    return NextResponse.json({
      success: true,
      message: 'Impersonation ended. Restored to admin view.',
      adminUser: {
        userId: impersonationInfo.originalUserId,
        email: impersonationInfo.originalEmail,
      },
    });
  } catch (error) {
    console.error('[Admin Impersonate] Error ending impersonation:', error);
    return NextResponse.json(
      { error: 'Failed to end impersonation' },
      { status: 500 }
    );
  }
}
