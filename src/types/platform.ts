// ============================================
// Platform Types for Multi-Tenant Form Builder
// ============================================

import { ObjectId } from 'mongodb';
import { PasskeyCredential, TrustedDevice } from './auth';
import { CollectionEncryptionConfig, FieldEncryptionConfig } from './form';

// ============================================
// Authentication Methods
// ============================================

export type AuthMethod = 'google' | 'github' | 'magic-link' | 'passkey';
export type AccessControlType = 'public' | 'authenticated' | 'restricted';

// ============================================
// Organization & Multi-tenancy
// ============================================

export type OrgPlan = 'free' | 'pro' | 'team' | 'enterprise';
export type OrgRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface OrganizationSettings {
  allowedAuthMethods: AuthMethod[];
  defaultFormAccess: AccessControlType;
  dataRetentionDays: number;
  maxForms: number;
  maxSubmissionsPerMonth: number;
  maxConnections: number;
  allowCustomBranding: boolean;
}

export interface Organization {
  _id?: ObjectId;
  orgId: string;                      // "org_abc123"
  name: string;
  slug: string;                       // URL-friendly: "acme-corp"
  slugChangedAt?: Date;               // When slug was last changed (for cooldown)

  // Legacy plan field (deprecated - use subscription.tier)
  plan: OrgPlan;
  settings: OrganizationSettings;

  // Subscription & Billing
  subscription?: Subscription;
  billingEmail?: string;
  stripeCustomerId?: string;
  paymentMethods?: PaymentMethod[];

  // RAG Storage Configuration
  ragConfig?: import('./rag-storage').RAGStorageConfig;

  // Usage tracking (legacy - see OrganizationUsage for detailed tracking)
  currentMonthSubmissions: number;
  usageResetDate: Date;

  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
}

// Forward declaration for Subscription (defined later in file)
// This is needed because Organization references Subscription before it's defined
export interface Subscription {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  stripeProductId?: string;
  billingInterval?: BillingInterval;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  trialStart?: Date;
  trialEnd?: Date;
  seatCount?: number;
  seatPrice?: number;
  subscribedAt?: Date;
  canceledAt?: Date;
  updatedAt: Date;
}

export interface OrgMembership {
  orgId: string;
  role: OrgRole;
  joinedAt: Date;
  invitedBy?: string;
}

// ============================================
// Groups & Teams
// ============================================

export interface OrgGroup {
  _id?: ObjectId;
  groupId: string;                    // "grp_abc123"
  organizationId: string;
  name: string;
  slug: string;                       // URL-friendly: "engineering-team"
  description?: string;
  memberIds: string[];                // Array of userIds
  defaultRole?: OrgRole;              // Default role inherited by members
  metadata?: Record<string, unknown>; // Extensible metadata
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Custom Roles (Enterprise)
// ============================================

export interface CustomRole {
  _id?: ObjectId;
  roleId: string;                     // "role_abc123"
  organizationId: string;
  name: string;                       // "billing-admin", "form-reviewer"
  slug: string;                       // URL-friendly identifier
  description?: string;
  baseRole?: OrgRole;                 // Optional: inherit from built-in role
  permissions: string[];              // Explicit permission strings
  isSystem?: boolean;                 // true for built-in roles (non-deletable)
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// All available permissions in the system
export const AVAILABLE_PERMISSIONS = [
  // Organization
  'org:read',
  'org:update',
  'org:delete',
  'org:manage_billing',
  'org:manage_settings',
  
  // Members
  'members:read',
  'members:invite',
  'members:remove',
  'members:update_role',
  
  // Groups
  'groups:read',
  'groups:create',
  'groups:update',
  'groups:delete',
  'groups:manage_members',
  
  // Roles
  'roles:read',
  'roles:create',
  'roles:update',
  'roles:delete',
  'roles:assign',
  
  // Projects
  'projects:read',
  'projects:create',
  'projects:update',
  'projects:delete',
  
  // Forms
  'forms:read',
  'forms:create',
  'forms:update',
  'forms:delete',
  'forms:publish',
  'forms:manage_permissions',
  
  // Submissions/Responses
  'responses:read',
  'responses:export',
  'responses:delete',
  
  // Connections
  'connections:read',
  'connections:create',
  'connections:update',
  'connections:delete',
  'connections:use',
  'connections:view_credentials',
  
  // Workflows
  'workflows:read',
  'workflows:create',
  'workflows:update',
  'workflows:delete',
  'workflows:execute',
  
  // Integrations
  'integrations:read',
  'integrations:create',
  'integrations:update',
  'integrations:delete',
  
  // Audit
  'audit:read',
] as const;

export type Permission = typeof AVAILABLE_PERMISSIONS[number];

// Built-in role → permission mapping
export const BUILTIN_ROLE_PERMISSIONS: Record<OrgRole, Permission[]> = {
  owner: AVAILABLE_PERMISSIONS as unknown as Permission[],
  admin: [
    'org:read', 'org:update', 'org:manage_settings',
    'members:read', 'members:invite', 'members:remove', 'members:update_role',
    'groups:read', 'groups:create', 'groups:update', 'groups:delete', 'groups:manage_members',
    'roles:read', 'roles:assign',
    'projects:read', 'projects:create', 'projects:update', 'projects:delete',
    'forms:read', 'forms:create', 'forms:update', 'forms:delete', 'forms:publish', 'forms:manage_permissions',
    'responses:read', 'responses:export', 'responses:delete',
    'connections:read', 'connections:create', 'connections:update', 'connections:delete', 'connections:use',
    'workflows:read', 'workflows:create', 'workflows:update', 'workflows:delete', 'workflows:execute',
    'integrations:read', 'integrations:create', 'integrations:update', 'integrations:delete',
    'audit:read',
  ],
  member: [
    'org:read',
    'members:read',
    'groups:read',
    'roles:read',
    'projects:read', 'projects:create', 'projects:update',
    'forms:read', 'forms:create', 'forms:update', 'forms:publish',
    'responses:read', 'responses:export',
    'connections:read', 'connections:use',
    'workflows:read', 'workflows:create', 'workflows:update', 'workflows:execute',
    'integrations:read',
  ],
  viewer: [
    'org:read',
    'members:read',
    'groups:read',
    'roles:read',
    'projects:read',
    'forms:read',
    'responses:read',
    'connections:read',
    'workflows:read',
    'integrations:read',
  ],
};

// ============================================
// Role Assignments
// ============================================

export type AssignmentTargetType = 'user' | 'group';
export type AssignmentScopeType = 'org' | 'project' | 'form';

export interface RoleAssignmentScope {
  type: AssignmentScopeType;
  resourceId?: string;                // projectId or formId (omit for org-wide)
}

export interface RoleAssignment {
  _id?: ObjectId;
  assignmentId: string;               // "asgn_abc123"
  organizationId: string;
  
