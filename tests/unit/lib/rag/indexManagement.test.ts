/**
 * Tests for RAG Vector Search Index Management
 *
 * Verifies MongoDB Atlas Vector Search index creation and management
 */

// Mock MongoDB before any imports
jest.mock('mongodb', () => ({
  ObjectId: jest.fn((id) => id || 'mock-id'),
  MongoClient: jest.fn(),
}));

// Mock the platform db module
const mockListSearchIndexes = jest.fn();
const mockCreateSearchIndex = jest.fn();
const mockCollection = jest.fn(() => ({
  listSearchIndexes: () => ({
    toArray: mockListSearchIndexes,
  }),
  createSearchIndex: mockCreateSearchIndex,
}));

jest.mock('@/lib/platform/db', () => ({
  getOrgDb: jest.fn(() =>
    Promise.resolve({
      collection: mockCollection,
    })
  ),
}));

// Mock embeddings to provide dimensions
jest.mock('@/lib/rag/embeddings', () => ({
  getCurrentEmbeddingDimensions: jest.fn(() => 1536),
}));

import {
  checkVectorIndexExists,
  ensureVectorSearchIndex,
  getVectorIndexStatus,
} from '@/lib/rag/indexManagement';

describe('RAG Vector Search Index Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkVectorIndexExists', () => {
    it('should return exists: true when index is found', async () => {
      mockListSearchIndexes.mockResolvedValue([
        { name: 'rag_vector_index', status: 'READY' },
        { name: 'other_index', status: 'READY' },
      ]);

      const result = await checkVectorIndexExists('org_123');

      expect(result.exists).toBe(true);
      expect(result.status).toBe('READY');
      expect(mockCollection).toHaveBeenCalledWith('rag_document_chunks');
    });

    it('should return exists: false when index is not found', async () => {
      mockListSearchIndexes.mockResolvedValue([
        { name: 'other_index', status: 'READY' },
      ]);

      const result = await checkVectorIndexExists('org_123');

      expect(result.exists).toBe(false);
      expect(result.status).toBeUndefined();
    });

    it('should return exists: false with error on exception', async () => {
      mockListSearchIndexes.mockRejectedValue(new Error('Connection failed'));

      const result = await checkVectorIndexExists('org_123');

      expect(result.exists).toBe(false);
      expect(result.error).toBe('Connection failed');
    });

    it('should handle empty index list', async () => {
      mockListSearchIndexes.mockResolvedValue([]);

      const result = await checkVectorIndexExists('org_123');

      expect(result.exists).toBe(false);
    });
  });

  describe('ensureVectorSearchIndex', () => {
    it('should not create index if it already exists', async () => {
      mockListSearchIndexes.mockResolvedValue([
        { name: 'rag_vector_index', status: 'READY' },
      ]);

      const result = await ensureVectorSearchIndex('org_123');

      expect(result.created).toBe(false);
      expect(result.exists).toBe(true);
      expect(result.status).toBe('READY');
      expect(mockCreateSearchIndex).not.toHaveBeenCalled();
    });

    it('should create index if it does not exist', async () => {
      mockListSearchIndexes.mockResolvedValue([]);
      mockCreateSearchIndex.mockResolvedValue({ name: 'rag_vector_index' });

      const result = await ensureVectorSearchIndex('org_123');

      expect(result.created).toBe(true);
      expect(result.exists).toBe(true);
      expect(result.status).toBe('BUILDING');
      expect(mockCreateSearchIndex).toHaveBeenCalledWith({
        name: 'rag_vector_index',
        type: 'vectorSearch',
        definition: {
          fields: [
            {
              type: 'vector',
              path: 'embedding',
              numDimensions: 1536,
              similarity: 'cosine',
            },
            {
              type: 'filter',
              path: 'formId',
            },
            {
              type: 'filter',
              path: 'documentId',
            },
          ],
        },
      });
    });

    it('should handle index creation errors', async () => {
      mockListSearchIndexes.mockResolvedValue([]);
      mockCreateSearchIndex.mockRejectedValue(new Error('Index creation failed'));

      const result = await ensureVectorSearchIndex('org_123');

      expect(result.created).toBe(false);
      expect(result.exists).toBe(false);
      expect(result.error).toBe('Index creation failed');
    });

    it('should handle BUILDING status for existing index', async () => {
      mockListSearchIndexes.mockResolvedValue([
        { name: 'rag_vector_index', status: 'BUILDING' },
      ]);

      const result = await ensureVectorSearchIndex('org_123');

      expect(result.created).toBe(false);
      expect(result.exists).toBe(true);
      expect(result.status).toBe('BUILDING');
    });
  });

  describe('getVectorIndexStatus', () => {
    it('should return READY status when index is ready', async () => {
      mockListSearchIndexes.mockResolvedValue([
        { name: 'rag_vector_index', status: 'READY', queryable: true },
      ]);

      const result = await getVectorIndexStatus('org_123');

      expect(result.exists).toBe(true);
      expect(result.status).toBe('READY');
      expect(result.queryable).toBe(true);
    });

    it('should return BUILDING status when index is building', async () => {
      mockListSearchIndexes.mockResolvedValue([
        { name: 'rag_vector_index', status: 'BUILDING', queryable: false },
      ]);

      const result = await getVectorIndexStatus('org_123');

      expect(result.exists).toBe(true);
      expect(result.status).toBe('BUILDING');
      expect(result.queryable).toBe(false);
    });

    it('should infer queryable from READY status when not explicitly set', async () => {
      mockListSearchIndexes.mockResolvedValue([
        { name: 'rag_vector_index', status: 'READY' },
      ]);

      const result = await getVectorIndexStatus('org_123');

      expect(result.exists).toBe(true);
      expect(result.queryable).toBe(true);
    });

    it('should return exists: false when index not found', async () => {
      mockListSearchIndexes.mockResolvedValue([]);

      const result = await getVectorIndexStatus('org_123');

      expect(result.exists).toBe(false);
      expect(result.status).toBeUndefined();
      expect(result.queryable).toBeUndefined();
    });

    it('should return error on exception', async () => {
      mockListSearchIndexes.mockRejectedValue(new Error('Database error'));

      const result = await getVectorIndexStatus('org_123');

      expect(result.exists).toBe(false);
      expect(result.error).toBe('Database error');
    });

    it('should handle FAILED status', async () => {
      mockListSearchIndexes.mockResolvedValue([
        { name: 'rag_vector_index', status: 'FAILED', queryable: false },
      ]);

      const result = await getVectorIndexStatus('org_123');

      expect(result.exists).toBe(true);
      expect(result.status).toBe('FAILED');
      expect(result.queryable).toBe(false);
    });

    it('should handle PENDING status', async () => {
      mockListSearchIndexes.mockResolvedValue([
        { name: 'rag_vector_index', status: 'PENDING' },
      ]);

      const result = await getVectorIndexStatus('org_123');

      expect(result.exists).toBe(true);
      expect(result.status).toBe('PENDING');
      expect(result.queryable).toBe(false);
    });
  });
});
