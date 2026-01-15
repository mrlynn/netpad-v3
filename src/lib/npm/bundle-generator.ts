/**
 * Bundle Generator for npm Packages
 * 
 * Generates bundle.json from NetPad application data for npm package format
 */

import { BundleExport, ApplicationManifest, FormDefinition, WorkflowDefinition } from '@/types/template';
import {
  cleanFormForExport,
  cleanWorkflowForExport,
  createManifest,
  createBundleExport,
} from '@/lib/templates/export';
import { FormConfiguration } from '@/types/form';
import { WorkflowDocument } from '@/types/workflow';

/**
 * Generate bundle.json from application data
 * 
 * @param applicationData - Application data including forms, workflows, and metadata
 * @returns BundleExport ready for npm package
 */
export function generateBundleJson(options: {
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
  forms?: FormConfiguration[];
  workflows?: WorkflowDocument[];
  theme?: any;
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
}): BundleExport {
  const {
    name,
    version,
    description,
    summary,
    author,
    category,
    tags,
    icon,
    applicationId,
    minNetPadVersion,
    forms = [],
    workflows = [],
    theme,
    dependencies,
    contract,
    configSchema,
    screenshots,
    changelog,
  } = options;

  // Clean forms for export
  const formDefinitions: FormDefinition[] = forms.map(form => {
    const formWithId = {
      ...form,
      id: form.id || (form as any).formId,
    };
    return cleanFormForExport(formWithId as any);
  });

  // Clean workflows for export
  const workflowDefinitions: WorkflowDefinition[] = workflows.map(workflow =>
    cleanWorkflowForExport(workflow)
  );

  // Create Application Manifest
  const manifest: ApplicationManifest = {
    name,
    version,
    description: description || summary,
    summary,
    author: typeof author === 'string' ? { name: author } : author,
    category,
    tags,
    icon,
    id: applicationId,
    minimumNetpadVersion: minNetPadVersion,
    netpadVersion: minNetPadVersion,
    assets: {
      forms: formDefinitions.length > 0
        ? formDefinitions.map((_, index) => `forms/${index === 0 ? 'form.json' : `form-${index + 1}.json`}`)
        : undefined,
      workflows: workflowDefinitions.length > 0
        ? workflowDefinitions.map((_, index) => `workflows/${index === 0 ? 'workflow.json' : `workflow-${index + 1}.json`}`)
        : undefined,
    },
    dependencies: dependencies ? {
      integrations: dependencies.plugins?.map(p => {
        // Extract integration name from plugin package name
        // e.g., "@netpad/plugin-node-slack" -> "slack"
        const match = p.match(/plugin-(?:node|integration)-(.+)/);
        return match ? match[1] : p;
      }),
    } : undefined,
    changelog,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    marketplace: screenshots ? {
      // Store screenshots in marketplace metadata
    } as any : undefined,
  };

  // Add npm-specific fields to manifest (stored as any for now)
  (manifest as any).dependencies = dependencies;
  (manifest as any).contract = contract;
  (manifest as any).configSchema = configSchema;
  (manifest as any).screenshots = screenshots;

  // Create bundle export
  const bundle = createBundleExport(
    manifest,
    formDefinitions.length > 0 ? formDefinitions : undefined,
    workflowDefinitions.length > 0 ? workflowDefinitions : undefined,
    theme
  );

  return bundle;
}

/**
 * Generate bundle.json from existing BundleExport
 * Ensures bundle is in npm-compatible format
 * 
 * @param bundle - Existing bundle export
 * @returns Validated and normalized bundle
 */
export function normalizeBundleForNpm(bundle: BundleExport): BundleExport {
  // Ensure manifest has required fields
  if (!bundle.manifest) {
    throw new Error('Bundle must include a manifest');
  }

  // Ensure manifest version is set
  if (!bundle.manifest.version) {
    bundle.manifest.version = '1.0.0';
  }

  // Ensure manifest has id (applicationId)
  if (!(bundle.manifest as ApplicationManifest).id) {
    (bundle.manifest as ApplicationManifest).id = `app_${bundle.manifest.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')}`;
  }

  // Ensure forms and workflows arrays exist (even if empty)
  if (!bundle.forms) {
    bundle.forms = [];
  }
  if (!bundle.workflows) {
    bundle.workflows = [];
  }

  return bundle;
}
