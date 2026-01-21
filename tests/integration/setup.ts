/**
 * Integration Test Setup
 *
 * This file sets up the environment for integration tests.
 * It mocks external services and provides utilities for testing API routes.
 */

import { NextRequest, NextResponse } from 'next/server';

// Mock session for authenticated requests
export const mockSession = {
  userId: 'test-user-123',
  email: 'test@example.com',
  organizationId: 'test-org-123',
  isAuthenticated: true,
};

// Mock unauthenticated session
export const mockAnonymousSession = {
  userId: null,
  email: null,
  organizationId: null,
  isAuthenticated: false,
};

/**
 * Create a mock NextRequest for testing API routes
 */
export function createMockRequest(
  method: string,
  url: string,
  options: {
    body?: Record<string, unknown>;
    headers?: Record<string, string>;
    searchParams?: Record<string, string>;
  } = {}
): NextRequest {
  const { body, headers = {}, searchParams = {} } = options;

  // Build URL with search params
  const urlObj = new URL(url, 'http://localhost:3000');
  Object.entries(searchParams).forEach(([key, value]) => {
    urlObj.searchParams.set(key, value);
  });

  // Create request init
  const init: RequestInit = {
    method,
    headers: new Headers({
      'Content-Type': 'application/json',
      ...headers,
    }),
  };

  if (body && method !== 'GET' && method !== 'HEAD') {
    init.body = JSON.stringify(body);
  }

  return new NextRequest(urlObj.toString(), init);
}

/**
 * Parse JSON response from NextResponse
 */
export async function parseResponse<T = unknown>(response: NextResponse): Promise<{
  status: number;
  data: T;
  headers: Headers;
}> {
  const data = await response.json();
  return {
    status: response.status,
    data: data as T,
    headers: response.headers,
  };
}

/**
 * Create mock form data for testing
 */
export function createMockFormData(): Record<string, unknown> {
  return {
    name: 'John Doe',
    email: 'john@example.com',
    message: 'This is a test message',
    rating: 5,
  };
}

/**
 * Create mock form configuration
 */
export function createMockFormConfig(overrides: Record<string, unknown> = {}) {
  return {
    id: 'test-form-123',
    name: 'Test Form',
    slug: 'test-form',
    isPublished: true,
    fieldConfigs: [
      { path: 'name', label: 'Name', type: 'short_text', included: true, required: true },
      { path: 'email', label: 'Email', type: 'email', included: true, required: true },
      { path: 'message', label: 'Message', type: 'long_text', included: true },
    ],
    organizationId: 'test-org-123',
    projectId: 'test-project-123',
    ...overrides,
  };
}

/**
 * Create mock workflow configuration
 */
export function createMockWorkflowConfig(overrides: Record<string, unknown> = {}) {
  return {
    id: 'test-workflow-123',
    name: 'Test Workflow',
    slug: 'test-workflow',
    orgId: 'test-org-123',
    projectId: 'test-project-123',
    canvas: {
      nodes: [],
      edges: [],
    },
    settings: {
      enabled: true,
    },
    status: 'active',
    version: 1,
    ...overrides,
  };
}

/**
 * Assert successful response
 */
export function expectSuccess(response: { status: number; data: { success?: boolean } }) {
  expect(response.status).toBe(200);
  expect(response.data.success).toBe(true);
}

/**
 * Assert error response
 */
export function expectError(
  response: { status: number; data: { success?: boolean; error?: string } },
  expectedStatus: number,
  errorContains?: string
) {
  expect(response.status).toBe(expectedStatus);
  if (errorContains) {
    expect(response.data.error).toContain(errorContains);
  }
}

/**
 * Setup module mocks for integration tests
 * Call this in beforeAll() of your test file
 */
export function setupIntegrationMocks() {
  // Mock session
  jest.mock('@/lib/auth/session', () => ({
    getSession: jest.fn().mockResolvedValue(mockSession),
  }));

  // Mock iron-session
  jest.mock('iron-session', () => ({
    getIronSession: jest.fn().mockResolvedValue({
      userId: mockSession.userId,
      save: jest.fn(),
    }),
  }));
}

/**
 * Reset all mocks
 */
export function resetMocks() {
  jest.clearAllMocks();
}
