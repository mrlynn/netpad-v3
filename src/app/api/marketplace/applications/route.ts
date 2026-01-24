/**
 * Marketplace Applications API
 *
 * GET /api/marketplace/applications - List available applications
 * POST /api/marketplace/applications - Publish an application to marketplace
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getPlatformDb } from '@/lib/platform/db';
import {
  BundleExport,
  ApplicationManifest,
  MarketplaceItemType,
  MarketplaceBundle,
  FormBundle,
  WorkflowBundle,
  ExtensionBundle,
  isFormBundle,
  isWorkflowBundle,
  isApplicationBundle,
  isExtensionBundle,
} from '@/types/template';
import { getApplicationReleasesCollection } from '@/lib/platform/db';
import { buildBundleFromRelease } from '@/lib/marketplace/release-bundle';

export const dynamic = 'force-dynamic';

export type MarketplaceApplicationStatus = 'pending' | 'approved' | 'rejected';

interface MarketplaceApplication {
  id: string;
  /** Item type: application (bundle), form (standalone), or workflow (standalone) */
  itemType: MarketplaceItemType;
  manifest: ApplicationManifest;
  bundle: MarketplaceBundle;
  published: boolean;
  status: MarketplaceApplicationStatus;
  isOfficial: boolean; // NetPad/MongoDB official vs community package
  publishedAt?: string;
  publishedBy?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  // Source tracking
  source?: 'web' | 'npm'; // Package source: 'web' for marketplace-published, 'npm' for npm packages
  sourceOrgId?: string;
  sourceProjectId?: string;
  sourceApplicationId?: string;
  sourceReleaseId?: string;
  sourcePackageName?: string; // For npm packages: the npm package name
  // Version history (Phase 6)
  versions?: Array<{
    version: string;
    releaseId?: string;
    changelog?: string;
    publishedAt: Date | string;
    publishedBy: string;
  }>;
  latestVersion?: string;
  latestVersionPublishedAt?: string;
  stats: {
    downloads: number;
    rating?: number;
    reviews: number;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * GET /api/marketplace/applications
 * List marketplace items with filtering and search
 * Supports three item types: application (bundles), form (standalone), workflow (standalone)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const tags = searchParams.get('tags')?.split(',').filter(Boolean);
    const search = searchParams.get('search');
    const sort = searchParams.get('sort') || 'popular'; // popular, recent, rating
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const publishedBy = searchParams.get('publishedBy'); // Filter by publisher (for My Applications)
    const source = searchParams.get('source'); // Filter by source: 'web', 'npm', or undefined (all)
    const itemType = searchParams.get('itemType'); // Filter by item type: 'all', 'application', 'form', 'workflow'

    const db = await getPlatformDb();
    const collection = db.collection<MarketplaceApplication>('marketplace_applications');

    // Build query
    // If publishedBy is specified, show all apps by that user (including drafts)
    // Otherwise, only show approved and published applications
    const queryConditions: any[] = [];

    if (publishedBy) {
      // My Applications view - show all apps by this user
      queryConditions.push({ publishedBy });
    } else {
      // Public marketplace - only show approved and published
      // Handle legacy applications that might not have status field (treat published=true as approved)
      queryConditions.push(
        { published: true },
        {
          $or: [
            { status: 'approved' },
            { status: { $exists: false } }, // Legacy apps without status field
          ],
        }
      );
    }

    if (category) {
      queryConditions.push({ 'manifest.category': category });
    }

    if (tags && tags.length > 0) {
      queryConditions.push({ 'manifest.tags': { $in: tags } });
    }

    // Filter by source (web or npm)
    if (source === 'web' || source === 'npm') {
      queryConditions.push({ source });
    }

    // Filter by item type (application, form, workflow, extension)
    // Default behavior: 'all' returns everything, with applications sorted first
    // Handle legacy items that don't have itemType field (treat as 'application')
    if (itemType && itemType !== 'all') {
      if (itemType === 'application') {
        // Include both explicit 'application' and legacy items without itemType
        queryConditions.push({
          $or: [
            { itemType: 'application' },
            { itemType: { $exists: false } },
          ],
        });
      } else if (itemType === 'form' || itemType === 'workflow' || itemType === 'extension') {
        queryConditions.push({ itemType });
      }
    }

    // Filter by official vs community
    // Handle legacy applications that might not have isOfficial field (treat missing as false/community)
    const isOfficialParam = searchParams.get('isOfficial');
    if (isOfficialParam === 'true') {
      queryConditions.push({ isOfficial: true });
    } else if (isOfficialParam === 'false') {
      // Include both false and missing (legacy apps are treated as community)
      queryConditions.push({
        $or: [
          { isOfficial: false },
          { isOfficial: { $exists: false } },
        ],
      });
    }

    if (search) {
      queryConditions.push({
        $or: [
          { 'manifest.name': { $regex: search, $options: 'i' } },
          { 'manifest.description': { $regex: search, $options: 'i' } },
          { 'manifest.summary': { $regex: search, $options: 'i' } },
        ],
      });
    }

    // Filter by minimum rating
    const minRatingParam = searchParams.get('minRating');
    if (minRatingParam) {
      const minRating = parseFloat(minRatingParam);
      if (!isNaN(minRating) && minRating > 0) {
        queryConditions.push({
          'stats.rating': { $gte: minRating },
        });
      }
    }

    const query = queryConditions.length > 1 ? { $and: queryConditions } : queryConditions[0];

    // Build sort
    let sortQuery: any = {};
    switch (sort) {
      case 'popular':
        sortQuery = { 'stats.downloads': -1, 'stats.rating': -1 };
        break;
      case 'recent':
        sortQuery = { publishedAt: -1 };
        break;
      case 'rating':
        sortQuery = { 'stats.rating': -1, 'stats.reviews': -1 };
        break;
      case 'rating-low':
        sortQuery = { 'stats.rating': 1, 'stats.reviews': -1 };
        break;
      case 'reviews':
        sortQuery = { 'stats.reviews': -1, 'stats.rating': -1 };
        break;
      default:
        sortQuery = { 'stats.downloads': -1 };
    }

    // Get applications
    const applications = await collection
      .find(query)
      .sort(sortQuery)
      .limit(limit)
      .skip(offset)
      .toArray();

    // Get total count
    const total = await collection.countDocuments(query);

    // Format response (exclude full bundle for list view)
    const formatted = applications.map((app) => {
      // Determine the item type (default to 'application' for legacy items)
      const resolvedItemType: MarketplaceItemType = app.itemType || 'application';

      // Build type-specific metadata
      let typeMetadata: Record<string, any> = {};

      if (resolvedItemType === 'application') {
        // Application bundle - show forms, workflows, connections counts
        const bundle = app.bundle as BundleExport;
        typeMetadata = {
          formsCount: bundle.forms?.length || 0,
          workflowsCount: bundle.workflows?.length || 0,
          connectionsCount: bundle.connections?.length || 0,
        };
      } else if (resolvedItemType === 'form') {
        // Standalone form - show form metadata
        const bundle = app.bundle as FormBundle;
        typeMetadata = {
          fieldCount: bundle.formMetadata?.fieldCount || bundle.form?.fieldConfigs?.length || 0,
          formType: bundle.formMetadata?.formType || 'traditional',
          isMultiPage: bundle.formMetadata?.isMultiPage || false,
          hasConditionalLogic: bundle.formMetadata?.hasConditionalLogic || false,
        };
      } else if (resolvedItemType === 'workflow') {
        // Standalone workflow - show workflow metadata
        const bundle = app.bundle as WorkflowBundle;
        typeMetadata = {
          nodeCount: bundle.workflowMetadata?.nodeCount || bundle.workflow?.canvas?.nodes?.length || 0,
          triggerType: bundle.workflowMetadata?.triggerType || 'manual',
          nodeTypes: bundle.workflowMetadata?.nodeTypes || [],
        };
      } else if (resolvedItemType === 'extension') {
        // Extension - show extension metadata
        const bundle = app.bundle as ExtensionBundle;
        typeMetadata = {
          extensionType: bundle.extensionMetadata?.extensionType || 'node',
          nodeCount: bundle.extensionMetadata?.nodeCount || bundle.extension?.workflowNodes?.length || 0,
          nodeCategories: bundle.extensionMetadata?.nodeCategories || [],
          routeCount: bundle.extensionMetadata?.routeCount || bundle.extension?.routes?.length || 0,
          npmPackage: bundle.extensionMetadata?.npmPackage,
          minNetPadVersion: bundle.extensionMetadata?.minNetPadVersion,
          verified: bundle.extensionMetadata?.verified || false,
        };
      }

      return {
        id: app.id,
        itemType: resolvedItemType,
        name: app.manifest.name,
        summary: app.manifest.summary || app.manifest.description,
        description: app.manifest.description,
        version: app.manifest.version,
        category: app.manifest.category,
        tags: app.manifest.tags || [],
        icon: app.manifest.icon,
        author: app.manifest.author,
        license: app.manifest.license,
        stats: app.stats,
        publishedAt: app.publishedAt,
        isOfficial: app.isOfficial,
        source: app.source || 'web', // Default to 'web' for legacy apps
        sourcePackageName: app.sourcePackageName,
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
    console.error('[Marketplace API] List error:', error);
    return NextResponse.json(
      { error: 'Failed to list applications' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/marketplace/applications
 * Publish an item to the marketplace
 * Supports three item types: application (bundles), form (standalone), workflow (standalone)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { bundle, publish, orgId, projectId, applicationId, releaseId, itemType: requestedItemType } = body;

    // Determine the item type - default to 'application' for backward compatibility
    let itemType: MarketplaceItemType = requestedItemType || 'application';
    let publishableBundle: MarketplaceBundle | null = null;

    // Handle standalone form publishing
    if (itemType === 'form') {
      const { form, manifest, formMetadata } = body;
      if (!form && !bundle?.form) {
        return NextResponse.json({ error: 'Form definition is required for form type' }, { status: 400 });
      }
      if (!manifest && !bundle?.manifest) {
        return NextResponse.json({ error: 'Manifest is required' }, { status: 400 });
      }

      const formBundle: FormBundle = {
        form: form || bundle.form,
        theme: body.theme || bundle?.theme,
        formMetadata: formMetadata || bundle?.formMetadata || {
          fieldCount: (form || bundle.form)?.fieldConfigs?.length || 0,
          formType: 'traditional',
          isMultiPage: !!(form || bundle.form)?.multiPage?.enabled,
          hasConditionalLogic: (form || bundle.form)?.fieldConfigs?.some((f: any) => f.conditionalLogic?.enabled) || false,
        },
      };
      publishableBundle = formBundle;
    }
    // Handle standalone workflow publishing
    else if (itemType === 'workflow') {
      const { workflow, manifest, workflowMetadata } = body;
      if (!workflow && !bundle?.workflow) {
        return NextResponse.json({ error: 'Workflow definition is required for workflow type' }, { status: 400 });
      }
      if (!manifest && !bundle?.manifest) {
        return NextResponse.json({ error: 'Manifest is required' }, { status: 400 });
      }

      const workflowBundle: WorkflowBundle = {
        workflow: workflow || bundle.workflow,
        workflowMetadata: workflowMetadata || bundle?.workflowMetadata || {
          nodeCount: (workflow || bundle.workflow)?.canvas?.nodes?.length || 0,
          triggerType: 'manual',
          nodeTypes: [...new Set((workflow || bundle.workflow)?.canvas?.nodes?.map((n: any) => n.type) || [])],
        },
      };
      publishableBundle = workflowBundle;
    }
    // Handle extension publishing
    else if (itemType === 'extension') {
      const { extension, manifest, extensionMetadata } = body;
      if (!extension && !bundle?.extension) {
        return NextResponse.json({ error: 'Extension definition is required for extension type' }, { status: 400 });
      }
      if (!manifest && !bundle?.manifest) {
        return NextResponse.json({ error: 'Manifest is required' }, { status: 400 });
      }

      const ext = extension || bundle.extension;
      const extensionBundle: ExtensionBundle = {
        extension: ext,
        extensionMetadata: extensionMetadata || bundle?.extensionMetadata || {
          extensionType: ext?.workflowNodes?.length > 0 ? 'node' : 'integration',
          nodeCount: ext?.workflowNodes?.length || 0,
          nodeCategories: [...new Set(ext?.workflowNodes?.map((n: any) => n.definition?.category) || [])],
          routeCount: ext?.routes?.length || 0,
          npmPackage: body.npmPackage,
          minNetPadVersion: body.minNetPadVersion,
          verified: false,
        },
      };
      publishableBundle = extensionBundle;
    }
    // Handle application bundle publishing (existing behavior)
    else if (releaseId) {
      // Preferred: publish from a release
      if (!orgId || !projectId || !applicationId) {
        return NextResponse.json(
          { error: 'orgId, projectId, and applicationId are required when publishing from a release' },
          { status: 400 }
        );
      }

      const releasesCol = await getApplicationReleasesCollection(orgId);
      const release = await releasesCol.findOne({ releaseId, applicationId });
      if (!release) {
        return NextResponse.json({ error: 'Release not found' }, { status: 404 });
      }

      const built = await buildBundleFromRelease({
        orgId,
        projectId,
        applicationId,
        release: release as any,
      });

      // Allow optional manifest overrides from the client (e.g., summary/category/tags)
      const manifestOverrides = (body?.manifest || {}) as Partial<ApplicationManifest>;
      publishableBundle = {
        ...built.bundle,
        manifest: {
          ...(built.manifest as ApplicationManifest),
          ...manifestOverrides,
          // Ensure version stays in sync with the release unless explicitly overridden
          version: manifestOverrides.version || built.manifest.version,
          id: manifestOverrides.id || built.manifest.id,
        },
      };
      itemType = 'application';
    } else {
      // Backward-compatible: publish raw bundle
      if (!bundle || !bundle.manifest) {
        return NextResponse.json({ error: 'Bundle with manifest is required' }, { status: 400 });
      }
      publishableBundle = bundle as BundleExport;
      itemType = 'application';
    }

    const db = await getPlatformDb();
    const collection = db.collection<MarketplaceApplication>('marketplace_applications');

    // Get the manifest - for form/workflow/extension types it comes from the request body
    // For application bundles it's part of the bundle
    let manifest: ApplicationManifest;
    if (itemType === 'form' || itemType === 'workflow' || itemType === 'extension') {
      // For standalone forms/workflows/extensions, manifest is passed separately in the body
      manifest = body.manifest as ApplicationManifest;
    } else {
      // For application bundles, manifest is part of the bundle
      manifest = (publishableBundle as BundleExport).manifest as ApplicationManifest;
    }

    // Generate item ID from manifest with type prefix
    const typePrefixMap: Record<MarketplaceItemType, string> = {
      application: 'app',
      form: 'form',
      workflow: 'workflow',
      extension: 'ext',
    };
    const typePrefix = typePrefixMap[itemType] || itemType;
    const appId =
      manifest.id ||
      `${typePrefix}_${manifest.name.toLowerCase().replace(/\s+/g, '-')}_${manifest.version}`;

    // Check if item already exists
    const existing = await collection.findOne({ id: appId });

    const now = new Date().toISOString();
    const version = manifest.version;

    // If updating existing item, add to version history
    let versions = existing?.versions || [];
    if (existing) {
      // Check if this is a new version
      const isNewVersion = version !== existing.manifest.version;
      if (isNewVersion) {
        // Add current version to history if not already there
        const currentVersionInHistory = versions.find(v => v.version === existing.manifest.version);
        if (!currentVersionInHistory && existing.manifest.version) {
          // Convert changelog array to string if it exists
          let changelogStr: string | undefined;
          if (existing.manifest.changelog && Array.isArray(existing.manifest.changelog)) {
            changelogStr = existing.manifest.changelog
              .map(entry => `### ${entry.version} (${entry.date})\n${entry.changes.map(c => `- ${c}`).join('\n')}`)
              .join('\n\n');
          }
          versions.push({
            version: existing.manifest.version,
            releaseId: existing.sourceReleaseId,
            changelog: changelogStr,
            publishedAt: existing.publishedAt ? new Date(existing.publishedAt) : new Date(),
            publishedBy: existing.publishedBy || 'unknown',
          });
        }

        // Add new version to history
        let newChangelogStr: string | undefined;
        if (manifest.changelog && Array.isArray(manifest.changelog)) {
          newChangelogStr = manifest.changelog
            .map(entry => `### ${entry.version} (${entry.date})\n${entry.changes.map(c => `- ${c}`).join('\n')}`)
            .join('\n\n');
        }
        versions.push({
          version: version,
          releaseId: releaseId,
          changelog: newChangelogStr,
          publishedAt: new Date(),
          publishedBy: session.userId,
        });
      }
    } else {
      // New item - initialize version history with first version
      let initialChangelogStr: string | undefined;
      if (manifest.changelog && Array.isArray(manifest.changelog)) {
        initialChangelogStr = manifest.changelog
          .map(entry => `### ${entry.version} (${entry.date})\n${entry.changes.map(c => `- ${c}`).join('\n')}`)
          .join('\n\n');
      }
      versions = [{
        version: version,
        releaseId: releaseId,
        changelog: initialChangelogStr,
        publishedAt: new Date(),
        publishedBy: session.userId,
      }];
    }

    // New submissions start as 'pending' - requires admin approval
    // Existing items keep their current status unless explicitly changed
    // New submissions are community packages by default (isOfficial: false)
    const application: MarketplaceApplication = {
      id: appId,
      itemType, // Item type: 'application', 'form', or 'workflow'
      manifest,
      bundle: publishableBundle!,
      published: false, // Will be set to true when approved
      status: existing?.status || 'pending', // New = pending, existing = keep current status
      isOfficial: existing?.isOfficial || false, // New = community, existing = keep current
      publishedAt: existing?.publishedAt, // Only set when approved
      publishedBy: session.userId,
      reviewedAt: existing?.reviewedAt,
      reviewedBy: existing?.reviewedBy,
      rejectionReason: existing?.rejectionReason,
      sourceOrgId: releaseId ? orgId : undefined,
      sourceProjectId: releaseId ? projectId : undefined,
      sourceApplicationId: releaseId ? applicationId : undefined,
      sourceReleaseId: releaseId ? releaseId : undefined,
      versions: versions, // Version history
      latestVersion: version, // Latest version
      latestVersionPublishedAt: existing ? (version !== existing.manifest.version ? new Date().toISOString() : existing.latestVersionPublishedAt) : now,
      stats: existing?.stats || {
        downloads: 0,
        reviews: 0,
      },
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    if (existing) {
      // Update existing
      await collection.updateOne(
        { id: appId },
        { $set: application }
      );
    } else {
      // Insert new
      await collection.insertOne(application);
    }

    // Generate appropriate message based on item type
    const itemTypeLabel = itemType === 'application' ? 'application' : itemType;
    const pendingMessage = `Your ${itemTypeLabel} has been submitted for review. You will be notified once it has been reviewed by an administrator.`;
    const approvedMessage = `Your ${itemTypeLabel} has been published to the marketplace.`;
    const updatedMessage = `Your ${itemTypeLabel} submission has been updated.`;

    return NextResponse.json({
      success: true,
      item: {
        id: application.id,
        itemType: application.itemType,
        name: application.manifest.name,
        status: application.status,
        published: application.published,
        message: application.status === 'pending'
          ? pendingMessage
          : application.status === 'approved'
          ? approvedMessage
          : updatedMessage,
      },
      // Backward compatibility
      application: {
        id: application.id,
        name: application.manifest.name,
        status: application.status,
        published: application.published,
      },
    });
  } catch (error: any) {
    console.error('[Marketplace API] Publish error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to publish item' },
      { status: 500 }
    );
  }
}
