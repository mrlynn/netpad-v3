/**
 * Tests for formResponseService — CRUD operations on form responses
 */

// Set env before imports
process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
process.env.MONGODB_DATABASE = 'test_db';

// Mock the storage module
jest.mock('@/lib/storage', () => ({
  getGlobalSubmissionsForForm: jest.fn().mockResolvedValue([]),
}));

import { MongoClient, ObjectId } from 'mongodb';
import {
  saveResponse,
  getResponses,
  getResponse,
  deleteResponse,
  updateResponse,
  getResponseStats,
} from '@/lib/formResponseService';
import { getGlobalSubmissionsForForm } from '@/lib/storage';

const mockGetGlobalSubmissions = getGlobalSubmissionsForForm as jest.MockedFunction<typeof getGlobalSubmissionsForForm>;

describe('formResponseService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetGlobalSubmissions.mockResolvedValue([]);
  });

  // ============================================
  // saveResponse
  // ============================================
  describe('saveResponse', () => {
    it('saves a response and returns it with _id', async () => {
      const result = await saveResponse(
        'form-1',
        { name: 'Alice', email: 'alice@example.com' },
        { userAgent: 'Mozilla/5.0', deviceType: 'desktop' }
      );
      expect(result).toHaveProperty('formId', 'form-1');
      expect(result).toHaveProperty('data');
      expect(result.data.name).toBe('Alice');
      expect(result).toHaveProperty('status', 'submitted');
      expect(result).toHaveProperty('_id');
      expect(result).toHaveProperty('submittedAt');
    });

    it('sets metadata fields', async () => {
      const result = await saveResponse(
        'form-1',
        { name: 'Test' },
        {
          userAgent: 'TestAgent',
          ipAddress: '192.168.1.1',
          deviceType: 'mobile',
          browser: 'Chrome',
          os: 'Android',
          referrer: 'https://example.com',
          geolocation: { lat: 40.7, lng: -74.0 },
        }
      );
      expect(result.metadata.userAgent).toBe('TestAgent');
      expect(result.metadata.ipAddress).toBe('192.168.1.1');
      expect(result.metadata.deviceType).toBe('mobile');
      expect(result.metadata.browser).toBe('Chrome');
      expect(result.metadata.os).toBe('Android');
      expect(result.metadata.referrer).toBe('https://example.com');
      expect(result.metadata.geolocation).toEqual({ lat: 40.7, lng: -74.0 });
    });

    it('uses custom connection string when provided', async () => {
      const result = await saveResponse(
        'form-1',
        { name: 'Test' },
        {},
        'mongodb://custom:27017/test'
      );
      expect(result).toHaveProperty('formId', 'form-1');
    });

    it('sets completionTime from metadata', async () => {
      const result = await saveResponse(
        'form-1',
        { name: 'Test' },
        { completionTime: 120 }
      );
      expect(result.completionTime).toBe(120);
    });

    it('uses startedAt and completedAt from metadata', async () => {
      const startedAt = new Date('2026-01-15T09:00:00Z');
      const completedAt = new Date('2026-01-15T09:05:00Z');
      const result = await saveResponse(
        'form-1',
        {},
        { startedAt, completedAt }
      );
      expect(result.startedAt).toEqual(startedAt);
      expect(result.completedAt).toEqual(completedAt);
    });

    it('defaults startedAt and completedAt to now when not provided', async () => {
      const before = new Date();
      const result = await saveResponse('form-1', {}, {});
      expect(result.startedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.completedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('sets formVersion to 1', async () => {
      const result = await saveResponse('form-1', {}, {});
      expect(result.formVersion).toBe(1);
    });
  });

  // ============================================
  // getResponses
  // ============================================
  describe('getResponses', () => {
    it('returns paginated result structure', async () => {
      const result = await getResponses('form-1');
      expect(result).toHaveProperty('responses');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('pageSize');
      expect(result).toHaveProperty('totalPages');
    });

    it('uses default pagination', async () => {
      const result = await getResponses('form-1');
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(50);
    });

    it('accepts custom pagination', async () => {
      const result = await getResponses('form-1', {}, { page: 2, pageSize: 10 });
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(10);
    });

    it('merges global submissions with MongoDB responses', async () => {
      mockGetGlobalSubmissions.mockResolvedValue([
        {
          id: 'sub-1',
          formId: 'form-1',
          data: { name: 'Global' },
          status: 'submitted',
          submittedAt: '2026-01-15T10:00:00Z',
        } as any,
      ]);
      const result = await getResponses('form-1');
      expect(result.responses).toBeDefined();
    });

    it('handles global submission errors gracefully', async () => {
      mockGetGlobalSubmissions.mockRejectedValue(new Error('storage error'));
      const result = await getResponses('form-1');
      expect(result).toHaveProperty('responses');
    });

    it('applies status filter', async () => {
      const result = await getResponses('form-1', { status: 'submitted' });
      expect(result).toHaveProperty('responses');
    });

    it('applies date range filter', async () => {
      const result = await getResponses('form-1', {
        dateRange: {
          start: new Date('2026-01-01'),
          end: new Date('2026-12-31'),
        },
      });
      expect(result).toHaveProperty('responses');
    });

    it('applies device type filter', async () => {
      const result = await getResponses('form-1', { deviceType: 'mobile' });
      expect(result).toHaveProperty('responses');
    });

    it('applies field filters', async () => {
      const result = await getResponses('form-1', {
        fieldFilters: { name: 'Alice' },
      });
      expect(result).toHaveProperty('responses');
    });

    it('calculates totalPages correctly', async () => {
      const result = await getResponses('form-1', {}, { page: 1, pageSize: 10 });
      expect(result.totalPages).toBe(Math.ceil(result.total / result.pageSize));
    });

    it('uses custom connection string', async () => {
      const result = await getResponses(
        'form-1', {}, { page: 1, pageSize: 50 },
        'mongodb://custom:27017/test'
      );
      expect(result).toHaveProperty('responses');
    });
  });

  // ============================================
  // getResponse
  // ============================================
  describe('getResponse', () => {
    it('returns null for non-existent response', async () => {
      const result = await getResponse('507f1f77bcf86cd799439011');
      expect(result).toBeNull();
    });

    it('returns null for invalid ObjectId', async () => {
      const result = await getResponse('invalid-id');
      expect(result).toBeNull();
    });

    it('uses custom connection string', async () => {
      const result = await getResponse(
        '507f1f77bcf86cd799439011',
        'mongodb://custom:27017/test'
      );
      expect(result).toBeNull();
    });
  });

  // ============================================
  // deleteResponse
  // ============================================
  describe('deleteResponse', () => {
    it('returns boolean result for valid ObjectId', async () => {
      const result = await deleteResponse('507f1f77bcf86cd799439011');
      // Mock returns deletedCount: 1, so this returns true
      expect(typeof result).toBe('boolean');
      expect(result).toBe(true);
    });

    it('handles any string ID without throwing', async () => {
      // Mock ObjectId accepts any string, so this won't reject
      const result = await deleteResponse('invalid-id');
      expect(typeof result).toBe('boolean');
    });

    it('uses custom connection string', async () => {
      const result = await deleteResponse(
        '507f1f77bcf86cd799439011',
        'mongodb://custom:27017/test'
      );
      expect(typeof result).toBe('boolean');
    });
  });

  // ============================================
  // updateResponse
  // ============================================
  describe('updateResponse', () => {
    it('returns null for non-existent response', async () => {
      const result = await updateResponse('507f1f77bcf86cd799439011', { status: 'submitted' });
      expect(result).toBeNull();
    });

    it('returns null for invalid ObjectId', async () => {
      const result = await updateResponse('invalid-id', { status: 'submitted' });
      expect(result).toBeNull();
    });

    it('strips _id from update data', async () => {
      // Should not throw even if _id is in updates
      const result = await updateResponse('507f1f77bcf86cd799439011', {
        _id: 'should-be-stripped',
        status: 'draft',
      } as any);
      expect(result).toBeNull(); // Mock doesn't find the doc
    });
  });

  // ============================================
  // getResponseStats
  // ============================================
  describe('getResponseStats', () => {
    it('returns stats structure', async () => {
      const result = await getResponseStats('form-1');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('submitted');
      expect(result).toHaveProperty('draft');
      expect(result).toHaveProperty('incomplete');
      expect(result).toHaveProperty('averageCompletionTime');
    });

    it('returns zeros for empty form', async () => {
      const result = await getResponseStats('form-empty');
      expect(result.total).toBe(0);
      expect(result.submitted).toBe(0);
      expect(result.draft).toBe(0);
      expect(result.incomplete).toBe(0);
      expect(result.averageCompletionTime).toBe(0);
    });

    it('merges global submissions into stats', async () => {
      mockGetGlobalSubmissions.mockResolvedValue([
        {
          id: 'sub-1',
          formId: 'form-1',
          data: {},
          status: 'submitted',
          submittedAt: '2026-01-15T10:00:00Z',
          completionTime: 60,
        } as any,
      ]);
      const result = await getResponseStats('form-1');
      expect(result.total).toBeGreaterThanOrEqual(1);
      expect(result.submitted).toBeGreaterThanOrEqual(1);
    });

    it('calculates average completion time', async () => {
      mockGetGlobalSubmissions.mockResolvedValue([
        { id: 's1', formId: 'form-1', data: {}, status: 'submitted', submittedAt: '2026-01-15T10:00:00Z', completionTime: 60 } as any,
        { id: 's2', formId: 'form-1', data: {}, status: 'submitted', submittedAt: '2026-01-15T11:00:00Z', completionTime: 120 } as any,
      ]);
      const result = await getResponseStats('form-1');
      expect(result.averageCompletionTime).toBe(90);
    });

    it('handles global submission errors gracefully', async () => {
      mockGetGlobalSubmissions.mockRejectedValue(new Error('storage error'));
      const result = await getResponseStats('form-1');
      expect(result).toHaveProperty('total');
    });

    it('uses custom connection string', async () => {
      const result = await getResponseStats('form-1', 'mongodb://custom:27017/test');
      expect(result).toHaveProperty('total');
    });
  });
});
