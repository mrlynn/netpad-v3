/**
 * Template and Bundle Types
 * 
 * Types for exporting/importing NetPad assets (forms, workflows, themes)
 * as portable bundles/templates.
 */

/**
 * Asset Manifest - describes the contents of a template bundle
 */
export interface TemplateManifest {
  /**
   * Template metadata
   */
  name: string;
  version: string;
  description?: string;
  author?: string | { name: string; email?: string; url?: string };
  license?: string;
  
  /**
   * NetPad version compatibility
   */
  netpadVersion?: string;
  minimumNetpadVersion?: string;
  
  /**
   * Bundle contents
   */
  assets: {
    forms?: string[];           // Paths to form JSON files
    workflows?: string[];       // Paths to workflow JSON files
    theme?: string;             // Path to theme JSON file (optional)
  };
  
  /**
   * Dependencies and requirements
   */
  dependencies?: {
    integrations?: string[];    // Required integrations (e.g., ["email", "slack"])
    connections?: string[];     // Required connection vault IDs (for reference)
  };
  
  /**
   * Instructions for importing/using the template
   */
  instructions?: {
    import?: string;            // How to import
    setup?: string[];           // Setup steps
    customization?: string[];   // Customization tips
  };
  
  /**
   * Metadata
   */
  tags?: string[];
  category?: string;            // e.g., "helpdesk", "onboarding", "survey"
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Form Definition Export
 * Cleaned form configuration ready for export (no sensitive data)
 */
export interface FormDefinition {
  /**
   * Original ID (for reference during import)
   */
  id?: string;
  
  name: string;
  description?: string;
  fieldConfigs: any[];          // FieldConfig[]
  variables?: any[];            // FormVariable[]
  events?: any[];               // FormEvent[]
  theme?: any;                  // FormTheme
  branding?: any;               // FormBranding
  multiPage?: any;              // MultiPageConfig
  botProtection?: any;          // BotProtectionConfig
  draftSettings?: any;          // DraftSettings
  
  /**
   * Application-specific metadata
   */
  applicationRole?: 'primary' | 'secondary' | 'supporting';
  displayOrder?: number;
  
  // Metadata (exported but will be regenerated on import)
  slug?: string;
  createdAt?: string;
  updatedAt?: string;
  
  // Excluded from export (security/privacy)
  // - connectionString (legacy)
  // - dataSource (contains vault IDs - org-specific)
  // - organizationId
  // - createdBy
  // - accessControl (org-specific permissions)
}

/**
 * Workflow Definition Export
 * Cleaned workflow configuration ready for export
 */
export interface WorkflowDefinition {
  /**
   * Original ID (for reference during import)
   */
  id?: string;
  
  name: string;
  description?: string;
  canvas: any;                  // WorkflowCanvas
  settings: any;                // WorkflowSettings
  variables?: any[];            // WorkflowVariable[]
  inputSchema?: any;            // JSONSchemaDefinition
  outputSchema?: any;           // JSONSchemaDefinition
  tags?: string[];
  
  /**
   * Application-specific metadata
   */
  applicationRole?: 'primary' | 'secondary' | 'supporting';
  displayOrder?: number;
  
  // Metadata (exported but will be regenerated on import)
  slug?: string;
  createdAt?: string;
  updatedAt?: string;
  
  // Excluded from export (security/privacy)
  // - id (will be regenerated)
  // - orgId (org-specific)
  // - createdBy
  // - lastModifiedBy
  // - stats (execution stats)
}

/**
 * Form-Workflow Connection
 * Explicit connection between a form and workflow
 */
export interface FormWorkflowConnection {
  /**
   * Connection ID (for reference)
   */
  id: string;
  
  /**
   * Reference to form (by slug or original ID)
   */
  formRef: string;
  
  /**
   * Reference to workflow (by slug or original ID)
   */
  workflowRef: string;
  
  /**
   * Connection type
   */
  type: 'trigger' | 'webhook' | 'manual' | 'scheduled';
  
  /**
   * Connection configuration
   */
  config?: {
    /**
     * For trigger connections
     */
    triggerOn?: 'submit' | 'update' | 'delete';
    conditions?: Array<{
      field: string;
      operator: string;
      value: any;
    }>;
    
    /**
     * For webhook connections
     */
    webhookUrl?: string;
    webhookMethod?: string;
    
    /**
     * For scheduled connections
     */
    schedule?: string; // Cron expression
  };
  
  /**
   * Metadata
   */
  description?: string;
  enabled?: boolean;
}

/**
 * Application Manifest
 * Enhanced manifest for complete NetPad applications
 */
export interface ApplicationManifest extends TemplateManifest {
  /**
   * Unique application ID
   */
  id?: string;

  /**
   * Application icon (emoji or icon name)
   */
  icon?: string;

  /**
   * Application color (hex or CSS color)
   */
  color?: string;

  /**
   * Short summary (1-2 sentences)
   */
  summary?: string;
  
