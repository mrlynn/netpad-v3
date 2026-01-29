/**
 * Tests for RAG Configuration Management
 *
 * Verifies organization-level RAG storage configuration
 */

// Mock MongoDB before any imports
jest.mock('mongodb', () => ({
  ObjectId: jest.fn((id) => id || 'mock-id'),
  MongoClient: jest.fn(),
}));

// Mock the platform db module
const mockFindOne = jest.fn();
const mockUpdateOne = jest.fn();
const mockCollection = jest.fn(() => ({
  findOne: mockFindOne,
  updateOne: mockUpdateOne,
}));

jest.mock('@/lib/platform/db', () => ({
  getPlatformDb: jest.fn(() =>
    Promise.resolve({
      collection: mockCollection,
    })
  ),
}));

// Mock rag-storage types
jest.mock('@/types/rag-storage', () => ({
  RAG_STORAGE_DEFAULTS: {
    free: {
      mode: 'platform',
      platform: { enabled: true },
      limits: {
        maxDocuments: 5,
        maxStorageBytes: 10 * 1024 * 1024,
        maxQueriesPerDay: 100,
      },
    },
    pro: {
      mode: 'platform',
      platform: { enabled: true },
      limits: {
        maxDocuments: 50,
        maxStorageBytes: 100 * 1024 * 1024,
        maxQueriesPerDay: 1000,
      },
    },
    team: {
      mode: 'platform',
      platform: { enabled: true },
      limits: {
        maxDocuments: 500,
        maxStorageBytes: 1024 * 1024 * 1024,
        maxQueriesPerDay: 10000,
      },
    },
    enterprise: {
      mode: 'user-cluster',
      userCluster: { enabled: true },
      limits: {
        maxDocuments: -1, // unlimited
        maxStorageBytes: -1,
        maxQueriesPerDay: -1,
      },
    },
  },
}));

import {
  getOrganizationRAGConfig,
  updateOrganizationRAGConfig,
  resetOrganizationRAGConfig,
  canUseRAG,
  getStorageMode,
  getUsageLimits,
  isUsingPlatformStorage,
  isUsingUserClusterStorage,
} from '@/lib/rag/config';