  // Who is being assigned the role
  targetType: AssignmentTargetType;
  targetId: string;                   // userId or groupId
  
  // What role is being assigned
  roleType: 'builtin' | 'custom';
  roleId: string;                     // OrgRole name or customRole.roleId
  
  // Where does this role apply (optional scoping)
  scope?: RoleAssignmentScope;
  
  // Audit trail
  grantedBy: string;
  grantedAt: Date;
  expiresAt?: Date;                   // Optional: time-limited access
  reason?: string;                    // Why was this granted
}

// ============================================
// Effective Permissions (computed)
// ============================================

export interface EffectivePermissions {
  userId: string;
  organizationId: string;
  
  // All permissions this user has (computed from roles + groups)
  permissions: Permission[];
  
  // Breakdown of where permissions come from
  sources: Array<{
    type: 'direct' | 'group' | 'builtin';
    sourceId: string;                 // roleId or groupId
    sourceName: string;
    permissions: Permission[];
  }>;
  
  // Scoped permissions (project/form level overrides)
  scopedPermissions?: Record<string, Permission[]>; // resourceId → permissions
  
  computedAt: Date;
}

// ============================================
// Project
// ============================================

export interface ProjectSettings {
  // Custom settings object for future extensibility
  [key: string]: unknown;
}

export interface ProjectStats {
  formCount: number;
  workflowCount: number;
  clusterCount?: number;
  connectionCount?: number;
  lastActivityAt?: Date;
}

export type ProjectEnvironment = 'dev' | 'test' | 'staging' | 'prod';

export interface Project {
  _id?: ObjectId;
  projectId: string;                    // "proj_abc123"
  organizationId: string;               // "org_xyz789"
  name: string;
  description?: string;
  slug: string;                         // URL-friendly, unique per org
  environment: ProjectEnvironment;      // REQUIRED: dev, test, staging, or prod
  tags: string[];
  color?: string;                       // Hex color for UI theming
  icon?: string;                        // Icon identifier
  settings: ProjectSettings;            // Custom settings object
  stats: ProjectStats;                  // Form count, workflow count, last activity
  defaultVaultId?: string;              // Default vault connection for this project (set when cluster is provisioned)
  createdBy: string;                    // userId
  createdAt: Date;
  updatedAt: Date;
}

// Default settings per plan
export const ORG_PLAN_LIMITS: Record<OrgPlan, Partial<OrganizationSettings>> = {
  free: {
    maxForms: 5,
    maxSubmissionsPerMonth: 100,
    maxConnections: 2,
    dataRetentionDays: 30,
    allowCustomBranding: false,
  },
  pro: {
    maxForms: 50,
    maxSubmissionsPerMonth: 10000,
    maxConnections: 10,
    dataRetentionDays: 365,
    allowCustomBranding: true,
  },
  team: {
    maxForms: 200,
    maxSubmissionsPerMonth: 50000,
    maxConnections: 50,
    dataRetentionDays: 730, // 2 years
    allowCustomBranding: true,
  },
  enterprise: {
    maxForms: -1, // unlimited
    maxSubmissionsPerMonth: -1,
    maxConnections: -1,
    dataRetentionDays: -1, // unlimited
    allowCustomBranding: true,
  },
};

// ============================================
// Platform User (Extended)
// ============================================

export type PlatformRole = 'admin' | 'support';

export interface OAuthConnection {
  provider: 'google' | 'github';
  providerId: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  connectedAt: Date;
  lastUsedAt?: Date;
}

export interface PlatformUser {
  _id?: ObjectId;
  userId: string;                     // "user_abc123"
  authId?: string;                    // Link to auth DB user ObjectId (for passkey/magic link users)
  email: string;
  emailVerified: boolean;

  // Profile
  displayName?: string;
  avatarUrl?: string;

  // Platform role (system-wide)
  platformRole?: PlatformRole;

  // Organization memberships
  organizations: OrgMembership[];

  // OAuth connections
  oauthConnections: OAuthConnection[];

  // Existing auth fields from User type
  passkeys?: PasskeyCredential[];
  trustedDevices?: TrustedDevice[];

  // Test credentials (only for dev/test environments)
  passwordHash?: string;

  // Waitlist
  waitlistStatus?: WaitlistStatus;
  waitlistMetadata?: WaitlistMetadata;

  // Signup onboarding tracking
  signupOnboarding?: {
    completed: boolean;
    completedAt?: Date;
    skippedSteps?: ('database' | 'team-invites')[];
  };

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

// ============================================
// Waitlist
// ============================================

export type WaitlistStatus = 'pending' | 'approved' | 'rejected';

export interface WaitlistMetadata {
  company?: string;
  useCase?: string;
  source?: string;           // "homepage", "referral", etc.
  referralCode?: string;
  notes?: string;            // Admin notes
  appliedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;       // Admin userId
  rejectionReason?: string;

