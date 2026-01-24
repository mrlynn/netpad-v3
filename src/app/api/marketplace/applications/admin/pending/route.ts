/**
 * Admin Marketplace Review API
 *
 * GET /api/marketplace/applications/admin/pending - List pending applications for review
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getPlatformDb } from '@/lib/platform/db';
import { isPlatformAdmin } from '@/lib/platform/users';
import { MarketplaceItemType } from '@/types/template';

type MarketplaceApplicationStatus = 'pending' | 'approved' | 'rejected';

export const dynamic = 'force-dynamic';

interface MarketplaceApplication {
  id: string;
  itemType?: MarketplaceItemType;
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
    const formatted = applications.map((app) => {
      // Determine item type (default to 'application' for legacy items)
      const itemType: MarketplaceItemType = app.itemType || 'application';

      // Build type-specific metadata
      let typeMetadata: Record<string, any> = {};

      if (itemType === 'application') {
        // Application bundle - show forms, workflows, connections counts
        typeMetadata = {
          formsCount: app.bundle?.forms?.length || 0,
          workflowsCount: app.bundle?.workflows?.length || 0,
          connectionsCount: app.bundle?.connections?.length || 0,
        };
      } else if (itemType === 'form') {
        // Standalone form
        typeMetadata = {
          fieldCount: app.bundle?.formMetadata?.fieldCount || app.bundle?.form?.fieldConfigs?.length || 0,
          formType: app.bundle?.formMetadata?.formType || 'traditional',
          isMultiPage: app.bundle?.formMetadata?.isMultiPage || false,
          hasConditionalLogic: app.bundle?.formMetadata?.hasConditionalLogic || false,
        };
      } else if (itemType === 'workflow') {
        // Standalone workflow
        typeMetadata = {
          nodeCount: app.bundle?.workflowMetadata?.nodeCount || app.bundle?.workflow?.canvas?.nodes?.length || 0,
          triggerType: app.bundle?.workflowMetadata?.triggerType || 'manual',
          nodeTypes: app.bundle?.workflowMetadata?.nodeTypes || [],
        };
      } else if (itemType === 'extension') {
        // Extension
        typeMetadata = {
          extensionType: app.bundle?.extensionMetadata?.extensionType || 'node',
          nodeCount: app.bundle?.extensionMetadata?.nodeCount || app.bundle?.extension?.workflowNodes?.length || 0,
          nodeCategories: app.bundle?.extensionMetadata?.nodeCategories || [],
          routeCount: app.bundle?.extensionMetadata?.routeCount || app.bundle?.extension?.routes?.length || 0,
          npmPackage: app.bundle?.extensionMetadata?.npmPackage,
          minNetPadVersion: app.bundle?.extensionMetadata?.minNetPadVersion,
          verified: app.bundle?.extensionMetadata?.verified || false,
        };
      }

      return {
        id: app.id,
        itemType,
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
        stats: app.stats,
        sourceOrgId: app.sourceOrgId,
        sourceProjectId: app.sourceProjectId,
        sourceApplicationId: app.sourceApplicationId,
        sourceReleaseId: app.sourceReleaseId,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
        ...typeMetadata,
      };
    });

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
