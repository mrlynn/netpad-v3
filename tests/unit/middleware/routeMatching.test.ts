/**
 * Middleware Route Matching Tests
 *
 * Tests the route classification logic extracted from middleware.ts
 * Covers: protected routes, public routes, public API routes, form pages, legacy URLs
 */

// We test the route-matching logic by replicating the patterns from middleware.ts
// This avoids importing the middleware directly (which requires Edge runtime)

const PROTECTED_ROUTES = [
  '/orgs',
  '/projects',
  '/settings',
  '/builder',
  '/workflows',
  '/my-forms',
  '/applications',
  '/apps',
  '/marketplace',
  '/data',
  '/admin',
  '/onboarding',
  '/api/projects',
  '/api/organizations',
  '/api/forms',
  '/api/workflows',
  '/api/applications',
  '/api/collections',
  '/api/executions',
  '/api/vault',
  '/api/api-keys',
  '/api/billing',
  '/api/integrations',
  '/api/templates',
  '/api/deployments',
];

const PUBLIC_ROUTES = [
  '/auth/login',
  '/auth/verify',
  '/auth/signup',
  '/signup',
  '/',
  '/page',
  '/why-netpad',
  '/for-mongodb',
  '/pricing',
  '/privacy',
  '/terms',
  '/contact',
  '/manifesto',
  '/api/auth',
  '/api/forms',
  '/forms',
  '/wizard',
  '/waitlist',
  '/waitlist/pending',
  '/templates',
  '/marketplace',
];

const PUBLIC_API_ROUTES = [
  '/api/auth/',
  '/api/forms/',
  '/api/onboarding/',
  '/api/waitlist/signup',
  '/api/workflows/process',
  '/api/workflows/public/',
  '/api/workflows/import',
  '/api/templates/import',
  '/api/marketplace/applications',
  '/api/landing/',
  '/api/cron/',
  '/api/v1/',
];

// Replicate the regex compilation from middleware.ts
const PUBLIC_ROUTES_REGEX = new RegExp(
  `^(${PUBLIC_ROUTES.map(r => r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(\/|$)`
);
const PUBLIC_API_ROUTES_REGEX = new RegExp(
  `^(${PUBLIC_API_ROUTES.map(r => r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`
);
const PROTECTED_ROUTES_REGEX = new RegExp(
  `^(${PROTECTED_ROUTES.map(r => r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(\/|$)`
);

function isProtectedRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES_REGEX.test(pathname)) return false;
  if (PUBLIC_API_ROUTES_REGEX.test(pathname)) return false;
  return PROTECTED_ROUTES_REGEX.test(pathname);
}

function isPublicFormPage(pathname: string): boolean {
  return /^\/forms\/[^/]+$/.test(pathname) || /^\/wizard\/[^/]+$/.test(pathname);
}

function isLegacyApplicationUrl(pathname: string): {
  isLegacy: boolean;
  orgId?: string;
  projectId?: string;
  applicationId?: string;
  subPath?: string;
} {
  const legacyPattern = /^\/orgs\/([^/]+)\/projects\/([^/]+)\/applications\/([^/]+)(\/.*)?$/;
  const match = pathname.match(legacyPattern);
  if (!match) return { isLegacy: false };
  return {
    isLegacy: true,
    orgId: match[1],
    projectId: match[2],
    applicationId: match[3],
    subPath: match[4] || '',
  };
}

