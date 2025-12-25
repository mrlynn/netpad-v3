/**
 * Form Lifecycle Hooks - User-friendly automation configuration
 *
 * These types provide a simpler interface for common automation needs:
 * - Pre-filling fields from URL parameters
 * - Custom success/error messages
 * - Redirects after submission
 * - Webhook notifications
 *
 * This complements the more advanced FormLifecycle type which handles
 * mode-specific behavior (create/edit/view/clone).
 */

// ============================================
// Pre-Load Hooks
// ============================================

/**
 * Configuration for pre-filling form fields
 */
export interface PrefillConfig {
  /** Enable automatic pre-filling from URL query parameters */
  fromUrlParams?: boolean;

  /**
   * Custom mapping from URL parameter names to field paths
   * Example: { "email": "contact_email", "ref": "referral_code" }
   * If not specified, URL params match field paths directly
   */
  urlParamMapping?: Record<string, string>;

  /**
   * Default values to apply if not provided via URL
   * These are applied after URL params
   */
  defaults?: Record<string, unknown>;
}

// ============================================
// Post-Submit Hooks
// ============================================

/**
 * Configuration for redirect after form submission
 */
export interface RedirectConfig {
  /** URL to redirect to */
  url: string;

  /** Seconds to wait before redirecting (0 = immediate) */
  delay?: number;

  /** Append ?responseId=xxx to the redirect URL */
  includeResponseId?: boolean;

  /**
   * Field paths to include as URL query parameters
   * Example: ["email", "name"] → ?email=value&name=value
   */
  includeFields?: string[];
}

/**
 * Configuration for webhook notification
 */
export interface WebhookConfig {
  /** Webhook endpoint URL */
  url: string;

  /** HTTP method (default: POST) */
  method?: 'POST' | 'PUT';

  /**
   * Custom headers to include (for authentication)
   * Example: { "Authorization": "Bearer xxx", "X-API-Key": "xxx" }
   */
  headers?: Record<string, string>;

  /**
   * Which fields to include in the webhook payload
   * 'all' = include all form fields
   * string[] = include only specified field paths
   */
  includeFields?: 'all' | string[];

  /** Retry on failure */
  retryOnFailure?: boolean;

  /** Maximum retry attempts (default: 3) */
  maxRetries?: number;
}

/**
 * Configuration for what happens after successful submission
 */
export interface OnSubmitSuccessConfig {
  /**
   * Custom success message to display
   * Supports template variables: {{fieldPath}}, {{responseId}}
   * Example: "Thank you, {{name}}! Your submission was received."
   */
  message?: string;

  /** Optional redirect configuration */
  redirect?: RedirectConfig;

  /** Optional webhook notification */
  webhook?: WebhookConfig;
}

/**
 * Configuration for what happens on submission error
 */
export interface OnSubmitErrorConfig {
  /**
   * Custom error message to display
   * If not set, shows the API error message
   */
  message?: string;

  /** Optional webhook for error notifications */
  webhook?: WebhookConfig;
}

// ============================================
// Combined Hooks Configuration
// ============================================

/**
 * Complete form automation/hooks configuration
 * This is the user-friendly interface exposed in the "Actions & Automation" tab
 */
export interface FormHooksConfig {
  /** Pre-load configuration (before form renders) */
  prefill?: PrefillConfig;

  /** What happens after successful submission */
  onSuccess?: OnSubmitSuccessConfig;

  /** What happens on submission error */
  onError?: OnSubmitErrorConfig;
}

// ============================================
// Webhook Payload Types
// ============================================

/**
 * Payload sent to webhook endpoints
 */
export interface WebhookPayload {
  /** Event type */
  event: 'form_submission' | 'form_submission_error';

  /** Form metadata */
  formId: string;
  formName: string;

  /** Response metadata */
  responseId?: string;
  submittedAt: string;

  /** Form field data */
  data: Record<string, unknown>;

  /** Error details (for error events) */
  error?: {
    message: string;
    code?: string;
  };
}

/**
 * Result of webhook execution
 */
export interface WebhookResult {
  success: boolean;
  statusCode?: number;
  error?: string;
  retryCount?: number;
}

// ============================================
// Template Variable Helpers
// ============================================

/**
 * Supported template variables for success/error messages
 */
export type TemplateVariable =
  | `{{${string}}}`;  // Field values: {{name}}, {{email}}

/**
 * Replace template variables in a message string
 */
export function replaceTemplateVariables(
  template: string,
  data: Record<string, unknown>,
  responseId?: string
): string {
  let result = template;

  // Replace {{responseId}}
  if (responseId) {
    result = result.replace(/\{\{responseId\}\}/g, responseId);
  }

  // Replace field variables {{fieldPath}}
  result = result.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, fieldPath) => {
    const value = getNestedValue(data, fieldPath);
    return value !== undefined ? String(value) : match;
  });

  return result;
}

/**
 * Get a nested value from an object using dot notation
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current: unknown, key) => {
    if (current && typeof current === 'object' && key in current) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

// ============================================
// URL Building Helpers
// ============================================

/**
 * Build redirect URL with optional query parameters
 */
export function buildRedirectUrl(
  config: RedirectConfig,
  data: Record<string, unknown>,
  responseId?: string
): string {
  const url = new URL(config.url);

  // Add response ID if configured
  if (config.includeResponseId && responseId) {
    url.searchParams.set('responseId', responseId);
  }

  // Add field values if configured
  if (config.includeFields) {
    for (const fieldPath of config.includeFields) {
      const value = getNestedValue(data, fieldPath);
      if (value !== undefined) {
        url.searchParams.set(fieldPath, String(value));
      }
    }
  }

  return url.toString();
}

/**
 * Parse URL parameters for pre-filling
 */
export function parseUrlParamsForPrefill(
  searchParams: URLSearchParams,
  config: PrefillConfig,
  fieldPaths: string[]
): Record<string, string> {
  const result: Record<string, string> = {};

  // Apply defaults first
  if (config.defaults) {
    for (const [key, value] of Object.entries(config.defaults)) {
      if (value !== undefined) {
        result[key] = String(value);
      }
    }
  }

  // Then apply URL params (they override defaults)
  if (config.fromUrlParams) {
    for (const [param, value] of searchParams.entries()) {
      // Check if there's a custom mapping
      const fieldPath = config.urlParamMapping?.[param] ?? param;

      // Only apply if the field exists in the form
      if (fieldPaths.includes(fieldPath)) {
        result[fieldPath] = value;
      }
    }
  }

  return result;
}
