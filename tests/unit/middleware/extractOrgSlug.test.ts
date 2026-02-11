/**
 * Tests for extractOrgSlug — subdomain routing for organization portals
 */

import { extractOrgSlug, MAIN_DOMAINS, SYSTEM_SUBDOMAINS } from '@/lib/slugs';

describe('extractOrgSlug', () => {
  describe('main domains (should return null)', () => {
    it.each([
      'netpad.io',
      'www.netpad.io',
      'staging.netpad.io',
      'localhost',
      'localhost:3000',
    ])('should return null for main domain: %s', (hostname) => {
      expect(extractOrgSlug(hostname)).toBeNull();
    });
  });

  describe('system subdomains (should return null)', () => {
    it.each([
      'www.netpad.io',
      'app.netpad.io',
      'api.netpad.io',
      'admin.netpad.io',
      'mail.netpad.io',
      'cdn.netpad.io',
    ])('should return null for system subdomain: %s', (hostname) => {
      expect(extractOrgSlug(hostname)).toBeNull();
    });

    it.each([
      'www.localhost',
      'app.localhost',
      'api.localhost',
      'admin.localhost',
    ])('should return null for system subdomain on localhost: %s', (hostname) => {
      expect(extractOrgSlug(hostname)).toBeNull();
    });
  });

  describe('organization subdomains on netpad.io', () => {
    it('should extract org slug from acme.netpad.io', () => {
      expect(extractOrgSlug('acme.netpad.io')).toBe('acme');
    });

    it('should extract org slug from my-org.netpad.io', () => {
      expect(extractOrgSlug('my-org.netpad.io')).toBe('my-org');
    });

    it('should extract org slug from test123.netpad.io', () => {
      expect(extractOrgSlug('test123.netpad.io')).toBe('test123');
    });
  });

  describe('organization subdomains on localhost', () => {
    it('should extract org slug from acme.localhost', () => {
      expect(extractOrgSlug('acme.localhost')).toBe('acme');
    });

    it('should extract org slug from acme.localhost:3000 (strips port)', () => {
      expect(extractOrgSlug('acme.localhost:3000')).toBe('acme');
    });
  });

  describe('staging subdomains', () => {
    it('should extract org slug from acme.staging.netpad.io', () => {
      expect(extractOrgSlug('acme.staging.netpad.io')).toBe('acme');
    });

    it('should return null for staging system subdomain', () => {
      expect(extractOrgSlug('admin.staging.netpad.io')).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should return null for empty string', () => {
      expect(extractOrgSlug('')).toBeNull();
    });

    it('should return null for unrelated domains', () => {
      expect(extractOrgSlug('example.com')).toBeNull();
      expect(extractOrgSlug('google.com')).toBeNull();
    });

    it('should return null for deeply nested subdomains (5 parts)', () => {
      expect(extractOrgSlug('a.b.c.netpad.io')).toBeNull();
    });

    it('should handle hostname with port', () => {
      expect(extractOrgSlug('acme.netpad.io:443')).toBe('acme');
    });
  });
});
