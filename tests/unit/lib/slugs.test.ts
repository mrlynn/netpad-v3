/**
 * Tests for src/lib/slugs.ts
 *
 * Covers: generateSlug, validateSlug, isReservedSlug, generateUniqueSlug,
 * getRootDomain, extractOrgSlug, buildFormUrl, canChangeSlug
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

describe('generateSlug', () => {
  it('converts a simple name to lowercase kebab-case', () => {
    expect(generateSlug('IT Support Request')).toBe('it-support-request');
  });

  it('handles company names', () => {
    expect(generateSlug('Acme Corp')).toBe('acme-corp');
  });

  it('trims whitespace', () => {
    expect(generateSlug('  Hello World!  ')).toBe('hello-world');
  });

  it('removes special characters', () => {
    expect(generateSlug('My Form (v2) #1!')).toBe('my-form-v2-1');
  });

  it('collapses multiple hyphens', () => {
    expect(generateSlug('hello---world')).toBe('hello-world');
  });

  it('removes leading and trailing hyphens', () => {
    expect(generateSlug('-hello-world-')).toBe('hello-world');
  });

  it('truncates to 48 characters', () => {
    const longName = 'a'.repeat(100);
    expect(generateSlug(longName).length).toBeLessThanOrEqual(48);
  });

  it('handles empty string', () => {
    expect(generateSlug('')).toBe('');
  });

  it('handles all special characters', () => {
    expect(generateSlug('!@#$%^&*()')).toBe('');
  });

  it('handles unicode characters', () => {
    // Unicode letters get stripped, numbers and ascii letters remain
    expect(generateSlug('café résumé')).toBe('caf-rsum');
  });

  it('preserves numbers', () => {
    expect(generateSlug('Form 42 Version 3')).toBe('form-42-version-3');
  });
});

describe('validateSlug', () => {
  it('accepts a valid slug', () => {
    expect(validateSlug('acme-corp')).toEqual({ valid: true });
  });

  it('accepts a slug with numbers', () => {
    expect(validateSlug('team-42')).toEqual({ valid: true });
  });

  it('rejects empty string', () => {
    expect(validateSlug('')).toEqual({
      valid: false,
      error: 'Slug must be at least 3 characters',
    });
  });

  it('rejects too-short slugs', () => {
    expect(validateSlug('ab')).toEqual({
      valid: false,
      error: 'Slug must be at least 3 characters',
    });
  });

  it('rejects slugs over 48 characters', () => {
    const longSlug = 'a'.repeat(49);
    expect(validateSlug(longSlug)).toEqual({
      valid: false,
      error: 'Slug must be 48 characters or less',
    });
  });

  it('accepts exactly 48 character slug', () => {
    const slug48 = 'a'.repeat(48);
    expect(validateSlug(slug48)).toEqual({ valid: true });
  });

  it('rejects reserved slugs', () => {
    expect(validateSlug('api')).toEqual({
      valid: false,
      error: 'This name is reserved',
    });
    expect(validateSlug('admin')).toEqual({
      valid: false,
      error: 'This name is reserved',
    });
    expect(validateSlug('netpad')).toEqual({
      valid: false,
      error: 'This name is reserved',
    });
  });

  it('rejects slugs with uppercase letters', () => {
    const result = validateSlug('Acme-Corp');
    expect(result.valid).toBe(false);
  });

  it('rejects slugs starting with hyphen', () => {
    const result = validateSlug('-acme');
    expect(result.valid).toBe(false);
  });

  it('rejects slugs ending with hyphen', () => {
    const result = validateSlug('acme-');
    expect(result.valid).toBe(false);
  });

  it('accepts 3-character alphanumeric slug', () => {
    expect(validateSlug('abc')).toEqual({ valid: true });
  });
});

describe('isReservedSlug', () => {
  it('returns true for reserved system routes', () => {
    expect(isReservedSlug('api')).toBe(true);
    expect(isReservedSlug('app')).toBe(true);
    expect(isReservedSlug('admin')).toBe(true);
    expect(isReservedSlug('dashboard')).toBe(true);
  });

  it('returns true for reserved brand names', () => {
    expect(isReservedSlug('netpad')).toBe(true);
    expect(isReservedSlug('forms')).toBe(true);
    expect(isReservedSlug('official')).toBe(true);
  });

  it('returns true for confusing slugs', () => {
    expect(isReservedSlug('new')).toBe(true);
    expect(isReservedSlug('create')).toBe(true);
    expect(isReservedSlug('edit')).toBe(true);
    expect(isReservedSlug('delete')).toBe(true);
  });

  it('returns false for normal slugs', () => {
    expect(isReservedSlug('acme-corp')).toBe(false);
    expect(isReservedSlug('my-org')).toBe(false);
    expect(isReservedSlug('team-42')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(isReservedSlug('API')).toBe(true);
    expect(isReservedSlug('Admin')).toBe(true);
  });
});

describe('generateUniqueSlug', () => {
  it('returns base slug when not taken', () => {
    expect(generateUniqueSlug('acme', new Set())).toBe('acme');
  });

  it('appends -1 when base is taken', () => {
    expect(generateUniqueSlug('acme', new Set(['acme']))).toBe('acme-1');
  });

  it('increments counter until unique', () => {
    const existing = new Set(['help', 'help-1', 'help-2']);
    expect(generateUniqueSlug('help', existing)).toBe('help-3');
  });

  it('handles large existing sets', () => {
    const existing = new Set<string>();
    existing.add('test');
    for (let i = 1; i <= 100; i++) {
      existing.add(`test-${i}`);
    }
    expect(generateUniqueSlug('test', existing)).toBe('test-101');
  });
});

describe('getRootDomain', () => {
  it('returns localhost for localhost', () => {
    expect(getRootDomain('localhost')).toBe('localhost');
  });

  it('returns localhost for subdomain.localhost', () => {
    expect(getRootDomain('acme.localhost')).toBe('localhost');
  });

  it('returns localhost for subdomain.localhost:3000', () => {
    expect(getRootDomain('acme.localhost:3000')).toBe('localhost');
  });

  it('returns netpad.io for netpad.io', () => {
    expect(getRootDomain('netpad.io')).toBe('netpad.io');
  });

  it('returns netpad.io for subdomain.netpad.io', () => {
    expect(getRootDomain('acme.netpad.io')).toBe('netpad.io');
  });

  it('returns netpad.io for staging subdomains (matched by .netpad.io suffix)', () => {
    expect(getRootDomain('acme.staging.netpad.io')).toBe('netpad.io');
  });

  it('returns null for unknown domains', () => {
    expect(getRootDomain('example.com')).toBeNull();
    expect(getRootDomain('google.com')).toBeNull();
  });
});

describe('extractOrgSlug', () => {
  it('extracts slug from netpad.io subdomain', () => {
    expect(extractOrgSlug('acme.netpad.io')).toBe('acme');
  });

  it('extracts slug from localhost subdomain', () => {
    expect(extractOrgSlug('acme.localhost:3000')).toBe('acme');
  });

  it('returns null for main domains', () => {
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

  it('returns null for system subdomains on localhost', () => {
    expect(extractOrgSlug('www.localhost:3000')).toBeNull();
    expect(extractOrgSlug('api.localhost:3000')).toBeNull();
  });

  it('extracts slug from staging subdomain', () => {
    expect(extractOrgSlug('acme.staging.netpad.io')).toBe('acme');
  });

  it('returns null for unknown domains', () => {
    expect(extractOrgSlug('example.com')).toBeNull();
  });
});

describe('buildFormUrl', () => {
  it('builds standard form URL', () => {
    expect(buildFormUrl('acme', 'help')).toBe('https://acme.netpad.io/help');
  });

  it('allows custom protocol', () => {
    expect(buildFormUrl('acme', 'help', { protocol: 'http' })).toBe(
      'http://acme.netpad.io/help'
    );
  });

  it('allows custom root domain', () => {
    expect(
      buildFormUrl('acme', 'help', { rootDomain: 'localhost:3000' })
    ).toBe('https://acme.localhost:3000/help');
  });

  it('allows both custom options', () => {
    expect(
      buildFormUrl('acme', 'help', {
        protocol: 'http',
        rootDomain: 'localhost:3000',
      })
    ).toBe('http://acme.localhost:3000/help');
  });
});

describe('canChangeSlug', () => {
  it('allows change when never changed before', () => {
    expect(canChangeSlug(undefined)).toEqual({ allowed: true });
  });

  it('allows change after cooldown period', () => {
    const thirtyOneDaysAgo = new Date();
    thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);
    expect(canChangeSlug(thirtyOneDaysAgo)).toEqual({ allowed: true });
  });

  it('blocks change within cooldown period', () => {
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    const result = canChangeSlug(fiveDaysAgo);
    expect(result.allowed).toBe(false);
    expect(result.daysRemaining).toBeGreaterThan(0);
    expect(result.daysRemaining).toBeLessThanOrEqual(25);
  });

  it('blocks change made today', () => {
    const result = canChangeSlug(new Date());
    expect(result.allowed).toBe(false);
    expect(result.daysRemaining).toBe(30);
  });

  it('respects custom cooldown days', () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    // 7-day cooldown, changed 3 days ago → blocked
    const blocked = canChangeSlug(threeDaysAgo, 7);
    expect(blocked.allowed).toBe(false);

    // 2-day cooldown, changed 3 days ago → allowed
    const allowed = canChangeSlug(threeDaysAgo, 2);
    expect(allowed.allowed).toBe(true);
  });
});

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
    expect(SYSTEM_SUBDOMAINS.has('cdn')).toBe(true);
    expect(SYSTEM_SUBDOMAINS.has('admin')).toBe(true);
  });

  it('does not include normal org names', () => {
    expect(SYSTEM_SUBDOMAINS.has('acme')).toBe(false);
    expect(SYSTEM_SUBDOMAINS.has('my-org')).toBe(false);
  });
});
