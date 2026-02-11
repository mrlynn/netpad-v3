/**
 * Tests for Slug Utilities
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
} from '../slugs';

describe('generateSlug', () => {
  it('converts name to lowercase hyphenated slug', () => {
    expect(generateSlug('IT Support Request')).toBe('it-support-request');
  });

  it('trims whitespace', () => {
    expect(generateSlug('  Hello World  ')).toBe('hello-world');
  });

  it('removes special characters', () => {
    expect(generateSlug('Acme Corp!')).toBe('acme-corp');
    expect(generateSlug('test@#$form')).toBe('testform');
  });

  it('collapses multiple hyphens', () => {
    expect(generateSlug('hello   world')).toBe('hello-world');
  });

  it('removes leading/trailing hyphens', () => {
    expect(generateSlug('-hello-')).toBe('hello');
  });

  it('truncates to 48 characters', () => {
    const long = 'a'.repeat(60);
    expect(generateSlug(long).length).toBe(48);
  });
});

describe('validateSlug', () => {
  it('accepts valid slugs', () => {
    expect(validateSlug('acme-corp')).toEqual({ valid: true });
    expect(validateSlug('my-form-123')).toEqual({ valid: true });
  });

  it('rejects too short', () => {
    expect(validateSlug('ab').valid).toBe(false);
    expect(validateSlug('').valid).toBe(false);
  });

  it('rejects too long', () => {
    expect(validateSlug('a'.repeat(49)).valid).toBe(false);
  });

  it('rejects reserved slugs', () => {
    expect(validateSlug('api').valid).toBe(false);
    expect(validateSlug('admin').valid).toBe(false);
    expect(validateSlug('netpad').valid).toBe(false);
  });

  it('rejects slugs starting/ending with hyphens', () => {
    expect(validateSlug('-hello').valid).toBe(false);
    expect(validateSlug('hello-').valid).toBe(false);
  });

  it('rejects uppercase', () => {
    expect(validateSlug('Hello').valid).toBe(false);
  });
});

describe('isReservedSlug', () => {
  it('returns true for reserved slugs', () => {
    expect(isReservedSlug('api')).toBe(true);
    expect(isReservedSlug('API')).toBe(true); // case insensitive
    expect(isReservedSlug('netpad')).toBe(true);
  });

  it('returns false for non-reserved slugs', () => {
    expect(isReservedSlug('acme-corp')).toBe(false);
  });
});

describe('generateUniqueSlug', () => {
  it('returns base slug if not taken', () => {
    expect(generateUniqueSlug('hello', new Set())).toBe('hello');
  });

  it('appends number if taken', () => {
    expect(generateUniqueSlug('hello', new Set(['hello']))).toBe('hello-1');
  });

  it('increments until unique', () => {
    expect(generateUniqueSlug('hello', new Set(['hello', 'hello-1', 'hello-2']))).toBe('hello-3');
  });
});

describe('getRootDomain', () => {
  it('returns netpad.io for netpad subdomains', () => {
    expect(getRootDomain('acme.netpad.io')).toBe('netpad.io');
  });

  it('returns localhost for localhost subdomains', () => {
    expect(getRootDomain('acme.localhost:3000')).toBe('localhost');
  });

  it('returns null for unknown domains', () => {
    expect(getRootDomain('example.com')).toBe(null);
  });
});

describe('extractOrgSlug', () => {
  it('extracts slug from netpad.io subdomain', () => {
    expect(extractOrgSlug('acme.netpad.io')).toBe('acme');
  });

  it('extracts slug from localhost subdomain', () => {
    expect(extractOrgSlug('acme.localhost:3000')).toBe('acme');
  });

  it('returns null for main domain', () => {
    expect(extractOrgSlug('netpad.io')).toBe(null);
  });

  it('returns null for system subdomains', () => {
    expect(extractOrgSlug('www.netpad.io')).toBe(null);
    expect(extractOrgSlug('api.netpad.io')).toBe(null);
    expect(extractOrgSlug('admin.netpad.io')).toBe(null);
  });

  it('extracts slug from staging subdomain', () => {
    expect(extractOrgSlug('acme.staging.netpad.io')).toBe('acme');
  });
});

describe('buildFormUrl', () => {
  it('builds default URL', () => {
    expect(buildFormUrl('acme', 'help')).toBe('https://acme.netpad.io/help');
  });

  it('respects custom options', () => {
    expect(buildFormUrl('acme', 'help', { protocol: 'http', rootDomain: 'localhost:3000' }))
      .toBe('http://acme.localhost:3000/help');
  });
});

describe('canChangeSlug', () => {
  it('allows if never changed', () => {
    expect(canChangeSlug(undefined)).toEqual({ allowed: true });
  });

  it('allows if cooldown passed', () => {
    const oldDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    expect(canChangeSlug(oldDate)).toEqual({ allowed: true });
  });

  it('blocks if within cooldown', () => {
    const recentDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    const result = canChangeSlug(recentDate);
    expect(result.allowed).toBe(false);
    expect(result.daysRemaining).toBeGreaterThan(0);
    expect(result.daysRemaining).toBeLessThanOrEqual(25);
  });
});
