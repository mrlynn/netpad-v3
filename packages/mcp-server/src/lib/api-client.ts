/**
 * NetPad API Client for MCP Server
 * 
 * Provides authenticated HTTP client for NetPad API operations.
 * Requires NETPAD_API_KEY environment variable to be set.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ApiClientConfig {
  apiKey: string;
  baseUrl: string;
}

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  params?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  headers?: Record<string, string>;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    requestId?: string;
    rateLimit?: {
      remaining: number;
      reset: number;
    };
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

// Form types
export interface FormSummary {
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

export interface FormDetail extends FormSummary {
  fields: FormField[];
  settings?: {
    submitButtonText?: string;
    successMessage?: string;
    redirectUrl?: string;
  };
}

export interface FormField {
  id: string;
  path: string;
  label: string;
  type: string;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  options?: Array<{ label: string; value: string }>;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    min?: number;
    max?: number;
  };
}

export interface CreateFormInput {
  name: string;
  description?: string;
  projectId: string;
  slug?: string;
  fields?: FormField[];
}

export interface UpdateFormInput {
  name?: string;
  description?: string;
  fields?: FormField[];
  status?: 'draft' | 'published';
}

// Submission types
export interface Submission {
  id: string;
  formId: string;
  data: Record<string, unknown>;
  metadata: {
    submittedAt: string;
    ipAddress?: string;
    userAgent?: string;
    referrer?: string;
  };
}

export interface CreateSubmissionInput {
  data: Record<string, unknown>;
  metadata?: {
    referrer?: string;
    customFields?: Record<string, unknown>;
  };
}

export interface UpdateSubmissionInput {
  data?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// API CLIENT ERROR
// ============================================================================

export class ApiClientError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export class ApiKeyNotSetError extends Error {
  constructor() {
    super(
      'NETPAD_API_KEY environment variable is not set. ' +
      'To use direct API tools, set your NetPad API key:\n\n' +
      '  export NETPAD_API_KEY=np_live_xxx\n\n' +
      'Get your API key from: https://netpad.io/settings/api-keys'
    );
    this.name = 'ApiKeyNotSetError';
  }
}

// ============================================================================
// API CLIENT
// ============================================================================

export class NetPadApiClient {
  private config: ApiClientConfig;

  constructor(config: ApiClientConfig) {
    this.config = config;
  }

  /**
   * Make an authenticated request to the NetPad API
   */
  async request<T>(
    path: string,
    options: ApiRequestOptions = {}
  ): Promise<T> {
    const { method = 'GET', params, body, headers = {} } = options;

    // Build URL with query params
    const url = new URL(path, this.config.baseUrl);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      });
    }

    // Make request
    const response = await fetch(url.toString(), {
      method,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': '@netpad/mcp-server',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    // Parse response
    const contentType = response.headers.get('content-type');
    let responseData: ApiResponse<T>;

    if (contentType?.includes('application/json')) {
      responseData = await response.json();
    } else {
      const text = await response.text();
      responseData = {
        success: response.ok,
        data: text as unknown as T,
      };
    }

    // Handle errors
    if (!response.ok) {
      const error = responseData.error || {
        code: 'UNKNOWN_ERROR',
        message: `Request failed with status ${response.status}`,
      };
      throw new ApiClientError(
        error.message,
        error.code,
        response.status,
        error.details
      );
    }

    // Return data (unwrap from response envelope if present)
    if (responseData.data !== undefined) {
      return responseData.data;
    }
    return responseData as unknown as T;
  }

  // ============================================================================
  // FORM OPERATIONS
  // ============================================================================

  /**
   * List forms with optional filters
   */
  async listForms(options: {
    projectId?: string;
    status?: 'draft' | 'published';
    search?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<PaginatedResponse<FormSummary>> {
    return this.request<PaginatedResponse<FormSummary>>('/api/v1/forms', {
      params: {
        projectId: options.projectId,
        status: options.status,
        search: options.search,
        page: options.page,
        pageSize: options.pageSize,
      },
    });
  }

  /**
   * Get a single form by ID or slug
   */
  async getForm(formId: string): Promise<FormDetail> {
    return this.request<FormDetail>(`/api/v1/forms/${formId}`);
  }

  /**
   * Create a new form
   */
  async createForm(input: CreateFormInput): Promise<FormSummary> {
    return this.request<FormSummary>('/api/v1/forms', {
      method: 'POST',
      body: input,
    });
  }

  /**
   * Update a form
   */
  async updateForm(formId: string, input: UpdateFormInput): Promise<FormSummary> {
    return this.request<FormSummary>(`/api/v1/forms/${formId}`, {
      method: 'PATCH',
      body: input,
    });
  }

  /**
   * Delete a form
   */
  async deleteForm(formId: string): Promise<{ deleted: boolean; formId: string }> {
    return this.request<{ deleted: boolean; formId: string }>(`/api/v1/forms/${formId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Publish a form
   */
  async publishForm(formId: string): Promise<FormSummary> {
    return this.updateForm(formId, { status: 'published' });
  }

  /**
   * Unpublish a form
   */
  async unpublishForm(formId: string): Promise<FormSummary> {
    return this.updateForm(formId, { status: 'draft' });
  }

  // ============================================================================
  // SUBMISSION OPERATIONS
  // ============================================================================

  /**
   * List submissions for a form
   */
  async listSubmissions(
    formId: string,
    options: {
      page?: number;
      pageSize?: number;
      startDate?: string;
      endDate?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<PaginatedResponse<Submission>> {
    return this.request<PaginatedResponse<Submission>>(
      `/api/v1/forms/${formId}/submissions`,
      {
        params: {
          page: options.page,
          pageSize: options.pageSize,
          startDate: options.startDate,
          endDate: options.endDate,
          sortBy: options.sortBy,
          sortOrder: options.sortOrder,
        },
      }
    );
  }

  /**
   * Get a single submission
   */
  async getSubmission(formId: string, submissionId: string): Promise<Submission> {
    return this.request<Submission>(
      `/api/v1/forms/${formId}/submissions/${submissionId}`
    );
  }

  /**
   * Create a new submission
   */
  async createSubmission(
    formId: string,
    input: CreateSubmissionInput
  ): Promise<{ submissionId: string; formId: string; submittedAt: string }> {
    return this.request<{ submissionId: string; formId: string; submittedAt: string }>(
      `/api/v1/forms/${formId}/submissions`,
      {
        method: 'POST',
        body: input,
      }
    );
  }

  /**
   * Delete a submission
   */
  async deleteSubmission(
    formId: string,
    submissionId: string
  ): Promise<{ deleted: boolean; submissionId: string }> {
    return this.request<{ deleted: boolean; submissionId: string }>(
      `/api/v1/forms/${formId}/submissions/${submissionId}`,
      {
        method: 'DELETE',
      }
    );
  }
}

// ============================================================================
// CLIENT FACTORY
// ============================================================================

let cachedClient: NetPadApiClient | null = null;

/**
 * Get the API client instance.
 * Throws ApiKeyNotSetError if NETPAD_API_KEY is not set.
 */
export function getApiClient(): NetPadApiClient {
  const apiKey = process.env.NETPAD_API_KEY;
  const baseUrl = process.env.NETPAD_API_URL || 'https://netpad.io';

  if (!apiKey) {
    throw new ApiKeyNotSetError();
  }

  // Cache client for reuse (but recreate if env vars change)
  if (!cachedClient || cachedClient['config'].apiKey !== apiKey) {
    cachedClient = new NetPadApiClient({ apiKey, baseUrl });
  }

  return cachedClient;
}

/**
 * Check if API key is configured (without throwing)
 */
export function isApiKeyConfigured(): boolean {
  return !!process.env.NETPAD_API_KEY;
}

/**
 * Get configuration status for display
 */
export function getApiConfigStatus(): {
  configured: boolean;
  baseUrl: string;
  keyPrefix?: string;
} {
  const apiKey = process.env.NETPAD_API_KEY;
  const baseUrl = process.env.NETPAD_API_URL || 'https://netpad.io';

  return {
    configured: !!apiKey,
    baseUrl,
    keyPrefix: apiKey ? apiKey.substring(0, 10) + '...' : undefined,
  };
}
