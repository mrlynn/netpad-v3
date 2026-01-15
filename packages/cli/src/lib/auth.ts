/**
 * Authentication Utilities
 * 
 * Get credentials from config or environment
 */

import { getEffectiveConfig } from './config.js';

export interface AuthConfig {
  apiUrl: string;
  apiKey?: string;
  sessionToken?: string;
  orgId?: string;
  projectId?: string;
}

/**
 * Get authentication configuration
 * Priority: CLI options > Environment variables > Config file
 */
export function getAuthConfig(options: {
  apiUrl?: string;
  apiKey?: string;
  sessionToken?: string;
  org?: string;
  project?: string;
}): AuthConfig | null {
  const config = getEffectiveConfig();

  // Default to localhost for development
  const defaultApiUrl = process.env.NETPAD_API_URL || 
                       (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://app.netpad.app');
  
  const apiUrl = options.apiUrl || config.apiUrl || defaultApiUrl;

  // Check for API key first, then session token
  const apiKey = options.apiKey || 
                 process.env.NETPAD_API_KEY || 
                 config.apiKey;

  const sessionToken = options.sessionToken ||
                       process.env.NETPAD_SESSION_TOKEN ||
                       config.sessionToken;

  if (!apiKey && !sessionToken) {
    return null;
  }

  return {
    apiUrl,
    apiKey: apiKey || undefined,
    sessionToken: sessionToken || undefined,
    orgId: options.org || process.env.NETPAD_ORG_ID || config.orgId,
    projectId: options.project || process.env.NETPAD_PROJECT_ID || config.projectId,
  };
}

/**
 * Require authentication (throws if not authenticated)
 */
export function requireAuth(options: {
  apiUrl?: string;
  apiKey?: string;
  sessionToken?: string;
  org?: string;
  project?: string;
}): AuthConfig {
  const auth = getAuthConfig(options);
  
  if (!auth || (!auth.apiKey && !auth.sessionToken)) {
    console.error('Error: Not authenticated. Run "netpad login" to authenticate.');
    process.exit(1);
  }

  if (options.org && !auth.orgId) {
    console.error('Error: Organization ID is required. Use --org <orgId> or run "netpad login"');
    process.exit(1);
  }

  if (options.project && !auth.projectId) {
    console.error('Error: Project ID is required. Use --project <projectId> or run "netpad login"');
    process.exit(1);
  }

  return auth;
}

/**
 * Get authorization header value
 */
export function getAuthHeader(auth: AuthConfig): string {
  if (auth.apiKey) {
    return `Bearer ${auth.apiKey}`;
  }
  if (auth.sessionToken) {
    return `Bearer ${auth.sessionToken}`;
  }
  throw new Error('No authentication token available');
}
