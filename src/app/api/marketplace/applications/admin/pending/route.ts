/**
 * Admin Marketplace Review API
 *
 * GET /api/marketplace/applications/admin/pending - List pending applications for review
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
  sourceOrgId?: string;
  sourceProjectId?: string;
  sourceApplicationId?: string;
  sourceReleaseId?: string;
  stats: {
    downloads: number;
    rating?: number;
    reviews: number;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * GET /api/marketplace/applications/admin/pending
 * List pending applications for admin review
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending'; // pending, approved, rejected
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const db = await getPlatformDb();
    const collection = db.collection<MarketplaceApplication>('marketplace_applications');

    // Build query
    const query: any = {};
    if (status === 'pending') {
      query.status = 'pending';
    } else if (status === 'approved') {
      query.status = 'approved';
    } else if (status === 'rejected') {
      query.status = 'rejected';
    } else {
      // All statuses
      query.status = { $in: ['pending', 'approved', 'rejected'] };
    }

    // Get applications
    const applications = await collection
      .find(query)
      .sort({ createdAt: -1 }) // Newest first
      .limit(limit)
      .skip(offset)
      .toArray();

    // Get total count
    const total = await collection.countDocuments(query);

    // Format response
    const formatted = applications.map((app) => ({
      id: app.id,
      name: app.manifest.name,
      summary: app.manifest.summary || app.manifest.description,
      description: app.manifest.description,
      version: app.manifest.version,
      category: app.manifest.category,
      tags: app.manifest.tags || [],
      icon: app.manifest.icon,
      author: app.manifest.author,
      license: app.manifest.license,
      status: app.status,
      published: app.published,
      isOfficial: app.isOfficial,
      publishedAt: app.publishedAt,
      publishedBy: app.publishedBy,
      reviewedAt: app.reviewedAt,
      reviewedBy: app.reviewedBy,
      rejectionReason: app.rejectionReason,
      formsCount: app.bundle.forms?.length || 0,
      workflowsCount: app.bundle.workflows?.length || 0,
      connectionsCount: app.bundle.connections?.length || 0,
      stats: app.stats,
      sourceOrgId: app.sourceOrgId,
      sourceProjectId: app.sourceProjectId,
      sourceApplicationId: app.sourceApplicationId,
      sourceReleaseId: app.sourceReleaseId,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
    }));

    return NextResponse.json({
      applications: formatted,
      total,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('[Marketplace Admin API] List pending error:', error);
    return NextResponse.json(
      { error: 'Failed to list pending applications' },
      { status: 500 }
    );
  }
}
