/**
 * NetPad API Client
 *
 * Client for interacting with NetPad's public API to fetch forms and submit data.
 */

import {
  FormConfiguration,
  NetPadFormSchema,
  NetPadSubmissionPayload,
  NetPadSubmissionResponse,
  FieldConfig,
} from './types';

export interface NetPadClientConfig {
  /**
   * NetPad API base URL (e.g., 'https://your-netpad-instance.com')
   */
  baseUrl: string;

  /**
   * API key for authentication (format: np_live_xxx or np_test_xxx)
   */
  apiKey: string;

  /**
   * Optional organization ID for multi-tenant setups
   */
  organizationId?: string;
}

/**
 * NetPad API Client for fetching forms and submitting data
 */
export class NetPadClient {
  private baseUrl: string;
  private apiKey: string;
  private organizationId?: string;

  constructor(config: NetPadClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = config.apiKey;
    this.organizationId = config.organizationId;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}/api/v1${endpoint}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new NetPadError(
        error.error || `API request failed: ${response.statusText}`,
        response.status
      );
    }

    return response.json();
  }

  /**
   * Fetch a form schema by ID or slug
   */
  async getForm(formIdOrSlug: string): Promise<FormConfiguration> {
    const data = await this.request<{ success: boolean; form: NetPadFormSchema }>(
      `/forms/${formIdOrSlug}`
    );

    if (!data.success || !data.form) {
      throw new NetPadError('Form not found');
    }

    // Convert NetPad schema to FormConfiguration
    return this.convertToFormConfiguration(data.form);
  }

  /**
   * Submit form data
   */
  async submitForm(
    formIdOrSlug: string,
    data: Record<string, unknown>,
    metadata?: NetPadSubmissionPayload['metadata']
  ): Promise<NetPadSubmissionResponse> {
    const payload: NetPadSubmissionPayload = {
      data,
      metadata,
    };

    const response = await this.request<NetPadSubmissionResponse>(
      `/forms/${formIdOrSlug}/submissions`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );

    return response;
  }

  /**
   * List submissions for a form
   */
  async listSubmissions(
    formIdOrSlug: string,
    options: {
      page?: number;
      pageSize?: number;
      startDate?: string;
      endDate?: string;
    } = {}
  ): Promise<{
    submissions: Array<{
      id: string;
      data: Record<string, unknown>;
      submittedAt: string;
      metadata?: Record<string, unknown>;
    }>;
    total: number;
    page: number;
    pageSize: number;
  }> {
    const params = new URLSearchParams();
    if (options.page) params.set('page', String(options.page));
    if (options.pageSize) params.set('pageSize', String(options.pageSize));
    if (options.startDate) params.set('startDate', options.startDate);
    if (options.endDate) params.set('endDate', options.endDate);

    const query = params.toString() ? `?${params.toString()}` : '';

    return this.request(`/forms/${formIdOrSlug}/submissions${query}`);
  }

  /**
   * Get a single submission
   */
  async getSubmission(
    formIdOrSlug: string,
    submissionId: string
  ): Promise<{
    id: string;
    data: Record<string, unknown>;
    submittedAt: string;
    metadata?: Record<string, unknown>;
  }> {
    const response = await this.request<{
      success: boolean;
      submission: {
        id: string;
        data: Record<string, unknown>;
        submittedAt: string;
        metadata?: Record<string, unknown>;
      };
    }>(`/forms/${formIdOrSlug}/submissions/${submissionId}`);

    return response.submission;
  }

  /**
   * Check API health
   */
  async healthCheck(): Promise<{ status: string; database: string }> {
    return this.request('/health');
  }

  /**
   * Convert NetPad API schema to FormConfiguration
   */
  private convertToFormConfiguration(schema: NetPadFormSchema): FormConfiguration {
    return {
      formId: schema.id,
      name: schema.name,
      description: schema.description,
      slug: schema.slug,
      fieldConfigs: schema.fields.map(this.convertField),
      multiPage: schema.multiPage,
      theme: schema.theme,
      submitButtonText: schema.settings?.submitButtonText,
      successMessage: schema.settings?.successMessage,
      redirectUrl: schema.settings?.redirectUrl,
      status: schema.status,
    };
  }

  private convertField(field: FieldConfig): FieldConfig {
    return {
      ...field,
      included: field.included !== false,
    };
  }
}

/**
 * NetPad API Error
 */
export class NetPadError extends Error {
  statusCode?: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = 'NetPadError';
    this.statusCode = statusCode;
  }
}

/**
 * Create a NetPad client instance
 */
export function createNetPadClient(config: NetPadClientConfig): NetPadClient {
  return new NetPadClient(config);
}
