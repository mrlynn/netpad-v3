/**
 * RAG Integration Tests
 *
 * Tests for the RAG integration module that bridges the RAG subsystem
 * with conversational form orchestration.
 */

import '@testing-library/jest-dom';

// Mock the retrieval module to avoid nanoid/mongodb dependencies
jest.mock('@/lib/rag/retrieval', () => ({
  retrieveRelevantChunks: jest.fn(),
}));

import {
  isRAGEnabled,
  getRAGConfigWithDefaults,
  createEmptyTelemetry,
  formatSourcesForDisplay,
  mergeRAGTelemetry,
  buildMessagesWithRAGContext,
} from '@/lib/conversational/ragIntegration';
import {
  RAGTurnContext,
  RAGSource,
  createEmptyTurnContext,
  createTurnContext,
} from '@/lib/rag/promptEnhancement';
import { ConversationalFormConfig } from '@/types/conversational';
import { RAGTelemetry, RetrievedChunk } from '@/types/rag';
import { Message } from '@/lib/ai/providers/base';

// Mock config for testing
const mockConfig: ConversationalFormConfig = {
  formType: 'conversational',
  objective: 'Test form',
  topics: [],
  persona: {
    style: 'professional',
  },
  extractionSchema: [],
  conversationLimits: {
    maxTurns: 10,
    maxDuration: 30,
    minConfidence: 0.8,
  },
};

const mockConfigWithRAG: ConversationalFormConfig = {
  ...mockConfig,
  rag: {
    enabled: true,
    documents: ['doc-1', 'doc-2'],
    retrievalConfig: {
      maxChunks: 5,
      minScore: 0.7,
      retrievalThreshold: 0.5,
    },
  },
};

const mockChunks: RetrievedChunk[] = [
  {
    chunkId: 'chunk-1',
    documentId: 'doc-1',
    text: 'This is test content from the knowledge base.',
    score: 0.95,
    metadata: {
      chunkIndex: 0,
      pageNumber: 1,
      section: 'Introduction',
    },
    document: {
      fileName: 'test-doc.pdf',
      title: 'Test Document',
      sourceType: 'guide',
    },
  },
  {
    chunkId: 'chunk-2',
    documentId: 'doc-1',
    text: 'Another piece of relevant information.',
    score: 0.85,
    metadata: {
      chunkIndex: 1,
      pageNumber: 2,
    },
    document: {
      fileName: 'test-doc.pdf',
      title: 'Test Document',
      sourceType: 'guide',
    },
  },
];

