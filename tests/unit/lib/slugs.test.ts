/**
 * Tests for src/lib/slugs.ts
 * 
 * Slug generation, validation, URL building, and subdomain extraction
 */

import {
  generateSlug,
  validateSlug,
  isReservedSlug,
  generateUniqueSlug,
  getRootDomain,
  extractOrgSlug,
  buildFormUrl,
  canChangeSlug,
  MAIN_DOMAINS,
  SYSTEM_SUBDOMAINS,
} from '@/lib/slugs';

// ============================================
// generateSlug
// ============================================
describe('generateSlug', () => {
  it('converts name to lowercase hyphenated slug', () => {
    expect(generateSlug('IT Support Request')).toBe('it-support-request');
  });

  it('handles leading/trailing whitespace', () => {
    expect(generateSlug('  Hello World  ')).toBe('hello-world');
  });

  it('removes special characters', () => {
    expect(generateSlug('Acme Corp!')).toBe('acme-corp');
    expect(generateSlug('hello@world#test')).toBe('helloworldtest');
  });

  it('collapses multiple hyphens', () => {
    expect(generateSlug('hello---world')).toBe('hello-world');
  });

  it('removes leading/trailing hyphens', () => {
    expect(generateSlug('-hello-')).toBe('hello');
    expect(generateSlug('---test---')).toBe('test');
  });

  it('truncates to 48 characters', () => {
    const longName = 'a'.repeat(60);
    expect(generateSlug(longName).length).toBe(48);
  });

  it('handles empty string', () => {
    expect(generateSlug('')).toBe('');
  });

  it('handles only special characters', () => {
    expect(generateSlug('!@#$%')).toBe('');
  });

  it('handles numbers', () => {
    expect(generateSlug('Form 123')).toBe('form-123');
  });

  it('handles mixed spaces and hyphens', () => {
    expect(generateSlug('hello - world')).toBe('hello-world');
  });
});

// ============================================
// validateSlug
// ============================================
describe('validateSlug', () => {
  it('accepts valid slug', () => {
    expect(validateSlug('acme-corp')).toEqual({ valid: true });
  });

  it('accepts numeric slugs', () => {
    expect(validateSlug('123')).toEqual({ valid: true });
  });

  it('rejects empty slug', () => {
    expect(validateSlug('')).toEqual({ valid: false, error: 'Slug must be at least 3 characters' });
  });

  it('rejects slug shorter than 3 chars', () => {
    expect(validateSlug('ab')).toEqual({ valid: false, error: 'Slug must be at least 3 characters' });
  });

  it('rejects slug longer than 48 chars', () => {
    const long = 'a'.repeat(49);
    expect(validateSlug(long)).toEqual({ valid: false, error: 'Slug must be 48 characters or less' });
  });

  it('rejects slug starting with hyphen', () => {
    const result = validateSlug('-abc');
    expect(result.valid).toBe(false);
  });

  it('rejects slug ending with hyphen', () => {
    const result = validateSlug('abc-');
    expect(result.valid).toBe(false);
  });

  it('rejects uppercase letters', () => {
    const result = validateSlug('Acme');
    expect(result.valid).toBe(false);
  });

  it('rejects reserved slugs', () => {
    expect(validateSlug('api')).toEqual({ valid: false, error: 'This name is reserved' });
    expect(validateSlug('admin')).toEqual({ valid: false, error: 'This name is reserved' });
    expect(validateSlug('netpad')).toEqual({ valid: false, error: 'This name is reserved' });
    expect(validateSlug('demo')).toEqual({ valid: false, error: 'This name is reserved' });
  });

  it('accepts 3-character valid slug', () => {
    expect(validateSlug('abc')).toEqual({ valid: true });
  });

  it('accepts exactly 48 characters', () => {
    const slug = 'a'.repeat(48);
    expect(validateSlug(slug)).toEqual({ valid: true });
  });
});