describe('RAG Configuration Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrganizationRAGConfig', () => {
    it('should return custom config when it exists', async () => {
      const customConfig = {
        mode: 'user-cluster',
        userCluster: { connectionId: 'conn_123' },
        limits: { maxDocuments: 100 },
      };

      mockFindOne.mockResolvedValue({
        orgId: 'org_123',
        ragConfig: customConfig,
        plan: 'team',
      });

      const result = await getOrganizationRAGConfig('org_123');

      expect(result).toEqual(customConfig);
      expect(mockCollection).toHaveBeenCalledWith('organizations');
      expect(mockFindOne).toHaveBeenCalledWith(
        { orgId: 'org_123' },
        { projection: { ragConfig: 1, plan: 1 } }
      );
    });

    it('should return tier-based defaults when no custom config exists', async () => {
      mockFindOne.mockResolvedValue({
        orgId: 'org_123',
        plan: 'free',
      });

      const result = await getOrganizationRAGConfig('org_123');

      expect(result.mode).toBe('platform');
      expect(result.limits).toEqual({
        maxDocuments: 5,
        maxStorageBytes: 10 * 1024 * 1024,
        maxQueriesPerDay: 100,
      });
    });

    it('should default to free tier when no plan is set', async () => {
      mockFindOne.mockResolvedValue({
        orgId: 'org_123',
        // no plan property
      });

      const result = await getOrganizationRAGConfig('org_123');

      expect(result.mode).toBe('platform');
      expect(result.limits?.maxDocuments).toBe(5);
    });

    it('should throw when organization not found', async () => {
      mockFindOne.mockResolvedValue(null);

      await expect(getOrganizationRAGConfig('org_nonexistent')).rejects.toThrow(
        'Organization not found: org_nonexistent'
      );
    });
  });

  describe('updateOrganizationRAGConfig', () => {
    it('should merge config updates with existing config', async () => {
      const existingConfig = {
        mode: 'platform',
        limits: { maxDocuments: 5 },
      };

      mockFindOne.mockResolvedValue({
        orgId: 'org_123',
        ragConfig: existingConfig,
        plan: 'free',
      });
      mockUpdateOne.mockResolvedValue({ modifiedCount: 1 });

      await updateOrganizationRAGConfig('org_123', {
        limits: { maxDocuments: 10 },
      });

      expect(mockUpdateOne).toHaveBeenCalledWith(
        { orgId: 'org_123' },
        {
          $set: {
            ragConfig: expect.objectContaining({
              mode: 'platform',
              limits: expect.objectContaining({ maxDocuments: 10 }),
            }),
          },
        }
      );
    });
  });

  describe('resetOrganizationRAGConfig', () => {
    it('should unset ragConfig from organization', async () => {
      mockUpdateOne.mockResolvedValue({ modifiedCount: 1 });

      await resetOrganizationRAGConfig('org_123');

      expect(mockUpdateOne).toHaveBeenCalledWith(
        { orgId: 'org_123' },
        { $unset: { ragConfig: '' } }
      );
    });
  });

  describe('canUseRAG', () => {
    it('should allow RAG for platform storage', async () => {
      mockFindOne
        .mockResolvedValueOnce({ orgId: 'org_123', plan: 'free' }) // getOrganizationRAGConfig
        .mockResolvedValueOnce({ orgId: 'org_123', plan: 'free' }); // getOrganizationTier

      const result = await canUseRAG('org_123');

      expect(result.allowed).toBe(true);
      expect(result.config).toBeDefined();
    });

    it('should reject user-cluster mode without connectionId', async () => {
      const configWithoutConnection = {
        mode: 'user-cluster',
        userCluster: {}, // no connectionId
        limits: {},
      };

      mockFindOne.mockResolvedValue({
        orgId: 'org_123',
        ragConfig: configWithoutConnection,
        plan: 'enterprise',
      });

      const result = await canUseRAG('org_123');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('connection ID');
    });

    it('should allow user-cluster mode with connectionId', async () => {
      const configWithConnection = {
        mode: 'user-cluster',
        userCluster: { connectionId: 'conn_123' },
        limits: { maxDocuments: -1 },
      };

      mockFindOne.mockResolvedValue({
        orgId: 'org_123',
        ragConfig: configWithConnection,
        plan: 'enterprise',
      });

      const result = await canUseRAG('org_123');

      expect(result.allowed).toBe(true);
    });

    it('should return error reason when organization not found', async () => {
      mockFindOne.mockResolvedValue(null);

      const result = await canUseRAG('org_nonexistent');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not found');
    });
  });

  describe('getStorageMode', () => {
    it('should return platform for free tier', async () => {
      mockFindOne.mockResolvedValue({
        orgId: 'org_123',
        plan: 'free',
      });

      const mode = await getStorageMode('org_123');

      expect(mode).toBe('platform');
    });

    it('should return user-cluster when configured', async () => {
      mockFindOne.mockResolvedValue({
        orgId: 'org_123',
        ragConfig: { mode: 'user-cluster' },
        plan: 'enterprise',
      });

      const mode = await getStorageMode('org_123');

      expect(mode).toBe('user-cluster');
    });
  });

  describe('getUsageLimits', () => {
    it('should return limits from config', async () => {
      mockFindOne.mockResolvedValue({
        orgId: 'org_123',
        ragConfig: {
          mode: 'platform',
          limits: {
            maxDocuments: 50,
            maxStorageBytes: 100 * 1024 * 1024,
            maxQueriesPerDay: 1000,
          },
        },
        plan: 'pro',
      });

      const limits = await getUsageLimits('org_123');

      expect(limits).toEqual({
        maxDocuments: 50,
        maxStorageBytes: 100 * 1024 * 1024,
        maxQueriesPerDay: 1000,
      });
    });
  });

  describe('isUsingPlatformStorage', () => {
    it('should return true for platform mode', async () => {
      mockFindOne.mockResolvedValue({
        orgId: 'org_123',
        plan: 'free',
      });

      const result = await isUsingPlatformStorage('org_123');

      expect(result).toBe(true);
    });

    it('should return false for user-cluster mode', async () => {
      mockFindOne.mockResolvedValue({
        orgId: 'org_123',
        ragConfig: { mode: 'user-cluster' },
        plan: 'enterprise',
      });

      const result = await isUsingPlatformStorage('org_123');

      expect(result).toBe(false);
    });
  });

  describe('isUsingUserClusterStorage', () => {
    it('should return true for user-cluster mode', async () => {
      mockFindOne.mockResolvedValue({
        orgId: 'org_123',
        ragConfig: { mode: 'user-cluster' },
        plan: 'enterprise',
      });

      const result = await isUsingUserClusterStorage('org_123');

      expect(result).toBe(true);
    });

    it('should return false for platform mode', async () => {
      mockFindOne.mockResolvedValue({
        orgId: 'org_123',
        plan: 'pro',
      });

      const result = await isUsingUserClusterStorage('org_123');

      expect(result).toBe(false);
    });
  });
});
