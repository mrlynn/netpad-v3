/**
 * npm Package Types for NetPad Applications
 * 
 * Types for npm packages containing NetPad applications and plugins
 */

/**
 * NetPad-specific package.json field
 * Defines the structure of the "netpad" field in package.json
 */
export interface NetPadPackageConfig {
  /**
   * Package type: "application", "plugin", or "extension"
   */
  type: 'application' | 'plugin' | 'extension';

  /**
   * Application-specific fields (when type === 'application')
   */
  applicationId?: string;
  name: string;
  description: string;
  version: string;
  minNetPadVersion?: string;
  category?: string;
  tags?: string[];
  icon?: string;
  screenshots?: string[];
  
  /**
   * Plugin-specific fields (when type === 'plugin')
   */
  pluginType?: 'node' | 'field' | 'integration' | 'theme' | 'hook';
  nodes?: Array<{
    name: string;
    type: string;
    description: string;
    version: string;
    category?: string;
    icon?: string;
    code?: string;
    codex?: string;
  }>;
  credentials?: Array<{
    name: string;
    type: string;
    description: string;
    code?: string;
  }>;

  /**
   * Extension-specific fields (when type === 'extension')
   */
  extensionType?: 'node' | 'integration' | 'theme' | 'hook' | 'multi';
  /** Extension metadata */
  extensionMetadata?: {
    id: string;
    name: string;
    version: string;
    description?: string;
    author?: string;
  };
  /** Workflow nodes provided by the extension */
  workflowNodes?: Array<{
    type: string;
    label: string;
    description: string;
    category: string;
    color: string;
    icon: string;
    version: string;
    configFields?: Array<{
      name: string;
      label: string;
      type: string;
      defaultValue?: unknown;
      placeholder?: string;
      helpText?: string;
      required?: boolean;
      options?: Array<{ label: string; value: string }>;
    }>;
    outputs?: Array<{ id: string; label: string; primary?: boolean }>;
  }>;
  /** API routes provided by the extension */
  routes?: Array<{
    path: string;
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    description?: string;
    requiresAuth?: boolean;
  }>;
  /** Feature flags the extension provides */
  features?: string[];
  /** Services for dependency injection */
  serviceNames?: string[];

  /**
   * Dependencies
   */
  dependencies?: {
    applications?: string[];  // e.g., ["@netpad/app-notifications@^1.0.0"]
    plugins?: string[];        // e.g., ["@netpad/plugin-node-slack@^1.0.0"]
    workflowTemplates?: string[]; // e.g., ["@netpad/template-email-notification@^1.0.0"]
  };

  /**
   * Application contract (for applications)
   */
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

  /**
   * Configuration schema (for applications)
   */
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

  /**
   * Verification status (for community packages)
   */
  verified?: boolean;
  
  /**
   * Publisher information (for community packages)
   */
  publisher?: {
    name: string;
    email?: string;
    url?: string;
  };
}

/**
 * Complete npm package.json structure for NetPad packages
 */
export interface NetPadPackageJson {
  name: string;
  version: string;
  description: string;
  keywords: string[];
  author?: string | { name: string; email?: string; url?: string };
  license?: string;
  main: string;  // Path to bundle.json or index.js
  types?: string;  // Path to TypeScript definitions (for plugins)
  files?: string[];  // Files to include in package
  repository?: {
    type: string;
    url: string;
  };
  bugs?: {
    url: string;
  };
  homepage?: string;
  
  /**
   * NetPad-specific configuration
   */
  netpad: NetPadPackageConfig;
  
  /**
   * npm scripts (optional)
   */
  scripts?: {
    build?: string;
    dev?: string;
    test?: string;
    lint?: string;
  };
  
  /**
   * npm dependencies (for plugins that need npm packages)
   */
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

/**
 * Package metadata extracted from npm registry
 */
export interface NpmPackageMetadata {
  name: string;
  version: string;
  description?: string;
  keywords?: string[];
  author?: string | { name: string; email?: string; url?: string };
  license?: string;
  repository?: {
    type: string;
    url: string;
  };
  homepage?: string;
  dist: {
    tarball: string;
    shasum?: string;
    integrity?: string;
  };
  publishedAt?: string;
  publisher?: {
    username: string;
    email: string;
  };
}

/**
 * Package discovery result
 */
export interface DiscoveredPackage {
  name: string;
  version: string;
  description?: string;
  netpad: NetPadPackageConfig;
  metadata: NpmPackageMetadata;
  isOfficial: boolean;  // true if @netpad/ scope
  isVerified: boolean;   // true if verified by NetPad team
  publishedAt?: string;
}

/**
 * Package installation request
 */
export interface InstallPackageRequest {
  packageName: string;
  version?: string;  // Optional, defaults to latest
  orgId: string;
  projectId: string;
  applicationId?: string;  // Optional, for updates
  overwriteExisting?: boolean;  // Optional, whether to overwrite existing installation
  installDependencies?: boolean;  // Optional, whether to install dependencies
}

/**
 * Package installation result
 */
export interface InstallPackageResult {
  success: boolean;
  applicationId?: string;
  version: string;
  dependencies?: {
    installed: string[];
    failed: Array<{ name: string; error: string }>;
  };
  errors?: string[];
}
