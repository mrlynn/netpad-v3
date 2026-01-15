/**
 * Admin Marketplace Review API
 *
 * PUT /api/marketplace/applications/[id]/review - Approve or reject an application
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getPlatformDb } from '@/lib/platform/db';
import { isPlatformAdmin } from '@/lib/platform/users';
type MarketplaceApplicationStatus = 'pending' | 'approved' | 'rejected';

export const dynamic = 'force-dynamic';

interface MarketplaceApplication {
  id: string;
  manifest: any;
  bundle: any;
  published: boolean;
  status: MarketplaceApplicationStatus;
  isOfficial: boolean;
  publishedAt?: string;
  publishedBy?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  stats: {
    downloads: number;
    rating?: number;
    reviews: number;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * PUT /api/marketplace/applications/[id]/review
 * Approve or reject a marketplace application
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if user is platform admin
    const isAdmin = await isPlatformAdmin(session.userId);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action, rejectionReason, isOfficial } = body; // action: 'approve' | 'reject', isOfficial: boolean

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      );
    }

    if (action === 'reject' && !rejectionReason?.trim()) {
      return NextResponse.json(
        { error: 'Rejection reason is required when rejecting an application' },
        { status: 400 }
      );
    }

    const db = await getPlatformDb();
    const collection = db.collection<MarketplaceApplication>('marketplace_applications');

    const application = await collection.findOne({ id });
    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const update: Partial<MarketplaceApplication> = {
      updatedAt: now,
      reviewedAt: now,
      reviewedBy: session.userId,
    };

    if (action === 'approve') {
      update.status = 'approved';
      update.published = true;
      update.publishedAt = now;
      update.rejectionReason = undefined; // Clear any previous rejection reason
      // Allow setting isOfficial flag when approving
      if (typeof isOfficial === 'boolean') {
        update.isOfficial = isOfficial;
      }
    } else {
      update.status = 'rejected';
      update.published = false;
      update.rejectionReason = rejectionReason?.trim();
    }

    await collection.updateOne({ id }, { $set: update });

    return NextResponse.json({
      success: true,
      application: {
        id: application.id,
        name: application.manifest.name,
        status: update.status,
        published: update.published,
      },
    });
  } catch (error: any) {
    console.error('[Marketplace Admin API] Review error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to review application' },
      { status: 500 }
    );
  }
}
