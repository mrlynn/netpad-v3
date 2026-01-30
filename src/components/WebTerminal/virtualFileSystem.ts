/**
 * Virtual File System for NetPad Terminal
 * 
 * Provides a filesystem-like interface to navigate NetPad's hierarchy:
 * /{org}/{project}/{application}/{forms|workflows|templates|data}/...
 */

export interface VFSContext {
  orgId?: string;
  orgName?: string;
  projectId?: string;
  projectName?: string;
  appId?: string;
  appName?: string;
}

export interface VFSNode {
  name: string;
  type: 'org' | 'project' | 'application' | 'directory' | 'form' | 'workflow' | 'template' | 'collection' | 'document';
  id?: string;
  path: string;
  children?: VFSNode[];
  metadata?: Record<string, unknown>;
}

export interface VFSState {
  currentPath: string;
  context: VFSContext;
}

export interface PathSegment {
  type: 'root' | 'org' | 'project' | 'application' | 'category' | 'item' | 'collection' | 'document';
  name: string;
  id?: string;
}

// Valid category directories within an application
export const APP_CATEGORIES = ['forms', 'workflows', 'templates', 'data'] as const;
export type AppCategory = typeof APP_CATEGORIES[number];

/**
 * Parse a path string into segments
 */
export function parsePath(path: string): string[] {
  return path.split('/').filter(Boolean);
}

/**
 * Normalize a path (resolve . and ..)
 */
export function normalizePath(currentPath: string, targetPath: string): string {
  // Absolute path
  if (targetPath.startsWith('/')) {
    return resolveRelativePath('/', targetPath.slice(1));
  }
  
  // Relative path
  return resolveRelativePath(currentPath, targetPath);
}

/**
 * Resolve relative path components (., ..)
 */
function resolveRelativePath(basePath: string, relativePath: string): string {
  const baseSegments = parsePath(basePath);
  const relativeSegments = parsePath(relativePath);
  
  for (const segment of relativeSegments) {
    if (segment === '.') {
      continue;
    } else if (segment === '..') {
      baseSegments.pop();
    } else {
      baseSegments.push(segment);
    }
  }
  
  return '/' + baseSegments.join('/');
}

/**
 * Get the parent path
 */
export function getParentPath(path: string): string {
  const segments = parsePath(path);
  segments.pop();
  return '/' + segments.join('/');
}

/**
 * Get the depth of a path
 */
export function getPathDepth(path: string): number {
  return parsePath(path).length;
}

/**
 * Determine what type of location we're at based on path depth
 * 
 * Depth 0: /                     -> root (list orgs)
 * Depth 1: /org                  -> org (list projects)  
 * Depth 2: /org/project          -> project (list applications)
 * Depth 3: /org/project/app      -> application (list categories: forms, workflows, etc.)
 * Depth 4: /org/project/app/forms -> category (list items)
 * Depth 5: /org/project/app/forms/myform -> item (show details)
 * Depth 4: /org/project/app/data -> data directory (list collections)
 * Depth 5: /org/project/app/data/users -> collection (list documents)
 * Depth 6: /org/project/app/data/users/doc123 -> document (show details)
 */
export function getPathType(path: string): PathSegment['type'] {
  const segments = parsePath(path);
  const depth = segments.length;
  
  if (depth === 0) return 'root';
  if (depth === 1) return 'org';
  if (depth === 2) return 'project';
  if (depth === 3) return 'application';
  if (depth === 4) {
    const category = segments[3];
    if (category === 'data') return 'category';
    if (APP_CATEGORIES.includes(category as AppCategory)) return 'category';
    return 'item'; // Unknown, treat as item
  }
  if (depth === 5) {
    const category = segments[3];
    if (category === 'data') return 'collection';
    return 'item';
  }
  if (depth >= 6) {
    const category = segments[3];
    if (category === 'data') return 'document';
    return 'item';
  }
  
  return 'item';
}

/**
 * Extract context (org, project, app IDs) from path
 * Note: This returns names, actual IDs need to be resolved via API
 */
export function extractContextFromPath(path: string): Partial<VFSContext> {
  const segments = parsePath(path);
  const context: Partial<VFSContext> = {};
  
  if (segments[0]) context.orgName = segments[0];
  if (segments[1]) context.projectName = segments[1];
  if (segments[2]) context.appName = segments[2];
  
  return context;
}

