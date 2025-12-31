/**
 * Public API Types
 *
 * Type definitions for the NetPad public developer API.
 */

// ============================================
// API Key Types
// ============================================

export interface APIKey {
  id: string;
  organizationId: string;
  name: string;
  description?: string;

  // Key details (prefix stored, full key hashed)
  keyPrefix: string;  // First 8 chars for display (e.g., "np_live_abc")
  keyHash: string;    // SHA-256 hash of full key

  // Permissions
  permissions: APIKeyPermission[];

  // Scope limitations
  scopes?: {
    formIds?: string[];      // Limit to specific forms
    allowedIPs?: string[];   // IP allowlist
  };

  // Rate limiting
  rateLimit?: {
    requestsPerHour: number;
    requestsPerDay: number;
  };

  // Status and metadata
  status: 'active' | 'revoked' | 'expired';
  environment: 'live' | 'test';

  // Usage tracking
  lastUsedAt?: Date;
  usageCount: number;

  // Timestamps
  createdAt: Date;
  createdBy: string;
  expiresAt?: Date;
  revokedAt?: Date;
  revokedBy?: string;
  revokedReason?: string;
}

export type APIKeyPermission =
  | 'forms:read'
  | 'forms:write'
  | 'forms:delete'
  | 'submissions:read'
  | 'submissions:write'
  | 'submissions:delete'
  | 'analytics:read'
  | 'webhooks:manage';

export interface CreateAPIKeyRequest {
  name: string;
  description?: string;
  permissions: APIKeyPermission[];
  environment?: 'live' | 'test';
  expiresIn?: number; // Days until expiration
  scopes?: {
    formIds?: string[];
    allowedIPs?: string[];
  };
  rateLimit?: {
    requestsPerHour?: number;
    requestsPerDay?: number;
  };
}

export interface CreateAPIKeyResponse {
  success: true;
  apiKey: {
    id: string;
    key: string;  // Full key - only shown once!
    keyPrefix: string;
    name: string;
    permissions: APIKeyPermission[];
    environment: 'live' | 'test';
    expiresAt?: string;
  };
}

export interface APIKeyListItem {
  id: string;
  name: string;
  description?: string;
  keyPrefix: string;
  permissions: APIKeyPermission[];
  environment: 'live' | 'test';
  status: 'active' | 'revoked' | 'expired';
  lastUsedAt?: string;
  usageCount: number;
  createdAt: string;
  expiresAt?: string;
}

// ============================================
// API Request/Response Types
// ============================================

export interface APIRequestContext {
  apiKey: APIKey;
  organizationId: string;
  requestId: string;
}

export interface APIErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  requestId: string;
}

export interface APIPaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasMore: boolean;
  };
  requestId: string;
}

export interface APISuccessResponse<T> {
  success: true;
  data: T;
  requestId: string;
}

// ============================================
// Public API Form Types (simplified)
// ============================================

export interface PublicFormSummary {
  id: string;
  slug: string;
  name: string;
  description?: string;
  status: 'draft' | 'published';
  responseCount: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface PublicFormDetail extends PublicFormSummary {
  fields: PublicFieldConfig[];
  settings: {
    submitButtonText?: string;
    successMessage?: string;
    redirectUrl?: string;
  };
}

export interface PublicFieldConfig {
  id: string;
  path: string;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string;
  helpText?: string;
  options?: Array<{ value: string; label: string }>;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    min?: number;
    max?: number;
  };
}

export interface PublicSubmission {
  id: string;
  formId: string;
  data: Record<string, any>;
  metadata: {
    submittedAt: string;
    ipAddress?: string;
    userAgent?: string;
    referrer?: string;
  };
}

export interface SubmitFormRequest {
  data: Record<string, any>;
  metadata?: {
    referrer?: string;
    customFields?: Record<string, any>;
  };
}

export interface SubmitFormResponse {
  success: true;
  data: {
    submissionId: string;
    formId: string;
    submittedAt: string;
  };
  requestId: string;
}

// ============================================
// Rate Limiting Types
// ============================================

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
}

export interface RateLimitHeaders {
  'X-RateLimit-Limit': string;
  'X-RateLimit-Remaining': string;
  'X-RateLimit-Reset': string;
  'X-Request-Id': string;
}

// ============================================
// Webhook Types (for API)
// ============================================

export interface WebhookConfig {
  id: string;
  formId: string;
  url: string;
  events: WebhookEvent[];
  secret?: string;
  active: boolean;
  createdAt: string;
}

export type WebhookEvent =
  | 'form.submission.created'
  | 'form.submission.updated'
  | 'form.submission.deleted'
  | 'form.published'
  | 'form.unpublished';

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, any>;
  formId: string;
  organizationId: string;
}
