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
  private get config() {
    // Always get fresh config (reloads from disk)
    return getConfig();
  }

  private get baseUrl(): string {
    return this.config.apiUrl || 'http://localhost:3000';
  }

  private get apiKey(): string | undefined {
    return this.config.apiKey;
  }

  private get sessionToken(): string | undefined {
    return this.config.sessionToken;
  }

  private get orgId(): string | undefined {
    return this.config.orgId;
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
      // Parse the command to determine type
      const parsed = this.parseInput(input);
      
      const response = await this.fetch('/api/terminal', {
        method: 'POST',
        body: JSON.stringify({
          input,
          parsed,
          context: {
            path: context.path,
            org: this.orgId,
            history: context.history?.slice(-10),
          },
        }),
      });

      if (!response.ok) {
        // Try to get error details from response
        const errorText = await response.text().catch(() => '');
        return {
          success: false,
          output: '',
          error: `API error: ${response.status} ${response.statusText}${errorText ? ` - ${errorText.substring(0, 100)}` : ''}`,
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

  /**
   * Parse input to determine command type
   */
  private parseInput(input: string): {
    type: 'structured' | 'natural' | 'help' | 'clear';
    command?: string;
    args?: string[];
    options?: Record<string, string | boolean>;
    raw: string;
    naturalLanguage?: string;
  } {
    const trimmed = input.trim();
    
    if (!trimmed) {
      return { type: 'structured', raw: '' };
    }
    
    if (trimmed.toLowerCase() === 'clear') {
      return { type: 'clear', raw: trimmed };
    }
    
    if (trimmed.toLowerCase() === 'help' || trimmed === '?') {
      return { type: 'help', raw: trimmed };
    }
    
    // Known structured commands
    const KNOWN_COMMANDS = [
      'create', 'list', 'show', 'deploy', 'export', 'import', 'search',
      'install', 'delete', 'edit', 'describe', 'stats', 'explain',
    ];
    
    const parts = trimmed.split(/\s+/);
    const firstWord = parts[0].toLowerCase();
    
    // Check if it's a known command
    if (KNOWN_COMMANDS.includes(firstWord)) {
      const args: string[] = [];
      const options: Record<string, string | boolean> = {};
      
      for (let i = 1; i < parts.length; i++) {
        const part = parts[i];
        if (part.startsWith('--')) {
          const key = part.slice(2);
          if (i + 1 < parts.length && !parts[i + 1].startsWith('-')) {
            options[key] = parts[i + 1];
            i++;
          } else {
            options[key] = true;
          }
        } else if (part.startsWith('-')) {
          const key = part.slice(1);
          if (i + 1 < parts.length && !parts[i + 1].startsWith('-')) {
            options[key] = parts[i + 1];
            i++;
          } else {
            options[key] = true;
          }
        } else {
          args.push(part);
        }
      }
      
      return {
        type: 'structured',
        command: firstWord,
        args,
        options,
        raw: trimmed,
      };
    }
    
    // Natural language patterns (questions, requests)
    const isNaturalLanguage = /^(what|how|why|where|when|who|can|show|find|get|create|make|build|help|please|i want|i need)/i.test(trimmed) || 
                              trimmed.endsWith('?');
    
    if (isNaturalLanguage) {
      return {
        type: 'natural',
        raw: trimmed,
        naturalLanguage: trimmed,
      };
    }
    
    // Default to natural language for AI interpretation
    return {
      type: 'natural',
      raw: trimmed,
      naturalLanguage: trimmed,
    };
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
    const config = getConfig();
    return !!(config.apiKey || config.sessionToken);
  }

  getOrgId(): string | undefined {
    return getConfig().orgId;
  }

  getBaseUrl(): string {
    return getConfig().apiUrl || 'http://localhost:3000';
  }
  
  /** Force reload of credentials (called after login/logout) */
  reloadCredentials(): void {
    // Getters always read fresh, but this method signals intent
    console.log('Credentials reloaded');
  }

  /**
   * Check AI service status on the server
   */
  async checkAIStatus(): Promise<{
    available: boolean;
    provider?: string;
    model?: string;
    mode: string;
    message?: string;
  }> {
    try {
      const response = await this.fetch('/api/ai/status');
      if (response.ok) {
        return await response.json();
      }
    } catch {
      // Ignore errors
    }
    return {
      available: false,
      mode: 'unknown',
      message: 'Could not check AI status',
    };
  }
}
