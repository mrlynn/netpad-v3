/**
 * Bundle Types for Standalone NetPad Applications
 *
 * These types define the structure of the bundle.json file
 * that contains all forms, workflows, and configuration.
 */

export interface BundleManifest {
  name: string;
  version: string;
  description?: string;
  author?: string;
  netpadVersion?: string;
  assets: {
    forms?: string[];
    workflows?: string[];
    theme?: string;
  };
  tags?: string[];
  category?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FormDefinition {
  name: string;
  description?: string;
  slug?: string;
  fieldConfigs: FieldConfig[];
  variables?: FormVariable[];
  events?: FormEvent[];
  theme?: FormTheme;
  branding?: FormBranding;
  multiPage?: MultiPageConfig;
  botProtection?: BotProtectionConfig;
  createdAt?: string;
  updatedAt?: string;
}

export interface FieldConfig {
  id: string;
  name: string;
  type: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  included?: boolean;
  validation?: FieldValidation;
  options?: FieldOption[];
  defaultValue?: any;
  conditionalLogic?: ConditionalLogic;
  [key: string]: any;
}

export interface FieldValidation {
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  customMessage?: string;
}

export interface FieldOption {
  label: string;
  value: string;
}

export interface FormVariable {
  name: string;
  type: string;
  defaultValue?: any;
}

export interface FormEvent {
  trigger: string;
  action: string;
  config?: Record<string, any>;
}

export interface FormTheme {
  primaryColor?: string;
  backgroundColor?: string;
  fontFamily?: string;
  borderRadius?: number;
}

export interface FormBranding {
  logo?: string;
  favicon?: string;
  companyName?: string;
}

export interface MultiPageConfig {
  enabled: boolean;
  pages?: PageConfig[];
}

export interface PageConfig {
  id: string;
  title: string;
  type: 'form' | 'info' | 'summary' | 'complete';
  fields?: string[];
}

export interface BotProtectionConfig {
  honeypot?: { enabled: boolean };
  timing?: { enabled: boolean; minTime?: number };
  turnstile?: { enabled: boolean; siteKey?: string };
}

export interface ConditionalLogic {
  action: 'show' | 'hide' | 'require';
  conditions: Condition[];
  operator: 'and' | 'or';
}

export interface Condition {
  field: string;
  operator: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan';
  value: any;
}

export interface WorkflowDefinition {
  name: string;
  description?: string;
  slug?: string;
  canvas: WorkflowCanvas;
  settings: WorkflowSettings;
  variables?: WorkflowVariable[];
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkflowCanvas {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  viewport?: { x: number; y: number; zoom: number };
}

export interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, any>;
  config?: Record<string, any>;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  data?: Record<string, any>;
}

export interface WorkflowSettings {
  executionMode?: 'sequential' | 'parallel';
  retryPolicy?: RetryPolicy;
  errorHandling?: 'stop' | 'continue' | 'rollback';
  timezone?: string;
}

export interface RetryPolicy {
  maxRetries: number;
  retryDelayMs: number;
  backoffMultiplier?: number;
}

export interface WorkflowVariable {
  name: string;
  type: string;
  defaultValue?: any;
}

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

export interface EnvVarSpec {
  name: string;
  description: string;
  required: boolean;
  default?: string;
  generator?: 'secret' | 'uuid' | 'none';
}

export interface CollectionSpec {
  name: string;
  description?: string;
  indexes?: IndexSpec[];
}

export interface IndexSpec {
  key: Record<string, 1 | -1>;
  name: string;
  unique?: boolean;
  sparse?: boolean;
}

export interface ProjectMetadata {
  name: string;
  description?: string;
  settings?: Record<string, unknown>;
  branding?: {
    logo?: string;
    primaryColor?: string;
    favicon?: string;
  };
}

/**
 * Complete Bundle Export structure
 * This is what bundle.json contains
 */
export interface ApplicationBundle {
  manifest: BundleManifest;
  forms?: FormDefinition[];
  workflows?: WorkflowDefinition[];
  theme?: FormTheme;
  project?: ProjectMetadata;
  deployment?: DeploymentConfig;
}

/**
 * Runtime state for the standalone application
 */
export interface AppState {
  initialized: boolean;
  initializedAt?: string;
  formsCount: number;
  workflowsCount: number;
  bundleVersion: string;
}
