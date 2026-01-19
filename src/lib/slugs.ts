/**
 * Slug Utilities
 *
 * Utilities for generating, validating, and checking availability of slugs
 * for organizations and forms.
 */

import { ObjectId } from 'mongodb';

// Reserved slugs that cannot be used for organizations or forms
const RESERVED_SLUGS = new Set([
  // System routes
  'api',
  'app',
  'admin',
  'dashboard',
  'login',
  'signup',
  'auth',
  'settings',
  'billing',
  'docs',
  'help',
  'support',
  'status',
  'www',
  'mail',
  'ftp',
  'cdn',
  'assets',
  'static',
  'portal',

  // Brand protection
  'netpad',
  'forms',
  'form',
  'workflow',
  'workflows',
  'official',
  'verified',
  'team',
  'enterprise',

  // Potentially confusing
  'new',
  'create',
  'edit',
  'delete',
  'update',
  'preview',
  'publish',
  'draft',
  'test',
  'demo',
  'example',
  'sample',
]);

/**
 * Generate a URL-friendly slug from a name
 *
 * @param name - The name to convert to a slug
 * @returns A URL-friendly slug
 *
 * @example
 * generateSlug('IT Support Request') // 'it-support-request'
 * generateSlug('Acme Corp') // 'acme-corp'
 * generateSlug('  Hello World!  ') // 'hello-world'
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    .substring(0, 48); // Reasonable max length
}

/**
 * Validation result for slug validation
 */
export interface SlugValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate a slug for format and reserved words
 *
 * @param slug - The slug to validate
 * @returns Validation result with error message if invalid
 *
 * @example
 * validateSlug('acme-corp') // { valid: true }
 * validateSlug('ab') // { valid: false, error: 'Slug must be at least 3 characters' }
 * validateSlug('api') // { valid: false, error: 'This name is reserved' }
 */
export function validateSlug(slug: string): SlugValidationResult {
  if (!slug || slug.length < 3) {
    return { valid: false, error: 'Slug must be at least 3 characters' };
  }

  if (slug.length > 48) {
    return { valid: false, error: 'Slug must be 48 characters or less' };
  }

  // Must start and end with alphanumeric, only contain lowercase letters, numbers, and hyphens
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) && slug.length > 2) {
    return {
      valid: false,
      error:
        'Slug must start and end with a letter or number, and contain only lowercase letters, numbers, and hyphens',
    };
  }

  // For 3-character slugs, just check alphanumeric
  if (slug.length <= 2 || !/^[a-z0-9-]+$/.test(slug)) {
    return {
      valid: false,
      error: 'Slug must contain only lowercase letters, numbers, and hyphens',
    };
  }

  if (RESERVED_SLUGS.has(slug)) {
    return { valid: false, error: 'This name is reserved' };
  }

  return { valid: true };
}

/**
 * Check if a slug is in the reserved list
 *
 * @param slug - The slug to check
 * @returns true if reserved, false otherwise
 */
export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase());
}

/**
 * Generate a unique slug by appending a number if the base slug is taken
 *
 * @param baseSlug - The base slug to make unique
 * @param existingSlugs - Set of existing slugs to avoid
 * @returns A unique slug
 *
 * @example
 * generateUniqueSlug('help', new Set(['help', 'help-1'])) // 'help-2'
 */
export function generateUniqueSlug(
  baseSlug: string,
  existingSlugs: Set<string>
): string {
  if (!existingSlugs.has(baseSlug)) {
    return baseSlug;
  }

  let counter = 1;
  let candidateSlug = `${baseSlug}-${counter}`;

  while (existingSlugs.has(candidateSlug)) {
    counter++;
    candidateSlug = `${baseSlug}-${counter}`;
  }

  return candidateSlug;
}

/**
 * Extract the root domain from various hostname formats
 *
 * @param hostname - The full hostname (e.g., 'acme.netpad.io', 'acme.localhost:3000')
 * @returns The root domain or null
 */
export function getRootDomain(hostname: string): string | null {
  // Remove port if present
  const hostWithoutPort = hostname.split(':')[0];

  // Handle localhost
  if (hostWithoutPort.endsWith('.localhost') || hostWithoutPort === 'localhost') {
    return 'localhost';
  }

  // Handle netpad.io domains
  if (hostWithoutPort.endsWith('.netpad.io') || hostWithoutPort === 'netpad.io') {
    return 'netpad.io';
  }

  // Handle staging domains
  if (hostWithoutPort.endsWith('.staging.netpad.io')) {
    return 'staging.netpad.io';
  }

  return null;
}