  // Extended fields for better understanding of applicants
  howDidYouHear?: string;    // "social_media", "colleague", "search", "event", "other"
  howDidYouHearOther?: string; // If "other", what specifically?
  role?: string;             // "developer", "data_engineer", "product_manager", "executive", "other"
  teamSize?: string;         // "solo", "2-5", "6-20", "21-100", "100+"
  timeline?: string;         // "immediately", "1-3_months", "3-6_months", "exploring"
  interests?: string[];      // ["forms", "workflows", "ai", "mongodb", "automation"]
  currentTools?: string;     // What tools they currently use
  biggestChallenge?: string; // Their primary pain point
}

// ============================================
// Connection Vault
// ============================================

export type ConnectionRole = 'owner' | 'admin' | 'user';
export type ConnectionStatus = 'active' | 'disabled' | 'deleted';

export interface ConnectionPermission {
  userId: string;
  role: ConnectionRole;
  grantedAt: Date;
  grantedBy: string;
}

export interface ConnectionVault {
  _id?: ObjectId;
  vaultId: string;                    // "vault_abc123"
  organizationId: string;              // Kept for reference
  projectId: string;                    // REQUIRED: NetPad project ID
  createdBy: string;

  // Display info (not sensitive)
  name: string;
  description?: string;

  // Encrypted secret - format: "keyId:iv:ciphertext:authTag"
  encryptedConnectionString: string;
  encryptionKeyId: string;            // For key rotation

  // Target configuration
  database: string;
  allowedCollections: string[];       // Whitelist of collections forms can use

  // Permissions within org
  permissions: ConnectionPermission[];

  // Status & monitoring
  status: ConnectionStatus;
  lastTestedAt?: Date;
  lastUsedAt?: Date;
  usageCount: number;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Form Access Control
// ============================================

export interface FormAccessControl {
  type: AccessControlType;

  // For authenticated/restricted forms
  authMethods?: AuthMethod[];

