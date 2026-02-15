// Mock nanoid before importing
jest.mock('nanoid', () => ({
  nanoid: (len: number = 21) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < len; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  },
}));

jest.mock('nanoid', () => ({
  nanoid: (len: number = 21) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
    let result = '';
    for (let i = 0; i < len; i++) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
  },
}));

import { generateId, ids } from './ids';

describe('generateId', () => {
  it('generates with prefix', () => {
    const id = generateId('test');
    expect(id).toMatch(/^test_/);
  });

  it('has correct length', () => {
    const id = generateId('x', 16);
    expect(id.length).toBe(2 + 16);
  });

  it('generates unique ids', () => {
    const set = new Set(Array.from({ length: 100 }, () => generateId('u')));
    expect(set.size).toBe(100);
  });
});

describe('ids', () => {
  const prefixes: [string, string][] = [
    ['group', 'grp_'],
    ['role', 'role_'],
    ['assignment', 'asgn_'],
    ['invitation', 'inv_'],
    ['org', 'org_'],
    ['project', 'proj_'],
    ['user', 'user_'],
    ['form', 'form_'],
    ['submission', 'sub_'],
    ['vault', 'vault_'],
    ['workflow', 'wf_'],
    ['deployment', 'dep_'],
    ['credential', 'intcred_'],
  ];

  it.each(prefixes)('ids.%s starts with %s', (method, prefix) => {
    const id = (ids as any)[method]();
    expect(id.startsWith(prefix)).toBe(true);
    expect(id.length).toBeGreaterThan(prefix.length);
  });
});
