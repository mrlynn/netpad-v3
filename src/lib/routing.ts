/**
 * URL Generation Utilities
 * 
 * Centralized helpers for generating URLs with org/project hierarchy
 */

export type ResourceType = 'forms' | 'workflows' | 'data' | 'clusters' | 'connections' | 'builder' | 'projects';

/**
 * Generate URL for org/project resource
 */
export function getOrgProjectUrl(
  orgId: string,
  projectId: string,
  resource: ResourceType,
  resourceId?: string
): string {
  const base = `/orgs/${orgId}/projects/${projectId}/${resource}`;
  return resourceId ? `${base}/${resourceId}` : base;
}

/**
 * Generate URL for organization-level resource (projects list)
 */
export function getOrgUrl(orgId: string, resource?: 'projects'): string {
  if (resource) {
    return `/orgs/${orgId}/${resource}`;
  }
  return `/orgs/${orgId}`;
}

/**
 * Generate URL for project management
 */
export function getProjectsUrl(orgId: string): string {
  return `/orgs/${orgId}/projects`;
}

/**
 * Generate URL for a specific project's resource
 */
export function getProjectResourceUrl(
  orgId: string,
  projectId: string,
  resource: ResourceType,
  resourceId?: string
): string {
  return getOrgProjectUrl(orgId, projectId, resource, resourceId);
}

/**
 * Parse org and project from URL pathname
 */
export function parseOrgProjectFromPath(pathname: string): {
  orgId: string | null;
  projectId: string | null;
} {
  const match = pathname.match(/^\/orgs\/([^/]+)\/projects\/([^/]+)/);
  if (match) {
    return {
      orgId: match[1],
      projectId: match[2],
    };
  }
  return { orgId: null, projectId: null };
}

/**
 * Check if a pathname uses the new org/project structure
 */
export function isOrgProjectPath(pathname: string): boolean {
  return pathname.startsWith('/orgs/') && pathname.includes('/projects/');
}

/**
 * Legacy route mappings for redirects
 */
export const LEGACY_ROUTES: Record<string, (orgId: string, projectId: string) => string> = {
  '/my-forms': (orgId, projectId) => getOrgProjectUrl(orgId, projectId, 'forms'),
  '/workflows': (orgId, projectId) => getOrgProjectUrl(orgId, projectId, 'workflows'),
  '/data': (orgId, projectId) => getOrgProjectUrl(orgId, projectId, 'data'),
  '/builder': (orgId, projectId) => getOrgProjectUrl(orgId, projectId, 'builder'),
  '/projects': (orgId) => getProjectsUrl(orgId),
};