  // For restricted forms only
  allowedDomains?: string[];          // ["acme.com", "partner.org"]
  allowedUsers?: string[];            // ["user_123", "user_456"]
  allowedEmails?: string[];           // Specific email addresses
}

// ============================================
// Form Permissions (RBAC)
// ============================================

export type FormRole = 'owner' | 'editor' | 'analyst' | 'viewer';

export interface FormPermission {
  userId: string;
  role: FormRole;
  grantedAt: Date;
  grantedBy: string;
}

// Permission capabilities per role
export const FORM_ROLE_CAPABILITIES: Record<FormRole, string[]> = {
  owner: ['read', 'write', 'delete', 'publish', 'manage_permissions', 'transfer', 'view_responses', 'export_responses', 'delete_responses'],
  editor: ['read', 'write', 'publish', 'view_responses', 'export_responses', 'delete_responses'],
  analyst: ['read', 'view_responses', 'export_responses'],
  viewer: ['read'],
};

export const CONNECTION_ROLE_CAPABILITIES: Record<ConnectionRole, string[]> = {
  owner: ['read', 'write', 'delete', 'manage_permissions', 'use', 'view_connection_string'],
  admin: ['read', 'write', 'manage_permissions', 'use'],
  user: ['use'], // Can use in forms but cannot see connection string
};

export const ORG_ROLE_CAPABILITIES: Record<OrgRole, string[]> = {
  owner: ['manage_org', 'delete_org', 'manage_billing', 'manage_members', 'manage_all_forms', 'manage_all_connections', 'create_forms', 'use_connections', 'view_forms', 'view_responses'],
  admin: ['manage_members', 'manage_all_forms', 'manage_all_connections', 'create_forms', 'use_connections', 'view_forms', 'view_responses'],
  member: ['create_forms', 'use_connections', 'view_forms', 'view_responses'],
  viewer: ['view_forms', 'view_responses'],
};

// ============================================
// Application Permissions (Phase 10)
// ============================================

export type ApplicationRole = 'owner' | 'editor' | 'analyst' | 'viewer';

export const APPLICATION_ROLE_CAPABILITIES: Record<ApplicationRole, string[]> = {
  owner: [
    'read',
    'edit',
    'delete',
    'manage_permissions',
    'create_release',
    'publish',
    'view_analytics',
    'export',
  ],
  editor: [
    'read',
    'edit',
    'create_release',
    'view_analytics',
    'export',
  ],
  analyst: [
    'read',
    'view_analytics',
    'export',
  ],
  viewer: [
    'read',
  ],
};

// ============================================
// Data Views
// ============================================

export type DataViewQueryMode = 'query' | 'pipeline';
export type DataViewColumnType = 'string' | 'number' | 'boolean' | 'date' | 'enum' | 'json' | 'objectId' | 'array' | 'stringArray';
export type DataViewAccessMode = 'projectRoles' | 'acl';
export type DataViewAccessLevel = 'viewer' | 'editor' | 'admin';
export type DataViewSource = 'grid' | 'rowDetail' | 'json' | 'api';
export type DataViewMutationStatus = 'applied' | 'rejected';

export interface DataViewSourceConfig {
  connectionId?: string; // Reference to ConnectionVault (vaultId)
  db: string;
  collection: string;
  queryMode: DataViewQueryMode;
  query?: Record<string, any>; // Standard Mongo query
  pipeline?: any[]; // Aggregation pipeline (must end in docs with stable _id)
  defaultSort?: Record<string, 1 | -1>;
  defaultLimit?: number;
}

export interface DataViewColumnValidation {
  minLen?: number;
  maxLen?: number;
  regex?: string | null;
  enum?: string[] | null;
  min?: number | null;
  max?: number | null;
}

export interface DataViewColumnFormat {
  mode: 'none' | 'email' | 'phone' | 'date';
}

export interface DataViewColumn {
  key: string;
  label: string;
  path: string; // Dot path in document
  type: DataViewColumnType;
  width?: number;
  pinned?: boolean;
  visible: boolean;
  editable: boolean;
  required: boolean;
  readOnlyReason?: string | null;
  validation?: DataViewColumnValidation;
  format?: DataViewColumnFormat;
  classification?: 'public' | 'internal' | 'sensitive';
  inferredFromSample?: boolean;
  confidence?: number;
  group?: string; // Optional grouping for UI
}

export interface DataViewAccessControl {
  mode: DataViewAccessMode;
  roles?: DataViewAccessLevel[]; // When mode=projectRoles
  acl?: Array<{
    subjectType: 'user';
    subjectId: string; // userId
    access: DataViewAccessLevel;
  }>;
}

export interface DataViewEditPolicy {
  allowRowCreate: boolean;
  allowRowDelete: boolean;
  allowJsonEdit: boolean; // Escape hatch (default false)
  allowBulkEdit: boolean; // v2+ typically
  constraints?: {
    timeWindowHours?: number | null;
    immutablePaths?: string[];
  };
}

export interface DataViewFieldRule {
  path: string;
  editable: boolean;
  reason?: string;
  allowRoles?: DataViewAccessLevel[];
}

export interface DataViewPermissions {
  viewAccess: DataViewAccessControl;
  editPolicy: DataViewEditPolicy;
  fieldRules?: DataViewFieldRule[];
}

export interface DataViewWorkflowBinding {
  enabled: boolean;
  workflowId?: string; // ObjectId as string
  paths?: string[]; // Optional gating by column paths
}

export interface DataViewWorkflows {
  onCellUpdate?: DataViewWorkflowBinding;
  onRowCreate?: DataViewWorkflowBinding;
  onRowDelete?: DataViewWorkflowBinding;
}

export interface DataViewConcurrency {
  mode: 'none' | 'etag';
  etagPath?: string; // e.g., "_npMeta.etag"
}

export interface DataViewMaskingRule {
  classification: 'public' | 'internal' | 'sensitive';
  maskMode: 'partial' | 'full';
}

export interface DataViewMasking {
  enabled: boolean;
  rules?: DataViewMaskingRule[];
}

export interface DataViewSettings {
  patchWritesOnly?: boolean;
  concurrency?: DataViewConcurrency;
  masking?: DataViewMasking;
}

export interface DataView {
  _id?: ObjectId;
  projectId: string; // "proj_abc123"
  organizationId: string; // "org_xyz789"
  name: string;
  slug: string; // URL-friendly, unique per project
  description?: string;
  source: DataViewSourceConfig;
  columns: DataViewColumn[];
  permissions: DataViewPermissions;
  workflows?: DataViewWorkflows;
  settings?: DataViewSettings;
  createdBy: string; // userId
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

// ============================================
// Data Mutations (Audit Log)
// ============================================

export interface DataMutation {
  _id?: ObjectId;
  projectId: string;
  dataViewId: string; // ObjectId as string
  connectionId?: string; // vaultId reference
  db: string;
  collection: string;
  docId: string; // ObjectId as string
  actor: {
    userId: string;
    email?: string;
    role?: string;
  };
  source: DataViewSource;
  ops: Array<{
    op: 'set' | 'unset';
    path: string;
    from?: any;
    to?: any;
  }>;
  status: DataViewMutationStatus;
  rejectedReason?: string | null;
  createdAt: Date;
}

// ============================================
// Form Data Source (replaces connectionString in form)
// ============================================

export interface FormDataSource {
  vaultId?: string;                   // Reference to ConnectionVault (optional - uses org default if omitted)
  collection: string;                 // Target collection for submissions
}

// ============================================
// Rate Limiting
// ============================================

export type RateLimitResource = 'form_submit_public' | 'form_submit_auth' | 'api' | 'magic_link' | 'waitlist_signup';

export interface RateLimitConfig {
  limit: number;
  windowSeconds: number;
}

export const DEFAULT_RATE_LIMITS: Record<RateLimitResource, RateLimitConfig> = {
  form_submit_public: { limit: 10, windowSeconds: 3600 },   // 10/hour per IP
  form_submit_auth: { limit: 50, windowSeconds: 3600 },     // 50/hour per user
  api: { limit: 1000, windowSeconds: 3600 },                // 1000/hour per user
  magic_link: { limit: 5, windowSeconds: 3600 },            // 5/hour per email
  waitlist_signup: { limit: 5, windowSeconds: 3600 },       // 5/hour per email
};

export interface RateLimitEntry {
  _id?: ObjectId;
  key: string;                        // "ip:192.168.1.1" or "user:user_123" or "email:test@example.com"
  resource: RateLimitResource;
  count: number;
  windowStart: Date;
  expiresAt: Date;                    // TTL index for auto-cleanup
}

// ============================================
// Form Submission (Enhanced)
// ============================================

export type SubmissionSyncStatus = 'pending' | 'synced' | 'failed';

export interface FormSubmissionRespondent {
  userId?: string;
  email?: string;
  authMethod?: AuthMethod;
}

export interface FormSubmissionMetadata {
  ipAddress: string;
  userAgent: string;
  referrer?: string;
  deviceType: 'mobile' | 'desktop' | 'tablet';
  browser?: string;
  os?: string;
}

/**
 * Conversational form data captured during submission
 */
export interface ConversationalSubmissionData {
  /** Conversation ID */
  conversationId: string;
  /** Full conversation transcript (if captureTranscript enabled) */
  transcript?: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: Date;
  }>;
  /** Topic coverage at time of completion */
  topicsCovered?: Array<{
    topicId: string;
    name: string;
    covered: boolean;
    depth: number;
  }>;
  /** Confidence scores per extracted field */
  fieldConfidence?: Record<string, number>;
  /** Overall extraction confidence (0-1) */
  overallConfidence: number;
  /** Number of conversation turns */
  turnCount: number;
  /** Conversation duration in seconds */
  durationSeconds?: number;
  /** When conversation started */
  startedAt?: Date;
  /** When conversation completed */
  completedAt?: Date;
}

export interface PlatformFormSubmission {
  _id?: ObjectId;
  submissionId: string;               // "sub_abc123"
  formId: string;
  formVersion: number;
  organizationId: string;

  // The actual form data
  data: Record<string, unknown>;

  // Respondent info (if authenticated)
  respondent?: FormSubmissionRespondent;

