/**
 * npm Registry Client
 * 
 * Client for interacting with the npm registry API
 * Uses native fetch (available in Node.js 18+)
 */
import { NpmPackageMetadata, DiscoveredPackage, NetPadPackageJson } from '@/types/npm-package';
import { NetPadPackageConfig } from '@/types/npm-package';
import { isOfficialPackage } from './package-structure';

/**
 * npm Registry API base URL
 */
const NPM_REGISTRY_URL = 'https://registry.npmjs.org';

/**
 * Search npm registry for packages
 * 
 * @param query - Search query
 * @param options - Search options
 * @returns Search results
 */
export async function searchNpmRegistry(
  query: string,
  options: {
    size?: number;
    from?: number;
  } = {}
): Promise<{
  objects: Array<{
    package: {
      name: string;
      version: string;
      description?: string;
      keywords?: string[];
      author?: string | { name: string; email?: string; url?: string };
      repository?: { type: string; url: string };
      homepage?: string;
      publishedAt?: string;
      publisher?: {
        username: string;
        email: string;
      };
    };
    score: {
      final: number;
      detail: {
        quality: number;
        popularity: number;
        maintenance: number;
      };
    };
  }>;
  total: number;
}> {
  try {
    const { size = 250, from = 0 } = options;
    const searchUrl = `${NPM_REGISTRY_URL}/-/v1/search?text=${encodeURIComponent(query)}&size=${size}&from=${from}`;
    
    const response = await fetch(searchUrl, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`npm registry search failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[npm Registry] Search error:', error);
    throw error;
  }
}

/**
 * Fetch package metadata from npm registry
 * 
 * @param packageName - Package name (e.g., "@netpad/app-customer-feedback")
 * @param version - Optional version (defaults to latest)
 * @returns Package metadata
 */
export async function fetchPackageMetadata(
  packageName: string,
  version?: string
): Promise<NpmPackageMetadata | null> {
  try {
    const packageUrl = `${NPM_REGISTRY_URL}/${encodeURIComponent(packageName)}`;
    
    const response = await fetch(packageUrl, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch package metadata: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Get target version
    let targetVersion: string;
    let versionData: any;
    
    if (version) {
      // Fetch specific version
      versionData = data.versions?.[version];
      if (!versionData) {
        return null;
      }
      targetVersion = version;
    } else {
      // Get latest version
      targetVersion = data['dist-tags']?.latest || Object.keys(data.versions || {})[0];
      if (!targetVersion || !data.versions[targetVersion]) {
        return null;
      }
      versionData = data.versions[targetVersion];
    }
    const dist = versionData.dist || {};

    return {
      name: data.name,
      version: targetVersion,
      description: versionData.description,
      keywords: versionData.keywords || [],
      author: versionData.author,
      license: versionData.license,
      repository: versionData.repository,
      homepage: versionData.homepage,
      dist: {
        tarball: dist.tarball || `${NPM_REGISTRY_URL}/${encodeURIComponent(packageName)}/-/${packageName}-${latestVersion}.tgz`,
        shasum: dist.shasum,
        integrity: dist.integrity,
      },
      publishedAt: versionData.time || data.time?.[targetVersion],
      publisher: versionData.publisher || data.publishers?.[0],
    };
  } catch (error) {
    console.error(`[npm Registry] Fetch error for ${packageName}:`, error);
    return null;
  }
}

/**
 * Fetch package.json from npm registry
 * 
 * @param packageName - Package name
 * @param version - Package version (optional, defaults to latest)
 * @returns Package.json content
 */
export async function fetchPackageJson(
  packageName: string,
  version?: string
): Promise<any | null> {
  try {
    const packageUrl = version
      ? `${NPM_REGISTRY_URL}/${encodeURIComponent(packageName)}/${encodeURIComponent(version)}`
      : `${NPM_REGISTRY_URL}/${encodeURIComponent(packageName)}`;
    
    const response = await fetch(packageUrl, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch package.json: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (version) {
      // Return specific version
      return data.versions?.[version] || null;
    }

    // Return latest version
    const latestVersion = data['dist-tags']?.latest || Object.keys(data.versions || {})[0];
    return data.versions?.[latestVersion] || null;
  } catch (error) {
    console.error(`[npm Registry] Fetch package.json error for ${packageName}:`, error);
    return null;
  }
}

/**
 * Fetch package.json for a specific version
 * 
 * @param packageName - Package name
 * @param version - Package version (or 'latest')
 * @returns Package.json with netpad field
 */
export async function fetchPackageVersion(
  packageName: string,
  version: string = 'latest'
): Promise<(NetPadPackageJson & { version: string }) | null> {
  try {
    const packageJson = await fetchPackageJson(packageName, version === 'latest' ? undefined : version);
    if (!packageJson) {
      return null;
    }
    
    return packageJson as NetPadPackageJson & { version: string };
  } catch (error) {
    console.error(`[npm Registry] Fetch package version error for ${packageName}@${version}:`, error);
    return null;
  }
}

/**
 * Download package tarball
 * 
 * @param packageName - Package name
 * @param version - Package version
 * @returns Tarball buffer
 */
export async function downloadPackageTarball(
  packageName: string,
  version: string
): Promise<Buffer> {
  try {
    // Get package metadata to find tarball URL
    const metadata = await fetchPackageMetadata(packageName, version);
    if (!metadata || !metadata.dist.tarball) {
      throw new Error(`Package ${packageName}@${version} not found or missing tarball`);
    }

    // Fetch tarball
    const tarballResponse = await fetch(metadata.dist.tarball, {
      headers: {
        'Accept': 'application/octet-stream',
      },
    });

    if (!tarballResponse.ok) {
      throw new Error(`Failed to fetch tarball: ${tarballResponse.status} ${tarballResponse.statusText}`);
    }

    // Convert response to buffer
    const arrayBuffer = await tarballResponse.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error(`[npm Registry] Download tarball error for ${packageName}@${version}:`, error);
    throw error;
  }
}

/**
 * Fetch bundle.json from npm package tarball
 * 
 * @param packageName - Package name
 * @param version - Package version (optional, defaults to latest)
 * @returns Bundle.json content
 */
export async function fetchBundleJson(
  packageName: string,
  version?: string
): Promise<any | null> {
  try {
    // Download tarball
    const metadata = await fetchPackageMetadata(packageName, version);
    if (!metadata) {
      return null;
    }
    
    const tarball = await downloadPackageTarball(packageName, metadata.version);
    
    // Extract bundle.json from tarball
    // This is handled by package-importer.ts extractBundleFromTarball function
    // For now, return null and let the importer handle it
    return null;
  } catch (error) {
    console.error(`[npm Registry] Fetch bundle.json error for ${packageName}:`, error);
    return null;
  }
}

/**
 * Check if package exists in npm registry
 * 
 * @param packageName - Package name
 * @returns true if package exists
 */
export async function packageExists(packageName: string): Promise<boolean> {
  const metadata = await fetchPackageMetadata(packageName);
  return metadata !== null;
}

/**
 * Get all versions of a package
 * 
 * @param packageName - Package name
 * @returns Array of version strings
 */
export async function getPackageVersions(packageName: string): Promise<string[]> {
  try {
    const packageUrl = `${NPM_REGISTRY_URL}/${encodeURIComponent(packageName)}`;
    
    const response = await fetch(packageUrl, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (response.status === 404) {
      return [];
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch package versions: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return Object.keys(data.versions || {});
  } catch (error) {
    console.error(`[npm Registry] Get versions error for ${packageName}:`, error);
    return [];
  }
}
