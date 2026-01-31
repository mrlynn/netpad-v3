/**
 * Shell API Client
 * 
 * Communicates with NetPad API for shell operations
 */

import { getConfig } from '../lib/config.js';

export interface FSEntry {
  name: string;
  type: 'directory' | 'file' | 'org' | 'project' | 'application' | 'form' | 'workflow';
  path: string;
  metadata?: Record<string, unknown>;
}

export interface FSResult {
  success: boolean;
  output?: string;
  entries?: FSEntry[];
  content?: string;
  newPath?: string;
  error?: string;
}

export interface CommandResult {
  success: boolean;
  output: string;
  error?: string;
  suggestions?: string[];
}

export class ShellAPIClient {
  private baseUrl: string;
  private apiKey: string | undefined;
  private sessionToken: string | undefined;
  private orgId: string | undefined;

  constructor() {
    const config = getConfig();
    this.baseUrl = config.apiUrl || 'https://app.netpad.app';
    this.apiKey = config.apiKey;
    this.sessionToken = config.sessionToken;
    this.orgId = config.orgId;
  }

  private async fetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };
    
    // Use session token (OAuth) or API key for auth
    if (this.sessionToken) {
      headers['Cookie'] = `netpad-session=${this.sessionToken}`;
    } else if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    return fetch(url, {
      ...options,
      headers,
    });
  }

  async executeFS(action: string, path: string, options?: Record<string, unknown>): Promise<FSResult> {
    try {
      const response = await this.fetch('/api/terminal/fs', {
        method: 'POST',
        body: JSON.stringify({
          action,
          path,
          ...options,
          orgId: this.orgId,
        }),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `API error: ${response.status} ${response.statusText}`,
        };
      }

      return await response.json();
    } catch (error) {
      return {
        success: false,
        error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async executeCommand(input: string, context: {
    path: string;
    history?: string[];
  }): Promise<CommandResult> {
    try {
      const response = await this.fetch('/api/terminal', {
        method: 'POST',
        body: JSON.stringify({
          input,
          context: {
            path: context.path,
            org: this.orgId,
            history: context.history?.slice(-10),
          },
        }),
      });

      if (!response.ok) {
        return {
          success: false,
          output: '',
          error: `API error: ${response.status} ${response.statusText}`,
        };
      }

      return await response.json();
    } catch (error) {
      return {
        success: false,
        output: '',
        error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async getCompletions(path: string): Promise<string[]> {
    try {
      const result = await this.executeFS('ls', path);
      if (result.success && result.entries) {
        const dirTypes = ['directory', 'org', 'project', 'application'];
        return result.entries.map(e => 
          dirTypes.includes(e.type) ? e.name + '/' : e.name
        );
      }
    } catch {
      // Ignore errors for completion
    }
    return [];
  }

  isAuthenticated(): boolean {
    return !!(this.apiKey || this.sessionToken);
  }

  getOrgId(): string | undefined {
    return this.orgId;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }
}
