/**
 * Rate Limiting Service Tests
 *
 * Tests for the sliding window rate limiting system including
 * core functionality, key generators, and convenience functions.
 */

import {
  checkRateLimit,
  peekRateLimit,
  resetRateLimit,
  getIpKey,
  getUserKey,
  getEmailKey,
  getFormIpKey,
  getFormUserKey,
  checkPublicSubmissionLimit,
  checkAuthSubmissionLimit,
  checkApiLimit,
  checkMagicLinkLimit,
  getRateLimitHeaders,
  createRateLimitError,
  RateLimitResult,
} from '@/lib/platform/rateLimit';
import {
  RateLimitEntry,
  RateLimitResource,
  RateLimitConfig,
} from '@/types/platform';

// Mock dependencies
jest.mock('@/lib/platform/db', () => {
  const mockRateLimitEntry: RateLimitEntry = {
    key: 'test:key',
    resource: 'api' as RateLimitResource,
    count: 5,
    windowStart: new Date('2024-01-15T12:00:00Z'),
    expiresAt: new Date('2024-01-15T12:05:00Z'),
  };

  const mockCollection = {
    findOneAndUpdate: jest.fn(),
    findOne: jest.fn(),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 1 }),
  };

  return {
    getRateLimitsCollection: jest.fn().mockResolvedValue(mockCollection),
    __mockCollection: mockCollection,
    __mockRateLimitEntry: mockRateLimitEntry,
  };
});

// Mock constants
jest.mock('@/types/platform', () => ({
  ...jest.requireActual('@/types/platform'),
  DEFAULT_RATE_LIMITS: {
    api: { limit: 100, windowSeconds: 300 }, // 100 requests per 5 minutes
    form_submit_public: { limit: 10, windowSeconds: 3600 }, // 10 submissions per hour
    form_submit_auth: { limit: 50, windowSeconds: 3600 }, // 50 submissions per hour
    magic_link: { limit: 3, windowSeconds: 300 }, // 3 magic links per 5 minutes
  },
}));

