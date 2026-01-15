/**
 * Package Discovery
 * 
 * Logic for discovering NetPad packages from npm registry
 */

import { searchNpmRegistry, fetchPackageJson, fetchPackageMetadata } from './registry-client';
import { DiscoveredPackage, NetPadPackageConfig } from '@/types/npm-package';
import { isOfficialPackage, extractNetPadConfig, isNetPadPackage } from './package-structure';

/**
 * Discovery keywords for NetPad packages
 */
const DISCOVERY_KEYWORDS = [
  'netpad-app',
  'netpad-plugin',
  'netpad-community-app',
  'netpad-community-plugin',
];

/**
 * Search query for discovering NetPad packages
 * 
 * Note: npm registry search doesn't support OR operators, so we search
 * for packages containing "netpad" in keywords, which will match
 * packages with any of the NetPad-related keywords.
 */
function buildDiscoveryQuery(): string {
  // Search for packages with "netpad" keyword (will match netpad-app, netpad-plugin, etc.)
  return 'netpad';
}

/**
 * Search query for official NetPad packages
 * 
 * Note: npm registry search doesn't support "scope:" prefix.
 * Searching for "@netpad" will find all packages in the @netpad scope.
 */
function buildOfficialPackageQuery(): string {
  return '@netpad';
}

/**
 * Discover NetPad packages from npm registry
 * 
 * @param options - Discovery options
 * @returns Array of discovered packages
 */
export async function discoverNetPadPackages(options: {
  includeOfficial?: boolean;
  includeCommunity?: boolean;
  limit?: number;
} = {}): Promise<DiscoveredPackage[]> {
  const {
    includeOfficial = true,
    includeCommunity = true,
    limit = 250,
  } = options;

  const discovered: DiscoveredPackage[] = [];

  try {
    // Discover official packages (@netpad/ scope)
    if (includeOfficial) {
      const officialQuery = buildOfficialPackageQuery();
      const officialResults = await searchNpmRegistry(officialQuery, { size: limit });
      
      for (const result of officialResults.objects) {
        const packageName = result.package.name;
        
        // Fetch full package.json to get netpad config
        const packageJson = await fetchPackageJson(packageName);
        if (!packageJson || !isNetPadPackage(packageJson)) {
          continue;
        }

        const netpadConfig = extractNetPadConfig(packageJson);
        if (!netpadConfig) {
          continue;
        }

        const metadata = await fetchPackageMetadata(packageName);
        if (!metadata) {
          continue;
        }

        discovered.push({
          name: packageName,
          version: metadata.version,
          description: metadata.description,
          netpad: netpadConfig,
          metadata,
          isOfficial: true,
          isVerified: true, // Official packages are always verified
          publishedAt: metadata.publishedAt,
        });
      }
    }

    // Discover community packages (keyword-based)
    if (includeCommunity) {
      const communityQuery = buildDiscoveryQuery();
      const communityResults = await searchNpmRegistry(communityQuery, { size: limit });
      
      for (const result of communityResults.objects) {
        const packageName = result.package.name;
        
        // Skip official packages (already discovered)
        if (isOfficialPackage(packageName)) {
          continue;
        }

        // Check if package has NetPad keywords in its keywords array
        const packageKeywords = result.package.keywords || [];
        const hasNetPadKeyword = DISCOVERY_KEYWORDS.some(kw => 
          packageKeywords.some((pkgKw: string) => 
            pkgKw.toLowerCase().includes(kw.toLowerCase())
          )
        );
        
        if (!hasNetPadKeyword) {
          continue;
        }

        // Fetch full package.json to get netpad config
        const packageJson = await fetchPackageJson(packageName);
        if (!packageJson || !isNetPadPackage(packageJson)) {
          continue;
        }

        const netpadConfig = extractNetPadConfig(packageJson);
        if (!netpadConfig) {
          continue;
        }

        const metadata = await fetchPackageMetadata(packageName);
        if (!metadata) {
          continue;
        }

        // Check if package is verified (would be stored in database)
        // For now, assume community packages are not verified unless they're official
        const isVerified = false;

        discovered.push({
          name: packageName,
          version: metadata.version,
          description: metadata.description,
          netpad: netpadConfig,
          metadata,
          isOfficial: false,
          isVerified,
          publishedAt: metadata.publishedAt,
        });
      }
    }

    // Remove duplicates (in case a package appears in both searches)
    const uniquePackages = new Map<string, DiscoveredPackage>();
    for (const pkg of discovered) {
      if (!uniquePackages.has(pkg.name) || uniquePackages.get(pkg.name)!.version < pkg.version) {
        uniquePackages.set(pkg.name, pkg);
      }
    }

    return Array.from(uniquePackages.values());
  } catch (error) {
    console.error('[Package Discovery] Error:', error);
    throw error;
  }
}

/**
 * Discover packages by specific criteria
 * 
 * @param criteria - Discovery criteria
 * @returns Array of discovered packages
 */
export async function discoverPackagesByCriteria(criteria: {
  packageName?: string;
  type?: 'application' | 'plugin';
  category?: string;
  verified?: boolean;
  limit?: number;
}): Promise<DiscoveredPackage[]> {
  const allPackages = await discoverNetPadPackages({
    includeOfficial: true,
    includeCommunity: true,
    limit: criteria.limit || 250,
  });

  // Filter by criteria
  return allPackages.filter(pkg => {
    if (criteria.packageName && !pkg.name.includes(criteria.packageName)) {
      return false;
    }
    if (criteria.type && pkg.netpad.type !== criteria.type) {
      return false;
    }
    if (criteria.category && pkg.netpad.category !== criteria.category) {
      return false;
    }
    if (criteria.verified !== undefined && pkg.isVerified !== criteria.verified) {
      return false;
    }
    return true;
  });
}

/**
 * Check for package updates
 * 
 * @param packageName - Package name
 * @param currentVersion - Current installed version
 * @returns Update information or null if no update available
 */
export async function checkPackageUpdate(
  packageName: string,
  currentVersion: string
): Promise<{
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  metadata: any;
} | null> {
  try {
    const metadata = await fetchPackageMetadata(packageName);
    if (!metadata) {
      return null;
    }

    const updateAvailable = metadata.version !== currentVersion;

    return {
      currentVersion,
      latestVersion: metadata.version,
      updateAvailable,
      metadata,
    };
  } catch (error) {
    console.error(`[Package Discovery] Check update error for ${packageName}:`, error);
    return null;
  }
}
