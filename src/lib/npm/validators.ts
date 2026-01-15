/**
 * npm Package Validators
 * 
 * Validation utilities for NetPad npm packages
 */

import { NetPadPackageJson, NetPadPackageConfig } from '@/types/npm-package';
import { BundleExport } from '@/types/template';

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate complete package.json structure
 * 
 * @param packageJson - Package.json to validate
 * @returns Validation result
 */
export function validatePackageStructure(packageJson: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required npm fields
  if (!packageJson.name) {
    errors.push('Package name is required');
  }

  if (!packageJson.version) {
    errors.push('Package version is required');
  }

  if (!packageJson.description) {
    warnings.push('Package description is recommended');
  }

  // Validate version format (semver)
  if (packageJson.version && !isValidSemver(packageJson.version)) {
    errors.push(`Invalid version format: ${packageJson.version}. Must follow semantic versioning (e.g., 1.0.0)`);
  }

  // Check for netpad field
  if (!packageJson.netpad) {
    errors.push('Package must include "netpad" field');
    return { valid: false, errors, warnings };
  }

  // Validate netpad config
  const netpadValidation = validateNetPadConfig(packageJson.netpad);
  errors.push(...netpadValidation.errors);
  warnings.push(...netpadValidation.warnings);

  // Validate keywords
  if (!packageJson.keywords || !Array.isArray(packageJson.keywords)) {
    warnings.push('Package keywords are recommended for discovery');
  } else {
    const hasNetPadKeyword = packageJson.keywords.some((k: string) => 
      k === 'netpad-app' || k === 'netpad-plugin' || k === 'netpad-community-app' || k === 'netpad-community-plugin'
    );
    if (!hasNetPadKeyword) {
      warnings.push('Package should include "netpad-app" or "netpad-plugin" in keywords for discovery');
    }
  }

  // Validate main field
  if (!packageJson.main) {
    errors.push('Package "main" field is required');
  } else {
    if (packageJson.netpad.type === 'application' && !packageJson.main.endsWith('bundle.json')) {
      warnings.push('Application packages should point "main" to bundle.json');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate NetPad config structure
 * 
 * @param config - NetPad config to validate
 * @returns Validation result
 */
export function validateNetPadConfig(config: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!config.type) {
    errors.push('NetPad config "type" is required (must be "application" or "plugin")');
  } else if (config.type !== 'application' && config.type !== 'plugin') {
    errors.push(`Invalid NetPad config type: ${config.type}. Must be "application" or "plugin"`);
  }

  // Application-specific validation
  if (config.type === 'application') {
    if (!config.name) {
      errors.push('Application name is required');
    }
    if (!config.description) {
      errors.push('Application description is required');
    }
    if (!config.version) {
      errors.push('Application version is required');
    }
    if (!config.applicationId) {
      warnings.push('Application ID is recommended (will be generated if not provided)');
    }
  }

  // Plugin-specific validation
  if (config.type === 'plugin') {
    if (!config.pluginType) {
      errors.push('Plugin type is required (node, field, integration, theme, or hook)');
    } else {
      const validPluginTypes = ['node', 'field', 'integration', 'theme', 'hook'];
      if (!validPluginTypes.includes(config.pluginType)) {
        errors.push(`Invalid plugin type: ${config.pluginType}. Must be one of: ${validPluginTypes.join(', ')}`);
      }
    }

    if (config.pluginType === 'node' && (!config.nodes || config.nodes.length === 0)) {
      errors.push('Node plugins must define at least one node');
    }
  }

  // Validate version format
  if (config.version && !isValidSemver(config.version)) {
    errors.push(`Invalid version format in netpad config: ${config.version}`);
  }

  // Validate dependencies format
  if (config.dependencies) {
    if (config.dependencies.applications && !Array.isArray(config.dependencies.applications)) {
      errors.push('Dependencies.applications must be an array');
    }
    if (config.dependencies.plugins && !Array.isArray(config.dependencies.plugins)) {
      errors.push('Dependencies.plugins must be an array');
    }
    if (config.dependencies.workflowTemplates && !Array.isArray(config.dependencies.workflowTemplates)) {
      errors.push('Dependencies.workflowTemplates must be an array');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate bundle.json structure
 * 
 * @param bundle - Bundle to validate
 * @returns Validation result
 */
export function validateBundleJson(bundle: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!bundle) {
    errors.push('Bundle is required');
    return { valid: false, errors, warnings };
  }

  if (!bundle.manifest) {
    errors.push('Bundle must include a manifest');
  } else {
    if (!bundle.manifest.name) {
      errors.push('Bundle manifest must include name');
    }
    if (!bundle.manifest.version) {
      errors.push('Bundle manifest must include version');
    }
  }

  // Validate forms array
  if (bundle.forms) {
    if (!Array.isArray(bundle.forms)) {
      errors.push('Bundle forms must be an array');
    } else {
      bundle.forms.forEach((form: any, index: number) => {
        if (!form.name) {
          errors.push(`Form at index ${index} must have a name`);
        }
        if (!form.fieldConfigs || !Array.isArray(form.fieldConfigs)) {
          warnings.push(`Form "${form.name || index}" should have fieldConfigs array`);
        }
      });
    }
  }

  // Validate workflows array
  if (bundle.workflows) {
    if (!Array.isArray(bundle.workflows)) {
      errors.push('Bundle workflows must be an array');
    } else {
      bundle.workflows.forEach((workflow: any, index: number) => {
        if (!workflow.name) {
          errors.push(`Workflow at index ${index} must have a name`);
        }
        if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
          warnings.push(`Workflow "${workflow.name || index}" should have nodes array`);
        }
      });
    }
  }

  // Warn if bundle is empty
  if ((!bundle.forms || bundle.forms.length === 0) && 
      (!bundle.workflows || bundle.workflows.length === 0)) {
    warnings.push('Bundle contains no forms or workflows');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate semantic version string
 * 
 * @param version - Version string to validate
 * @returns true if valid semver
 */
export function isValidSemver(version: string): boolean {
  // Basic semver pattern: major.minor.patch[-prerelease][+build]
  const semverPattern = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
  return semverPattern.test(version);
}

/**
 * Validate package name matches npm conventions
 * 
 * @param name - Package name to validate
 * @returns Validation result
 */
export function validatePackageNameFormat(name: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!name) {
    errors.push('Package name is required');
    return { valid: false, errors, warnings };
  }

  // npm package name rules
  if (name.length > 214) {
    errors.push('Package name cannot exceed 214 characters');
  }

  // Check for invalid characters
  if (!/^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(name)) {
    errors.push('Package name contains invalid characters. Must be lowercase, alphanumeric, and may contain hyphens, dots, underscores, and tildes');
  }

  // Check for reserved names
  const reserved = ['node_modules', 'favicon.ico'];
  if (reserved.includes(name.toLowerCase())) {
    errors.push(`Package name "${name}" is reserved`);
  }

  // Check NetPad naming conventions (warnings)
  const isApplication = name.includes('/app-') || name.startsWith('netpad-app-');
  const isPlugin = name.includes('/plugin-') || name.startsWith('netpad-plugin-');
  
  if (!isApplication && !isPlugin) {
    warnings.push('Package name should follow NetPad conventions: "@scope/netpad-app-*" or "@scope/netpad-plugin-*"');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate complete package (package.json + bundle.json)
 * 
 * @param packageJson - Package.json
 * @param bundle - Bundle.json
 * @returns Validation result
 */
export function validateCompletePackage(
  packageJson: any,
  bundle: any
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate package.json
  const packageValidation = validatePackageStructure(packageJson);
  errors.push(...packageValidation.errors);
  warnings.push(...packageValidation.warnings);

  // Validate bundle.json
  const bundleValidation = validateBundleJson(bundle);
  errors.push(...bundleValidation.errors);
  warnings.push(...bundleValidation.warnings);

  // Cross-validation: package.json version should match bundle manifest version
  if (packageJson?.version && bundle?.manifest?.version) {
    if (packageJson.version !== bundle.manifest.version) {
      errors.push(`Version mismatch: package.json version (${packageJson.version}) does not match bundle manifest version (${bundle.manifest.version})`);
    }
  }

  // Cross-validation: package.json name should match bundle manifest name (if applicationId matches)
  if (packageJson?.netpad?.applicationId && bundle?.manifest?.id) {
    if (packageJson.netpad.applicationId !== bundle.manifest.id) {
      warnings.push(`Application ID mismatch: package.json applicationId (${packageJson.netpad.applicationId}) does not match bundle manifest id (${bundle.manifest.id})`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
