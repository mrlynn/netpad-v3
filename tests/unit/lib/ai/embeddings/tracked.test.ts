/**
 * Tests for TrackedEmbeddingProvider
 *
 * Verifies analytics tracking wrapper for embedding providers
 */

import {
  TrackedEmbeddingProvider,
  createTrackedEmbeddingProvider,
  EmbeddingTrackingContext,
} from '@/lib/ai/embeddings/tracked';
import { EmbeddingProvider } from '@/lib/ai/embeddings/base';

// Mock aiAnalytics
jest.mock('@/lib/ai/aiAnalytics', () => ({
  logAIRequest: jest.fn().mockResolvedValue(undefined),
}));

import { logAIRequest } from '@/lib/ai/aiAnalytics';

const mockLogAIRequest = logAIRequest as jest.MockedFunction<typeof logAIRequest>;

describe('TrackedEmbeddingProvider', () => {
  // Mock inner provider
  const mockInnerProvider: EmbeddingProvider = {
    providerId: 'openai',
    dimensions: 1536,
    modelName: 'text-embedding-3-small',
    generateEmbeddings: jest.fn(),
    generateQueryEmbedding: jest.fn(),
    isAvailable: jest.fn(),
    estimateCost: jest.fn(),
    getModelInfo: jest.fn(),
  };

  const mockContext: EmbeddingTrackingContext = {
    organizationId: 'org_123',
    userId: 'user_456',
    isGuest: false,
    feature: 'rag_conversational_forms',
    endpoint: '/api/rag/documents/upload',
  };

  let trackedProvider: TrackedEmbeddingProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    (mockInnerProvider.generateEmbeddings as jest.Mock).mockResolvedValue([[0.1, 0.2, 0.3]]);
    (mockInnerProvider.generateQueryEmbedding as jest.Mock).mockResolvedValue([0.1, 0.2, 0.3]);
    (mockInnerProvider.isAvailable as jest.Mock).mockResolvedValue(true);
    (mockInnerProvider.estimateCost as jest.Mock).mockReturnValue(0.0001);
    (mockInnerProvider.getModelInfo as jest.Mock).mockReturnValue({
      name: 'text-embedding-3-small',
      dimensions: 1536,
    });

    trackedProvider = createTrackedEmbeddingProvider(mockInnerProvider, mockContext);
  });

  describe('property passthrough', () => {
    it('should pass through providerId', () => {
      expect(trackedProvider.providerId).toBe('openai');
    });

    it('should pass through dimensions', () => {
      expect(trackedProvider.dimensions).toBe(1536);
    });

    it('should pass through modelName', () => {
      expect(trackedProvider.modelName).toBe('text-embedding-3-small');
    });
  });

  describe('generateEmbeddings', () => {
    it('should generate embeddings and track the request', async () => {
      const texts = ['hello', 'world'];
      const result = await trackedProvider.generateEmbeddings(texts);

      expect(result).toEqual([[0.1, 0.2, 0.3]]);
      expect(mockInnerProvider.generateEmbeddings).toHaveBeenCalledWith(texts);
      expect(mockLogAIRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org_123',
          userId: 'user_456',
          feature: 'rag_conversational_forms',
          endpoint: '/api/rag/documents/upload',
          model: 'text-embedding-3-small',
          success: true,
        })
      );
    });

    it('should track failed requests', async () => {
      const error = new Error('API Error');
      (error as any).code = 'RATE_LIMITED';
      (mockInnerProvider.generateEmbeddings as jest.Mock).mockRejectedValue(error);

      await expect(trackedProvider.generateEmbeddings(['test'])).rejects.toThrow('API Error');

      expect(mockLogAIRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errorCode: 'RATE_LIMITED',
          errorMessage: 'API Error',
        })
      );
    });

    it('should not fail if tracking fails', async () => {
      mockLogAIRequest.mockRejectedValue(new Error('Analytics down'));

      const result = await trackedProvider.generateEmbeddings(['test']);

      expect(result).toEqual([[0.1, 0.2, 0.3]]);
    });
  });

  describe('generateQueryEmbedding', () => {
    it('should generate query embedding and track the request', async () => {
      const result = await trackedProvider.generateQueryEmbedding('search query');

      expect(result).toEqual([0.1, 0.2, 0.3]);
      expect(mockInnerProvider.generateQueryEmbedding).toHaveBeenCalledWith('search query');
      expect(mockLogAIRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        })
      );
    });

    it('should track failed query embedding requests', async () => {
      const error = new Error('Query failed');
      (mockInnerProvider.generateQueryEmbedding as jest.Mock).mockRejectedValue(error);

      await expect(trackedProvider.generateQueryEmbedding('test')).rejects.toThrow('Query failed');

      expect(mockLogAIRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errorMessage: 'Query failed',
        })
      );
    });
  });

  describe('passthrough methods', () => {
    it('should pass through isAvailable without tracking', async () => {
      const result = await trackedProvider.isAvailable();

      expect(result).toBe(true);
      expect(mockInnerProvider.isAvailable).toHaveBeenCalled();
      expect(mockLogAIRequest).not.toHaveBeenCalled();
    });

    it('should pass through estimateCost without tracking', () => {
      const result = trackedProvider.estimateCost(['test']);

      expect(result).toBe(0.0001);
      expect(mockInnerProvider.estimateCost).toHaveBeenCalledWith(['test']);
      expect(mockLogAIRequest).not.toHaveBeenCalled();
    });

    it('should pass through getModelInfo without tracking', () => {
      const result = trackedProvider.getModelInfo();

      expect(result).toEqual({ name: 'text-embedding-3-small', dimensions: 1536 });
      expect(mockInnerProvider.getModelInfo).toHaveBeenCalled();
      expect(mockLogAIRequest).not.toHaveBeenCalled();
    });
  });

  describe('provider type mapping', () => {
    it('should map openai provider correctly', async () => {
      await trackedProvider.generateEmbeddings(['test']);

      expect(mockLogAIRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'openai',
        })
      );
    });

    it('should map voyage provider to openrouter', async () => {
      const voyageProvider: EmbeddingProvider = {
        ...mockInnerProvider,
        providerId: 'voyage',
      };
      const tracked = createTrackedEmbeddingProvider(voyageProvider, mockContext);

      await tracked.generateEmbeddings(['test']);

      expect(mockLogAIRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'openrouter',
        })
      );
    });

    it('should map atlas-embedding-api provider to openrouter', async () => {
      const atlasProvider: EmbeddingProvider = {
        ...mockInnerProvider,
        providerId: 'atlas-embedding-api',
      };
      const tracked = createTrackedEmbeddingProvider(atlasProvider, mockContext);

      await tracked.generateEmbeddings(['test']);

      expect(mockLogAIRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'openrouter',
        })
      );
    });
  });

  describe('createTrackedEmbeddingProvider factory', () => {
    it('should create a TrackedEmbeddingProvider instance', () => {
      const provider = createTrackedEmbeddingProvider(mockInnerProvider, mockContext);

      expect(provider).toBeInstanceOf(TrackedEmbeddingProvider);
    });

    it('should handle guest users', async () => {
      const guestContext = { ...mockContext, isGuest: true };
      const provider = createTrackedEmbeddingProvider(mockInnerProvider, guestContext);

      await provider.generateEmbeddings(['test']);

      expect(mockLogAIRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          isGuest: true,
        })
      );
    });
  });
});
