import {
  validatePackageStructure,
  validateNetPadConfig,
  validateBundleJson,
  isValidSemver,
  validatePackageNameFormat,
  validateCompletePackage,
} from './validators';

describe('isValidSemver', () => {
  it.each(['1.0.0', '0.1.0', '10.20.30', '1.0.0-alpha', '1.0.0-alpha.1', '1.0.0+build'])
    ('accepts %s', (v) => expect(isValidSemver(v)).toBe(true));

  it.each(['1.0', '1', 'v1.0.0', '1.0.0.0', 'abc', ''])
    ('rejects %s', (v) => expect(isValidSemver(v)).toBe(false));
});

describe('validatePackageNameFormat', () => {
  it('rejects empty name', () => {
    expect(validatePackageNameFormat('').valid).toBe(false);
  });

  it('rejects long names', () => {
    expect(validatePackageNameFormat('a'.repeat(215)).valid).toBe(false);
  });

  it('rejects uppercase', () => {
    expect(validatePackageNameFormat('MyPackage').valid).toBe(false);
  });

  it('rejects reserved names', () => {
    expect(validatePackageNameFormat('node_modules').valid).toBe(false);
  });

  it('accepts scoped package', () => {
    expect(validatePackageNameFormat('@scope/netpad-app-test').valid).toBe(true);
  });

  it('warns on non-netpad naming', () => {
    const r = validatePackageNameFormat('my-package');
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it('no naming warning for app packages', () => {
    const r = validatePackageNameFormat('netpad-app-test');
    expect(r.warnings.filter(w => w.includes('conventions'))).toHaveLength(0);
  });
});

describe('validateNetPadConfig', () => {
  it('requires type', () => {
    expect(validateNetPadConfig({}).valid).toBe(false);
  });

  it('rejects invalid type', () => {
    expect(validateNetPadConfig({ type: 'widget' }).valid).toBe(false);
  });

  it('validates application fields', () => {
    const r = validateNetPadConfig({ type: 'application' });
    expect(r.errors.some(e => e.includes('Application name'))).toBe(true);
  });

  it('validates plugin fields', () => {
    const r = validateNetPadConfig({ type: 'plugin' });
    expect(r.errors.some(e => e.includes('Plugin type is required'))).toBe(true);
  });

  it('rejects invalid plugin type', () => {
    const r = validateNetPadConfig({ type: 'plugin', pluginType: 'bad' });
    expect(r.valid).toBe(false);
  });

  it('requires nodes for node plugin', () => {
    const r = validateNetPadConfig({ type: 'plugin', pluginType: 'node' });
    expect(r.errors.some(e => e.includes('at least one node'))).toBe(true);
  });

  it('validates version format', () => {
    const r = validateNetPadConfig({ type: 'application', name: 'x', description: 'x', version: 'bad' });
    expect(r.errors.some(e => e.includes('Invalid version'))).toBe(true);
  });

  it('validates dependencies arrays', () => {
    const r = validateNetPadConfig({
      type: 'application', name: 'x', description: 'x', version: '1.0.0',
      dependencies: { applications: 'not-array' },
    });
    expect(r.errors.some(e => e.includes('Dependencies.applications'))).toBe(true);
  });
});

describe('validatePackageStructure', () => {
  const validPkg = {
    name: '@test/netpad-app-x',
    version: '1.0.0',
    description: 'Test',
    main: 'bundle.json',
    keywords: ['netpad-app'],
    netpad: { type: 'application', name: 'X', description: 'X', version: '1.0.0' },
  };

  it('accepts valid package', () => {
    expect(validatePackageStructure(validPkg).valid).toBe(true);
  });

  it('requires name', () => {
    const { name, ...rest } = validPkg;
    expect(validatePackageStructure(rest).errors.some(e => e.includes('name'))).toBe(true);
  });

  it('requires version', () => {
    const { version, ...rest } = validPkg;
    expect(validatePackageStructure(rest).errors.some(e => e.includes('version'))).toBe(true);
  });

  it('requires netpad field', () => {
    const { netpad, ...rest } = validPkg;
    expect(validatePackageStructure(rest).valid).toBe(false);
  });

  it('validates semver', () => {
    expect(validatePackageStructure({ ...validPkg, version: 'bad' }).valid).toBe(false);
  });

  it('warns on missing keywords', () => {
    const { keywords, ...rest } = validPkg;
    expect(validatePackageStructure(rest).warnings.some(w => w.includes('keywords'))).toBe(true);
  });

  it('requires main field', () => {
    const { main, ...rest } = validPkg;
    expect(validatePackageStructure(rest).errors.some(e => e.includes('main'))).toBe(true);
  });
});

describe('validateBundleJson', () => {
  it('rejects null', () => {
    expect(validateBundleJson(null).valid).toBe(false);
  });

  it('requires manifest', () => {
    expect(validateBundleJson({}).errors.some(e => e.includes('manifest'))).toBe(true);
  });

  it('requires manifest name and version', () => {
    const r = validateBundleJson({ manifest: {} });
    expect(r.errors.some(e => e.includes('name'))).toBe(true);
    expect(r.errors.some(e => e.includes('version'))).toBe(true);
  });

  it('validates forms array', () => {
    const r = validateBundleJson({ manifest: { name: 'x', version: '1.0.0' }, forms: 'bad' });
    expect(r.errors.some(e => e.includes('forms must be an array'))).toBe(true);
  });

  it('requires form names', () => {
    const r = validateBundleJson({ manifest: { name: 'x', version: '1.0.0' }, forms: [{}] });
    expect(r.errors.some(e => e.includes('Form at index 0'))).toBe(true);
  });

  it('warns on empty bundle', () => {
    const r = validateBundleJson({ manifest: { name: 'x', version: '1.0.0' } });
    expect(r.warnings.some(w => w.includes('no forms or workflows'))).toBe(true);
  });
});

describe('validateCompletePackage', () => {
  const pkg = {
    name: '@t/netpad-app-x', version: '1.0.0', description: 'X', main: 'bundle.json',
    keywords: ['netpad-app'],
    netpad: { type: 'application', name: 'X', description: 'X', version: '1.0.0', applicationId: 'app1' },
  };
  const bundle = { manifest: { name: 'X', version: '1.0.0', id: 'app1' }, forms: [{ name: 'F' }] };

  it('passes with matching versions', () => {
    expect(validateCompletePackage(pkg, bundle).valid).toBe(true);
  });

  it('errors on version mismatch', () => {
    const r = validateCompletePackage(pkg, { ...bundle, manifest: { ...bundle.manifest, version: '2.0.0' } });
    expect(r.errors.some(e => e.includes('Version mismatch'))).toBe(true);
  });

  it('warns on applicationId mismatch', () => {
    const r = validateCompletePackage(pkg, { ...bundle, manifest: { ...bundle.manifest, id: 'other' } });
    expect(r.warnings.some(w => w.includes('Application ID mismatch'))).toBe(true);
  });
});