// ============================================
// isReservedSlug
// ============================================
describe('isReservedSlug', () => {
  it('returns true for reserved slugs', () => {
    expect(isReservedSlug('api')).toBe(true);
    expect(isReservedSlug('admin')).toBe(true);
    expect(isReservedSlug('www')).toBe(true);
    expect(isReservedSlug('netpad')).toBe(true);
  });

  it('returns false for non-reserved slugs', () => {
    expect(isReservedSlug('acme')).toBe(false);
    expect(isReservedSlug('my-company')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(isReservedSlug('API')).toBe(true);
    expect(isReservedSlug('Admin')).toBe(true);
  });
});

// ============================================
// generateUniqueSlug
// ============================================
describe('generateUniqueSlug', () => {
  it('returns base slug if not taken', () => {
    expect(generateUniqueSlug('acme', new Set())).toBe('acme');
  });

  it('appends -1 if base is taken', () => {
    expect(generateUniqueSlug('acme', new Set(['acme']))).toBe('acme-1');
  });

  it('increments counter until unique', () => {
    const existing = new Set(['help', 'help-1', 'help-2']);
    expect(generateUniqueSlug('help', existing)).toBe('help-3');
  });

  it('handles large collision sets', () => {
    const existing = new Set<string>();
    existing.add('test');
    for (let i = 1; i <= 100; i++) existing.add(`test-${i}`);
    expect(generateUniqueSlug('test', existing)).toBe('test-101');
  });
});

// ============================================
// getRootDomain
// ============================================
describe('getRootDomain', () => {
  it('returns netpad.io for netpad.io domains', () => {
    expect(getRootDomain('netpad.io')).toBe('netpad.io');
    expect(getRootDomain('acme.netpad.io')).toBe('netpad.io');
  });

  it('returns localhost for localhost domains', () => {
    expect(getRootDomain('localhost')).toBe('localhost');
    expect(getRootDomain('acme.localhost:3000')).toBe('localhost');
  });

  it('strips port before matching', () => {
    expect(getRootDomain('netpad.io:443')).toBe('netpad.io');
    expect(getRootDomain('localhost:3000')).toBe('localhost');
  });

  it('returns null for unknown domains', () => {
    expect(getRootDomain('example.com')).toBeNull();
    expect(getRootDomain('google.com')).toBeNull();
  });
});

// ============================================
// extractOrgSlug
// ============================================
describe('extractOrgSlug', () => {
  it('extracts slug from subdomain.netpad.io', () => {
    expect(extractOrgSlug('acme.netpad.io')).toBe('acme');
  });

  it('extracts slug from subdomain.localhost:3000', () => {
    expect(extractOrgSlug('acme.localhost:3000')).toBe('acme');
  });

  it('returns null for main domain', () => {
    expect(extractOrgSlug('netpad.io')).toBeNull();
    expect(extractOrgSlug('www.netpad.io')).toBeNull();
    expect(extractOrgSlug('localhost')).toBeNull();
  });

  it('returns null for system subdomains', () => {
    expect(extractOrgSlug('www.netpad.io')).toBeNull();
    expect(extractOrgSlug('api.netpad.io')).toBeNull();
    expect(extractOrgSlug('cdn.netpad.io')).toBeNull();
    expect(extractOrgSlug('admin.netpad.io')).toBeNull();
  });

  it('handles staging subdomains', () => {
    expect(extractOrgSlug('acme.staging.netpad.io')).toBe('acme');
  });

  it('returns null for system subdomains on staging', () => {
    expect(extractOrgSlug('www.staging.netpad.io')).toBeNull();
  });

  it('returns null for unknown domains', () => {
    expect(extractOrgSlug('example.com')).toBeNull();
  });
});

// ============================================
// buildFormUrl
// ============================================
describe('buildFormUrl', () => {
  it('builds default https URL', () => {
    expect(buildFormUrl('acme', 'help')).toBe('https://acme.netpad.io/help');
  });

  it('respects custom protocol', () => {
    expect(buildFormUrl('acme', 'help', { protocol: 'http' })).toBe('http://acme.netpad.io/help');
  });

  it('respects custom root domain', () => {
    expect(buildFormUrl('acme', 'help', { rootDomain: 'localhost:3000' }))
      .toBe('https://acme.localhost:3000/help');
  });

  it('handles both options', () => {
    expect(buildFormUrl('acme', 'help', { protocol: 'http', rootDomain: 'localhost:3000' }))
      .toBe('http://acme.localhost:3000/help');
  });
});

// ============================================
// canChangeSlug
// ============================================
describe('canChangeSlug', () => {
  it('allows change when never changed before', () => {
    expect(canChangeSlug(undefined)).toEqual({ allowed: true });
  });

  it('allows change after cooldown period', () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 31);
    expect(canChangeSlug(oldDate)).toEqual({ allowed: true });
  });

  it('rejects change during cooldown period', () => {
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 5);
    const result = canChangeSlug(recentDate);
    expect(result.allowed).toBe(false);
    expect(result.daysRemaining).toBeGreaterThan(0);
    expect(result.daysRemaining).toBeLessThanOrEqual(25);
  });

  it('respects custom cooldown days', () => {
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 5);
    expect(canChangeSlug(recentDate, 3)).toEqual({ allowed: true });
  });

  it('edge case: exactly at cooldown boundary', () => {
    const exactDate = new Date();
    exactDate.setDate(exactDate.getDate() - 30);
    const result = canChangeSlug(exactDate);
    expect(result.allowed).toBe(true);
  });
});

// ============================================
// Constants
// ============================================
describe('MAIN_DOMAINS', () => {
  it('includes expected domains', () => {
    expect(MAIN_DOMAINS).toContain('netpad.io');
    expect(MAIN_DOMAINS).toContain('www.netpad.io');
    expect(MAIN_DOMAINS).toContain('localhost');
  });
});

describe('SYSTEM_SUBDOMAINS', () => {
  it('includes expected subdomains', () => {
    expect(SYSTEM_SUBDOMAINS.has('www')).toBe(true);
    expect(SYSTEM_SUBDOMAINS.has('api')).toBe(true);
    expect(SYSTEM_SUBDOMAINS.has('admin')).toBe(true);
    expect(SYSTEM_SUBDOMAINS.has('cdn')).toBe(true);
  });

  it('does not include org names', () => {
    expect(SYSTEM_SUBDOMAINS.has('acme')).toBe(false);
  });
});