  // Request metadata
  metadata: FormSubmissionMetadata;

  // Conversational form data (if submitted via conversational mode)
  conversationalData?: ConversationalSubmissionData;

  // Sync status to target MongoDB
  syncStatus: SubmissionSyncStatus;
  syncAttempts: number;
  syncedAt?: Date;
  syncError?: string;
  lastSyncAttempt?: Date;

  // Target info (denormalized for sync worker)
  // vaultId is optional - if undefined, uses org's default database
  targetVaultId?: string;
  targetCollection: string;

  // Encryption configuration (for background sync retries)
  encryptionConfig?: {
    collectionEncryption?: CollectionEncryptionConfig;
    encryptedFields?: Record<string, FieldEncryptionConfig>;
  };

  // Timestamps
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Audit Logging
// ============================================

export type AuditEventType =
  | 'user.login'
  | 'user.logout'
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'org.created'
  | 'org.updated'
  | 'org.deleted'
  | 'org.reset'
  | 'org.member_added'
  | 'org.member_removed'
  | 'connection.created'
  | 'connection.updated'
  | 'connection.deleted'
  | 'connection.tested'
  | 'connection.used'
  | 'form.created'
  | 'form.updated'
  | 'form.published'
  | 'form.unpublished'
  | 'form.deleted'
  | 'form.submitted'
  | 'form.submission_synced'
  | 'form.submission_failed'
  | 'subscription.created'
  | 'subscription.updated'
  | 'subscription.canceled'
  | 'subscription.reactivated'
  | 'subscription.trial_will_end'
  | 'invoice.paid'
  | 'invoice.payment_failed'
  | 'payment_method.attached';

export interface AuditLogEntry {
  _id?: ObjectId;
  eventType: AuditEventType;

  // Actor
  userId?: string;
  userEmail?: string;

  // Resource
  resourceType: 'user' | 'organization' | 'connection' | 'form' | 'submission';
  resourceId: string;
  organizationId?: string;

  // Details
  action: string;
  details: Record<string, unknown>;

  // Request context
  ipAddress?: string;
  userAgent?: string;

  // Timestamp
  timestamp: Date;
}

// ============================================
// OAuth State (for OAuth flow)
// ============================================

export interface OAuthState {
  _id?: ObjectId;
  state: string;                      // Random state token
  provider: 'google' | 'github';
  redirectTo?: string;                // Where to redirect after auth
  createdAt: Date;
  expiresAt: Date;                    // TTL: 10 minutes

  // Integration OAuth fields (for connecting external services like Google Sheets)
  integrationType?: string;           // e.g., 'google_sheets', 'google_drive'
  userId?: string;                    // User initiating the connection
  orgId?: string;                     // Organization for the credential
  credentialName?: string;            // User-provided name for the credential
}

// ============================================
// Org Invitation
// ============================================

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

export interface OrgInvitation {
  _id?: ObjectId;
  invitationId: string;               // "inv_abc123"
  organizationId: string;
  email: string;
  role: OrgRole;
  status: InvitationStatus;

  invitedBy: string;                  // userId
  token: string;                      // Secure token for accepting

  createdAt: Date;
  expiresAt: Date;                    // 7 days
  acceptedAt?: Date;
}

// ============================================
// Subscription & Billing
// ============================================

export type SubscriptionTier = 'free' | 'pro' | 'team' | 'enterprise';
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'trialing' | 'incomplete';
export type BillingInterval = 'month' | 'year';

export interface SubscriptionPricing {
  monthly: number;                    // Price in cents
  yearly: number;                     // Price in cents (annual)
  yearlyDiscount: number;             // Percentage discount for annual
}

export const TIER_PRICING: Record<SubscriptionTier, SubscriptionPricing> = {
  free: { monthly: 0, yearly: 0, yearlyDiscount: 0 },
  pro: { monthly: 1900, yearly: 19000, yearlyDiscount: 17 },      // $19/mo or $190/yr
  team: { monthly: 4900, yearly: 49000, yearlyDiscount: 17 },     // $49/seat/mo
  enterprise: { monthly: 0, yearly: 0, yearlyDiscount: 0 },        // Custom pricing
};

export interface PaymentMethod {
  id: string;
  stripePaymentMethodId: string;
  type: 'card' | 'bank_account';
  isDefault: boolean;

  // Card details (last4, brand, etc.)
  card?: {
    brand: string;                    // 'visa', 'mastercard', etc.
    last4: string;
    expMonth: number;
    expYear: number;
  };

  createdAt: Date;
}

export interface Invoice {
  id: string;
  stripeInvoiceId: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  amountDue: number;                  // In cents
  amountPaid: number;
  currency: string;
  invoiceUrl?: string;
  invoicePdf?: string;
  periodStart: Date;
  periodEnd: Date;
  createdAt: Date;
  paidAt?: Date;
}

// ============================================
// AI Feature Gates & Usage
// ============================================

export type AIFeature =
  // Layer 1: Contextual Suggestions
  | 'ai_inline_suggestions'
  | 'ai_field_type_detection'
  | 'ai_completion_hints'
  // Layer 2: Command Interface
  | 'ai_form_generator'
  | 'ai_command_palette'
  | 'ai_formula_assistant'
  | 'ai_conditional_logic'
  | 'ai_validation_patterns'
  | 'ai_node_config_assistant'  // Workflow node configuration assistance
  // Layer 3: Autonomous Agents
  | 'agent_form_optimization'
  | 'agent_response_processing'
  | 'agent_compliance_audit'
  | 'agent_response_insights'
  | 'agent_auto_translation'
  // Layer 4: Knowledge-Guided Features (RAG)
  | 'rag_conversational_forms'      // Main RAG feature for conversational forms
  | 'rag_document_upload'           // Document management for RAG
  | 'rag_vector_search';            // Vector search capabilities

export type PlatformFeature =
  | 'custom_branding'
  | 'white_label'
  | 'api_access'
  | 'webhooks'
  | 'sso_saml'
  | 'field_encryption'
  | 'advanced_analytics'
  | 'csv_export'
  | 'priority_support'
  | 'custom_domain';

export interface TierLimits {
  // Core limits
  maxForms: number;                   // -1 = unlimited
  maxSubmissionsPerMonth: number;
  maxConnections: number;
  maxFileStorageMb: number;
  maxFieldsPerForm: number;
  dataRetentionDays: number;          // -1 = unlimited

