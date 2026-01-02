/**
 * NetPad Workflows API Client
 *
 * Type-safe TypeScript client for interacting with NetPad's workflow APIs.
 */

import type {
  WorkflowDocument,
  WorkflowStatus,
  ListWorkflowsOptions,
  ListWorkflowsResponse,
  CreateWorkflowOptions,
  UpdateWorkflowOptions,
  ExecuteWorkflowOptions,
  ExecuteWorkflowResponse,
  ListExecutionsOptions,
  ListExecutionsResponse,
  GetExecutionResponse,
  WorkflowExecution,
  ExecutionStatus,
} from './types';

/**
 * Configuration for NetPad Workflows client
 */
export interface NetPadWorkflowClientConfig {
  /**
   * NetPad API base URL (e.g., 'https://your-netpad-instance.com')
   */
  baseUrl: string;

  /**
   * API key for authentication (format: np_live_xxx or np_test_xxx)
   */
  apiKey: string;

  /**
   * Organization ID (required for most operations)
   */
  organizationId: string;
}

/**
 * NetPad API Error
 */
export class NetPadWorkflowError extends Error {
  statusCode?: number;
  code?: string;

  constructor(message: string, statusCode?: number, code?: string) {
    super(message);
    this.name = 'NetPadWorkflowError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * NetPad Workflows API Client
 */
export class NetPadWorkflowClient {
  private baseUrl: string;
  private apiKey: string;
  private organizationId: string;

  constructor(config: NetPadWorkflowClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = config.apiKey;
    this.organizationId = config.organizationId;
  }

  /**
   * Make an API request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

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
      throw new NetPadWorkflowError(
        error.error || `API request failed: ${response.statusText}`,
        response.status,
        error.code
      );
    }

    return response.json();
  }

  /**
   * Build query string from options
   */
  private buildQueryString(params: Record<string, unknown>): string {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach((v) => searchParams.append(key, String(v)));
        } else {
          searchParams.set(key, String(value));
        }
      }
    });
    const query = searchParams.toString();
    return query ? `?${query}` : '';
  }

  // ============================================
  // WORKFLOW MANAGEMENT
  // ============================================

  /**
   * List workflows for the organization
   */
  async listWorkflows(
    options: ListWorkflowsOptions = {}
  ): Promise<ListWorkflowsResponse> {
    const queryParams = {
      orgId: this.organizationId,
      ...options,
    };
    const query = this.buildQueryString(queryParams);
    return this.request<ListWorkflowsResponse>(`/api/workflows${query}`);
  }

  /**
   * Get a workflow by ID
   */
  async getWorkflow(workflowId: string): Promise<WorkflowDocument> {
    const query = this.buildQueryString({ orgId: this.organizationId });
    const response = await this.request<{ workflow: WorkflowDocument }>(
      `/api/workflows/${workflowId}${query}`
    );
    return response.workflow;
  }

  /**
   * Create a new workflow
   */
  async createWorkflow(
    options: CreateWorkflowOptions
  ): Promise<WorkflowDocument> {
    const response = await this.request<{ workflow: WorkflowDocument }>(
      '/api/workflows',
      {
        method: 'POST',
        body: JSON.stringify({
          orgId: this.organizationId,
          ...options,
        }),
      }
    );
    return response.workflow;
  }

  /**
   * Update a workflow
   */
  async updateWorkflow(
    workflowId: string,
    options: UpdateWorkflowOptions
  ): Promise<WorkflowDocument> {
    const response = await this.request<{ workflow: WorkflowDocument }>(
      `/api/workflows/${workflowId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          orgId: this.organizationId,
          ...options,
        }),
      }
    );
    return response.workflow;
  }

  /**
   * Delete a workflow
   */
  async deleteWorkflow(workflowId: string): Promise<void> {
    const query = this.buildQueryString({ orgId: this.organizationId });
    await this.request<{ success: boolean }>(
      `/api/workflows/${workflowId}${query}`,
      {
        method: 'DELETE',
      }
    );
  }

  /**
   * Update workflow status
   */
  async updateWorkflowStatus(
    workflowId: string,
    status: WorkflowStatus
  ): Promise<WorkflowDocument> {
    const response = await this.request<{ workflow: WorkflowDocument }>(
      `/api/workflows/${workflowId}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          orgId: this.organizationId,
          status,
        }),
      }
    );
    return response.workflow;
  }

  // ============================================
  // WORKFLOW EXECUTION
  // ============================================

  /**
   * Execute a workflow (trigger manual execution)
   */
  async executeWorkflow(
    workflowId: string,
    options: ExecuteWorkflowOptions = {}
  ): Promise<ExecuteWorkflowResponse> {
    return this.request<ExecuteWorkflowResponse>(
      `/api/workflows/${workflowId}/execute`,
      {
        method: 'POST',
        body: JSON.stringify({
          orgId: this.organizationId,
          payload: options.payload || {},
        }),
      }
    );
  }

  /**
   * List executions for a workflow
   */
  async listExecutions(
    workflowId: string,
    options: ListExecutionsOptions = {}
  ): Promise<ListExecutionsResponse> {
    const queryParams = {
      ...options,
      // Convert boolean to string for query params
      logs: options.includeLogs ? 'true' : undefined,
      includeJobs: options.includeJobs ? 'true' : undefined,
    };
    const query = this.buildQueryString(queryParams);
    return this.request<ListExecutionsResponse>(
      `/api/workflows/${workflowId}/executions${query}`
    );
  }

  /**
   * Get execution details by execution ID (via workflow route)
   */
  async getExecution(
    workflowId: string,
    executionId: string,
    includeLogs = false
  ): Promise<GetExecutionResponse> {
    const query = includeLogs ? '?logs=true' : '';
    return this.request<GetExecutionResponse>(
      `/api/workflows/${workflowId}/executions/${executionId}${query}`
    );
  }

  /**
   * Get execution status by execution ID (via executions route)
   */
  async getExecutionStatus(
    executionId: string,
    includeLogs = false
  ): Promise<GetExecutionResponse> {
    const query = includeLogs ? '?logs=true' : '';
    return this.request<GetExecutionResponse>(
      `/api/executions/${executionId}${query}`
    );
  }

  /**
   * Retry a failed execution
   */
  async retryExecution(
    workflowId: string,
    executionId: string
  ): Promise<{ success: boolean; message: string; job: { jobId: string; status: string } }> {
    return this.request(
      `/api/workflows/${workflowId}/executions/${executionId}`,
      {
        method: 'POST',
        body: JSON.stringify({ action: 'retry' }),
      }
    );
  }

  /**
   * Cancel a pending or running execution
   */
  async cancelExecution(
    workflowId: string,
    executionId: string
  ): Promise<{ success: boolean; message: string; job: { jobId: string; status: string } }> {
    return this.request(
      `/api/workflows/${workflowId}/executions/${executionId}`,
      {
        method: 'POST',
        body: JSON.stringify({ action: 'cancel' }),
      }
    );
  }

  // ============================================
  // CONVENIENCE METHODS
  // ============================================

  /**
   * Wait for an execution to complete
   * Polls the execution status until it completes or fails
   */
  async waitForExecution(
    executionId: string,
    options: {
      intervalMs?: number;
      timeoutMs?: number;
      includeLogs?: boolean;
    } = {}
  ): Promise<GetExecutionResponse> {
    const {
      intervalMs = 1000,
      timeoutMs = 300000, // 5 minutes default
      includeLogs = false,
    } = options;

    const startTime = Date.now();

    while (true) {
      const response = await this.getExecutionStatus(executionId, includeLogs);
      const status = response.execution.status;

      if (status === 'completed' || status === 'failed' || status === 'cancelled') {
        return response;
      }

      if (Date.now() - startTime > timeoutMs) {
        throw new NetPadWorkflowError(
          `Timeout waiting for execution ${executionId} to complete`,
          408,
          'TIMEOUT'
        );
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  /**
   * Activate a workflow (convenience method)
   */
  async activateWorkflow(workflowId: string): Promise<WorkflowDocument> {
    return this.updateWorkflowStatus(workflowId, 'active');
  }

  /**
   * Pause a workflow (convenience method)
   */
  async pauseWorkflow(workflowId: string): Promise<WorkflowDocument> {
    return this.updateWorkflowStatus(workflowId, 'paused');
  }

  /**
   * Archive a workflow (convenience method)
   */
  async archiveWorkflow(workflowId: string): Promise<WorkflowDocument> {
    return this.updateWorkflowStatus(workflowId, 'archived');
  }
}

/**
 * Create a NetPad Workflows client instance
 */
export function createNetPadWorkflowClient(
  config: NetPadWorkflowClientConfig
): NetPadWorkflowClient {
  return new NetPadWorkflowClient(config);
}
