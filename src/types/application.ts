/**
 * Application Entity Types
 * 
 * Types for the Applications-First model where Applications are the primary
 * organizational unit within projects. Applications contain forms, workflows,
 * and configuration.
 * 
 * Based on: docs/netpad_applications_first_implementation_spec_v1.md
 */

import { ObjectId } from 'mongodb';

// ============================================
// Application Entity
// ============================================

/**
 * Main Application entity stored in organization database
 */
export interface Application {
  _id?: ObjectId;
  applicationId: string;          // "app_abc123"
  projectId: string;              // Which project this belongs to
  organizationId: string;         // Which org (for queries)
  
  // Identity
  name: string;
  description?: string;
  slug: string;                   // URL-friendly, unique per project
  icon?: string;
  color?: string;
  
  // Metadata
  version?: string;               // Semantic version (1.0.0)
  tags?: string[];
  
  // Stats (computed)
  stats: {
    formsCount: number;
    workflowsCount: number;
    connectionsCount: number;
  };
  
  // Lifecycle
  status: ApplicationStatus;
  isDefault?: boolean;            // True for system-created default applications
  
  // Marketplace metadata (for imported applications)
  marketplaceApplicationId?: string;  // ID of marketplace app this was imported from
  marketplaceVersion?: string;        // Version imported from marketplace

  // Source tracking - where this application originated
  source?: ApplicationSource;         // 'user' | 'installed' | 'system' | 'template'
  sourceTemplateId?: string;          // Original template ID if source is 'template'
  
  // Permissions (Phase 10)
  defaultAccess?: 'org_members' | 'explicit';  // Default: 'org_members'
  
  // Timestamps
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ApplicationStatus = 'draft' | 'active' | 'archived';

/**
 * Application Source - Where the application came from
 * Used for filtering, visual treatment, and analytics
 *
 * - 'scratch': Created from blank by user
 * - 'template': Created from a gallery template
 * - 'marketplace': Installed from the marketplace
 * - 'import': Imported from external source (file upload, etc.)
 * - 'system': Auto-created by system (e.g., default application)
 */
export type ApplicationSource = 'scratch' | 'template' | 'marketplace' | 'import' | 'system';

// ============================================
// Application Permissions (Phase 10)
// ============================================

/**
 * Application Role - Permissions level for an application
 */
export type ApplicationRole = 'owner' | 'editor' | 'analyst' | 'viewer';

/**
 * Application Permission - Explicit permission for a user on an application
 */
export interface ApplicationPermission {
  _id?: ObjectId;
  permissionId: string;              // "perm_abc123"
  organizationId: string;              // "org_xyz789"
  applicationId: string;               // "app_def456"
  userId: string;                      // "user_ghi789"
  role: ApplicationRole;
  grantedBy: string;                   // userId who granted this permission
  grantedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Application Contract
// ============================================

/**
 * Application Contract - Explicit, diffable, enforceable
 * 
 * Defines the public API surface of an application. This is NOT inferred
 * from forms/workflows. It's explicitly declared by the application builder.
 */
export interface ApplicationContract {
  _id?: ObjectId;
  contractId: string;              // "contract_abc123"
  applicationId: string;            // "app_xyz789"
  version: string;                  // Semantic version (1.0.0) - matches release version
  status: 'draft' | 'active' | 'deprecated';
  
  /**
   * Input Contract - What external consumers must provide
   * Only includes inputs that are part of the public API
   */
  inputs: {
    [key: string]: {
      type: string;                 // 'string', 'number', 'boolean', 'object', 'array'
      required: boolean;
      constraints?: {
        min?: number;
        max?: number;
        pattern?: string;
        enum?: any[];
      };
      source?: 'form' | 'api' | 'webhook' | 'config';
      description?: string;
    };
  };
  
  /**
   * Output Guarantees - What consumers can rely on
   * Only includes outputs that are guaranteed to exist
   */
  outputs: {
    [key: string]: {
      type: string;
      guaranteed: boolean;           // Must always be present
      description?: string;
    };
  };
  
  /**
   * Side Effects - What the application does
   * Documents writes, API calls, notifications, etc.
   */
  sideEffects: Array<{
    type: 'write' | 'api_call' | 'notification' | 'workflow_trigger';
    target: string;                  // Collection name, API endpoint, etc.
    description?: string;
  }>;
  
  /**
   * Events - Events the application emits
   * What external systems can subscribe to
   */
  events: Array<{
    name: string;
    payloadSchema?: Record<string, any>;  // JSON Schema for event payload
    description?: string;
  }>;
  
  /**
   * Behavioral Guarantees - What workflows/behaviors run
   * Documents which workflows are part of the public contract
   */
  behaviors: Array<{
    workflowId: string;
    trigger: string;                 // What triggers this workflow
    description?: string;
  }>;
  
  /**
   * Stability Promises - What will NOT change without major version
   * Explicit promises about what remains stable
   */
  stability: {
    inputs: boolean;                 // Input contract is stable
    outputs: boolean;                // Output contract is stable
    sideEffects: boolean;            // Side effects are stable
    events: boolean;                 // Events are stable
  };
  
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Application Release
// ============================================

/**
 * Application Release - packaging spine for install, upgrade, rollback
 */
export interface ApplicationRelease {
  _id?: ObjectId;
  releaseId: string;
  applicationId: string;
  version: string;
  contractId: string;
  changelog?: string;

  manifest: {
    forms: Array<{
      formId: string;
      role: 'primary' | 'secondary';
    }>;
    workflows: Array<{
      workflowId: string;
      role: 'core' | 'extension';
    }>;
    configSchemaId: string;
  };

  createdAt: Date;
}

// ============================================
// Configuration Schema
// ============================================

/**
 * Configuration Schema - defines configuration options for an application
 */
export interface ConfigSchema {
  _id?: ObjectId;
  configSchemaId: string;
  applicationId: string;
  version: string;

  fields: Array<{
    key: string;
    type: 'string' | 'number' | 'boolean' | 'secret' | 'select';
    required: boolean;
    default?: any;
    description?: string;
    options?: Array<{ value: any; label: string }>;  // For select type
  }>;

  createdAt: Date;
}

// ============================================
// Workflow Templates and Instances
// ============================================

/**
 * Workflow Template - reusable workflow definition
 * Templates can be instantiated into applications
 */
export interface WorkflowTemplate {
  _id?: ObjectId;
  templateId: string;
  name: string;
  version: string;
  tags?: string[];
  definition: any;              // WorkflowDefinition
  createdBy: string;
  createdAt: Date;
  updatedAt?: Date;
}

/**
 * Workflow Instance - workflow instantiated in an application
 * Each instance belongs to exactly one application
 */
export interface WorkflowInstance {
  _id?: ObjectId;
  workflowId: string;           // References WorkflowDocument.id
  applicationId: string;
  templateId?: string;          // If instantiated from template
  templateVersion?: string;
  locked: boolean;              // Whether this is a contract-defining workflow
  createdAt: Date;
}

/**
 * Protected Component (for explicit locking)
 * 
 * Used for optional explicit locking of forms/workflows.
 * Separate from contract enforcement - use for explicit protection
 * of critical components.
 */
export interface ProtectedComponent {
  componentId: string;
  componentType: 'form' | 'workflow';
  locked: boolean;
  contractId?: string; // Optional: link to contract
  lockedAt?: Date;
  lockedBy?: string; // userId
  editableFields?: string[]; // Optional: allow editing specific fields even when locked
}
