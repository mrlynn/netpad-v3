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
  author?: string;
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
  name: string;
  description?: string;
  canvas: any;                  // WorkflowCanvas
  settings: any;                // WorkflowSettings
  variables?: any[];            // WorkflowVariable[]
  inputSchema?: any;            // JSONSchemaDefinition
  outputSchema?: any;           // JSONSchemaDefinition
  tags?: string[];
  
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
 * Bundle Export Response
 */
export interface BundleExport {
  manifest: TemplateManifest;
  forms?: FormDefinition[];
  workflows?: WorkflowDefinition[];
  theme?: any;
}

/**
 * Bundle Import Request
 */
export interface BundleImportRequest {
  manifest: TemplateManifest;
  forms?: FormDefinition[];
  workflows?: WorkflowDefinition[];
  theme?: any;
  
  /**
   * Import options
   */
  options?: {
    overwriteExisting?: boolean;  // Overwrite if form/workflow with same name exists
    generateNewIds?: boolean;     // Generate new IDs (default: true)
    preserveSlugs?: boolean;      // Keep original slugs if available (default: false)
  };
}

/**
 * Bundle Import Result
 */
export interface BundleImportResult {
  success: boolean;
  imported: {
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
    type: 'form' | 'workflow' | 'theme' | 'manifest';
    name: string;
    error: string;
  }>;
}