describe('Rate Limiting Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock current date for consistent testing
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2024-01-15T12:02:30Z').getTime());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Core Rate Limiting', () => {
    describe('checkRateLimit', () => {
      it('should allow request when limit not exceeded', async () => {
        const db = require('@/lib/platform/db');
        const mockEntry = {
          ...db.__mockRateLimitEntry,
          count: 5,
          windowStart: new Date('2024-01-15T12:00:00Z'),
        };
        
        db.__mockCollection.findOneAndUpdate.mockResolvedValueOnce(mockEntry);

        const result = await checkRateLimit('test:key', 'api');

        expect(result).toMatchObject({
          allowed: true,
          current: 5,
          limit: 100,
          remaining: 95,
        });
        expect(result.resetAt).toBeInstanceOf(Date);
      });

      it('should deny request when limit exceeded', async () => {
        const db = require('@/lib/platform/db');
        const mockEntry = {
          ...db.__mockRateLimitEntry,
          count: 101,
          windowStart: new Date('2024-01-15T12:00:00Z'),
        };
        
        db.__mockCollection.findOneAndUpdate.mockResolvedValueOnce(mockEntry);

        const result = await checkRateLimit('test:key', 'api');

        expect(result).toMatchObject({
          allowed: false,
          current: 101,
          limit: 100,
          remaining: 0,
        });
        expect(result.retryAfter).toBeGreaterThan(0);
      });

      it('should create new entry when none exists', async () => {
        const db = require('@/lib/platform/db');
        const newEntry = {
          key: 'new:key',
          resource: 'api',
          count: 1,
          windowStart: new Date('2024-01-15T12:02:30Z'),
          expiresAt: new Date('2024-01-15T12:07:30Z'),
        };

        // First call returns null (no existing entry)
        db.__mockCollection.findOneAndUpdate.mockResolvedValueOnce(null);
        // Second call (upsert) returns new entry
        db.__mockCollection.findOneAndUpdate.mockResolvedValueOnce(newEntry);

        const result = await checkRateLimit('new:key', 'api');

        expect(result).toMatchObject({
          allowed: true,
          current: 1,
          limit: 100,
          remaining: 99,
        });

        // Verify upsert was called
        expect(db.__mockCollection.findOneAndUpdate).toHaveBeenCalledTimes(2);
        const upsertCall = db.__mockCollection.findOneAndUpdate.mock.calls[1];
        expect(upsertCall[2]).toMatchObject({ upsert: true });
      });

      it('should handle race condition with duplicate key error', async () => {
        const db = require('@/lib/platform/db');
        const retryEntry = {
          ...db.__mockRateLimitEntry,
          count: 2,
        };

        // First call returns null
        db.__mockCollection.findOneAndUpdate.mockResolvedValueOnce(null);
        
        // Second call (upsert) throws duplicate key error
        const duplicateError = new Error('E11000 duplicate key error collection');
        db.__mockCollection.findOneAndUpdate.mockRejectedValueOnce(duplicateError);
        
        // Third call (retry) succeeds
        db.__mockCollection.findOneAndUpdate.mockResolvedValueOnce(retryEntry);

        const result = await checkRateLimit('race:key', 'api');

        expect(result).toMatchObject({
          allowed: true,
          current: 2,
          limit: 100,
          remaining: 98,
        });

        expect(db.__mockCollection.findOneAndUpdate).toHaveBeenCalledTimes(3);
      });

      it('should use custom config when provided', async () => {
        const db = require('@/lib/platform/db');
        const mockEntry = { ...db.__mockRateLimitEntry, count: 8 };
        
        db.__mockCollection.findOneAndUpdate.mockResolvedValueOnce(mockEntry);

        const customConfig: RateLimitConfig = { limit: 10, windowSeconds: 60 };
        const result = await checkRateLimit('test:key', 'api', customConfig);

        expect(result.limit).toBe(10);
        expect(result.remaining).toBe(2);
      });

      it('should handle window expiration correctly', async () => {
        const db = require('@/lib/platform/db');
        
        // Simulate old entry outside current window
        db.__mockCollection.findOneAndUpdate.mockResolvedValueOnce(null);
        
        // Creating new entry should succeed
        const newEntry = {
          key: 'expired:key',
          resource: 'api',
          count: 1,
          windowStart: new Date('2024-01-15T12:02:30Z'),
        };
        db.__mockCollection.findOneAndUpdate.mockResolvedValueOnce(newEntry);

        const result = await checkRateLimit('expired:key', 'api');

        expect(result.allowed).toBe(true);
        expect(result.current).toBe(1);
      });

      it('should re-throw non-duplicate-key errors', async () => {
        const db = require('@/lib/platform/db');
        
        db.__mockCollection.findOneAndUpdate.mockResolvedValueOnce(null);
        db.__mockCollection.findOneAndUpdate.mockRejectedValueOnce(
          new Error('Some other database error')
        );

        await expect(checkRateLimit('error:key', 'api')).rejects.toThrow(
          'Some other database error'
        );
      });
    });

    describe('peekRateLimit', () => {
      it('should check limit without incrementing', async () => {
        const db = require('@/lib/platform/db');
        const mockEntry = {
          ...db.__mockRateLimitEntry,
          count: 25,
          windowStart: new Date('2024-01-15T12:00:00Z'),
        };
        
        db.__mockCollection.findOne.mockResolvedValueOnce(mockEntry);

        const result = await peekRateLimit('test:key', 'api');

        expect(result).toMatchObject({
          allowed: true,
          current: 25,
          limit: 100,
          remaining: 75,
        });

        // Verify no increment operation was called
        expect(db.__mockCollection.findOneAndUpdate).not.toHaveBeenCalled();
      });

      it('should return default values when no entry exists', async () => {
        const db = require('@/lib/platform/db');
        db.__mockCollection.findOne.mockResolvedValueOnce(null);

        const result = await peekRateLimit('new:key', 'api');

        expect(result).toMatchObject({
          allowed: true,
          current: 0,
          limit: 100,
          remaining: 100,
        });
      });

      it('should indicate blocked when limit exceeded', async () => {
        const db = require('@/lib/platform/db');
        const mockEntry = {
          ...db.__mockRateLimitEntry,
          count: 105,
          windowStart: new Date(),
        };
        
        db.__mockCollection.findOne.mockResolvedValueOnce(mockEntry);

        const result = await peekRateLimit('blocked:key', 'api');

        expect(result).toMatchObject({
          allowed: false,
          current: 105,
          limit: 100,
          remaining: 0,
        });
        expect(result.retryAfter).toBeGreaterThan(0);
      });
    });

    describe('resetRateLimit', () => {
      it('should delete rate limit entries for key', async () => {
        const db = require('@/lib/platform/db');

        await resetRateLimit('test:key', 'api');

        expect(db.__mockCollection.deleteMany).toHaveBeenCalledWith({
          key: 'test:key',
          resource: 'api',
        });
      });
    });
  });

  describe('Key Generators', () => {
    describe('getIpKey', () => {
      it('should generate IP-based key', () => {
        const key = getIpKey('192.168.1.1');
        expect(key).toBe('ip:192.168.1.1');
      });

      it('should normalize IPv6 mapped IPv4', () => {
        const key = getIpKey('::ffff:192.168.1.1');
        expect(key).toBe('ip:192.168.1.1');
      });

      it('should handle pure IPv6 addresses', () => {
        const key = getIpKey('2001:db8::1');
        expect(key).toBe('ip:2001:db8::1');
      });
    });

    describe('getUserKey', () => {
      it('should generate user-based key', () => {
        const key = getUserKey('user123');
        expect(key).toBe('user:user123');
      });
    });

    describe('getEmailKey', () => {
      it('should generate email-based key with lowercase normalization', () => {
        const key = getEmailKey('Test@Example.Com');
        expect(key).toBe('email:test@example.com');
      });
    });

    describe('getFormIpKey', () => {
      it('should generate form+IP composite key', () => {
        const key = getFormIpKey('form123', '192.168.1.1');
        expect(key).toBe('form:form123:ip:192.168.1.1');
      });

      it('should normalize IPv6 mapped IPv4 in form keys', () => {
        const key = getFormIpKey('form123', '::ffff:192.168.1.1');
        expect(key).toBe('form:form123:ip:192.168.1.1');
      });
    });

    describe('getFormUserKey', () => {
      it('should generate form+user composite key', () => {
        const key = getFormUserKey('form123', 'user456');
        expect(key).toBe('form:form123:user:user456');
      });
    });
  });

  describe('Convenience Functions', () => {
    describe('checkPublicSubmissionLimit', () => {
      it('should check public form submission limit', async () => {
        const db = require('@/lib/platform/db');
        const mockEntry = { ...db.__mockRateLimitEntry, count: 3 };
        db.__mockCollection.findOneAndUpdate.mockResolvedValueOnce(mockEntry);

        const result = await checkPublicSubmissionLimit('form123', '192.168.1.1');

        expect(result).toMatchObject({
          allowed: true,
          current: 3,
          limit: 10, // form_submit_public limit
        });

        // Verify correct key was used
        const call = db.__mockCollection.findOneAndUpdate.mock.calls[0][0];
        expect(call.key).toBe('form:form123:ip:192.168.1.1');
        expect(call.resource).toBe('form_submit_public');
      });

      it('should handle public submission limit exceeded', async () => {
        const db = require('@/lib/platform/db');
        const mockEntry = { ...db.__mockRateLimitEntry, count: 11 };
        db.__mockCollection.findOneAndUpdate.mockResolvedValueOnce(mockEntry);

        const result = await checkPublicSubmissionLimit('form123', '192.168.1.1');

        expect(result.allowed).toBe(false);
        expect(result.current).toBe(11);
        expect(result.limit).toBe(10);
      });
    });

    describe('checkAuthSubmissionLimit', () => {
      it('should check authenticated form submission limit', async () => {
        const db = require('@/lib/platform/db');
        const mockEntry = { ...db.__mockRateLimitEntry, count: 20 };
        db.__mockCollection.findOneAndUpdate.mockResolvedValueOnce(mockEntry);

        const result = await checkAuthSubmissionLimit('form123', 'user456');

        expect(result).toMatchObject({
          allowed: true,
          current: 20,
          limit: 50, // form_submit_auth limit
          remaining: 30,
        });

        // Verify correct key was used
        const call = db.__mockCollection.findOneAndUpdate.mock.calls[0][0];
        expect(call.key).toBe('form:form123:user:user456');
        expect(call.resource).toBe('form_submit_auth');
      });

      it('should handle auth submission limit exceeded', async () => {
        const db = require('@/lib/platform/db');
        const mockEntry = { ...db.__mockRateLimitEntry, count: 51 };
        db.__mockCollection.findOneAndUpdate.mockResolvedValueOnce(mockEntry);

        const result = await checkAuthSubmissionLimit('form123', 'user456');

        expect(result.allowed).toBe(false);
        expect(result.current).toBe(51);
        expect(result.limit).toBe(50);
      });
    });

    describe('checkApiLimit', () => {
      it('should check API rate limit for user', async () => {
        const db = require('@/lib/platform/db');
        const mockEntry = { ...db.__mockRateLimitEntry, count: 75 };
        db.__mockCollection.findOneAndUpdate.mockResolvedValueOnce(mockEntry);

        const result = await checkApiLimit('user789');

        expect(result).toMatchObject({
          allowed: true,
          current: 75,
          limit: 100,
          remaining: 25,
        });

        // Verify correct key was used
        const call = db.__mockCollection.findOneAndUpdate.mock.calls[0][0];
        expect(call.key).toBe('user:user789');
        expect(call.resource).toBe('api');
      });

      it('should handle API limit exceeded', async () => {
        const db = require('@/lib/platform/db');
        const mockEntry = { ...db.__mockRateLimitEntry, count: 101 };
        db.__mockCollection.findOneAndUpdate.mockResolvedValueOnce(mockEntry);

        const result = await checkApiLimit('user789');

        expect(result.allowed).toBe(false);
        expect(result.remaining).toBe(0);
      });
    });

    describe('checkMagicLinkLimit', () => {
      it('should check magic link rate limit for email', async () => {
        const db = require('@/lib/platform/db');
        const mockEntry = { ...db.__mockRateLimitEntry, count: 2 };
        db.__mockCollection.findOneAndUpdate.mockResolvedValueOnce(mockEntry);

        const result = await checkMagicLinkLimit('Test@Example.Com');

        expect(result).toMatchObject({
          allowed: true,
          current: 2,
          limit: 3,
          remaining: 1,
        });

        // Verify correct key was used (should be lowercase)
        const call = db.__mockCollection.findOneAndUpdate.mock.calls[0][0];
        expect(call.key).toBe('email:test@example.com');
        expect(call.resource).toBe('magic_link');
      });

      it('should handle magic link limit exceeded', async () => {
        const db = require('@/lib/platform/db');
        const mockEntry = { ...db.__mockRateLimitEntry, count: 4 };
        db.__mockCollection.findOneAndUpdate.mockResolvedValueOnce(mockEntry);

        const result = await checkMagicLinkLimit('spam@example.com');

        expect(result.allowed).toBe(false);
        expect(result.current).toBe(4);
        expect(result.limit).toBe(3);
      });
    });
  });

  describe('Response Utilities', () => {
    describe('getRateLimitHeaders', () => {
      it('should generate standard rate limit headers', () => {
        const result: RateLimitResult = {
          allowed: true,
          current: 25,
          limit: 100,
          remaining: 75,
          resetAt: new Date('2024-01-15T12:05:00Z'),
        };

        const headers = getRateLimitHeaders(result);

        expect(headers).toEqual({
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '75',
          'X-RateLimit-Reset': '1705320300', // Unix timestamp for reset time
        });
      });

      it('should include Retry-After header when blocked', () => {
        const result: RateLimitResult = {
          allowed: false,
          current: 105,
          limit: 100,
          remaining: 0,
          resetAt: new Date('2024-01-15T12:05:00Z'),
          retryAfter: 150,
        };

        const headers = getRateLimitHeaders(result);

        expect(headers).toEqual({
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': '1705320300',
          'Retry-After': '150',
        });
      });

      it('should handle zero remaining correctly', () => {
        const result: RateLimitResult = {
          allowed: false,
          current: 100,
          limit: 100,
          remaining: 0,
          resetAt: new Date('2024-01-15T12:05:00Z'),
        };

        const headers = getRateLimitHeaders(result);

        expect(headers['X-RateLimit-Remaining']).toBe('0');
      });
    });

    describe('createRateLimitError', () => {
      it('should create proper 429 error response', () => {
        const result: RateLimitResult = {
          allowed: false,
          current: 105,
          limit: 100,
          remaining: 0,
          resetAt: new Date('2024-01-15T12:05:00Z'),
          retryAfter: 150,
        };

        const errorResponse = createRateLimitError(result);

        expect(errorResponse).toEqual({
          status: 429,
          body: {
            error: 'Too many requests. Please try again later.',
            retryAfter: 150,
          },
          headers: {
            'X-RateLimit-Limit': '100',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': '1705320300',
            'Retry-After': '150',
          },
        });
      });

      it('should use default retry after when not provided', () => {
        const result: RateLimitResult = {
          allowed: false,
          current: 105,
          limit: 100,
          remaining: 0,
          resetAt: new Date('2024-01-15T12:05:00Z'),
        };

        const errorResponse = createRateLimitError(result);

        expect(errorResponse.body.retryAfter).toBe(60);
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle database connection errors', async () => {
      const db = require('@/lib/platform/db');
      db.getRateLimitsCollection.mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(checkRateLimit('test:key', 'api')).rejects.toThrow(
        'Database connection failed'
      );
    });

    it('should handle malformed entries by throwing', async () => {
      const db = require('@/lib/platform/db');
      const malformedEntry = {
        key: 'test:key',
        resource: 'api',
        count: 'invalid', // Should be number
        windowStart: 'invalid', // Should be Date — getTime() will fail
      };
      
      db.__mockCollection.findOneAndUpdate.mockResolvedValueOnce(malformedEntry);

      // Code expects Date objects, so malformed data causes a TypeError
      await expect(checkRateLimit('test:key', 'api')).rejects.toThrow(TypeError);
    });

    it('should handle very large counts correctly', async () => {
      const db = require('@/lib/platform/db');
      const largeCountEntry = {
        ...db.__mockRateLimitEntry,
        count: Number.MAX_SAFE_INTEGER,
        windowStart: new Date('2024-01-15T12:00:00Z'),
      };
      
      db.__mockCollection.findOneAndUpdate.mockResolvedValueOnce(largeCountEntry);

      const result = await checkRateLimit('large:key', 'api');

      expect(result.allowed).toBe(false);
      expect(result.current).toBe(Number.MAX_SAFE_INTEGER);
      expect(result.remaining).toBe(0);
    });

    it('should handle concurrent access gracefully', async () => {
      const db = require('@/lib/platform/db');
      
      // Simulate concurrent updates succeeding
      const concurrentEntry = { ...db.__mockRateLimitEntry, count: 50 };
      db.__mockCollection.findOneAndUpdate.mockResolvedValue(concurrentEntry);

      const promises = Array(10).fill(null).map(() => 
        checkRateLimit('concurrent:key', 'api')
      );

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result).toBeDefined();
        expect(typeof result.allowed).toBe('boolean');
      });
    });

    it('should validate reset time is in the future', async () => {
      const db = require('@/lib/platform/db');
      const pastEntry = {
        ...db.__mockRateLimitEntry,
        count: 5,
        windowStart: new Date(), // current window
      };
      
      db.__mockCollection.findOneAndUpdate.mockResolvedValueOnce(pastEntry);

      const result = await checkRateLimit('past:key', 'api');

      expect(result.resetAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should handle resource type edge cases', async () => {
      const db = require('@/lib/platform/db');
      const mockEntry = { ...db.__mockRateLimitEntry, count: 1 };
      db.__mockCollection.findOneAndUpdate.mockResolvedValueOnce(mockEntry);

      // Test with different resource types
      await checkRateLimit('test:key', 'magic_link');
      
      const call = db.__mockCollection.findOneAndUpdate.mock.calls[0][0];
      expect(call.resource).toBe('magic_link');
    });

    it('should handle empty or undefined keys gracefully', async () => {
      const db = require('@/lib/platform/db');
      
      // Should not crash with empty keys
      await expect(checkRateLimit('', 'api')).resolves.toBeDefined();
    });
  });
});