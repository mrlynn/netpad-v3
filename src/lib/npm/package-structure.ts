/**
 * npm Package Structure Utilities
 * 
 * Functions to generate and work with npm package.json structures for NetPad applications
 */

import { NetPadPackageJson, NetPadPackageConfig } from '@/types/npm-package';
import { ApplicationManifest, BundleExport } from '@/types/template';

/**
 * Generate package.json from Application Manifest
 * 
 * @param manifest - Application manifest
 * @param options - Package generation options
 * @returns Complete package.json structure
 */
export function generatePackageJson(
  manifest: ApplicationManifest,
  options: {
    packageName: string;
    author?: string | { name: string; email?: string; url?: string };
    license?: string;
    repository?: { type: string; url: string };
    homepage?: string;
    keywords?: string[];
    isOfficial?: boolean;  // true if @netpad/ scope
  }
): NetPadPackageJson {
  const {
    packageName,
    author,
    license = 'MIT',
    repository,
    homepage,
    keywords = [],
    isOfficial = false,
  } = options;

  // Build keywords array
  const packageKeywords = [
    'netpad',
    'netpad-app',
    ...(isOfficial ? [] : ['netpad-community-app']),
    ...(manifest.category ? [manifest.category] : []),
    ...(manifest.tags || []),
    ...keywords,
  ];

  // Build netpad config from manifest
  const netpadConfig: NetPadPackageConfig = {
    type: 'application',
    applicationId: manifest.id || generateApplicationId(manifest.name),
    name: manifest.name,
    description: manifest.description || manifest.summary || '',
    version: manifest.version,
    minNetPadVersion: manifest.minimumNetpadVersion || manifest.netpadVersion || '3.0.0',
    category: manifest.category,
    tags: manifest.tags,
    icon: manifest.icon,
    screenshots: (manifest as any).screenshots || (manifest.marketplace as any)?.screenshots,
    dependencies: (manifest as any).dependencies ? {
      applications: (manifest as any).dependencies.applications,
      plugins: (manifest as any).dependencies.plugins,
      workflowTemplates: (manifest as any).dependencies.workflowTemplates,
    } : undefined,
    contract: (manifest as any).contract,
    configSchema: (manifest as any).configSchema,
    verified: isOfficial,  // Official packages are always verified
    publisher: isOfficial ? undefined : (manifest.author ? {
      name: typeof manifest.author === 'string' ? manifest.author : manifest.author.name,
      email: typeof manifest.author === 'object' ? manifest.author.email : undefined,
      url: typeof manifest.author === 'object' ? manifest.author.url : undefined,
    } : undefined),
  };

  // Build package.json
  const packageJson: NetPadPackageJson = {
    name: packageName,
    version: manifest.version,
    description: manifest.description || manifest.summary || manifest.name,
    keywords: packageKeywords,
    author: author || manifest.author,
    license,
    main: 'dist/bundle.json',
    files: [
      'dist/bundle.json',
      'README.md',
      'CHANGELOG.md',
      'LICENSE',
    ],
    repository,
    homepage,
    netpad: netpadConfig,
  };

  return packageJson;
}

/**
 * Generate application ID from name
 * Converts "Customer Feedback App" -> "app_customer_feedback"
 */
export function generateApplicationId(name: string): string {
  return `app_${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')}`;
}

/**
 * Generate package name from application name
 * Converts "Customer Feedback App" -> "@netpad/app-customer-feedback" or "netpad-app-customer-feedback"
 */
export function generatePackageName(
  name: string,
  options: {
    scope?: string;  // e.g., "@netpad" or "@acme-corp"
    isOfficial?: boolean;
  } = {}
): string {
  const { scope, isOfficial = false } = options;
  
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (isOfficial) {
    return `@netpad/app-${slug}`;
  }

  if (scope) {
    return `${scope}/netpad-app-${slug}`;
  }

  return `netpad-app-${slug}`;
}

/**
 * Extract netpad config from package.json
 * 
 * @param packageJson - Package.json object
 * @returns NetPad config or null if not found
 */
export function extractNetPadConfig(packageJson: any): NetPadPackageConfig | null {
  if (!packageJson || !packageJson.netpad) {
    return null;
  }

  return packageJson.netpad as NetPadPackageConfig;
}

/**
 * Check if package is a NetPad package
 * 
 * @param packageJson - Package.json object
 * @returns true if package has netpad field
 */
export function isNetPadPackage(packageJson: any): boolean {
  return !!(packageJson?.netpad);
}

/**
 * Check if package is an application (vs plugin)
 * 
 * @param packageJson - Package.json object
 * @returns true if package is an application
 */
export function isApplicationPackage(packageJson: any): boolean {
  return packageJson?.netpad?.type === 'application';
}

/**
 * Check if package is a plugin
 * 
 * @param packageJson - Package.json object
 * @returns true if package is a plugin
 */
export function isPluginPackage(packageJson: any): boolean {
  return packageJson?.netpad?.type === 'plugin';
}

/**
 * Check if package is official (@netpad/ scope)
 * 
 * @param packageName - Package name
 * @returns true if package is official
 */
export function isOfficialPackage(packageName: string): boolean {
  return packageName.startsWith('@netpad/');
}

/**
 * Get package type from package name
 * 
 * @param packageName - Package name
 * @returns 'application' | 'plugin' | null
 */
export function getPackageType(packageName: string): 'application' | 'plugin' | null {
  if (packageName.includes('/app-') || packageName.startsWith('netpad-app-')) {
    return 'application';
  }
  if (packageName.includes('/plugin-') || packageName.startsWith('netpad-plugin-')) {
    return 'plugin';
  }
  return null;
}

/**
 * Validate package name format
 * 
 * @param packageName - Package name to validate
 * @returns Validation result
 */
export function validatePackageName(packageName: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check npm package name rules
  if (packageName.length === 0) {
    errors.push('Package name cannot be empty');
  }

  if (packageName.length > 214) {
    errors.push('Package name cannot exceed 214 characters');
  }

  // Check for invalid characters
  if (!/^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(packageName)) {
    errors.push('Package name contains invalid characters');
  }

  // Check for reserved names
  const reserved = ['node_modules', 'favicon.ico'];
  if (reserved.includes(packageName.toLowerCase())) {
    errors.push(`Package name "${packageName}" is reserved`);
  }

  // Check NetPad naming conventions (warnings, not errors)
  const isApplication = packageName.includes('/app-') || packageName.startsWith('netpad-app-');
  const isPlugin = packageName.includes('/plugin-') || packageName.startsWith('netpad-plugin-');
  
  if (!isApplication && !isPlugin) {
    // Not an error, but should follow naming convention
    // This is just a warning in the validation
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
