/**
 * Tests for the @netpad/collaborate extension
 */

// Import polyfills first
import './setup';

import type { NetPadExtension } from '@/lib/extensions/types';

describe('@netpad/collaborate Extension', () => {
  let collaborateExtension: NetPadExtension;

  beforeAll(async () => {
    // Dynamic import to handle ESM
    const mod = await import('@netpad/collaborate');
    collaborateExtension = mod.default || mod.collaborateExtension;
  });

  describe('Extension Metadata', () => {
    it('should have correct id', () => {
      expect(collaborateExtension.metadata.id).toBe('netpad-collaborate');
    });

    it('should have correct name', () => {
      expect(collaborateExtension.metadata.name).toBe('NetPad Collaborate');
    });

    it('should have version 1.0.0', () => {
      expect(collaborateExtension.metadata.version).toBe('1.0.0');
    });

    it('should have a description', () => {
      expect(collaborateExtension.metadata.description).toBeDefined();
      expect(collaborateExtension.metadata.description!.length).toBeGreaterThan(0);
    });
  });

  describe('Extension Features', () => {
    it('should declare custom:collaborate feature', () => {
      expect(collaborateExtension.features).toContain('custom:collaborate');
    });

    it('should declare custom:community_gallery feature', () => {
      expect(collaborateExtension.features).toContain('custom:community_gallery');
    });

    it('should declare custom:contributor_leaderboard feature', () => {
      expect(collaborateExtension.features).toContain('custom:contributor_leaderboard');
    });

    it('should have exactly 3 features', () => {
      expect(collaborateExtension.features).toHaveLength(3);
    });
  });

  describe('Extension Routes', () => {
    it('should define 4 routes', () => {
      expect(collaborateExtension.routes).toHaveLength(4);
    });

    it('should define GET /api/ext/collaborate/gallery route', () => {
      const route = collaborateExtension.routes?.find(
        (r) => r.path === '/api/ext/collaborate/gallery' && r.method === 'GET'
      );
      expect(route).toBeDefined();
      expect(typeof route?.handler).toBe('function');
    });

    it('should define GET /api/ext/collaborate/contributors route', () => {
      const route = collaborateExtension.routes?.find(
        (r) => r.path === '/api/ext/collaborate/contributors' && r.method === 'GET'
      );
      expect(route).toBeDefined();
      expect(typeof route?.handler).toBe('function');
    });

    it('should define POST /api/ext/collaborate/notify route', () => {
      const route = collaborateExtension.routes?.find(
        (r) => r.path === '/api/ext/collaborate/notify' && r.method === 'POST'
      );
      expect(route).toBeDefined();
      expect(typeof route?.handler).toBe('function');
    });

    it('should define POST /api/ext/collaborate/submit route', () => {
      const route = collaborateExtension.routes?.find(
        (r) => r.path === '/api/ext/collaborate/submit' && r.method === 'POST'
      );
      expect(route).toBeDefined();
      expect(typeof route?.handler).toBe('function');
    });

    it('should have all routes under /api/ext/collaborate/ path', () => {
      collaborateExtension.routes?.forEach((route) => {
        expect(route.path).toMatch(/^\/api\/ext\/collaborate\//);
      });
    });
  });

  describe('Extension Initialization', () => {
    it('should have an initialize function', () => {
      expect(typeof collaborateExtension.initialize).toBe('function');
    });
  });

  describe('Extension Services', () => {
    it('should define services object', () => {
      expect(collaborateExtension.services).toBeDefined();
    });

    it('should have collaborate service', () => {
      expect(collaborateExtension.services?.collaborate).toBeDefined();
    });
  });
});
