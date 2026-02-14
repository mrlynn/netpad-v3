/**
 * Tests for src/lib/routing.ts
 * 
 * URL generation, parsing, and legacy route mappings
 */

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

// ============================================
// getOrgProjectUrl
// ============================================
describe('getOrgProjectUrl', () => {
  it('generates URL without resourceId', () => {
    expect(getOrgProjectUrl('org1', 'proj1', 'forms'))
      .toBe('/orgs/org1/projects/proj1/forms');
  });

  it('generates URL with resourceId', () => {
    expect(getOrgProjectUrl('org1', 'proj1', 'forms', 'form123'))
      .toBe('/orgs/org1/projects/proj1/forms/form123');
  });

  it('works with all resource types', () => {
    const types = ['forms', 'workflows', 'data', 'clusters', 'connections', 'builder', 'projects', 'applications'] as const;
    types.forEach(type => {
      const url = getOrgProjectUrl('o', 'p', type);
      expect(url).toBe(`/orgs/o/projects/p/${type}`);
    });
  });
});

// ============================================
// getOrgUrl
// ============================================
describe('getOrgUrl', () => {
  it('generates org URL without resource', () => {
    expect(getOrgUrl('org1')).toBe('/orgs/org1');
  });

  it('generates org URL with projects resource', () => {
    expect(getOrgUrl('org1', 'projects')).toBe('/orgs/org1/projects');
  });
});

// ============================================
// getProjectsUrl
// ============================================
describe('getProjectsUrl', () => {
  it('generates projects list URL', () => {
    expect(getProjectsUrl('org1')).toBe('/orgs/org1/projects');
  });
});

// ============================================
// getProjectResourceUrl (alias)
// ============================================
describe('getProjectResourceUrl', () => {
  it('delegates to getOrgProjectUrl', () => {
    expect(getProjectResourceUrl('o', 'p', 'workflows', 'w1'))
      .toBe('/orgs/o/projects/p/workflows/w1');
  });
});

// ============================================
// parseOrgProjectFromPath
// ============================================
describe('parseOrgProjectFromPath', () => {
  it('parses org and project from valid path', () => {
    expect(parseOrgProjectFromPath('/orgs/org1/projects/proj1/forms'))
      .toEqual({ orgId: 'org1', projectId: 'proj1' });
  });

  it('parses with trailing segments', () => {
    expect(parseOrgProjectFromPath('/orgs/abc/projects/xyz/forms/f1'))
      .toEqual({ orgId: 'abc', projectId: 'xyz' });
  });

  it('returns nulls for non-matching path', () => {
    expect(parseOrgProjectFromPath('/dashboard'))
      .toEqual({ orgId: null, projectId: null });
  });

  it('returns nulls for partial org path', () => {
    expect(parseOrgProjectFromPath('/orgs/org1'))
      .toEqual({ orgId: null, projectId: null });
  });

  it('returns nulls for empty path', () => {
    expect(parseOrgProjectFromPath(''))
      .toEqual({ orgId: null, projectId: null });
  });
});

// ============================================
// isOrgProjectPath
// ============================================
describe('isOrgProjectPath', () => {
  it('returns true for org/project paths', () => {
    expect(isOrgProjectPath('/orgs/o/projects/p/forms')).toBe(true);
  });

  it('returns false for org-only paths', () => {
    expect(isOrgProjectPath('/orgs/o')).toBe(false);
  });

  it('returns false for other paths', () => {
    expect(isOrgProjectPath('/dashboard')).toBe(false);
    expect(isOrgProjectPath('/apps/my-app')).toBe(false);
  });
});

// ============================================
// getAppUrl
// ============================================
describe('getAppUrl', () => {
  it('generates app URL with default section (forms)', () => {
    expect(getAppUrl('my-app')).toBe('/apps/my-app/forms');
  });

  it('generates app URL with specific section', () => {
    expect(getAppUrl('my-app', 'workflows')).toBe('/apps/my-app/workflows');
    expect(getAppUrl('my-app', 'data')).toBe('/apps/my-app/data');
    expect(getAppUrl('my-app', 'settings')).toBe('/apps/my-app/settings');
    expect(getAppUrl('my-app', 'admin')).toBe('/apps/my-app/admin');
  });
});

// ============================================
// parseAppFromPath
// ============================================
describe('parseAppFromPath', () => {
  it('parses app slug and section', () => {
    expect(parseAppFromPath('/apps/my-app/workflows'))
      .toEqual({ appSlug: 'my-app', section: 'workflows' });
  });

  it('defaults section to forms when missing', () => {
    expect(parseAppFromPath('/apps/my-app'))
      .toEqual({ appSlug: 'my-app', section: 'forms' });
  });

  it('returns nulls for non-app path', () => {
    expect(parseAppFromPath('/orgs/o'))
      .toEqual({ appSlug: null, section: null });
  });

  it('returns nulls for root path', () => {
    expect(parseAppFromPath('/'))
      .toEqual({ appSlug: null, section: null });
  });
});

// ============================================
// isAppPath
// ============================================
describe('isAppPath', () => {
  it('returns true for app paths', () => {
    expect(isAppPath('/apps/my-app')).toBe(true);
    expect(isAppPath('/apps/my-app/forms')).toBe(true);
  });

  it('returns false for non-app paths', () => {
    expect(isAppPath('/orgs/o')).toBe(false);
    expect(isAppPath('/dashboard')).toBe(false);
  });
});

// ============================================
// LEGACY_ROUTES
// ============================================
describe('LEGACY_ROUTES', () => {
  it('maps /my-forms to org/project forms URL', () => {
    expect(LEGACY_ROUTES['/my-forms']('o1', 'p1'))
      .toBe('/orgs/o1/projects/p1/forms');
  });

  it('maps /workflows to org/project workflows URL', () => {
    expect(LEGACY_ROUTES['/workflows']('o1', 'p1'))
      .toBe('/orgs/o1/projects/p1/workflows');
  });

  it('maps /data to org/project data URL', () => {
    expect(LEGACY_ROUTES['/data']('o1', 'p1'))
      .toBe('/orgs/o1/projects/p1/data');
  });

  it('maps /builder to org/project builder URL', () => {
    expect(LEGACY_ROUTES['/builder']('o1', 'p1'))
      .toBe('/orgs/o1/projects/p1/builder');
  });

  it('maps /projects to org projects URL', () => {
    expect(LEGACY_ROUTES['/projects']('o1', 'p1'))
      .toBe('/orgs/o1/projects');
  });

  it('has all expected legacy routes', () => {
    expect(Object.keys(LEGACY_ROUTES)).toEqual(
      expect.arrayContaining(['/my-forms', '/workflows', '/data', '/builder', '/projects'])
    );
  });
});
