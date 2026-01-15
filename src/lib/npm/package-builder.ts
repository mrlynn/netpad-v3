/**
 * Package Builder for npm Packages
 * 
 * Builds complete npm packages from NetPad applications
 */

import { NetPadPackageJson } from '@/types/npm-package';
import { BundleExport, ApplicationManifest } from '@/types/template';
import { generatePackageJson } from './package-structure';
import { generateBundleJson, normalizeBundleForNpm } from './bundle-generator';
import { validateCompletePackage } from './validators';

/**
 * Options for building npm package
 */
export interface BuildNpmPackageOptions {
  /**
   * Application data
   */
  name: string;
  version: string;
  description?: string;
  summary?: string;
  author?: string | { name: string; email?: string; url?: string };
  category?: string;
  tags?: string[];
  icon?: string;
  applicationId?: string;
  minNetPadVersion?: string;

  /**
   * Package metadata
   */
  packageName: string;
  license?: string;
  repository?: { type: string; url: string };
  homepage?: string;
  keywords?: string[];
  isOfficial?: boolean;

  /**
   * Application content
   */
  forms?: any[];
  workflows?: any[];
  theme?: any;

  /**
   * Application configuration
   */
  dependencies?: {
    applications?: string[];
    plugins?: string[];
    workflowTemplates?: string[];
  };
  contract?: {
    inputs?: Array<{
      key: string;
      type: string;
      required?: boolean;
      source?: string;
      description?: string;
    }>;
    outputs?: Array<{
      key: string;
      type: string;
      guaranteed?: boolean;
      description?: string;
    }>;
    events?: Array<{
      name: string;
      payloadSchemaRef?: string;
      description?: string;
    }>;
  };
  configSchema?: {
    fields?: Array<{
      key: string;
      type: string;
      required?: boolean;
      description?: string;
      default?: any;
      options?: Array<{ value: any; label: string }>;
    }>;
  };
  screenshots?: string[];
  changelog?: Array<{
    version: string;
    date: string;
    changes: string[];
  }>;
}

/**
 * Built npm package structure
 */
export interface BuiltNpmPackage {
  packageJson: NetPadPackageJson;
  bundle: BundleExport;
  validation: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
}

/**
 * Build complete npm package from application data
 * 
 * @param options - Package build options
 * @returns Built package with package.json and bundle.json
 */
export function buildNpmPackage(options: BuildNpmPackageOptions): BuiltNpmPackage {
  // Generate bundle.json
  const bundle = generateBundleJson({
    name: options.name,
    version: options.version,
    description: options.description,
    summary: options.summary,
    author: options.author,
    category: options.category,
    tags: options.tags,
    icon: options.icon,
    applicationId: options.applicationId,
    minNetPadVersion: options.minNetPadVersion,
    forms: options.forms,
    workflows: options.workflows,
    theme: options.theme,
    dependencies: options.dependencies,
    contract: options.contract,
    configSchema: options.configSchema,
    screenshots: options.screenshots,
    changelog: options.changelog,
  });

  // Normalize bundle for npm
  const normalizedBundle = normalizeBundleForNpm(bundle);

  // Generate package.json
  const packageJson = generatePackageJson(
    normalizedBundle.manifest as ApplicationManifest,
    {
      packageName: options.packageName,
      author: options.author,
      license: options.license,
      repository: options.repository,
      homepage: options.homepage,
      keywords: options.keywords,
      isOfficial: options.isOfficial,
    }
  );

  // Validate complete package
  const validation = validateCompletePackage(packageJson, normalizedBundle);

  return {
    packageJson,
    bundle: normalizedBundle,
    validation,
  };
}

/**
 * Build npm package from existing bundle
 * Useful when converting existing bundles to npm format
 * 
 * @param bundle - Existing bundle export
 * @param packageOptions - Package metadata options
 * @returns Built package
 */
export function buildNpmPackageFromBundle(
  bundle: BundleExport,
  packageOptions: {
    packageName: string;
    license?: string;
    repository?: { type: string; url: string };
    homepage?: string;
    keywords?: string[];
    isOfficial?: boolean;
  }
): BuiltNpmPackage {
  // Normalize bundle
  const normalizedBundle = normalizeBundleForNpm(bundle);

  // Generate package.json from bundle manifest
  const packageJson = generatePackageJson(
    normalizedBundle.manifest as ApplicationManifest,
    packageOptions
  );

  // Validate
  const validation = validateCompletePackage(packageJson, normalizedBundle);

  return {
    packageJson,
    bundle: normalizedBundle,
    validation,
  };
}

/**
 * Serialize package to JSON strings
 * 
 * @param builtPackage - Built package
 * @returns JSON strings for package.json and bundle.json
 */
export function serializePackage(builtPackage: BuiltNpmPackage): {
  packageJson: string;
  bundleJson: string;
} {
  return {
    packageJson: JSON.stringify(builtPackage.packageJson, null, 2),
    bundleJson: JSON.stringify(builtPackage.bundle, null, 2),
  };
}