  /**
   * Author information
   */
  author?: {
    name: string;
    email?: string;
    url?: string;
  };
  
  /**
   * Marketplace metadata
   */
  marketplace?: {
    featured?: boolean;
    downloads?: number;
    rating?: number;
    reviews?: number;
    price?: {
      type: 'free' | 'paid';
      amount?: number;
      currency?: string;
    };
  };
  
  /**
   * Change log
   */
  changelog?: Array<{
    version: string;
    date: string;
    changes: string[];
  }>;
}

/**
 * Bundle Export Response
 * Complete application bundle with forms, workflows, and connections
 */
export interface BundleExport {
  manifest: TemplateManifest | ApplicationManifest;
  forms?: FormDefinition[];
  workflows?: WorkflowDefinition[];
  /**
   * Explicit form-workflow connections
   */
  connections?: FormWorkflowConnection[];
  theme?: any;
  // NEW: Project metadata
  project?: {
    name: string;
    description?: string;
    settings?: Record<string, unknown>;
    branding?: {
      logo?: string;
      primaryColor?: string;
      favicon?: string;
    };
  };
  // NEW: Deployment configuration
  deployment?: DeploymentConfig;
}

/**
 * Marketplace Item Types
 * The marketplace supports four distinct item types:
 * - application: Complete bundles with forms, workflows, and connections
 * - form: Standalone form definitions
 * - workflow: Standalone workflow definitions
 * - extension: NetPad extensions (custom workflow nodes, integrations, etc.)
 */
export type MarketplaceItemType = 'application' | 'form' | 'workflow' | 'extension';

/**
 * Standalone Form Bundle
 * Simplified bundle for publishing individual forms to the marketplace
 */
export interface FormBundle {
  /** The form definition */
  form: FormDefinition;
  /** Optional theme override */
  theme?: any;
  /** Form-specific marketplace metadata */
  formMetadata?: {
    /** Number of fields in the form */
    fieldCount: number;
    /** Form type: traditional, conversational, or search */
    formType: 'traditional' | 'conversational' | 'search';
    /** Whether the form has multiple pages */
    isMultiPage: boolean;
    /** Whether the form uses conditional logic */
    hasConditionalLogic: boolean;
  };
}

/**
 * Standalone Workflow Bundle
 * Simplified bundle for publishing individual workflows to the marketplace
 */
export interface WorkflowBundle {
  /** The workflow definition */
  workflow: WorkflowDefinition;
  /** Workflow-specific marketplace metadata */
  workflowMetadata?: {
    /** Number of nodes in the workflow */
    nodeCount: number;
    /** Trigger type */
    triggerType: 'form_submission' | 'webhook' | 'schedule' | 'manual' | 'api';
    /** Node types used in the workflow */
    nodeTypes: string[];
  };
}

/**
 * Extension Workflow Node Definition
 * Describes a custom workflow node provided by an extension
 */
export interface ExtensionNodeDefinition {
  /** Unique type identifier (convention: 'extensionid:node-name') */
  type: string;
  /** Display name shown in the palette */
  label: string;
  /** Description shown in tooltips */
  description: string;
  /** Which palette section this node appears in */
  category: 'triggers' | 'logic' | 'integrations' | 'actions' | 'data' | 'ai' | 'forms' | 'custom' | 'annotations';
  /** Node color (hex) */
  color: string;
  /** MUI icon name */
  icon: string;
  /** Semantic version of this node definition */
  version: string;
  /** Configuration fields for the node editor */
  configFields?: Array<{
    name: string;
    label: string;
    type: 'text' | 'textarea' | 'number' | 'boolean' | 'select' | 'json' | 'expression';
    defaultValue?: unknown;
    placeholder?: string;
    helpText?: string;
    required?: boolean;
    options?: Array<{ label: string; value: string }>;
  }>;
  /** Output handles for downstream node connections */
  outputs?: Array<{ id: string; label: string; primary?: boolean }>;
}

/**
 * Extension Definition
 * The structure of a NetPad extension as exported for the marketplace
 */
export interface ExtensionDefinition {
  /** Extension metadata */
  metadata: {
    /** Unique extension identifier */
    id: string;
    /** Human-readable name */
    name: string;
    /** Semantic version */
    version: string;
    /** Description of what the extension does */
    description?: string;
    /** Author or organization name */
    author?: string;
  };
  /** Feature flags this extension provides */
  features?: string[];
  /** Custom workflow nodes provided by this extension */
  workflowNodes?: Array<{
    definition: ExtensionNodeDefinition;
    /** Handler code is not included in marketplace - just metadata */
  }>;
  /** Optional API routes provided by extension */
  routes?: Array<{
    path: string;
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    description?: string;
    requiresAuth?: boolean;
  }>;
  /** Services provided for dependency injection */
  serviceNames?: string[];
}

/**
 * Extension Bundle
 * Bundle for publishing NetPad extensions to the marketplace
 */
export interface ExtensionBundle {
  /** The extension definition */
  extension: ExtensionDefinition;
  /** Extension-specific marketplace metadata */
  extensionMetadata?: {
    /** Type of extension */
    extensionType: 'node' | 'integration' | 'theme' | 'hook' | 'multi';
    /** Number of workflow nodes provided */
    nodeCount: number;
    /** Categories of nodes provided */
    nodeCategories: string[];
    /** Number of API routes provided */
    routeCount: number;
    /** npm package name for installation */
    npmPackage?: string;
    /** Minimum NetPad version required */
    minNetPadVersion?: string;
    /** Whether the extension has been verified/tested */
    verified?: boolean;
  };
}

/**
 * Union type for all marketplace bundle types
 */
export type MarketplaceBundle = BundleExport | FormBundle | WorkflowBundle | ExtensionBundle;

/**
 * Type guard to check if bundle is a FormBundle
 */
export function isFormBundle(bundle: MarketplaceBundle): bundle is FormBundle {
  return 'form' in bundle && !('forms' in bundle);
}

/**
 * Type guard to check if bundle is a WorkflowBundle
 */
export function isWorkflowBundle(bundle: MarketplaceBundle): bundle is WorkflowBundle {
  return 'workflow' in bundle && !('workflows' in bundle);
}

/**
 * Type guard to check if bundle is a BundleExport (application)
 */
export function isApplicationBundle(bundle: MarketplaceBundle): bundle is BundleExport {
  return 'manifest' in bundle && ('forms' in bundle || 'workflows' in bundle);
}

/**
 * Type guard to check if bundle is an ExtensionBundle
 */
export function isExtensionBundle(bundle: MarketplaceBundle): bundle is ExtensionBundle {
  return 'extension' in bundle && !('form' in bundle) && !('workflow' in bundle) && !('forms' in bundle);
}

/**
 * Deployment Configuration
 * Defines how the application should be deployed
 */
export interface DeploymentConfig {
  mode: 'standalone' | 'connected';
  environment: {
    required: EnvVarSpec[];
    optional: EnvVarSpec[];
  };
  database: {
    provisioning: 'auto' | 'manual' | 'existing';
    collections: CollectionSpec[];
    indexes: IndexSpec[];
  };
  seed: {
    forms: boolean;
    workflows: boolean;
    sampleData?: boolean;
  };
  branding?: {
    appName: string;
    logo?: string;
    favicon?: string;
    primaryColor?: string;
  };
}

/**
 * Environment Variable Specification
 * Defines required/optional environment variables for deployment
 */
export interface EnvVarSpec {
  name: string;
  description: string;
  required: boolean;
  default?: string;
  generator?: 'secret' | 'uuid' | 'none';
}

/**
 * Collection Specification
 * Defines database collections needed for the application
 */
export interface CollectionSpec {
  name: string;
  description?: string;
  indexes?: IndexSpec[];
}

/**
 * Index Specification
 * Defines database indexes for collections
 */
export interface IndexSpec {
  key: Record<string, 1 | -1>;
  name: string;
  unique?: boolean;
  sparse?: boolean;
}

/**
 * Connection Configuration Export
 * Sanitized connection metadata (no secrets)
 */
export interface ConnectionConfigExport {
  name: string;
  description?: string;
  database: string;
  allowedCollections: string[];
  // Excluded: encryptedConnectionString, encryptionKeyId, permissions
}

/**
 * Bundle Import Request
 */
export interface BundleImportRequest {
  manifest: TemplateManifest | ApplicationManifest;
  forms?: FormDefinition[];
  workflows?: WorkflowDefinition[];
  theme?: any;

  /**
   * Bundle wrapper (alternative structure from import scripts)
   */
  bundle?: {
    manifest: TemplateManifest | ApplicationManifest;
    forms?: FormDefinition[];
    workflows?: WorkflowDefinition[];
  };

  /**
   * Target organization and project (required for application creation)
   */
  organizationId?: string;
  projectId?: string;

  /**
   * Import options
   */
  options?: {
    overwriteExisting?: boolean; // Overwrite if form/workflow with same name exists
    generateNewIds?: boolean; // Generate new IDs (default: true)
    preserveSlugs?: boolean; // Keep original slugs if available (default: false)
    createApplication?: boolean; // Create an Application to group imported assets (default: true)
  };
}

/**
 * Bundle Import Result
 */
export interface BundleImportResult {
  success: boolean;
  imported: {
    application?: {
      applicationId: string;
      name: string;
      slug: string;
    };
    forms: Array<{
      originalId?: string;
      newId: string;
      name: string;
      slug: string;
    }>;
    workflows: Array<{
      originalId?: string;
      newId: string;
      name: string;
      slug: string;
    }>;
  };
  errors?: Array<{
    type: 'form' | 'workflow' | 'theme' | 'manifest' | 'application';
    name: string;
    error: string;
  }>;
}
