/**
 * Config Management
 * 
 * Manages CLI configuration and credentials
 */

import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'os';

export interface NetPadConfig {
  apiUrl?: string;
  apiKey?: string;
  sessionToken?: string; // Session token from OAuth/magic link
  orgId?: string;
  projectId?: string;
  profiles?: {
    [name: string]: {
      apiUrl?: string;
      apiKey?: string;
      sessionToken?: string;
      orgId?: string;
      projectId?: string;
    };
  };
  currentProfile?: string;
}

const CONFIG_DIR = path.join(homedir(), '.netpad');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

/**
 * Get config directory
 */
export function getConfigDir(): string {
  return CONFIG_DIR;
}

/**
 * Get config file path
 */
export function getConfigFile(): string {
  return CONFIG_FILE;
}

/**
 * Load configuration
 */
export function loadConfig(): NetPadConfig {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      return {};
    }
    const content = fs.readFileSync(CONFIG_FILE, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    return {};
  }
}

/**
 * Save configuration
 */
export function saveConfig(config: NetPadConfig): void {
  // Ensure config directory exists
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }

  // Set file permissions (read/write for user only)
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), {
    mode: 0o600, // rw-------
  });
}

/**
 * Get effective config (current profile or default)
 */
export function getEffectiveConfig(): NetPadConfig {
  const config = loadConfig();
  
  if (config.currentProfile && config.profiles?.[config.currentProfile]) {
    return {
      ...config,
      ...config.profiles[config.currentProfile],
    };
  }
  
  return config;
}

/**
 * Set API key
 */
export function setApiKey(apiKey: string, profile?: string): void {
  const config = loadConfig();
  
  if (profile) {
    if (!config.profiles) {
      config.profiles = {};
    }
    if (!config.profiles[profile]) {
      config.profiles[profile] = {};
    }
    config.profiles[profile].apiKey = apiKey;
    config.currentProfile = profile;
  } else {
    config.apiKey = apiKey;
  }
  
  saveConfig(config);
}

/**
 * Set organization ID
 */
export function setOrgId(orgId: string, profile?: string): void {
  const config = loadConfig();
  
  if (profile) {
    if (!config.profiles) {
      config.profiles = {};
    }
    if (!config.profiles[profile]) {
      config.profiles[profile] = {};
    }
    config.profiles[profile].orgId = orgId;
  } else {
    config.orgId = orgId;
  }
  
  saveConfig(config);
}

/**
 * Set project ID
 */
export function setProjectId(projectId: string, profile?: string): void {
  const config = loadConfig();
  
  if (profile) {
    if (!config.profiles) {
      config.profiles = {};
    }
    if (!config.profiles[profile]) {
      config.profiles[profile] = {};
    }
    config.profiles[profile].projectId = projectId;
  } else {
    config.projectId = projectId;
  }
  
  saveConfig(config);
}

/**
 * Set session token
 */
export function setSessionToken(sessionToken: string, profile?: string): void {
  const config = loadConfig();
  
  if (profile) {
    if (!config.profiles) {
      config.profiles = {};
    }
    if (!config.profiles[profile]) {
      config.profiles[profile] = {};
    }
    config.profiles[profile].sessionToken = sessionToken;
    config.currentProfile = profile;
  } else {
    config.sessionToken = sessionToken;
  }
  
  saveConfig(config);
}

/**
 * Clear credentials
 */
export function clearCredentials(): void {
  const config = loadConfig();
  config.apiKey = undefined;
  config.sessionToken = undefined;
  if (config.profiles) {
    Object.keys(config.profiles).forEach(key => {
      config.profiles![key].apiKey = undefined;
      config.profiles![key].sessionToken = undefined;
    });
  }
  saveConfig(config);
}

/**
 * Get current config (alias for getEffectiveConfig)
 * Used by shell and other components
 */
export function getConfig(): NetPadConfig {
  return getEffectiveConfig();
}
