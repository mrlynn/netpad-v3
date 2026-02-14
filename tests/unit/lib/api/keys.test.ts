/**
 * Tests for API Key Management (pure functions)
 *
 * Tests: hasPermission, canAccessForm, isIPAllowed, checkRateLimit,
 * getRateLimitStatus, formatAPIKeyToListItem
 */
import {
  hasPermission,
  canAccessForm,
  isIPAllowed,
  checkRateLimit,
  getRateLimitStatus,
  formatAPIKeyToListItem,
} from '@/lib/api/keys';
import { APIKey, APIKeyPermission } from '@/types/api';

// ============================================
// Test Helpers
// ============================================

function createMockAPIKey(overrides: Partial<APIKey> = {}): APIKey {
  return {
    id: 'key_123',
    organizationId: 'org_456',
    name: 'Test Key',
    keyPrefix: 'np_live_abcd1234',
    keyHash: 'abc123hash',
    permissions: ['forms:read', 'submissions:read'] as APIKeyPermission[],
    status: 'active',
    environment: 'live',
    usageCount: 0,
    createdAt: new Date('2026-01-01'),
    createdBy: 'user_789',
    ...overrides,
  };
}

// ============================================
// hasPermission
// ============================================

describe('hasPermission', () => {
  it('should return true for a permission the key has', () => {
    const key = createMockAPIKey({ permissions: ['forms:read', 'forms:write'] });
    expect(hasPermission(key, 'forms:read')).toBe(true);
    expect(hasPermission(key, 'forms:write')).toBe(true);
  });

  it('should return false for a permission the key does not have', () => {
    const key = createMockAPIKey({ permissions: ['forms:read'] });
    expect(hasPermission(key, 'forms:write')).toBe(false);
    expect(hasPermission(key, 'admin')).toBe(false);
  });

  it('should handle empty permissions array', () => {
    const key = createMockAPIKey({ permissions: [] });
    expect(hasPermission(key, 'forms:read')).toBe(false);
  });

  it('should handle admin permission', () => {
    const key = createMockAPIKey({ permissions: ['admin'] });
    expect(hasPermission(key, 'admin')).toBe(true);
    expect(hasPermission(key, 'forms:read')).toBe(false);
  });
});

// ============================================
// canAccessForm
// ============================================

describe('canAccessForm', () => {
  it('should allow all forms when no scope restriction', () => {
    const key = createMockAPIKey();
    expect(canAccessForm(key, 'any_form_id')).toBe(true);
  });

  it('should allow all forms when formIds is empty', () => {
    const key = createMockAPIKey({ scopes: { formIds: [] } });
    expect(canAccessForm(key, 'any_form_id')).toBe(true);
  });

  it('should allow access to a whitelisted form', () => {
    const key = createMockAPIKey({ scopes: { formIds: ['form_1', 'form_2'] } });
    expect(canAccessForm(key, 'form_1')).toBe(true);
    expect(canAccessForm(key, 'form_2')).toBe(true);
  });

  it('should deny access to a non-whitelisted form', () => {
    const key = createMockAPIKey({ scopes: { formIds: ['form_1'] } });
    expect(canAccessForm(key, 'form_999')).toBe(false);
  });

  it('should allow when scopes exists but formIds is undefined', () => {
    const key = createMockAPIKey({ scopes: {} });
    expect(canAccessForm(key, 'any_form')).toBe(true);
  });
});

// ============================================
// isIPAllowed
// ============================================

describe('isIPAllowed', () => {
  it('should allow all IPs when no restriction', () => {
    const key = createMockAPIKey();
    expect(isIPAllowed(key, '192.168.1.1')).toBe(true);
  });

  it('should allow all IPs when allowedIPs is empty', () => {
    const key = createMockAPIKey({ scopes: { allowedIPs: [] } });
    expect(isIPAllowed(key, '192.168.1.1')).toBe(true);
  });

  it('should allow whitelisted IPs', () => {
    const key = createMockAPIKey({ scopes: { allowedIPs: ['10.0.0.1', '10.0.0.2'] } });
    expect(isIPAllowed(key, '10.0.0.1')).toBe(true);
    expect(isIPAllowed(key, '10.0.0.2')).toBe(true);
  });

  it('should deny non-whitelisted IPs', () => {
    const key = createMockAPIKey({ scopes: { allowedIPs: ['10.0.0.1'] } });
    expect(isIPAllowed(key, '192.168.1.1')).toBe(false);
  });
});

// ============================================
// checkRateLimit
// ============================================

