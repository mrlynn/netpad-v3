import {
  getOrgProjectUrl,
  getOrgUrl,
  getProjectsUrl,
  getProjectResourceUrl,
  parseOrgProjectFromPath,
  isOrgProjectPath,
  getAppUrl,
  parseAppFromPath,
  isAppPath,
  LEGACY_ROUTES,
} from '@/lib/routing';

describe('routing utilities', () => {
  describe('getOrgProjectUrl', () => {
    it('generates base resource URL', () => {
      expect(getOrgProjectUrl('org1', 'proj1', 'forms')).toBe(
        '/orgs/org1/projects/proj1/forms'
      );
    });

    it('generates resource URL with resourceId', () => {
      expect(getOrgProjectUrl('org1', 'proj1', 'forms', 'form123')).toBe(
        '/orgs/org1/projects/proj1/forms/form123'
      );
    });

    it('works for all resource types', () => {
      const types = ['forms', 'workflows', 'data', 'clusters', 'connections', 'builder', 'projects', 'applications'] as const;
      for (const t of types) {
        expect(getOrgProjectUrl('o', 'p', t)).toBe(`/orgs/o/projects/p/${t}`);
      }
    });
  });

  describe('getOrgUrl', () => {
    it('returns org root', () => {
      expect(getOrgUrl('org1')).toBe('/orgs/org1');
    });

    it('returns org resource URL', () => {
      expect(getOrgUrl('org1', 'projects')).toBe('/orgs/org1/projects');
    });
  });

  describe('getProjectsUrl', () => {
    it('returns projects listing URL', () => {
      expect(getProjectsUrl('org1')).toBe('/orgs/org1/projects');
    });
  });

  describe('getProjectResourceUrl', () => {
    it('delegates to getOrgProjectUrl', () => {
      expect(getProjectResourceUrl('o', 'p', 'workflows', 'w1')).toBe(
        '/orgs/o/projects/p/workflows/w1'
      );
    });
  });

  describe('parseOrgProjectFromPath', () => {
    it('extracts orgId and projectId', () => {
      expect(parseOrgProjectFromPath('/orgs/abc/projects/xyz/forms')).toEqual({
        orgId: 'abc',
        projectId: 'xyz',
      });
    });

    it('returns nulls for non-matching paths', () => {
      expect(parseOrgProjectFromPath('/dashboard')).toEqual({
        orgId: null,
        projectId: null,
      });
    });

    it('returns nulls for partial org path', () => {
      expect(parseOrgProjectFromPath('/orgs/abc')).toEqual({
        orgId: null,
        projectId: null,
      });
    });
  });

  describe('isOrgProjectPath', () => {
    it('returns true for valid org/project paths', () => {
      expect(isOrgProjectPath('/orgs/a/projects/b/forms')).toBe(true);
    });

    it('returns false for non-org paths', () => {
      expect(isOrgProjectPath('/apps/my-app/forms')).toBe(false);
    });

    it('returns false for org-only paths', () => {
      expect(isOrgProjectPath('/orgs/a/settings')).toBe(false);
    });
  });

  describe('getAppUrl', () => {
    it('generates app URL with default section', () => {
      expect(getAppUrl('my-app')).toBe('/apps/my-app/forms');
    });

    it('generates app URL with specific section', () => {
      expect(getAppUrl('my-app', 'workflows')).toBe('/apps/my-app/workflows');
      expect(getAppUrl('my-app', 'data')).toBe('/apps/my-app/data');
      expect(getAppUrl('my-app', 'settings')).toBe('/apps/my-app/settings');
      expect(getAppUrl('my-app', 'admin')).toBe('/apps/my-app/admin');
    });
  });

  describe('parseAppFromPath', () => {
    it('extracts app slug and section', () => {
      expect(parseAppFromPath('/apps/my-app/workflows')).toEqual({
        appSlug: 'my-app',
        section: 'workflows',
      });
    });

    it('defaults section to forms when missing', () => {
      expect(parseAppFromPath('/apps/my-app')).toEqual({
        appSlug: 'my-app',
        section: 'forms',
      });
    });

    it('returns nulls for non-app paths', () => {
      expect(parseAppFromPath('/orgs/abc')).toEqual({
        appSlug: null,
        section: null,
      });
    });
  });

  describe('isAppPath', () => {
    it('returns true for app paths', () => {
      expect(isAppPath('/apps/my-app/forms')).toBe(true);
    });

    it('returns false for non-app paths', () => {
      expect(isAppPath('/orgs/abc/projects/p1')).toBe(false);
    });
  });

  describe('LEGACY_ROUTES', () => {
    it('maps /my-forms to org/project forms', () => {
      expect(LEGACY_ROUTES['/my-forms']('o1', 'p1')).toBe(
        '/orgs/o1/projects/p1/forms'
      );
    });

    it('maps /workflows correctly', () => {
      expect(LEGACY_ROUTES['/workflows']('o1', 'p1')).toBe(
        '/orgs/o1/projects/p1/workflows'
      );
    });

    it('maps /projects correctly', () => {
      expect(LEGACY_ROUTES['/projects']('o1', 'p1')).toBe(
        '/orgs/o1/projects'
      );
    });
  });
});