  // Team limits
  maxSeats: number;                   // -1 = unlimited

  // AI limits
  aiGenerationsPerMonth: number;      // Form generations, field suggestions
  agentSessionsPerMonth: number;      // Autonomous agent activations
  responseProcessingPerMonth: number; // Response processing agent runs

  // Workflow limits
  workflowExecutionsPerMonth: number; // Workflow executions per month
  maxActiveWorkflows: number;         // Max active workflows (-1 = unlimited)

  // Auto-provisioned cluster limits (M0 free tier)
  autoProvisionedCluster?: boolean;   // Whether tier gets auto-provisioned M0 cluster
  clusterStorageMb?: number;          // 512 for M0
  clusterMaxConnections?: number;     // 500 for M0
}

/**
 * Feature requirements beyond subscription tier
 */
export interface FeatureRequirements {
  /** Minimum cluster tier required (e.g., 'M10' for vector search) */
  clusterTier?: import('@/lib/atlas/types').ClusterInstanceSize;
  /** Atlas feature required (e.g., 'vector_search') */
  atlasFeature?: string;
}

/**
 * Feature metadata for gating (optional - for future use)
 */
export interface FeatureMetadata {
  feature: AIFeature | PlatformFeature;
  requirements?: FeatureRequirements;
}

export interface TierFeatures {
  limits: TierLimits;
  aiFeatures: AIFeature[];
  platformFeatures: PlatformFeature[];
}

/**
 * RAG features that are gated by cluster tier in cloud mode
 * but available to all tiers in self-hosted mode (with Atlas Local)
 */
export const RAG_FEATURES: AIFeature[] = [
  'rag_conversational_forms',
  'rag_document_upload',
  'rag_vector_search',
];

/**
 * Get features available for a tier, adjusted for deployment mode
 *
 * In self-hosted mode, RAG features are available to all tiers
 * (user is responsible for running Atlas Local with Vector Search support)
 *
 * @param tier - Subscription tier
 * @param deploymentMode - 'cloud' or 'self-hosted'
 * @returns TierFeatures with adjusted aiFeatures based on deployment mode
 */
export function getTierFeaturesForDeployment(
  tier: SubscriptionTier,
  deploymentMode: 'cloud' | 'self-hosted'
): TierFeatures {
  const baseFeatures = SUBSCRIPTION_TIERS[tier];

  // In cloud mode, use standard tier features (RAG gated to team+)
  if (deploymentMode === 'cloud') {
    return baseFeatures;
  }

  // In self-hosted mode, add RAG features to all tiers
  // User is responsible for running Atlas Local with Vector Search
  const hasAllRagFeatures = RAG_FEATURES.every(f => baseFeatures.aiFeatures.includes(f));

  if (hasAllRagFeatures) {
    // Tier already has RAG features
    return baseFeatures;
  }

  // Add RAG features for self-hosted deployments
  return {
    ...baseFeatures,
    aiFeatures: [...baseFeatures.aiFeatures, ...RAG_FEATURES],
  };
}

export const SUBSCRIPTION_TIERS: Record<SubscriptionTier, TierFeatures> = {
  free: {
    limits: {
      maxForms: 3,
      maxSubmissionsPerMonth: 1000,          // Increased for M0 cluster
      maxConnections: 1,                      // 1 auto-provisioned connection
      maxFileStorageMb: 100,
      maxFieldsPerForm: 20,                   // Increased
      dataRetentionDays: 30,
      maxSeats: 1,
      aiGenerationsPerMonth: 10,
      agentSessionsPerMonth: 0,
      responseProcessingPerMonth: 0,
      // Workflow limits - basic for free tier
      workflowExecutionsPerMonth: 50,
      maxActiveWorkflows: 1,
      // Auto-provisioned M0 cluster
      autoProvisionedCluster: true,
      clusterStorageMb: 512,
      clusterMaxConnections: 500,
    },
    aiFeatures: [
      'ai_inline_suggestions',
      'ai_field_type_detection',
      'ai_formula_assistant',
      'ai_node_config_assistant',
    ],
    platformFeatures: [],
  },
  pro: {
    limits: {
      maxForms: -1,                   // Unlimited
      maxSubmissionsPerMonth: 1000,
      maxConnections: 5,
      maxFileStorageMb: 1000,
      maxFieldsPerForm: -1,
      dataRetentionDays: 365,
      maxSeats: 1,
      aiGenerationsPerMonth: 100,
      agentSessionsPerMonth: 20,
      responseProcessingPerMonth: 500,
      // Workflow limits - generous for pro tier
      workflowExecutionsPerMonth: 500,
      maxActiveWorkflows: 5,
    },
    aiFeatures: [
      'ai_inline_suggestions',
      'ai_field_type_detection',
      'ai_completion_hints',
      'ai_form_generator',
      'ai_command_palette',
      'ai_formula_assistant',
      'ai_conditional_logic',
      'ai_validation_patterns',
      'ai_node_config_assistant',
      'agent_response_insights',
      // RAG features (no cluster tier requirement)
      'rag_conversational_forms',
      'rag_document_upload',
      'rag_vector_search',
    ],
    platformFeatures: [
      'custom_branding',
      'csv_export',
      'webhooks',
    ],
  },
  team: {
    limits: {
      maxForms: -1,
      maxSubmissionsPerMonth: 10000,
      maxConnections: 20,
      maxFileStorageMb: 10000,
      maxFieldsPerForm: -1,
      dataRetentionDays: -1,
      maxSeats: -1,
      aiGenerationsPerMonth: 500,
      agentSessionsPerMonth: 100,
      responseProcessingPerMonth: 5000,
      // Workflow limits - high volume for team tier
      workflowExecutionsPerMonth: 5000,
      maxActiveWorkflows: 25,
    },
    aiFeatures: [
      'ai_inline_suggestions',
      'ai_field_type_detection',
      'ai_completion_hints',
      'ai_form_generator',
      'ai_command_palette',
      'ai_formula_assistant',
      'ai_conditional_logic',
      'ai_validation_patterns',
      'ai_node_config_assistant',
      'agent_form_optimization',
      'agent_response_processing',
      'agent_response_insights',
      'agent_auto_translation',
      // RAG features (no cluster tier requirement)
      'rag_conversational_forms',
      'rag_document_upload',
      'rag_vector_search',
    ],
    platformFeatures: [
      'custom_branding',
      'white_label',
      'api_access',
      'csv_export',
      'webhooks',
      'field_encryption',
      'advanced_analytics',
    ],
  },
  enterprise: {
    limits: {
      maxForms: -1,
      maxSubmissionsPerMonth: -1,
      maxConnections: -1,
      maxFileStorageMb: -1,
      maxFieldsPerForm: -1,
      dataRetentionDays: -1,
      maxSeats: -1,
      aiGenerationsPerMonth: -1,
      agentSessionsPerMonth: -1,
      responseProcessingPerMonth: -1,
      // Workflow limits - unlimited for enterprise
      workflowExecutionsPerMonth: -1,
      maxActiveWorkflows: -1,
    },
    aiFeatures: [
      'ai_inline_suggestions',
      'ai_field_type_detection',
      'ai_completion_hints',
      'ai_form_generator',
      'ai_command_palette',
      'ai_formula_assistant',
      'ai_conditional_logic',
      'ai_validation_patterns',
      'ai_node_config_assistant',
      'agent_form_optimization',
      'agent_response_processing',
      'agent_compliance_audit',
      'agent_response_insights',
      'agent_auto_translation',
      // RAG features (no cluster tier requirement)
      'rag_conversational_forms',
      'rag_document_upload',
      'rag_vector_search',
    ],
    platformFeatures: [
      'custom_branding',
      'white_label',
      'api_access',
      'csv_export',
      'webhooks',
      'sso_saml',
      'field_encryption',
      'advanced_analytics',
      'priority_support',
      'custom_domain',
    ],
  },
};

// ============================================
// File Storage
// ============================================

export interface StoredFile {
  fileId: string;
  organizationId: string;
  formId?: string;
  submissionId?: string;
  fieldId?: string;