describe('checkRateLimit', () => {
  it('should allow requests within the hourly limit', () => {
    const key = createMockAPIKey({
      id: 'rate_test_1',
      rateLimit: { requestsPerHour: 100, requestsPerDay: 1000 },
    });
    const result = checkRateLimit(key, 'hour');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(99);
  });

  it('should allow requests within the daily limit', () => {
    const key = createMockAPIKey({
      id: 'rate_test_2',
      rateLimit: { requestsPerHour: 100, requestsPerDay: 1000 },
    });
    const result = checkRateLimit(key, 'day');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(999);
  });

  it('should deny requests when hourly limit exceeded', () => {
    const key = createMockAPIKey({
      id: 'rate_test_3',
      rateLimit: { requestsPerHour: 2, requestsPerDay: 1000 },
    });
    checkRateLimit(key, 'hour'); // 1
    checkRateLimit(key, 'hour'); // 2
    const result = checkRateLimit(key, 'hour'); // 3 -> denied
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('should use default limits when not specified', () => {
    const key = createMockAPIKey({ id: 'rate_test_4' });
    const result = checkRateLimit(key, 'hour');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(999); // default 1000
  });

  it('should track hourly and daily limits independently', () => {
    const key = createMockAPIKey({
      id: 'rate_test_5',
      rateLimit: { requestsPerHour: 5, requestsPerDay: 3 },
    });
    checkRateLimit(key, 'day'); // 1
    checkRateLimit(key, 'day'); // 2
    checkRateLimit(key, 'day'); // 3
    const dayResult = checkRateLimit(key, 'day'); // denied
    expect(dayResult.allowed).toBe(false);

    // Hourly should still be fine
    const hourResult = checkRateLimit(key, 'hour');
    expect(hourResult.allowed).toBe(true);
  });
});

// ============================================
// getRateLimitStatus
// ============================================

describe('getRateLimitStatus', () => {
  it('should return full limit when no requests made', () => {
    const key = createMockAPIKey({
      id: 'status_test_1',
      rateLimit: { requestsPerHour: 500, requestsPerDay: 5000 },
    });
    const status = getRateLimitStatus(key, 'hour');
    expect(status.limit).toBe(500);
    expect(status.remaining).toBe(500);
  });

  it('should reflect consumed requests', () => {
    const key = createMockAPIKey({
      id: 'status_test_2',
      rateLimit: { requestsPerHour: 100, requestsPerDay: 1000 },
    });
    checkRateLimit(key, 'hour');
    checkRateLimit(key, 'hour');
    const status = getRateLimitStatus(key, 'hour');
    expect(status.limit).toBe(100);
    expect(status.remaining).toBe(98);
  });
});

// ============================================
// formatAPIKeyToListItem
// ============================================

describe('formatAPIKeyToListItem', () => {
  it('should format a basic API key to list item', () => {
    const key = createMockAPIKey({
      id: 'key_fmt_1',
      name: 'Production Key',
      description: 'Main API key',
      keyPrefix: 'np_live_abcd',
      permissions: ['forms:read'],
      environment: 'live',
      status: 'active',
      usageCount: 42,
      createdAt: new Date('2026-01-15T10:00:00Z'),
    });

    const item = formatAPIKeyToListItem(key);
    expect(item.id).toBe('key_fmt_1');
    expect(item.name).toBe('Production Key');
    expect(item.description).toBe('Main API key');
    expect(item.keyPrefix).toBe('np_live_abcd');
    expect(item.permissions).toEqual(['forms:read']);
    expect(item.environment).toBe('live');
    expect(item.status).toBe('active');
    expect(item.usageCount).toBe(42);
    expect(item.createdAt).toBe('2026-01-15T10:00:00.000Z');
  });

  it('should handle undefined dates', () => {
    const key = createMockAPIKey({
      lastUsedAt: undefined,
      expiresAt: undefined,
    });
    const item = formatAPIKeyToListItem(key);
    expect(item.lastUsedAt).toBeUndefined();
    expect(item.expiresAt).toBeUndefined();
  });

  it('should handle string dates', () => {
    const key = createMockAPIKey({
      createdAt: '2026-03-01T00:00:00.000Z' as unknown as Date,
    });
    const item = formatAPIKeyToListItem(key);
    expect(item.createdAt).toBe('2026-03-01T00:00:00.000Z');
  });

  it('should default usageCount to 0', () => {
    const key = createMockAPIKey({ usageCount: 0 });
    const item = formatAPIKeyToListItem(key);
    expect(item.usageCount).toBe(0);
  });
});
