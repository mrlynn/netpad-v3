/**
 * Template Export Utilities
 * 
 * Functions to export forms, workflows, and bundles as portable templates
 */

import { FormConfiguration } from '@/types/form';
import { WorkflowDocument } from '@/types/workflow';
import { FormDefinition, WorkflowDefinition, TemplateManifest, BundleExport } from '@/types/template';

/**
 * Clean form configuration for export
 * Removes sensitive/organization-specific data
 */
export function cleanFormForExport(form: FormConfiguration): FormDefinition {
  const {
    // Exclude sensitive/org-specific fields
    connectionString,
    dataSource,
    organizationId,
    createdBy,
    accessControl,
    id,
    // Keep everything else
    ...exportableFields
  } = form;

  return {
    ...exportableFields,
    // Preserve slug for reference, but it will be regenerated on import if conflicts
    slug: form.slug,
    createdAt: form.createdAt,
    updatedAt: form.updatedAt,
  } as FormDefinition;
}

/**
 * Clean workflow document for export
 * Removes sensitive/organization-specific data
 */
export function cleanWorkflowForExport(workflow: WorkflowDocument): WorkflowDefinition {
  const {
    // Exclude sensitive/org-specific fields
    _id,
    id,
    orgId,
    createdBy,
    lastModifiedBy,
    stats,
    // Keep everything else
    ...exportableFields
  } = workflow;

  return {
    ...exportableFields,
    // Preserve slug for reference
    slug: workflow.slug,
    createdAt: workflow.createdAt instanceof Date ? workflow.createdAt.toISOString() : workflow.createdAt,
    updatedAt: workflow.updatedAt instanceof Date ? workflow.updatedAt.toISOString() : workflow.updatedAt,
  } as WorkflowDefinition;
}

/**
 * Create template manifest from bundle contents
 */