/**
 * Main domains that should use standard routing (not subdomain routing)
 */
export const MAIN_DOMAINS = [
  'netpad.io',
  'www.netpad.io',
  'staging.netpad.io',
  'localhost',
  'localhost:3000',
];

/**
 * Subdomains that are reserved for system use and should not be treated as org slugs
 */
export const SYSTEM_SUBDOMAINS = new Set([
  'www',
  'staging',
  'app',
  'api',
  'admin',
  'mail',
  'ftp',
  'cdn',
]);

/**
 * Extract organization slug from a hostname
 *
 * @param hostname - The hostname to extract from (e.g., 'acme.netpad.io')
 * @returns The organization slug or null if not a subdomain
 *
 * @example
 * extractOrgSlug('acme.netpad.io') // 'acme'
 * extractOrgSlug('acme.localhost:3000') // 'acme'
 * extractOrgSlug('www.netpad.io') // null (system subdomain)
 * extractOrgSlug('netpad.io') // null (main domain)
 */
export function extractOrgSlug(hostname: string): string | null {
  // Remove port if present
  const hostWithoutPort = hostname.split(':')[0];

  // Check if it's a main domain (no subdomain)
  if (MAIN_DOMAINS.some((d) => hostname === d || hostname.startsWith(d))) {
    return null;
  }

  // Handle localhost subdomains (e.g., acme.localhost:3000)
  if (hostWithoutPort.endsWith('.localhost')) {
    const subdomain = hostWithoutPort.replace('.localhost', '');
    if (subdomain && !SYSTEM_SUBDOMAINS.has(subdomain)) {
      return subdomain;
    }
    return null;
  }

  // Handle netpad.io subdomains (e.g., acme.netpad.io)
  if (hostWithoutPort.endsWith('.netpad.io')) {
    const parts = hostWithoutPort.split('.');
    // Must have at least 3 parts: subdomain.netpad.io
    if (parts.length >= 3) {
      const subdomain = parts[0];
      // Check if it's a staging subdomain (e.g., acme.staging.netpad.io)
      if (parts.length === 4 && parts[1] === 'staging') {
        if (!SYSTEM_SUBDOMAINS.has(subdomain)) {
          return subdomain;
        }
      }
      // Standard subdomain (acme.netpad.io)
      if (parts.length === 3 && !SYSTEM_SUBDOMAINS.has(subdomain)) {
        return subdomain;
      }
    }
    return null;
  }

  return null;
}

/**
 * Build the public URL for a form
 *
 * @param orgSlug - The organization slug
 * @param formSlug - The form slug
 * @param options - Optional configuration
 * @returns The full public URL
 *
 * @example
 * buildFormUrl('acme', 'help') // 'https://acme.netpad.io/help'
 */
export function buildFormUrl(
  orgSlug: string,
  formSlug: string,
  options?: {
    protocol?: 'http' | 'https';
    rootDomain?: string;
  }
): string {
  const protocol = options?.protocol || 'https';
  const rootDomain = options?.rootDomain || 'netpad.io';

  return `${protocol}://${orgSlug}.${rootDomain}/${formSlug}`;
}

/**
 * Check if a slug change is allowed based on cooldown period
 *
 * @param lastChangedAt - When the slug was last changed (or undefined if never)
 * @param cooldownDays - Number of days required between changes (default 30)
 * @returns Object with allowed status and days remaining if not allowed
 */
export function canChangeSlug(
  lastChangedAt: Date | undefined,
  cooldownDays: number = 30
): { allowed: boolean; daysRemaining?: number } {
  if (!lastChangedAt) {
    return { allowed: true };
  }

  const now = new Date();
  const cooldownMs = cooldownDays * 24 * 60 * 60 * 1000;
  const timeSinceChange = now.getTime() - lastChangedAt.getTime();

  if (timeSinceChange >= cooldownMs) {
    return { allowed: true };
  }

  const daysRemaining = Math.ceil((cooldownMs - timeSinceChange) / (24 * 60 * 60 * 1000));
  return { allowed: false, daysRemaining };
}