  // Blob storage info
  url: string;
  pathname: string;
  downloadUrl: string;

  // File metadata
  originalName: string;
  mimeType: string;
  size: number;

  // Tracking
  uploadedBy: string;
  uploadedAt: Date;
  deletedAt?: Date;
}

export interface FileUploadLimits {
  maxFileSizeBytes: number;
  maxTotalStorageBytes: number;
  allowedMimeTypes: string[];
}

export type FileUploadErrorCode =
  | 'QUOTA_EXCEEDED'
  | 'FILE_TOO_LARGE'
  | 'INVALID_TYPE'
  | 'UPLOAD_FAILED'
  | 'UNAUTHORIZED'
  | 'NOT_FOUND';

// ============================================
// Usage Tracking
// ============================================

export interface OrganizationUsage {
  _id?: ObjectId;
  organizationId: string;
  period: string;                     // "2025-01" format

  // Core usage
  forms: {
    created: number;
    active: number;
  };
  submissions: {
    total: number;
    byForm: Record<string, number>;
  };
  storage: {
    filesBytes: number;
    responsesBytes: number;
  };

  // AI-specific usage
  ai: {
    generations: number;              // NL form generation, field suggestions
    agentSessions: number;            // Autonomous agent activations
    processingRuns: number;           // Response processing agent runs
    tokensUsed: number;               // For cost tracking
  };

  // Workflow usage
  workflows: {
    executions: number;               // Total workflow executions this period
    byWorkflow: Record<string, number>; // Executions per workflow
    successfulExecutions: number;     // Count of successful executions
    failedExecutions: number;         // Count of failed executions
  };