export function createManifest(
  name: string,
  version: string,
  options: {
    description?: string;
    author?: string;
    forms?: FormDefinition[];
    workflows?: WorkflowDefinition[];
    theme?: any;
    dependencies?: TemplateManifest['dependencies'];
    instructions?: TemplateManifest['instructions'];
    tags?: string[];
    category?: string;
  }
): TemplateManifest {
  const assets: TemplateManifest['assets'] = {};
  
  if (options.forms && options.forms.length > 0) {
    assets.forms = options.forms.map((_, index) => `forms/${index === 0 ? 'form.json' : `form-${index + 1}.json`}`);
  }
  
  if (options.workflows && options.workflows.length > 0) {
    assets.workflows = options.workflows.map((_, index) => 
      `workflows/${index === 0 ? 'workflow.json' : `workflow-${index + 1}.json`}`
    );
  }
  
  if (options.theme) {
    assets.theme = 'theme.json';
  }

  return {
    name,
    version,
    description: options.description,
    author: options.author,
    assets,
    dependencies: options.dependencies,
    instructions: options.instructions,
    tags: options.tags,
    category: options.category,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Create bundle export structure
 */
export function createBundleExport(
  manifest: TemplateManifest,
  forms?: FormDefinition[],
  workflows?: WorkflowDefinition[],
  theme?: any
): BundleExport {
  return {
    manifest,
    forms,
    workflows,
    theme,
  };
}

/**
 * Export connection configuration (sanitized - no secrets)
 * Returns connection metadata needed for deployment setup
 */
export function exportConnectionConfig(
  vault: {
    name: string;
    description?: string;
    database: string;
    allowedCollections: string[];
  }
): import('@/types/template').ConnectionConfigExport {
  return {
    name: vault.name,
    description: vault.description,
    database: vault.database,
    allowedCollections: vault.allowedCollections,
    // Excluded: encryptedConnectionString, encryptionKeyId, permissions
  };
}

/**
 * Integration types that require specific environment variables
 */
const INTEGRATION_ENV_REQUIREMENTS: Record<string, import('@/types/template').EnvVarSpec[]> = {
  // Email integration
  'email-send': [
    {
      name: 'SMTP_HOST',
      description: 'SMTP server hostname (e.g., smtp.sendgrid.net)',
      required: true,
      generator: 'none',
    },
    {
      name: 'SMTP_PORT',
      description: 'SMTP server port (usually 587 for TLS or 465 for SSL)',
      required: true,
      default: '587',
      generator: 'none',
    },
    {
      name: 'SMTP_USER',
      description: 'SMTP username or API key',
      required: true,
      generator: 'none',
    },
    {
      name: 'SMTP_PASS',
      description: 'SMTP password or API key secret',
      required: true,
      generator: 'none',
    },
    {
      name: 'FROM_EMAIL',
      description: 'Default sender email address',
      required: true,
      generator: 'none',
    },
  ],
  // Slack integration
  'slack': [
    {
      name: 'SLACK_CLIENT_ID',
      description: 'Slack OAuth App Client ID',
      required: false,
      generator: 'none',
    },
    {
      name: 'SLACK_CLIENT_SECRET',
      description: 'Slack OAuth App Client Secret',
      required: false,
      generator: 'none',
    },
  ],
  // Google Sheets integration (uses connection vault for credentials)
  'google-sheets': [
    {
      name: 'GOOGLE_CLIENT_ID',
      description: 'Google OAuth Client ID (for user OAuth flow)',
      required: false,
      generator: 'none',
    },
    {
      name: 'GOOGLE_CLIENT_SECRET',
      description: 'Google OAuth Client Secret',
      required: false,
      generator: 'none',
    },
  ],
  // OpenAI (for AI nodes)
  'ai': [
    {
      name: 'OPENAI_API_KEY',
      description: 'OpenAI API key for AI-powered features',
      required: false,
      generator: 'none',
    },
  ],
};

/**
 * Node types that map to integrations requiring env vars
 */
const NODE_TYPE_TO_INTEGRATION: Record<string, string> = {
  'email-send': 'email-send',
  'slack-send': 'slack',
  'slack-message': 'slack',
  'google-sheets': 'google-sheets',
  'ai-prompt': 'ai',
  'ai-classify': 'ai',
  'ai-extract': 'ai',
  'ai-summarize': 'ai',
};

/**
 * Extract node types from workflow definitions
 */
function extractNodeTypes(workflows: WorkflowDefinition[]): Set<string> {
  const nodeTypes = new Set<string>();

  for (const workflow of workflows) {
    if (workflow.canvas?.nodes) {
      for (const node of workflow.canvas.nodes) {
        if (node.type) {
          nodeTypes.add(node.type);
        }
        // Also check node data for type information
        if (node.data?.type) {
          nodeTypes.add(node.data.type);
        }
      }
    }
  }

  return nodeTypes;
}

/**
 * Generate environment variable template from project contents
 * Analyzes forms, workflows, and connections to determine required env vars
 *
 * @param projectName - Name of the project (used for app name)
 * @param forms - Form definitions to analyze
 * @param workflows - Workflow definitions to analyze
 * @param connections - Connection configurations (sanitized)
 * @returns Object containing required and optional env var specs
 */
export function generateEnvVarTemplate(
  projectName: string,
  forms: FormDefinition[],
  workflows: WorkflowDefinition[],
  connections: import('@/types/template').ConnectionConfigExport[]
): { required: import('@/types/template').EnvVarSpec[]; optional: import('@/types/template').EnvVarSpec[] } {
  const required: import('@/types/template').EnvVarSpec[] = [];
  const optional: import('@/types/template').EnvVarSpec[] = [];
  const addedEnvVars = new Set<string>();

  // Helper to add env var without duplicates
  const addEnvVar = (spec: import('@/types/template').EnvVarSpec, isRequired: boolean) => {
    if (addedEnvVars.has(spec.name)) return;
    addedEnvVars.add(spec.name);
    if (isRequired) {
      required.push(spec);
    } else {
      optional.push(spec);
    }
  };

  // Core required environment variables
  addEnvVar({
    name: 'MONGODB_URI',
    description: 'MongoDB connection string for the application database',
    required: true,
    generator: 'none',
  }, true);

  addEnvVar({
    name: 'MONGODB_DATABASE',
    description: 'MongoDB database name',
    required: false,
    default: 'netpad_app',
    generator: 'none',
  }, false);

  addEnvVar({
    name: 'SESSION_SECRET',
    description: 'Secret key for session encryption (min 32 characters)',
    required: true,
    generator: 'secret',
  }, true);

  addEnvVar({
    name: 'VAULT_ENCRYPTION_KEY',
    description: 'Base64 encryption key for credential vault (32 bytes)',
    required: true,
    generator: 'secret',
  }, true);

  addEnvVar({
    name: 'NEXT_PUBLIC_APP_URL',
    description: 'Public URL of the deployed application',
    required: true,
    default: '${VERCEL_URL}',
    generator: 'none',
  }, true);

  addEnvVar({
    name: 'APP_URL',
    description: 'Server-side application URL (for webhooks and callbacks)',
    required: false,
    default: '${VERCEL_URL}',
    generator: 'none',
  }, false);

  // Analyze workflows for integration requirements
  const nodeTypes = extractNodeTypes(workflows);
  const requiredIntegrations = new Set<string>();

  for (const nodeType of nodeTypes) {
    const integration = NODE_TYPE_TO_INTEGRATION[nodeType];
    if (integration) {
      requiredIntegrations.add(integration);
    }
  }

  // Add env vars for detected integrations
  for (const integration of requiredIntegrations) {
    const integrationEnvVars = INTEGRATION_ENV_REQUIREMENTS[integration];
    if (integrationEnvVars) {
      for (const envVar of integrationEnvVars) {
        addEnvVar(envVar, envVar.required);
      }
    }
  }

  // Analyze forms for features that require env vars
  for (const form of forms) {
    // Bot protection (Turnstile)
    if (form.botProtection?.turnstile?.enabled) {
      addEnvVar({
        name: 'TURNSTILE_SITE_KEY',
        description: 'Cloudflare Turnstile site key for bot protection',
        required: true,
        generator: 'none',
      }, true);
      addEnvVar({
        name: 'TURNSTILE_SECRET_KEY',
        description: 'Cloudflare Turnstile secret key',
        required: true,
        generator: 'none',
      }, true);
    }

    // File uploads
    const hasFileFields = form.fieldConfigs?.some(
      (field: any) => field.type === 'file' || field.type === 'image' || field.type === 'signature'
    );
    if (hasFileFields) {
      addEnvVar({
        name: 'BLOB_READ_WRITE_TOKEN',
        description: 'Vercel Blob storage token for file uploads',
        required: true,
        generator: 'none',
      }, true);
    }
  }

  // If there are connections, we need database connectivity
  if (connections.length > 0) {
    // Already added MONGODB_URI as required
  }

  // Optional: OAuth providers for authentication
  addEnvVar({
    name: 'GOOGLE_CLIENT_ID',
    description: 'Google OAuth client ID for social login',
    required: false,
    generator: 'none',
  }, false);

  addEnvVar({
    name: 'GOOGLE_CLIENT_SECRET',
    description: 'Google OAuth client secret',
    required: false,
    generator: 'none',
  }, false);

  addEnvVar({
    name: 'GITHUB_CLIENT_ID',
    description: 'GitHub OAuth client ID for social login',
    required: false,
    generator: 'none',
  }, false);

  addEnvVar({
    name: 'GITHUB_CLIENT_SECRET',
    description: 'GitHub OAuth client secret',
    required: false,
    generator: 'none',
  }, false);

  return { required, optional };
}

/**
 * Generate a complete DeploymentConfig from project contents
 *
 * @param projectName - Name of the project
 * @param forms - Form definitions
 * @param workflows - Workflow definitions
 * @param connections - Connection configurations (sanitized)
 * @param options - Additional configuration options
 * @returns Complete deployment configuration
 */
export function generateDeploymentConfig(
  projectName: string,
  forms: FormDefinition[],
  workflows: WorkflowDefinition[],
  connections: import('@/types/template').ConnectionConfigExport[],
  options?: {
    mode?: 'standalone' | 'connected';
    provisioning?: 'auto' | 'manual' | 'existing';
    seedSampleData?: boolean;
    branding?: {
      logo?: string;
      favicon?: string;
      primaryColor?: string;
    };
  }
): import('@/types/template').DeploymentConfig {
  const envVars = generateEnvVarTemplate(projectName, forms, workflows, connections);

  // Determine collections needed
  const collections: import('@/types/template').CollectionSpec[] = [
    {
      name: 'forms',
      description: 'Form definitions',
      indexes: [
        { key: { slug: 1 }, name: 'forms_slug_idx', unique: true },
        { key: { projectId: 1 }, name: 'forms_project_idx' },
      ],
    },
    {
      name: 'form_submissions',
      description: 'Form submission data',
      indexes: [
        { key: { formId: 1, createdAt: -1 }, name: 'submissions_form_date_idx' },
        { key: { status: 1 }, name: 'submissions_status_idx' },
      ],
    },
  ];

  // Add workflow collections if workflows exist
  if (workflows.length > 0) {
    collections.push(
      {
        name: 'workflows',
        description: 'Workflow definitions',
        indexes: [
          { key: { slug: 1 }, name: 'workflows_slug_idx', unique: true },
          { key: { projectId: 1 }, name: 'workflows_project_idx' },
          { key: { status: 1 }, name: 'workflows_status_idx' },
        ],
      },
      {
        name: 'workflow_executions',
        description: 'Workflow execution records',
        indexes: [
          { key: { workflowId: 1, startedAt: -1 }, name: 'executions_workflow_date_idx' },
          { key: { status: 1 }, name: 'executions_status_idx' },
        ],
      },
      {
        name: 'workflow_jobs',
        description: 'Workflow job queue',
        indexes: [
          { key: { status: 1, scheduledFor: 1 }, name: 'jobs_status_scheduled_idx' },
          { key: { workflowId: 1 }, name: 'jobs_workflow_idx' },
        ],
      }
    );
  }

  // Add connection vault if connections exist
  if (connections.length > 0) {
    collections.push({
      name: 'connection_vault',
      description: 'Encrypted connection credentials',
      indexes: [
        { key: { vaultId: 1 }, name: 'vault_id_idx', unique: true },
      ],
    });
  }

  return {
    mode: options?.mode || 'standalone',
    environment: envVars,
    database: {
      provisioning: options?.provisioning || 'auto',
      collections,
      indexes: [], // Indexes are included in collections
    },
    seed: {
      forms: forms.length > 0,
      workflows: workflows.length > 0,
      sampleData: options?.seedSampleData || false,
    },
    branding: {
      appName: projectName,
      logo: options?.branding?.logo,
      favicon: options?.branding?.favicon,
      primaryColor: options?.branding?.primaryColor,
    },
  };
}
