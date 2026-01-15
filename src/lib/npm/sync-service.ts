/**
 * npm Registry Sync Service
 * 
 * Background service to sync npm packages with marketplace database
 */

import { getPlatformDb } from '@/lib/platform/db';
import { discoverNetPadPackages, discoverPackagesByCriteria } from './package-discovery';
import { fetchPackageMetadata, fetchPackageJson } from './registry-client';
import { DiscoveredPackage } from '@/types/npm-package';
import { isOfficialPackage } from './package-structure';

/**
 * Sync status
 */
export interface SyncStatus {
  lastSyncAt: Date | null;
  packagesDiscovered: number;
  packagesUpdated: number;
  packagesNew: number;
  errors: string[];
}

/**
 * Sync result
 */
export interface SyncResult {
  success: boolean;
  status: SyncStatus;
  duration: number;
}

/**
 * Sync npm registry with marketplace database
 * 
 * @param options - Sync options
 * @returns Sync result
 */
export async function syncNpmRegistry(options: {
  force?: boolean; // Force sync even if recently synced
  includeOfficial?: boolean;
  includeCommunity?: boolean;
} = {}): Promise<SyncResult> {
  const startTime = Date.now();
  const status: SyncStatus = {
    lastSyncAt: null,
    packagesDiscovered: 0,
    packagesUpdated: 0,
    packagesNew: 0,
    errors: [],
  };

  try {
    const db = await getPlatformDb();
    const collection = db.collection('marketplace_applications');

    // Check last sync time (optional - can skip if recently synced)
    const lastSync = await collection.findOne(
      { source: 'npm', _syncMetadata: { $exists: true } },
      { sort: { '_syncMetadata.lastSyncedAt': -1 } }
    );

    const lastSyncAt = lastSync?._syncMetadata?.lastSyncedAt;
    if (lastSyncAt && !options.force) {
      const hoursSinceSync = (Date.now() - new Date(lastSyncAt).getTime()) / (1000 * 60 * 60);
      if (hoursSinceSync < 1) {
        // Synced within last hour, skip
        return {
          success: true,
          status: {
            lastSyncAt: new Date(lastSyncAt),
            packagesDiscovered: 0,
            packagesUpdated: 0,
            packagesNew: 0,
            errors: [],
          },
          duration: Date.now() - startTime,
        };
      }
    }

    // Discover packages from npm registry
    console.log('[npm Sync] Starting package discovery...');
    const discovered = await discoverNetPadPackages({
      includeOfficial: options.includeOfficial !== false,
      includeCommunity: options.includeCommunity !== false,
      limit: 500, // Discover up to 500 packages
    });

    status.packagesDiscovered = discovered.length;
    console.log(`[npm Sync] Discovered ${discovered.length} packages`);

    // Process each discovered package
    for (const pkg of discovered) {
      try {
        await syncPackageToMarketplace(pkg, collection);
        
        // Check if this is a new package or update
        const existing = await collection.findOne({ 
          id: pkg.name,
          source: 'npm',
        });

        if (existing) {
          status.packagesUpdated++;
        } else {
          status.packagesNew++;
        }
      } catch (error) {
        const errorMsg = `Failed to sync ${pkg.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(`[npm Sync] ${errorMsg}`);
        status.errors.push(errorMsg);
      }
    }

    status.lastSyncAt = new Date();

    console.log(`[npm Sync] Complete: ${status.packagesNew} new, ${status.packagesUpdated} updated, ${status.errors.length} errors`);

    return {
      success: status.errors.length === 0,
      status,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    console.error('[npm Sync] Fatal error:', error);
    status.errors.push(`Fatal error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return {
      success: false,
      status,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Sync a single package to marketplace database
 * 
 * @param pkg - Discovered package
 * @param collection - Marketplace applications collection
 */
async function syncPackageToMarketplace(
  pkg: DiscoveredPackage,
  collection: any
): Promise<void> {
  // Fetch full package.json to get complete metadata
  const packageJson = await fetchPackageJson(pkg.name, pkg.version);
  if (!packageJson) {
    throw new Error('Failed to fetch package.json');
  }

  // Build marketplace application document
  const marketplaceApp = {
    id: pkg.name, // Use package name as ID
    manifest: {
      name: pkg.netpad.name,
      version: pkg.version,
      description: pkg.description || pkg.netpad.description,
      summary: pkg.description,
      category: pkg.netpad.category,
      tags: pkg.netpad.tags || [],
      icon: pkg.netpad.icon,
      author: packageJson.author,
      id: pkg.netpad.applicationId || pkg.name,
    },
    bundle: null, // Bundle will be fetched on-demand when installing
    published: true, // npm packages are considered published
    status: pkg.isVerified ? 'approved' : 'pending', // Official packages auto-approved
    isOfficial: pkg.isOfficial,
    publishedAt: pkg.publishedAt || new Date().toISOString(),
    publishedBy: packageJson.author ? (typeof packageJson.author === 'string' ? packageJson.author : packageJson.author.name) : 'unknown',
    reviewedAt: pkg.isVerified ? new Date().toISOString() : undefined,
    reviewedBy: pkg.isVerified ? 'system' : undefined,
    source: 'npm', // Mark as npm-sourced
    sourcePackageName: pkg.name,
    sourceVersion: pkg.version,
    stats: {
      downloads: 0, // Will be updated from npm stats
      reviews: 0,
      rating: undefined,
    },
    createdAt: pkg.publishedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _syncMetadata: {
      lastSyncedAt: new Date().toISOString(),
      syncSource: 'npm-registry',
      packageName: pkg.name,
      packageVersion: pkg.version,
    },
  };

  // Upsert package (update if exists, insert if new)
  await collection.updateOne(
    { id: pkg.name, source: 'npm' },
    { $set: marketplaceApp },
    { upsert: true }
  );
}

/**
 * Sync a specific package by name
 * 
 * @param packageName - Package name to sync
 * @returns Sync result
 */
export async function syncSpecificPackage(packageName: string): Promise<{
  success: boolean;
  package?: DiscoveredPackage;
  error?: string;
}> {
  try {
    const metadata = await fetchPackageMetadata(packageName);
    if (!metadata) {
      return {
        success: false,
        error: `Package ${packageName} not found in npm registry`,
      };
    }

    const packageJson = await fetchPackageJson(packageName);
    if (!packageJson) {
      return {
        success: false,
        error: `Failed to fetch package.json for ${packageName}`,
      };
    }

    // Check if it's a NetPad package
    if (!packageJson.netpad) {
      return {
        success: false,
        error: `Package ${packageName} is not a NetPad package (missing netpad field)`,
      };
    }

    const discovered: DiscoveredPackage = {
      name: packageName,
      version: metadata.version,
      description: metadata.description,
      netpad: packageJson.netpad,
      metadata,
      isOfficial: isOfficialPackage(packageName),
      isVerified: isOfficialPackage(packageName), // Official packages are verified
      publishedAt: metadata.publishedAt,
    };

    // Sync to marketplace
    const db = await getPlatformDb();
    const collection = db.collection('marketplace_applications');
    await syncPackageToMarketplace(discovered, collection);

    return {
      success: true,
      package: discovered,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get sync status
 * 
 * @returns Current sync status
 */
export async function getSyncStatus(): Promise<SyncStatus> {
  try {
    const db = await getPlatformDb();
    const collection = db.collection('marketplace_applications');

    // Find most recent sync
    const lastSync = await collection.findOne(
      { source: 'npm', '_syncMetadata.lastSyncedAt': { $exists: true } },
      { sort: { '_syncMetadata.lastSyncedAt': -1 } }
    );

    // Count npm packages
    const npmPackageCount = await collection.countDocuments({ source: 'npm' });

    return {
      lastSyncAt: lastSync?._syncMetadata?.lastSyncedAt ? new Date(lastSync._syncMetadata.lastSyncedAt) : null,
      packagesDiscovered: npmPackageCount,
      packagesUpdated: 0, // Would need to track this separately
      packagesNew: 0, // Would need to track this separately
      errors: [],
    };
  } catch (error) {
    console.error('[npm Sync] Error getting sync status:', error);
    return {
      lastSyncAt: null,
      packagesDiscovered: 0,
      packagesUpdated: 0,
      packagesNew: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}
