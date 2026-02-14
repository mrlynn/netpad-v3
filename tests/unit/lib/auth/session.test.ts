/**
 * Tests for Auth Session (pure functions)
 *
 * Tests: generateDeviceFingerprint
 */

// Mock iron-session before importing
jest.mock('iron-session', () => ({
  getIronSession: jest.fn(),
}));
jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { next: jest.fn() },
}));

import { generateDeviceFingerprint } from '@/lib/auth/session';

describe('generateDeviceFingerprint', () => {
  it('should generate a 32-char hex string', () => {
    const fp = generateDeviceFingerprint('Mozilla/5.0 Chrome');
    expect(fp).toMatch(/^[a-f0-9]{32}$/);
  });

  it('should be deterministic for same inputs', () => {
    const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)';
    const lang = 'en-US';
    expect(generateDeviceFingerprint(ua, lang)).toBe(generateDeviceFingerprint(ua, lang));
  });

  it('should differ for different user agents', () => {
    expect(generateDeviceFingerprint('Chrome/120')).not.toBe(generateDeviceFingerprint('Firefox/121'));
  });

  it('should differ when accept-language changes', () => {
    const ua = 'Chrome/120';
    expect(generateDeviceFingerprint(ua, 'en-US')).not.toBe(generateDeviceFingerprint(ua, 'de-DE'));
  });

  it('should handle missing accept-language', () => {
    const ua = 'Chrome/120';
    expect(generateDeviceFingerprint(ua)).toBe(generateDeviceFingerprint(ua, undefined));
  });

  it('should not use IP in fingerprint', () => {
    const ua = 'Chrome/120';
    const lang = 'en-US';
    expect(generateDeviceFingerprint(ua, lang, '10.0.0.1')).toBe(generateDeviceFingerprint(ua, lang, '192.168.1.1'));
  });
});