describe('RAG Integration', () => {
  describe('isRAGEnabled', () => {
    it('should return false when RAG is not configured', () => {
      expect(isRAGEnabled(mockConfig)).toBe(false);
    });

    it('should return false when RAG is disabled', () => {
      const config: ConversationalFormConfig = {
        ...mockConfig,
        rag: {
          enabled: false,
          documents: ['doc-1'],
        },
      };
      expect(isRAGEnabled(config)).toBe(false);
    });

    it('should return false when no documents are configured', () => {
      const config: ConversationalFormConfig = {
        ...mockConfig,
        rag: {
          enabled: true,
          documents: [],
        },
      };
      expect(isRAGEnabled(config)).toBe(false);
    });

    it('should return true when RAG is enabled with documents', () => {
      expect(isRAGEnabled(mockConfigWithRAG)).toBe(true);
    });
  });

  describe('getRAGConfigWithDefaults', () => {
    it('should return default config when no RAG config provided', () => {
      const result = getRAGConfigWithDefaults(mockConfig);

      expect(result.enabled).toBe(false);
      expect(result.documents).toEqual([]);
      expect(result.retrievalConfig?.maxChunks).toBe(5);
      expect(result.retrievalConfig?.minScore).toBe(0.7);
    });

    it('should merge provided config with defaults', () => {
      const config: ConversationalFormConfig = {
        ...mockConfig,
        rag: {
          enabled: true,
          documents: ['doc-1'],
          retrievalConfig: {
            maxChunks: 10,
          },
        },
      };

      const result = getRAGConfigWithDefaults(config);

      expect(result.enabled).toBe(true);
      expect(result.documents).toEqual(['doc-1']);
      expect(result.retrievalConfig?.maxChunks).toBe(10);
      expect(result.retrievalConfig?.minScore).toBe(0.7); // default
    });
  });

  describe('Telemetry Functions', () => {
    describe('createEmptyTelemetry', () => {
      it('should create empty telemetry object', () => {
        const telemetry = createEmptyTelemetry();

        expect(telemetry.retrievalCount).toBe(0);
        expect(telemetry.retrievedDocuments).toHaveLength(0);
        expect(telemetry.suggestionsWithSources).toHaveLength(0);
      });
    });

    describe('mergeRAGTelemetry', () => {
      it('should return new telemetry when existing is undefined', () => {
        const newTelemetry: RAGTelemetry = {
          retrievalCount: 2,
          retrievedDocuments: [
            {
              documentId: 'doc-1',
              chunksRetrieved: 3,
              avgScore: 0.85,
              retrievedAt: new Date(),
            },
          ],
          suggestionsWithSources: [],
        };

        const result = mergeRAGTelemetry(undefined, newTelemetry);

        expect(result).toEqual(newTelemetry);
      });

      it('should merge telemetry from multiple sources', () => {
        const existing: RAGTelemetry = {
          retrievalCount: 1,
          retrievedDocuments: [
            {
              documentId: 'doc-1',
              chunksRetrieved: 2,
              avgScore: 0.9,
              retrievedAt: new Date(),
            },
          ],
          suggestionsWithSources: [],
        };

        const newTelemetry: RAGTelemetry = {
          retrievalCount: 1,
          retrievedDocuments: [
            {
              documentId: 'doc-2',
              chunksRetrieved: 1,
              avgScore: 0.8,
              retrievedAt: new Date(),
            },
          ],
          suggestionsWithSources: [],
        };

        const result = mergeRAGTelemetry(existing, newTelemetry);

        expect(result.retrievalCount).toBe(2);
        expect(result.retrievedDocuments).toHaveLength(2);
      });
    });
  });

  describe('formatSourcesForDisplay', () => {
    it('should format sources with page numbers', () => {
      const sources: RAGSource[] = [
        {
          index: 1,
          documentId: 'doc-1',
          chunkId: 'chunk-1',
          title: 'Employee Handbook',
          pageNumber: 15,
          score: 0.92,
          excerpt: 'This is the policy excerpt...',
        },
      ];

      const formatted = formatSourcesForDisplay(sources);

      expect(formatted).toHaveLength(1);
      expect(formatted[0].label).toBe('Employee Handbook (p.15)');
      expect(formatted[0].confidence).toBe('92%');
      expect(formatted[0].excerpt).toBe('This is the policy excerpt...');
    });

    it('should format sources without page numbers', () => {
      const sources: RAGSource[] = [
        {
          index: 1,
          documentId: 'doc-1',
          chunkId: 'chunk-1',
          title: 'FAQ Document',
          score: 0.78,
          excerpt: 'FAQ content...',
        },
      ];

      const formatted = formatSourcesForDisplay(sources);

      expect(formatted[0].label).toBe('FAQ Document');
      expect(formatted[0].confidence).toBe('78%');
    });

    it('should handle multiple sources', () => {
      const sources: RAGSource[] = [
        {
          index: 1,
          documentId: 'doc-1',
          chunkId: 'chunk-1',
          title: 'Doc 1',
          score: 0.9,
          excerpt: 'Excerpt 1',
        },
        {
          index: 2,
          documentId: 'doc-2',
          chunkId: 'chunk-2',
          title: 'Doc 2',
          pageNumber: 5,
          score: 0.85,
          excerpt: 'Excerpt 2',
        },
      ];

      const formatted = formatSourcesForDisplay(sources);

      expect(formatted).toHaveLength(2);
      expect(formatted[0].label).toBe('Doc 1');
      expect(formatted[1].label).toBe('Doc 2 (p.5)');
    });
  });

  describe('buildMessagesWithRAGContext', () => {
    const baseMessages: Message[] = [
      {
        role: 'system',
        content: 'You are a helpful assistant.',
        timestamp: new Date(),
      },
      {
        role: 'user',
        content: 'What is the policy?',
        timestamp: new Date(),
      },
    ];

    it('should add guidance as system message', () => {
      const guidance = 'Focus on extracting key information.';
      const result = buildMessagesWithRAGContext(baseMessages, null, guidance);

      expect(result).toHaveLength(3);
      expect(result[2].role).toBe('system');
      expect(result[2].content).toBe(guidance);
    });

    it('should not add empty guidance', () => {
      const result = buildMessagesWithRAGContext(baseMessages, null, '   ');

      expect(result).toHaveLength(2);
    });

    it('should work with RAG context', () => {
      const turnContext = createTurnContext('test query', mockChunks, 100);
      const guidance = 'Enhanced guidance with context.';

      const result = buildMessagesWithRAGContext(baseMessages, turnContext, guidance);

      expect(result).toHaveLength(3);
      expect(result[2].content).toBe(guidance);
    });

    it('should work with empty RAG context', () => {
      const turnContext = createEmptyTurnContext();
      const guidance = 'Standard guidance.';

      const result = buildMessagesWithRAGContext(baseMessages, turnContext, guidance);

      expect(result).toHaveLength(3);
    });
  });

  describe('Turn Context', () => {
    it('should create empty turn context correctly', () => {
      const context = createEmptyTurnContext();

      expect(context.wasTriggered).toBe(false);
      expect(context.chunks).toHaveLength(0);
      expect(context.sources).toHaveLength(0);
      expect(context.timestamp).toBeInstanceOf(Date);
    });

    it('should create turn context from chunks', () => {
      const context = createTurnContext('test query', mockChunks, 150);

      expect(context.wasTriggered).toBe(true);
      expect(context.query).toBe('test query');
      expect(context.chunks).toHaveLength(2);
      expect(context.sources).toHaveLength(2);
      expect(context.latencyMs).toBe(150);

      // Verify source mapping
      const firstSource = context.sources[0];
      expect(firstSource.index).toBe(1);
      expect(firstSource.documentId).toBe('doc-1');
      expect(firstSource.title).toBe('Test Document');
      expect(firstSource.pageNumber).toBe(1);
      expect(firstSource.section).toBe('Introduction');
      expect(firstSource.score).toBe(0.95);
    });
  });
});
