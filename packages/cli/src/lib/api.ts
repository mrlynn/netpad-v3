/**
 * NetPad API Client
 * 
 * Handles authenticated API calls to NetPad backend
 */

import { getEffectiveConfig } from './config.js';
import chalk from 'chalk';

export interface ApiOptions {
  apiUrl?: string;
  apiKey?: string;
  orgId?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  status: number;
}

/**
 * Get API URL from options, config, or default
 */
function getApiUrl(options: ApiOptions): string {
  return options.apiUrl || getEffectiveConfig().apiUrl || 'https://netpad.io';
}

/**
 * Get API key from options or config
 */
function getApiKey(options: ApiOptions): string | undefined {
  const config = getEffectiveConfig();
  return options.apiKey || config.apiKey || config.sessionToken;
}

/**
 * Get org ID from options or config
 */
function getOrgId(options: ApiOptions): string | undefined {
  return options.orgId || getEffectiveConfig().orgId;
}

/**
 * Make an authenticated API request
 */
export async function apiRequest<T = unknown>(
  method: string,
  path: string,
  options: ApiOptions = {},
  body?: unknown
): Promise<ApiResponse<T>> {
  const apiUrl = getApiUrl(options);
  const apiKey = getApiKey(options);
  
  if (!apiKey) {
    return {
      success: false,
      error: 'Not authenticated. Run: netpad login',
      status: 401,
    };
  }

  const url = `${apiUrl}${path}`;
  
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    };

    const fetchOptions: RequestInit = {
      method,
      headers,
    };

    if (body && method !== 'GET') {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);
    
    let data: unknown;
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      data = await response.json();
    }

    if (!response.ok) {
      return {
        success: false,
        error: (data as { error?: string })?.error || `HTTP ${response.status}`,
        status: response.status,
        data: data as T,
      };
    }

    return {
      success: true,
      data: data as T,
      status: response.status,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
      status: 0,
    };
  }
}

/**
 * GET request helper
 */
export function get<T = unknown>(path: string, options: ApiOptions = {}): Promise<ApiResponse<T>> {
  return apiRequest<T>('GET', path, options);
}

/**
 * POST request helper
 */
export function post<T = unknown>(path: string, body: unknown, options: ApiOptions = {}): Promise<ApiResponse<T>> {
  return apiRequest<T>('POST', path, options, body);
}

/**
 * PATCH request helper
 */
export function patch<T = unknown>(path: string, body: unknown, options: ApiOptions = {}): Promise<ApiResponse<T>> {
  return apiRequest<T>('PATCH', path, options, body);
}

/**
 * DELETE request helper
 */
export function del<T = unknown>(path: string, options: ApiOptions = {}): Promise<ApiResponse<T>> {
  return apiRequest<T>('DELETE', path, options);
}

/**
 * Require org ID, exit with error if not set
 */
export function requireOrgId(options: ApiOptions): string {
  const orgId = getOrgId(options);
  if (!orgId) {
    console.error(chalk.red('Error: Organization ID required.'));
    console.error(chalk.dim('Set with: netpad login -o <orgId>'));
    console.error(chalk.dim('Or pass: --org <orgId>'));
    process.exit(1);
  }
  return orgId;
}

/**
 * Handle API error and exit
 */
export function handleError(response: ApiResponse, context: string = 'Operation'): never {
  console.error(chalk.red(`${context} failed: ${response.error}`));
  process.exit(1);
}
