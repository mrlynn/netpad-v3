/**
 * RAG Limit Enforcement Middleware
 *
 * Enforces RAG usage limits before allowing operations
 */

import { RAGUsageTrackingService } from '../usage/tracking';
import { RAGStorageConfig, RAGLimitErrorCode, RAGLimitErrorDetails } from '@/types/rag-storage';

/**
 * RAG Limit Error
 * Thrown when a usage limit is exceeded
 */
export class RAGLimitError extends Error {
  constructor(
    message: string,
    public code: RAGLimitErrorCode,
    public details: RAGLimitErrorDetails
  ) {
    super(message);
    this.name = 'RAGLimitError';
  }

  /**
   * Convert to JSON for API responses
   */
  toJSON() {
    return {
      error: this.message,
      code: this.code,
      details: this.details,
    };
  }
}

/**
 * Enforce RAG limits for upload operations
 *
 * @param organizationId - Organization ID
 * @param config - RAG storage configuration
 * @throws RAGLimitError if limits are exceeded
 */
export async function enforceUploadLimits(
  organizationId: string,
  config: RAGStorageConfig
): Promise<void> {
  const trackingService = new RAGUsageTrackingService();
  const limits = await trackingService.checkLimits(organizationId, config);

  if (!limits.canUpload) {
    const violation = limits.violations.find(
      v => v.type === 'documents' || v.type === 'storage'
    );

    if (!violation) {
      throw new RAGLimitError(
        'Upload limit exceeded',
        'LIMIT_EXCEEDED',
        {
          code: 'LIMIT_EXCEEDED',
          upgradeUrl: '/settings/subscription',
        }
      );
    }

    const errorCode: RAGLimitErrorCode =
      violation.type === 'documents' ? 'DOCUMENT_LIMIT_EXCEEDED' : 'STORAGE_LIMIT_EXCEEDED';

    throw new RAGLimitError(violation.message, errorCode, {
      code: errorCode,
      type: violation.type,
      current: violation.current,
      limit: violation.limit,
      upgradeUrl: '/settings/subscription',
    });
  }
}

/**
 * Enforce RAG limits for query operations
 *
 * @param organizationId - Organization ID
 * @param config - RAG storage configuration
 * @throws RAGLimitError if limits are exceeded
 */
export async function enforceQueryLimits(
  organizationId: string,
  config: RAGStorageConfig
): Promise<void> {
  const trackingService = new RAGUsageTrackingService();
  const limits = await trackingService.checkLimits(organizationId, config);

  if (!limits.canQuery) {
    const violation = limits.violations.find(
      v => v.type === 'queries_daily' || v.type === 'queries_monthly'
    );

    if (!violation) {
      throw new RAGLimitError(
        'Query limit exceeded',
        'QUERY_LIMIT_EXCEEDED',
        {
          code: 'QUERY_LIMIT_EXCEEDED',
          upgradeUrl: '/settings/subscription',
        }
      );
    }

    throw new RAGLimitError(violation.message, 'QUERY_LIMIT_EXCEEDED', {
      code: 'QUERY_LIMIT_EXCEEDED',
      type: violation.type,
      current: violation.current,
      limit: violation.limit,
      resetAt: violation.type === 'queries_daily' ? getEndOfDay() : getEndOfMonth(),
      upgradeUrl: '/settings/subscription',
    });
  }
}

/**
 * Check if upload would exceed limits (soft check, doesn't throw)
 *
 * @param organizationId - Organization ID
 * @param config - RAG storage configuration
 * @returns True if upload is allowed
 */
export async function canUpload(
  organizationId: string,
  config: RAGStorageConfig
): Promise<boolean> {
  try {
    await enforceUploadLimits(organizationId, config);
    return true;
  } catch (error) {
    if (error instanceof RAGLimitError) {
      return false;
    }
    throw error; // Re-throw non-limit errors
  }
}

/**
 * Check if query would exceed limits (soft check, doesn't throw)
 *
 * @param organizationId - Organization ID
 * @param config - RAG storage configuration
 * @returns True if query is allowed
 */
export async function canQuery(
  organizationId: string,
  config: RAGStorageConfig
): Promise<boolean> {
  try {
    await enforceQueryLimits(organizationId, config);
    return true;
  } catch (error) {
    if (error instanceof RAGLimitError) {
      return false;
    }
    throw error; // Re-throw non-limit errors
  }
}

/**
 * Get end of day timestamp
 */
function getEndOfDay(): Date {
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  return endOfDay;
}

/**
 * Get end of month timestamp
 */
function getEndOfMonth(): Date {
  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return endOfMonth;
}

/**
 * Format limit error for HTTP response
 *
 * @param error - RAG limit error
 * @returns HTTP response object
 */
export function formatLimitErrorResponse(error: RAGLimitError): {
  status: number;
  body: any;
} {
  return {
    status: 429, // Too Many Requests
    body: {
      error: error.message,
      ...error.details,
      // code is in error.details, so we don't need to specify it separately
    },
  };
}