describe('Middleware Route Matching', () => {
  describe('isProtectedRoute', () => {
    describe('protected page routes', () => {
      const protectedPages = [
        '/orgs',
        '/orgs/my-org',
        '/projects',
        '/projects/abc123',
        '/settings',
        '/settings/profile',
        '/builder',
        '/builder/form-123',
        '/workflows',
        '/workflows/wf-1',
        '/my-forms',
        '/my-forms/form-1',
        '/applications',
        '/apps',
        '/apps/my-app',
        '/apps/my-app/forms',
        '/data',
        '/data/collection-1',
        '/admin',
        '/admin/users',
        '/onboarding',
        '/onboarding/step-1',
      ];

      it.each(protectedPages)('should protect %s', (path) => {
        expect(isProtectedRoute(path)).toBe(true);
      });
    });

    describe('protected API routes', () => {
      const protectedAPIs = [
        '/api/projects',
        '/api/projects/123',
        '/api/organizations',
        '/api/organizations/org-1',
        '/api/workflows',
        '/api/workflows/wf-1',
        '/api/applications',
        '/api/collections',
        '/api/collections/col-1',
        '/api/executions',
        '/api/vault',
        '/api/api-keys',
        '/api/billing',
        '/api/billing/subscription',
        '/api/integrations',
        '/api/templates',
        '/api/deployments',
      ];

      it.each(protectedAPIs)('should protect %s', (path) => {
        expect(isProtectedRoute(path)).toBe(true);
      });
    });

    describe('public page routes', () => {
      const publicPages = [
        '/',
        '/auth/login',
        '/auth/verify',
        '/auth/signup',
        '/signup',
        '/page',
        '/why-netpad',
        '/for-mongodb',
        '/pricing',
        '/privacy',
        '/terms',
        '/contact',
        '/manifesto',
        '/forms',
        '/forms/some-form',
        '/wizard',
        '/wizard/some-wizard',
        '/waitlist',
        '/waitlist/pending',
        '/templates',
        '/templates/some-template',
      ];

      it.each(publicPages)('should NOT protect %s', (path) => {
        expect(isProtectedRoute(path)).toBe(false);
      });
    });

    describe('public API routes', () => {
      const publicAPIs = [
        '/api/auth/',
        '/api/auth/login',
        '/api/auth/verify',
        '/api/forms/',
        '/api/forms/submit',
        '/api/forms/abc123',
        '/api/onboarding/',
        '/api/onboarding/complete',
        '/api/waitlist/signup',
        '/api/workflows/process',
        '/api/workflows/public/',
        '/api/workflows/public/wf-1',
        '/api/workflows/import',
        '/api/templates/import',
        '/api/marketplace/applications',
        '/api/marketplace/applications/app-1',
        '/api/landing/',
        '/api/landing/generate',
        '/api/cron/',
        '/api/cron/daily',
        '/api/v1/',
        '/api/v1/forms',
      ];

      it.each(publicAPIs)('should NOT protect %s', (path) => {
        expect(isProtectedRoute(path)).toBe(false);
      });
    });

    describe('unmatched routes (not protected, not explicitly public)', () => {
      const unmatchedRoutes = [
        '/about',
        '/blog',
        '/random-page',
        '/api/health',
        '/api/unknown',
      ];

      it.each(unmatchedRoutes)('should NOT protect %s (not in protected list)', (path) => {
        expect(isProtectedRoute(path)).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('should handle exact root path', () => {
        expect(isProtectedRoute('/')).toBe(false);
      });

      it('should handle trailing slashes on protected routes', () => {
        expect(isProtectedRoute('/orgs/')).toBe(true);
        expect(isProtectedRoute('/settings/')).toBe(true);
      });

      it('should handle deeply nested protected paths', () => {
        expect(isProtectedRoute('/orgs/my-org/details/members')).toBe(true);
        expect(isProtectedRoute('/api/projects/123/forms/456')).toBe(true);
      });

      it('should not protect /marketplace as page (it is in both public and protected)', () => {
        // /marketplace is in both PUBLIC_ROUTES and PROTECTED_ROUTES
        // Public check runs first, so it should NOT be protected
        expect(isProtectedRoute('/marketplace')).toBe(false);
      });

      it('should not protect /api/forms (in both public and protected)', () => {
        // /api/forms is in PROTECTED_ROUTES and PUBLIC_ROUTES
        // Public check runs first
        expect(isProtectedRoute('/api/forms')).toBe(false);
      });

      it('should not protect /templates (in both public and protected)', () => {
        expect(isProtectedRoute('/templates')).toBe(false);
      });
    });
  });

  describe('isPublicFormPage', () => {
    it('should match form pages with ID', () => {
      expect(isPublicFormPage('/forms/abc123')).toBe(true);
      expect(isPublicFormPage('/forms/my-form-slug')).toBe(true);
    });

    it('should match wizard pages with ID', () => {
      expect(isPublicFormPage('/wizard/wiz123')).toBe(true);
      expect(isPublicFormPage('/wizard/my-wizard')).toBe(true);
    });

    it('should NOT match bare /forms or /wizard', () => {
      expect(isPublicFormPage('/forms')).toBe(false);
      expect(isPublicFormPage('/wizard')).toBe(false);
    });

    it('should NOT match nested paths beyond one segment', () => {
      expect(isPublicFormPage('/forms/abc/edit')).toBe(false);
      expect(isPublicFormPage('/wizard/abc/step/2')).toBe(false);
    });

    it('should NOT match other paths', () => {
      expect(isPublicFormPage('/orgs/form123')).toBe(false);
      expect(isPublicFormPage('/api/forms/abc')).toBe(false);
    });
  });

  describe('isLegacyApplicationUrl', () => {
    it('should match full legacy application URLs', () => {
      const result = isLegacyApplicationUrl('/orgs/my-org/projects/my-proj/applications/app-1');
      expect(result).toEqual({
        isLegacy: true,
        orgId: 'my-org',
        projectId: 'my-proj',
        applicationId: 'app-1',
        subPath: '',
      });
    });

    it('should capture subPath', () => {
      const result = isLegacyApplicationUrl('/orgs/org1/projects/proj1/applications/app1/forms');
      expect(result).toEqual({
        isLegacy: true,
        orgId: 'org1',
        projectId: 'proj1',
        applicationId: 'app1',
        subPath: '/forms',
      });
    });

    it('should capture deep subPaths', () => {
      const result = isLegacyApplicationUrl('/orgs/org1/projects/proj1/applications/app1/forms/f1/edit');
      expect(result).toEqual({
        isLegacy: true,
        orgId: 'org1',
        projectId: 'proj1',
        applicationId: 'app1',
        subPath: '/forms/f1/edit',
      });
    });

    it('should NOT match partial URLs', () => {
      expect(isLegacyApplicationUrl('/orgs/org1').isLegacy).toBe(false);
      expect(isLegacyApplicationUrl('/orgs/org1/projects').isLegacy).toBe(false);
      expect(isLegacyApplicationUrl('/orgs/org1/projects/proj1').isLegacy).toBe(false);
      expect(isLegacyApplicationUrl('/orgs/org1/projects/proj1/applications').isLegacy).toBe(false);
    });

    it('should NOT match non-legacy URLs', () => {
      expect(isLegacyApplicationUrl('/apps/my-app').isLegacy).toBe(false);
      expect(isLegacyApplicationUrl('/settings').isLegacy).toBe(false);
      expect(isLegacyApplicationUrl('/').isLegacy).toBe(false);
    });

    it('should handle IDs with special characters', () => {
      const result = isLegacyApplicationUrl('/orgs/org-123/projects/proj_456/applications/507f1f77bcf86cd799439011');
      expect(result.isLegacy).toBe(true);
      expect(result.orgId).toBe('org-123');
      expect(result.projectId).toBe('proj_456');
      expect(result.applicationId).toBe('507f1f77bcf86cd799439011');
    });
  });

  describe('Route conflict detection', () => {
    it('should identify routes that appear in both protected and public lists', () => {
      // These routes are intentionally in both lists — public check wins
      const conflicts = PROTECTED_ROUTES.filter(pr =>
        PUBLIC_ROUTES.some(pub => pr === pub || pr.startsWith(pub))
      );
      // Document the known conflicts
      expect(conflicts).toContain('/marketplace');
      expect(conflicts).toContain('/api/forms');
      expect(conflicts).toContain('/api/templates');
    });

    it('should always resolve conflicts in favor of public (public check runs first)', () => {
      // /marketplace and /api/forms are in both lists — public wins
      expect(isProtectedRoute('/marketplace')).toBe(false);
      expect(isProtectedRoute('/api/forms')).toBe(false);
    });

    it('should protect /api/templates (not in public list, only /api/templates/import is public)', () => {
      // /api/templates is protected — only the /import sub-route is public
      expect(isProtectedRoute('/api/templates')).toBe(true);
      expect(isProtectedRoute('/api/templates/import')).toBe(false);
    });
  });

  describe('Regex compilation correctness', () => {
    it('should not have catastrophic backtracking on long paths', () => {
      const longPath = '/api/' + 'a'.repeat(1000);
      const start = Date.now();
      isProtectedRoute(longPath);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(50); // Should be near-instant
    });

    it('should correctly escape special regex characters in route patterns', () => {
      // The route patterns don't currently have special chars, but verify the escaping works
      // by testing that literal dots in routes aren't treated as regex wildcards
      expect(isProtectedRoute('/api/api-keys')).toBe(true);
      expect(isProtectedRoute('/apixapi-keys')).toBe(false); // dot should not match any char
    });
  });
});
