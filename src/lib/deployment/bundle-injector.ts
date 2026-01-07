/**
 * Bundle Injector Service
 *
 * Injects application bundle into deployment template
 * Writes bundle.json to template directory before deployment
 */

import { promises as fs } from 'fs';
import path from 'path';
import { BundleExport } from '@/types/template';

/**
 * Inject bundle into template repository
 * Creates a deployable Next.js app with forms/workflows embedded
 *
 * @param templatePath - Path to template directory (e.g., templates/standalone-app)
 * @param bundle - Bundle export to inject
 * @returns Path to bundle.json file
 */
export async function injectBundleIntoTemplate(
  templatePath: string,
  bundle: BundleExport
): Promise<string> {
  const bundlePath = path.join(templatePath, 'bundle.json');

  // Validate bundle structure
  if (!bundle.manifest) {
    throw new Error('Bundle must include a manifest');
  }

  // Ensure template directory exists
  try {
    await fs.access(templatePath);
  } catch {
    throw new Error(`Template directory not found: ${templatePath}`);
  }

  // Write bundle to bundle.json
  const bundleJson = JSON.stringify(bundle, null, 2);
  await fs.writeFile(bundlePath, bundleJson, 'utf-8');

  return bundlePath;
}

/**
 * Validate bundle structure before injection
 */
export function validateBundle(bundle: BundleExport): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!bundle.manifest) {
    errors.push('Bundle must include a manifest');
  } else {
    if (!bundle.manifest.name) {
      errors.push('Manifest must include a name');
    }
    if (!bundle.manifest.version) {
      errors.push('Manifest must include a version');
    }
  }

  // Validate forms if present
  if (bundle.forms) {
    for (let i = 0; i < bundle.forms.length; i++) {
      const form = bundle.forms[i];
      if (!form.name) {
        errors.push(`Form at index ${i} must have a name`);
      }
      if (!form.fieldConfigs || !Array.isArray(form.fieldConfigs)) {
        errors.push(`Form "${form.name}" must have fieldConfigs array`);
      }
    }
  }

  // Validate workflows if present
  if (bundle.workflows) {
    for (let i = 0; i < bundle.workflows.length; i++) {
      const workflow = bundle.workflows[i];
      if (!workflow.name) {
        errors.push(`Workflow at index ${i} must have a name`);
      }
      if (!workflow.canvas) {
        errors.push(`Workflow "${workflow.name}" must have a canvas`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get bundle from template (for reading existing bundle)
 */
export async function getBundleFromTemplate(
  templatePath: string
): Promise<BundleExport | null> {
  const bundlePath = path.join(templatePath, 'bundle.json');

  try {
    const bundleJson = await fs.readFile(bundlePath, 'utf-8');
    return JSON.parse(bundleJson) as BundleExport;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null; // Bundle file doesn't exist yet
    }
    throw error;
  }
}

/**
 * Check if bundle exists in template
 */
export async function bundleExists(templatePath: string): Promise<boolean> {
  const bundlePath = path.join(templatePath, 'bundle.json');
  try {
    await fs.access(bundlePath);
    return true;
  } catch {
    return false;
  }
}