  // MCP server usage
  mcp?: {
    requests: number;                 // Total MCP requests this period
    byTool: Record<string, number>;   // Requests per tool
    byMethod: {
      get: number;                    // SSE connections
      post: number;                   // Tool calls
    };
    authMethods: {
      oauth: number;                  // OAuth authenticated requests
      apiKey: number;                 // API key authenticated requests
    };
    authFailures: number;             // Failed auth attempts
    errors: number;                   // Error responses
    totalDurationMs: number;          // Total request duration for avg calculation
  };

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Billing Events (for webhooks)
// ============================================

export type BillingEventType =
  | 'subscription.created'
  | 'subscription.updated'
  | 'subscription.canceled'
  | 'subscription.trial_will_end'
  | 'invoice.paid'
  | 'invoice.payment_failed'
  | 'payment_method.attached'
  | 'payment_method.detached';

export interface BillingEvent {
  _id?: ObjectId;
  eventId: string;
  stripeEventId: string;
  type: BillingEventType;
  organizationId: string;
  data: Record<string, unknown>;
  processedAt?: Date;
  createdAt: Date;
}

// ============================================
// Atlas User Invitations (Console Access)
// ============================================

export type AtlasInvitationStatus = 'pending' | 'accepted' | 'expired' | 'cancelled';

/**
 * Tracks Atlas console invitations sent to users
 * so they can view their cluster in cloud.mongodb.com
 */
export interface AtlasInvitationRecord {
  _id?: ObjectId;
  invitationId: string;           // Our internal ID: "atlasinv_abc123"
  atlasInvitationId: string;      // Atlas API invitation ID
  organizationId: string;         // Our org ID
  atlasProjectId: string;         // Atlas project they're invited to
  userId?: string;                // Our user ID (if known at invite time)
  email: string;                  // Invitee email
  atlasRole: string;              // e.g., "GROUP_DATA_ACCESS_READ_WRITE"
  status: AtlasInvitationStatus;
  createdAt: Date;
  expiresAt: Date;
  acceptedAt?: Date;
  lastCheckedAt?: Date;           // When we last synced status with Atlas
}

// ============================================
// Auto-Provisioned Clusters
// ============================================

export type ClusterProvisioningStatus =
  | 'pending'
  | 'creating_project'
  | 'creating_cluster'
  | 'creating_user'
  | 'configuring_network'
  | 'ready'
  | 'failed'
  | 'deleted';

export interface ProvisionedClusterInfo {
  clusterId: string;
  provider: 'AWS' | 'GCP' | 'AZURE';
  region: string;
  instanceSize: 'M0';
  status: ClusterProvisioningStatus;
  storageLimitMb: number;
  maxConnections: number;
  vaultId?: string;
  createdAt: Date;
  provisioningStartedAt: Date;
  provisioningCompletedAt?: Date;
  // Admin/troubleshooting details
  atlasProjectId?: string;
  atlasProjectName?: string;
  atlasClusterName?: string;
  atlasClusterId?: string;
  databaseUsername?: string;
  statusMessage?: string;
}

// ============================================
// Integration Credentials (OAuth, API Keys)
// ============================================

/**
 * Supported integration providers
 */
export type IntegrationProvider =
  | 'google_sheets'
  | 'google_drive'
  | 'google_calendar'
  | 'google_forms'
  | 'slack'
  | 'notion'
  | 'airtable'
  | 'hubspot'
  | 'salesforce'
  | 'stripe'
  | 'twilio'
  | 'sendgrid'
  | 'mailchimp'
  | 'smtp'           // User-provided SMTP server for email
  | 'zapier'
  | 'mongodb_atlas'
  | 'mongodb_atlas_data_api'
  | 'custom_oauth2'
  | 'custom_api_key';

/**
 * Authentication type for integration
 */
export type IntegrationAuthType =
  | 'oauth2'
  | 'service_account'
  | 'api_key'
  | 'basic_auth';

/**
 * Status of integration credential
 */
export type IntegrationCredentialStatus =
  | 'active'
  | 'expired'
  | 'revoked'
  | 'error'
  | 'disabled';

/**
 * OAuth2 tokens stored in the vault
 */
export interface OAuth2Tokens {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresAt?: Date;
  scope?: string;
}

/**
 * Service account credentials (e.g., Google Service Account JSON)
 */
export interface ServiceAccountCredentials {
  type: 'service_account';
  projectId: string;
  privateKeyId?: string;
  privateKey: string;
  clientEmail: string;
  clientId?: string;
  authUri?: string;
  tokenUri?: string;
}

/**
 * API Key credentials
 */
export interface ApiKeyCredentials {
  apiKey: string;
  apiSecret?: string;
}

/**
 * Basic Auth credentials
 */
export interface BasicAuthCredentials {
  username: string;
  password: string;
}

/**
 * SMTP server credentials for email sending
 */
export interface SmtpCredentials {
  host: string;
  port: number;
  secure?: boolean;      // true for port 465, false for others (STARTTLS)
  username: string;
  password: string;
  fromEmail?: string;    // Default sender email
  fromName?: string;     // Default sender name
}

/**
 * SendGrid API credentials for email sending
 */
export interface SendGridCredentials {
  apiKey: string;
  fromEmail: string;     // Verified sender email in SendGrid
  fromName?: string;     // Default sender name
}

/**
 * Integration credential stored in vault
 */
export interface IntegrationCredential {
  _id?: ObjectId;
  credentialId: string;           // "intcred_abc123"
  organizationId: string;
  createdBy: string;

  // Integration info
  provider: IntegrationProvider;
  name: string;                   // User-friendly name
  description?: string;

  // Authentication
  authType: IntegrationAuthType;
  encryptedCredentials: string;   // Encrypted JSON of credentials
  encryptionKeyId: string;

  // Status & Monitoring
  status: IntegrationCredentialStatus;
  lastUsedAt?: Date;
  lastValidatedAt?: Date;
  usageCount: number;

  // OAuth-specific metadata (not encrypted, for display)
  oauthMetadata?: {
    connectedEmail?: string;
    connectedAccount?: string;
    scopes?: string[];
    expiresAt?: Date;
  };

  // Service account metadata (not encrypted)
  serviceAccountMetadata?: {
    clientEmail?: string;
    projectId?: string;
  };

  // Permissions within org
  permissions: ConnectionPermission[];

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // MongoDB Atlas-specific metadata (not encrypted)
  atlasMetadata?: AtlasIntegrationMetadata;
}

/**
 * MongoDB Atlas integration metadata (for Admin API credentials)
 */
export interface AtlasIntegrationMetadata {
  atlasOrgId: string;               // Atlas Organization ID
  atlasOrgName?: string;            // Human-readable org name
  connectedProjectsCount?: number;  // Number of projects accessible
  lastSyncedAt?: Date;              // When metadata was last refreshed
}

/**
 * MongoDB Atlas Data API metadata (for Data API credentials)
 */
export interface AtlasDataApiMetadata {
  appId: string;                    // Data API App ID
  dataSource?: string;              // Default data source (cluster name)
  defaultDatabase?: string;         // Default database name
}

/**
 * Google-specific OAuth scopes
 */
export const GOOGLE_OAUTH_SCOPES = {
  sheets: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file',
  ],
  drive: [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/drive.file',
  ],
  calendar: [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
  ],
} as const;

/**
 * Integration provider configuration
 */
export interface IntegrationProviderConfig {
  provider: IntegrationProvider;
  name: string;
  description: string;
  icon: string;
  supportedAuthTypes: IntegrationAuthType[];
  requiredScopes?: string[];
  oauthConfig?: {
    authorizationUrl: string;
    tokenUrl: string;
    clientId: string;
    // clientSecret is stored server-side
  };
}