/**
 * Get the category from a path (forms, workflows, templates, data)
 */
export function getCategoryFromPath(path: string): AppCategory | null {
  const segments = parsePath(path);
  if (segments.length >= 4) {
    const category = segments[3];
    if (APP_CATEGORIES.includes(category as AppCategory)) {
      return category as AppCategory;
    }
  }
  return null;
}

/**
 * Get the item name from a path
 */
export function getItemNameFromPath(path: string): string | null {
  const segments = parsePath(path);
  const pathType = getPathType(path);
  
  if (pathType === 'item' && segments.length >= 5) {
    return segments[4];
  }
  if (pathType === 'collection' && segments.length >= 5) {
    return segments[4];
  }
  if (pathType === 'document' && segments.length >= 6) {
    return segments[5];
  }
  
  return null;
}

/**
 * Format a path for display (with colors)
 */
export function formatPath(path: string): string {
  const segments = parsePath(path);
  if (segments.length === 0) return '/';
  
  return '/' + segments.map((seg, i) => {
    // Color based on depth
    if (i === 0) return `\x1b[35m${seg}\x1b[0m`; // Org - magenta
    if (i === 1) return `\x1b[34m${seg}\x1b[0m`; // Project - blue
    if (i === 2) return `\x1b[36m${seg}\x1b[0m`; // App - cyan
    if (i === 3) return `\x1b[33m${seg}\x1b[0m`; // Category - yellow
    return `\x1b[32m${seg}\x1b[0m`; // Item - green
  }).join('/');
}

/**
 * Format a listing entry
 */
export function formatListEntry(
  name: string, 
  type: VFSNode['type'], 
  isLong: boolean = false,
  metadata?: Record<string, unknown>
): string {
  const typeColors: Record<VFSNode['type'], string> = {
    org: '\x1b[35m',        // Magenta
    project: '\x1b[34m',    // Blue
    application: '\x1b[36m', // Cyan
    directory: '\x1b[33m',  // Yellow
    form: '\x1b[32m',       // Green
    workflow: '\x1b[32m',   // Green
    template: '\x1b[32m',   // Green
    collection: '\x1b[33m', // Yellow
    document: '\x1b[37m',   // White
  };
  
  const typeIcons: Record<VFSNode['type'], string> = {
    org: '🏢',
    project: '📁',
    application: '📦',
    directory: '📂',
    form: '📝',
    workflow: '⚡',
    template: '📋',
    collection: '🗃️',
    document: '📄',
  };
  
  const color = typeColors[type] || '\x1b[0m';
  const icon = typeIcons[type] || '📄';
  const isDir = ['org', 'project', 'application', 'directory', 'collection'].includes(type);
  const suffix = isDir ? '/' : '';
  
  if (!isLong) {
    return `${icon} ${color}${name}${suffix}\x1b[0m`;
  }
  
  // Long format with details
  const typeLabel = type.padEnd(12);
  const updated = metadata?.updatedAt 
    ? new Date(metadata.updatedAt as string).toLocaleDateString()
    : '-';
  const extra = metadata?.fieldCount !== undefined 
    ? `${metadata.fieldCount} fields`
    : metadata?.nodeCount !== undefined
    ? `${metadata.nodeCount} nodes`
    : '';
  
  return `${typeLabel} ${updated.padEnd(12)} ${extra.padEnd(12)} ${icon} ${color}${name}${suffix}\x1b[0m`;
}

/**
 * Build prompt string showing current path
 */
export function buildPrompt(path: string): string {
  const shortPath = path.length > 30 
    ? '...' + path.slice(-27)
    : path;
  return `\x1b[90m${shortPath}\x1b[0m \x1b[32m❯\x1b[0m `;
}

/**
 * Validate if a path segment is a valid name
 */
export function isValidName(name: string): boolean {
  // Allow alphanumeric, hyphens, underscores, spaces
  return /^[\w\s-]+$/.test(name) && name.length > 0 && name.length <= 100;
}

/**
 * Escape a name for use in paths (spaces -> underscores for display)
 */
export function escapeName(name: string): string {
  return name.replace(/\s+/g, '_');
}

/**
 * Unescape a path segment back to original name
 */
export function unescapeName(segment: string): string {
  return segment.replace(/_/g, ' ');
}
