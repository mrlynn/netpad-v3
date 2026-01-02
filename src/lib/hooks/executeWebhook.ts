/**
 * Webhook Execution Service
 *
 * Handles executing webhook notifications after form submission.
 * Runs server-side to protect webhook URLs and auth tokens.
 */

import { WebhookConfig, WebhookPayload, WebhookResult } from '@/types/formHooks';

// Maximum timeout for webhook requests (10 seconds)
const WEBHOOK_TIMEOUT = 10000;

// Delay between retries (exponential backoff base)
const RETRY_BASE_DELAY = 1000;

/**
 * Validate webhook URL to prevent SSRF attacks
 */
function validateWebhookUrl(url: string): { valid: boolean; error?: string } {
  try {
    const parsed = new URL(url);

    // Only allow HTTPS (or HTTP for localhost in development)
    if (parsed.protocol !== 'https:') {
      if (process.env.NODE_ENV === 'development' && parsed.hostname === 'localhost') {
        // Allow HTTP localhost in development
      } else {
        return { valid: false, error: 'Webhook URL must use HTTPS' };
      }
    }

    // Block internal/private IP ranges
    const hostname = parsed.hostname.toLowerCase();
    const blockedPatterns = [
      /^localhost$/,
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[01])\./,
      /^192\.168\./,
      /^0\./,
      /^169\.254\./,
      /^::1$/,
      /^fc00:/,
      /^fe80:/,
    ];

    // Allow localhost in development
    if (process.env.NODE_ENV !== 'development') {
      for (const pattern of blockedPatterns) {
        if (pattern.test(hostname)) {
          return { valid: false, error: 'Internal URLs are not allowed' };
        }
      }
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Build the webhook payload
 */
function buildWebhookPayload(
  config: WebhookConfig,
  context: {
    formId: string;
    formName: string;
    responseId?: string;
    data: Record<string, unknown>;
    isError?: boolean;
    errorMessage?: string;
  }
): WebhookPayload {
  // Filter data to only include specified fields
  let filteredData = context.data;
  if (config.includeFields && config.includeFields !== 'all') {
    filteredData = {};
    for (const fieldPath of config.includeFields) {
      if (fieldPath in context.data) {
        filteredData[fieldPath] = context.data[fieldPath];
      }
    }
  }

  const payload: WebhookPayload = {
    event: context.isError ? 'form_submission_error' : 'form_submission',
    formId: context.formId,
    formName: context.formName,
    responseId: context.responseId,
    submittedAt: new Date().toISOString(),
    data: filteredData,
  };

  if (context.isError && context.errorMessage) {
    payload.error = {
      message: context.errorMessage,
    };
  }

  return payload;
}

/**
 * Execute a single webhook request with timeout
 */
async function executeWebhookRequest(
  url: string,
  method: 'POST' | 'PUT',
  headers: Record<string, string>,
  payload: WebhookPayload
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT);

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MongoDB-NetPad-Webhook/1.0',
        ...headers,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Consider 2xx and 3xx as success
    const success = response.status >= 200 && response.status < 400;

    return {
      success,
      statusCode: response.status,
      error: success ? undefined : `HTTP ${response.status}: ${response.statusText}`,
    };
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      return {
        success: false,
        error: 'Request timed out',
      };
    }

    return {
      success: false,
      error: error.message || 'Network error',
    };
  }
}

/**
 * Execute a webhook with optional retries
 */
export async function executeWebhook(
  config: WebhookConfig,
  context: {
    formId: string;
    formName: string;
    responseId?: string;
    data: Record<string, unknown>;
    isError?: boolean;
    errorMessage?: string;
  }
): Promise<WebhookResult> {
  // Validate URL
  const urlValidation = validateWebhookUrl(config.url);
  if (!urlValidation.valid) {
    return {
      success: false,
      error: urlValidation.error,
    };
  }

  const method = config.method || 'POST';
  const headers = config.headers || {};
  const maxRetries = config.retryOnFailure ? (config.maxRetries || 3) : 0;

  const payload = buildWebhookPayload(config, context);

  let lastResult: WebhookResult = { success: false };
  let retryCount = 0;

  // Try initial request + retries
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Wait before retry (exponential backoff)
    if (attempt > 0) {
      const delay = RETRY_BASE_DELAY * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
      retryCount = attempt;
    }

    const result = await executeWebhookRequest(config.url, method, headers, payload);

    lastResult = {
      ...result,
      retryCount: attempt > 0 ? attempt : undefined,
    };

    if (result.success) {
      return lastResult;
    }

    // Don't retry on client errors (4xx) except 429 (rate limit)
    if (result.statusCode && result.statusCode >= 400 && result.statusCode < 500 && result.statusCode !== 429) {
      return lastResult;
    }
  }

  return lastResult;
}

/**
 * Execute webhook in the background (fire-and-forget)
 * This doesn't block the form submission response
 */
export function executeWebhookAsync(
  config: WebhookConfig,
  context: {
    formId: string;
    formName: string;
    responseId?: string;
    data: Record<string, unknown>;
    isError?: boolean;
    errorMessage?: string;
  }
): void {
  // Fire and forget - don't await
  executeWebhook(config, context)
    .then(result => {
      if (!result.success) {
        console.error('[Webhook] Failed to execute webhook:', {
          url: config.url,
          error: result.error,
          statusCode: result.statusCode,
          retryCount: result.retryCount,
        });
      } else {
        console.log('[Webhook] Successfully executed webhook:', {
          url: config.url,
          statusCode: result.statusCode,
        });
      }
    })
    .catch(err => {
      console.error('[Webhook] Unexpected error:', err);
    });
}
